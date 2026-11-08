export const RECOVERY_URL = 'https://johnryberg2026.github.io/hero-stone-demo/account-recovery.html';
// Enable only after the exact redirect and real delivery/return flow are verified.
export const RECOVERY_EMAIL_ENABLED = false;

export function createRecovery({ auth, render, clearPasswords, cleanUrl, defer = fn => setTimeout(fn, 0), emailEnabled = RECOVERY_EMAIL_ENABLED, now = Date.now, timeoutMs = 15000 }) {
  let generation = 0, owner = null, busy = false, phase = 'request', retryAfter = 0;
  const show = (message, mode = phase) => render({ phase: mode, busy, message });
  const invalidate = () => { generation++; owner = null; busy = false; clearPasswords(); };
  const wait = task => {
    let timer;
    return Promise.race([task, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Unconfirmed request')), timeoutMs); })]).finally(() => clearTimeout(timer));
  };
  async function validateRecovery(expected, version) {
    try {
      const result = await wait(auth.getUser());
      if (version !== generation) return;
      if (result.error || result.data?.user?.id !== expected) throw Error('Invalid recovery');
      owner = expected; phase = 'password'; busy = false;
      cleanUrl(); show('Choose a new password for the account verified by your recovery link.');
    } catch {
      if (version !== generation) return;
      invalidate(); phase = 'request'; cleanUrl(); show('This recovery link could not be verified. Request a fresh link when email recovery is available.');
    }
  }
  function onAuth(event, session) {
    if (event === 'PASSWORD_RECOVERY' && session?.user?.id) {
      invalidate(); const version = generation, expected = session.user.id;
      phase = 'checking'; busy = true; show('Checking your recovery link…');
      // Keep the Auth callback synchronous; validation runs after its lock releases.
      defer(() => validateRecovery(expected, version));
    } else if (event === 'SIGNED_OUT' || (owner && session?.user?.id !== owner)) {
      invalidate(); phase = 'request'; show('Your recovery session ended. Request a fresh link to continue.');
    }
  }
  function finishInitialLink(hasLink, error) {
    if (phase === 'checking' || phase === 'password' || phase === 'done') return;
    if (hasLink || error) { cleanUrl(); show('This recovery link is expired or unavailable. Request a fresh link when email recovery is available.'); }
    else show(emailEnabled ? 'Enter your account email to request a recovery link.' : 'Email recovery is being prepared. Contact your pilot coordinator for help signing in.');
  }
  async function request(email) {
    if (busy) return;
    if (!emailEnabled) { show('Email recovery is not available yet. Contact your pilot coordinator.'); return; }
    if (phase !== 'request') return;
    const address = String(email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { show('Enter a valid email address.'); return; }
    if (now() < retryAfter) { show('Please wait a minute before requesting another link.'); return; }
    const version = generation; retryAfter = now() + 60000; busy = true; show('Requesting your recovery link…');
    try {
      const result = await wait(auth.resetPasswordForEmail(address, { redirectTo: RECOVERY_URL }));
      if (version !== generation) return;
      if (result.error && result.error.code !== 'user_not_found') {
        show(result.error.status === 429 ? 'Too many requests. Please wait before trying again.' : 'Could not request recovery right now. Please try again later.');
        return;
      }
      retryAfter = now() + 60000;
      show('If an account matches that email, check its inbox for a recovery link. Check spam too.');
    } catch { if (version === generation) show('Could not request recovery right now. Please try again later.'); }
    finally { if (version === generation) { busy = false; showLast(); } }
  }
  // Keep messages while updating control availability, without logging any values.
  let last = null;
  function showLast() { if (last) render({ ...last, busy }); }
  const originalRender = render;
  render = state => { last = state; originalRender(state); };
  async function update(password, confirmation) {
    if (busy) return;
    if (phase !== 'password' || !owner) { show('Open a verified recovery link before changing a password.'); return; }
    if (typeof password !== 'string' || password.length < 12) { show('Use a password with at least 12 characters.'); return; }
    if (password !== confirmation) { show('The passwords do not match.'); return; }
    const version = generation, expected = owner; let submitted = false; busy = true; show('Saving your new password…');
    try {
      const verified = await wait(auth.getUser());
      if (version !== generation) return;
      if (verified.error || verified.data?.user?.id !== expected) {
        invalidate(); phase = 'request'; cleanUrl(); show('Your recovery session ended. Request a fresh link to continue.'); return;
      }
      submitted = true;
      const result = await wait(auth.updateUser({ password }));
      if (version !== generation) return;
      if (result.error || result.data?.user?.id !== expected) {
        show(result.error?.code === 'weak_password' ? 'Use a stronger, unique password and try again.' : result.error?.code === 'same_password' ? 'Choose a password different from your previous one.' : 'Could not confirm the password change. Try again or request a fresh recovery link.');
        return;
      }
      // Do not turn a recovery link into a persistent app sign-in.
      clearPasswords(); owner = null; phase = 'done'; cleanUrl();
      show('Your password has been updated. Return to sign in with your new password.');
    } catch {
      if (version === generation) {
        invalidate(); phase = 'request'; cleanUrl();
        show(submitted ? 'Could not confirm the password change. Try signing in with your new password, or request a fresh recovery link.' : 'Your recovery session could not be verified. Request a fresh link to continue.');
      }
    }
    finally { if (version === generation) { busy = false; showLast(); } }
  }
  return { onAuth, finishInitialLink, request, update };
}

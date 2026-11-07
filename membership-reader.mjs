export function describeMembership(data) {
  if (data?.enrolled === false) return 'This account is not enrolled in the founding pilot yet. No membership payment is due here.';
  const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value;
  if (data?.enrolled !== true || data.tier !== 'founding' || data.currency !== 'USD' || data.annualPriceCents !== 1200 || data.billingInterval !== 'year' || data.lifetimeAnnualRate !== true || data.foundingRecognition !== true || data.billingActivated !== false || typeof data.inFreePeriod !== 'boolean' || !day(data.freeUntil)) throw Error('Invalid membership response');
  const end = new Date(data.freeUntil+'T00:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
  return 'Founding Member — permanent recognition. '+(data.inFreePeriod ? 'Your free year ends on '+end+'. ' : 'Your free year ended on '+end+'. ')+ 'Your guaranteed lifetime rate is $12 per year, billed annually. Billing is not activated; no payment is collected here. World Quest is separate.';
}

export function createMembershipReader({ getUser, rpc, show, setBusy, timeoutMs = 12000 }) {
  let generation = 0;
  function reset() { generation++; setBusy(false); show('Open your saved membership details when you’re ready.'); }
  async function load() {
    const version = ++generation; let timer;
    setBusy(true); show('Loading your private membership details…');
    const current = () => version === generation;
    try {
      const work = async () => {
        const user = await getUser();
        if (!current()) return;
        if (!user?.id) throw Error('Sign in');
        const result = await rpc('my_date_quest_membership', { p_expected_user: user.id });
        if (!current()) return;
        const verified = await getUser();
        if (!current()) return;
        if (verified?.id !== user.id) { reset(); return; }
        if (result.error) throw Error('Read failed');
        const message = describeMembership(result.data);
        if (current()) show(message);
      };
      await Promise.race([work(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Timeout')), timeoutMs); })]);
    } catch {
      if (current()) { generation++; show('Could not load your membership. Check your sign-in and try again.'); setBusy(false); }
    } finally { clearTimeout(timer); if (current()) setBusy(false); }
  }
  return { load, reset };
}

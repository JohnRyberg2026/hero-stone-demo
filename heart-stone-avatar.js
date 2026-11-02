'use strict';
// A bounded opening interaction. No AI, microphone, storage or account access.
(function () {
  const paths = {
    plan: {title: 'Make a little time for each other.', copy: 'Start with what you would like to share. You can review your invitation before choosing to send it.', label: 'Create a moment', href: 'invitation-opening.html'},
    reconnect: {title: 'A small invitation can be a beginning.', copy: 'You might say: “I’d like a little time together. Would tonight or later this week feel better?” Make it sound like you. The other person can choose when they are ready.', label: 'Prepare an invitation', href: 'invitation-opening.html'},
    continue: {title: 'Pick up a moment already in motion.', copy: 'Open your invitations and replies to choose the moment you want to continue.', label: 'Open our invitations', href: 'invitation-opening.html#shared-invitations'}
  };
  function mount(root) {
    if (root.dataset.mounted) return;
    root.dataset.mounted = 'true';
    root.innerHTML = `<div class="hs-guide-scene" aria-hidden="true"><div class="hs-guide-sprite"></div><span class="hs-guide-signature">HEART STONE™</span></div>
      <div class="hs-guide-body"><p class="hs-guide-eyebrow">A little help making room for each other</p>
      <h2>What brings you here today?</h2><p class="hs-guide-message" role="status" aria-live="polite">Plan something, reconnect, or pick up where you left off.</p>
      <div class="hs-guide-choices"><button type="button" data-purpose="plan">Plan a moment</button><button type="button" data-purpose="reconnect">Reconnect</button><button type="button" data-purpose="continue">Continue a moment</button></div>
      <form class="hs-guide-form"><label>Or tell me in a few words<input name="intention" maxlength="240" autocomplete="off" placeholder="I’d like to plan something together"></label><button type="submit">Find a starting point</button></form>
      <div class="hs-guide-result" hidden><h3 tabindex="-1"></h3><p></p><a></a><button type="button" class="hs-guide-back">Choose another starting point</button></div>
      <div class="hs-guide-footer"><span class="hs-guide-state">Ready when you are · text only</span><button type="button" class="hs-guide-motion" aria-pressed="false">Pause motion</button></div>
      <p class="hs-guide-note">This opening uses a few simple word matches. Your words stay on this screen; nothing is sent or saved.</p></div>`;
    const input = root.querySelector('input'), form = root.querySelector('form');
    const result = root.querySelector('.hs-guide-result'), message = root.querySelector('.hs-guide-message');
    const state = root.querySelector('.hs-guide-state'), motion = root.querySelector('.hs-guide-motion');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reduced.matches, greeting;
    function setState(value) {
      root.dataset.state = value;
      state.textContent = value === 'listening' ? 'Ready for your words · text only' : value === 'responding' ? 'A starting point for you' : 'Ready when you are · text only';
    }
    function updateMotion() {
      root.dataset.motion = paused || reduced.matches ? 'paused' : 'on';
      motion.setAttribute('aria-pressed', String(paused || reduced.matches));
      motion.textContent = paused || reduced.matches ? 'Resume motion' : 'Pause motion';
      motion.disabled = reduced.matches;
      if (reduced.matches) motion.textContent = 'Reduced motion enabled';
    }
    function reset() {
      clearTimeout(greeting);
      input.value = '';
      result.hidden = true;
      form.hidden = false;
      root.querySelector('.hs-guide-choices').hidden = false;
      message.textContent = 'Plan something, reconnect, or pick up where you left off.';
      setState('greeting');
      greeting = setTimeout(() => { if (root.dataset.state === 'greeting') setState('idle'); }, 1800);
    }
    function choose(purpose) {
      const path = paths[purpose];
      if (!path) return;
      clearTimeout(greeting);
      setState('responding');
      result.querySelector('h3').textContent = path.title;
      result.querySelector('p').textContent = path.copy;
      const link = result.querySelector('a');
      link.textContent = path.label; link.href = path.href;
      result.hidden = false; form.hidden = true;
      root.querySelector('.hs-guide-choices').hidden = true;
      message.textContent = 'You choose the next step.';
      result.querySelector('h3').focus({preventScroll: true});
    }
    root.querySelectorAll('[data-purpose]').forEach(b => b.addEventListener('click', () => choose(b.dataset.purpose)));
    input.addEventListener('focus', () => { clearTimeout(greeting); setState('listening'); });
    input.addEventListener('blur', () => { if (root.dataset.state === 'listening') setState('idle'); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const words = input.value.trim().toLowerCase();
      // Suggest only; never navigate, send or infer a relationship state from prose.
      const matches = [
        ['plan', /\b(plan|planning|date|surprise)\b/],
        ['reconnect', /\b(reconnect|reconnecting|reconnection)\b/],
        ['continue', /\b(continue|continuing|resume|invitation|invitations)\b/]
      ].filter(([,pattern]) => pattern.test(words));
      if (matches.length === 1) choose(matches[0][0]);
      else {
        setState('idle');
        message.textContent = words ? 'Which starting point fits what you have in mind? Choose one above.' : 'Choose a starting point above, or type a few words.';
      }
    });
    root.querySelector('.hs-guide-back').addEventListener('click', () => { reset(); root.querySelector('[data-purpose]').focus(); });
    motion.addEventListener('click', () => { paused = !paused; updateMotion(); });
    reduced.addEventListener('change', updateMotion);
    // Reset ephemeral words when account/connection context changes or page is restored.
    window.addEventListener('heartstone:home-state', reset);
    window.addEventListener('pagehide', reset);
    window.addEventListener('pageshow', reset);
    updateMotion(); reset();
  }
  document.querySelectorAll('[data-heart-stone-guide]').forEach(mount);
})();

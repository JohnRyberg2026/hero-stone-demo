'use strict';
// Carry only an explicit starting-point choice. Personal words never enter the URL.
(() => {
  const openings = {
    '#heart-stone-plan': {
      title: 'A little time, thoughtfully chosen.',
      copy: 'Start with an invitation that sounds like you. What would you enjoy sharing?',
      words: 'I’d love to make a little time for us. Would you like to plan something together?'
    },
    '#heart-stone-reconnect': {
      title: 'Leave a little room to reconnect.',
      copy: 'A small invitation can leave room for the other person’s timing. They can say yes, suggest another time, decline, or decide later.',
      words: 'I’d like a little time together. Would tonight or later this week feel better?'
    }
  };
  const message = document.getElementById('message');
  const feelings = document.getElementById('feelings');
  if (!message || !feelings) return;
  const offer = document.createElement('details');
  offer.className = 'notice'; offer.setAttribute('aria-label', 'Your Heart Stone starting point');
  offer.hidden = true;
  offer.innerHTML = '<summary style="cursor:pointer;font-weight:750;min-height:44px">Help me find the words</summary><h2 style="margin-top:0"></h2><p></p><blockquote class="quote"></blockquote><button type="button" class="secondary">Use this opening in my message</button><button type="button" class="textbutton">I’ll write my own</button><p class="helper" role="status" aria-live="polite"></p>';
  feelings.insertBefore(offer, feelings.querySelector('h2'));
  let opening, reviewed, revision = 0;
  const transferKey = "hs_reviewed_invitation_v1";
  try {
    const raw = sessionStorage.getItem(transferKey);
    sessionStorage.removeItem(transferKey);
    if (raw && raw.length < 8000) {
      const value = JSON.parse(raw);
      if (typeof value.text === "string" && value.text.trim() && value.text.length <= 1000 && typeof value.owner === "string" && Number.isFinite(value.created) && Date.now() - value.created >= 0 && Date.now() - value.created < 600000) reviewed = value;
    }
  } catch {}
  const [use, own] = offer.querySelectorAll('button');
  const status = offer.querySelector('[role=status]');
  async function showOpening() {
    const v = ++revision;
    opening = undefined; offer.hidden = true;
    if (location.hash === "#heart-stone-reviewed" && reviewed) {
      try {
        const id = await window.heartStoneCurrentAccount();
        if (v !== revision) return;
        if (id !== reviewed.owner) {reviewed = undefined; return;}
        opening = {title:"Your invitation, ready to review.",copy:"Check these words before using them. Nothing has been sent or saved.",words:reviewed.text};
      } catch {return;}
    } else opening = openings[location.hash];
    offer.hidden = !opening;
    offer.open = location.hash === '#heart-stone-reviewed';
    if (!opening) return;
    offer.querySelector('h2').textContent = opening.title;
    offer.querySelector('p').textContent = opening.copy;
    offer.querySelector('blockquote').textContent = opening.words;
    status.textContent = 'Your open message and saved beginning stay as they are until you choose.';
  }
  use.addEventListener('click', async () => {
    if (!opening) return;
    const selected = opening, v = revision;
    if (location.hash === '#heart-stone-reviewed') {
      try {if (!reviewed || await window.heartStoneCurrentAccount() !== reviewed.owner) {reviewed = undefined; opening = undefined; offer.hidden = true; return;}} catch {return;}
      if (v !== revision || selected !== opening) return;
    }
    if (message.value.trim() && message.value !== opening.words &&
        !window.confirm('Replace the message currently open on this screen with the suggested opening? Your saved beginning will not change unless you save again.')) return;
    message.value = opening.words;
    // Mark as deliberately edited so feeling buttons cannot overwrite these words.
    message.dispatchEvent(new Event('input', {bubbles: true}));
    offer.hidden = true;
    message.focus();
  });
  own.addEventListener('click', () => { offer.hidden = true; message.focus(); });
  window.addEventListener('heartstone:invitation-account', () => {revision++; opening = undefined; reviewed = undefined; offer.hidden = true; offer.querySelector('blockquote').textContent = '';});
  window.addEventListener('hashchange', showOpening);
  showOpening();
})();

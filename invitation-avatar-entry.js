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
  const offer = document.createElement('section');
  offer.className = 'notice'; offer.setAttribute('aria-label', 'Your Heart Stone starting point');
  offer.hidden = true;
  offer.innerHTML = '<h2 style="margin-top:0"></h2><p></p><blockquote class="quote"></blockquote><button type="button" class="secondary">Use this opening in my message</button><button type="button" class="textbutton">I’ll write my own</button><p class="helper" role="status" aria-live="polite"></p>';
  feelings.insertBefore(offer, feelings.querySelector('h2'));
  let opening;
  const [use, own] = offer.querySelectorAll('button');
  const status = offer.querySelector('[role=status]');
  function showOpening() {
    opening = openings[location.hash];
    offer.hidden = !opening;
    if (!opening) return;
    offer.querySelector('h2').textContent = opening.title;
    offer.querySelector('p').textContent = opening.copy;
    offer.querySelector('blockquote').textContent = opening.words;
    status.textContent = 'Your open message and saved beginning stay as they are until you choose.';
  }
  use.addEventListener('click', () => {
    if (!opening) return;
    if (message.value.trim() && message.value !== opening.words &&
        !window.confirm('Replace the message currently open on this screen with the suggested opening? Your saved beginning will not change unless you save again.')) return;
    message.value = opening.words;
    // Mark as deliberately edited so feeling buttons cannot overwrite these words.
    message.dispatchEvent(new Event('input', {bubbles: true}));
    offer.hidden = true;
    message.focus();
  });
  own.addEventListener('click', () => { offer.hidden = true; message.focus(); });
  window.addEventListener('hashchange', showOpening);
  showOpening();
})();

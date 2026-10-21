/* Demo presentation gates. Never use browser confirmation as verified age or server authorization. */
(function () {
  'use strict';
  let confirmed = false;
  const policy = Object.freeze({
    dateQuestMinimumAge: 18,
    worldQuestDefault: 'family',
    canShareAdultExperience: (participants) => Array.isArray(participants) && participants.length > 0 &&
      participants.every(p => p && p.ageVerified === true && p.adultOptIn === true && p.experienceConsent === true)
  });
  async function requestAdult() {
    if (confirmed) return true;
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.style.cssText = 'max-width:480px;padding:28px;border-radius:18px;background:#fff9f0;color:#302522;border:2px solid #79504e';
      dialog.innerHTML = '<h2>DATE QUEST™ · Adults only · 18+</h2><p>Romance and optional R-rated intimacy are part of this adult experience. Intimacy is always a separate choice; entering never gives consent for another person.</p><p>This demo asks for your confirmation. It does not verify your age.</p><label style="display:block;margin:18px 0"><input type="checkbox"> I confirm I am 18 or older and choose to enter.</label><button type="button" disabled>Enter adult experience</button> <button type="button">Cancel</button>';
      const [enter, cancel] = dialog.querySelectorAll('button'), check = dialog.querySelector('input');
      check.onchange = () => { enter.disabled = !check.checked; };
      const finish = value => { confirmed = value; dialog.close(); dialog.remove(); resolve(value); };
      enter.onclick = () => { if (check.checked) finish(true); };
      cancel.onclick = () => finish(false);
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
      document.body.append(dialog); dialog.showModal();
    });
  }
  window.QuestAccess = { policy, requestAdult };
  document.addEventListener('DOMContentLoaded', () => {
    const dateButton = document.getElementById('enterDateQuestBtn');
    if (dateButton) dateButton.addEventListener('click', async event => {
      if (confirmed) return;
      event.stopImmediatePropagation(); event.preventDefault();
      if (await requestAdult()) dateButton.click();
    }, true);
    if (document.body.dataset.questAudience === 'date') {
      const content = document.querySelector('main');
      if (content) { content.hidden = true; content.inert = true; }
      requestAdult().then(ok => {
        if (ok && content) { content.hidden = false; content.inert = false; }
        else location.replace('index.html');
      });
    }
    const world = document.getElementById('worldAdultOption');
    if (world) {
      const add = document.getElementById('addWorldAdultOption'), remove = document.getElementById('removeWorldAdultOption');
      add.onclick = () => { world.hidden = false; add.hidden = true; };
      remove.onclick = () => { world.hidden = true; add.hidden = false; world.querySelector('input').checked = false; };
      world.querySelector('input').onchange = event => {
        document.getElementById('worldAdultStatus').textContent = event.target.checked
          ? 'Adult option requested for this screen only. Adult content remains unavailable until age verification and each participant’s separate opt-in and experience consent are connected.'
          : 'Family-safe mode is active. Adult content remains off.';
      };
    }
  });
})();

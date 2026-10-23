/* Preview coordinator. Does not change the shared companion implementation. */
(function(){
 'use strict';
 const quietButton=document.getElementById('avatarQuiet');if(!quietButton)return;
 const voice=document.getElementById('avatarVoicePreview'),motion=document.getElementById('avatarMotionPreview'),status=document.getElementById('avatarQuietStatus');
 function quiet(){
  document.dispatchEvent(new Event('heartstone:quiet'));
  const playful=document.getElementById('heartStoneMotion');
  if(playful?.getAttribute('aria-pressed')==='true')playful.click();
  status.textContent='HEART STONE is quiet and still. Voice and movement need a new invitation.';
 }
 const settings=document.getElementById('avatarSettings'),settingsToggle=document.getElementById('avatarSettingsToggle');
 function setSettings(open){
  if(!settings||!settingsToggle)return;
  settings.hidden=!open;settingsToggle.setAttribute('aria-expanded',String(open));
 }
 if(settingsToggle)settingsToggle.onclick=()=>{const open=settings.hidden;if(!open)quiet();setSettings(open);};
 quietButton.onclick=quiet;
 document.getElementById('hideHeartStone')?.addEventListener('click',()=>{quiet();setSettings(false);if(settingsToggle)settingsToggle.hidden=true;voice.hidden=true;motion.hidden=true;});
 document.getElementById('restoreHeartStone')?.addEventListener('click',()=>{voice.hidden=false;motion.hidden=false;if(settingsToggle)settingsToggle.hidden=false;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){quiet();const focusInside=settings?.contains(document.activeElement);setSettings(false);if(focusInside)settingsToggle?.focus();}});
})();

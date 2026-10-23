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
 quietButton.onclick=quiet;
 document.getElementById('hideHeartStone')?.addEventListener('click',()=>{quiet();voice.hidden=true;motion.hidden=true;});
 document.getElementById('restoreHeartStone')?.addEventListener('click',()=>{voice.hidden=false;motion.hidden=false;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')quiet();});
})();

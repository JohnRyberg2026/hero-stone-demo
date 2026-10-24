/* Preview-only movement. Never moves controls or covers page content. */
(function(){
 'use strict';
 const host=document.getElementById('avatarMotionPreview');if(!host)return;
 const button=host.querySelector('button'),status=host.querySelector('[role=status]');
 const figure=document.getElementById('meetHeartStone')?.querySelector('svg');if(!figure)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let animation=null;
 function stop(message='HEART STONE is resting.'){const current=animation;animation=null;current?.cancel();button.textContent='Take a little stroll';button.setAttribute('aria-pressed','false');status.textContent=message;}
 function sync(){stop(reduced.matches?'Your reduced-motion setting keeps HEART STONE still.':'HEART STONE is resting.');button.disabled=reduced.matches||typeof figure.animate!=='function';}
 button.onclick=()=>{
  if(animation){stop();return;}
  if(reduced.matches||document.hidden)return;
  try{
   animation=figure.animate([{transform:'translateX(0)'},{transform:'translateX(18px)',offset:.35},{transform:'translateX(-18px)',offset:.7},{transform:'translateX(0)'}],{duration:3200,iterations:1,easing:'ease-in-out'});
   const current=animation;current.onfinish=()=>{if(animation===current)stop();};
   button.textContent='Pause movement';button.setAttribute('aria-pressed','true');status.textContent='Taking a little stroll inside this space.';
  }catch(e){stop('Movement is unavailable. HEART STONE can stay still.');}
 };
 const visibility=()=>{if(document.hidden)stop();};
 reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',visibility);
 document.addEventListener('keydown',event=>{if(event.key==='Escape')stop();});
 // A cached page may return; preserve its reduced-motion and visibility listeners.
 window.addEventListener('pagehide',()=>stop());
 document.addEventListener('heartstone:quiet',()=>stop());
 sync();
})();

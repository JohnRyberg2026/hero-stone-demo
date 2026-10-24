/* Preview-only movement. Never moves controls or covers page content. */
(function(){
 'use strict';
 const host=document.getElementById('avatarMotionPreview');if(!host)return;
 const wander=host.querySelector('[data-wander]');
 const button=host.querySelector('button'),status=host.querySelector('[role=status]');
 const figure=document.getElementById('meetHeartStone')?.querySelector('svg');if(!figure)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let animation=null;
 function stop(message='HEART STONE is resting.'){const current=animation;animation=null;current?.cancel();button.textContent=wander?.checked?'Start wandering':'Take a little stroll';button.setAttribute('aria-pressed','false');status.textContent=message;}
 function rest(){if(wander)wander.checked=false;stop();}
 if(wander)wander.onchange=()=>stop();
 function sync(){if(reduced.matches&&wander)wander.checked=false;stop(reduced.matches?'Your reduced-motion setting keeps HEART STONE still.':'HEART STONE is resting.');button.disabled=reduced.matches||typeof figure.animate!=='function';if(wander)wander.disabled=button.disabled;}
 button.onclick=()=>{
  if(animation){stop();return;}
  if(reduced.matches||document.hidden)return;
  try{
   const options={duration:5120,iterations:wander?.checked?Infinity:1,easing:'linear'};
   animation=window.HeartStoneGait?window.HeartStoneGait.animate(figure,options):figure.animate([{opacity:1},{opacity:1}],options);
   const current=animation;current.onfinish=()=>{if(animation===current)stop();};
   button.textContent='Pause movement';button.setAttribute('aria-pressed','true');status.textContent=wander?.checked?'Wandering inside this space until you pause.':'Taking a little stroll inside this space.';
  }catch(e){stop('Movement is unavailable. HEART STONE can stay still.');}
 };
 const visibility=()=>{if(document.hidden)rest();};
 reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',visibility);
 document.addEventListener('keydown',event=>{if(event.key==='Escape')rest();});
 // A cached page may return; preserve its reduced-motion and visibility listeners.
 window.addEventListener('pagehide',rest);
 document.addEventListener('heartstone:quiet',rest);
 sync();
})();

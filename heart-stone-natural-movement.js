/* Isolated animation study; no shared application changes, audio or persistence. */
(function(){
 'use strict';
 const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
 const play=document.getElementById('play'),status=document.getElementById('status');
 const figure=document.getElementById('character'),hide=document.getElementById('hide');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const sheet=new Image();let ready=false,request=0,start=null,active=false,draw=null;
 function frame(time){
  if(draw&&draw(time)){canvas.dataset.frame=String(time);return;}
  const w=sheet.naturalWidth/4,h=sheet.naturalHeight/2;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(sheet,0,0,w,h,0,0,canvas.width,canvas.height);
  canvas.dataset.frame='0';
 }
 function available(){play.disabled=!ready||!draw||reduced.matches||figure.hidden||document.hidden;}
 function stop(message='HEART STONE is resting. Press Play greeting to start again.'){
  active=false;cancelAnimationFrame(request);request=0;start=null;
  if(!ready)message='Loading movement study…';
  else if(!draw)message='Animation is unavailable. HEART STONE stays still.';
  else if(reduced.matches)message='Reduced motion is on. HEART STONE stays still.';
  if(ready)frame(0);play.setAttribute('aria-pressed','false');status.textContent=message;available();
 }
 function tick(time){
  if(!active)return;
  if(document.hidden||reduced.matches||figure.hidden){stop();return;}
  if(start===null)start=time;
  const elapsed=time-start;
  if(elapsed>=HeartStoneNaturalRig.duration){stop('Greeting finished. HEART STONE is resting.');return;}
  frame(elapsed);request=requestAnimationFrame(tick);
 }
 play.onclick=()=>{if(play.disabled)return;stop();active=true;play.setAttribute('aria-pressed','true');status.textContent='Playing a short greeting.';request=requestAnimationFrame(tick);};
 document.getElementById('stop').onclick=()=>stop();
 hide.onclick=()=>{stop();figure.hidden=!figure.hidden;hide.textContent=figure.hidden?'Show avatar':'Hide avatar';status.textContent=figure.hidden?'HEART STONE is hidden.':'HEART STONE is resting.';available();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape')stop();});
 document.addEventListener('visibilitychange',()=>stop());
 window.addEventListener('pagehide',()=>stop());window.addEventListener('pageshow',()=>stop());
 reduced.addEventListener('change',()=>stop(reduced.matches?'Reduced motion is on. HEART STONE stays still.':'HEART STONE is resting.'));
 canvas.addEventListener('heartstone:renderlost',()=>{draw=null;stop('Animation is unavailable. HEART STONE stays still. Reload to try again.');});
 sheet.onload=()=>{
  ready=true;canvas.width=sheet.naturalWidth/4;canvas.height=sheet.naturalHeight/2;
  try{draw=HeartStoneNaturalRig.renderer(canvas,sheet);}catch{draw=null;}
  stop(!draw?'Animation is unavailable. HEART STONE stays still.':reduced.matches?'Reduced motion is on. HEART STONE stays still.':'HEART STONE is ready. Press Play greeting.');
 };
 sheet.onerror=()=>{ready=false;available();status.textContent='The movement artwork could not load. Reload to try again.';};
 sheet.src='images/heartstone/greeting-study-v1.png';
})();

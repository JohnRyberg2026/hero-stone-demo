/* Isolated walking study. No audio, accounts, storage or shared application changes. */
(function(){
 'use strict';
 const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
 const play=document.getElementById('walk'),status=document.getElementById('status');
 const figure=document.getElementById('character'),hide=document.getElementById('hide');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),sheet=new Image();
 // Audited alpha bounds, not assumed equal grid cells. See docs/walking-atlas-registration.json.
 const atlas=[
  {x:51,y:10,w:270,h:405,hip:123},{x:393,y:10,w:229,h:404,hip:112},
  {x:748,y:10,w:196,h:405,hip:101.5},{x:63,y:416,w:240,h:400,hip:124},
  {x:391,y:416,w:278,h:399,hip:129},{x:757,y:416,w:203,h:400,hip:106.5},
  {x:87,y:815,w:198,h:381,hip:102},{x:409,y:816,w:248,h:380,hip:133.5}
 ];
 const frames=atlas.length,duration=2800,cycles=2;
 let ready=false,active=false,request=0,start=null,elapsed=0,failed=false;
 function draw(time){
  const t=Math.max(0,Math.min(1,time/duration)),progress=t*t*t*(10+t*(-15+6*t));
  const frame=Math.floor(progress*frames*cycles)%frames,cell=atlas[frame];
  const scale=460/cell.h,x=230+440*progress;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#b7a58d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(25,530);ctx.lineTo(875,530);ctx.stroke();
  ctx.drawImage(sheet,cell.x,cell.y,cell.w,cell.h,x-cell.hip*scale,530-cell.h*scale,cell.w*scale,cell.h*scale);
  canvas.dataset.frame=String(frame);canvas.dataset.position=String(x);canvas.dataset.elapsed=String(time);
 }
 function available(){play.disabled=!ready||reduced.matches||figure.hidden||document.hidden;}
 function stop(message='Walk paused. Press Play short walk to begin again.'){
  active=false;cancelAnimationFrame(request);request=0;start=null;play.setAttribute('aria-pressed','false');
  status.textContent=failed?'The walking artwork could not load. Reload to try again.':!ready?'Loading walking study…':reduced.matches?'Reduced motion is on. HEART STONE stays still.':message;available();
 }
 function tick(time){
  if(!active)return;
  if(document.hidden||figure.hidden||reduced.matches){stop();return;}
  if(start===null)start=time;
  elapsed=Math.min(duration,time-start);draw(elapsed);
  if(elapsed===duration){stop('Short walk finished. HEART STONE stays here until you choose another action.');return;}
  request=requestAnimationFrame(tick);
 }
 play.onclick=()=>{if(play.disabled)return;stop();elapsed=0;draw(0);active=true;status.textContent='Playing a short walk.';play.setAttribute('aria-pressed','true');request=requestAnimationFrame(tick);};
 document.getElementById('stop').onclick=()=>stop();
 document.getElementById('reset').onclick=()=>{stop('HEART STONE is at the start.');elapsed=0;if(ready)draw(0);};
 hide.onclick=()=>{stop();figure.hidden=!figure.hidden;hide.textContent=figure.hidden?'Show avatar':'Hide avatar';status.textContent=figure.hidden?'HEART STONE is hidden.':'HEART STONE stays where you paused her.';available();};
 document.addEventListener('keydown',event=>{if(event.key==='Escape')stop();});
 document.addEventListener('visibilitychange',()=>stop());
 window.addEventListener('pagehide',()=>stop());window.addEventListener('pageshow',()=>stop());
 reduced.addEventListener('change',()=>stop());
 sheet.onload=()=>{ready=true;draw(0);stop('Ready. Press Play short walk.');};
 sheet.onerror=()=>{ready=false;failed=true;stop();};
 sheet.src='images/heartstone/walking-study-v1.png';
})();

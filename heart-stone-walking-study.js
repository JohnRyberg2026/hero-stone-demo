/* Isolated walking study. No audio, accounts, storage or shared application changes. */
(function(){
 'use strict';
 const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
 const play=document.getElementById('walk'),status=document.getElementById('status');
 const figure=document.getElementById('character'),hide=document.getElementById('hide');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),sheet=new Image();
 const timing=HeartStoneWalkTiming,{atlas,duration}=timing;
 let ready=false,active=false,request=0,start=null,elapsed=0,failed=false;
 function draw(time){
  const pose=timing.sample(time),{frame,x}=pose,cell=atlas[frame],scale=460/cell.h;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#b7a58d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(25,530);ctx.lineTo(875,530);ctx.stroke();
  ctx.drawImage(sheet,cell.x,cell.y,cell.w,cell.h,x-cell.hip*scale,530-cell.h*scale,cell.w*scale,cell.h*scale);
  canvas.dataset.frame=String(frame);canvas.dataset.position=String(x);canvas.dataset.elapsed=String(time);
  canvas.dataset.contact=String(pose.contact);canvas.dataset.stance=String(pose.stance);
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

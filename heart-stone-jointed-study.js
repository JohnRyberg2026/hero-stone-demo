(function(){
 'use strict';
 const canvas=document.querySelector('canvas'),play=document.getElementById('walk'),status=document.getElementById('status');
 const figure=document.getElementById('character'),hide=document.getElementById('hide'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const image=new Image();let draw=null,active=false,request=0,start=null,elapsed=0,failed=false;
 const soften=document.getElementById('soften');
 function render(ms){draw?.(ms,{softJoints:soften.checked});}
 function available(){play.disabled=!draw||reduced.matches||figure.hidden||document.hidden;}
 function stop(message='HEART STONE is paused. Play starts a new short walk.'){
  active=false;cancelAnimationFrame(request);request=0;start=null;play.setAttribute('aria-pressed','false');
  status.textContent=failed?'Artwork could not load. Reload to try again.':!draw?'Loading animation study…':reduced.matches?'Reduced motion is on. HEART STONE stays still.':message;available();
 }
 function tick(time){
  if(!active)return;if(document.hidden||figure.hidden||reduced.matches){stop();return;}
  if(start===null)start=time;elapsed=Math.min(HeartStoneJointedGait.duration,time-start);render(elapsed);
  if(elapsed===HeartStoneJointedGait.duration){stop('Short walk finished. HEART STONE stays here.');return;}
  request=requestAnimationFrame(tick);
 }
 play.onclick=()=>{if(play.disabled)return;stop();elapsed=0;render(0);active=true;play.setAttribute('aria-pressed','true');status.textContent='Playing the continuous walk study.';request=requestAnimationFrame(tick);};
 document.getElementById('stop').onclick=()=>stop();
 document.getElementById('reset').onclick=()=>{stop('HEART STONE is at the start.');elapsed=0;render(0);};
 soften.onchange=()=>{stop('Joint view changed. HEART STONE stays paused.');render(elapsed);};
 hide.onclick=()=>{stop();figure.hidden=!figure.hidden;hide.textContent=figure.hidden?'Show avatar':'Hide avatar';status.textContent=figure.hidden?'HEART STONE is hidden.':'HEART STONE is paused.';available();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape')stop();});
 document.addEventListener('visibilitychange',()=>stop());window.addEventListener('pagehide',()=>stop());window.addEventListener('pageshow',()=>stop());reduced.addEventListener('change',()=>stop());
 image.onload=()=>{draw=HeartStoneJointedRenderer.mount(canvas,image);render(0);stop('Ready. Press Play short walk.');};image.onerror=()=>{failed=true;stop();};
 image.src='images/heartstone/jointed-parts-v1.png';
})();

/* Isolated blink rehearsal: no audio, microphone, account or persistence. */
(function(root){
 'use strict';
 function createBlink(draw,schedule,cancel,allowed){
  let timers=[],generation=0;
  function stop(){generation++;timers.forEach(cancel);timers=[];draw(0);}
  function play(){stop();if(!allowed())return false;const current=generation;
   [[45,1],[90,2],[145,1],[205,0]].forEach(([at,frame])=>timers.push(schedule(()=>{if(current!==generation)return;if(allowed())draw(frame);else stop();},at)));
   return true;
  }
  return {play,stop};
 }
 if(typeof module==='object'&&module.exports){module.exports={createBlink};return;}
 const canvas=document.getElementById('blinkPortrait');if(!canvas)return;
 const ctx=canvas.getContext('2d'),image=new Image(),play=document.getElementById('playBlink'),status=document.getElementById('blinkStatus'),portrait=document.getElementById('blinkStage'),show=document.getElementById('showBlink'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let ready=false;
 const draw=frame=>{if(!ready)return;canvas.dataset.frame=String(frame);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,frame*canvas.width,0,canvas.width,canvas.height,0,0,canvas.width,canvas.height);};
 const controller=createBlink(draw,(fn,ms)=>setTimeout(fn,ms),id=>clearTimeout(id),()=>ready&&!reduced.matches&&!document.hidden&&!portrait.hidden);
 function stop(){controller.stop();status.textContent='Still. Choose Play one blink to try again.';}
 function sync(){stop();play.disabled=!ready||reduced.matches;status.textContent=reduced.matches?'Reduced motion is on. The portrait stays still.':ready?'Ready. Nothing plays automatically.':'Loading portrait…';}
 image.onload=()=>{if(image.naturalWidth%3){status.textContent='Portrait asset is invalid.';return;}canvas.width=image.naturalWidth/3;canvas.height=image.naturalHeight;ready=true;sync();};
 image.onerror=()=>{status.textContent='Portrait could not load. Please reload to retry.';};
 play.onclick=()=>{if(controller.play())status.textContent='One short blink. No audio.';};
 document.getElementById('stopBlink').onclick=stop;document.getElementById('quietBlink').onclick=stop;
 document.getElementById('hideBlink').onclick=()=>{stop();portrait.hidden=true;show.hidden=false;show.focus();};
 show.onclick=()=>{portrait.hidden=false;show.hidden=true;sync();document.getElementById('hideBlink').focus();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape')stop();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);window.addEventListener('pageshow',sync);reduced.addEventListener('change',sync);
 image.src='images/heartstone/blink-strip-v1.webp';
})(typeof window==='object'?window:globalThis);

/* Speech-activity illustration, not phoneme lip sync. No audio capture. */
(function(root){
 'use strict';
 function createSpeechMotion(draw,schedule,cancel,allowed){
  let timer=null,generation=0,count=0;
  function stop(){generation++;if(timer!==null)cancel(timer);timer=null;draw(0);}
  function state(value){stop();if(value!=='speaking'||!allowed())return;const current=generation;count=0;
   function tick(){if(current!==generation)return;if(!allowed()||count>=150){stop();return;}draw([1,2,0,3,2,1,0][count++%7]);timer=schedule(tick,100);}
   tick();
  }
  return {state,stop};
 }
 if(typeof module==='object'&&module.exports){module.exports={createSpeechMotion};return;}
 const canvas=document.getElementById('speechPortrait');if(!canvas)return;
 const context=canvas.getContext('2d'),asset=new Image(),host=document.getElementById('avatarVoicePreview'),motion=document.getElementById('speechMotionEnabled'),stage=document.getElementById('speechStage'),show=document.getElementById('showSpeech'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),status=document.getElementById('speechArtStatus');let ready=false;
 const draw=frame=>{if(!ready)return;canvas.dataset.frame=String(frame);context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(asset,frame*canvas.width,0,canvas.width,canvas.height,0,0,canvas.width,canvas.height);};
 const controller=createSpeechMotion(draw,(fn,ms)=>setTimeout(fn,ms),id=>clearTimeout(id),()=>ready&&motion.checked&&!reduced.matches&&!document.hidden&&!stage.hidden);
 function motionSettings(){controller.stop();if(reduced.matches)motion.checked=false;motion.disabled=!ready||reduced.matches;status.textContent=reduced.matches?'Reduced motion: the portrait stays still.':ready?'Mouth movement is approximate speech activity, not exact lip sync.':'Loading portrait…';}
 asset.onload=()=>{if(asset.naturalWidth%4){status.textContent='Portrait asset is invalid.';return;}canvas.width=asset.naturalWidth/4;canvas.height=asset.naturalHeight;ready=true;motionSettings();};asset.onerror=()=>{status.textContent='Portrait could not load. Voice can still be used independently.';};
 host.addEventListener('heartstone:voice-state',event=>controller.state(event.detail.state));motion.onchange=()=>controller.stop();
 function quiet(){controller.stop();motion.checked=false;document.dispatchEvent(new Event('heartstone:quiet'));}
 document.getElementById('quietSpeech').onclick=quiet;
 document.getElementById('hideSpeech').onclick=()=>{quiet();stage.hidden=true;host.hidden=true;show.hidden=false;show.focus();};
 show.onclick=()=>{stage.hidden=false;host.hidden=false;show.hidden=true;motionSettings();document.getElementById('hideSpeech').focus();};
 document.addEventListener('keydown',event=>{if(event.key==='Escape')quiet();});document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();});root.addEventListener('pagehide',quiet);root.addEventListener('pageshow',motionSettings);reduced.addEventListener('change',motionSettings);
 asset.src='images/heartstone/speech-strip-v1.webp';
})(typeof window==='object'?window:globalThis);

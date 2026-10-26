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
 const eyes=new Image(),blinkButton=document.getElementById('speechBlink');let eyeReady=false,mouthFrame=0,eyeFrame=0;
 function patch(source,frame,regions){const layer=document.createElement('canvas');layer.width=canvas.width;layer.height=canvas.height;const lc=layer.getContext('2d');lc.drawImage(source,frame*canvas.width,0,canvas.width,canvas.height,0,0,canvas.width,canvas.height);const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;const mc=mask.getContext('2d');for(const [x,y,rx,ry] of regions){mc.setTransform(canvas.width*rx,0,0,canvas.height*ry,canvas.width*x,canvas.height*y);const gradient=mc.createRadialGradient(0,0,.65,0,0,1);gradient.addColorStop(0,'rgba(0,0,0,1)');gradient.addColorStop(1,'rgba(0,0,0,0)');mc.fillStyle=gradient;mc.fillRect(-1,-1,2,2);}lc.globalCompositeOperation='destination-in';lc.drawImage(mask,0,0);return layer;}
 function render(){if(!ready)return;canvas.dataset.frame=String(mouthFrame);canvas.dataset.eyeFrame=String(eyeFrame);context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(asset,0,0,canvas.width,canvas.height,0,0,canvas.width,canvas.height);if(mouthFrame)context.drawImage(patch(asset,mouthFrame,[[.51,.47,.17,.08]]),0,0);if(eyeReady&&eyeFrame)context.drawImage(patch(eyes,eyeFrame,[[.34,.366,.10,.052],[.55,.309,.10,.06]]),0,0);}
 const draw=frame=>{mouthFrame=frame;render();};
 const blink=root.HeartStoneBlink(frame=>{eyeFrame=frame;render();},(fn,ms)=>setTimeout(fn,ms),id=>clearTimeout(id),()=>ready&&eyeReady&&motion.checked&&!reduced.matches&&!document.hidden&&!stage.hidden);
 function blinkAvailability(){blinkButton.disabled=!ready||!eyeReady||!motion.checked||reduced.matches;}
 blinkButton.onclick=()=>blink.play();
 eyes.onload=()=>{if(eyes.naturalWidth!==asset.naturalWidth||eyes.naturalHeight!==asset.naturalHeight){status.textContent='Eye artwork does not match the portrait. Blinking stays off.';return;}eyeReady=true;blinkAvailability();render();};eyes.onerror=()=>{status.textContent='Eye artwork could not load. Blinking stays off.';};
 const controller=createSpeechMotion(draw,(fn,ms)=>setTimeout(fn,ms),id=>clearTimeout(id),()=>ready&&motion.checked&&!reduced.matches&&!document.hidden&&!stage.hidden);
 function motionSettings(){controller.stop();blink.stop();if(reduced.matches)motion.checked=false;motion.disabled=!ready||reduced.matches;blinkAvailability();status.textContent=reduced.matches?'Reduced motion: the portrait stays still.':ready?'Mouth movement is approximate speech activity, not exact lip sync.':'Loading portrait…';}
 asset.onload=()=>{if(asset.naturalWidth%4){status.textContent='Portrait asset is invalid.';return;}canvas.width=asset.naturalWidth/4;canvas.height=asset.naturalHeight;ready=true;motionSettings();eyes.src='images/heartstone/speech-eyes-v1.webp';};asset.onerror=()=>{status.textContent='Portrait could not load. Voice can still be used independently.';};
 host.addEventListener('heartstone:voice-state',event=>{controller.state(event.detail.state);if(event.detail.state==='speaking')blink.play();else blink.stop();});motion.onchange=()=>{controller.stop();blink.stop();blinkAvailability();};
 function quiet(){controller.stop();blink.stop();motion.checked=false;blinkAvailability();document.dispatchEvent(new Event('heartstone:quiet'));}
 document.getElementById('quietSpeech').onclick=quiet;
 document.getElementById('hideSpeech').onclick=()=>{quiet();stage.hidden=true;host.hidden=true;show.hidden=false;show.focus();};
 show.onclick=()=>{stage.hidden=false;host.hidden=false;show.hidden=true;motionSettings();document.getElementById('hideSpeech').focus();};
 document.addEventListener('keydown',event=>{if(event.key==='Escape')quiet();});document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();});root.addEventListener('pagehide',quiet);root.addEventListener('pageshow',motionSettings);reduced.addEventListener('change',motionSettings);
 asset.src='images/heartstone/speech-strip-v1.webp';
})(typeof window==='object'?window:globalThis);

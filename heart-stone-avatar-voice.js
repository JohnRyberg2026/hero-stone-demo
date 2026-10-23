/* Optional public-script voice rehearsal. No microphone, private text or storage. */
(function(root){
 'use strict';
 const GREETING='Hi, I’m HEART STONE. A little help, when you want it. You choose what happens next.';
 function createVoice(synth,Utterance,onState){
  let enabled=false,voice=null,owned=null,disposed=false;
  const supported=!!(synth&&Utterance);
  function report(state){if(!disposed)onState(state);}
  function stop(){const had=owned;owned=null;if(had)synth.cancel();report('silent');}
  return {
   supported,
   voices:()=>supported?synth.getVoices().filter(v=>v.lang&&/^en(?:-|$)/i.test(v.lang)):[],
   enable(value){stop();enabled=!!value&&supported&&!disposed;report(enabled?'ready':'silent');},
   select(value){stop();voice=value||null;},
   speak(){
    if(disposed||!enabled||!voice)return false;
    stop();const utterance=new Utterance(GREETING);owned=utterance;
    utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=0.95;
    utterance.onend=()=>{if(owned===utterance){owned=null;report('ready');}};
    utterance.onerror=()=>{if(owned===utterance){owned=null;report('error');}};
    try{report('speaking');synth.speak(utterance);return true;}catch(e){owned=null;report('error');return false;}
   },
   stop,
   dispose(){stop();enabled=false;disposed=true;}
  };
 }
 if(typeof module==='object'&&module.exports){module.exports={createVoice};return;}
 const host=document.getElementById('avatarVoicePreview');if(!host)return;
 const toggle=host.querySelector('[data-enable]'),select=host.querySelector('select'),play=host.querySelector('[data-play]'),stop=host.querySelector('[data-stop]'),status=host.querySelector('[role=status]');
 const engine=createVoice(root.speechSynthesis,root.SpeechSynthesisUtterance,state=>{status.textContent={silent:'HEART STONE is silent.',ready:'Voice is ready. Choose Hear greeting to listen.',speaking:'Speaking. Stop is always available.',error:'Voice could not play. You can continue silently.'}[state];});
 let available=[];
 function refresh(){available=engine.voices();select.replaceChildren(new Option('Choose a voice',''));available.forEach((v,i)=>select.add(new Option(v.name+' ('+v.lang+')'+(v.localService?' — on device':' — may use an online service'),String(i))));select.value='';engine.select(null);play.disabled=true;}
 toggle.disabled=!engine.supported;select.disabled=true;play.disabled=true;stop.disabled=!engine.supported;
 if(!engine.supported)status.textContent='Voice is unavailable in this browser. HEART STONE remains silent.';
 toggle.onchange=()=>{engine.enable(toggle.checked);select.disabled=!toggle.checked;if(!toggle.checked){select.value='';engine.select(null);}play.disabled=!toggle.checked||select.value==='';};
 select.onchange=()=>{engine.select(available[Number(select.value)]&&select.value!==''?available[Number(select.value)]:null);play.disabled=!toggle.checked||select.value==='';};
 play.onclick=()=>engine.speak();stop.onclick=()=>engine.stop();
 const visibility=()=>{if(document.hidden)engine.stop();};
 document.addEventListener('visibilitychange',visibility);
 host.addEventListener('keydown',event=>{if(event.key==='Escape')engine.stop();});
 // Keep listeners alive for browser back/forward cache restores; require fresh opt-in.
 root.addEventListener('pagehide',()=>{engine.enable(false);toggle.checked=false;select.value='';select.disabled=true;play.disabled=true;engine.select(null);});
 if(engine.supported){refresh();root.speechSynthesis.addEventListener('voiceschanged',refresh);}
})(typeof window==='object'?window:globalThis);

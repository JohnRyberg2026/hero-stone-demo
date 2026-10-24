/* Optional public-script voice rehearsal. No microphone, private text or storage. */
(function(root){
 'use strict';
 const GREETING='Hi, I’m HEART STONE. A little help, when you want it. You choose what happens next.';
 const TOUR_TEXT=[
  'Hi, I’m HEART STONE. Would you like help to choose where to begin?',
  'Let’s Connect opens invitations. Let’s Have an Adventure opens the date builder. You choose what happens next; an invitation still needs explicit approval.',
  'Our World opens your Living Story Book. Your own words belong in twelve monthly chapters, with private drafts and separate account-save confirmation.',
  'Explore opens saved wishes and ideas. You can also review adventure preferences. This development preview does not automatically book, buy, share or send anything.'
 ];
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
   speak(text=GREETING){
    if(disposed||!enabled||!voice||![GREETING,...TOUR_TEXT].includes(text))return false;
    stop();const utterance=new Utterance(text);owned=utterance;
    utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=0.95;
    utterance.onstart=()=>{if(owned===utterance)report('speaking');};
    utterance.onend=()=>{if(owned===utterance){owned=null;report('ready');}};
    utterance.onerror=()=>{if(owned===utterance){owned=null;report('error');}};
    try{report('waiting');synth.speak(utterance);return true;}catch(e){owned=null;report('error');return false;}
   },
   stop,
   dispose(){stop();enabled=false;disposed=true;}
  };
 }
 if(typeof module==='object'&&module.exports){module.exports={createVoice};return;}
 const host=document.getElementById('avatarVoicePreview');if(!host)return;
 const toggle=host.querySelector('[data-enable]'),select=host.querySelector('select'),play=host.querySelector('[data-play]'),stop=host.querySelector('[data-stop]'),status=host.querySelector('[role=status]');
 const engine=createVoice(root.speechSynthesis,root.SpeechSynthesisUtterance,state=>{status.textContent={silent:'HEART STONE is silent.',ready:'Voice is ready. Choose Hear greeting to listen.',waiting:'Waiting for your device’s voice. If nothing plays, stop or choose another voice.',speaking:'Speaking. Stop is always available.',error:'Voice could not play. You can try Hear again, choose another voice, or continue silently.'}[state];});
 const guide=document.getElementById('heartStoneGuide'),message=document.getElementById('heartStoneGuideMessage');
 const hearStep=document.createElement('button');hearStep.type='button';hearStep.textContent='Hear this step';hearStep.disabled=true;
 if(guide&&message)message.insertAdjacentElement('afterend',hearStep);
 function updateStep(){hearStep.disabled=!toggle.checked||select.value===''||!guide||guide.hidden||!TOUR_TEXT.includes(message?.textContent);}
 hearStep.onclick=()=>{if(!hearStep.disabled)engine.speak(message.textContent);};
 const changed=()=>{engine.stop();updateStep();};
 if(guide&&message){new MutationObserver(changed).observe(message,{childList:true,subtree:true,characterData:true});new MutationObserver(changed).observe(guide,{attributes:true,attributeFilter:['hidden']});}
 let available=[];
 function voiceKey(v){return v?JSON.stringify([v.voiceURI||'',v.name,v.lang,!!v.localService]):'';}
 function availability(){
  select.disabled=!toggle.checked||available.length===0;
  play.disabled=!toggle.checked||select.value==='';updateStep();
  if(available.length===0)status.textContent='No English voices are available yet. You can continue silently; voices will appear here if your browser loads them.';
 }
 function refresh(){
  const previous=select.value===''?'':voiceKey(available[Number(select.value)]);
  available=engine.voices();select.replaceChildren(new Option('Choose a voice',''));
  available.forEach((v,i)=>select.add(new Option(v.name+' ('+v.lang+')'+(v.localService?' — on device':' — may use an online service'),String(i))));
  const index=previous?available.findIndex(v=>voiceKey(v)===previous):-1;
  select.value=index<0?'':String(index);engine.select(index<0?null:available[index]);availability();
  if(previous&&index<0&&available.length)status.textContent='Your selected voice is no longer available. Choose another voice to listen.';
 }
 toggle.disabled=!engine.supported;select.disabled=true;play.disabled=true;stop.disabled=!engine.supported;
 if(!engine.supported)status.textContent='Voice is unavailable in this browser. HEART STONE remains silent.';
 toggle.onchange=()=>{engine.enable(toggle.checked);if(!toggle.checked){select.value='';engine.select(null);}availability();};
 select.onchange=()=>{engine.select(available[Number(select.value)]&&select.value!==''?available[Number(select.value)]:null);availability();};
 play.onclick=()=>engine.speak();stop.onclick=()=>engine.stop();
 const visibility=()=>{if(document.hidden)engine.stop();};
 document.addEventListener('visibilitychange',visibility);
 host.addEventListener('keydown',event=>{if(event.key==='Escape')engine.stop();});
 // Keep listeners alive for browser back/forward cache restores; require fresh opt-in.
 function quiet(){engine.enable(false);toggle.checked=false;select.value='';select.disabled=true;play.disabled=true;engine.select(null);updateStep();}
 root.addEventListener('pagehide',quiet);
 document.addEventListener('heartstone:quiet',quiet);
 if(engine.supported){refresh();root.speechSynthesis.addEventListener('voiceschanged',refresh);}
})(typeof window==='object'?window:globalThis);

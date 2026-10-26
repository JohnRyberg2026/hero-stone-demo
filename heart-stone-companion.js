/* Invited, in-flow companion shell. No audio, automatic animation, storage,
   profile access or network requests. Tour progress lasts only in this page. */
(function(){
 'use strict';
 const host=document.getElementById('heartStoneCompanion');if(!host)return;
 host.innerHTML='<button type="button" id="meetHeartStone" aria-expanded="false" aria-controls="heartStoneGuide"><svg aria-hidden="true" width="190" height="225" viewBox="0 0 240 280" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hsRuby" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#ff8c83"/><stop offset=".25" stop-color="#d53c57"/><stop offset=".65" stop-color="#861d3e"/><stop offset="1" stop-color="#380f2d"/></linearGradient><linearGradient id="hsMetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6dfad"/><stop offset=".3" stop-color="#b99359"/><stop offset=".65" stop-color="#705038"/><stop offset="1" stop-color="#e4c78d"/></linearGradient><linearGradient id="hsLimb" x1="0" y1="0" x2="1" y2=".3"><stop stop-color="#514d52"/><stop offset=".45" stop-color="#a7a09a"/><stop offset="1" stop-color="#494149"/></linearGradient><radialGradient id="hsGlow" cx=".35" cy=".15" r=".8"><stop stop-color="#fff1d0" stop-opacity=".5"/><stop offset="1" stop-color="#fff1d0" stop-opacity="0"/></radialGradient></defs><ellipse cx="120" cy="255" rx="48" ry="7" fill="#392e38" opacity=".13"/><g data-rig="leftLeg"><path d="M104 169Q99 205 105 243" fill="none" stroke="#382d35" stroke-width="20" stroke-linecap="round"/><path d="M104 169Q99 205 105 243" fill="none" stroke="url(#hsLimb)" stroke-width="15" stroke-linecap="round"/></g><g data-rig="rightLeg"><path d="M136 169Q141 205 135 243" fill="none" stroke="#382d35" stroke-width="20" stroke-linecap="round"/><path d="M136 169Q141 205 135 243" fill="none" stroke="url(#hsLimb)" stroke-width="15" stroke-linecap="round"/></g><g data-rig="leftFoot" transform="translate(105 245)"><path d="M-10-4Q-9-9-2-8L12-3Q17 2 13 5H-10Q-14 3-10-4" fill="url(#hsMetal)" stroke="#463333" stroke-width="2"/></g><g data-rig="rightFoot" transform="translate(135 245)"><path d="M-10-4Q-9-9-2-8L12-3Q17 2 13 5H-10Q-14 3-10-4" fill="url(#hsMetal)" stroke="#463333" stroke-width="2"/></g><g data-rig="leftArm"><path d="M76 121Q58 145 68 169" fill="none" stroke="#40313a" stroke-width="17" stroke-linecap="round"/><path d="M76 121Q58 145 68 169" fill="none" stroke="url(#hsLimb)" stroke-width="12" stroke-linecap="round"/></g><g data-rig="rightArm"><path d="M164 121Q182 145 172 169" fill="none" stroke="#40313a" stroke-width="17" stroke-linecap="round"/><path d="M164 121Q182 145 172 169" fill="none" stroke="url(#hsLimb)" stroke-width="12" stroke-linecap="round"/></g><g data-rig="leftHand" transform="translate(68 169)"><ellipse rx="9" ry="12" fill="url(#hsMetal)" stroke="#483139" stroke-width="2"/><path d="M-4-2L-3 5M1-3L2 5" stroke="#705039" stroke-width="1.3" stroke-linecap="round"/></g><g data-rig="rightHand" transform="translate(172 169)"><ellipse rx="9" ry="12" fill="url(#hsMetal)" stroke="#483139" stroke-width="2"/><path d="M-4-2L-3 5M1-3L2 5" stroke="#705039" stroke-width="1.3" stroke-linecap="round"/></g><g data-rig="body"><path d="M99 155L96 175Q120 186 144 175L141 155" fill="url(#hsMetal)" stroke="#4c3037" stroke-width="3"/><path d="M120 169C103 158 64 133 64 97C64 65 100 55 120 78C140 55 176 65 176 97C176 133 137 158 120 169Z" fill="url(#hsMetal)" stroke="#523039" stroke-width="3"/><path d="M120 160C103 148 73 126 73 98C73 72 102 65 120 89C138 65 167 72 167 98C167 126 137 148 120 160Z" fill="url(#hsRuby)" stroke="#f6c2a0" stroke-opacity=".55" stroke-width="1.5"/><path d="M78 98L105 79L120 90L143 78L162 99L151 129L120 155L91 132Z" fill="none" stroke="#ffbdad" stroke-opacity=".15" stroke-width="1.4"/><path d="M77 97Q78 74 100 77Q108 78 112 84" fill="none" stroke="#fff1d8" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/><path d="M120 160C103 148 73 126 73 98C73 72 102 65 120 89C138 65 167 72 167 98C167 126 137 148 120 160Z" fill="url(#hsGlow)"/><path d="M94 108Q100 103 106 108M134 108Q140 103 146 108" fill="none" stroke="#3c1429" stroke-width="4" stroke-linecap="round"/><ellipse cx="101" cy="113" rx="3.5" ry="5" fill="#fff0da"/><ellipse cx="139" cy="113" rx="3.5" ry="5" fill="#fff0da"/><path d="M109 132Q120 138 131 132" fill="none" stroke="#ffd0ad" stroke-width="2.4" stroke-linecap="round"/><circle cx="77" cy="121" r="9" fill="url(#hsMetal)" stroke="#69413d" stroke-width="2"/><circle cx="163" cy="121" r="9" fill="url(#hsMetal)" stroke="#69413d" stroke-width="2"/></g></svg><span>Meet HEART STONE</span></button><button type="button" id="heartStoneMotion" aria-pressed="false">Allow playful motion</button><p id="heartStoneMotionStatus" role="status"></p><button type="button" id="hideHeartStone">Hide HEART STONE</button><button type="button" id="restoreHeartStone" hidden>Show HEART STONE</button><div id="heartStoneGuide" hidden><h2 id="heartStoneGuideTitle" tabindex="-1">A little help, when you want it.</h2><p id="heartStoneGuideMessage" aria-live="polite"></p><button type="button" id="startHeartStoneTour">Show me around</button><button type="button" id="nextHeartStoneStep" hidden>Next</button><button type="button" id="closeHeartStoneGuide">Maybe later</button><p>Silent and optional. Motion starts off; you can choose a little playful movement. This short tour remembers your place only while this page stays open.</p></div>';
 const $=id=>document.getElementById(id);
 const welcome=host.dataset.guide==='welcome';
 const steps=welcome?[
  'Let’s Connect opens invitations. Let’s Have an Adventure opens the date builder. You choose what happens next; an invitation still needs explicit approval.',
  'Our World opens your Living Story Book. Your own words belong in twelve monthly chapters, with private drafts and separate account-save confirmation.',
  'Explore opens saved wishes and ideas. You can also review adventure preferences. This development preview does not automatically book, buy, share or send anything.'
 ]:[
  'Your book is an annual volume with twelve monthly chapters. Start with your own words; no memories are generated for you.',
  'Capture a moment with the date it happened. You can edit your words later, and the moment stays in its original month. Cancel keeps the existing draft unchanged.',
  'Preview notes are unsaved until you explicitly save to your signed-in account and receive confirmation. My saved volumes reopens your own books. Nothing here is shared or published.'
 ];
 let step=-1,motion=false,animation=null;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 function stopMotion(){animation?.cancel();animation=null;}
 function motionLabel(){
  $('heartStoneMotion').setAttribute('aria-pressed',String(motion));
  $('heartStoneMotion').textContent=motion?'Sit still':'Allow playful motion';
  $('heartStoneMotionStatus').textContent=reduced.matches?'Your reduced-motion setting keeps HEART STONE still.':motion?'Playful motion enabled for this page only.':'HEART STONE stays still.';
 }
 function react(celebrate=false){
  stopMotion();if(!motion||reduced.matches)return;
  const svg=$('meetHeartStone').querySelector('svg');
  animation=window.HeartStoneGait?window.HeartStoneGait.animate(svg,{duration:5120,iterations:1,easing:'linear'}):null;
 }
 $('heartStoneMotion').onclick=()=>{motion=!motion&&!reduced.matches;motionLabel();if(motion)react();else stopMotion();};
 reduced.addEventListener('change',()=>{if(reduced.matches){motion=false;stopMotion();}motionLabel();});
 motionLabel();
 function close(){ stopMotion();$('heartStoneGuide').hidden=true;$('meetHeartStone').setAttribute('aria-expanded','false');$('meetHeartStone').focus(); }
 function render(){
  $('heartStoneGuideMessage').textContent=step<0?(welcome?'Hi, I’m HEART STONE. Would you like help to choose where to begin?':'Hi, I’m HEART STONE. Would you like a short tour of your Living Story Book?'):steps[step];
  $('startHeartStoneTour').hidden=step>=0;$('nextHeartStoneStep').hidden=step<0;
  $('nextHeartStoneStep').textContent=step===steps.length-1?'Finish tour':'Next';
  $('closeHeartStoneGuide').textContent=step<0?'Maybe later':'Pause tour';
 }
 $('meetHeartStone').onclick=()=>{$('heartStoneGuide').hidden=false;$('meetHeartStone').setAttribute('aria-expanded','true');render();$('heartStoneGuideTitle').focus();react();};
 $('startHeartStoneTour').onclick=()=>{step=0;render();};
 $('nextHeartStoneStep').onclick=()=>{if(step===steps.length-1){close();$('meetHeartStone').querySelector('span').textContent='Ask HEART STONE';react(true);}else{step++;render();}};
 $('closeHeartStoneGuide').onclick=close;
 $('hideHeartStone').onclick=()=>{close();$('meetHeartStone').hidden=true;$('hideHeartStone').hidden=true;$('heartStoneMotion').hidden=true;$('heartStoneMotionStatus').hidden=true;$('restoreHeartStone').hidden=false;$('restoreHeartStone').focus();};
 $('restoreHeartStone').onclick=()=>{$('meetHeartStone').hidden=false;$('hideHeartStone').hidden=false;$('heartStoneMotion').hidden=false;$('heartStoneMotionStatus').hidden=false;$('restoreHeartStone').hidden=true;$('meetHeartStone').focus();};
 host.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('heartStoneGuide').hidden){event.preventDefault();close();}});
})();

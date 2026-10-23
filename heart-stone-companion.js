/* Invited, in-flow companion shell. No audio, automatic animation, storage,
   profile access or network requests. Tour progress lasts only in this page. */
(function(){
 'use strict';
 const host=document.getElementById('heartStoneCompanion');if(!host)return;
 host.innerHTML='<button type="button" id="meetHeartStone" aria-expanded="false" aria-controls="heartStoneGuide"><svg aria-hidden="true" width="72" height="72" viewBox="0 0 100 100"><path d="M21 51L9 57M79 51L91 46M38 76L34 91M63 76L68 91" stroke="#47352b" stroke-width="5" stroke-linecap="round"/><path d="M50 81C39 72 15 56 15 36C15 14 41 11 50 29C59 11 85 14 85 36C85 56 61 72 50 81" fill="#bd2945" stroke="#7e1930" stroke-width="3"/><circle cx="38" cy="42" r="3" fill="#fff9ed"/><circle cx="62" cy="42" r="3" fill="#fff9ed"/><path d="M38 55Q50 66 62 55" fill="none" stroke="#fff9ed" stroke-width="3" stroke-linecap="round"/></svg><span>Meet HEART STONE</span></button><button type="button" id="hideHeartStone">Hide HEART STONE</button><button type="button" id="restoreHeartStone" hidden>Show HEART STONE</button><div id="heartStoneGuide" hidden><h2 id="heartStoneGuideTitle" tabindex="-1">A little help, when you want it.</h2><p id="heartStoneGuideMessage" aria-live="polite"></p><button type="button" id="startHeartStoneTour">Show me around</button><button type="button" id="nextHeartStoneStep" hidden>Next</button><button type="button" id="closeHeartStoneGuide">Maybe later</button><p>Silent, still and optional. This short tour remembers your place only while this page stays open.</p></div>';
 const $=id=>document.getElementById(id);
 const steps=[
  'Your book is an annual volume with twelve monthly chapters. Start with your own words; no memories are generated for you.',
  'Capture a moment with the date it happened. You can edit your words later, and the moment stays in its original month. Cancel keeps the existing draft unchanged.',
  'Preview notes are unsaved until you explicitly save to your signed-in account and receive confirmation. My saved volumes reopens your own books. Nothing here is shared or published.'
 ];
 let step=-1;
 function close(){ $('heartStoneGuide').hidden=true;$('meetHeartStone').setAttribute('aria-expanded','false');$('meetHeartStone').focus(); }
 function render(){
  $('heartStoneGuideMessage').textContent=step<0?'Hi, I’m HEART STONE. Would you like a short tour of your Living Story Book?':steps[step];
  $('startHeartStoneTour').hidden=step>=0;$('nextHeartStoneStep').hidden=step<0;
  $('nextHeartStoneStep').textContent=step===steps.length-1?'Finish tour':'Next';
  $('closeHeartStoneGuide').textContent=step<0?'Maybe later':'Pause tour';
 }
 $('meetHeartStone').onclick=()=>{$('heartStoneGuide').hidden=false;$('meetHeartStone').setAttribute('aria-expanded','true');render();$('heartStoneGuideTitle').focus();};
 $('startHeartStoneTour').onclick=()=>{step=0;render();};
 $('nextHeartStoneStep').onclick=()=>{if(step===steps.length-1){close();$('meetHeartStone').querySelector('span').textContent='Ask HEART STONE';}else{step++;render();}};
 $('closeHeartStoneGuide').onclick=close;
 $('hideHeartStone').onclick=()=>{close();$('meetHeartStone').hidden=true;$('hideHeartStone').hidden=true;$('restoreHeartStone').hidden=false;$('restoreHeartStone').focus();};
 $('restoreHeartStone').onclick=()=>{$('meetHeartStone').hidden=false;$('hideHeartStone').hidden=false;$('restoreHeartStone').hidden=true;$('meetHeartStone').focus();};
 host.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('heartStoneGuide').hidden){event.preventDefault();close();}});
})();

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
(async()=>{
 const html=fs.readFileSync(process.env.AVATAR_WELCOME==='actual'?'heart-stone-welcome-preview.html':process.env.AVATAR_WELCOME?'heart-stone-avatar-welcome-preview.html':'heart-stone-avatar-voice-preview.html','utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost/'}),w=dom.window,d=w.document;
 const voices=[{name:'Test English voice',lang:'en-US',localService:true}],spoken=[],animations=new Set();let cancellations=0,voicesChanged;
 const media={matches:false,addEventListener(){},removeEventListener(){}};w.matchMedia=()=>media;
 w.speechSynthesis={getVoices:()=>voices,speak:u=>spoken.push(u.text),cancel:()=>cancellations++,addEventListener(name,fn){if(name==='voiceschanged')voicesChanged=fn;},removeEventListener(){}};
 w.SpeechSynthesisUtterance=function(text){this.text=text;};
 w.Element.prototype.animate=function(){const a={target:this,cancel(){animations.delete(a);}};animations.add(a);return a;};
 for(const tag of d.querySelectorAll('script[src*="heart-stone"]'))w.eval(fs.readFileSync(tag.getAttribute('src'),'utf8'));
 const $=s=>d.querySelector(s),click=s=>$(s).click(),tick=()=>new Promise(r=>setImmediate(r));
 function enable(){const checkbox=$('[data-enable]');checkbox.checked=true;checkbox.dispatchEvent(new w.Event('change'));$('select').value='0';$('select').dispatchEvent(new w.Event('change'));}
 if(process.env.AVATAR_WELCOME){assert.equal(d.querySelectorAll('nav a').length,4);assert.equal(d.querySelector('body').dataset.questAudience,'date');assert(d.querySelector('script[src^="quest-access.js"]'));}
 assert.equal(d.querySelectorAll('svg').length,1);assert($('#avatarSettings').hidden);assert.equal(spoken.length,0);assert.equal(animations.size,0);
 click('#avatarSettingsToggle');assert(!$('#avatarSettings').hidden);enable();click('[data-play]');click('#avatarMotionPreview button');assert.equal(spoken.length,1);assert.equal(animations.size,1);assert.equal([...animations][0].target,$('#meetHeartStone svg'));
 click('#avatarSettingsToggle');assert($('#avatarSettings').hidden);assert.equal(animations.size,0);assert.equal(cancellations,1);assert(!$('[data-enable]').checked);
 click('#avatarSettingsToggle');enable();$('select').focus();$('select').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert($('#avatarSettings').hidden);assert.equal(d.activeElement.id,'avatarSettingsToggle');
 click('#avatarSettingsToggle');enable();click('#meetHeartStone');await tick();const hear=Array.from(d.querySelectorAll('button')).find(b=>b.textContent==='Hear this step');assert(!hear.disabled);hear.click();assert(spoken.at(-1).includes('Would you like help'));const before=spoken.length,canceled=cancellations;
 click('#startHeartStoneTour');await tick();assert.equal(spoken.length,before);assert.equal(cancellations,canceled+1);hear.click();assert(spoken.at(-1).includes('Let’s Connect'));
 click('#closeHeartStoneGuide');await tick();assert(hear.disabled);click('#meetHeartStone');await tick();$('#heartStoneGuideMessage').textContent='Private notes';await tick();assert(hear.disabled);const privateBefore=spoken.length;hear.click();assert.equal(spoken.length,privateBefore);
 enable();click('[data-play]');click('#avatarMotionPreview button');click('#hideHeartStone');assert($('#avatarSettings').hidden);assert($('#avatarSettingsToggle').hidden);assert.equal(animations.size,0);assert(!$('[data-enable]').checked);const hiddenCount=spoken.length;click('#restoreHeartStone');assert($('#avatarSettings').hidden);assert(!$('#avatarSettingsToggle').hidden);assert.equal(spoken.length,hiddenCount);
 click('#avatarSettingsToggle');enable();click('[data-play]');w.dispatchEvent(new w.Event('pagehide'));assert(!$('[data-enable]').checked);assert($('[data-play]').disabled);
 click('#avatarSettingsToggle');if($('#avatarSettings').hidden)click('#avatarSettingsToggle');enable();const chosen=voices[0];const count=spoken.length;
 voices.unshift({name:'Another voice',lang:'en-GB',localService:true});voicesChanged();assert.equal($('select').value,'1');click('[data-play]');assert.equal(spoken.length,count+1);
 voices.splice(1,1);voicesChanged();assert.equal($('select').value,'');assert($('[data-play]').disabled);assert($('#avatarVoicePreview [role=status]').textContent.includes('no longer available'));
 voices.length=0;voicesChanged();assert($('select').disabled);assert($('#avatarVoicePreview [role=status]').textContent.includes('No English voices'));const emptyCount=spoken.length;
 voices.push(chosen);voicesChanged();assert(!$('select').disabled);assert.equal($('select').value,'');assert($('[data-play]').disabled);assert.equal(spoken.length,emptyCount);$('select').value='0';$('select').dispatchEvent(new w.Event('change'));click('[data-play]');assert.equal(spoken.length,emptyCount+1);
 dom.window.close();console.log('PASS avatar real-script DOM integration: one figure, coordinated quiet/close, Escape focus, narrated tour, changed-text rejection, hide/restore and page exit. Layout and audio are not tested.');
})().catch(e=>{console.error(e);process.exitCode=1;});

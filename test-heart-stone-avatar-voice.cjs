'use strict';
const assert=require('node:assert/strict');
const {createVoice}=require('./heart-stone-avatar-voice.js');
let spoken=[],canceled=0,states=[];
const synth={getVoices:()=>[{name:'English',lang:'en-US'},{name:'Other',lang:'fr-FR'}],speak:u=>spoken.push(u),cancel:()=>canceled++};
function Utterance(text){this.text=text;}
const voice=createVoice(synth,Utterance,s=>states.push(s));
assert.equal(voice.speak(),false);assert.equal(spoken.length,0);
assert.equal(voice.voices().length,1);
voice.select(voice.voices()[0]);assert.equal(voice.speak(),false);
voice.enable(true);assert.equal(voice.speak(),true);
const first=spoken[0];assert.match(first.text,/Hi, I’m HEART STONE/);
voice.stop();assert.equal(canceled,1);first.onend();assert.equal(states.at(-1),'silent');
voice.speak();voice.enable(false);assert.equal(voice.speak(),false);assert.equal(canceled,2);
voice.enable(true);voice.speak();voice.dispose();assert.equal(canceled,3);assert.equal(voice.speak(),false);
const missing=createVoice(null,null,()=>{});assert.equal(missing.supported,false);assert.equal(missing.speak(),false);
const broken=createVoice({...synth,speak(){throw Error('unavailable');}},Utterance,s=>states.push(s));broken.select(synth.getVoices()[0]);broken.enable(true);assert.equal(broken.speak(),false);assert.equal(states.at(-1),'error');
console.log('Avatar voice consent, stop, stale callback, disposal and unavailable-engine checks passed.');

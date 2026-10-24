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
assert.equal(voice.speak('My private memory'),false);assert.equal(spoken.length,1);
const first=spoken[0];assert.match(first.text,/Hi, I’m HEART STONE/);
voice.stop();assert.equal(canceled,1);first.onend();assert.equal(states.at(-1),'silent');
voice.speak();voice.enable(false);assert.equal(voice.speak(),false);assert.equal(canceled,2);
voice.enable(true);voice.speak();voice.dispose();assert.equal(canceled,3);assert.equal(voice.speak(),false);
const missing=createVoice(null,null,()=>{});assert.equal(missing.supported,false);assert.equal(missing.speak(),false);
const broken=createVoice({...synth,speak(){throw Error('unavailable');}},Utterance,s=>states.push(s));broken.select(synth.getVoices()[0]);broken.enable(true);assert.equal(broken.speak(),false);assert.equal(states.at(-1),'error');
console.log('Avatar voice consent, stop, stale callback, disposal and unavailable-engine checks passed.');

const tour=createVoice(synth,Utterance,()=>{});tour.select(synth.getVoices()[0]);tour.enable(true);assert.equal(tour.speak('Hi, I’m HEART STONE. Would you like help to choose where to begin?'),true);assert.equal(spoken.at(-1).text,'Hi, I’m HEART STONE. Would you like help to choose where to begin?');tour.stop();

// Browser events can arrive after cancellation, or out of order for replaced speech.
let playbackStates=[],utterances=[];
const playback=createVoice({...synth,speak:u=>utterances.push(u)},Utterance,s=>playbackStates.push(s));
playback.select(synth.getVoices()[0]);playback.enable(true);playback.speak();assert.equal(playbackStates.at(-1),'waiting');
const pending=utterances[0];pending.onstart();assert.equal(playbackStates.at(-1),'speaking');playback.stop();pending.onstart();pending.onerror();pending.onend();assert.equal(playbackStates.at(-1),'silent');
playback.speak();const superseded=utterances[1];playback.speak();superseded.onstart();superseded.onerror();assert.equal(playbackStates.at(-1),'waiting');
utterances[2].onerror();assert.equal(playbackStates.at(-1),'error');const calls=utterances.length;playback.speak();assert.equal(utterances.length,calls+1);utterances.at(-1).onstart();assert.equal(playbackStates.at(-1),'speaking');utterances.at(-1).onend();assert.equal(playbackStates.at(-1),'ready');playback.dispose();
console.log('PASS voice playback: waiting/start/end/error, late callbacks after Stop/replacement, and explicit retry.');

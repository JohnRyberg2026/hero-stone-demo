'use strict';
const assert=require('node:assert/strict'),{createSpeechMotion}=require('./heart-stone-speech-motion.js');let frames=[],queue=[],allowed=true;const canceled=[];
const c=createSpeechMotion(f=>frames.push(f),(fn,ms)=>{const id={fn,ms};queue.push(id);return id;},id=>canceled.push(id),()=>allowed);
assert.deepEqual(frames,[]);c.state('waiting');assert.deepEqual(frames,[0]);assert.equal(queue.length,0);c.state('speaking');assert.equal(frames.at(-1),1);assert.equal(queue[0].ms,100);
const stale=queue[0];c.state('ready');const n=frames.length;stale.fn();assert.equal(frames.length,n);assert.equal(frames.at(-1),0);assert(canceled.length);
allowed=false;queue=[];c.state('speaking');assert.equal(queue.length,0);allowed=true;queue=[];c.state('speaking');allowed=false;queue[0].fn();assert.equal(frames.at(-1),0);
allowed=true;queue=[];c.state('speaking');for(let i=0;i<151;i++){const task=queue.shift();if(task)task.fn();}assert.equal(frames.at(-1),0);assert.equal(queue.length,0);
console.log('PASS speech movement: silent/waiting rest, actual-start gating, cancellation, stale callbacks, permission and bounded playback');

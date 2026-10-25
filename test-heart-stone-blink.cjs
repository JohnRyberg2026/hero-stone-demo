'use strict';
const assert=require('node:assert/strict'),{createBlink}=require('./heart-stone-blink.js');
let queue=[],frames=[],allowed=true;const canceled=[];
const c=createBlink(f=>frames.push(f),(fn,ms)=>{const id={fn,ms};queue.push(id);return id;},id=>canceled.push(id),()=>allowed);
assert.deepEqual(frames,[]);assert(c.play());assert.deepEqual(frames,[0]);assert.deepEqual(queue.map(x=>x.ms),[45,90,145,205]);queue.forEach(x=>x.fn());assert.deepEqual(frames,[0,1,2,1,0]);
queue=[];frames=[];c.play();const stale=queue.slice();c.stop();const count=frames.length;stale.forEach(x=>x.fn());assert.equal(frames.length,count);assert(canceled.length>=4);
queue=[];frames=[];allowed=false;assert.equal(c.play(),false);assert.equal(queue.length,0);assert.deepEqual(frames,[0]);
allowed=true;queue=[];frames=[];c.play();allowed=false;queue[0].fn();assert.equal(frames.at(-1),0);
console.log('PASS blink: no auto-play, ordered eyelids, rest reset, cancel, stale callbacks and motion permission');

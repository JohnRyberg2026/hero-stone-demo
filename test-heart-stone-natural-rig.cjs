'use strict';
const assert=require('node:assert/strict'),rig=require('./heart-stone-natural-rig.js');
// Feet, knees and pelvis must remain planted throughout playback and at rest.
for(let time=0;time<=rig.duration;time+=10)for(const x of [.1,.45,.6,.9])for(const y of [.57,.75,.95,1])assert.deepEqual(rig.point(x,y,time),[x,y]);
for(const x of [.1,.4,.7,1])for(const y of [.1,.3,.5]){
 assert.deepEqual(rig.point(x,y,0),[x,y]);assert.deepEqual(rig.point(x,y,rig.duration),[x,y]);
}
// Adjacent time samples move continuously, with no inverted or collapsed mesh cells.
let moved=false;
for(let time=0;time<=rig.duration;time+=20)for(let row=0;row<56;row++)for(let col=0;col<40;col++){
 const x=col/40,y=row/56,p=rig.point(x,y,time),next=rig.point(x,y,time+1);
 assert(p.every(Number.isFinite));assert(Math.hypot(next[0]-p[0],next[1]-p[1])<.0002);
 const a=rig.point(x+1/40,y,time),b=rig.point(x,y+1/56,time);
 const area=(a[0]-p[0])*(b[1]-p[1])-(a[1]-p[1])*(b[0]-p[0]);assert(area>0,'rig mesh must not fold');
 if(Math.hypot(p[0]-x,p[1]-y)>.002)moved=true;
}
assert(moved,'gesture must visibly articulate');console.log('PASS anchored lower body, continuous endpoints, finite motion and non-folding mesh');

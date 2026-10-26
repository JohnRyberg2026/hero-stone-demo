'use strict';
const assert=require('node:assert/strict'),walk=require('./heart-stone-walk-timing.js');
let previous=230;
for(let ms=0;ms<=walk.duration;ms++){
 const p=walk.sample(ms),cell=walk.atlas[p.frame],scale=460/cell.h;
 assert(p.x>=previous-1e-9,'registered root must not reverse');previous=p.x;
 assert(Math.abs(p.x+(cell.sole-cell.hip)*scale-p.contact)<1e-9,'supporting sole must match world contact');
 assert(p.x-cell.hip*scale>=0&&p.x+(cell.w-cell.hip)*scale<=900,'complete pose must remain on stage');
 const before=walk.sample(Math.floor(ms/walk.frameDuration)*walk.frameDuration);
 assert.equal(p.x,before.x,'no body drift while a pose is held');
 if(ms%500!==0)assert.equal(p.contact,walk.sample(ms-1).contact,'contact changes only on step handoff');
}
assert.equal(walk.sample(0).x,230);assert.equal(walk.sample(walk.duration).x,670);
assert.equal(walk.sample(-10).x,230);assert.equal(walk.sample(Infinity).x,230);
console.log('PASS held-pose stability, registered contacts, cadence, forward travel and stage bounds');

const assert=require('node:assert/strict'),{pose}=require('./heart-stone-avatar-gait.js');
// World-space foot remains planted throughout a stance, rather than sliding
// with a translated character. Swing clears the floor; bones stay connected.
const first=pose(.08).left,second=pose(.42).left;
assert(first.stance&&second.stance);assert(Math.abs(first.foot[0]-second.foot[0])<1e-9);assert.equal(first.foot[1],245);assert.equal(second.foot[1],245);
assert(pose(1.02).left.foot[1]<235);
for(let t=0;t<5.12;t+=.017){const p=pose(t);assert(Math.abs(p.body[0])<=28);for(const l of [p.left,p.right]){assert(l.foot[1]<=245);for(const n of [...l.hip,...l.knee,...l.foot])assert(Number.isFinite(n));const upper=Math.hypot(l.hip[0]-l.knee[0],l.hip[1]-l.knee[1]),lower=Math.hypot(l.foot[0]-l.knee[0],l.foot[1]-l.knee[1]);assert(Math.abs(upper-42)<.1);assert(Math.abs(lower-42)<.1);}}
const a=pose(.1),b=pose(5.22);assert(Math.abs(a.body[0]-b.body[0])<1e-8);assert(Math.abs(a.left.foot[0]-b.left.foot[0])<1e-8);
console.log('PASS articulated gait: planted stance, lifted swing, connected fixed-length legs, bounded travel and seamless loop.');

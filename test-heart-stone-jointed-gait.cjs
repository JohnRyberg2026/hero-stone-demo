'use strict';
const assert=require('node:assert/strict'),gait=require('./heart-stone-jointed-gait.js'),distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
let previous=null;
for(let ms=0;ms<=gait.duration;ms++){
 const pose=gait.pose(ms);
 for(const name of ['near','far']){
  const leg=pose.legs[name];
  assert(Math.abs(distance(leg.hip,leg.knee)-gait.upper)<1e-7,'fixed thigh length');
  assert(Math.abs(distance(leg.knee,leg.foot)-gait.lower)<1e-7,'fixed shin length');
  assert(leg.foot[1]<=500+1e-8,'foot must clear ground');
  assert(leg.foot.every(Number.isFinite));
  if(previous){
   const old=previous.legs[name];
   assert(distance(leg.foot,old.foot)<1,'foot path must be continuous');
   if(old.stance&&leg.stance)assert(distance(leg.foot,old.foot)<1e-8,'planted ankle must remain fixed');
   assert(distance(leg.knee,old.knee)<1,'knee path must be continuous');
  }
 }
 const near=pose.arms.near,far=pose.arms.far;
 assert(Math.abs(distance(near.shoulder,near.elbow)-58)<1e-7);assert(Math.abs(distance(near.elbow,near.wrist)-62)<1e-7);
 assert((near.elbow[0]-near.shoulder[0])*(far.elbow[0]-far.shoulder[0])<=1e-8,'arms swing in opposition');
 previous=pose;
}
console.log('PASS fixed bones, planted ankles, swing clearance, continuous paths and opposing arm swing');

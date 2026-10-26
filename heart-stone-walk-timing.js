/* Registered supporting soles for the review atlas, not a full skeletal gait. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HeartStoneWalkTiming=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const atlas=[
  {x:51,y:10,w:270,h:405,hip:123,sole:216.5},{x:393,y:10,w:229,h:404,hip:112,sole:164.5},
  {x:748,y:10,w:196,h:405,hip:101.5,sole:105},{x:63,y:416,w:240,h:400,hip:124,sole:156},
  {x:391,y:416,w:278,h:399,hip:129,sole:220.5},{x:757,y:416,w:203,h:400,hip:106.5,sole:141.5},
  {x:87,y:815,w:198,h:381,hip:102,sole:118.5},{x:409,y:816,w:248,h:380,hip:133.5,sole:175}
 ];
 // Supporting sole moves front-to-under-hip within each group, avoiding root reversal.
 const order=[0,1,3,2,4,7,5,6],frameDuration=125,duration=2000;
 const offset=i=>(atlas[i].sole-atlas[i].hip)*460/atlas[i].h;
 function sample(time){
  const elapsed=Number.isFinite(time)?Math.max(0,Math.min(duration,time)):0;
  const tick=Math.min(16,Math.floor(elapsed/frameDuration));
  const frame=order[tick%8],stance=Math.floor(tick/4);
  const contact=230+offset(0)+stance*110,x=230+stance*110+(offset(0)-offset(frame));
  return {frame,stance,contact,x,elapsed,done:elapsed===duration};
 }
 return {atlas,order,duration,frameDuration,sample};
});

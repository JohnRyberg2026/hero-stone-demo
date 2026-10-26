/* Continuous painted-limb research rig. Geometry is separate from the approved art. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HeartStoneJointedGait=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const duration=2400,cycle=1.2,speed=170,upper=114,lower=122;
 function rootAt(t){return 230+speed*t;}
 function solve(hip,foot){
  const dx=foot[0]-hip[0],dy=foot[1]-hip[1],d=Math.hypot(dx,dy);
  const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  return [hip[0]+dx/d*along+dy/d*height,hip[1]+dy/d*along-dx/d*height];
 }
 function pose(ms){
  const t=Math.max(0,Math.min(duration,Number.isFinite(ms)?ms:0))/1000;
  const x=rootAt(t),bob=-.9*Math.cos(4*Math.PI*t/cycle),legs={},arms={};
  for(const [name,offset,shift,sign]of [['near',-28,0,1],['far',28,cycle/2,-1]]){
   const phaseTime=t+shift,n=Math.floor(phaseTime/cycle),phase=phaseTime/cycle-n;
   const contact=n*cycle-shift,anchor=rootAt(contact)+offset+50;
   let fx=anchor,fy=500;
   if(phase>=.58){const p=(phase-.58)/.42,e=p*p*(3-2*p);fx+=speed*cycle*e;fy-=25*Math.sin(Math.PI*p)**2;}
   const hip=[x+offset,280+bob],foot=[fx,fy],knee=solve(hip,foot);
   legs[name]={hip,knee,foot,stance:phase<.58};
   const a=sign*.28*Math.cos(2*Math.PI*t/cycle),shoulder=[x+(name==='near'?-46:33),150+(name==='near'?0:5)+bob];
   const elbow=[shoulder[0]-Math.sin(a)*58,shoulder[1]+Math.cos(a)*58];
   const wrist=[elbow[0]-Math.sin(a-.18)*62,elbow[1]+Math.cos(a-.18)*62];
   arms[name]={shoulder,elbow,wrist};
  }
  return {x,bob,legs,arms};
 }
 return {pose,duration,upper,lower,cycle};
});

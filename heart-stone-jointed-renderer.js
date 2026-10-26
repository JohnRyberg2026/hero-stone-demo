/* Painted cutout rendering; no pose blending, regenerated faces or stretched bone lengths. */
(function(){
 'use strict';
 const parts={
  body:{x:193,y:9,w:321,h:545},
  nearUpper:{x:613,y:212,w:106,h:240,a:[.575,.12],b:[.35,.89]},
  farUpper:{x:902,y:208,w:112,h:243,a:[.339,.09],b:[.696,.905]},
  nearFore:{x:288,y:559,w:96,h:280,a:[.323,.093],b:[.49,.67]},
  farFore:{x:608,y:561,w:112,h:262,a:[.259,.092],b:[.67,.698]},
  nearThigh:{x:915,y:537,w:146,h:297,a:[.315,.111],b:[.795,.896]},
  farThigh:{x:273,y:844,w:135,h:305,a:[.689,.111],b:[.281,.895]},
  nearShin:{x:604,y:846,w:204,h:378,a:[.25,.079],b:[.284,.738]},
  farShin:{x:929,y:845,w:200,h:380,a:[.305,.079],b:[.27,.737]}
 };
 function mount(canvas,image){
  const ctx=canvas.getContext('2d');
  const textures=new Map();let softJoints=true;
  for(const [name,part]of Object.entries(parts)){
   const texture=document.createElement('canvas');texture.width=part.w;texture.height=part.h;
   const paint=texture.getContext('2d');paint.drawImage(image,part.x,part.y,part.w,part.h,0,0,part.w,part.h);
   if(part.a&&(name.endsWith('Upper')||name.endsWith('Thigh')||name.endsWith('Shin'))){
    const ax=part.a[0]*part.w,ay=part.a[1]*part.h,bx=part.b[0]*part.w,by=part.b[1]*part.h;
    const shin=name.endsWith('Shin'),end=shin?1.02:1.15,start=shin ? .86 : .85,begin=shin?0:-.1;
    const mask=paint.createLinearGradient(ax+(bx-ax)*begin,ay+(by-ay)*begin,ax+(bx-ax)*end,ay+(by-ay)*end);
    mask.addColorStop(0,shin?'#fff':'#fff0');
    if(!shin)mask.addColorStop((.2-begin)/(end-begin),'#fff');
    mask.addColorStop((start-begin)/(end-begin),'#fff');mask.addColorStop(1,'#fff0');
    paint.globalCompositeOperation='destination-in';paint.fillStyle=mask;paint.fillRect(0,0,part.w,part.h);
   }
   textures.set(part,texture);
  }
  function bone(part,a,b,width=1,clip=1,raw=false,paint=ctx){
   const ax=part.a[0]*part.w,ay=part.a[1]*part.h,bx=part.b[0]*part.w,by=part.b[1]*part.h;
   const sourceAngle=Math.atan2(by-ay,bx-ax),targetAngle=Math.atan2(b[1]-a[1],b[0]-a[0]);
   const scale=Math.hypot(b[0]-a[0],b[1]-a[1])/Math.hypot(bx-ax,by-ay);
   paint.save();paint.translate(a[0],a[1]);paint.rotate(targetAngle);paint.scale(scale,scale*width);paint.rotate(-sourceAngle);paint.translate(-ax,-ay);
   if(softJoints&&!raw)paint.drawImage(textures.get(part),0,0,part.w,part.h,0,0,part.w,part.h);
   else paint.drawImage(image,part.x,part.y,part.w,part.h*clip,0,0,part.w,part.h*clip);
   paint.restore();return scale;
  }
  const sockets={};for(const name of ['near','far']){const layer=document.createElement('canvas');layer.width=64;layer.height=64;sockets[name]=layer;}
  function leg(name,pose){
   const shin=parts[name+'Shin'],thigh=parts[name+'Thigh'];
   const scale=bone(shin,pose.knee,pose.foot,.9,.77);
   const cut=.66,footScale=scale*.62;
   ctx.save();ctx.translate(pose.foot[0],pose.foot[1]);ctx.scale(footScale,footScale);
   ctx.drawImage(image,shin.x,shin.y+shin.h*cut,shin.w,shin.h*(1-cut),-shin.b[0]*shin.w,(cut-shin.b[1])*shin.h,shin.w,shin.h*(1-cut));ctx.restore();
   if(softJoints){
    // Painted upper-thigh overlap fills the hip socket beneath the denim hem.
    // It follows the body more than the thigh, then blends into the rotating limb.
    const dx=(pose.knee[0]-pose.hip[0])*.3;
    const length=HeartStoneJointedGait.upper,socketEnd=[pose.hip[0]+dx,pose.hip[1]+Math.sqrt(length*length-dx*dx)];
    const layer=sockets[name],paint=layer.getContext('2d');paint.setTransform(1,0,0,1,0,0);paint.globalCompositeOperation='source-over';paint.clearRect(0,0,64,64);
    paint.translate(32-pose.hip[0],26-pose.hip[1]);bone(thigh,pose.hip,socketEnd,.8,1,true,paint);
    paint.setTransform(1,0,0,1,0,0);paint.globalCompositeOperation='destination-in';
    const fade=paint.createRadialGradient(32,26,10,32,26,28);fade.addColorStop(0,'#fff');fade.addColorStop(1,'#fff0');
    paint.fillStyle=fade;paint.fillRect(0,0,64,64);ctx.drawImage(layer,pose.hip[0]-32,pose.hip[1]-26);
   }
   bone(thigh,pose.hip,pose.knee,.8);
  }
  function arm(name,pose){
   if(softJoints){bone(parts[name+'Fore'],pose.elbow,pose.wrist);bone(parts[name+'Upper'],pose.shoulder,pose.elbow);}
   else{bone(parts[name+'Upper'],pose.shoulder,pose.elbow);bone(parts[name+'Fore'],pose.elbow,pose.wrist);}
  }
  return function draw(ms,options={}){
   softJoints=options.softJoints!==false;
   const p=HeartStoneJointedGait.pose(ms);ctx.clearRect(0,0,canvas.width,canvas.height);
   ctx.strokeStyle='#b7a58d';ctx.beginPath();ctx.moveTo(25,532);ctx.lineTo(875,532);ctx.stroke();
   arm('far',p.arms.far);leg('far',p.legs.far);leg('near',p.legs.near);
   const body=parts.body,s=250/body.h;
   ctx.drawImage(image,body.x,body.y,body.w,body.h,p.x-body.w*.61*s,280+p.bob-body.h*.96*s,body.w*s,body.h*s);
   // Near arm passes in front of the torso; drawing it behind hid it during forward swing.
   arm('near',p.arms.near);
   canvas.dataset.position=String(p.x);canvas.dataset.elapsed=String(ms);
   canvas.dataset.joints=softJoints?'softened':'original';
  };
 }
 window.HeartStoneJointedRenderer={mount};
})();

/* Articulated two-bone gait. Stance feet are anchored in world coordinates;
   swing feet lift and land, with small weight shifts and opposing arms. */
(function(root){
 'use strict';
 const cycle=1.28,travel=t=>28*Math.sin(2*Math.PI*t/5.12),facing=t=>Math.cos(2*Math.PI*t/5.12)>=0?1:-1;
 function leg(t,side){
  const shifted=t+(side==='right'?cycle/2:0),n=Math.floor(shifted/cycle),phase=shifted/cycle-n;
  const contact=n*cycle-(side==='right'?cycle/2:0),offset=side==='left'?-15:15;
  const anchor=time=>travel(time)+offset+facing(time)*6;
  let x=anchor(contact),y=245,angle=0;
  if(phase<.62){angle=phase<.12?-7*(1-phase/.12):phase>.49?10*(phase-.49)/.13:0;}
  else{const p=(phase-.62)/.38,e=p*p*(3-2*p);x+=(anchor(contact+cycle)-x)*e;y-=16*Math.sin(Math.PI*p);angle=-9*Math.sin(Math.PI*p);}
  const hx=120+travel(t)+offset,hy=170-1.1*Math.cos(4*Math.PI*t/cycle),dx=x+120-hx,dy=y-hy,dist=Math.min(83.5,Math.hypot(dx,dy));
  const h=Math.sqrt(Math.max(0,42*42-dist*dist/4));
  const kneeX=(hx+x+120)/2+facing(t)*dy/Math.max(1,dist)*h,kneeY=(hy+y)/2-facing(t)*dx/Math.max(1,dist)*h;
  return {hip:[hx,hy],knee:[kneeX,kneeY],foot:[x+120,y],angle,stance:phase<.62};
 }
 function pose(t){return{body:[travel(t),-1.1*Math.cos(4*Math.PI*t/cycle)],left:leg(t,'left'),right:leg(t,'right'),arm:Math.sin(2*Math.PI*t/cycle)};}
 function mount(svg){
  const parts={};for(const name of ['body','leftLeg','rightLeg','leftFoot','rightFoot','leftArm','rightArm','leftHand','rightHand']){parts[name]=svg.querySelector('[data-rig="'+name+'"]');if(!parts[name])return null;}
  const originals=Object.values(parts).map(el=>[el,el.getAttribute('transform'),Array.from(el.querySelectorAll('path')).map(p=>[p,p.getAttribute('d')])]);
  function path(group,points){const d='M'+points.map(p=>p.map(v=>v.toFixed(2)).join(' ')).join('L');for(const el of group.querySelectorAll('path'))el.setAttribute('d',d);}
  return{frame(t){const p=pose(t);parts.body.setAttribute('transform',`translate(${p.body[0]} ${p.body[1]})`);
   for(const [side,sign]of [['left',-1],['right',1]]){const l=p[side];path(parts[side+'Leg'],[l.hip,l.knee,l.foot]);parts[side+'Foot'].setAttribute('transform',`translate(${l.foot[0]} ${l.foot[1]}) rotate(${l.angle})`);
    const x=120+p.body[0]+sign*44,swing=p.arm*sign;const points=[[x,121+p.body[1]],[x+sign*13+swing*5,145+p.body[1]],[x+sign*8+swing*10,169-2*Math.abs(swing)+p.body[1]]];path(parts[side+'Arm'],points);parts[side+'Hand'].setAttribute('transform',`translate(${points[2][0]} ${points[2][1]}) rotate(${-swing*8})`);
   }
  },reset(){for(const [el,tr,paths]of originals){if(tr===null)el.removeAttribute('transform');else el.setAttribute('transform',tr);for(const [p,d]of paths)p.setAttribute('d',d);}}};
 }
 function animate(svg,options){
  const rig=mount(svg),player=svg.animate([{opacity:1},{opacity:1}],options),cancel=player.cancel.bind(player);let frameId=null,ended=false;
  function cleanup(){ended=true;if(frameId!==null)root.cancelAnimationFrame(frameId);rig?.reset();}
  function tick(){if(ended)return;rig?.frame(((Number(player.currentTime)||0)/1000)%5.12);frameId=root.requestAnimationFrame(tick);}
  player.cancel=()=>{cleanup();cancel();};player.addEventListener?.('finish',cleanup,{once:true});
  if(rig)frameId=root.requestAnimationFrame(tick);return player;
 }
 if(typeof module==='object'&&module.exports)module.exports={pose};else root.HeartStoneGait={mount,animate};
})(typeof window==='object'?window:globalThis);

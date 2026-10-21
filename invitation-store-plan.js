'use strict';
const InvitationStorePlan=(()=>{
 const key='hs_plan_invitation_transfer_v1';
 function clean(raw){if(!raw||raw.version!==1)throw Error('This plan could not be read.');const str=(k,n)=>{if(typeof raw[k]!=='string'||raw[k].length>n)throw Error('This plan has an invalid '+k+'.');return raw[k].trim();};const p={version:1,title:str('title',120),story:str('story',2000),day:str('day',10),time:str('time',5),meet:str('meet',160)};if(!p.title||!p.story)throw Error('The plan needs a name and wording.');if(p.day){const d=new Date(p.day+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(p.day)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==p.day)throw Error('The plan date is invalid.');}if(p.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time))throw Error('The plan time is invalid.');return p;}
 return {key,clean};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=InvitationStorePlan;
if(typeof document!=='undefined'&&document.getElementById('storePlanOffer'))(()=>{
 const el=id=>document.getElementById(id),M=InvitationStorePlan;let pending=null;
 el('openDateStore').onclick=e=>{e.preventDefault();if(save())location.href='date-store.html';};
 try{const raw=sessionStorage.getItem(M.key);if(raw){if(raw.length>12000)throw Error('This transferred plan is too large.');pending=M.clean(JSON.parse(raw));el('storePlanPreview').textContent=[pending.title,pending.story,'Day: '+(pending.day||'We’ll decide together'),'Time: '+(pending.time||'We’ll decide together'),'Meet: '+(pending.meet||'We’ll decide together')].join('\n\n');el('storePlanOffer').hidden=false;}}catch{el('storePlanOffer').hidden=false;el('applyStorePlan').disabled=true;el('storePlanStatus').textContent='This transferred plan could not be read. Your invitation has not changed. You can return to the Date Store to review it.';}
 el('dismissStorePlan').onclick=()=>{try{sessionStorage.removeItem(M.key);}catch{}pending=null;el('storePlanOffer').hidden=true;};
 el('applyStorePlan').onclick=()=>{if(!pending)return;
  const empty=!el('message').value.trim()&&!kind&&!el('experienceTitle').value.trim()&&!el('experienceStory').value.trim();
  const previous=empty&&saved?saved.experience:null;
  if((el('experienceTitle').value.trim()||el('experienceStory').value.trim()||previous?.experienceTitle||previous?.experienceStory)&&!confirm('Replace the current experience name, description, day, start time and meeting place with this reviewed plan? Your message, preparation notes and surprise choice stay. Your saved beginning changes only when you save again.'))return;
  if(empty&&saved)el('restore').onclick();
  el('experienceTitle').value=pending.title;el('experienceStory').value=pending.story;idea='';renderIdeas();if(!kind)kind='date';renderSelections();
  el('momentDate').value=pending.day;el('momentTime').value=pending.time;el('whenMode').value=pending.day&&pending.time?'specific':'together';el('whenMode').onchange();
  el('meetMode').value=pending.meet?'place':'together';el('meetPlace').value=pending.meet;el('meetMode').onchange();
  el('storePlanOffer').hidden=true;try{sessionStorage.removeItem(M.key);}catch{}pending=null;screen('details');status('Your reviewed plan is in this open invitation. Confirm the time, duration, meeting place and preparation, then continue. Nothing has been sent or saved automatically.');
 };
})();

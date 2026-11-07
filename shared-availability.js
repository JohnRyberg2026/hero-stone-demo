'use strict';
// Separate from the device-only calendar. Existing private hearts never upload.
(()=>{
 const panel=document.getElementById('dqSharedAvailability');if(!panel)return;
 const el=id=>document.getElementById(id),status=t=>el('dqSharedStatus').textContent=t;
 let generation=0,context=null,rows=[],busy=false,lastCalendarSignal='';
 function publishCalendar(){
  const partner=el('dqSharedPartner').value,c=context,active=rows.filter(r=>Date.parse(r.expires_at)>Date.now());
  const detail={user:c?.user||null,own:[],partner:[],name:c?.partners.find(p=>p.id===partner)?.name||'your partner'};
  if(c&&partner){detail.own=[...new Set(active.filter(r=>r.owner_id===c.user&&r.partner_id===partner).map(r=>r.day))].sort();detail.partner=[...new Set(active.filter(r=>r.owner_id===partner&&r.partner_id===c.user).map(r=>r.day))].sort();}
  const signature=JSON.stringify(detail);if(signature===lastCalendarSignal)return;lastCalendarSignal=signature;
  window.dispatchEvent(new CustomEvent('heartstone:shared-calendar-days',{detail}));
 }
 const zone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
 const dayNow=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
 el('dqSharedDay').value=dayNow();
 function clear(){generation++;context=null;rows=[];publishCalendar();el('dqSharedPartner').replaceChildren();el('dqSharedHearts').replaceChildren();el('dqShareDay').disabled=true;el('dqUnshareDay').disabled=true;status('Connect with your partner to share available days.');}
 function render(){
  const c=context,partner=el('dqSharedPartner').value,day=el('dqSharedDay').value;
  const own=rows.some(r=>r.owner_id===c?.user&&r.partner_id===partner&&r.day===day&&Date.parse(r.expires_at)>Date.now());
  el('dqShareDay').disabled=busy||!c||!partner||!day||day<dayNow()||own;
  el('dqUnshareDay').disabled=busy||!c||!partner||!own;
  el('dqSharedHearts').replaceChildren();
  if(!c)return;
  for(const r of rows.filter(r=>Date.parse(r.expires_at)>Date.now())){
   const other=c.partners.find(p=>p.id===(r.owner_id===c.user?r.partner_id:r.owner_id));if(!other)continue;
   const p=document.createElement('p');p.textContent=r.day+' · '+(r.owner_id===c.user?'♡ You shared availability with '+other.name:'♡ '+other.name+' shared availability with you');el('dqSharedHearts').append(p);
  }
  if(!el('dqSharedHearts').children.length){const p=document.createElement('p');p.textContent='No shared availability yet.';el('dqSharedHearts').append(p);}
 }
 async function verify(c){const u=await currentUser();if(!u||u.id!==c.user||heartStoneId!==c.hs){clear();throw Error('Your account or connection changed. Refresh availability.');}}
 async function refresh(){
  const v=++generation;context=null;rows=[];publishCalendar();render();status('Checking shared availability…');
  try{
   const u=await currentUser(),hs=heartStoneId;if(v!==generation)return;if(!u||!hs){clear();return;}
   const [partners,result]=await Promise.all([sb.rpc('get_moment_invitation_partners',{p_heart_stone_id:hs}),sb.rpc('list_shared_availability',{p_heart_stone_id:hs,p_expected_user:u.id})]);
   if(v!==generation)return;const c={user:u.id,hs,partners:partners.data||[]};await verify(c);if(v!==generation)return;
   if(partners.error||result.error)throw Error('Shared availability could not be loaded. Try Refresh availability.');
   context=c;rows=Array.isArray(result.data)?result.data:[];
   const previous=el('dqSharedPartner').value;el('dqSharedPartner').replaceChildren();
   for(const p of c.partners){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;el('dqSharedPartner').append(option);}
   if(c.partners.some(p=>p.id===previous))el('dqSharedPartner').value=previous;
   status(c.partners.length?'Shared hearts are date-only. Calendar details remain private.':'No active partner is connected.');render();publishCalendar();
  }catch(e){if(v===generation){context=null;rows=[];render();publishCalendar();status(e.message);}}
 }
 async function setShared(shared){
  if(busy||!context)return;const c=context,v=generation,partner=el('dqSharedPartner').value,day=el('dqSharedDay').value;
  if(!c.partners.some(p=>p.id===partner))return;
  busy=true;render();status(shared?'Sharing this day…':'Removing your shared heart…');
  try{
   await verify(c);if(v!==generation)return;
   const result=await sb.rpc('set_shared_availability',{p_heart_stone_id:c.hs,p_partner_id:partner,p_expected_user:c.user,p_day:day,p_zone:zone(),p_shared:shared});
   if(v!==generation)return;await verify(c);if(v!==generation)return;
   if(result.error)throw Error('The change could not be confirmed. Refresh availability before trying again.');
   await refresh();if(context?.user===c.user&&context?.hs===c.hs)status(shared?'♡ Day shared. Nothing invited, accepted or booked.':'Shared heart removed. Your private calendar is unchanged.');
  }catch(e){if(v===generation)status(e.message);}finally{busy=false;render();}
 }
 el('dqShareDay').onclick=()=>setShared(true);el('dqUnshareDay').onclick=()=>setShared(false);el('dqRefreshAvailability').onclick=refresh;
 el('dqSharedDay').onchange=render;el('dqSharedPartner').onchange=()=>{render();publishCalendar();};
 window.addEventListener('heartstone:calendar-day',e=>{el('dqSharedDay').value=e.detail.day;render();});
 window.addEventListener('heartstone:home-state',e=>{clear();if(e.detail?.connected)refresh();});
 window.addEventListener('focus',()=>{if(context)refresh();});window.addEventListener('pagehide',clear);
 window.setInterval(()=>{if(context){render();publishCalendar();}},60000);refresh();
})();

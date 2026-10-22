(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 let service=null,loading=null,account=null,self=null,people=[],current=null,reviewed=null,busy=false,dirty=false;
 const states={draft:'Private draft · Only you can see it.',pending:'Waiting for everyone to decide.',confirmed:'Everyone included has accepted this version.',closed:'This invitation round is closed.',needs_revision:'A different time was requested. A revised invitation is needed.',started:'This date is underway.',stopped:'Participation in this shared date has stopped.'};
 const responseLabels={pending:'Waiting for your answer',accepted:'You accepted',declined:'You declined',reschedule:'You requested another time',withdrawn:'You withdrew your acceptance'};
 function node(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
 function clear(){
  account=null;self=null;people=[];current=null;reviewed=null;dirty=false;
  $('sharedAccountIdentity').textContent='Account changed. Connect this screen again.';
  ['accountDateList','accountDateEditor','accountDateDetail'].forEach(id=>$(id).hidden=true);
  ['accountPeople','accountDateButtons','accountRoster','accountSendSnapshot'].forEach(id=>$(id).replaceChildren());
  ['accountDateTitle','accountDateWhen','accountDateMeeting','accountDetailTitle','accountDetailWhen','accountDetailMeeting','accountSelf','accountDateRevision','accountDetailState'].forEach(id=>{if('value' in $(id))$(id).value='';$(id).textContent='';});
  if($('accountSendReview').open)$('accountSendReview').close();
 }
 function client(){
  if(service)return Promise.resolve(service);
  if(!loading)loading=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.js';
   script.onload=()=>resolve();script.onerror=()=>{script.remove();loading=null;reject(Error('The account connection could not load. Please try again.'));};document.head.append(script);
  }).then(()=>{
   const sb=window.supabase.createClient('https://iqxhqxlcraatdheslqeo.supabase.co','sb_publishable_SIhJh737mEWvvmOm_4zuSw_4jh_BU_h');
   service=window.SharedDateService.create({client:sb,storage:localStorage,crypto,onAccountChange:clear});return service;
  });
  return loading;
 }
 function lock(on){busy=on;$('connectSharedAccount').disabled=on;$('accountDateFields').disabled=on;$('cancelAccountSend').disabled=false;$('cancelAccountSend').textContent=on&&$('accountSendReview').open?'Close — request may still complete':'Back — keep my draft';document.querySelectorAll('[data-shared-control]').forEach(b=>b.disabled=on);}
 async function run(fn){if(busy)return;lock(true);try{await fn();}catch(e){$('sharedAccountFeedback').textContent=e.message;}finally{lock(false);}}
 function discard(){return !dirty||confirm('Leave these unsaved edits? Your last account draft stays as saved.');}
 function pickPeople(ids){
  $('accountPeople').replaceChildren();$('accountSelf').textContent=(self?.name||'You')+' · You are included as organizer.';
  const available=new Set(people.map(p=>p.id));
  const missing=(current?.participants||[]).filter(p=>p.id!==self.id&&!available.has(p.id));
  for(const p of [...people,...missing]){
   const label=node('label'),input=node('input');input.type='checkbox';input.value=p.id;input.checked=ids.includes(p.id);input.dataset.available=String(available.has(p.id));
   input.onchange=()=>{dirty=true;};label.append(input,document.createTextNode(' '+p.name+(available.has(p.id)?'':' · No longer listed; uncheck to remove from a revised plan.')));$('accountPeople').append(label);
  }
 }
 function editor(date){
  $('accountDateEditor').hidden=false;
  $('accountEditorTitle').textContent=date?'Revise our plan':'A little time together';
  $('accountDateTitle').value=date?.title||'';$('accountDateWhen').value=date?.when||'We’ll decide together';$('accountDateMeeting').value=date?.meeting||'We’ll decide together';
  pickPeople(date?.participants?.map(p=>p.id)||[]);
  $('saveAccountDate').textContent=date?'Save revised private draft':'Save private draft to my account';dirty=false;
 }
 function payload(){
  const selected=[...$('accountPeople').querySelectorAll('input')].filter(i=>i.checked);
  if(selected.some(i=>i.dataset.available!=='true'))throw Error('A selected person is no longer listed. Refresh your connections or explicitly remove them from this revised plan.');
  const p={participants:[self.id,...selected.map(i=>i.value)].sort(),title:$('accountDateTitle').value.trim(),when:$('accountDateWhen').value.trim(),meeting:$('accountDateMeeting').value.trim()};
  if(p.participants.length<2||p.participants.length>20)throw Error('Include yourself and between 1 and 19 other people.');
  if(!p.title||!p.when||!p.meeting)throw Error('Add the date name, time or “decide together”, and meeting place.');return p;
 }
 function snapshot(container,date){
  container.replaceChildren();container.append(node('h3',date.title),node('p','When: '+date.when),node('p','Meeting: '+date.meeting));const list=node('ul');
  for(const p of date.participants||[])list.append(node('li',p.name+(p.id===account.id?' · You':'')));container.append(list);
 }
 function detail(date){
  current=date;reviewed=null;if($('accountSendReview').open)$('accountSendReview').close();
  $('accountDateDetail').hidden=false;$('accountDateEditor').hidden=true;dirty=false;
  $('accountDateRevision').textContent='Invitation round '+date.revision;
  $('accountDetailTitle').textContent=date.eligibility_required?'Your account eligibility or connection changed.':date.title;
  $('accountDetailWhen').textContent=date.eligibility_required?'The shared plan is hidden. You can still withdraw or stop participation.':'When: '+date.when;
  $('accountDetailMeeting').textContent=date.eligibility_required?'':'Meeting: '+date.meeting;
  $('accountDetailState').textContent=states[date.state]||'Refresh to check this date.';
  $('accountRoster').replaceChildren();
  for(const p of date.participants||[])$('accountRoster').append(node('li',p.name+' · '+(p.id===account.id?(responseLabels[p.response]||'Your response is unavailable'):'Response private')));
  const organizer=date.organizer===account.id,own=date.participants?.find(p=>p.id===account.id),responding=['pending','confirmed'].includes(date.state);
  $('reviewAccountSend').hidden=!organizer||date.state!=='draft'||!!date.eligibility_required;
  $('editAccountDate').hidden=!organizer||date.state==='started'||!!date.eligibility_required;
  document.querySelectorAll('[data-account-response]').forEach(b=>{
   const response=b.dataset.accountResponse;
   b.hidden=!responding||(response==='withdrawn'?!(own?.response==='accepted'||date.eligibility_required):date.eligibility_required||own?.response!=='pending');
  });
  $('beginAccountDate').hidden=date.state!=='confirmed'||!!date.eligibility_required;
  $('stopAccountDate').hidden=date.state!=='started';
 }
 async function refresh(){
  const rows=await service.action('list');if(!Array.isArray(rows))throw Error('Your date list could not be verified.');
  $('accountDateButtons').replaceChildren();
  if(!rows.length)$('accountDateButtons').append(node('p','No shared dates are waiting here.'));
  for(const date of rows){const b=node('button',(date.title||'Shared date')+' · '+(states[date.state]||date.state));b.type='button';b.dataset.sharedControl='';b.onclick=()=>run(async()=>{if(!discard())return;detail(await service.action('view',{date}));$('sharedAccountFeedback').textContent='Current invitation loaded.';});$('accountDateButtons').append(b);}
 }
 $('connectSharedAccount').onclick=()=>run(async()=>{
  if(!discard())return;clear();const api=await client(),context=await api.connect();account=context.account;self=context.self;people=context.people;
  $('sharedAccountIdentity').textContent='Signed in as '+(account.email||self.name||'your account');$('accountDateList').hidden=false;
  await refresh();$('sharedAccountFeedback').textContent='Your account is connected. Choose a date or make a new one.';
 });
 $('refreshAccountDates').onclick=()=>run(async()=>{
  if(!discard())return;await refresh();
  if(current){try{detail(await service.action('view',{date:current}));}catch(e){$('accountDateDetail').hidden=true;current=null;throw e;}}
  $('sharedAccountFeedback').textContent='Dates and responses refreshed.';
 });
 $('newAccountDate').onclick=()=>{if(busy||!account||!discard())return;current=null;$('accountDateDetail').hidden=true;editor(null);};
 ['accountDateTitle','accountDateWhen','accountDateMeeting'].forEach(id=>$(id).oninput=()=>{dirty=true;});
 $('saveAccountDate').onclick=()=>run(async()=>{
  const body=payload();const date=await service.action(current?'revise':'create',{date:current,payload:body});detail(date);
  $('sharedAccountFeedback').textContent='Private draft saved to your account. No invitation has been sent.';await refresh();
 });
 $('editAccountDate').onclick=()=>{if(!busy&&current&&account&&current.organizer===account.id)editor(current);};
 $('reviewAccountSend').onclick=()=>run(async()=>{
  const date=await service.action('view',{date:current});detail(date);
  if(date.state!=='draft'||date.organizer!==account.id||date.eligibility_required)throw Error('This draft changed. Review the current date before sending.');
  reviewed=date;snapshot($('accountSendSnapshot'),date);$('accountSendReview').showModal();
 });
 $('cancelAccountSend').onclick=()=>{reviewed=null;$('accountSendReview').close();if(busy)$('sharedAccountFeedback').textContent='The request has already started and may still complete. Closing this review does not undo it.';};
 $('accountSendReview').addEventListener('cancel',()=>{reviewed=null;if(busy)$('sharedAccountFeedback').textContent='The request has already started and may still complete. Closing this review does not undo it.';});
 $('confirmAccountSend').onclick=()=>run(async()=>{
  if(!reviewed)throw Error('Review the guest list before sending.');
  const date=await service.action('send',{date:reviewed});detail(date);$('sharedAccountFeedback').textContent='Invitation sent inside HEART STONE. Each person decides for themselves.';await refresh();
 });
 document.querySelectorAll('[data-account-response]').forEach(b=>b.onclick=()=>run(async()=>{
  const response=b.dataset.accountResponse;
  if(!confirm(response==='accepted'?'Accept this invitation version for yourself?':response==='withdrawn'?'Withdraw your acceptance? This closes the invitation round.':response==='declined'?'Decline this invitation? This closes the invitation round.':'Request a different time? This round will need a revised plan.'))return;
  detail(await service.action('respond',{date:current,payload:{response}}));$('sharedAccountFeedback').textContent='Your response was recorded. Other people’s individual responses stay private.';await refresh();
 }));
 $('beginAccountDate').onclick=()=>run(async()=>{if(!confirm('Begin this accepted date together?'))return;detail(await service.action('begin',{date:current}));$('sharedAccountFeedback').textContent='This shared date has begun.';await refresh();});
 $('stopAccountDate').onclick=()=>run(async()=>{if(!confirm('Stop your participation in this shared date?'))return;detail(await service.action('stop',{date:current}));$('sharedAccountFeedback').textContent='Participation has stopped.';await refresh();});
})();

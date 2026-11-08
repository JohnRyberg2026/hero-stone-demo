'use strict';
const DateHomeModel=(()=>{
 const kinds=['birthday','anniversary','holiday','tradition','milestone','reminder','wish','personal'];
 const day=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 function validDay(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number(s.slice(0,4))<1900||Number(s.slice(0,4))>2199)return false;const d=new Date(s+'T12:00:00');return Number.isFinite(d.getTime())&&day(d)===s;}
 function clean(raw){if(!raw||raw.version!==1||!Array.isArray(raw.events)||raw.events.length>200||!Array.isArray(raw.hearts)||raw.hearts.length>366)throw Error('This saved calendar could not be read.');const events=raw.events.map(e=>{if(!e||typeof e.id!=='string'||e.id.length>80||!e.id||typeof e.title!=='string'||!e.title.trim()||e.title.length>120||!kinds.includes(e.kind)||!validDay(e.day))throw Error('A calendar entry is invalid.');return {id:e.id,title:e.title.trim(),kind:e.kind,day:e.day};});if(new Set(events.map(e=>e.id)).size!==events.length)throw Error('Duplicate calendar entries.');return {version:1,events,hearts:[...new Set(raw.hearts.filter(validDay))]};}
 function active(items,userId){return (Array.isArray(items)?items:[]).filter(x=>x&&x.status==='accepted'&&!x.completed_at&&(x.sender_id===userId||x.recipient_id===userId)).map(x=>({id:String(x.id),title:x.reveal_mode==='all'?String(x.title||'A moment for us').slice(0,120):'A moment waiting for us',started:!!x.started_at,timeChangePending:x.time_change?.status==='pending',timeChangeNeedsReview:x.time_change?.status==='pending'&&x.time_change.proposed_by!==userId,day:x.plan?.whenMode==='specific'&&validDay(x.plan?.momentDate)?x.plan.momentDate:'',time:/^([01]\d|2[0-3]):[0-5]\d$/.test(x.plan?.momentTime||'')?x.plan.momentTime:'',zone:typeof x.plan?.momentZone==='string'?x.plan.momentZone.slice(0,80):''}));}
 function attention(items,userId){if(!userId)return 0;return (Array.isArray(items)?items:[]).filter(x=>x&&((x.status==='pending'&&x.recipient_id===userId)||(x.status==='reschedule'&&x.sender_id===userId)||(x.status==='accepted'&&!x.started_at&&!x.completed_at&&x.time_change?.status==='pending'&&x.time_change.proposed_by!==userId&&(x.sender_id===userId||x.recipient_id===userId)))).length;}
 function planLink(day){if(!validDay(day))throw Error('Choose a valid calendar day.');return 'invitation-opening.html?planDay='+encodeURIComponent(day)+'#heart-stone-plan';}
 function momentLink(id){return 'invitation-opening.html?moment='+encodeURIComponent(String(id))+'#shared-invitations';}
 function timeLabel(time){if(!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time))return 'Time to confirm';const [h,m]=time.split(':').map(Number);return (h%12||12)+':'+String(m).padStart(2,'0')+' '+(h<12?'AM':'PM');}
 function readWithTimeout(task,ms=15000){let timer;return Promise.race([task,new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('The connection is taking too long. Tap Refresh Calendar to try again.')),ms);})]).finally(()=>clearTimeout(timer));}
 const greeting=(hour,name)=>'Good '+(hour<12?'morning':hour<18?'afternoon':'evening')+(name?', '+name:'')+'.';
 return {kinds,day,validDay,clean,active,greeting,momentLink,timeLabel,planLink,attention,readWithTimeout};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=DateHomeModel;

if(typeof document!=='undefined'&&document.getElementById('dqCalendarTitle'))(()=>{
 const M=DateHomeModel,el=id=>document.getElementById(id),node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 let sharedDays={user:null,own:[],partner:[],name:'your partner'};
 let connectionVersion=0,lastConnection=null;
 let formBaseline=null,removedEntry=null;
 let owner=null,version=0,revision=0,data={version:1,events:[],hearts:[]},moments=[],selected=M.day(new Date()),month=new Date().getMonth(),year=new Date().getFullYear(),editing=null,readable=false,busy=false;
 const key=()=> 'hs_personal_calendar_demo_v1_'+owner;
 const say=t=>el('dqCalendarStatus').textContent=t;
 function formSnapshot(){return JSON.stringify(['dqEventName','dqEventDay','dqEventKind'].map(id=>el(id).value));}
 function hasCalendarEdits(){return !el('dqEventForm').hidden&&formBaseline!==null&&formSnapshot()!==formBaseline;}
 function canLeaveCalendarForm(){
   if(busy){say('Your calendar is still saving. Please wait a moment.');return false;}
   return !hasCalendarEdits()||confirm('Discard your unsaved calendar changes? Choose Cancel to keep editing.');
 }

 const action=(text,fn)=>{const b=node('button',text);b.type='button';b.className='secondary';b.onclick=fn;return b;};
 function reset(){
   formBaseline=null;removedEntry=null;lastConnection=null;busy=false;
   for(const id of ['dqEventName','dqEventDay','dqEventKind','dqCancelEvent','dqRefreshCalendar'])el(id).disabled=false;
   el('dqInvitationsLink').textContent='Our Invitations';
   version++;owner=null;sharedDays={user:null,own:[],partner:[],name:'your partner'};revision=0;readable=false;data={version:1,events:[],hearts:[]};moments=[];editing=null;
   el('dqEventForm').hidden=true;el('dqEventName').value='';el('dqEventDay').value='';
   el('dqGreeting').textContent='Welcome back.';el('dqMoments').replaceChildren();el('dqMomentsStatus').textContent='Sign in to see your moments.';
   for(const id of ['dqDayEvents','dqFutureWishes','dqDays'])el(id).replaceChildren();
   for(const id of ['dqAddEvent','dqAvailability','dqImportCalendar','dqPlanDay'])el(id).disabled=true;
   el('dqImportCalendar').hidden=true;say('Sign in to open your private calendar.');
 }
 async function authorized(expected=owner){
   const u=await currentUser();
   if(owner!==expected)throw Error('Your account changed. Reopen your calendar.');
   if(!u||u.id!==expected){reset();throw Error('Your account changed. Reopen your calendar.');}
   return u;
 }
 async function saveNext(next){
   if(busy||!readable)throw Error('Refresh your calendar before saving.');
   const clean=M.clean(next),user=owner,v=++version,expectedRevision=revision;
   busy=true;render();
   try{
     await authorized(user);
     if(v!==version)throw Error('Your account changed. Reopen your calendar.');
     const result=await sb.rpc('my_private_calendar',{p_expected_user:user,p_expected_revision:expectedRevision,p_calendar:clean});
     if(v!==version)throw Error('Your account changed. Reopen your calendar.');
     await authorized(user);
     if(v!==version)throw Error('Your account changed. Reopen your calendar.');
     if(result.error){
       if(result.error.code==='40001'){readable=false;throw Error('Your calendar changed on another device. Your typed words are still here. Refresh Calendar to load the latest version before editing again.');}
       throw Error('Could not confirm the save. Your words are still here. Refresh Calendar to check before trying again.');
     }
     if(!result.data||!Number.isInteger(result.data.revision))throw Error('Could not confirm the calendar save. Refresh Calendar to check.');
     data=M.clean(result.data.calendar);revision=result.data.revision;removedEntry=null;updateImport();
   }finally{if(v===version){busy=false;if(owner===user)render();}}
 }
 function updateImport(){
   try{const raw=localStorage.getItem(key());if(!raw){el('dqImportCalendar').hidden=true;return;}
     const local=M.clean(JSON.parse(raw));el('dqImportCalendar').hidden=!local.events.some(e=>!data.events.some(x=>x.id===e.id))&&!local.hearts.some(d=>!data.hearts.includes(d));
   }catch{el('dqImportCalendar').hidden=false;}
 }
 function render(){if(!owner)return;const today=M.day(new Date());el('dqGreeting').textContent=M.greeting(new Date().getHours(),el('profileFirstName').value.trim().slice(0,80));el('dqMonth').value=String(month);el('dqYear').value=String(year);el('dqMonthTitle').textContent=new Date(year,month,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});el('dqDays').replaceChildren();for(let i=0;i<new Date(year,month,1).getDay();i++)el('dqDays').append(node('span'));const days=new Date(year,month+1,0).getDate();for(let i=1;i<=days;i++){const date=M.day(new Date(year,month,i)),has=data.events.some(e=>e.day===date)||moments.some(e=>e.day===date),heart=date>=today&&data.hearts.includes(date),ownShared=date>=today&&sharedDays.user===owner&&sharedDays.own.includes(date),partnerShared=date>=today&&sharedDays.user===owner&&sharedDays.partner.includes(date),b=action(String(i),()=>{if(!canLeaveCalendarForm())return;selected=date;el('dqEventForm').hidden=true;formBaseline=null;render();});b.setAttribute('aria-pressed',String(date===selected));b.setAttribute('aria-label',date+(date===today?' · today':'')+(has?' · has entries':'')+(heart?' · private availability':'')+(ownShared&&partnerShared?' · both shared availability':partnerShared?' · partner shared availability':ownShared?' · you shared availability':''));b.append(node('span',(has?'• ':'')+(ownShared&&partnerShared?'♥♥':partnerShared?'♥':ownShared?'♡':heart?'◦':''),'dq-day-mark'));if(ownShared||partnerShared)b.className+=' dq-shared-day';el('dqDays').append(b);}
 if(typeof CustomEvent!=='undefined')window.dispatchEvent(new CustomEvent('heartstone:calendar-day',{detail:{day:selected}}));
 el('dqDayTitle').textContent=new Date(selected+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});el('dqDayEvents').replaceChildren();let count=0;
 if(sharedDays.user===owner&&selected>=today){const mine=sharedDays.own.includes(selected),theirs=sharedDays.partner.includes(selected);if(mine||theirs){el('dqDayEvents').append(node('p',mine&&theirs?'♥♥ You and '+sharedDays.name+' shared availability.':theirs?'♥ '+sharedDays.name+' shared availability.':'♡ You shared availability with '+sharedDays.name+'.','dq-shared-summary'));}}

 for(const e of data.events.filter(e=>e.day===selected)){count++;const n=node('div',undefined,'dq-event');n.append(node('strong',e.title),node('p',e.kind==='wish'?'Future wish / bucket list':e.kind));n.append(action('Edit',()=>edit(e)),action('Remove',async()=>{if(busy||!readable||!canLeaveCalendarForm())return;try{await authorized();if(!confirm('Remove “'+e.title+'” from your private calendar?'))return;await saveNext({...data,events:data.events.filter(x=>x.id!==e.id)});removedEntry={...e};el('dqEventForm').hidden=true;formBaseline=null;editing=null;render();say('Entry removed. You can undo it below.');}catch(err){say(err.message);}}));el('dqDayEvents').append(n);}
 if(removedEntry&&removedEntry.day===selected){
   const entry=removedEntry,undo=action('Undo removal — '+entry.title,async()=>{
     if(busy||!readable)return;
     try{
       await authorized();
       if(removedEntry!==entry)throw Error('That removal is no longer available to undo.');
       if(data.events.some(e=>e.id===entry.id))throw Error('This entry is already in your calendar. Refresh Calendar to check.');
       await saveNext({...data,events:[...data.events,entry]});
       say('Entry restored privately to your account.');
     }catch(err){say(err.message);}
   });undo.disabled=busy||!readable;el('dqDayEvents').append(undo);
 }
 for(const e of moments.filter(e=>e.day===selected)){count++;const n=node('div',undefined,'dq-event');n.append(node('strong',e.title),node('p','Accepted invitation · '+M.timeLabel(e.time)+(e.zone?' · '+e.zone:'')));if(e.timeChangePending)n.append(node('p',e.timeChangeNeedsReview?'Time change waiting for your review.':'Time suggestion waiting for your partner’s confirmation.'));const a=node('a',e.timeChangePending?(e.timeChangeNeedsReview?'Review Time Change':'View My Time Suggestion'):e.started?'Continue Our Moment':'Open Our Moment');a.href=M.momentLink(e.id);n.append(a);el('dqDayEvents').append(n);}
 if(!count)el('dqDayEvents').append(node('p','A little room for what matters. No entries for this day.'));el('dqAvailability').disabled=busy||selected<today||!readable;el('dqAvailability').textContent=data.hearts.includes(selected)&&selected>=today?'Remove my availability heart':'♡ Mark my availability for this day';el('dqFutureWishes').replaceChildren();const wishes=data.events.filter(e=>e.kind==='wish'&&e.day>=today).sort((a,b)=>a.day.localeCompare(b.day));for(const w of wishes){const b=action(w.day+' · '+w.title,()=>{selected=w.day;year=Number(w.day.slice(0,4));month=Number(w.day.slice(5,7))-1;render();});el('dqFutureWishes').append(b);}if(!wishes.length)el('dqFutureWishes').append(node('p','Something you hope to share, next month or years from now. Add a future wish to begin.'));el('dqAddEvent').disabled=busy||!readable;el('dqPlanDay').disabled=busy||!readable||selected<today;
 el('dqImportCalendar').disabled=busy||!readable;el('dqRefreshCalendar').disabled=busy;
 for(const id of ['dqEventName','dqEventDay','dqEventKind','dqCancelEvent'])el(id).disabled=busy;
 el('dqEventForm').querySelector('[type=submit]').disabled=busy||!readable;
 }

 function edit(e){if(busy||!readable||!canLeaveCalendarForm())return;editing=e?.id||null;el('dqEventName').value=e?.title||'';el('dqEventDay').value=e?.day||selected;el('dqEventKind').value=e?.kind||'personal';el('dqEventForm').hidden=false;formBaseline=formSnapshot();el('dqEventName').focus();}
 async function refresh(){
   if(busy||!el('dqEventForm').hidden)return;
   const v=++version;say('Loading your private calendar…');
   try{
     const u=await currentUser();if(v!==version)return;if(!u){reset();return;}
     if(owner!==u.id){owner=u.id;revision=0;readable=false;data={version:1,events:[],hearts:[]};moments=[];el('dqMoments').replaceChildren();el('dqImportCalendar').hidden=true;render();}
     const result=await M.readWithTimeout(sb.rpc('my_private_calendar',{p_expected_user:u.id}));
     const verify=await currentUser();if(v!==version)return;if(!verify||verify.id!==u.id){reset();return;}
     if(result.error||!result.data||!Number.isInteger(result.data.revision))throw Error('Your account calendar could not be loaded. Check your connection and tap Refresh Calendar.');
     data=M.clean(result.data.calendar);revision=result.data.revision;readable=true;updateImport();render();say('Your private calendar is up to date.');
     const hs=heartStoneId;
     try{
     const invitations=hs?await M.readWithTimeout(sb.rpc('list_moment_invitations',{p_heart_stone_id:hs})):{data:[],error:null};
     const checked=await currentUser();if(v!==version)return;if(!checked||checked.id!==u.id){reset();return;}if(heartStoneId!==hs)return;
     if(invitations.error)throw Error('Shared moments could not load.');
     const needsAttention=M.attention(invitations.data,u.id);el('dqInvitationsLink').textContent=needsAttention?'Our Invitations · '+needsAttention+' need'+(needsAttention===1?'s':'')+' attention':'Our Invitations';
     moments=M.active(invitations.data,u.id);el('dqMoments').replaceChildren();
     for(const item of moments){const n=node('article',undefined,'dq-moment');n.append(node('h3',item.title),node('p',item.started?'Your moment is underway.':item.day?'A little time chosen for '+item.day+(item.time?' at '+item.time:'')+'.':'You said yes. Choose your time together.'));const a=node('a',item.started?'Continue our moment':'View our moment');a.href=M.momentLink(item.id);n.append(a);el('dqMoments').append(n);}
     el('dqMomentsStatus').textContent=moments.length?'Your accepted moments.':'Your next treasured memory begins with a gesture.';render();
     }catch(error){
       if(v!==version||owner!==u.id)return;
       moments=[];el('dqMoments').replaceChildren();el('dqInvitationsLink').textContent='Our Invitations';
       const message='Shared moments could not load. Your private calendar is still available. Tap Refresh Calendar to retry, or open Our Invitations.';
       el('dqMomentsStatus').textContent=message;say(message);
       render();
     }
   }catch(e){if(v===version){readable=false;render();say(e.message);}}
 }
 el('dqMonth').replaceChildren(...Array.from({length:12},(_,i)=>{const o=node('option',new Date(2026,i,1).toLocaleDateString(undefined,{month:'long'}));o.value=String(i);return o;}));
 function move(n){const d=new Date(year,month+n,1);if(d.getFullYear()<1900||d.getFullYear()>2199)return;year=d.getFullYear();month=d.getMonth();render();}
 el('dqPreviousMonth').onclick=()=>move(-1);el('dqNextMonth').onclick=()=>move(1);
 el('dqMonth').onchange=()=>{month=Number(el('dqMonth').value);render();};
 el('dqYear').onchange=()=>{const y=Number(el('dqYear').value);if(Number.isInteger(y)&&y>=1900&&y<=2199){year=y;render();}else{el('dqYear').value=String(year);say('Choose a year from 1900 to 2199.');}};
 el('dqToday').onclick=()=>{const d=new Date();selected=M.day(d);month=d.getMonth();year=d.getFullYear();render();};
 el('dqPlanDay').onclick=async()=>{
   if(busy||!readable)return;
   try{await authorized();if(selected<M.day(new Date()))throw Error('Choose today or a future day to plan a moment.');
     if(!el('dqEventForm').hidden&&!confirm('Leave the unsaved calendar entry and plan a moment instead?'))return;
     window.location.href=M.planLink(selected);
   }catch(err){say(err.message);}
 };
 el('dqAddEvent').onclick=()=>edit();
 el('dqCancelEvent').onclick=()=>{if(!canLeaveCalendarForm())return;formBaseline=null;el('dqEventForm').hidden=true;editing=null;if(!readable)refresh();};
 el('dqEventForm').onsubmit=async event=>{
   event.preventDefault();if(busy||!readable)return;
   try{
     await authorized();
     const entry={id:editing||'e'+crypto.randomUUID(),title:el('dqEventName').value.trim(),day:el('dqEventDay').value,kind:el('dqEventKind').value};
     await saveNext({...data,events:editing?data.events.map(x=>x.id===editing?entry:x):[...data.events,entry]});
     selected=entry.day;year=Number(selected.slice(0,4));month=Number(selected.slice(5,7))-1;el('dqEventForm').hidden=true;editing=null;render();
     say('Saved privately to your account. Available on your other devices when they refresh.');
   }catch(err){say(err.message);}
 };
 el('dqAvailability').onclick=async()=>{
   if(busy||!readable)return;const day=selected,remove=data.hearts.includes(day);
   try{
     await authorized();const today=M.day(new Date());if(day<today)throw Error('Availability hearts are for today or a future day.');
     const hearts=data.hearts.filter(d=>d>=today&&d!==day);if(!remove)hearts.push(day);
     await saveNext({...data,hearts});say(remove?'Private availability heart removed.':'Private availability heart saved to your account. It has not been shared.');
   }catch(err){say(err.message);}
 };
 el('dqImportCalendar').onclick=async()=>{
   if(busy||!readable)return;
   try{
     await authorized();const raw=localStorage.getItem(key());if(!raw||raw.length>80000)throw Error('The browser calendar could not be read. It has been left untouched.');
     const local=M.clean(JSON.parse(raw));
     if(!confirm('Copy calendar entries and private availability hearts from this browser into your private account calendar? Existing account entries are kept. Nothing is shared with your partner.'))return;
     const events=[...data.events,...local.events.filter(e=>!data.events.some(x=>x.id===e.id))];
     const hearts=[...new Set([...data.hearts,...local.hearts])];await saveNext({version:1,events,hearts});
     say('Browser entries copied into your private account calendar. The browser copy is still available.');
   }catch(err){say(err.message);}
 };
 el('dqRefreshCalendar').onclick=()=>{
   if(busy)return;
   if(!el('dqEventForm').hidden&&!confirm('Reload your calendar and discard the unsaved words in this form?'))return;
   el('dqEventForm').hidden=true;editing=null;refresh();
 };
 el('dqRefreshMoments').onclick=refresh;
 window.addEventListener('heartstone:shared-calendar-days',event=>{
   const d=event.detail;
   if(!d||!Array.isArray(d.own)||!Array.isArray(d.partner))return;
   sharedDays={user:typeof d.user==='string'?d.user:null,own:d.own.filter(M.validDay),partner:d.partner.filter(M.validDay),name:typeof d.name==='string'?d.name.slice(0,80):'your partner'};
   if(owner)render();
 });
 window.addEventListener('heartstone:home-state',async e=>{
   const ticket=++connectionVersion;
   if(!e.detail?.connected){reset();return;}
   try{
     const user=await currentUser();
     if(ticket!==connectionVersion)return;
     if(!user){reset();return;}
     if(owner&&owner!==user.id)reset();
     const connection=e.detail.heartStoneId||null;
     if(lastConnection!==connection){
       lastConnection=connection;moments=[];sharedDays={user:null,own:[],partner:[],name:'your partner'};
       el('dqMoments').replaceChildren();el('dqInvitationsLink').textContent='Our Invitations';
       el('dqMomentsStatus').textContent='Refresh moments to see your current connection.';
       if(owner)render();
     }
     await refresh();
   }catch(error){
     if(ticket===connectionVersion)say('Could not check your connection. Your unsaved calendar words are still here. Try again when connected.');
   }
 });
 window.addEventListener('focus',()=>{if(owner)refresh();});
 window.addEventListener('beforeunload',event=>{if(hasCalendarEdits()||busy){event.preventDefault();event.returnValue='';}});
 window.addEventListener('pagehide',reset);
 window.addEventListener('pageshow',refresh);
 new MutationObserver(()=>{if(!el('homeCard').classList.contains('hidden'))refresh();}).observe(el('homeCard'),{attributes:true,attributeFilter:['class']});
 window.setInterval(()=>{if(owner&&!document.hidden)refresh();},60000);
 reset();refresh();
})();

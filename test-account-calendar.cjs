'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/date-home.js','utf8');
const database=new Map();const clone=x=>JSON.parse(JSON.stringify(x));
class Node{
 constructor(tag='div'){this.tag=tag;this.children=[];this.value='';this.hidden=false;this.disabled=false;this.textContent='';this.attributes={};this.classList={contains:()=>false};this.submit=new Proxy({disabled:false},{set:(t,k,v)=>(t[k]=v,true)});}
 append(...xs){this.children.push(...xs);}replaceChildren(...xs){this.children=xs;}setAttribute(k,v){this.attributes[k]=v;}querySelector(){return this.submit;}focus(){}
}
function device(user='john',local={}){
 const nodes=new Map(),events={};const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
 get('dqEventForm').hidden=true;get('profileFirstName').value='John';
 const state={user,fail:false,hold:null};
 const context={setTimeout,clearTimeout,document:{hidden:false,getElementById:get,createElement:t=>new Node(t)},window:{addEventListener:(n,fn)=>(events[n]??=[]).push(fn),dispatchEvent(){},setInterval(){}},MutationObserver:class{observe(){}},CustomEvent:class{},crypto:{randomUUID:()=>Math.random().toString(36).slice(2)},confirm:()=>state.confirm!==false,console,Date,Math,JSON,Map,Set,module:{exports:{}},localStorage:{getItem:k=>local[k]??null},heartStoneId:'connected',currentUser:async()=>state.user?{id:state.user}:null,
 sb:{rpc:async(name,args)=>{
 if(name==='list_moment_invitations'){if(state.throwMoments)throw Error('Connection interrupted');if(state.failMoments)return {error:{code:'NETWORK'}};return {data:state.moments||[],error:null};}
 if(state.hold){const p=state.hold;state.hold=null;await p;}
 if(state.fail&&args.p_calendar){state.fail=false;return {error:{code:'NETWORK'}};}
 const row=database.get(args.p_expected_user)||{calendar:{version:1,events:[],hearts:[]},revision:0};
 if(args.p_calendar){if(args.p_expected_revision!==row.revision)return {error:{code:'40001'}};const next={calendar:clone(args.p_calendar),revision:row.revision+1};database.set(args.p_expected_user,next);return {data:clone(next)};}
 return {data:clone(row)};
 }}};
 vm.createContext(context);vm.runInContext(source,context);
 return {nodes,get,state,events,context};
}
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r));};
const submit=async(d,title)=>{d.get('dqAddEvent').onclick();d.get('dqEventName').value=title;d.get('dqEventDay').value='2027-01-10';d.get('dqEventKind').value='personal';await d.get('dqEventForm').onsubmit({preventDefault(){}});await flush();};
(async()=>{
 const a=device();await flush();assert.equal(a.get('dqAddEvent').disabled,false);
 await submit(a,'Private appointment');assert.equal(database.get('john').calendar.events[0].title,'Private appointment');
 const b=device();await flush();assert.ok(b.get('dqDayEvents').children.length);assert.equal(b.get('dqAddEvent').disabled,false);
 await submit(b,'From second device');assert.equal(database.get('john').calendar.events.length,2);
 await submit(a,'Stale save');assert.equal(database.get('john').calendar.events.length,2);assert.match(a.get('dqCalendarStatus').textContent,/changed on another device/);assert.equal(a.get('dqEventName').value,'Stale save');
 await a.get('dqRefreshCalendar').onclick();await flush();assert.equal(a.get('dqAddEvent').disabled,false);
 a.state.fail=true;await submit(a,'Unsaved words');assert.equal(a.get('dqEventName').value,'Unsaved words');assert.equal(database.get('john').calendar.events.length,2);
 a.get('dqCancelEvent').onclick();await flush();
 const j=device('jessica');await flush();assert.equal(database.has('jessica'),false);await submit(j,'Jessica only');assert.equal(database.get('jessica').calendar.events[0].title,'Jessica only');assert.equal(database.get('john').calendar.events.length,2);
 const local={'hs_personal_calendar_demo_v1_john':JSON.stringify({version:1,events:[{id:'local',title:'Browser-only birthday',kind:'birthday',day:'2027-02-01'}],hearts:[]})};
 const c=device('john',local);await flush();assert.equal(c.get('dqImportCalendar').hidden,false);assert.equal(database.get('john').calendar.events.length,2);
 await c.get('dqImportCalendar').onclick();await flush();assert.equal(database.get('john').calendar.events.length,3);assert.equal(c.get('dqImportCalendar').hidden,true);assert.ok(local.hs_personal_calendar_demo_v1_john);
 // Account change while a private read is pending must not display the old account.
 let release;const pending=new Promise(r=>release=r);c.state.hold=pending;
 c.get('dqRefreshCalendar').onclick();await flush();c.state.user='jessica';release();await flush();
 assert.equal(c.get('dqDays').children.length,0);assert.match(c.get('dqCalendarStatus').textContent,/Sign in/);
 const undoDevice=device('undo-owner');await flush();await submit(undoDevice,'Birthday dinner');
 const buttons=()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(undoDevice.get('dqDayEvents')).filter(n=>n.tag==='button');};
 undoDevice.state.confirm=false;
 await buttons().find(n=>n.textContent==='Remove').onclick();
 assert.equal(database.get('undo-owner').calendar.events.length,1);
 undoDevice.state.confirm=true;undoDevice.state.fail=true;
 await buttons().find(n=>n.textContent==='Remove').onclick();
 assert.equal(database.get('undo-owner').calendar.events.length,1);
 assert(!buttons().some(n=>n.textContent.startsWith('Undo removal')));
 await buttons().find(n=>n.textContent==='Remove').onclick();
 assert.equal(database.get('undo-owner').calendar.events.length,0);
 const undo=buttons().find(n=>n.textContent==='Undo removal — Birthday dinner');assert(undo);
 undoDevice.state.fail=true;await undo.onclick();
 assert.equal(database.get('undo-owner').calendar.events.length,0);
 assert(buttons().some(n=>n.textContent.startsWith('Undo removal')));
 await buttons().find(n=>n.textContent.startsWith('Undo removal')).onclick();
 assert.equal(database.get('undo-owner').calendar.events[0].title,'Birthday dinner');
 assert(!buttons().some(n=>n.textContent.startsWith('Undo removal')));
 await buttons().find(n=>n.textContent==='Remove').onclick();
 undoDevice.state.user='other-owner';await buttons().find(n=>n.textContent.startsWith('Undo removal')).onclick();
 assert.equal(database.has('other-owner'),false);assert.equal(database.get('undo-owner').calendar.events.length,0);
 const independent=device('calendar-independent');await flush();
 const entryDay=new Date().toISOString().slice(0,10);
 independent.state.moments=[{id:'shared',status:'accepted',sender_id:'calendar-independent',recipient_id:'partner',reveal_mode:'all',title:'Shared dinner',plan:{whenMode:'specific',momentDate:entryDay}}];
 independent.get('dqRefreshCalendar').onclick();await flush();assert.equal(independent.get('dqMoments').children.length,1);
 for(const failure of ['failMoments','throwMoments']){
   independent.state[failure]=true;independent.get('dqRefreshCalendar').onclick();await flush();
   assert.equal(independent.get('dqAddEvent').disabled,false);
   assert.equal(independent.get('dqMoments').children.length,0);
   assert.match(independent.get('dqMomentsStatus').textContent,/private calendar is still available/);
   assert.match(independent.get('dqCalendarStatus').textContent,/Tap Refresh Calendar/);
   assert(!independent.get('dqCalendarStatus').textContent.includes('Refresh Moments'));
   await submit(independent,'Calendar works during '+failure);
   assert(database.get('calendar-independent').calendar.events.some(e=>e.title==='Calendar works during '+failure));
   independent.state[failure]=false;
 }
 independent.get('dqRefreshMoments').onclick();await flush();
 assert.equal(independent.get('dqMoments').children.length,1);
 assert.equal(independent.get('dqAddEvent').disabled,false);
 const reconnect=device('reconnect-owner');await flush();
 reconnect.get('dqAddEvent').onclick();reconnect.get('dqEventName').value='Keep my unsaved calendar words';
 const notify=reconnect.events['heartstone:home-state'][0];
 await notify({detail:{connected:true,heartStoneId:'connected'}});await flush();
 assert.equal(reconnect.get('dqEventName').value,'Keep my unsaved calendar words');assert.equal(reconnect.get('dqEventForm').hidden,false);
 await notify({detail:{connected:true,heartStoneId:'different-connection'}});await flush();
 assert.equal(reconnect.get('dqEventName').value,'Keep my unsaved calendar words');assert.equal(reconnect.get('dqEventForm').hidden,false);
 reconnect.state.user='different-owner';
 await notify({detail:{connected:true,heartStoneId:'different-connection'}});await flush();
 assert.equal(reconnect.get('dqEventName').value,'');assert.equal(reconnect.get('dqEventForm').hidden,true);
 reconnect.get('dqAddEvent').onclick();reconnect.get('dqEventName').value='Clear on signout';
 await notify({detail:{connected:false}});await flush();
 assert.equal(reconnect.get('dqEventName').value,'');assert.equal(reconnect.get('dqDays').children.length,0);
 const saving=device('saving-owner');await flush();
 saving.get('dqAddEvent').onclick();saving.get('dqEventName').value='A carefully written plan';
 saving.get('dqEventDay').value='2027-01-10';saving.get('dqEventKind').value='personal';
 let finishSave;saving.state.hold=new Promise(resolve=>finishSave=resolve);
 const savingRequest=saving.get('dqEventForm').onsubmit({preventDefault(){}});
 await flush();
 for(const id of ['dqEventName','dqEventDay','dqEventKind','dqCancelEvent'])assert.equal(saving.get(id).disabled,true);
 saving.get('dqCancelEvent').onclick();assert.equal(saving.get('dqEventForm').hidden,false);
 finishSave();await savingRequest;await flush();
 assert.equal(database.get('saving-owner').calendar.events[0].title,'A carefully written plan');
 for(const id of ['dqEventName','dqEventDay','dqEventKind','dqCancelEvent'])assert.equal(saving.get(id).disabled,false);
 saving.state.fail=true;await submit(saving,'Keep after failed save');
 assert.equal(saving.get('dqEventName').value,'Keep after failed save');assert.equal(saving.get('dqEventForm').hidden,false);
 for(const id of ['dqEventName','dqEventDay','dqEventKind','dqCancelEvent'])assert.equal(saving.get(id).disabled,false);
 const crossing=device('old-calendar-owner');await flush();
 crossing.get('dqAddEvent').onclick();crossing.get('dqEventName').value='Old account private event';
 crossing.get('dqEventDay').value='2027-01-10';crossing.get('dqEventKind').value='personal';
 let finishOld;crossing.state.hold=new Promise(resolve=>finishOld=resolve);
 const oldRequest=crossing.get('dqEventForm').onsubmit({preventDefault(){}});
 await flush();assert.equal(crossing.get('dqEventName').disabled,true);
 crossing.state.user='new-calendar-owner';
 await crossing.events['heartstone:home-state'][0]({detail:{connected:true,heartStoneId:'new-connection'}});await flush();
 assert.equal(crossing.get('dqEventName').value,'');assert.equal(crossing.get('dqAddEvent').disabled,false);
 crossing.get('dqAddEvent').onclick();crossing.get('dqEventName').value='New account private event';
 crossing.get('dqEventDay').value='2027-01-11';crossing.get('dqEventKind').value='personal';
 let finishNew;crossing.state.hold=new Promise(resolve=>finishNew=resolve);
 const newRequest=crossing.get('dqEventForm').onsubmit({preventDefault(){}});
 await flush();finishOld();await oldRequest;await flush();
 assert.equal(crossing.get('dqEventName').disabled,true);assert.equal(crossing.get('dqEventName').value,'New account private event');
 assert.equal(crossing.get('dqEventForm').hidden,false);
 finishNew();await newRequest;await flush();
 assert.equal(crossing.get('dqAddEvent').disabled,false);
 assert.equal(database.get('new-calendar-owner').calendar.events[0].title,'New account private event');
 assert(!database.get('new-calendar-owner').calendar.events.some(e=>e.title==='Old account private event'));
 console.log('PASS: an old-account save cannot reset or unlock a new-account save; new account loads and saves independently.');
 console.log('PASS: pending calendar writes lock fields and cancel; successful and failed writes unlock fields; failed writes retain words.');
 console.log('PASS: same-account reconnects and connection refreshes preserve calendar drafts; account changes and signout clear private words.');
 console.log('PASS: shared-moment API errors and thrown network failures keep private calendar saves available; retry restores moments.');
 console.log('PASS: cancelled removal, failed removal, undo restoration, failed undo retry, account-change undo guard.');
 console.log('PASS: account saves, reload on a second device, stale conflict protection, failed-save draft retention, separate owners, explicit import, account-switch read guard.');
})().catch(e=>{console.error(e);process.exitCode=1;});

const calendarProjection=require('./date-home.js');
const cancellationFixture={id:'cancellation-model',status:'accepted',sender_id:'first',recipient_id:'second',reveal_mode:'all',title:'Together',plan:{whenMode:'specific',momentDate:'2026-11-20',momentTime:'18:00'}};
for(const account of ['first','second'])assert.equal(calendarProjection.active([cancellationFixture],account).length,1);
cancellationFixture.status='cancelled';
for(const account of ['first','second'])assert.equal(calendarProjection.active([cancellationFixture],account).length,0);
console.log('PASS: refreshed calendar projections remove a cancelled shared moment for both participants.');

const pendingTimeFixture={id:'time-change',status:'accepted',sender_id:'first',recipient_id:'second',title:'Current plan',reveal_mode:'all',plan:{whenMode:'specific',momentDate:'2026-12-01',momentTime:'18:00'},time_change:{status:'pending',proposed_by:'first'}};
assert.equal(calendarProjection.active([pendingTimeFixture],'first')[0].timeChangeNeedsReview,false);
assert.equal(calendarProjection.active([pendingTimeFixture],'second')[0].timeChangeNeedsReview,true);
assert.equal(calendarProjection.active([pendingTimeFixture],'second')[0].day,'2026-12-01');
assert.equal(calendarProjection.attention([pendingTimeFixture],'first'),0);
assert.equal(calendarProjection.attention([pendingTimeFixture],'second'),1);
assert.equal(calendarProjection.attention([pendingTimeFixture],'outsider'),0);
pendingTimeFixture.time_change=null;
assert.equal(calendarProjection.active([pendingTimeFixture],'second')[0].timeChangePending,false);
assert.equal(calendarProjection.attention([pendingTimeFixture],'second'),0);
console.log('PASS: pending-time calendar flags and attention belong to the reviewer; old day stays until confirmation; confirmed changes clear attention.');

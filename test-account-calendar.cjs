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
 const context={setTimeout,clearTimeout,document:{hidden:false,getElementById:get,createElement:t=>new Node(t)},window:{addEventListener:(n,fn)=>(events[n]??=[]).push(fn),dispatchEvent(){},setInterval(){}},MutationObserver:class{observe(){}},CustomEvent:class{},crypto:{randomUUID:()=>Math.random().toString(36).slice(2)},confirm:()=>true,console,Date,Math,JSON,Map,Set,module:{exports:{}},localStorage:{getItem:k=>local[k]??null},heartStoneId:'connected',currentUser:async()=>state.user?{id:state.user}:null,
 sb:{rpc:async(name,args)=>{
 if(name==='list_moment_invitations')return {data:[],error:null};
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
 console.log('PASS: account saves, reload on a second device, stale conflict protection, failed-save draft retention, separate owners, explicit import, account-switch read guard.');
})().catch(e=>{console.error(e);process.exitCode=1;});

const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('shared-dates.html','utf8');
class E{
 constructor(tag='div'){this.tag=tag;this.children=[];this.value='';this.hidden=false;this.disabled=false;this.checked=false;this.textContent='';this.dataset={};this.open=false;this.handlers={};}
 append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}
 querySelectorAll(tag){return this.children.flatMap(n=>typeof n==='object'?[...(n.tag===tag?[n]:[]),...n.querySelectorAll(tag)]:[])}
 addEventListener(k,f){this.handlers[k]=f}showModal(){this.open=true}close(){this.open=false}remove(){}
}
function setup(){
 const els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(x=>[x[1],new E()]));
 const responses=['accepted','declined','reschedule','withdrawn'].map(x=>{const e=new E('button');e.dataset.accountResponse=x;return e;});
 const state={calls:[],user:'one',allow:true,date:null,changed:null};
 const self={id:'one',name:'One'},people=[{id:'two',name:'Two'},{id:'three',name:'Three'}];
 const api={connect:async()=>({account:{id:state.user,email:'one@example.invalid'},self,people}),action:async(op,args={})=>{
  state.calls.push({op,args:structuredClone(args)});if(state.fail)throw Error('Could not confirm this change');
  if(op==='list')return state.date?[state.date]:[];
  if(op==='view')return state.date;
  if(op==='create'||op==='revise'){state.date={id:'d',revision:(state.date?.revision||0)+1,organizer:'one',state:'draft',...args.payload,participants:args.payload.participants.map(id=>({id,name:id==='one'?'One':people.find(p=>p.id===id).name,response:'pending'}))};}
  if(op==='send'){state.date={...state.date,state:'pending',participants:state.date.participants.map(p=>({...p,response:p.id==='one'?'accepted':null}))};}
  if(op==='respond')state.date={...state.date,state:'confirmed'};
  return structuredClone(state.date);
 }};
 const document={getElementById:id=>els[id],querySelectorAll:selector=>selector==='[data-account-response]'?responses:[...Object.values(els),...responses],createElement:tag=>new E(tag),createTextNode:t=>t,head:{append:s=>s.onload()}};
 const context=vm.createContext({document,window:{supabase:{createClient:()=>({})},SharedDateService:{create:args=>{state.changed=args.onAccountChange;return api;}}},localStorage:{},crypto:{},confirm:()=>state.allow});
 vm.runInContext(fs.readFileSync('shared-dates.js','utf8'),context);return {els,responses,state};
}
(async()=>{
 const {els,responses,state}=setup();assert.equal(state.calls.length,0);await els.connectSharedAccount.onclick();assert(state.calls.every(c=>c.op==='list'));els.newAccountDate.onclick();
 const picks=els.accountPeople.querySelectorAll('input');picks.forEach(p=>{p.checked=true;p.onchange()});els.accountDateTitle.value='A date <script>';els.accountDateWhen.value='Friday 6 PM Eastern';els.accountDateMeeting.value='Park';
 await els.saveAccountDate.onclick();assert.equal(state.calls.filter(c=>c.op==='create').length,1);assert(!state.calls.some(c=>c.op==='send'));assert.equal(state.date.participants.length,3);assert.equal(els.accountDetailTitle.textContent,'A date <script>');
 await els.reviewAccountSend.onclick();assert(els.accountSendReview.open);assert(!state.calls.some(c=>c.op==='send'));els.cancelAccountSend.onclick();assert(!els.accountSendReview.open);assert(!state.calls.some(c=>c.op==='send'));
 await els.reviewAccountSend.onclick();await els.confirmAccountSend.onclick();assert.equal(state.calls.filter(c=>c.op==='send').length,1);assert.equal(state.calls.find(c=>c.op==='send').args.date.revision,1);assert(!els.accountSendReview.open);assert(responses.find(b=>b.dataset.accountResponse==='withdrawn').hidden===false);assert(responses.find(b=>b.dataset.accountResponse==='accepted').hidden);
 const text=e=>e.textContent+' '+e.children.filter(c=>typeof c==='object').map(text).join(' ');assert(text(els.accountRoster).includes('Response private'));
 // Cancellation and server failure retain the selected account state without success claims.
 state.allow=false;await responses.find(b=>b.dataset.accountResponse==='withdrawn').onclick();assert(!state.calls.some(c=>c.op==='respond'));
 state.allow=true;state.fail=true;await responses.find(b=>b.dataset.accountResponse==='withdrawn').onclick();assert.match(els.sharedAccountFeedback.textContent,/Could not confirm/);state.fail=false;
 state.changed();assert(els.accountDateDetail.hidden);assert(els.accountDateEditor.hidden);assert.equal(els.accountRoster.children.length,0);assert.equal(els.accountDateTitle.value,'');
 assert(html.includes('data-quest-audience="date"'));assert(!html.includes('sharedActor'));assert(html.includes('current adult verification'));
 console.log('PASS: own-account UI, private drafts, three-person roster, explicit review/send/cancel, no impersonation picker, private responses, failed writes and account-change clearing.');
})().catch(e=>{console.error(e);process.exitCode=1});

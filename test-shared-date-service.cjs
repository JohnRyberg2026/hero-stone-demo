const assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const {create}=require('./shared-date-service.js');
function setup(){
 const state={user:{id:'one',email:'one@example.invalid'},calls:[],failure:null,changed:0};const storage=new Map();
 const client={auth:{getUser:async()=>({data:{user:state.user}}),onAuthStateChange:f=>{state.auth=f;return {data:{subscription:{unsubscribe(){}}}}}},rpc:async(name,args)=>{
  state.calls.push({name,args:structuredClone(args)});if(state.afterCall)state.afterCall(name,args);
  if(state.failure)return {error:state.failure};
  if(name==='shared_date_candidates')return {data:{self:{id:args.p_expected_user,name:'One'},people:[{id:'two',name:'Two'}]}};
  return {data:args.p_operation==='list'?[]:{id:'date',revision:args.p_expected_revision||1,state:args.p_operation==='send'?'pending':'draft'}};
 }};
 const service=create({client,crypto:webcrypto,storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},onAccountChange:()=>state.changed++});return {service,state,storage};
}
(async()=>{
 let {service,state,storage}=setup();await assert.rejects(()=>service.action('list'),/Connect/);assert.equal(state.calls.length,0);await service.connect();assert.equal(state.calls.length,1);await service.action('list');assert.equal(state.calls.at(-1).args.p_expected_user,'one');assert(!state.calls.some(x=>x.args.p_operation==='send'));
 state.failure={message:'Network uncertain'};const payload={participants:['one','two'],title:'Dinner',when:'Later',meeting:'Park'};
 await assert.rejects(()=>service.action('create',{payload}),/Refresh your shared dates/);const id=state.calls.at(-1).args.p_request_id;assert.equal(storage.size,1);assert([...storage.values()].every(v=>!v.includes('Dinner')));
 await assert.rejects(()=>service.action('create',{payload}),/uncertain/);assert.equal(state.calls.at(-1).args.p_request_id,id);
 state.failure=null;await service.action('create',{payload});assert.equal(state.calls.at(-1).args.p_request_id,id);assert.equal(storage.size,0);
 state.user={id:'other'};const before=state.calls.length;await assert.rejects(()=>service.action('list'),/account changed/);assert.equal(state.calls.length,before);assert(state.changed);
 ({service,state}=setup());state.user=null;await assert.rejects(()=>service.connect(),/Sign in/);assert.equal(state.calls.length,0);
 ({service,state}=setup());state.failure={code:'PGRST202',message:'function missing'};await assert.rejects(()=>service.connect(),/not installed/);
 ({service,state}=setup());await service.connect();state.afterCall=()=>state.user={id:'other'};await assert.rejects(()=>service.action('respond',{date:{id:'d',revision:3},payload:{response:'accepted'}}),/already sent may still have completed/);assert.equal(state.calls.at(-1).args.p_expected_user,'one');assert.equal(state.calls.at(-1).args.p_expected_revision,3);assert.equal(state.calls.at(-1).args.p_payload.response,'accepted');assert(!('p_respondent' in state.calls.at(-1).args));
 ({service,state}=setup());await service.connect();state.auth('SIGNED_OUT',null);await assert.rejects(()=>service.action('list'),/Connect/);
 console.log('PASS: explicit account connection, no automatic sends, account checks before/after writes, missing backend, own-account response, revision forwarding and retry identities.');
})().catch(e=>{console.error(e);process.exitCode=1});

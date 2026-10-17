const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const runtime=require('../profile-adventure-runtime.js'),guard=require('../profile-planning-guard.js');
let user='alice',connection='couple-a',rows=[],fail=false,throwRead=false,afterRead=null,filters=[];
const client={auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},from(table){assert.equal(table,'user_onboarding_answers');let owner;const q={select(fields){assert.equal(fields,'question_key,answer_json,skipped');return q},eq(k,v){assert.equal(k,'user_id');owner=v;return q},like(k,v){assert.equal(v,'account_profile_v1_%');return q},then(resolve,reject){return Promise.resolve().then(()=>{filters.push(owner);if(afterRead)afterRead();if(throwRead)throw Error('PRIVATE error');return fail?{error:{message:'PRIVATE error'}}:{data:rows};}).then(resolve,reject)}};return q}};
const check=guard.create(client,runtime,()=>connection),row=(key,value)=>({question_key:'account_profile_v1_'+key,answer_json:{value},skipped:false});
(async()=>{
 assert.deepEqual(await check(),{allowed:true,code:'ready'});assert.deepEqual(filters,['alice']);
 for(const [key,value] of [['hard_no_details','PRIVATE reason'],['hard_no_categories',['Heights']],['accommodation_needs',['Minimal walking']],['surprise_essentials',['Cost']],['transport_considerations',['Avoid highways']],['past_place_1_feedback','Never suggest again']]){
  rows=[row(key,value),row('exploration','Wild'),row('decisions','Just Decide for Me')];const result=await check();assert.deepEqual(result,{allowed:false,code:'requirements'});assert(!JSON.stringify(result).includes(value));
 }
 rows=[row('hard_no_categories',['Nothing comes to mind right now']),row('weather_avoid',['Rain'])];assert.equal((await check()).allowed,true);
 rows=[];fail=true;assert.deepEqual(await check(),{allowed:false,code:'unavailable'});fail=false;throwRead=true;assert.equal((await check()).code,'unavailable');throwRead=false;
 user=null;assert.equal((await check()).code,'signed_out');user='alice';afterRead=()=>{user='bob'};assert.equal((await check()).code,'changed');afterRead=null;user='alice';afterRead=()=>{connection='couple-b'};assert.equal((await check()).code,'changed');afterRead=null;connection='couple-a';
 assert.equal((await guard.create(client,null,()=>connection)()).code,'unavailable');
 rows=[row('hard_no_details','PRIVATE original')];assert.equal((await check()).allowed,false);rows=[];assert.equal((await check()).allowed,true); // No stale cache after editing requirements.

 // Exercise actual main-page handlers with a denied preflight: no discovery RPC or reads may run.
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'),nodes=new Map(),calls=[];
 const ctx=vm.createContext({heartStoneId:'couple-a',requestId:'request',privateRequestId:'request',allowProfilePlanning:async()=>false,$:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id)},status:()=>{},sb:{rpc(){calls.push('rpc');throw Error('Must not reach RPC')},from(){calls.push('read');throw Error('Must not read recommendations')}}});
 const slice=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
 vm.runInContext(slice('$("questBtn").onclick = async()=>{','async function loadRecommendations()'),ctx);await nodes.get('questBtn').onclick();
 vm.runInContext(slice('async function loadRecommendations(){','async function loadExistingActiveDemoAdventure()'),ctx);await vm.runInContext('loadRecommendations()',ctx);
 vm.runInContext(slice('$("moreRecommendationsBtn").onclick=async()=>{','async function chooseRecommendation(r)'),ctx);await nodes.get('moreRecommendationsBtn').onclick();
 vm.runInContext(slice('async function chooseRecommendation(r){','$("completeStepBtn").onclick'),ctx);await vm.runInContext("chooseRecommendation({id:'rec'})",ctx);assert.deepEqual(calls,[]);
 console.log('PASS: owner-only planning preflight, generic private stops, read failures, fresh auth/connection checks, and main discovery handlers stop before RPCs.');
})().catch(e=>{console.error(e);process.exitCode=1});

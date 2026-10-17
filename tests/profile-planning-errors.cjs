const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const slice=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
(async()=>{
 const nodes=new Map(),messages=[],alerts=[];
 let error={message:'PROFILE_REQUIREMENTS_UNVERIFIED'};
 const ctx=vm.createContext({String,Object,heartStoneId:'couple',requestId:'req',privateRequestId:'req',adventureId:'adv',selectedInvitationStyle:'surprise',allowProfilePlanning:async()=>true,ensureFreshAuth:async()=>true,$:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id)},status:(id,message)=>messages.push({id,message}),alert:m=>alerts.push(m),sb:{rpc:async()=>({error})},show:()=>{throw Error('Must not advance on failed action')},setAdventureFocus:()=>{throw Error('Must not advance on failed action')}});
 vm.runInContext(slice('function handleProfilePlanningError(','async function allowProfilePlanning()'),ctx);
 for(const code of ['PROFILE_REQUIREMENTS_UNVERIFIED','PLANNING_RETRY_REQUIRED','PLANNING_UNAVAILABLE','AUTH_REQUIRED']){
  ctx.err={message:code};assert.equal(vm.runInContext('handleProfilePlanningError(err,"questStatus")',ctx),true);assert(!messages.at(-1).message.includes(code));
 }
 ctx.err={message:'PRIVATE database diagnostic'};assert.equal(vm.runInContext('handleProfilePlanningError(err,"questStatus")',ctx),false);assert(!JSON.stringify(messages).includes('PRIVATE'));
 vm.runInContext(slice('async function chooseRecommendation(r){','$("completeStepBtn").onclick'),ctx);
 await vm.runInContext('chooseRecommendation({id:"rec"})',ctx);assert.equal(vm.runInContext('privateRequestId',ctx),'req');assert.equal(alerts.length,0);
 const handlers=[['$("sendInvitationBtn").onclick=async()=>{','$("openInvitationBtn").onclick','sendInvitationBtn'],['$("acceptDateBtn").onclick=async()=>{','$("revealAdventureBtn").onclick','acceptDateBtn'],['$("revealAdventureBtn").onclick=async()=>{','$("declineDateBtn").onclick','revealAdventureBtn']];
 for(const [start,end,id] of handlers){vm.runInContext(slice(start,end),ctx);await nodes.get(id).onclick();assert.equal(messages.at(-1).id,'inviteStatus');assert(messages.at(-1).message.includes('requirements'));}
 error={message:'PLANNING_RETRY_REQUIRED'};await vm.runInContext('chooseRecommendation({id:"rec"})',ctx);assert(messages.at(-1).message.includes('try this action again'));assert.equal(vm.runInContext('privateRequestId',ctx),'req');
 console.log('PASS: generic server guard recovery across selection, send, accept, reveal; failed selection retains retry state.');
})().catch(e=>{console.error(e);process.exitCode=1});

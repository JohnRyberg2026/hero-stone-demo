'use strict';
const assert=require('node:assert/strict'),Flow=require('./adventure-profile-flow.js');
const client=(id,row)=>({auth:{getUser:async()=>({data:{user:id?{id}:null},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:row,error:null})})}),insert:v=>({select:()=>({maybeSingle:async()=>({data:{revision:v.revision},error:null})})}),update:v=>({eq:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({data:{revision:v.revision},error:null})})})})})})});
(async()=>{
 const row={account_id:'A',revision:2,boundaries:{minimalWalking:true},interests:[]};
 assert.equal((await Flow.load(client('A',row))).state,'returning');
 assert.equal((await Flow.initialize(client('A',row),{boundaries:{}})).state,'returning');
 assert.equal((await Flow.update(client('A',row),{revision:1,boundaries:{}})).state,'revision_conflict');
 assert.equal((await Flow.update(client('A',row),{revision:2,boundaries:{minimalWalking:true}})).state,'updated');
 assert.equal((await Flow.load(client(null,null))).state,'signed_out');
 assert.equal((await Flow.load(client('A',null))).state,'needs_confirmation');
 console.log('PASS: returning-user continuity, no onboarding overwrite, revision conflict, updates, sign-out, ambiguous missing read.');
})().catch(e=>{console.error(e);process.exitCode=1});

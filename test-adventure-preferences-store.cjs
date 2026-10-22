'use strict';
const assert=require('node:assert/strict'),Store=require('./adventure-preferences-store.js');
const fake=(id,row)=>({auth:{getUser:async()=>({data:{user:id?{id}:null},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:row,error:null})})}),update:()=>({eq:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({data:{revision:3},error:null})})})})})})});
(async()=>{
 assert.equal((await Store.read(fake(null))).reason,'signed_out');
 assert.equal((await Store.read(fake('A',{account_id:'B',revision:2,boundaries:{},interests:[]}))).ready,false);
 assert.equal((await Store.read(fake('A',{account_id:'A',revision:2,boundaries:{minimalWalking:true},interests:[]}))).ready,true);
 assert.equal((await Store.save(fake('A'),{expectedRevision:2,boundaries:{minimalWalking:true}})).saved,true);
 assert.equal((await Store.save(fake('A'),{expectedRevision:2,boundaries:{maxBudget:-1}})).reason,'invalid_input');
 console.log('PASS: signed-out refusal, account isolation, validated read, revision-guarded save, invalid-input refusal');
})().catch(e=>{console.error(e);process.exitCode=1});

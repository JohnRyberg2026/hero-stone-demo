'use strict';
const assert=require('node:assert/strict'),Setup=require('./adventure-preferences-setup.js');
const fake=(id,error)=>({auth:{getUser:async()=>({data:{user:id?{id}:null},error:null})},from:()=>({insert:row=>({select:()=>({maybeSingle:async()=>({data:error?null:{revision:row.revision},error:error||null})})})})});
(async()=>{
 assert.equal((await Setup.create(fake(null))).reason,'signed_out');
 assert.equal((await Setup.create(fake('A'),{boundaries:{maxBudget:-1}})).reason,'invalid_input');
 assert.equal((await Setup.create(fake('A'),{boundaries:{minimalWalking:true}})).created,true);
 assert.equal((await Setup.create(fake('A',{code:'23505'}))).reason,'already_exists');
 assert.equal((await Setup.create(fake('A',{code:'42501'}))).reason,'needs_confirmation');
 console.log('PASS: first-save authorization, validation, initial revision, no overwrite, database failure.');
})().catch(e=>{console.error(e);process.exitCode=1});

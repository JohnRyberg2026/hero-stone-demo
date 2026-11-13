// Opt-in hosted integration test: dedicated project + two existing test users.
// No schema/auth admin writes, real profiles, model calls or outbound messages.
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import { integrationConfig } from './integration-config.mjs';
import { privateRecords } from './private-records.mjs';
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const clients=[];let last=null,storage=null;const id=randomUUID();
async function login(config,credentials){const client=createClient(config.url,config.key,options);clients.push(client);const result=await client.auth.signInWithPassword(credentials);assert.ok(!result.error&&result.data.user,'Test-account sign-in failed.');return {client,user:result.data.user.id};}
try{
 const config=integrationConfig(process.env);
 const a=await login(config,config.a),b=await login(config,config.b);
 assert.notEqual(a.user,b.user,'Test accounts must be different identities.');
 storage=privateRecords(a.client,a.user);
 const original={id,kind:'goal',text:'Fictional test: afternoon energy',revision:0,actionId:randomUUID(),approved:true};
 last=await storage.save(original);assert.equal(last.revision,1);
 const duplicate=await storage.save(original);assert.equal(duplicate.revision,1);
 const hidden=await b.client.from('health_quest_records').select('id').eq('owner_id',a.user).eq('id',id);
 assert.equal(hidden.error,null,'Other-account read unexpectedly failed instead of RLS-filtering.');assert.equal(hidden.data.length,0,'Other account saw a private record.');
 const altered=await b.client.from('health_quest_records').update({text:'Unauthorized change',revision:2}).eq('owner_id',a.user).eq('id',id).select('id');
 assert.ok(altered.error||altered.data.length===0,'Other account altered a private record.');
 const impersonated=await b.client.rpc('health_quest_save_record',{p_expected_user:a.user,p_id:id,p_kind:'goal',p_text:'Unauthorized',p_state:'reported',p_followup:false,p_occurred_at:null,p_revision:1,p_action_id:randomUUID(),p_approved:true});
 assert.ok(impersonated.error,'RPC permitted account impersonation.');
 last=await storage.save({...original,text:'Fictional test: morning energy',revision:1,actionId:randomUUID()});
 assert.equal(last.revision,2);
 await assert.rejects(storage.save({...original,text:'Stale update',revision:1,actionId:randomUUID()}));
 await a.client.auth.signOut();
 await assert.rejects(storage.list());
 const returning=await login(config,config.a);storage=privateRecords(returning.client,returning.user);
 const records=await storage.list(),record=records.find(row=>row.id===id);assert.equal(record?.text,'Fictional test: morning energy');assert.equal(record.revision,2);
 last=await storage.save({...original,text:record.text,state:'paused',followup:false,revision:2,actionId:randomUUID()});assert.equal(last.followup,false);
 last=await storage.save({...original,text:'Clear test record',state:'deleted',revision:3,actionId:randomUUID()});
 assert.equal(last.text,'');assert.ok(!(await storage.list()).some(row=>row.id===id));
 console.log('PASS: hosted sign-in, save, retry, account isolation, correction, return, pause and deletion.');
}catch{
 // Deliberately omit SDK errors and config; they may contain sensitive values.
 console.error('Integration did not pass. Check test-only configuration, accounts, schema and permissions. No live-project fallback is allowed.');process.exitCode=1;
}finally{
 if(last&&last.state!=='deleted'&&storage){try{await storage.save({id,kind:'goal',text:'Clear fictional test data',state:'deleted',revision:last.revision,actionId:randomUUID(),approved:true});}catch{console.error('Cleanup could not be confirmed; a fictional test record may remain.');}}
 await Promise.allSettled(clients.map(client=>client.auth.signOut()));
}

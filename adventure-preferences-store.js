'use strict';
// Account-only adapter; requires a signed-in Supabase client with RLS enabled.
// No cached fallback, no cross-account participant retrieval.
const AdventurePreferencesStore=(()=>{
 const table='quest_adventure_preferences';
 function valid(b){return b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).every(k=>['minimalWalking','avoidCategories','maxBudget'].includes(k))&&(!('minimalWalking'in b)||typeof b.minimalWalking==='boolean')&&(!('avoidCategories'in b)||(Array.isArray(b.avoidCategories)&&b.avoidCategories.every(x=>typeof x==='string'&&x.length<=80)))&&(!('maxBudget'in b)||(typeof b.maxBudget==='number'&&Number.isFinite(b.maxBudget)&&b.maxBudget>=0));}
 async function identity(client){if(!client?.auth?.getUser)return null;const {data,error}=await client.auth.getUser();return error?null:data?.user?.id||null;}
 async function read(client){
  const id=await identity(client);if(!id)return {ready:false,reason:'signed_out'};
  const {data,error}=await client.from(table).select('account_id,revision,boundaries,interests').eq('account_id',id).maybeSingle();
  if(error||!data||data.account_id!==id||!Number.isSafeInteger(data.revision)||!valid(data.boundaries))return {ready:false,reason:'needs_confirmation'};
  return {ready:true,profile:{ownerId:id,loaded:true,revision:data.revision},boundaries:data.boundaries,interests:Array.isArray(data.interests)?data.interests:[]};
 }
 async function save(client,{expectedRevision,boundaries,interests=[]}={}){
  const id=await identity(client);if(!id)return {saved:false,reason:'signed_out'};
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!valid(boundaries)||!Array.isArray(interests)||!interests.every(x=>typeof x==='string'&&x.length<=80))return {saved:false,reason:'invalid_input'};
  // Update only an existing revision; an absent row must be created through an
  // independently authorized initial setup path, never by an implicit upsert.
  const {data,error}=await client.from(table).update({revision:expectedRevision+1,boundaries,interests,updated_at:new Date().toISOString()}).eq('account_id',id).eq('revision',expectedRevision).select('revision').maybeSingle();
  if(error)return {saved:false,reason:'needs_confirmation'};
  if(!data)return {saved:false,reason:'revision_conflict'};
  return {saved:true,revision:data.revision};
 }
 return {read,save,valid};
})();
if(typeof module!=='undefined')module.exports=AdventurePreferencesStore;

'use strict';
// Explicit first-save path. Caller must be authenticated; RLS remains mandatory.
const AdventurePreferencesSetup=(()=>{
 const Store=typeof module!=='undefined'&&module.exports?require('./adventure-preferences-store.js'):AdventurePreferencesStore;
 async function create(client,{boundaries={},interests=[]}={}){
  if(!Store.valid(boundaries)||!Array.isArray(interests)||!interests.every(x=>typeof x==='string'&&x.length<=80))return {created:false,reason:'invalid_input'};
  if(!client?.auth?.getUser)return {created:false,reason:'signed_out'};
  const {data:auth,error:authError}=await client.auth.getUser();
  const id=authError?null:auth?.user?.id;
  if(!id)return {created:false,reason:'signed_out'};
  // Insert, never upsert: an existing profile must not be overwritten.
  const {data,error}=await client.from('quest_adventure_preferences').insert({account_id:id,revision:0,boundaries,interests}).select('revision').maybeSingle();
  if(error)return {created:false,reason:error.code==='23505'?'already_exists':'needs_confirmation'};
  if(!data||data.revision!==0)return {created:false,reason:'needs_confirmation'};
  return {created:true,revision:0};
 }
 return {create};
})();
if(typeof module!=='undefined')module.exports=AdventurePreferencesSetup;

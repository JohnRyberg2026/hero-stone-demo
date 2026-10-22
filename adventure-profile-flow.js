'use strict';
// Orchestrates first-time vs returning-user profile flow without implicit writes.
const AdventureProfileFlow=(()=>{
 const Store=require('./adventure-preferences-store.js');
 const Setup=require('./adventure-preferences-setup.js');
 async function load(client){
  const result=await Store.read(client);
  if(result.ready)return {state:'returning',profile:result.profile,boundaries:result.boundaries,interests:result.interests};
  if(result.reason==='signed_out')return {state:'signed_out'};
  // A missing row cannot be distinguished from a read failure by Store.read.
  // Never treat a failed read as permission to create a new profile.
  return {state:'needs_confirmation'};
 }
 async function initialize(client,input){
  const state=await load(client);
  if(state.state==='returning')return {state:'returning',profile:state.profile};
  if(state.state==='signed_out')return state;
  // Caller must explicitly request first-time creation; insert is unique-key
  // protected and cannot overwrite existing data.
  const result=await Setup.create(client,input);
  if(!result.created)return {state:result.reason};
  return {state:'created',revision:result.revision};
 }
 async function update(client,{revision,boundaries,interests}={}){
  const state=await load(client);
  if(state.state!=='returning')return {state:state.state};
  if(state.profile.revision!==revision)return {state:'revision_conflict'};
  const result=await Store.save(client,{expectedRevision:revision,boundaries,interests});
  return result.saved?{state:'updated',revision:result.revision}:{state:result.reason};
 }
 return {load,initialize,update};
})();
if(typeof module!=='undefined')module.exports=AdventureProfileFlow;

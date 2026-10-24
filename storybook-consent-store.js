/* Candidate consent-status adapter, not loaded by a screen yet. Review may
   initialize the server's version anchor; it never records a response or executes
   include/publish/export. Requires the separately reviewed server ledger RPC. */
(function(root){
 'use strict';
 const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
 const actions=['include','publish','export'];
 const keys=['volumeId','fingerprint','action','destination','participants','viewers','ownResponse','allApproved','executionEnabled'];
 function valid(v,account,book,relationship,action){
  const roster=a=>Array.isArray(a)&&a.length>0&&a.length<=100&&a.every(uuid)&&new Set(a).size===a.length&&a.every((id,i)=>!i||a[i-1]<id);
  return !!v&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k))&&v.volumeId===book&&/^[0-9a-f]{64}$/.test(v.fingerprint)&&v.action===action&&v.destination==='relationship:'+relationship&&roster(v.participants)&&roster(v.viewers)&&v.participants.includes(account)&&JSON.stringify(v.participants)===JSON.stringify(v.viewers)&&[null,'approved','declined','withdrawn'].includes(v.ownResponse)&&typeof v.allApproved==='boolean'&&(!v.allApproved||v.ownResponse==='approved')&&v.executionEnabled===false;
 }
 function create({client,onAccountChange=()=>{}}){
  let owner=null,epoch=0,sequence=0,disposed=false;
  function clear(){owner=null;epoch++;sequence++;onAccountChange();}
  const subscription=client.auth.onAuthStateChange((_,session)=>{if(owner&&owner!==session?.user?.id)clear();});
  async function identity(){try{const r=await client.auth.getUser();return r.error?null:r.data?.user?.id||null;}catch{return null;}}
  async function review(account,book,relationship,action){
   if(disposed)return {ok:false,reason:'disposed'};
   if(!uuid(account)||!uuid(book)||!uuid(relationship)||!actions.includes(action))return {ok:false,reason:'invalid_input'};
   const version=epoch,request=++sequence,actor=await identity();
   if(disposed||request!==sequence||version!==epoch)return {ok:false,reason:'superseded'};
   if(!actor){if(owner)clear();return {ok:false,reason:'signed_out'};}
   if(actor!==account||owner&&owner!==actor){clear();return {ok:false,reason:'account_changed'};}
   owner=actor;
   let result;try{result=await client.rpc('review_relationship_storybook_consent',{p_expected_user:actor,p_volume_id:book,p_action:action,p_operation:'review'});}catch{result={error:true};}
   const after=await identity();
   if(disposed||request!==sequence||version!==epoch)return {ok:false,reason:'superseded'};
   if(after!==actor){clear();return {ok:false,reason:'account_changed'};}
   if(!result||result.error||!valid(result.data,actor,book,relationship,action))return {ok:false,reason:'unavailable'};
   return {ok:true,status:JSON.parse(JSON.stringify(result.data))};
  }
  return Object.freeze({review,invalidate:()=>{sequence++;},dispose:()=>{disposed=true;subscription?.data?.subscription?.unsubscribe?.();clear();}});
 }
 const api=Object.freeze({create});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StorybookConsentStore=api;
})(typeof globalThis==='undefined'?this:globalThis);

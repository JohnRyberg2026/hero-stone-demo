/* Candidate status and withdrawal adapter. Review may initialize a version anchor.
   Only withdrawal of the last reviewed own approval can record a response.
   No new approvals or include/publish/export execution. Server RPC required. */
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
  let reviewed=null;let owner=null,epoch=0,sequence=0,disposed=false;
  function clear(){reviewed=null;owner=null;epoch++;sequence++;onAccountChange();}
  const subscription=client.auth.onAuthStateChange((_,session)=>{if(owner&&owner!==session?.user?.id)clear();});
  async function identity(){try{const r=await client.auth.getUser();return r.error?null:r.data?.user?.id||null;}catch{return null;}}
  async function perform(account,book,relationship,action,fingerprint=null){
   const withdrawing=fingerprint!==null;
   if(disposed)return {ok:false,reason:'disposed'};
   if(!uuid(account)||!uuid(book)||!uuid(relationship)||!actions.includes(action))return {ok:false,reason:'invalid_input'};
   if(withdrawing&&(!reviewed||reviewed.account!==account||reviewed.book!==book||reviewed.relationship!==relationship||reviewed.action!==action||reviewed.fingerprint!==fingerprint))return {ok:false,reason:'review_required'};
   reviewed=null;const version=epoch,request=++sequence,actor=await identity();
   if(disposed||request!==sequence||version!==epoch)return {ok:false,reason:'superseded'};
   if(!actor){if(owner)clear();return {ok:false,reason:'signed_out'};}
   if(actor!==account||owner&&owner!==actor){clear();return {ok:false,reason:'account_changed'};}
   owner=actor;
   let result;try{result=await client.rpc('review_relationship_storybook_consent',{p_expected_user:actor,p_volume_id:book,p_action:action,p_operation:withdrawing?'respond':'review',...(withdrawing?{p_reviewed_fingerprint:fingerprint,p_decision:'withdrawn'}:{})});}catch{result={error:true};}
   const after=await identity();
   if(disposed||request!==sequence||version!==epoch)return {ok:false,reason:'superseded',mayHaveSaved:withdrawing};
   if(after!==actor){clear();return {ok:false,reason:'account_changed',mayHaveSaved:withdrawing};}
   if(!result||result.error||!valid(result.data,actor,book,relationship,action)||withdrawing&&(result.data.fingerprint!==fingerprint||result.data.ownResponse!=='withdrawn'||result.data.allApproved))return {ok:false,reason:'unavailable',mayHaveSaved:withdrawing};
   if(!withdrawing&&result.data.ownResponse==='approved')reviewed={account,book,relationship,action,fingerprint:result.data.fingerprint};
   return {ok:true,status:JSON.parse(JSON.stringify(result.data))};
  }
  return Object.freeze({review:(...args)=>perform(...args),withdraw:(account,book,relationship,action,fingerprint)=>typeof fingerprint==='string'&&/^[0-9a-f]{64}$/.test(fingerprint)?perform(account,book,relationship,action,fingerprint):Promise.resolve({ok:false,reason:'invalid_input'}),invalidate:()=>{reviewed=null;sequence++;},dispose:()=>{disposed=true;subscription?.data?.subscription?.unsubscribe?.();clear();}});
 }
 const api=Object.freeze({create});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StorybookConsentStore=api;
})(typeof globalThis==='undefined'?this:globalThis);

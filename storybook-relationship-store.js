/* Read-only relationship summaries. Requires the reviewed, separately installed
   list_my_relationship_storybooks RPC. No book contents, writes or local cache. */
(function(root){
 'use strict';
 const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
 function valid(rows,relationship){return Array.isArray(rows)&&rows.length<=100&&new Set(rows.map(v=>v?.id)).size===rows.length&&rows.every(v=>v&&Object.keys(v).length===6&&Object.keys(v).every(k=>['id','title','year','state','scope','relationshipId'].includes(k))&&uuid(v.id)&&v.scope==='relationship'&&v.relationshipId===relationship&&typeof v.title==='string'&&v.title.trim().length>0&&v.title.length<=1000&&(v.year===null||Number.isInteger(v.year)&&v.year>=1&&v.year<=9999)&&typeof v.state==='string'&&v.state.length>0&&v.state.length<=80);}
 function create({client,onAccountChange=()=>{}}){
  let owner=null,epoch=0,sequence=0,disposed=false;
  function clear(){owner=null;epoch++;sequence++;onAccountChange();}
  const subscription=client.auth.onAuthStateChange((_,session)=>{if(owner&&owner!==session?.user?.id)clear();});
  async function identity(){try{const r=await client.auth.getUser();return r.error?null:r.data?.user?.id||null;}catch{return null;}}
  async function list(expectedUser,relationshipId){
   if(disposed)return {ok:false,reason:'disposed'};
   if(!uuid(expectedUser)||!uuid(relationshipId))return {ok:false,reason:'invalid_input'};
   const version=epoch,request=++sequence,actor=await identity();
   if(disposed||request!==sequence||version!==epoch)return {ok:false,reason:'superseded'};
   if(!actor){if(owner)clear();return {ok:false,reason:'signed_out'};}
   if(actor!==expectedUser||owner&&owner!==actor){clear();return {ok:false,reason:'account_changed'};}
   owner=actor;
   let result;try{result=await client.rpc('list_my_relationship_storybooks',{p_expected_user:actor,p_heart_stone_id:relationshipId});}catch{result={error:true};}
   const after=await identity();
   if(disposed||request!==sequence||version!==epoch)return {ok:false,reason:'superseded'};
   if(after!==actor){clear();return {ok:false,reason:'account_changed'};}
   if(!result||result.error||!valid(result.data,relationshipId))return {ok:false,reason:'unavailable'};
   return {ok:true,scope:'relationship',relationshipId,volumes:JSON.parse(JSON.stringify(result.data)),mayHaveMore:result.data.length===100};
  }
  return Object.freeze({list,invalidate:()=>{sequence++;},dispose:()=>{disposed=true;subscription?.data?.subscription?.unsubscribe?.();clear();}});
 }
 const api=Object.freeze({create,valid});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StorybookRelationshipStore=api;
})(typeof globalThis==='undefined'?this:globalThis);

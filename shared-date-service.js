/* Account transport only. Participant authorization and age verification live
   in the server RPCs. No browser participant object establishes permission. */
(function(root){
 'use strict';
 function create({client,storage,crypto,onAccountChange=()=>{}}){
  let owner=null,epoch=0;
  function clear(){owner=null;epoch++;onAccountChange();}
  const subscription=client.auth.onAuthStateChange((event,session)=>{if(owner&&session?.user?.id!==owner)clear();});
  function failure(error){
   if(['PGRST202','42883'].includes(error?.code))return Error('Shared-date account features are not installed yet. No change was confirmed.');
   return Error(error?.message||'The shared-date service could not be reached.');
  }
  async function user(){const r=await client.auth.getUser();if(r.error||!r.data?.user){if(owner)clear();throw Error('Sign in through HEART STONE first, then connect this screen.');}return r.data.user;}
  async function guard(expected,version){const u=await user();if(u.id!==expected||owner!==expected||version!==epoch){clear();throw Error('Your account changed. Reconnect before continuing. A request already sent may still have completed.');}return u;}
  async function connect(){
   const u=await user();if(owner&&owner!==u.id)clear();owner=u.id;const version=epoch;
   const r=await client.rpc('shared_date_candidates',{p_expected_user:u.id});
   await guard(u.id,version);if(r.error)throw failure(r.error);
   if(!r.data?.self||r.data.self.id!==u.id||!Array.isArray(r.data.people))throw Error('The connected-account response could not be verified.');
   return {account:u,people:r.data.people,self:r.data.self};
  }
  async function requestKey(owner,args){
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(args)));
   const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
   const key='hs_shared_date_retry_'+owner+'_'+hash;
   let id=storage.getItem(key);if(!id){id=crypto.randomUUID();storage.setItem(key,id);}
   return {key,id};
  }
  async function action(operation,{date=null,payload={}}={}){
   if(!owner)throw Error('Connect your signed-in account first.');
   const expected=owner,version=epoch;await guard(expected,version);
   const args={p_operation:operation,p_expected_user:expected,p_date_id:date?.id||null,p_expected_revision:date?.revision??null,p_payload:payload};
   const write=!['list','view'].includes(operation);let retry;
   if(write){retry=await requestKey(expected,args);args.p_request_id=retry.id;await guard(expected,version);}
   let r;try{r=await client.rpc('shared_date_action',args);}catch{await guard(expected,version);throw Error(write?'The request could not be confirmed. Refresh your shared dates before retrying; it may have completed.':'The shared-date service could not be reached. Please try again.');}
   await guard(expected,version);
   if(r.error){const e=failure(r.error);if(write)e.message+=' Refresh your shared dates before retrying; an uncertain request may have completed.';throw e;}
   if(write){try{storage.removeItem(retry.key);}catch{ /* Safe to retain an opaque completed request key. */ }}
   return r.data;
  }
  return Object.freeze({connect,action,clear,dispose:()=>{subscription?.data?.subscription?.unsubscribe?.();clear();}});
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={create};else root.SharedDateService={create};
})(typeof window==='undefined'?globalThis:window);

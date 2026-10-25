/* Transport candidate only. Requires a separately reviewed storybook_draft_action
   RPC enforcing authenticated ownership, create-without-overwrite and revision CAS.
   Not connected to the preview. No local storage or automatic writes. */
(function(root){
 'use strict';
 const Model=typeof module!=='undefined'&&module.exports?require('./storybook-drafts.js'):root.StorybookDrafts;
 function valid(book,owner){
  try{
   if(!book||book.owner!==owner||book.visibility!=='private'||!Number.isSafeInteger(book.revision)||book.revision<0||!Array.isArray(book.moments)||book.moments.length>500)return false;
   if(Object.keys(book).some(k=>!['id','owner','year','title','visibility','revision','moments'].includes(k)))return false;
   Model.create(owner,{id:book.id,year:book.year,title:book.title});const ids=new Set();
   for(const m of book.moments){
    if(!m||Object.keys(m).some(k=>!['id','happenedOn','month','text','author','source','revision'].includes(k))||m.author!==owner||m.source!=='user'||!Number.isSafeInteger(m.revision)||m.revision<0||ids.has(m.id))return false;
    ids.add(m.id);const sample=Model.capture(Model.create(owner,{id:book.id,year:book.year,title:book.title}),owner,{id:m.id,happenedOn:m.happenedOn,text:m.text},0);
    if(sample.moments[0].month!==m.month)return false;
   }
   return true;
  }catch{return false;}
 }
 function create({client,onAccountChange=()=>{}}){
  let owner=null,epoch=0;
  function clear(){owner=null;epoch++;onAccountChange();}
  const subscription=client.auth.onAuthStateChange((_,session)=>{if(owner&&owner!==session?.user?.id)clear();});
  async function identity(){try{const r=await client.auth.getUser();return r.error?null:r.data?.user?.id||null;}catch{return null;}}
  async function request(operation,{book=null,id=book?.id,expectedRevision=null}={}){
   const actor=await identity();if(!actor){if(owner)clear();return {ok:false,reason:'signed_out'};}
   if(owner&&owner!==actor){clear();return {ok:false,reason:'account_changed'};}
   owner=actor;const version=epoch,write=!['read','list'].includes(operation);
   if(operation!=='list'&&(typeof id!=='string'||!id.trim()||id.length>100)||write&&!valid(book,actor)||operation==='save'&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<0))return {ok:false,reason:'invalid_input'};
   // Copy now: later edits must not change an already approved payload.
   const args={p_operation:operation,p_expected_user:actor,p_book_id:id||null,p_expected_revision:expectedRevision,p_book:write?JSON.parse(JSON.stringify(book)):null};
   let result;try{result=await client.rpc('storybook_draft_action',args);}catch{result={error:{code:'transport'}};}
   const after=await identity();if(after!==actor||epoch!==version||owner!==actor){clear();return {ok:false,reason:'account_changed',mayHaveSaved:write};}
   if(result.error)return {ok:false,reason:result.error.code==='40001'?'revision_conflict':write?'unconfirmed':'unavailable',mayHaveSaved:write};
   const data=result.data;
   if(operation==='list'){
    if(!Array.isArray(data)||data.length>100||data.some(v=>!v||Object.keys(v).some(k=>!['id','title','year','storageRevision'].includes(k))||typeof v.id!=='string'||!v.id.trim()||v.id.length>100||typeof v.title!=='string'||!v.title.trim()||v.title.length>120||!Number.isInteger(v.year)||v.year<1900||v.year>9999||!Number.isSafeInteger(v.storageRevision)||v.storageRevision<0)||new Set(data.map(v=>v.id)).size!==data.length)return {ok:false,reason:'unavailable'};
    return {ok:true,volumes:JSON.parse(JSON.stringify(data))};
   }
   if(!data||!valid(data.book,actor)||data.book.id!==id||!Number.isSafeInteger(data.storageRevision)||data.storageRevision<0)return {ok:false,reason:write?'unconfirmed':'unavailable',mayHaveSaved:write};
   return {ok:true,book:JSON.parse(JSON.stringify(data.book)),storageRevision:data.storageRevision};
  }
  return Object.freeze({list:()=>request('list'),read:id=>request('read',{id}),create:book=>request('create',{book}),save:(book,expectedRevision)=>request('save',{book,expectedRevision}),dispose:()=>{subscription?.data?.subscription?.unsubscribe?.();clear();}});
 }
 const api={create,valid};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StorybookAccountStore=api;
})(typeof globalThis==='undefined'?this:globalThis);

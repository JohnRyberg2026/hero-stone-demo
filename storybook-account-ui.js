(function(){
 'use strict';
 const $=id=>document.getElementById(id),preview=window.StorybookPreview;
 let client=null,store=null,account=null,savedId=null,savedRevision=null,busy=false,epoch=0,loading=null;
 function status(text){$('storySaveStatus').textContent=text;}
 function controls(){document.querySelectorAll('button,input,textarea').forEach(e=>e.disabled=busy);$('saveAccountBook').disabled=busy||!account;$('loadAccountBook').disabled=busy||!account;if(document.getElementById('momentEditor').hidden===false&&document.getElementById('editorTitle').textContent==='Edit your words')$('momentDate').disabled=true;}
 function clear(){epoch++;account=null;savedId=null;savedRevision=null;preview.clear();$('accountBookId').value='';$('storyAccountIdentity').textContent='Account changed. Connect again.';status('Private account content cleared.');controls();}
 async function connectClient(){
  if(client)return client;
  if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.js';s.onload=resolve;s.onerror=()=>{s.remove();loading=null;reject(Error('Account connection unavailable. Your open draft is unchanged.'));};document.head.append(s);}).then(()=>{
   client=window.supabase.createClient('https://iqxhqxlcraatdheslqeo.supabase.co','sb_publishable_SIhJh737mEWvvmOm_4zuSw_4jh_BU_h');
   store=window.StorybookAccountStore.create({client,onAccountChange:clear});
   client.auth.onAuthStateChange((_,session)=>{if(account&&session?.user?.id!==account)clear();});return client;
  });return loading;
 }
 async function run(fn){if(busy)return;busy=true;controls();try{await fn();}catch{status('Request unavailable. Your open draft has not been confirmed saved.');}finally{busy=false;controls();}}
 function failure(result){status(result.reason==='revision_conflict'?'This volume changed elsewhere. Your open edits are kept. Load the saved volume only when ready to discard or reconcile them.':result.reason==='account_changed'||result.reason==='signed_out'?'Account unavailable. Connect again before continuing.':'Save or load could not be confirmed. Your open draft is kept. A save may have completed; load the book ID before retrying.');}
 window.addEventListener('storybook:changed',()=>status('Open preview has unsaved changes. Any account copy is unchanged.'));
 $('connectStoryAccount').onclick=()=>run(async()=>{
  const api=await connectClient(),version=epoch,r=await api.auth.getUser();
  if(r.error||!r.data?.user||version!==epoch){status('Sign in through HEART STONE, then connect again.');return;}
  if(account&&account!==r.data.user.id){clear();return;}
  account=r.data.user.id;$('storyAccountIdentity').textContent='Connected to your signed-in account.';status('Connected. Nothing has been saved or loaded.');
 });
 $('saveAccountBook').onclick=()=>run(async()=>{
  if(!account||preview.unfinished()){status('Keep or cancel the unfinished memory edit before saving the volume.');return;}
  const book=preview.snapshot();if(!book){status('Start an annual preview or load a saved volume first.');return;}
  if(book.owner!=='fictional-preview-owner'&&book.owner!==account){clear();return;}
  if(!confirm('Save this entire personal volume and its text to your signed-in account? Confirm these are your own notes. Nothing will be shared.'))return;
  const version=epoch,owner=account;book.owner=owner;book.moments=book.moments.map(m=>({...m,author:owner}));$('accountBookId').value=book.id;
  const result=savedId===book.id?await store.save(book,savedRevision):await store.create(book);
  if(version!==epoch||account!==owner)return;
  if(!result.ok){failure(result);return;}
  savedId=result.book.id;savedRevision=result.storageRevision;preview.replace(result.book);status('Account save confirmed · revision '+savedRevision+'. Later edits require another explicit save.');
 });
 $('loadAccountBook').onclick=()=>run(async()=>{
  if(!account)return;const id=$('accountBookId').value.trim();if(!id){status('Enter your saved book ID.');return;}
  if((preview.snapshot()||preview.unfinished())&&!confirm('Load the account copy and replace this open preview, including unsaved edits?'))return;
  const version=epoch,owner=account,result=await store.read(id);if(version!==epoch||account!==owner)return;
  if(!result.ok){failure(result);return;}
  savedId=result.book.id;savedRevision=result.storageRevision;preview.replace(result.book);status('Account volume loaded · revision '+savedRevision+'. Nothing changed on the server.');
 });
})();

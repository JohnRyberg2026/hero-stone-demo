(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const client=window.supabase?.createClient('https://iqxhqxlcraatdheslqeo.supabase.co','sb_publishable_SIhJh737mEWvvmOm_4zuSw_4jh_BU_h');
 let epoch=0,state=null,editing=null,dirty=false,busy=false;
 function clearEditor(){editing=null;dirty=false;$('walkingComfort').value='unknown';$('spendingLimit').value='';$('preferencesEditor').hidden=true;$('preferencesFeedback').textContent='';}
 function render(next){state=next;const m=AdventureProfileView.model(next);$('statusHeading').textContent=m.screen==='saved'?'Saved preferences':m.screen==='sign_in'?'Sign in required':m.screen==='refresh'?'Refresh required':'Unavailable';$('statusMessage').textContent=m.message;$('statusRevision').textContent=Number.isSafeInteger(m.revision)?'Saved revision: '+m.revision:'';$('editPreferences').hidden=next.state!=='returning';}
 async function refresh(){if(dirty&&!confirm('Discard unfinished preference edits and reload?'))return;const token=++epoch;clearEditor();state=null;$('editPreferences').hidden=true;$('statusHeading').textContent='Checking account';$('statusMessage').textContent='Confirming saved preferences…';$('statusRevision').textContent='';if(!client){render({state:'needs_confirmation'});return;}try{const result=await AdventureProfileFlow.load(client);if(token===epoch)render(result);}catch{if(token===epoch)render({state:'needs_confirmation'});}}
 client?.auth?.onAuthStateChange(()=>{epoch++;state=null;clearEditor();render({state:'needs_confirmation'});setTimeout(refresh,0);});
 $('refresh').addEventListener('click',()=>{if(!busy)return refresh();});
 $('editPreferences').onclick=()=>{if(busy||state?.state!=='returning')return;editing=JSON.parse(JSON.stringify(state));$('walkingComfort').value=editing.boundaries.minimalWalking===true?'minimal':editing.boundaries.minimalWalking===false?'unspecified_limit':'unknown';$('spendingLimit').value=editing.boundaries.maxBudget??'';$('preferencesEditor').hidden=false;$('preferencesEditorTitle').focus();};
 ['walkingComfort','spendingLimit'].forEach(id=>$(id).oninput=()=>dirty=true);
 $('cancelPreferences').onclick=()=>{if(busy||dirty&&!confirm('Discard these preference edits?'))return;clearEditor();$('editPreferences').focus();};
 $('preferencesForm').onsubmit=async event=>{
  event.preventDefault();if(busy||!editing)return;
  const boundaries={...editing.boundaries},walking=$('walkingComfort').value,budget=$('spendingLimit').value.trim();
  if(walking==='unknown')delete boundaries.minimalWalking;else boundaries.minimalWalking=walking==='minimal';
  if(budget==='')delete boundaries.maxBudget;else boundaries.maxBudget=Number(budget);
  if(!AdventurePreferencesStore.valid(boundaries)){ $('preferencesFeedback').textContent='Check the spending limit before saving.';return; }
  if(!confirm('Save these private walking and spending preferences to your account? Nothing will be shared or purchased.'))return;
  const token=epoch,original=editing;busy=true;$('preferencesFields').disabled=true;$('savePreferences').disabled=true;
  try{
   const result=await AdventureProfileFlow.update(client,{ownerId:original.profile.ownerId,revision:original.profile.revision,boundaries,interests:original.interests});
   if(token!==epoch)return;
   if(result.state==='updated'){clearEditor();render({state:'returning',profile:{...original.profile,revision:result.revision},boundaries,interests:original.interests});$('statusMessage').textContent='Your private changes were saved.';}
   else if(result.state==='account_changed'||result.state==='signed_out'){epoch++;clearEditor();render({state:result.state});}
   else $('preferencesFeedback').textContent=result.state==='revision_conflict'?'Your preferences changed elsewhere. Your open edits are kept; reload when ready to reconcile them.':'The save could not be confirmed. Your edits are kept. Reload before retrying; the request may have completed.';
  }catch{if(token===epoch)$('preferencesFeedback').textContent='The save could not be confirmed. Your edits are kept. Reload before retrying.';}
  finally{busy=false;$('preferencesFields').disabled=false;$('savePreferences').disabled=false;}
 };
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 refresh();
})();

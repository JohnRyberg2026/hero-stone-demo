'use strict';
(()=>{
 const $=id=>document.getElementById(id),fields=['units','sizeSystem','tops','bottoms','dresses','underwear','sleepwear','swimwear','shoeSystem','shoes','braSystem','braBand','braCup','height','weight','bust','underbust','waist','hips','inseam','fitNotes'];
 let client,loading,owner=null,revision=0,busy=false,version=0,changed=false;
 const say=text=>{$('fitStatus').textContent=text;if(!$('fitDialog').open)$('fitOpenStatus').textContent=text;};
 function erase(){for(const key of fields)$('fit_'+key).value='';owner=null;revision=0;changed=false;version++;$('fitDialog').close();}
 async function sb(){if(client)return client;if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.js';s.onload=resolve;s.onerror=()=>{loading=null;reject(Error('Could not connect. Try opening your profile again.'));};document.head.append(s);});await loading;
  if(!client){client=window.supabase.createClient('https://iqxhqxlcraatdheslqeo.supabase.co','sb_publishable_SIhJh737mEWvvmOm_4zuSw_4jh_BU_h');client.auth.onAuthStateChange((event,session)=>{if(owner&&session?.user?.id!==owner){erase();say('Your account changed. Open your profile again.');}});}return client;}
 function units(){const imperial=$('fit_units').value==='imperial';$('fitUnitHelp').textContent=imperial?'Height and body measurements: inches. Weight: pounds. Switching units does not convert existing numbers.':'Height and body measurements: centimeters. Weight: kilograms. Switching units does not convert existing numbers.';}
 $('openFitProfile').onclick=async()=>{if(busy)return;busy=true;$('openFitProfile').disabled=true;const token=++version;try{
  const c=await sb(),u=await c.auth.getUser();if(u.error||!u.data?.user)throw Error('Sign in to HEART STONE first, then open your private fit profile.');
  const id=u.data.user.id,r=await c.rpc('my_private_fit_profile',{p_expected_user:id});const check=await c.auth.getUser();if(token!==version)return;
  if(r.error||check.error||check.data?.user?.id!==id)throw Error('Could not load your profile. Check your account and try again.');
  owner=id;revision=r.data.revision;for(const key of fields)$('fit_'+key).value=r.data.profile?.[key]||({units:'metric',sizeSystem:'US',shoeSystem:'US',braSystem:'US'})[key]||'';changed=false;units();say('Your profile is visible to your signed-in account only. Nothing is shared with a partner or seller.');$('fitDialog').showModal();
 }catch(e){say(e.message);}finally{busy=false;$('openFitProfile').disabled=false;}};
 async function write(action){if(busy||!owner)return;if(action==='save'&&!$('fitForm').reportValidity())return;if(action==='delete'&&!confirm('Delete all saved fit details from your account? A stale open editor will not be able to restore them.'))return;
  const token=version,id=owner;busy=true;['fitSave','fitDelete','fitClose'].forEach(k=>$(k).disabled=true);say(action==='delete'?'Deleting your fit details…':'Saving your private fit profile…');
  try{const c=await sb(),u=await c.auth.getUser();if(u.error||u.data?.user?.id!==id)throw Error('Your account changed. Close and reopen your profile.');
   const profile=Object.fromEntries(fields.map(k=>[k,$('fit_'+k).value.trim()]).filter(([,v])=>v!==''));
   const r=await c.rpc('my_private_fit_profile',{p_expected_user:id,p_action:action,p_expected_revision:revision,...(action==='save'?{p_profile:profile}:{})});const check=await c.auth.getUser();
   if(token!==version)return;if(r.error||check.error||check.data?.user?.id!==id)throw Error('We couldn’t confirm this change. Your profile may have changed elsewhere. Close and reopen it to check; unsaved edits will be discarded.');
   revision=r.data.revision;changed=false;if(action==='delete'){for(const key of fields)$('fit_'+key).value=({units:'metric',sizeSystem:'US',shoeSystem:'US',braSystem:'US'})[key]||'';units();}say(action==='delete'?'Your saved fit details have been deleted.':'Your private fit profile is saved to your account. It was not added to your device draft or shared.');
  }catch(e){if(token===version)say(e.message);}finally{busy=false;['fitSave','fitDelete','fitClose'].forEach(k=>$(k).disabled=false);}}
 $('fitSave').onclick=()=>write('save');$('fitDelete').onclick=()=>write('delete');
 $('fitClose').onclick=()=>{if(!changed||confirm('Discard unsaved fit changes and close?'))erase();};
 $('fitDialog').addEventListener('cancel',e=>{if(busy||(changed&&!confirm('Discard unsaved fit changes and close?')))e.preventDefault();});
 $('fitDialog').addEventListener('close',()=>{for(const key of fields)$('fit_'+key).value='';owner=null;changed=false;revision=0;version++;});
 $('fitForm').addEventListener('input',()=>{changed=true;});$('fitForm').addEventListener('change',()=>{changed=true;});$('fitForm').onsubmit=e=>e.preventDefault();
 $('fit_units').onchange=()=>{const filled=['height','weight','bust','underbust','waist','hips','inseam'].some(k=>$('fit_'+k).value);if(filled&&!confirm('Clear measurement numbers before switching units? Clothing sizes will stay.')){$('fit_units').value=$('fit_units').value==='imperial'?'metric':'imperial';return;}if(filled)for(const k of ['height','weight','bust','underbust','waist','hips','inseam'])$('fit_'+k).value='';units();changed=true;};
 window.addEventListener('beforeunload',e=>{if(changed){e.preventDefault();e.returnValue='';}});
})();

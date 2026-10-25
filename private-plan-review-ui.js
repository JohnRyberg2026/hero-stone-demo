(function(){
 'use strict';const $=id=>document.getElementById(id);let client=null,loading=null,owner=null,epoch=0,busy=false;
 function clear(){epoch++;owner=null;$('privatePlanFindings').replaceChildren();$('privatePlanStatus').textContent='Account changed. Private review cleared.';}
 function draftChanged(){epoch++;$('privatePlanFindings').replaceChildren();$('privatePlanStatus').textContent='Plan changed. Run a fresh private review before relying on previous findings.';}
 window.addEventListener('heartstone:plan-draft-changed',draftChanged);
 document.getElementById('localDateBuilder').addEventListener('input',draftChanged);
 async function connect(){if(client)return client;if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.js';s.onload=resolve;s.onerror=()=>{s.remove();loading=null;reject(Error());};document.head.append(s);}).then(()=>{client=window.supabase.createClient('https://iqxhqxlcraatdheslqeo.supabase.co','sb_publishable_SIhJh737mEWvvmOm_4zuSw_4jh_BU_h');client.auth.onAuthStateChange((_,session)=>{if(owner&&session?.user?.id!==owner)clear();});return client;});return loading;}
 $('reviewPrivatePlan').onclick=async()=>{
  if(busy)return;busy=true;$('reviewPrivatePlan').disabled=true;$('privatePlanFindings').replaceChildren();$('privatePlanStatus').textContent='Checking your own saved preferences…';
  try{
   const version=epoch;let plan;window.dispatchEvent(new CustomEvent('heartstone:review-plan',{detail:{respond:value=>plan=value}}));
   if(!plan){$('privatePlanStatus').textContent='Check the open plan fields before reviewing.';return;}
   const api=await connect(),auth=await api.auth.getUser();if(version!==epoch)return;if(auth.error||!auth.data?.user){clear();$('privatePlanStatus').textContent='Sign in through HEART STONE first. No review was completed.';return;}
   owner=auth.data.user.id;const expected=owner,profile=await AdventurePreferencesStore.read(api);
   if(version!==epoch||owner!==expected)return;
   const result=PrivatePlanReview.review({accountId:expected,profile,plan,catalog:LocalDateCatalog});
   if(result.status==='unavailable'){$('privatePlanStatus').textContent='Saved preferences could not be confirmed. No cached preferences were used.';return;}
   if(result.status==='empty'){$('privatePlanStatus').textContent='Add a possibility to your plan, then review it.';return;}
   $('privatePlanStatus').textContent=(result.status==='conflicts'?'Saved-boundary conflicts need your attention.':'Details still need confirmation.')+' Review of the current draft only, using preference revision '+result.profileRevision+'. Changes require a fresh review.';
   const p=document.createElement('p');p.textContent=result.budget;$('privatePlanFindings').append(p);
   for(const finding of result.findings)for(const message of finding.messages){const item=document.createElement('p');item.textContent='Stop '+finding.index+': '+message;$('privatePlanFindings').append(item);}
  }catch{$('privatePlanStatus').textContent='Private review unavailable. Nothing was saved, sent or approved.';}
  finally{busy=false;$('reviewPrivatePlan').disabled=false;}
 };
})();

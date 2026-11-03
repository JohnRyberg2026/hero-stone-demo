'use strict';
(()=>{
 document.querySelectorAll('[data-heart-stone-guide]').forEach(root=>{
  const body=root.querySelector('.hs-guide-body');if(!body||typeof sb==='undefined')return;
  const section=document.createElement('section');section.className='hs-preferences';
  section.innerHTML=`<h3>What would you like Heart Stone to remember?</h3><p class="hs-guide-note">Save only your own planning preferences. These are private to your account and are never learned automatically from chat.</p><button type="button" data-pref-open>My planning preferences</button><form data-pref-form hidden><label>Comfortable budget · include currency and whether it is a total<input data-pref-budget maxlength="240" placeholder="For example, $50 total for an evening"></label><label>Activities I enjoy<textarea data-pref-activities maxlength="240" rows="2"></textarea></label><label>Things I would rather avoid<textarea data-pref-avoid maxlength="240" rows="2"></textarea></label><label class="hs-pref-consent"><input type="checkbox" data-pref-consent> Use these saved preferences in future Heart Stone conversations</label><p class="hs-guide-note">If checked and saved, these three fields are sent to OpenAI with future messages. They are not shared directly with your partner. You review invitation wording before sending. Editing or deleting preferences clears this open conversation; it cannot retract information already sent to OpenAI or an invitation you sent.</p><button type="submit" data-pref-save>Save my preferences</button><button type="button" data-pref-delete>Delete saved preferences</button><button type="button" data-pref-close>Close</button></form><p data-pref-status role="status" aria-live="polite"></p>`;
  body.append(section);
  const q=s=>section.querySelector(s),form=q('[data-pref-form]'),status=q('[data-pref-status]'),fields=['budget','activities','avoid'];
  let owner=null,revision=0,generation=0,busy=false;
  const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('heartstone-planning-preferences');
  const notify=()=>{window.dispatchEvent(new Event('heartstone:preferences-changed'));channel?.postMessage('changed');};
  if(channel)channel.onmessage=()=>{clear();window.dispatchEvent(new Event('heartstone:preferences-changed'));};
  function clear(){generation++;owner=null;revision=0;busy=false;fields.forEach(k=>q('[data-pref-'+k+']').value='');q('[data-pref-consent]').checked=false;form.hidden=true;status.textContent='';buttons();}
  function buttons(){['open','save','delete','close'].forEach(k=>q('[data-pref-'+k+']').disabled=busy);}
  async function verify(id){const r=await sb.auth.getUser();if(r.error||r.data.user?.id!==id){clear();notify();throw Error('Your account changed. Reopen your preferences.');}}
  async function load(){if(busy)return;const v=++generation;busy=true;buttons();status.textContent='Loading your preferences…';try{
   const auth=await sb.auth.getUser();if(v!==generation)return;if(auth.error||!auth.data.user)throw Error('Sign in to open your preferences.');const id=auth.data.user.id;
   const r=await sb.rpc('my_planning_preferences',{p_expected_user:id});if(v!==generation)return;await verify(id);if(v!==generation)return;if(r.error)throw Error('Could not load preferences. Please try again.');
   owner=id;revision=r.data.revision;fields.forEach(k=>q('[data-pref-'+k+']').value=r.data.profile?.[k]||'');q('[data-pref-consent]').checked=r.data.useWithAI===true;form.hidden=false;status.textContent=r.data.useWithAI?'Saved preferences are enabled for future AI messages.':'AI preference use is off. Saving alone does not enable it.';
  }catch(e){if(v===generation)status.textContent=e.message;}finally{if(v===generation){busy=false;buttons();}}}
  async function write(action){if(busy||!owner)return;if(action==='delete'&&!confirm('Delete your saved planning preferences and turn off their use in future conversations?'))return;
   const id=owner,v=generation;busy=true;buttons();status.textContent=action==='delete'?'Deleting preferences…':'Saving preferences…';
   try{await verify(id);if(v!==generation)return;const profile=Object.fromEntries(fields.map(k=>[k,q('[data-pref-'+k+']').value.trim()]));
    const r=await sb.rpc('my_planning_preferences',{p_expected_user:id,p_action:action,p_expected_revision:revision,...(action==='save'?{p_profile:profile,p_use_with_ai:q('[data-pref-consent]').checked}: {})});
    if(v!==generation)return;await verify(id);if(v!==generation)return;if(r.error)throw Error('Could not confirm this change. Reopen preferences to check before retrying.');
    revision=r.data.revision;fields.forEach(k=>q('[data-pref-'+k+']').value=r.data.profile?.[k]||'');q('[data-pref-consent]').checked=r.data.useWithAI===true;notify();
    status.textContent=action==='delete'?'Saved preferences deleted. AI preference use is off.':r.data.useWithAI?'Saved. Heart Stone can use these preferences in future messages.':'Saved privately. AI preference use is off.';
   }catch(e){if(v===generation)status.textContent=e.message;}finally{if(v===generation){busy=false;buttons();}}
  }
  q('[data-pref-open]').onclick=load;form.onsubmit=e=>{e.preventDefault();return write('save');};q('[data-pref-delete]').onclick=()=>write('delete');q('[data-pref-close]').onclick=clear;
  window.addEventListener('pagehide',clear);window.addEventListener('heartstone:home-state',e=>{if(!e.detail?.connected)clear();});
  sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(owner&&session?.user?.id!==owner))clear();});
 });
})();

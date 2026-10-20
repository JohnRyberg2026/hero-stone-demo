(function(){
  'use strict';
  const el=id=>document.getElementById(id);
  let client,loading,accountId=null,prepared=null,sendBusy=false,inboxBusy=false;
  function clearShared(){
    prepared=null;
    el('sharedInvitationList').replaceChildren();
    el('sharedInvitationStatus').textContent='Account changed. Refresh invitations to continue.';
    el('accountConnectionStatus').textContent='Account changed. Check your connection again.';
    if(el('sendInvitationDialog').open)el('sendInvitationDialog').close();
  }
  function loadClient(){
    if(client)return Promise.resolve(client);
    if(!loading)loading=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.js';
      script.onload=resolve;
      script.onerror=()=>{script.remove();loading=null;reject(new Error('Connection library could not load. Please try again.'));};
      document.head.appendChild(script);
    });
    return loading.then(()=>{
      if(!client){
        client=window.supabase.createClient('https://iqxhqxlcraatdheslqeo.supabase.co','sb_publishable_SIhJh737mEWvvmOm_4zuSw_4jh_BU_h');
        client.auth.onAuthStateChange((event,session)=>{
          const next=session?.user?.id||null;
          if(accountId!==null&&accountId!==next)clearShared();
          accountId=next;
        });
      }
      return client;
    });
  }
  async function context(){
    const sb=await loadClient();
    const {data,error}=await sb.auth.getUser();
    if(error||!data?.user)throw new Error('Please sign in through HEART STONE, then return here. Your local draft stays here.');
    const user=data.user;
    const result=await sb.from('heart_stone_memberships').select('heart_stone_id').eq('user_id',user.id).eq('status','active').limit(2);
    if(result.error)throw new Error('We couldn’t check your HEART STONE connection. Please try again.');
    if(result.data?.length!==1)throw new Error(result.data?.length>1?'More than one HEART STONE connection was found. Sending is unavailable until a connection can be chosen.':'No active HEART STONE connection was found. Open HEART STONE to connect with your partner.');
    const hs=result.data[0].heart_stone_id;
    const partners=await sb.rpc('get_moment_invitation_partners',{p_heart_stone_id:hs});
    if(partners.error)throw new Error('We couldn’t load the connected partners. Please try again.');
    const verify=await sb.auth.getUser();
    if(verify.error||verify.data?.user?.id!==user.id)throw new Error('Your account changed. Please check again.');
    if(accountId!==null&&accountId!==user.id)clearShared();
    accountId=user.id;
    return {sb,user,hs,partners:partners.data||[]};
  }
  el('checkAccount').onclick=async()=>{
    const button=el('checkAccount');button.disabled=true;
    el('accountConnectionStatus').textContent='Checking your account connection…';
    try{const c=await context();el('accountConnectionStatus').textContent='Signed in as '+(c.user.email||'your verified account')+'. One active HEART STONE connection found. '+c.partners.length+' connected partner'+(c.partners.length===1?'':'s')+'. Your draft stays local until you choose Send.';}
    catch(e){el('accountConnectionStatus').textContent=e.message;}
    finally{button.disabled=false;}
  };
  function payload(){
    const plan=planDraft();
    if(!kind)throw new Error('Choose your kind of moment first.');
    if(!el('experienceTitle').value.trim()||!el('experienceStory').value.trim())throw new Error('Add a name and description for your moment first.');
    if(plan.whenMode==='specific'&&(!plan.momentDate||!plan.momentTime||!plan.momentZone.trim()))throw new Error('Add your date, time, and time zone, or choose to decide together.');
    if(plan.meetMode==='place'&&!plan.meetPlace.trim())throw new Error('Add your meeting place, or choose to decide together.');
    if(el('revealMode').value==='hint'&&!el('experienceHint').value.trim())throw new Error('Add a hint or choose another reveal option.');
    return {p_message:el('message').value.trim()||'I’d love a little time together.',p_kind:kind,p_plan:plan,p_title:el('experienceTitle').value.trim(),p_story:el('experienceStory').value.trim(),p_reveal_mode:el('revealMode').value,p_hint:el('experienceHint').value.trim()};
  }
  function planText(p){
    p=p&&typeof p==='object'?p:{};
    const meeting={together:'We’ll decide together',home:'Meet at home',leave:'Leave together',place:p.meetPlace||'We’ll decide together'};
    return [p.whenMode==='specific'?[p.momentDate,p.momentTime,p.momentZone].filter(Boolean).join(' · '):'Day and time: We’ll decide together','Time together: '+(p.length||'We’ll decide together'),'Meeting: '+(meeting[p.meetMode]||meeting.together),p.preparation?'Before we go: '+p.preparation:''].filter(Boolean).join('\n');
  }
  el('prepareLiveSend').onclick=async()=>{
    const button=el('prepareLiveSend');button.disabled=true;
    el('liveSendStatus').textContent='Checking the recipient…';
    try{
      const draft=payload(),c=await context();
      if(!c.partners.length)throw new Error('No active partner is connected yet. Open HEART STONE to connect first.');
      prepared={...c,draft};
      el('liveSender').textContent='Sending from '+(c.user.email||'your verified account');
      el('liveRecipient').replaceChildren(new Option('Choose your connected partner',''));
      c.partners.forEach(p=>el('liveRecipient').add(new Option(p.name+' · account '+p.id.slice(-6),p.id)));
      el('liveSendSummary').textContent=draft.p_message+'\n\n'+draft.p_title+'\n'+draft.p_story+'\n\n'+planText(draft.p_plan)+'\n\nInvitation reveal: '+draft.p_reveal_mode;
      el('confirmLiveSend').disabled=true;
      el('sendDialogStatus').textContent='This sends the invitation inside HEART STONE. It does not send a text message or email.';
      el('sendInvitationDialog').showModal();
      el('liveSendStatus').textContent='Review your recipient and invitation before sending.';
    }catch(e){prepared=null;el('liveSendStatus').textContent=e.message;}
    finally{button.disabled=false;}
  };
  el('liveRecipient').onchange=()=>{el('confirmLiveSend').disabled=!el('liveRecipient').value||sendBusy;};
  el('keepInvitationDraft').onclick=()=>{if(!sendBusy)el('sendInvitationDialog').close();};
  el('sendInvitationDialog').addEventListener('cancel',event=>{if(sendBusy)event.preventDefault();});
  async function requestId(userId,body){
    const bytes=new TextEncoder().encode(JSON.stringify(body));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const key='hs_moment_send_v1_'+userId+'_'+hash;
    let id=localStorage.getItem(key);
    if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}
    return id;
  }
  el('confirmLiveSend').onclick=async()=>{
    if(sendBusy||!prepared)return;
    const p=prepared,recipient=el('liveRecipient').value;
    if(!p.partners.some(x=>x.id===recipient))return;
    sendBusy=true;el('confirmLiveSend').disabled=true;el('keepInvitationDraft').disabled=true;
    el('sendDialogStatus').textContent='Sending your invitation…';
    try{
      const c=await context();
      if(c.user.id!==p.user.id||c.hs!==p.hs||!c.partners.some(x=>x.id===recipient))throw new Error('Your account or connection changed. Close this window and review the recipient again.');
      const body={p_expected_sender_id:c.user.id,p_heart_stone_id:c.hs,p_recipient_id:recipient,...p.draft};
      const id=await requestId(c.user.id,body);
      const result=await c.sb.rpc('send_checked_moment_invitation',{...body,p_client_request_id:id});
      if(result.error)throw new Error('We couldn’t confirm the send. Retry without changing this invitation to avoid a duplicate, or check Shared Invitations.');
      const verify=await c.sb.auth.getUser();
      if(verify.error||verify.data?.user?.id!==c.user.id)throw new Error('The request finished, but your account changed. Check Shared Invitations from the sending account.');
      el('sendInvitationDialog').close();prepared=null;
      el('liveSendStatus').textContent='✓ Invitation sent to '+p.partners.find(x=>x.id===recipient).name+'. Check Shared Invitations for their reply.';
      el('previewBanner').textContent='Create a moment · Shared invitations available';
      // The draft remains editable; sent invitations are immutable snapshots.
    }catch(e){el('sendDialogStatus').textContent=e.message;}
    finally{sendBusy=false;el('confirmLiveSend').disabled=!prepared;el('keepInvitationDraft').disabled=false;}
  };
  function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function action(parent,label,handler){const b=node('button',label,'secondary');b.type='button';b.style.marginTop='8px';b.onclick=handler;parent.appendChild(b);return b;}
  const statuses={pending:'Waiting for a reply',accepted:'It’s a date. Your invitation is accepted.',declined:'This invitation was declined. This invitation is closed.',reschedule:'Another time was requested. The original time is not confirmed.',cancelled:'This invitation is cancelled. No further response is needed.'};
  async function updateInvitation(c,item,response,note,card){
    const buttons=[...card.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
    el('sharedInvitationStatus').textContent='Saving your response…';
    try{
      const current=await context();
      if(current.user.id!==c.user.id||current.hs!==c.hs)throw new Error('Your account changed. Refresh invitations before responding.');
      const result=await current.sb.rpc(response==='cancelled'?'cancel_moment_invitation':'respond_moment_invitation',response==='cancelled'?{p_invitation_id:item.id}:{p_invitation_id:item.id,p_response:response,p_note:note||''});
      if(result.error)throw new Error('We couldn’t save this response. It may already have been answered or closed. Refresh invitations before trying again.');
      await refreshInbox();
    }catch(e){el('sharedInvitationStatus').textContent=e.message;buttons.forEach(b=>b.disabled=false);}
  }
  async function refreshInbox(){
    if(inboxBusy)return;inboxBusy=true;el('refreshSharedInvitations').disabled=true;
    el('sharedInvitationList').replaceChildren();
    el('sharedInvitationStatus').textContent='Checking shared invitations…';
    try{
      const c=await context();
      const result=await c.sb.rpc('list_moment_invitations',{p_heart_stone_id:c.hs});
      if(result.error)throw new Error('We couldn’t load your shared invitations. Please try again.');
      const verify=await c.sb.auth.getUser();
      if(verify.error||verify.data?.user?.id!==c.user.id)throw new Error('Your account changed. Refresh invitations to continue.');
      const items=Array.isArray(result.data)?result.data:[];
      el('sharedInvitationAccount').textContent='Signed in as '+(c.user.email||'your verified account');
      for(const item of items){
        const incoming=item.recipient_id===c.user.id;
        const other=c.partners.find(x=>x.id===(incoming?item.sender_id:item.recipient_id));
        const card=node('article',undefined,'card');card.style.marginTop='16px';
        card.append(node('div',(incoming?'From ':'To ')+(other?.name||'your connected partner'),'eyebrow'));
        card.append(node('h2',item.status==='accepted'&&incoming?'A moment waiting for us':item.title));
        card.append(node('p',statuses[item.status]||item.status,'notice'));
        card.append(node('div',item.message,'quote'));
        card.append(node('div',planText(item.plan),'quote'));
        if(item.status==='accepted'&&incoming){
          const reveal=node('div',undefined,'quote');reveal.hidden=true;
          action(card,'Reveal Our Moment ❤️',()=>{reveal.textContent=item.title+'\n'+item.story;reveal.hidden=false;});card.append(reveal);
          card.append(node('p','Saying yes to time together leaves room to change your mind or stop.','helper'));
        }else{card.append(node('p',item.story));}
        if(item.response_note)card.append(node('div','Suggested time: '+item.response_note,'quote'));
        if(incoming&&item.status==='pending'){
          action(card,'I’d love to ❤️',()=>{if(confirm('Accept this invitation? Your partner will see your response.'))updateInvitation(c,item,'accepted','',card);});
          const reschedule=node('details');reschedule.append(node('summary','Could we find another time?'));
          const note=node('textarea');note.maxLength=400;note.setAttribute('aria-label','A time that might work (optional)');note.placeholder='A time that might work (optional)';reschedule.append(note);
          action(reschedule,'Ask for Another Time',()=>{if(confirm('Ask for another time? The original time will remain unconfirmed.'))updateInvitation(c,item,'reschedule',note.value.trim(),card);});card.append(reschedule);
          action(card,'Thank you for asking. I’ll pass this time.',()=>{if(confirm('Decline this invitation? Your partner will see that it is closed.'))updateInvitation(c,item,'declined','',card);});
        }
        if(['pending','accepted','reschedule'].includes(item.status))action(card,incoming?'Stop This Invitation':'Cancel This Invitation',()=>{if(confirm('Close this invitation for both of you?'))updateInvitation(c,item,'cancelled','',card);});
        el('sharedInvitationList').append(card);
      }
      el('sharedInvitationStatus').textContent=items.length?'Showing your latest '+items.length+' invitation'+(items.length===1?'':'s')+'. Tap Refresh Invitations to see new replies.':'There isn’t an invitation waiting right now.';
    }catch(e){el('sharedInvitationAccount').textContent='';el('sharedInvitationStatus').textContent=e.message;}
    finally{inboxBusy=false;el('refreshSharedInvitations').disabled=false;}
  }
  el('openSharedInvitations').onclick=()=>{screen('sharedInbox');refreshInbox();};
  el('refreshSharedInvitations').onclick=refreshInbox;
  el('backFromSharedInvitations').onclick=()=>screen('feelings');
  if(window.location?.hash==='#shared-invitations'){
    screen('sharedInbox');refreshInbox();
  }
})();

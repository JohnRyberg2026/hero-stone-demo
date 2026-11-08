(function(){
  'use strict';
  function readWithTimeout(task,ms=15000){
    let timer;
    return Promise.race([Promise.resolve().then(task),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The connection is taking too long. Tap Refresh to try again.')),ms);})]).finally(()=>clearTimeout(timer));
  }
  const el=id=>document.getElementById(id);
  let momentDialog=null,momentVersion=0;
  let calendarMoment=new URLSearchParams(window.location.search).get('moment');
  let memoriesOnly=window.location?.hash==='#our-memories';
  function completedMoments(items,userId){return items.filter(item=>item.status==='accepted'&&item.completed_at&&(item.sender_id===userId||item.recipient_id===userId)).sort((a,b)=>String(b.completed_at).localeCompare(String(a.completed_at)));}
  function collectionLabels(){
    const inbox=el('sharedInbox');
    inbox.querySelector('.eyebrow').textContent=memoriesOnly?'Our Memories':'Invitations & replies';
    inbox.querySelector('h1').textContent=memoriesOnly?'Our Memories':'Our Invitations';
    for(const [id,active] of [['invitationsCollectionTab',!memoriesOnly],['memoriesCollectionTab',memoriesOnly]]){const tab=el(id);if(tab){if(active)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');}}
    inbox.querySelector('.storyOpening').textContent=memoriesOnly?'Revisit a moment. Keep your own words privately.':'Someone reaches out. Someone answers. A new chapter begins.';
    el('refreshSharedInvitations').textContent=memoriesOnly?'Refresh Memories':'Refresh Invitations';
    el('backFromSharedInvitations').textContent=memoriesOnly?'Back — Home':'Back — My Invitation Draft';
  }
  let client,loading,accountId=null,prepared=null,sendBusy=false,inboxBusy=false;
  const avatars={initials:'Initials',heart:'❤️',sun:'☀️',moon:'🌙',flower:'🌸',compass:'🧭'};
  let pictureOwner=null,pictureDraft='initials',pictureVersion=0;
  function person(container,name,picture,prefix=''){
    container.replaceChildren();
    let a;
    if(typeof picture==='string'&&picture.length<=140000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(picture)){
      a=document.createElement('img');a.src=picture;a.alt=''; 
    }else{a=document.createElement('span');a.textContent=avatars[picture]&&picture!=='initials'?avatars[picture]:name.trim().slice(0,1).toUpperCase();a.setAttribute('aria-hidden','true');}
    a.className='avatar';container.append(a,document.createTextNode(prefix+name));
  }
  function previewPicture(){person(el('myPicturePreview'),'My picture',pictureDraft);el('avatarChoices').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatar===pictureDraft)));}
  Object.entries(avatars).forEach(([key,label])=>{const b=document.createElement('button');b.type='button';b.dataset.avatar=key;b.textContent=label;b.onclick=()=>{pictureVersion++;pictureDraft=key;previewPicture();};el('avatarChoices').append(b);});
  el('loadMyPicture').onclick=async()=>{
    try{const sb=await loadClient(),r=await sb.auth.getUser();if(r.error||!r.data?.user)throw Error('Sign in through HEART STONE first.');
      const id=r.data.user.id,result=await sb.rpc('my_moment_profile_picture',{p_expected_user:id});
      const verify=await sb.auth.getUser();if(result.error||verify.data?.user?.id!==id)throw Error('Could not load your picture. Check your account and try again.');
      pictureOwner=id;accountId=id;pictureDraft=result.data||'initials';pictureVersion++;previewPicture();el('pictureEditor').hidden=false;el('pictureStatus').textContent='Choose a picture, then Save. Your invitation is not sent.';
    }catch(e){el('pictureStatus').textContent=e.message;}
  };
  el('cancelMyPicture').onclick=()=>{pictureVersion++;pictureOwner=null;pictureDraft='initials';el('profilePhoto').value='';el('pictureEditor').hidden=true;el('myPicturePreview').replaceChildren();el('pictureStatus').textContent='Picture changes discarded.';};
  el('profilePhoto').onchange=async()=>{
    const version=++pictureVersion,file=el('profilePhoto').files[0];if(!file)return;
    try{
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPG, PNG or WebP photo under 10 MB.');
      const bitmap=await createImageBitmap(file);
      const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
      const ctx=canvas.getContext('2d'),size=Math.min(bitmap.width,bitmap.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);ctx.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,256,256);bitmap.close();
      const photo=canvas.toDataURL('image/jpeg',0.8);if(photo.length>140000)throw Error('This photo is too large. Try another.');
      if(version!==pictureVersion||!pictureOwner)return;pictureDraft=photo;previewPicture();el('pictureStatus').textContent='Photo ready. Save My Picture to use it.';
    }catch(e){el('pictureStatus').textContent=e.message;}
  };
  el('saveMyPicture').onclick=async()=>{
    const b=el('saveMyPicture');b.disabled=true;
    try{const sb=await loadClient(),r=await sb.auth.getUser();if(!pictureOwner||r.error||r.data?.user?.id!==pictureOwner)throw Error('Your account changed. Open Edit My Picture again.');
      const result=await sb.rpc('my_moment_profile_picture',{p_expected_user:pictureOwner,p_picture:pictureDraft});
      const verify=await sb.auth.getUser();if(result.error||verify.data?.user?.id!==pictureOwner)throw Error('Could not confirm the save. Open Edit My Picture to check.');
      el('pictureEditor').hidden=true;pictureVersion++;el('pictureStatus').textContent='✓ Profile picture saved. Connected partners will see it when they refresh.';
    }catch(e){el('pictureStatus').textContent=e.message;}finally{b.disabled=false;}
  };
  function clearShared(){
    momentVersion++;if(momentDialog){momentDialog.close();momentDialog=null;}
    prepared=null;pictureOwner=null;pictureDraft='initials';el('pictureEditor').hidden=true;el('myPicturePreview').replaceChildren();el('recipientPicture').replaceChildren();
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
          if (accountId !== null && accountId !== next) window.dispatchEvent(new Event("heartstone:invitation-account"));
          accountId=next;
        });
      }
      return client;
    });
  }
  window.heartStoneCurrentAccount = async () => {
    const sb = await loadClient();
    const {data,error} = await sb.auth.getUser();
    return error ? null : data.user?.id || null;
  };
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
  function readableDay(value){
    if(typeof value!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(value))return value||'';
    const date=new Date(value+'T12:00:00Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return value;
    return date.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
  }
  function readableTime(value){
    if(typeof value!=='string'||! /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value))return value||'';
    const date=new Date('2000-01-01T'+value.slice(0,5)+':00Z');
    return date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',timeZone:'UTC'});
  }
  function readableSchedule(day,time,zone){
    return [readableDay(day),readableTime(time),zone?'Time zone: '+String(zone).replace(/_/g,' '):''].filter(Boolean).join(' · ');
  }
  function planText(p){
    p=p&&typeof p==='object'?p:{};
    const meeting={together:'We’ll decide together',home:'Meet at home',leave:'Leave together',place:p.meetPlace||'We’ll decide together'};
    return [p.whenMode==='specific'?readableSchedule(p.momentDate,p.momentTime,p.momentZone):'Day and time: We’ll decide together','Time together: '+(p.length||'We’ll decide together'),'Meeting: '+(meeting[p.meetMode]||meeting.together),p.preparation?'Before we go: '+p.preparation:''].filter(Boolean).join('\n');
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
      c.partners.forEach(p=>el('liveRecipient').add(new Option(p.name,p.id)));
      el('liveSendSummary').textContent=draft.p_message+'\n\n'+draft.p_title+'\n'+draft.p_story+'\n\n'+planText(draft.p_plan)+'\n\nInvitation reveal: '+draft.p_reveal_mode;
      el('recipientPicture').replaceChildren();
      el('confirmLiveSend').disabled=true;
      el('sendDialogStatus').textContent='This sends the invitation inside HEART STONE. It does not send a text message or email.';
      el('sendInvitationDialog').showModal();
      el('liveSendStatus').textContent='Review your recipient and invitation before sending.';
    }catch(e){prepared=null;el('liveSendStatus').textContent=e.message;}
    finally{button.disabled=false;}
  };
  el('liveRecipient').onchange=()=>{const p=prepared?.partners.find(p=>p.id===el('liveRecipient').value);el('confirmLiveSend').disabled=!p||sendBusy;if(p)person(el('recipientPicture'),p.name,p.picture,'Send to ');else el('recipientPicture').replaceChildren();};
  el('keepInvitationDraft').onclick=()=>{if(!sendBusy)el('sendInvitationDialog').close();};
  el('sendInvitationDialog').addEventListener('cancel',event=>{if(sendBusy)event.preventDefault();});
  async function requestId(userId,body){
    const bytes=new TextEncoder().encode(JSON.stringify(body));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const key='hs_moment_send_v1_'+userId+'_'+hash;
    let id=localStorage.getItem(key);
    if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}
    return {id,key};
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
      const request=await requestId(c.user.id,body);
      let result=await c.sb.rpc('send_checked_moment_invitation',{...body,p_client_request_id:request.id});
      if(!result.error){
        const listed=await c.sb.rpc('list_moment_invitations',{p_heart_stone_id:c.hs});
        if(listed.error)throw new Error('Check Shared Invitations before retrying. We couldn’t confirm the invitation status.');
        const existing=(listed.data||[]).find(item=>item.id===result.data);
        if(existing&&['declined','cancelled'].includes(existing.status)){
          // Persist before sending so an uncertain retry uses this same new request.
          request.id=crypto.randomUUID();localStorage.setItem(request.key,request.id);
          result=await c.sb.rpc('send_checked_moment_invitation',{...body,p_client_request_id:request.id});
        }
      }
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
  function requestCancellation(c,item,card,onSaved){
    const dialog=node('dialog'),heading=node('h2','Cancel this invitation?');
    dialog.style.cssText='max-width:540px;width:calc(100% - 32px);max-height:85vh;overflow:auto;padding:24px;border:2px solid #c99457;border-radius:18px;background:#fffdf9;color:#2d241f';
    heading.tabIndex=-1;dialog.setAttribute('aria-label','Cancel this invitation?');
    dialog.append(heading,node('p','Plans can change. You don’t need to give a reason.'));
    const editor=node('div'),label=node('label','Message for your partner (optional)'),note=node('textarea');
    note.maxLength=400;note.setAttribute('aria-label','Cancellation message (optional)');note.placeholder='Add a few words if you’d like.';label.append(note);editor.append(label);
    editor.append(node('p','Your cancellation and message will appear in Our Invitations. No email or text message is sent.','helper'));
    const review=node('div');review.hidden=true;
    const message=node('div','','quote');review.append(node('p','This invitation will close for both of you.'),message,node('p','Handle restaurant, hotel, ticket or other reservations separately and keep their cancellation confirmations.','helper'));
    const feedback=node('p','','notice');feedback.setAttribute('role','status');
    let busy=false,submitted='';
    action(editor,'Review Cancellation',()=>{submitted=note.value.trim();message.textContent=submitted||'No message added.';editor.hidden=true;review.hidden=false;confirmButton.textContent=submitted?'Cancel Invitation & Share Message':'Confirm Cancellation';confirmButton.focus();});
    const confirmButton=action(review,'Confirm Cancellation',async()=>{
      if(busy)return;busy=true;note.disabled=true;
      dialog.querySelectorAll('button').forEach(b=>b.disabled=true);feedback.textContent='Saving the cancellation…';
      const saved=await updateInvitation(c,item,'cancelled',submitted,card);
      if(saved){onSaved?.();dialog.close();return;}
      feedback.textContent=el('sharedInvitationStatus').textContent;
      busy=false;note.disabled=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);
    });confirmButton.className='primary';
    action(review,'Back — Edit Message',()=>{review.hidden=true;editor.hidden=false;note.focus();});
    const leave=()=>{if(busy)return;if(note.value.trim()&&!confirm('Leave without sharing this cancellation message?'))return;dialog.close();};
    dialog.append(editor,review,feedback);action(dialog,'Keep This Invitation',leave);
    const warn=event=>{if(note.value.trim()||busy){event.preventDefault();event.returnValue='';}};
    dialog.addEventListener('cancel',event=>{event.preventDefault();leave();});
    const accountChanged=()=>dialog.close();
    window.addEventListener('heartstone:invitation-account',accountChanged);
    dialog.addEventListener('close',()=>{window.removeEventListener('beforeunload',warn);window.removeEventListener('heartstone:invitation-account',accountChanged);dialog.remove();});
    window.addEventListener('beforeunload',warn);
    document.body.append(dialog);dialog.showModal();heading.focus();
  }
  async function updateInvitation(c,item,response,note,card){
    const buttons=[...card.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
    el('sharedInvitationStatus').textContent='Saving your response…';
    try{
      const current=await context();
      if(current.user.id!==c.user.id||current.hs!==c.hs)throw new Error('Your account changed. Refresh invitations before responding.');
      const result=await current.sb.rpc(response==='cancelled'?'cancel_moment_invitation_revision':'respond_moment_invitation_revision',response==='cancelled'?{p_invitation_id:item.id,p_expected_user:c.user.id,p_expected_revision:item.revision||0,p_note:note||''}:{p_invitation_id:item.id,p_expected_revision:item.revision||0,p_response:response,p_note:note||''});
      if(result.error||(response==='cancelled'&&result.data!=='cancelled'))throw new Error('We couldn’t save this response. It may already have been answered or closed. Refresh invitations before trying again.');
      const verified=await current.sb.auth.getUser();
      if(verified.error||verified.data?.user?.id!==c.user.id)throw Error('Your account changed. Refresh invitations before continuing.');
      await refreshInbox();return true;
    }catch(e){el('sharedInvitationStatus').textContent=e.message;buttons.forEach(b=>b.disabled=false);return false;}
  }
  async function scheduleEditor(c,item,container,onPlan){
    const box=node('section'),title=node('h3','Choose Our Time and Place'),status=node('p','Loading your shared details…','notice');
    status.setAttribute('role','status');box.append(title,status);container.append(box);
    let state,busy=false,fields={},baseline='';
    const snapshot=()=>JSON.stringify(Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value])));
    const dirty=()=>!!baseline&&snapshot()!==baseline;
    container.scheduleHasEdits=dirty;
    container.scheduleIsSaving=()=>busy;
    const setBusy=value=>{busy=value;box.querySelectorAll('button').forEach(b=>b.disabled=value);box.querySelectorAll('input').forEach(input=>input.disabled=value);};
    async function call(action,details){
      const fresh=await context();
      if(fresh.user.id!==c.user.id||fresh.hs!==c.hs)throw Error('Your account changed. Refresh invitations.');
      const result=await fresh.sb.rpc('shared_moment_schedule',{p_invitation_id:item.id,p_expected_user:c.user.id,p_action:action,p_version:state?.version??null,p_details:details||null});
      const checked=await fresh.sb.auth.getUser();
      if(checked.error||checked.data?.user?.id!==c.user.id||!box.isConnected)throw Error('Your account changed. Refresh invitations.');
      if(result.error)throw Error(result.error.message||'Could not save details. Refresh before trying again.');
      return result.data;
    }
    async function load(){
      if(busy)return;
      if(dirty()&&!confirm('Refresh shared details and discard your unsent suggestion? Choose Cancel to keep editing.'))return;
      setBusy(true);
      status.textContent='Loading your shared details…';
      try{
        const next=await readWithTimeout(()=>call('load'));
        if(!box.isConnected)return;
        state=next;render();onPlan(state.plan,state.proposal?.status==='pending',state.revision);
      }catch(e){
        if(!box.isConnected)return;
        status.textContent=e.message;
        if(!state){
          box.replaceChildren(title,status);
          action(box,'Try Again — Load Shared Details',load);
          onPlan(item.plan,true);
        }
      }finally{setBusy(false);}
    }
    async function save(action,details){
      if(busy)return;
      if(action!=='propose'&&dirty()&&!confirm('Continue and discard your unsent suggestion? Choose Cancel to keep editing.'))return;
      setBusy(true);
      try{state=await call(action,details);render();onPlan(state.plan,state.proposal?.status==='pending',state.revision);}
      catch(e){status.textContent=e.message;}
      finally{setBusy(false);}
    }
    function render(){
      box.replaceChildren(title,status);
      const p=state.proposal||{},pending=p.status==='pending';
      status.textContent=pending?(p.proposed_by===c.user.id?'Your suggestion is waiting for your partner’s confirmation.':'Your partner suggested these details. Confirm them or suggest a change.'):p.status==='confirmed'?'You both agreed on these details.':'Suggest a time and place for your partner to review.';
      if(p.status)box.append(node('div',[readableSchedule(p.date,p.time,p.zone),p.place,p.duration].filter(Boolean).join(' · '),'quote'));
      if(pending&&p.proposed_by!==c.user.id)action(box,'Confirm Our Time and Place ❤️',()=>{if(confirm('Confirm these details with your partner?'))save('confirm');}).className='primary';
      if(pending)action(box,p.proposed_by===c.user.id?'Withdraw My Suggestion':'Keep Deciding — Clear This Suggestion',()=>{if(confirm('Clear this proposed schedule? Your invitation stays accepted.'))save('withdraw');});
      const form=node('form');fields={};
      for(const [key,label,type,max] of [['date','Day','date'],['time','Time','time'],['zone','Time zone (for example, America/New_York)','text',100],['place','Where we’ll meet','text',240],['duration','Time together (optional)','text',120]]){
        const wrap=node('label',label),input=node('input');input.type=type;input.required=key!=='duration';if(max)input.maxLength=max;
        input.value=p[key]||({date:state.plan?.momentDate,time:state.plan?.momentTime,zone:state.plan?.momentZone||Intl.DateTimeFormat().resolvedOptions().timeZone,place:state.plan?.meetPlace,duration:state.plan?.length}[key]||'');
        wrap.append(input);form.append(wrap);fields[key]=input;
      }
      baseline=snapshot();
      const submit=node('button',pending?'Suggest Different Details':'Propose Our Time and Place');submit.type='submit';form.append(submit);
      form.append(node('p','These details are shared inside Heart Stone. Your partner must confirm each new proposal. No email or text message is sent.','helper'));
      form.onsubmit=e=>{e.preventDefault();if(confirm('Share these proposed details with your partner?'))save('propose',Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value.trim()])));};
      const toggle=action(box,p.status==='confirmed'?'Suggest a Change':'Add My Suggestion',()=>{form.hidden=!form.hidden;toggle.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)fields.date.focus();});toggle.setAttribute('aria-expanded','false');form.hidden=true;box.append(form);
      action(box,'Refresh Shared Details',load);
    }
    await load();
  }
  async function openMoment(c,item,card){
    const version=++momentVersion;
    el('sharedInvitationStatus').textContent='Opening your moment…';
    try{
      const current=await readWithTimeout(()=>context());
      if(current.user.id!==c.user.id||current.hs!==c.hs)throw Error('Your account changed. Refresh invitations to continue.');
      const result=await readWithTimeout(()=>current.sb.rpc('list_moment_invitations',{p_heart_stone_id:c.hs}));
      const verify=await readWithTimeout(()=>current.sb.auth.getUser());
      if(version!==momentVersion)return;
      if(result.error||verify.error||verify.data?.user?.id!==c.user.id)throw Error('We couldn’t open this moment. Refresh invitations and try again.');
      const latest=(result.data||[]).find(x=>x.id===item.id);
      if(!latest||latest.status!=='accepted'||(latest.revision||0)!==(item.revision||0))throw Error('This invitation changed. Refresh invitations before opening it.');
      let memory='';
      if(latest.completed_at){
        const saved=await readWithTimeout(()=>current.sb.rpc('my_shared_moment_memory',{p_invitation_id:latest.id,p_expected_user:c.user.id}));
        const checked=await readWithTimeout(()=>current.sb.auth.getUser());
        if(version!==momentVersion)return;
        if(saved.error||checked.error||checked.data?.user?.id!==c.user.id)throw Error('We couldn’t load your private memory. Refresh and try again.');
        memory=saved.data||'';
      }
      if(momentDialog)momentDialog.close();
      const dialog=node('dialog',undefined,'momentCinema');momentDialog=dialog;
      dialog.setAttribute('aria-label','Our moment together');
      let memoryNote=null,savedMemory=memory,memorySaving=false;
      const hasUnsavedMemory=()=>memoryNote!==null&&memoryNote.value!==savedMemory;
      function requestMomentClose(){
        if(memorySaving||scheduleBox.scheduleIsSaving?.()){progress.textContent='Your changes are still loading or saving. Please wait a moment.';return;}
        if(hasUnsavedMemory()&&!confirm('Leave without saving your memory changes? Choose Cancel to keep editing.'))return;
        if(scheduleBox.scheduleHasEdits?.()&&!confirm('Leave without sharing your time-and-place suggestion? Choose Cancel to keep editing.'))return;
        dialog.close();
      }
      function warnBeforeLeaving(event){
        if(!hasUnsavedMemory()&&!memorySaving&&!scheduleBox.scheduleHasEdits?.()&&!scheduleBox.scheduleIsSaving?.())return;
        event.preventDefault();event.returnValue='';
      }
      window.addEventListener('beforeunload',warnBeforeLeaving);
      dialog.addEventListener('cancel',event=>{event.preventDefault();requestMomentClose();});

      const intro=node('div'),scene=node('div');intro.hidden=!!(latest.started_at||latest.completed_at);scene.hidden=!(latest.started_at||latest.completed_at);
      intro.append(node('div','A new chapter','eyebrow'),node('div','♡','cinemaHeart'));
      const heading=node('h2','We said yes.');heading.setAttribute('tabindex','-1');intro.append(heading);
      intro.append(node('p','A little time chosen for each other. A memory waiting to happen.','cinemaLead'));
      const introPlan=node('div',planText(latest.plan),'quote');intro.append(node('div',latest.message,'quote'),introPlan);
      const scheduleBox=node('div');intro.append(scheduleBox);
      const sceneHeading=node('h2',latest.completed_at?'A little time, now part of your story':latest.started_at?'Our moment is underway':'Our moment begins');sceneHeading.setAttribute('tabindex','-1');
      const scenePlan=node('div',planText(latest.plan),'quote');scene.append(node('div','Make room for us','eyebrow'),sceneHeading,node('h3',latest.title,'cinemaTitle'),node('p',latest.story,'cinemaLead'),scenePlan);
      scene.append(node('p','Follow the moment. Make it yours. Put the phones aside when you can.','cinemaClosing'));
      action(intro,'Step Into Our Moment ❤️',()=>{intro.hidden=true;scene.hidden=false;sceneHeading.focus();dialog.scrollTop=0;}).className='primary';
      const progress=node('p',latest.started_at?'Your shared moment is underway. You can return here whenever you need the details.':'When you are ready together, begin your shared moment. Both of you will see it as underway.','notice');progress.setAttribute('role','status');scene.append(progress);
      let starting=false,finishing=false,finish;
      const begin=action(scene,'Begin Our Moment Together ❤️',async()=>{
        if(starting)return;
        if(!confirm('Begin this shared moment? Both of you will see it as underway.'))return;
        starting=true;begin.disabled=true;progress.textContent='Beginning your shared moment…';
        try{
          const fresh=await context();
          if(fresh.user.id!==c.user.id||fresh.hs!==c.hs)throw Error('Your account changed. Refresh invitations to continue.');
          const begun=await fresh.sb.rpc('begin_shared_moment',{p_invitation_id:latest.id,p_expected_user:c.user.id,p_expected_revision:latest.revision||0});
          const checked=await fresh.sb.auth.getUser();
          if(begun.error||!begun.data||checked.error||checked.data?.user?.id!==c.user.id)throw Error('We couldn’t confirm the start. Refresh invitations to check before trying again.');
          latest.started_at=begun.data;begin.hidden=true;if(finish)finish.hidden=false;sceneHeading.textContent='Our moment is underway';progress.textContent='Your shared moment is underway. You can return here whenever you need the details.';
          await refreshInbox();
        }catch(e){progress.textContent=e.message;}finally{starting=false;begin.disabled=false;}
      });begin.className='primary';begin.hidden=!!(latest.started_at||latest.completed_at);
      if(!latest.completed_at){
        finish=action(scene,'Our Moment Has Come to a Close ❤️',async()=>{
          if(finishing||!confirm('Close this shared moment for both of you? You can each add a private memory afterward.'))return;
          finishing=true;finish.disabled=true;progress.textContent='Closing your shared moment…';
          try{
            const fresh=await context();
            if(fresh.user.id!==c.user.id||fresh.hs!==c.hs)throw Error('Your account changed. Refresh invitations to continue.');
            const done=await fresh.sb.rpc('finish_shared_moment',{p_invitation_id:latest.id,p_expected_user:c.user.id,p_expected_revision:latest.revision||0});
            const checked=await fresh.sb.auth.getUser();
            if(version!==momentVersion)return;
            if(done.error||!done.data||checked.error||checked.data?.user?.id!==c.user.id)throw Error('We couldn’t confirm the close. Refresh invitations to check before trying again.');
            if(!dialog.open)return;dialog.close();await refreshInbox();await openMoment(c,latest,card);
          }catch(e){progress.textContent=e.message;}finally{finishing=false;finish.disabled=false;}
        });finish.className='primary';finish.hidden=!latest.started_at;
      }
      if(latest.completed_at){
        progress.textContent='Your shared moment has come to a close. Keep a little of it in your own words, whenever you are ready.';
        const label=node('label','What would you like to remember? (optional)'),note=node('textarea');
        memoryNote=note;
        note.addEventListener('input',()=>{progress.textContent=hasUnsavedMemory()?'Unsaved changes. Save your private memory when you are ready.':'Your saved memory is unchanged.';});
        note.maxLength=4000;note.value=memory;note.placeholder='A laugh, a discovery, a small detail…';label.append(note);scene.append(label);
        scene.append(node('p','Only you can read these words. Your partner can save their own perspective.','helper'));
        let saving=false;
        const save=action(scene,'Save My Private Memory ❤️',async()=>{
          if(saving)return;const submittedNote=note.value;saving=true;memorySaving=true;note.disabled=true;save.disabled=true;progress.textContent='Saving your private memory…';
          try{
            const fresh=await context();
            if(fresh.user.id!==c.user.id||fresh.hs!==c.hs)throw Error('Your account changed. Refresh invitations to continue.');
            const result=await fresh.sb.rpc('my_shared_moment_memory',{p_invitation_id:latest.id,p_expected_user:c.user.id,p_note:submittedNote});
            const checked=await fresh.sb.auth.getUser();
            if(version!==momentVersion)return;
            if(result.error||checked.error||checked.data?.user?.id!==c.user.id)throw Error('We couldn’t confirm the save. Your words are still here; try again or reopen to check.');
            savedMemory=submittedNote;
            progress.textContent='Your memory is saved privately. You can return here to read or edit it.';
          }catch(e){progress.textContent=e.message;}finally{saving=false;memorySaving=false;note.disabled=false;save.disabled=false;}
        });save.className='primary';
      }
      if(!latest.completed_at)action(scene,'Back — Our Invitation',()=>{scene.hidden=true;intro.hidden=false;heading.focus();dialog.scrollTop=0;});
      const navigation=node('nav',undefined,'moment-navigation');
      navigation.setAttribute('aria-label','Moment navigation');
      action(navigation,memoriesOnly?'← Our Memories':'← Invitations',requestMomentClose);
      dialog.append(navigation,intro,scene);
      const exits=node('div',undefined,'actions');
      action(exits,memoriesOnly?'Back — Our Memories':'Back — Invitations',requestMomentClose);
      if(!latest.completed_at)action(exits,'Cancel This Invitation',()=>requestCancellation(c,latest,card,()=>dialog.close()));
      dialog.append(exits,node('p','You can leave this view at any time. Save any memory edits before leaving.','helper'));
      dialog.addEventListener('close',()=>{window.removeEventListener('beforeunload',warnBeforeLeaving);dialog.remove();if(momentDialog===dialog)momentDialog=null;if(card.isConnected)card.querySelector('button')?.focus({preventScroll:true});});
      document.body.append(dialog);dialog.showModal();(latest.started_at||latest.completed_at?sceneHeading:heading).focus({preventScroll:true});dialog.scrollTop=0;
      if(!latest.started_at&&!latest.completed_at){begin.disabled=true;scheduleEditor(c,latest,scheduleBox,(plan,pending,revision)=>{latest.plan=plan;if(Number.isInteger(revision))latest.revision=revision;introPlan.textContent=scenePlan.textContent=planText(plan);begin.disabled=pending;progress.textContent=pending?'Agree on your proposed time and place before beginning.':'When you are ready together, begin your shared moment. Both of you will see it as underway.';});}
      el('sharedInvitationStatus').textContent=latest.completed_at?'Your private memory is ready.':'Your accepted moment is ready to open.';
    }catch(e){if(version===momentVersion)el('sharedInvitationStatus').textContent=e.message;}
  }
  function revisedTimeForm(c,item,card){
    const panel=node('div');panel.hidden=true;
    const open=action(card,'Propose a New Time',()=>{panel.hidden=false;open.setAttribute('aria-expanded','true');day.focus();});
    open.className='primary';open.setAttribute('aria-expanded','false');
    panel.append(node('p','Choose a new time for this same moment. Your partner will need to accept it.','helper'));
    const field=(label,type,value)=>{const wrap=node('label',label),input=node('input');input.type=type;input.value=value||'';wrap.append(input);panel.append(wrap);return input;};
    const day=field('Our new day','date',''),time=field('Our new time','time',''),zone=field('Time zone','text',item.plan?.momentZone||Intl.DateTimeFormat().resolvedOptions().timeZone);
    const feedback=node('p','','notice');feedback.setAttribute('role','status');panel.append(feedback);
    let busy=false;const requestId=crypto.randomUUID();
    action(panel,'Send Revised Invitation ❤️',async()=>{
      if(busy)return;
      if(!day.value||!time.value||!zone.value.trim()){feedback.textContent='Choose a day, time, and time zone first.';return;}
      try{new Intl.DateTimeFormat('en',{timeZone:zone.value.trim()});}catch{feedback.textContent='Enter a valid time zone, such as America/New_York.';return;}
      const proposal={p_invitation_id:item.id,p_expected_sender:c.user.id,p_expected_revision:item.revision||0,p_request_id:requestId,p_date:day.value,p_time:time.value,p_zone:zone.value.trim()};
      if(!confirm('Send this revised time: '+readableSchedule(day.value,time.value,proposal.p_zone)+'? Your partner must accept before it is confirmed.'))return;
      busy=true;const controls=[...card.querySelectorAll('button'),day,time,zone];controls.forEach(b=>b.disabled=true);feedback.textContent='Sending the revised time…';
      try{
        const current=await context();
        if(current.user.id!==c.user.id||current.hs!==c.hs)throw Error('Your account changed. Refresh invitations before continuing.');
        const result=await current.sb.rpc('propose_moment_invitation_time',proposal);
        if(result.error)throw Error('We couldn’t confirm the revised time. Choose a future day and time, or refresh invitations to check whether it was sent.');
        await refreshInbox();
      }catch(e){feedback.textContent=e.message;}finally{busy=false;controls.forEach(b=>b.disabled=false);}
    }).className='primary';
    action(panel,'Back — Keep Deciding',()=>{panel.hidden=true;open.setAttribute('aria-expanded','false');open.focus();});
    card.append(panel);
  }
  async function refreshInbox(){
    if(inboxBusy)return;collectionLabels();const memoryView=memoriesOnly;inboxBusy=true;el('refreshSharedInvitations').disabled=true;
    el('sharedInvitationList').replaceChildren();
    el('sharedInvitationStatus').textContent=memoryView?'Opening your memories…':'Checking shared invitations…';
    try{
      const c=await readWithTimeout(()=>context());
      const result=await readWithTimeout(()=>c.sb.rpc('list_moment_invitations',{p_heart_stone_id:c.hs}));
      if(result.error)throw new Error('We couldn’t load your shared invitations. Please try again.');
      const verify=await readWithTimeout(()=>c.sb.auth.getUser());
      if(verify.error||verify.data?.user?.id!==c.user.id)throw new Error('Your account changed. Refresh invitations to continue.');
      const allItems=Array.isArray(result.data)?result.data:[];
      const items=memoryView?completedMoments(allItems,c.user.id):allItems;
      el('sharedInvitationAccount').textContent='Signed in as '+(c.user.email||'your verified account');
      let calendarTarget=null;
      for(const item of items){
        const incoming=item.recipient_id===c.user.id;
        const other=c.partners.find(x=>x.id===(incoming?item.sender_id:item.recipient_id));
        const card=node('article',undefined,'card invitationLetter'+(item.status==='accepted'?' acceptedLetter':''));card.style.marginTop='16px';
        if(calendarMoment===String(item.id))calendarTarget={item,card};
        const identity=node('div',undefined,'person');person(identity,other?.name||'your connected partner',other?.picture,incoming?'From ':'To ');card.append(identity);
        if(memoryView){
          card.append(node('h2',item.title));
          const closed=new Date(item.completed_at);
          if(Number.isFinite(closed.getTime()))card.append(node('p','Remembered '+closed.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}),'helper'));
          action(card,'Revisit Our Moment ❤️',()=>openMoment(c,item,card)).className='primary';
          el('sharedInvitationList').append(card);
          continue;
        }
        if(item.status==='accepted'){
          card.append(node('h3',item.completed_at?'A moment for your story. ❤️':item.started_at?'Our moment is underway. ❤️':(incoming?'It’s a date. ❤️':(other?.name ? other.name+' said yes. ❤️' : 'Your partner said yes. ❤️')),'letterOutcome'));
          card.append(node('p',item.completed_at?'Your time together has come to a close. Your own words can keep a little of it.':item.started_at?'Come back to the moment you have begun together.':'You have a little time together to look forward to.','letterAnticipation'));
        }
        card.append(node('h2',item.status==='accepted'&&incoming&&!item.started_at?'A moment waiting for us':item.title));
        card.append(node('p',item.completed_at?'This shared moment has come to a close.':item.status==='accepted'&&item.started_at?'Your shared moment is underway.':item.status==='pending'&&item.revision>0?'Revised time proposed. Waiting for a reply.':(statuses[item.status]||item.status),'notice'));
        const details=node('details'),summary=node('summary','View invitation details');
        details.append(summary,node('div',item.message,'quote'),node('div',planText(item.plan),'quote'));
        card.append(details);
        if(item.status==='accepted'){
          if(!item.started_at&&!item.completed_at)action(card,'Choose Our Time and Place',()=>openMoment(c,item,card));
          action(card,item.completed_at?'Revisit Our Moment ❤️':item.started_at?'Return to Our Moment ❤️':'Reveal Our Moment ❤️',()=>openMoment(c,item,card)).className='primary';
          if(!item.completed_at)card.append(node('p','Saying yes to time together leaves room to change your mind or stop.','helper'));
        }else{card.append(node('p',item.story));}
        if(item.response_note)card.append(node('div','Suggested time: '+item.response_note,'quote'));
        if(item.status==='cancelled'&&item.cancellation_note)card.append(node('div','Cancellation message: '+item.cancellation_note,'quote'));
        if(!incoming&&item.status==='reschedule')revisedTimeForm(c,item,card);
        if(incoming&&item.status==='pending'){
          action(card,'I’d love to ❤️',()=>{if(confirm('Accept this invitation? Your partner will see your response.'))updateInvitation(c,item,'accepted','',card);});
          const reschedule=node('div');reschedule.hidden=true;
          const rescheduleButton=action(card,'Could we find another time?',()=>{reschedule.hidden=!reschedule.hidden;rescheduleButton.setAttribute('aria-expanded',String(!reschedule.hidden));});
          rescheduleButton.setAttribute('aria-expanded','false');
          const note=node('textarea');note.maxLength=400;note.setAttribute('aria-label','When would work better for you? (optional)');note.placeholder='When would work better for you? (optional)';reschedule.append(note);
          action(reschedule,'Send My Reply',()=>{if(confirm('Ask for another time? The original time will remain unconfirmed.'))updateInvitation(c,item,'reschedule',note.value.trim(),card);});
          action(reschedule,'Back — Keep Deciding',()=>{reschedule.hidden=true;rescheduleButton.setAttribute('aria-expanded','false');rescheduleButton.focus();});card.append(reschedule);
          action(card,'Thank you for asking. I’ll pass this time.',()=>{if(confirm('Decline this invitation? Your partner will see that it is closed.'))updateInvitation(c,item,'declined','',card);});
        }
        if(!item.completed_at&&['pending','accepted','reschedule'].includes(item.status))action(card,'Cancel This Invitation',()=>requestCancellation(c,item,card));
        el('sharedInvitationList').append(card);
      }
      el('sharedInvitationStatus').textContent=memoryView?(items.length?items.length+' completed moment'+(items.length===1?'':'s')+'. Your written memories stay private.':'Your story has room to grow. Completed moments will appear here.') : items.length?items.length+' invitation'+(items.length===1?'':'s')+' in your collection. Tap Refresh Invitations to check for replies.':'There isn’t an invitation waiting right now.';
      if(calendarMoment){
        const target=calendarTarget;
        calendarMoment=null;
        const url=new URL(window.location.href);url.searchParams.delete('moment');history.replaceState(null,'',url.pathname+url.search+url.hash);
        if(target&&target.item.status==='accepted')await openMoment(c,target.item,target.card);
        else el('sharedInvitationStatus').textContent='This calendar moment is no longer available to open. Review your invitations below for its current status.';
      }
    }catch(e){el('sharedInvitationAccount').textContent='';el('sharedInvitationStatus').textContent=e.message;}
    finally{inboxBusy=false;el('refreshSharedInvitations').disabled=false;if(memoryView!==memoriesOnly)refreshInbox();}
  }
  el('openSharedInvitations').onclick=()=>{memoriesOnly=false;screen('sharedInbox');refreshInbox();};
  el('refreshSharedInvitations').onclick=refreshInbox;
  el('backFromSharedInvitations').onclick=()=>{if(memoriesOnly)window.location.href='index.html#date-quest';else screen('feelings');};
  window.addEventListener('hashchange',()=>{if(['#our-memories','#shared-invitations'].includes(window.location.hash)){memoriesOnly=window.location.hash==='#our-memories';screen('sharedInbox');refreshInbox();}});
  if(['#shared-invitations','#our-memories'].includes(window.location?.hash)){
    screen('sharedInbox');refreshInbox();
  }
})();

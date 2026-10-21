const fs=require('fs'),vm=require('vm'),assert=require('assert'),{webcrypto}=require('crypto');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.textContent='';this.style={};this.disabled=false;this.hidden=false;this.open=false;this.listeners={};this.dataset={};}
 append(...nodes){this.children.push(...nodes);} appendChild(n){this.children.push(n);return n;} add(n){this.children.push(n);}
 replaceChildren(...nodes){this.children=[...nodes];} setAttribute(k,v){this[k]=v;} addEventListener(k,f){this.listeners[k]=f;}
 showModal(){this.open=true;} close(){this.open=false;} remove(){} focus(){this.focused=true;}
 querySelectorAll(tag){return this.children.flatMap(n=>[...(n.tagName===tag?[n]:[]),...n.querySelectorAll(tag)]);}
}
function setup(){
 const ids=['pictureEditor','myPicturePreview','recipientPicture','avatarChoices','loadMyPicture','pictureStatus','cancelMyPicture','profilePhoto','saveMyPicture','sharedInvitationList','sharedInvitationStatus','accountConnectionStatus','sendInvitationDialog','checkAccount','message','experienceTitle','experienceStory','revealMode','experienceHint','prepareLiveSend','liveSendStatus','liveSender','liveRecipient','liveSendSummary','confirmLiveSend','sendDialogStatus','keepInvitationDraft','previewBanner','refreshSharedInvitations','sharedInvitationAccount','openSharedInvitations','backFromSharedInvitations'];
 const els=Object.fromEntries(ids.map(x=>[x,new Element()]));
 Object.assign(els.message,{value:'I miss you.'});els.experienceTitle.value='Our hideaway';els.experienceStory.value='A quiet moment';els.revealMode.value='surprise';
 const state={user:{id:'sender',email:'sender@example.test'},hs:'hs',partners:[{id:'partner-123456',name:'Partner'}],items:[],calls:[],failSend:false};
 const sb={auth:{getUser:async()=>({data:{user:state.user}}),onAuthStateChange:f=>{state.authListener=f;}},from:()=>({select(){return this},eq(){return this},limit:async()=>({data:[{heart_stone_id:state.hs}]})}),rpc:async(name,args)=>{state.calls.push({name,args});if(name==='finish_shared_moment'){if(state.failFinish)return {error:{message:'network'}};state.items.find(x=>x.id===args.p_invitation_id).completed_at='2026-10-21T13:00:00Z';return {data:'2026-10-21T13:00:00Z'};}if(name==='my_shared_moment_memory'){if(state.failMemory)return {error:{message:'network'}};if(args.p_note!==undefined)state.memory=args.p_note;return {data:state.memory||''};}if(name==='begin_shared_moment'){if(state.failStart)return {error:{message:'network'}};state.items.find(x=>x.id===args.p_invitation_id).started_at='2026-10-21T12:00:00Z';return {data:'2026-10-21T12:00:00Z'};}if(name==='my_moment_profile_picture')return {data:args.p_picture||'sun'};if(name==='get_moment_invitation_partners')return {data:state.partners};if(name==='list_moment_invitations')return {data:state.items};if(name==='send_checked_moment_invitation'&&state.failSend)return {error:{message:'network'}};return {data:'invitation-id'};}};
 const storage=new Map();const document={body:new Element('body'),getElementById:id=>{assert(els[id],id);return els[id]},createTextNode:text=>Object.assign(new Element('text'),{textContent:text}),createElement:tag=>new Element(tag),head:{appendChild:s=>s.onload()}};
 const ctx=vm.createContext({document,window:{supabase:{createClient:()=>sb}},Option:function(t,v){const e=new Element('option');e.textContent=t;e.value=v;return e;},TextEncoder,crypto:webcrypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},confirm:()=>true,planDraft:()=>({whenMode:'together',length:'About 2 hours',meetMode:'home'}),kind:'date',screen:id=>{state.screen=id;}});
 vm.runInContext(fs.readFileSync('moment-invitations.js','utf8'),ctx);
 return {els,state,body:document.body};
}
const texts=e=>[e.textContent,...e.children.map(texts)].join('\n');
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 let {els,state}=setup();
 await els.loadMyPicture.onclick();assert(!els.pictureEditor.hidden);await els.saveMyPicture.onclick();assert(els.pictureStatus.textContent.includes('saved'));await els.loadMyPicture.onclick();els.cancelMyPicture.onclick();assert(els.pictureEditor.hidden);
 ({els,state}=setup());await els.loadMyPicture.onclick();state.user={id:'other'};await els.saveMyPicture.onclick();assert(els.pictureStatus.textContent.includes('changed'));
 ({els,state}=setup());
 await els.prepareLiveSend.onclick();assert(els.sendInvitationDialog.open);assert(els.confirmLiveSend.disabled);assert(!state.calls.some(x=>x.name.startsWith('send_')));
 els.keepInvitationDraft.onclick();assert(!els.sendInvitationDialog.open);assert(!state.calls.some(x=>x.name.startsWith('send_')));
 await els.prepareLiveSend.onclick();els.liveRecipient.value=state.partners[0].id;els.liveRecipient.onchange();assert(!els.confirmLiveSend.disabled);
 await els.confirmLiveSend.onclick();let sends=state.calls.filter(x=>x.name==='send_checked_moment_invitation');assert.equal(sends.length,1);assert.equal(sends[0].args.p_expected_sender_id,'sender');assert.equal(sends[0].args.p_recipient_id,'partner-123456');assert(els.liveSendStatus.textContent.includes('Invitation sent'));assert(!els.sendInvitationDialog.open);
 await els.prepareLiveSend.onclick();els.liveRecipient.value='partner-123456';await els.confirmLiveSend.onclick();sends=state.calls.filter(x=>x.name==='send_checked_moment_invitation');assert.equal(sends[0].args.p_client_request_id,sends[1].args.p_client_request_id);
 console.log('PASS: review and cancel never send; explicit send uses selected recipient and expected account; retries reuse idempotency key.');
 ({els,state}=setup());await els.prepareLiveSend.onclick();els.liveRecipient.value='partner-123456';state.user={id:'different',email:'other@example.test'};await els.confirmLiveSend.onclick();assert(!state.calls.some(x=>x.name.startsWith('send_')));assert(els.sendDialogStatus.textContent.includes('changed'));
 ({els,state}=setup());state.user=null;await els.prepareLiveSend.onclick();assert(!els.sendInvitationDialog.open);assert(els.liveSendStatus.textContent.includes('sign in'));
 console.log('PASS: changed account and signed-out state prevent sending.');
 ({els,state}=setup());state.failSend=true;await els.prepareLiveSend.onclick();els.liveRecipient.value='partner-123456';await els.confirmLiveSend.onclick();assert(els.sendInvitationDialog.open);assert(els.sendDialogStatus.textContent.includes('couldn’t confirm'));assert(!els.liveSendStatus.textContent.includes('Invitation sent'));
 console.log('PASS: failed/uncertain sends do not claim success.');
 for(const closed of ['declined','cancelled']){
   ({els,state}=setup());
   await els.prepareLiveSend.onclick();els.liveRecipient.value='partner-123456';await els.confirmLiveSend.onclick();
   const original=state.calls.find(x=>x.name==='send_checked_moment_invitation').args.p_client_request_id;
   state.items=[{id:'invitation-id',status:closed}];
   await els.prepareLiveSend.onclick();els.liveRecipient.value='partner-123456';await els.confirmLiveSend.onclick();
   let calls=state.calls.filter(x=>x.name==='send_checked_moment_invitation');
   assert.equal(calls.length,3);assert.equal(calls[1].args.p_client_request_id,original);assert.notEqual(calls[2].args.p_client_request_id,original);
   const fresh=calls[2].args.p_client_request_id;
   state.failSend=true;await els.prepareLiveSend.onclick();els.liveRecipient.value='partner-123456';await els.confirmLiveSend.onclick();
   calls=state.calls.filter(x=>x.name==='send_checked_moment_invitation');assert.equal(calls.at(-1).args.p_client_request_id,fresh);
 }
 console.log('PASS: declined and cancelled invitations get fresh send keys; uncertain retries keep the fresh key.');
 ({els,state}=setup());state.items=[{id:'i',sender_id:'partner-123456',recipient_id:'sender',status:'pending',message:'<img src=x onerror=alert(1)>',title:'A little surprise for us',story:'A little surprise is waiting for us.',plan:{}}];await els.refreshSharedInvitations.onclick();assert(texts(els.sharedInvitationList).includes('I’d love to'));assert(!texts(els.sharedInvitationList).includes('SECRET'));const accept=els.sharedInvitationList.querySelectorAll('button').find(b=>b.textContent==='I’d love to ❤️');accept.onclick();await tick();await tick();assert(state.calls.some(x=>x.name==='respond_moment_invitation_revision'&&x.args.p_response==='accepted'));
 console.log('PASS: recipient inbox renders safe text and acceptance calls the response API.');
 ({els,state}=setup());state.items=[{id:'i',sender_id:'sender',recipient_id:'partner-123456',status:'declined',title:'Our moment',story:'A quiet moment',plan:{}}];await els.refreshSharedInvitations.onclick();assert(texts(els.sharedInvitationList).includes('invitation is closed'));assert.equal(els.sharedInvitationList.querySelectorAll('button').length,0);state.authListener('SIGNED_OUT',null);assert.equal(els.sharedInvitationList.children.length,0);
 console.log('PASS: closed sender invitations have no response controls; sign-out clears shared content.');
 ({els,state}=setup());state.items=[{id:'rev',sender_id:'sender',recipient_id:'partner-123456',status:'reschedule',revision:3,title:'Our moment',story:'Quiet time',response_note:'Saturday',plan:{momentZone:'America/New_York'}}];
 await els.refreshSharedInvitations.onclick();let card=els.sharedInvitationList.children[0];
 const findButton=label=>card.querySelectorAll('button').find(b=>b.textContent===label);
 const propose=findButton('Propose a New Time');assert(propose);propose.onclick();assert.equal(propose['aria-expanded'],'true');
 findButton('Back — Keep Deciding').onclick();assert.equal(propose['aria-expanded'],'false');assert(!state.calls.some(x=>x.name==='propose_moment_invitation_time'));
 propose.onclick();const submit=findButton('Send Revised Invitation ❤️');await submit.onclick();assert(!state.calls.some(x=>x.name==='propose_moment_invitation_time'));
 let fields=card.querySelectorAll('input');fields[0].value='2026-11-07';fields[1].value='14:00';await submit.onclick();
 const proposal=state.calls.find(x=>x.name==='propose_moment_invitation_time');assert(proposal);assert.equal(proposal.args.p_expected_revision,3);assert.equal(proposal.args.p_expected_sender,'sender');assert.equal(proposal.args.p_date,'2026-11-07');assert.equal(proposal.args.p_zone,'America/New_York');
 ({els,state}=setup());state.items=[{id:'rev',sender_id:'partner-123456',recipient_id:'sender',status:'pending',revision:4,title:'Our moment',story:'Quiet time',plan:{}}];await els.refreshSharedInvitations.onclick();
 card=els.sharedInvitationList.children[0];assert(!card.querySelectorAll('button').some(b=>b.textContent==='Propose a New Time'));assert(texts(card).includes('Revised time proposed'));
 await card.querySelectorAll('button').find(b=>b.textContent==='I’d love to ❤️').onclick();await tick();await tick();
 assert(state.calls.some(x=>x.name==='respond_moment_invitation_revision'&&x.args.p_expected_revision===4));
 console.log('PASS: revised-time form requires fields and explicit send; back never sends; recipients reply to the displayed revision.');
 const cinema=setup();({els,state}=cinema);state.items=[{id:'cinema',sender_id:'partner-123456',recipient_id:'sender',status:'accepted',revision:1,title:'Our walk',story:'A quiet wander together',message:'I miss you.',plan:{}}];
 await els.refreshSharedInvitations.onclick();card=els.sharedInvitationList.children[0];await card.querySelectorAll('button').find(b=>b.textContent==='Reveal Our Moment ❤️').onclick();
 let dialog=cinema.body.children.at(-1);assert(dialog.open);assert(texts(dialog).includes('We said yes.'));assert(texts(dialog).includes('Our walk'));
 dialog.querySelectorAll('button').find(b=>b.textContent==='Step Into Our Moment ❤️').onclick();assert(dialog.children[0].hidden);assert(!dialog.children[1].hidden);
 dialog.querySelectorAll('button').find(b=>b.textContent==='Back — Our Invitation').onclick();assert(!dialog.children[0].hidden);
 dialog.querySelectorAll('button').find(b=>b.textContent==='Back — Invitations').onclick();assert(!dialog.open);assert(!state.calls.some(x=>x.name==='cancel_moment_invitation'||x.name.startsWith('respond_')));
 state.items[0].status='cancelled';await card.querySelectorAll('button').find(b=>b.textContent==='Reveal Our Moment ❤️').onclick();assert(els.sharedInvitationStatus.textContent.includes('changed'));assert.equal(cinema.body.children.length,1);
 console.log('PASS: cinematic reveal checks current acceptance; scene and back do not mutate invitation; stale cancelled invitations cannot open.');
 const active=setup();({els,state}=active);state.items=[{id:'active',sender_id:'partner-123456',recipient_id:'sender',status:'accepted',revision:2,title:'Our walk',story:'A quiet wander',plan:{}}];
 await els.refreshSharedInvitations.onclick();card=els.sharedInvitationList.children[0];await card.querySelectorAll('button').find(b=>b.textContent==='Reveal Our Moment ❤️').onclick();dialog=active.body.children.at(-1);
 dialog.querySelectorAll('button').find(b=>b.textContent==='Step Into Our Moment ❤️').onclick();
 const beginButton=dialog.querySelectorAll('button').find(b=>b.textContent==='Begin Our Moment Together ❤️');
 state.failStart=true;await beginButton.onclick();assert(!beginButton.hidden);assert(texts(dialog).includes('couldn’t confirm'));
 state.failStart=false;await beginButton.onclick();assert(beginButton.hidden);assert(state.calls.some(x=>x.name==='begin_shared_moment'&&x.args.p_expected_revision===2&&x.args.p_expected_user==='sender'));
 card=els.sharedInvitationList.children[0];const resume=card.querySelectorAll('button').find(b=>b.textContent==='Return to Our Moment ❤️');assert(resume);await resume.onclick();dialog=active.body.children.at(-1);assert(dialog.children[0].hidden);assert(!dialog.children[1].hidden);assert(texts(dialog).includes('Our moment is underway'));
 assert(dialog.querySelectorAll('button').find(b=>b.textContent==='Begin Our Moment Together ❤️').hidden);
 console.log('PASS: shared begin requires explicit action, failures remain retryable, and active moments reopen directly without starting again.');
 const closing=setup();({els,state}=closing);state.items=[{id:'closed',sender_id:'sender',recipient_id:'partner-123456',status:'accepted',revision:2,started_at:'2026-10-21T12:00:00Z',title:'Our walk',story:'A quiet wander',plan:{}}];
 await els.refreshSharedInvitations.onclick();card=els.sharedInvitationList.children[0];await card.querySelectorAll('button').find(b=>b.textContent==='Return to Our Moment ❤️').onclick();dialog=closing.body.children.at(-1);
 const finish=dialog.querySelectorAll('button').find(b=>b.textContent==='Our Moment Has Come to a Close ❤️');assert(finish);
 state.failFinish=true;await finish.onclick();assert(texts(dialog).includes('couldn’t confirm'));assert(!finish.disabled);
 state.failFinish=false;await finish.onclick();dialog=closing.body.children.at(-1);assert(texts(dialog).includes('part of your story'));
 assert(!dialog.querySelectorAll('button').some(b=>b.textContent==='Stop This Invitation'));
 let note=dialog.querySelectorAll('textarea')[0];note.value='The tiny garden we found';const save=dialog.querySelectorAll('button').find(b=>b.textContent==='Save My Private Memory ❤️');
 state.failMemory=true;await save.onclick();assert.equal(note.value,'The tiny garden we found');assert(texts(dialog).includes('couldn’t confirm'));
 state.failMemory=false;await save.onclick();assert.equal(state.memory,'The tiny garden we found');assert(texts(dialog).includes('saved privately'));
 await els.refreshSharedInvitations.onclick();card=els.sharedInvitationList.children[0];assert(!card.querySelectorAll('button').some(b=>b.textContent.includes('Cancel')));
 await card.querySelectorAll('button').find(b=>b.textContent==='Revisit Our Moment ❤️').onclick();dialog=closing.body.children.at(-1);assert.equal(dialog.querySelectorAll('textarea')[0].value,state.memory);
 const before=state.calls.filter(x=>x.name==='my_shared_moment_memory'&&x.args.p_note!==undefined).length;state.user={id:'other'};await dialog.querySelectorAll('button').find(b=>b.textContent==='Save My Private Memory ❤️').onclick();assert.equal(state.calls.filter(x=>x.name==='my_shared_moment_memory'&&x.args.p_note!==undefined).length,before);
 console.log('PASS: close failures retry; completed moments reopen; private memory saves and reloads; failed saves preserve words; account changes block writes.');
 const html=fs.readFileSync('invitation-opening.html','utf8');for(const [,s] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s);new vm.Script(fs.readFileSync('moment-invitations.js','utf8'));
 for(const id of ['sharedInbox','prepareLiveSend','sendInvitationDialog','openSharedInvitations'])assert(html.includes('id="'+id+'"'));
 assert(html.includes('function screen(id){$("liveSendStatus").textContent="";'));
 console.log('PASS: navigation clears old send feedback; HTML integration and JavaScript syntax.');
})().catch(e=>{console.error(e);process.exit(1);});

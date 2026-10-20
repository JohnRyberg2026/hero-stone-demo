const fs=require('fs'),vm=require('vm'),assert=require('assert'),{webcrypto}=require('crypto');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.textContent='';this.style={};this.disabled=false;this.hidden=false;this.open=false;this.listeners={};this.dataset={};}
 append(...nodes){this.children.push(...nodes);} appendChild(n){this.children.push(n);return n;} add(n){this.children.push(n);}
 replaceChildren(...nodes){this.children=[...nodes];} setAttribute(k,v){this[k]=v;} addEventListener(k,f){this.listeners[k]=f;}
 showModal(){this.open=true;} close(){this.open=false;} remove(){}
 querySelectorAll(tag){return this.children.flatMap(n=>[...(n.tagName===tag?[n]:[]),...n.querySelectorAll(tag)]);}
}
function setup(){
 const ids=['pictureEditor','myPicturePreview','recipientPicture','avatarChoices','loadMyPicture','pictureStatus','cancelMyPicture','profilePhoto','saveMyPicture','sharedInvitationList','sharedInvitationStatus','accountConnectionStatus','sendInvitationDialog','checkAccount','message','experienceTitle','experienceStory','revealMode','experienceHint','prepareLiveSend','liveSendStatus','liveSender','liveRecipient','liveSendSummary','confirmLiveSend','sendDialogStatus','keepInvitationDraft','previewBanner','refreshSharedInvitations','sharedInvitationAccount','openSharedInvitations','backFromSharedInvitations'];
 const els=Object.fromEntries(ids.map(x=>[x,new Element()]));
 Object.assign(els.message,{value:'I miss you.'});els.experienceTitle.value='Our hideaway';els.experienceStory.value='A quiet moment';els.revealMode.value='surprise';
 const state={user:{id:'sender',email:'sender@example.test'},hs:'hs',partners:[{id:'partner-123456',name:'Partner'}],items:[],calls:[],failSend:false};
 const sb={auth:{getUser:async()=>({data:{user:state.user}}),onAuthStateChange:f=>{state.authListener=f;}},from:()=>({select(){return this},eq(){return this},limit:async()=>({data:[{heart_stone_id:state.hs}]})}),rpc:async(name,args)=>{state.calls.push({name,args});if(name==='my_moment_profile_picture')return {data:args.p_picture||'sun'};if(name==='get_moment_invitation_partners')return {data:state.partners};if(name==='list_moment_invitations')return {data:state.items};if(name==='send_checked_moment_invitation'&&state.failSend)return {error:{message:'network'}};return {data:'invitation-id'};}};
 const storage=new Map();const document={getElementById:id=>{assert(els[id],id);return els[id]},createTextNode:text=>Object.assign(new Element('text'),{textContent:text}),createElement:tag=>new Element(tag),head:{appendChild:s=>s.onload()}};
 const ctx=vm.createContext({document,window:{supabase:{createClient:()=>sb}},Option:function(t,v){const e=new Element('option');e.textContent=t;e.value=v;return e;},TextEncoder,crypto:webcrypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},confirm:()=>true,planDraft:()=>({whenMode:'together',length:'About 2 hours',meetMode:'home'}),kind:'date',screen:id=>{state.screen=id;}});
 vm.runInContext(fs.readFileSync('moment-invitations.js','utf8'),ctx);
 return {els,state};
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
 ({els,state}=setup());state.items=[{id:'i',sender_id:'partner-123456',recipient_id:'sender',status:'pending',message:'<img src=x onerror=alert(1)>',title:'A little surprise for us',story:'A little surprise is waiting for us.',plan:{}}];await els.refreshSharedInvitations.onclick();assert(texts(els.sharedInvitationList).includes('I’d love to'));assert(!texts(els.sharedInvitationList).includes('SECRET'));const accept=els.sharedInvitationList.querySelectorAll('button').find(b=>b.textContent==='I’d love to ❤️');accept.onclick();await tick();await tick();assert(state.calls.some(x=>x.name==='respond_moment_invitation'&&x.args.p_response==='accepted'));
 console.log('PASS: recipient inbox renders safe text and acceptance calls the response API.');
 ({els,state}=setup());state.items=[{id:'i',sender_id:'sender',recipient_id:'partner-123456',status:'declined',title:'Our moment',story:'A quiet moment',plan:{}}];await els.refreshSharedInvitations.onclick();assert(texts(els.sharedInvitationList).includes('invitation is closed'));assert.equal(els.sharedInvitationList.querySelectorAll('button').length,0);state.authListener('SIGNED_OUT',null);assert.equal(els.sharedInvitationList.children.length,0);
 console.log('PASS: closed sender invitations have no response controls; sign-out clears shared content.');
 const html=fs.readFileSync('invitation-opening.html','utf8');for(const [,s] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s);new vm.Script(fs.readFileSync('moment-invitations.js','utf8'));
 for(const id of ['sharedInbox','prepareLiveSend','sendInvitationDialog','openSharedInvitations'])assert(html.includes('id="'+id+'"'));
 console.log('PASS: HTML integration and inline/external JavaScript syntax.');
})().catch(e=>{console.error(e);process.exit(1);});

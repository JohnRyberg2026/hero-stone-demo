const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Execute the preview's actual scripts without Node globals, as a browser does.
const elements=Object.fromEntries(['statusHeading','statusMessage','statusRevision','refresh'].map(id=>[id,{textContent:'',addEventListener(_,fn){this.click=fn;}}]));
let user=null,authChange,reads=0;
const client={auth:{getUser:async()=>({data:{user:user?{id:user}:null}}),onAuthStateChange:fn=>{authChange=fn;}},from:()=>({select:()=>({eq:(_,id)=>({maybeSingle:async()=>{reads++;return {data:{account_id:id,revision:3,boundaries:{minimalWalking:true},interests:['private interest']}};}})})})};
const context=vm.createContext({window:{supabase:{createClient:()=>client}},document:{getElementById:id=>elements[id]},setTimeout});
const html=fs.readFileSync('adventure-profile-preview.html','utf8');
for(const match of html.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){
 if(match[1]?.startsWith('https:'))continue;
 vm.runInContext(match[1]?fs.readFileSync(match[1],'utf8'):match[2],context,{filename:match[1]||'preview-inline'});
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
(async()=>{
 await settle();assert.equal(elements.statusHeading.textContent,'Sign in required');assert.equal(reads,0);
 user='fictional-one';authChange();await settle();assert.equal(elements.statusHeading.textContent,'Saved preferences');assert.equal(elements.statusRevision.textContent,'Saved revision: 3');
 assert(!Object.values(elements).map(e=>e.textContent).join(' ').includes('private interest'));
 user=null;authChange();assert.equal(elements.statusRevision.textContent,'');await settle();assert.equal(elements.statusHeading.textContent,'Sign in required');
 await elements.refresh.click();assert.equal(elements.statusHeading.textContent,'Sign in required');
 console.log('PASS: actual preview scripts load without Node require; signed-out/saved states, private-content exclusion, auth clearing and refresh. DOM adapter test; visual browser testing remains separate.');
})().catch(e=>{console.error(e);process.exitCode=1;});

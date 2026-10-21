const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('date-store.html','utf8');
class E{constructor(){this.value='';this.textContent='';this.listeners={};this.open=false;}addEventListener(k,f){this.listeners[k]=f}reportValidity(){return true}showModal(){this.open=true}close(){this.open=false;this.listeners.close?.()}}
function setup(){const els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(x=>[x[1],new E()]));const state={user:{id:'owner'},profile:{units:'metric',braCup:'DD'},revision:1,calls:[],fail:false};
 const client={auth:{getUser:async()=>({data:{user:state.user}}),onAuthStateChange:f=>state.auth=f},rpc:async(name,args)=>{state.calls.push({name,args});if(state.fail)return {error:{}};if(args.p_action==='save'){state.profile=args.p_profile;state.revision++;}if(args.p_action==='delete'){state.profile={};state.revision++;}return {data:{profile:state.profile,revision:state.revision}};}};
 const ctx=vm.createContext({document:{getElementById:id=>els[id],createElement:()=>new E(),head:{append:s=>s.onload()}},window:{supabase:{createClient:()=>client},addEventListener(){}},confirm:()=>true});
 vm.runInContext(fs.readFileSync('private-fit.js','utf8'),ctx);return {els,state};}
(async()=>{
 let {els,state}=setup();await els.openFitProfile.onclick();assert(els.fitDialog.open);assert.equal(els.fit_braCup.value,'DD');
 els.fit_braCup.value='E';await els.fitSave.onclick();assert.equal(state.profile.braCup,'E');assert(els.fitStatus.textContent.includes('saved'));
 state.fail=true;els.fit_height.value='171';await els.fitSave.onclick();assert.equal(els.fit_height.value,'171');assert(els.fitStatus.textContent.includes('couldn’t confirm'));
 state.fail=false;await els.fitDelete.onclick();assert.deepEqual(state.profile,{});assert.equal(els.fit_height.value,'');
 els.fitClose.onclick();assert(!els.fitDialog.open);assert.equal(els.fit_braCup.value,'');
 ({els,state}=setup());state.user=null;await els.openFitProfile.onclick();assert(!els.fitDialog.open);assert.equal(state.calls.length,0);assert(els.fitOpenStatus.textContent.includes('Sign in'));
 ({els,state}=setup());await els.openFitProfile.onclick();state.user={id:'different'};const n=state.calls.length;await els.fitSave.onclick();assert.equal(state.calls.length,n);state.auth('SIGNED_OUT',null);assert(!els.fitDialog.open);assert.equal(els.fit_braCup.value,'');
 ({els,state}=setup());await els.openFitProfile.onclick();els.fit_height.value='170';els.fit_units.value='imperial';els.fit_units.onchange();assert.equal(els.fit_height.value,'');
 console.log('PASS: profile load/save/delete, failed-save retention, sign-in gate, changed-account write rejection, sign-out erasure and safe unit switching.');
})().catch(e=>{console.error(e);process.exit(1)});

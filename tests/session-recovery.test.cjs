'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=html.slice(html.indexOf('// Sign-in and session recovery.'),html.indexOf('async function signOutUser()'));
assert(source.includes('sb.auth.onAuthStateChange'),'Session recovery must be installed');
function setup(){
 const nodes=new Map(),queue=[],storage=new Map([['hs_heart_stone_id','old-connection']]),state={user:{id:'john',email:'john@example.test'},loads:0,clears:0,signIns:0,error:null,throwSignIn:false,hold:null,connected:true};
 const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',disabled:false,classList:{remove(){}},hidden:false});return nodes.get(id);};
 get('email').value='john@example.test';get('password').value='example-only';
 let callback;
 const context=vm.createContext({$:get,status:(id,text)=>get(id).textContent=text,show:(id,on)=>get(id).hidden=!on,step(){},setConnectedUI:on=>{if(!on)state.clears++;},localStorage:{removeItem:key=>storage.delete(key)},clearInterval(){},autoSyncTimer:1,heartStoneId:'old-connection',requestId:'old',adventureId:'old',stepId:'old',privateRequestId:'old',seenCandidateIds:['old'],lastSharedFingerprint:'old',autoSyncBusy:true,setTimeout:fn=>queue.push(fn),
 currentUser:async()=>state.user,loadExistingHeartStone:async()=>{state.loads++;return state.connected;},
 sb:{auth:{onAuthStateChange:fn=>callback=fn,signInWithPassword:async()=>{state.signIns++;if(state.hold)await state.hold;if(state.throwSignIn)throw Error('network');if(state.error)return {error:state.error};callback('SIGNED_IN',{user:state.user});return {data:{user:state.user}};}}}});
 vm.runInContext(source,context);
 return {get,state,queue,context,emit:(event,id='john')=>callback(event,id?{user:{id}}:null),drain:async()=>{while(queue.length)await queue.shift()();}};
}
test('same-account session events preserve open private work',async()=>{
 const t=setup();t.emit('INITIAL_SESSION');for(const event of ['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'])t.emit(event);
 await t.drain();assert.equal(t.state.clears,0);assert.equal(t.state.loads,0);
});
test('signout clears old connection and shared state and offers sign-in',()=>{
 const t=setup();t.emit('INITIAL_SESSION');t.emit('SIGNED_OUT',null);
 assert.equal(t.context.heartStoneId,'');assert.equal(t.context.adventureId,null);assert.equal(t.context.privateRequestId,null);
 assert.equal(t.state.clears,1);assert.match(t.get('authStatus').textContent,/Sign in again/);
});
test('changed account clears first and restores outside the auth callback',async()=>{
 const t=setup();t.emit('INITIAL_SESSION');t.state.user={id:'jessica'};t.emit('SIGNED_IN','jessica');
 assert.equal(t.state.clears,1);assert.equal(t.state.loads,0);
 await t.drain();assert.equal(t.state.loads,1);
});
test('signout cancels queued connection restoration',async()=>{
 const t=setup();t.emit('INITIAL_SESSION');t.state.user={id:'jessica'};t.emit('SIGNED_IN','jessica');
 t.state.user=null;t.emit('SIGNED_OUT',null);await t.drain();assert.equal(t.state.loads,0);
});
test('manual sign-in blocks duplicates and restores once',async()=>{
 const t=setup();let release;t.state.hold=new Promise(resolve=>release=resolve);
 const request=t.get('signInBtn').onclick();assert(t.get('signInBtn').disabled);
 await t.get('signInBtn').onclick();assert.equal(t.state.signIns,1);
 release();await request;await t.drain();assert.equal(t.state.loads,1);assert.equal(t.get('password').value,'');assert(!t.get('signInBtn').disabled);
});
test('missing credentials, rejected credentials and network failures remain retryable',async()=>{
 const empty=setup();empty.get('password').value='';await empty.get('signInBtn').onclick();assert.equal(empty.state.signIns,0);
 for(const mode of ['error','throwSignIn']){
  const t=setup();t.state[mode]=mode==='error'?{status:400}:true;
  await t.get('signInBtn').onclick();assert(!t.get('signInBtn').disabled);assert.equal(t.state.loads,0);
  assert.match(t.get('authStatus').textContent,/try again/);
 }
 const limited=setup();limited.state.error={status:429};await limited.get('signInBtn').onclick();assert.match(limited.get('authStatus').textContent,/wait/);
});

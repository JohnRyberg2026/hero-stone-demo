'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../account-wishes.js'),'utf8');
class Node{
 constructor(tag='div',text=''){this.tag=tag;this.textContent=text;this.children=[];this.value='';}
 append(...nodes){this.children.push(...nodes);if(this.tag==='head')nodes.forEach(n=>n.onload?.());}
 replaceChildren(...nodes){this.children=nodes;}close(){this.open=false;}showModal(){this.open=true;}reset(){}
}
function setup(user='owner',revoked=true){
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Node());return elements.get(id);};
 const state={user,shares:[{id:'snapshot',owner_id:'owner',recipient_id:'recipient',name:'Our quiet getaway',preference:'ask',shared_note:'A balcony',revoked_at:revoked?'2026-11-07T12:00:00Z':null}],deletes:0,planned:0};
 const client={auth:{getUser:async()=>({data:{user:{id:state.user}}}),onAuthStateChange(){}},from:table=>{
  const filters=[];let operation='select',single=false;
  const query={select(){return query;},eq(k,v){filters.push([k,v]);return query;},delete(){operation='delete';return query;},maybeSingle(){single=true;return query;},then(resolve,reject){
   try{let rows=table==='quest_wish_shares'?state.shares:[];rows=rows.filter(row=>filters.every(([k,v])=>row[k]===v));
    if(operation==='delete'){state.deletes++;state.shares=state.shares.filter(row=>!rows.includes(row));rows=[];}
    return Promise.resolve({data:single?(rows[0]?{...rows[0]}:null):rows.map(row=>({...row}))}).then(resolve,reject);
   }catch(e){return Promise.reject(e).then(resolve,reject);}
  }};return query;
 }};
 const context=vm.createContext({document:{getElementById:get,createElement:tag=>new Node(tag),head:new Node('head')},window:{supabase:{createClient:()=>client},addEventListener(){},dispatchEvent(){state.planned++;}},QuestWishes:{destinations:{},preferences:{ask:'Ask me'},stop:w=>w},CustomEvent:class{},confirm:()=>true});
 vm.runInContext(source,context);return {get,state};
}
const walk=node=>[node,...node.children.flatMap(walk)];
const words=node=>walk(node).map(n=>n.textContent).join('\n');
const buttons=node=>walk(node).filter(n=>n.tag==='button');
test('owner sees ended share and can remove its snapshot',async()=>{
 const t=setup();await t.get('openAccountWishes').onclick();
 assert.match(words(t.get('accountShareList')),/Sharing ended/);
 const remove=buttons(t.get('accountShareList')).find(n=>n.textContent==='Remove Ended Share');assert(remove);await remove.onclick();
 assert.equal(t.state.deletes,1);assert.equal(t.state.shares.length,0);assert.match(t.get('accountWishesStatus').textContent,/share this wish again/);
});
test('revoked recipient snapshot is hidden even if supplied by stale transport',async()=>{
 const t=setup('recipient',true);await t.get('openAccountWishes').onclick();
 assert.equal(t.get('accountShareList').children.length,0);assert.equal(t.state.planned,0);
});
test('recipient planning rechecks revocation before passing to draft',async()=>{
 const t=setup('recipient',false);await t.get('openAccountWishes').onclick();
 const plan=buttons(t.get('accountShareList')).find(n=>n.textContent==='Plan From This');assert(plan);
 t.state.shares[0].revoked_at='2026-11-07T12:00:00Z';await plan.onclick();
 assert.equal(t.state.planned,0);assert.match(t.get('accountWishesStatus').textContent,/no longer available/);
});
test('active recipient snapshot still plans after fresh access check',async()=>{
 const t=setup('recipient',false);await t.get('openAccountWishes').onclick();
 await buttons(t.get('accountShareList')).find(n=>n.textContent==='Plan From This').onclick();assert.equal(t.state.planned,1);
});

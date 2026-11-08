'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../invitation-opening.html'),'utf8');
const guard=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes('function snapshot()')&&x.includes('heartStonePlannerIsDirty'));
assert(guard,'Planner draft protection must be present');
const exitSource=html.slice(html.indexOf('function exit(mode){'),html.indexOf('document.querySelectorAll("[data-home]")'));
const homeBinding=html.split('\n').find(line=>line.startsWith('document.querySelectorAll("[data-home]")'));
const saveSource=html.slice(html.indexOf('function save(){'),html.indexOf('document.querySelectorAll("[data-save]")'));
assert(saveSource.startsWith('function save(){'));
function setup(){
 const nodes=new Map(),events={},storage=new Map(),state={fail:false,message:''};
 const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',open:false,showModal(){this.open=true;},classList:{add(){},remove(){}}});return nodes.get(id);};
 const ctx=vm.createContext({document:{getElementById:get},location:{href:'still-here'},exitMode:'home',window:{addEventListener:(type,fn)=>events[type]=fn},selected:new Set(),kind:'',experienceIds:['experienceTitle','experienceStory','revealMode','experienceHint'],plan:{whenMode:'specific',momentDate:'2027-01-10'},planDraft:()=>ctx.plan,$:get,status:value=>state.message=value,draftKey:'test-draft',saved:null,localStorage:{setItem:(key,value)=>{if(state.fail)throw Error('storage unavailable');storage.set(key,value);}}});
 vm.runInContext(guard,ctx);vm.runInContext(saveSource,ctx);vm.runInContext(exitSource,ctx);
 const warned=()=>{let blocked=false;events.beforeunload({preventDefault(){blocked=true;}});return blocked;};
 return {ctx,get,state,storage,warned};
}
test('untouched calendar handoff is clean; every planner section marks edits',()=>{
 for(const change of [
  t=>t.ctx.selected.add('connection'),
  t=>t.get('message').value='Some time together?',
  t=>t.ctx.kind='date',
  t=>t.ctx.plan={...t.ctx.plan,momentDate:'2027-02-11'},
  t=>t.get('experienceTitle').value='Our quiet evening',
  t=>t.get('experienceStory').value='A walk together',
  t=>t.get('revealMode').value='surprise',
  t=>t.get('experienceHint').value='Bring comfortable shoes'
 ]){
  const t=setup();assert.equal(t.warned(),false);change(t);assert.equal(t.warned(),true);
 }
});
test('successful device save clears warning; later edits warn again',()=>{
 const t=setup();t.get('message').value='Our words';assert(t.warned());
 assert.equal(t.ctx.save(),true);assert.equal(t.warned(),false);
 assert.equal(JSON.parse(t.storage.get('test-draft')).message,'Our words');
 t.get('message').value='Changed words';assert(t.warned());
});
test('failed save keeps both typed words and warning',()=>{
 const t=setup();t.get('message').value='Keep these words';t.state.fail=true;
 assert.equal(t.ctx.save(),false);assert.equal(t.get('message').value,'Keep these words');
 assert(t.warned());assert.equal(t.storage.size,0);
});
test('explicit discard leaves without a second browser warning',()=>{
 const t=setup();t.get('message').value='Discard explicitly';assert(t.warned());
 t.ctx.window.heartStonePlannerDiscardForExit();assert.equal(t.warned(),false);
});
test('deleting saved beginning makes the open draft unsaved again',()=>{
 const t=setup();t.get('message').value='Open draft';t.ctx.save();assert.equal(t.warned(),false);
 t.ctx.window.heartStonePlannerSavedDeleted();assert(t.warned());
});
test('feeling order does not create a false change',()=>{
 const t=setup();t.ctx.selected=new Set(['b','a']);t.ctx.window.heartStonePlannerMarkSaved();
 t.ctx.selected=new Set(['a','b']);assert.equal(t.warned(),false);
});

test('clean Home returns directly; edited draft opens save/discard without navigating',()=>{
 const clean=setup();clean.ctx.exit('home');assert.equal(clean.ctx.location.href,'index.html#date-quest');assert.equal(clean.get('exitDialog').open,false);
 const dirty=setup();dirty.get('message').value='Keep my invitation';dirty.ctx.exit('home');assert.equal(dirty.ctx.location.href,'still-here');assert.equal(dirty.get('exitDialog').open,true);assert.equal(dirty.get('message').value,'Keep my invitation');
});
test('Home anchors prevent native navigation so the dirty-draft prompt can decide',()=>{
 const t=setup(),link={};t.ctx.document.querySelectorAll=()=>[link];vm.runInContext(homeBinding,t.ctx);
 t.get('message').value='Unsaved';let prevented=false;link.onclick({preventDefault(){prevented=true;}});
 assert(prevented);assert.equal(t.ctx.location.href,'still-here');assert(t.get('exitDialog').open);
 assert(html.includes('id="collectionHome" class="collection-home" data-home'));
});
test('successful save permits Home, failed save keeps draft and Home prompt',()=>{
 for(const failure of [false,true]){const t=setup();t.get('message').value='Private draft';t.state.fail=failure;t.ctx.save();t.ctx.exit('home');assert.equal(t.ctx.location.href,failure?'still-here':'index.html#date-quest');assert.equal(t.get('message').value,'Private draft');}
});

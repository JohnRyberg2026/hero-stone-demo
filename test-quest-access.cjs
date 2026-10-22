const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
function setup(){
 const enter={disabled:true},cancel={},check={checked:false};
 const dialog={style:{},querySelectorAll:()=>[enter,cancel],querySelector:()=>check,addEventListener(k,v){this[k]=v},showModal(){this.open=true},close(){this.open=false},remove(){}};
 const worldCheck={checked:false};
 const world={hidden:true,querySelector:()=>worldCheck},add={},remove={},status={};
 const elements={worldAdultOption:world,addWorldAdultOption:add,removeWorldAdultOption:remove,worldAdultStatus:status};
 let ready;const context={window:{},document:{body:{dataset:{},append(){}},createElement:()=>dialog,addEventListener:(k,v)=>ready=v,getElementById:k=>elements[k]}};
 vm.runInNewContext(fs.readFileSync('quest-access.js','utf8'),context);ready();return {...context,dialog,enter,cancel,check,worldCheck,world,add,remove,status};
}
(async()=>{
 let c=setup(),pending=c.window.QuestAccess.requestAdult();assert(c.dialog.open);assert(c.enter.disabled);
 c.check.checked=true;c.check.onchange();assert(!c.enter.disabled);c.enter.onclick();assert.equal(await pending,true);
 c=setup();pending=c.window.QuestAccess.requestAdult();c.cancel.onclick();assert.equal(await pending,false);
 pending=c.window.QuestAccess.requestAdult();c.dialog.cancel({preventDefault(){}});assert.equal(await pending,false);
 assert(c.world.hidden);c.add.onclick();assert(!c.world.hidden);assert(!c.check.checked);
 c.worldCheck.onchange({target:{checked:true}});assert.match(c.status.textContent,/remains unavailable/);
 c.remove.onclick();assert(c.world.hidden);assert(!c.check.checked);
 const f=c.window.QuestAccess.policy.canShareAdultExperience;
 assert(!f([]));assert(!f([{ageVerified:false,adultOptIn:true,experienceConsent:true}]));assert(!f([{ageVerified:true,adultOptIn:false,experienceConsent:true}]));assert(!f([{ageVerified:true,adultOptIn:true,experienceConsent:false}]));assert(f([{ageVerified:true,adultOptIn:true,experienceConsent:true}]));
 for(const file of ['date-store.html','invitation-opening.html']){const s=fs.readFileSync(file,'utf8');assert(s.includes('data-quest-audience="date"'));assert(s.includes('quest-access.js'));}
 console.log('PASS: explicit adult confirmation, cancel/Escape, WORLD add/opt-in/remove, all-participant consent policy, direct-page wiring.');
})().catch(e=>{console.error(e);process.exitCode=1});

const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),virtualConsole=new VirtualConsole();
const dom=new JSDOM(fs.readFileSync(path.join(root,'account-profile.html'),'utf8'),{runScripts:'outside-only',url:'https://example.test/account-profile.html',virtualConsole});
const w=dom.window;let user={id:'alice',email:'alice@example.test'},store={},fail=false,writes=[],authChange;
w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user}}),onAuthStateChange:fn=>authChange=fn},from:table=>{assert.equal(table,'user_onboarding_answers');let rows=null,id=null;const b={select(){return b},eq(k,v){id=v;return b},like(){return b},upsert(r){rows=r;return b},then(resolve,reject){return Promise.resolve().then(()=>{if(rows){if(fail)return {error:{message:'offline'}};writes.push(rows);rows.forEach(r=>store[r.user_id+':'+r.question_key]=r);return {data:rows}}return {data:Object.values(store).filter(r=>r.user_id===id)};}).then(resolve,reject)}};return b}})};
const context=dom.getInternalVMContext(),run=s=>vm.runInContext(s,context);
run(fs.readFileSync(path.join(root,'account-profile.js'),'utf8'));
const button=label=>[...w.document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===label||b.textContent===label);
const read=k=>store['alice:account_profile_v1_'+k]?.answer_json.value;
(async()=>{
 await run('boot()');assert.equal(run('current'),'welcome');assert(button('Get Started'));assert(button('I’ll Do This Later'));assert(!w.document.querySelector('progress'));
 await button('I’ll Do This Later').onclick();assert.equal(writes.length,0);assert.equal(Object.keys(store).length,0);
 await button('Get Started').onclick();assert.equal(run('current'),'starter_about');assert.equal(button('Surprise me').getAttribute('aria-pressed'),'false');
 const name=w.document.getElementById('call_me');assert.equal(name.tagName,'INPUT');assert.equal(name.maxLength,80);name.value='John';name.oninput();
 button('Get outside').click();button('Food & dining').click();button('Surprise me').click();await button('Save & Continue').onclick();
 assert.equal(read('call_me'),'John');assert.deepEqual(Array.from(read('free_time')),['Get outside','Food & dining','Surprise me']);assert.equal(read('surprise'),undefined);
 assert.equal(run('current'),'starter_adventure');assert.equal(w.document.querySelectorAll('[aria-pressed="true"]').length,0);
 button('FAMILIAR').click();button('STRETCH').click();button('Give Me Some Mystery').click();await button('Save & Continue').onclick();
 assert.equal(read('exploration'),'Stretch');assert.equal(read('surprise'),'Give Me Some Mystery');assert.equal(run('current'),'starter_context');
 button('My partner').click();button('Family').click();assert.equal(w.document.getElementById('companionNote').hidden,false);
 await button('Save & Finish Later').onclick();assert.equal(run('current'),'overview');await run('boot()');await button('Continue Getting Started').onclick();
 assert.equal(run('current'),'starter_context');assert.equal(button('My partner').getAttribute('aria-pressed'),'true');assert.equal(button('Family').getAttribute('aria-pressed'),'true');
 assert.equal(button('Friends').getAttribute('aria-pressed'),'false');
 // Skip preserves answers already given, and all other options stay unknown.
 await button('Skip for Now').onclick();assert.equal(run('current'),'starter_pause');assert.deepEqual(Array.from(read('planning_for')),['My partner','Family']);
 assert(writes.flat().every(r=>r.question_key.startsWith('account_profile_v1_')));
 // A failed save keeps the person on the current screen and can be retried.
 await run("navigate('starter_about')");fail=true;button('Stay close to home').click();await button('Save & Continue').onclick();assert.equal(run('current'),'starter_about');
 fail=false;await run('flush()');await button('Save & Continue').onclick();assert.equal(run('current'),'starter_adventure');
 // Existing surprise answers survive without silently translating or rewriting them.
 store['alice:account_profile_v1_surprise']={user_id:'alice',question_key:'account_profile_v1_surprise',answer_json:{value:'Keep a little mystery'},skipped:false};
 await run('boot()');await run("navigate('starter_adventure')");assert(w.document.querySelector('#app').textContent.includes('Saved earlier: Keep a little mystery'));assert.equal(w.document.querySelectorAll('[aria-label="And how much do you like surprises?"] [aria-pressed="true"]').length,0);assert.equal(read('surprise'),'Keep a little mystery');
 await run("navigate('review')");assert.equal([...w.document.querySelectorAll('dt')].filter(n=>n.textContent==='And how much do you like surprises?').length,1);
 user={id:'bob',email:'bob@example.test'};await run('boot()');assert.equal(run('current'),'welcome');await button('Get Started').onclick();assert.equal(w.document.getElementById('call_me').value,'');assert.equal(run('answers.planning_for'),undefined);
 user=null;authChange('SIGNED_OUT');await new Promise(r=>setTimeout(r,10));assert(w.document.querySelector('h2').textContent.includes('Sign in'));
 console.log('PASS: approved opening/first three screens, optional exit, multi/single selection, independent surprise defaults, save/resume/retry, legacy preservation, no invites, and account isolation.');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});

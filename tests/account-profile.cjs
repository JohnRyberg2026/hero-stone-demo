// Run with Node and jsdom 26.1.0 installed: node tests/account-profile.cjs
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'account-profile.html'),'utf8'),{runScripts:'outside-only',url:'https://example.test/account-profile.html'});
const w=dom.window;let user={id:'alice',email:'alice@example.test'},store={},fail=false,delay=0,authChange,writes=[];
w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user}}),onAuthStateChange:fn=>authChange=fn},from:()=>{let rows=null,id=null;const b={select(){return b},eq(k,v){id=v;return b},like(){return b},upsert(r){rows=r;return b},then(resolve,reject){return (async()=>{if(rows){await new Promise(r=>setTimeout(r,delay));if(fail)return {error:{message:'offline'}};writes.push(rows);rows.forEach(r=>store[r.user_id+':'+r.question_key]=r);return {data:rows}}return {data:Object.values(store).filter(r=>r.user_id===id)};})().then(resolve,reject)}};return b}})};
const vm=require('node:vm');vm.runInContext(fs.readFileSync(path.join(root,'account-profile.js'),'utf8'),dom.getInternalVMContext());
const run=s=>vm.runInContext(s,dom.getInternalVMContext()),read=k=>store['alice:account_profile_v1_'+k]?.answer_json.value;
(async()=>{
 await run('boot()');await run("navigate('about')");
 run("stage('everyday_life','Slow weekends')");await run("navigate('interests')");assert.equal(read('everyday_life'),'Slow weekends');
 const btn=name=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===name);
 btn('Nature').click();btn('Bookstores').click();assert.equal(btn('Nature').getAttribute('aria-pressed'),'true');await run('flush()');assert.deepEqual(Array.from(read('interests')),['Nature','Bookstores']);
 await run('boot()');await run("navigate(answers.resume)");assert.equal(btn('Nature').getAttribute('aria-pressed'),'true');
 fail=true;btn('Music').click();await run("navigate('avoid')");assert.equal(run('current'),'interests');assert(w.document.getElementById('status').textContent.includes('Not saved'));
 fail=false;await run('flush()');assert(read('interests').includes('Music'));
 btn('Leave Unanswered').click();await run('flush()');assert.equal(read('interests'),null);
 await run("navigate('avoid')");run("stage('avoid','Loud crowds')");btn('Skip for Now').click();await run('flush()');assert.equal(read('avoid'),'Loud crowds');
 // Waiting edits must never migrate to another person's account.
 run("stage('food_likes','Alice private note')");user={id:'bob',email:'bob@example.test'};await run('boot()');assert.equal(run('answers.food_likes'),undefined);assert(writes.every(b=>b.every(r=>r.user_id==='alice')));
 // Overlapping saves are serialized; newest value wins.
 user={id:'alice',email:'alice@example.test'};await run('boot()');delay=20;run("stage('food_likes','Older')");const first=run('flush()');await new Promise(r=>setTimeout(r,5));run("stage('food_likes','Newer')");const second=run('flush()');await Promise.all([first,second]);assert.equal(read('food_likes'),'Newer');
 await run("navigate('review')");assert(!w.document.querySelector('progress'));assert.equal(w.document.querySelectorAll('dl').length,17);
 // Content is rendered as text, including user-entered markup.
 run("stage('avoid','<img src=x onerror=alert(1)>')");await run('flush()');await run("navigate('review')");assert.equal(w.document.querySelectorAll('img').length,0);
 user=null;await run('boot()');assert(w.document.querySelector('h2').textContent.includes('Sign in'));assert.equal(run('owner'),null);
 console.log('PASS: save/resume, selection, skip preservation, unknown reset, failed-save recovery, serialized edits, account isolation, safe rendering, sign-out.');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});

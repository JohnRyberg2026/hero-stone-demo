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
 await button('Skip for Now').onclick();assert.equal(run('current'),'starter_connection');assert.deepEqual(Array.from(read('planning_for')),['My partner','Family']);

 // Step 4 supports several connection styles and a private optional quick-add.
 assert.equal(w.document.getElementById('question-connection_other').hidden,true);
 button('Good conversation').click();button('Quiet time together').click();button('Something else').click();
 assert.equal(w.document.getElementById('question-connection_other').hidden,false);
 const other=w.document.getElementById('connection_other');other.value='Making music together';other.oninput();
 button('Something else').click();assert.equal(w.document.getElementById('question-connection_other').hidden,false);
 await button('Save & Continue').onclick();assert.equal(read('connection_other'),'Making music together');assert.deepEqual(Array.from(read('connection_styles')),['Good conversation','Quiet time together']);
 // Step 5 availability is not a booking, and notice stays a single independent default.
 assert.equal(run('current'),'starter_timing');assert(w.document.querySelector('#app').textContent.includes('never an obligation'));
 button('Weekday evenings').click();button('Weekend mornings').click();button('My schedule changes a lot').click();
 button('A few hours').click();button('A day or two').click();await button('Save & Continue').onclick();
 assert.equal(read('planning_notice'),'A day or two');assert.deepEqual(Array.from(read('available_windows')),['Weekday evenings','Weekend mornings','My schedule changes a lot']);
 // Step 6 accepts several paces and durations without modifying today's limits or older pace answers.
 assert.equal(run('current'),'starter_energy');assert.equal(run('answers.pace'),undefined);
 button('Easy & relaxed').click();button('It depends on the day').click();button('An hour or two').click();button('Half a day').click();
 const discomfort=w.document.getElementById('physical_comfort_notes');discomfort.value='Standing for long periods';discomfort.oninput();
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();
 assert.equal(run('current'),'starter_energy');assert.equal(button('Easy & relaxed').getAttribute('aria-pressed'),'true');assert.equal(button('Half a day').getAttribute('aria-pressed'),'true');
 assert.deepEqual(Array.from(read('energy_pace')),['Easy & relaxed','It depends on the day']);assert.deepEqual(Array.from(read('experience_length')),['An hour or two','Half a day']);assert.equal(read('physical_comfort_notes'),'Standing for long periods');
 assert.equal(read('pace'),undefined);await button('Save & Continue').onclick();assert.equal(run('current'),'starter_social');

 // Crowd comfort is distinct from comfort with interacting with strangers.
 button('Just us').click();button('Big crowds are fine').click();assert.equal(read('meeting_people'),undefined);
 button('Sometimes').click();button('Only if it happens naturally').click();await button('Save & Continue').onclick();
 assert.deepEqual(Array.from(read('social_settings')),['Just us','Big crowds are fine']);assert.deepEqual(Array.from(read('meeting_people')),['Sometimes','Only if it happens naturally']);
 assert.equal(run('current'),'starter_food');
 button('I know what I like').click();button('I love discovering new foods').click();button('Coffee shops & bakeries').click();button('Picnics & outdoor dining').click();
 const dislike=w.document.getElementById('food_dislikes');dislike.value='Olives';dislike.oninput();assert.equal(read('food_requirements'),undefined);
 const foodRequirement=w.document.getElementById('food_requirements');foodRequirement.value='Peanuts';foodRequirement.oninput();await button('Save & Continue').onclick();
 assert.equal(read('food_dislikes'),'Olives');assert.equal(read('food_requirements'),'Peanuts');assert.equal(read('food_needs'),undefined);
 assert.equal(run('current'),'starter_interests');assert.equal(w.document.getElementById('question-enjoyed_other').hidden,true);
 button('Gardening & farms').click();button('Classes & learning').click();button('Something else — Tell HEART STONE').click();
 const enjoyedOther=w.document.getElementById('enjoyed_other');enjoyedOther.value='Board game cafes';enjoyedOther.oninput();
 const curiosity=w.document.getElementById('curious_interests');curiosity.value='Pottery, sailing';curiosity.oninput();
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();
 assert.equal(run('current'),'starter_interests');assert.equal(button('Gardening & farms').getAttribute('aria-pressed'),'true');assert.equal(w.document.getElementById('curious_interests').value,'Pottery, sailing');
 assert.deepEqual(Array.from(read('enjoyed_interests')),['Gardening & farms','Classes & learning','Something else — Tell HEART STONE']);assert.equal(read('enjoyed_other'),'Board game cafes');assert.equal(read('interests'),undefined);
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_pause');
 assert(writes.flat().every(r=>r.question_key.startsWith('account_profile_v1_')));
 // A failed save keeps the person on the current screen and can be retried.
 await run("navigate('starter_about')");fail=true;button('Stay close to home').click();await button('Save & Continue').onclick();assert.equal(run('current'),'starter_about');
 fail=false;await run('flush()');await button('Save & Continue').onclick();assert.equal(run('current'),'starter_adventure');
 // Existing surprise answers survive without silently translating or rewriting them.
 store['alice:account_profile_v1_surprise']={user_id:'alice',question_key:'account_profile_v1_surprise',answer_json:{value:'Keep a little mystery'},skipped:false};
 await run('boot()');await run("navigate('starter_adventure')");assert(w.document.querySelector('#app').textContent.includes('Saved earlier: Keep a little mystery'));assert.equal(w.document.querySelectorAll('[aria-label="And how much do you like surprises?"] [aria-pressed="true"]').length,0);assert.equal(read('surprise'),'Keep a little mystery');
 await run("navigate('review')");assert.equal([...w.document.querySelectorAll('dt')].filter(n=>n.textContent==='And how much do you like surprises?').length,1);
 user={id:'bob',email:'bob@example.test'};await run('boot()');assert.equal(run('current'),'welcome');await button('Get Started').onclick();assert.equal(w.document.getElementById('call_me').value,'');assert.equal(run('answers.planning_for'),undefined);
 for(let i=0;i<9;i++)await button('Skip for Now').onclick();assert.equal(run('current'),'starter_pause');assert(Object.values(store).filter(r=>r.user_id==='bob').every(r=>['account_profile_v1_starter_resume','account_profile_v1_starter_started'].includes(r.question_key)));
 user=null;authChange('SIGNED_OUT');await new Promise(r=>setTimeout(r,10));assert(w.document.querySelector('h2').textContent.includes('Sign in'));
 console.log('PASS: approved opening/first nine screens, optional exit, multi/single selection, independent surprise defaults, save/resume/retry, legacy preservation, no invites, and account isolation.');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});

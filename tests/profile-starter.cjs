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
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_travel');

 // Overnight choice controls lodging visibility without deleting saved preferences.
 assert.equal(w.document.getElementById('question-lodging_preferences').hidden,true);
 button('Stay close').click();button('Worth the drive').click();button('Absolutely').click();button('Maybe—show me why it’s worth it').click();
 button('Occasionally').click();assert.equal(w.document.getElementById('question-lodging_preferences').hidden,false);
 button('Hotel').click();button('Cabin').click();button('Bed & Breakfast / Inn').click();button('Resort').click();
 assert.equal(run('answers.lodging_preferences.length'),3);assert.equal(button('Resort').getAttribute('aria-pressed'),'false');assert(w.document.getElementById('lodging_preferences-limit').textContent.includes('Pick up to 3'));
 const rank=w.document.getElementById('lodging_ranked');rank.checked=true;rank.onchange();button('Move Cabin earlier').click();
 assert.deepEqual(Array.from(run('answers.lodging_preferences')),['Cabin','Hotel','Bed & Breakfast / Inn']);
 button('Not really my thing').click();assert.equal(w.document.getElementById('question-lodging_preferences').hidden,true);
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();
 assert.equal(run('current'),'starter_travel');assert.equal(w.document.getElementById('question-lodging_preferences').hidden,true);assert.deepEqual(Array.from(read('lodging_preferences')),['Cabin','Hotel','Bed & Breakfast / Inn']);assert.equal(read('lodging_ranked'),true);
 await run("navigate('review')");assert(w.document.querySelector('#app').textContent.includes('lodging preferences are inactive'));await run("navigate('starter_travel')");button('Occasionally').click();assert.equal(w.document.getElementById('lodging_ranked').checked,true);
 button('Hotel').click();button('Resort').click();assert.deepEqual(Array.from(run('answers.lodging_preferences')),['Cabin','Bed & Breakfast / Inn','Resort']);
 await button('Save & Continue').onclick();assert.equal(read('farther_for_special'),'Maybe—show me why it’s worth it');assert.equal(run('current'),'starter_spending');
 button('Free is fantastic').click();button('Treat ourselves now and then').click();button('It depends—ask me').click();button('Total for both').click();button('Food & drinks').click();button('Transportation & parking').click();
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_planning');assert.equal(read('budget_style'),undefined);assert.deepEqual(Array.from(read('cost_considerations')),['Total for both','Food & drinks','Transportation & parking']);
 button('I usually end up being the planner').click();button('Please take some of the planning off my plate').click();button('I like planning together').click();
 button('Give me ideas — I’ll handle the rest').click();button('Handle almost everything — Give me what I need and tell me where to go').click();
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();assert.equal(run('current'),'starter_planning');assert.equal(button('Please take some of the planning off my plate').getAttribute('aria-pressed'),'true');
 assert.equal(read('surprise'),'Give Me Some Mystery');assert.equal(read('planning'),undefined);assert.equal(read('planning_assistance').length,2);
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_decisions');

 // Decision style and flexibility are independent single defaults, not permission to bypass constraints.
 button('Show Me Everything').click();button('Give Me 3').click();button('Yes').click();button('No').click();await button('Save & Continue').onclick();
 assert.equal(read('decisions'),'Give Me 3');assert.equal(read('decision_flexibility'),'No');assert.equal(read('surprise'),'Give Me Some Mystery');assert.equal(run('current'),'starter_boundaries');
 assert.equal(w.document.getElementById('boundaries_private').checked,true);assert.equal(read('boundaries_private'),undefined);
 button('Crowds').click();button('Heights').click();button('Nothing comes to mind right now').click();assert.deepEqual(Array.from(run('answers.hard_no_categories')),['Nothing comes to mind right now']);
 const boundaryBox=w.document.getElementById('question-hard_no_categories');boundaryBox.lastElementChild.click();await run('flush()');assert.equal(read('hard_no_categories'),null);assert.equal(button('Nothing comes to mind right now').getAttribute('aria-pressed'),'false');
 button('Crowds').click();const boundaryNote=w.document.getElementById('hard_no_details');boundaryNote.value='PRIVATE boundary explanation';boundaryNote.oninput();
 const privateBoundary=w.document.getElementById('boundaries_private');privateBoundary.checked=false;privateBoundary.onchange();
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();assert.equal(run('current'),'starter_boundaries');assert.equal(w.document.getElementById('boundaries_private').checked,false);assert.equal(read('hard_no_details'),'PRIVATE boundary explanation');
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_accessibility');assert.equal(w.document.getElementById('accommodations_private').checked,true);
 button('Minimal walking').click();button('Easy restroom access').click();button('No accommodations right now').click();assert.deepEqual(Array.from(run('answers.accommodation_needs')),['No accommodations right now']);
 button('Step-free/wheelchair-friendly access').click();assert.deepEqual(Array.from(run('answers.accommodation_needs')),['Step-free/wheelchair-friendly access']);
 const accessNote=w.document.getElementById('accommodation_details');accessNote.value='PRIVATE practical access need';accessNote.oninput();const privateAccess=w.document.getElementById('accommodations_private');privateAccess.checked=false;privateAccess.onchange();privateAccess.checked=true;privateAccess.onchange();
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();assert.equal(run('current'),'starter_accessibility');assert.equal(w.document.getElementById('accommodations_private').checked,true);assert.equal(read('boundaries_private'),false);assert.equal(read('accommodations_private'),true);
 assert.equal(read('accessibility'),undefined);assert.equal(read('hard_nos'),undefined);await button('Save & Continue').onclick();assert.equal(run('current'),'starter_occasions');
 const fill=(id,value)=>{const input=w.document.getElementById(id);input.value=value;input.oninput();};
 button('Memorial/remembrance dates').click();fill('occasion_1_name','PRIVATE tradition');fill('occasion_1_date','First Sunday in May');button("This matters to me, but I don't want a reminder").click();
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();assert.equal(run('current'),'starter_occasions');assert.equal(w.document.getElementById('occasion_1_date').value,'First Sunday in May');assert.equal(read('occasion_2_date'),undefined);assert.equal(read('occasions_private'),undefined);
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_thoughtfulness');button('I’d rather not receive gifts').click();
 const giving=w.document.querySelector('#question-thoughtful_giving .choices');[...giving.children].find(b=>b.dataset.option==='Acts of service').click();button('No thanks').click();await button('Save & Continue').onclick();
 assert.deepEqual(Array.from(read('thoughtful_receiving')),['I’d rather not receive gifts']);assert.deepEqual(Array.from(read('thoughtful_giving')),['Acts of service']);assert.equal(read('thoughtful_help'),'No thanks');assert.equal(run('current'),'starter_memories');
 button('I mostly just enjoy the moment').click();button('Only when I ask').click();button('Never').click();await button('Save & Continue').onclick();assert.equal(run('current'),'starter_learning');assert.equal(read('memory_followup'),'Never');assert.equal(read('story_help'),'Only when I ask');
 button('Learn a new skill').click();button('Mystery & paranormal').click();button('Just for fun').click();button('No').click();await button('Save & Continue').onclick();assert.equal(read('discovery_openness'),'No');assert.equal(read('exploration'),'Stretch');assert.equal(run('current'),'starter_surprise_control');
 button('Where we go').click();button("I'd rather know the details").click();assert.deepEqual(Array.from(run('answers.surprise_delegation')),["I'd rather know the details"]);button('What we do').click();assert.deepEqual(Array.from(run('answers.surprise_delegation')),['What we do']);
 button('Cost').click();button('Travel distance').click();button('Nothing—keep the surprise').click();assert.deepEqual(Array.from(run('answers.surprise_essentials')),['Nothing—keep the surprise']);button('Cost').click();assert.deepEqual(Array.from(run('answers.surprise_essentials')),['Cost']);button("Don't tell me—just lead the way").click();
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();assert.equal(run('current'),'starter_surprise_control');assert.equal(button('Cost').getAttribute('aria-pressed'),'true');assert.equal(read('surprise'),'Give Me Some Mystery');
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_communication');button('Quiet time together').click();button('Just being present').click();button('Not much — I’d rather focus on what we’re doing').click();button('No thanks').click();
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_recovery');assert.equal(read('conversation_help'),'No thanks');assert.equal(read('conversation_amount'),'Not much — I’d rather focus on what we’re doing');assert.equal(read('connection_styles').length,2);

 button('Head home and recharge').click();button('Take a break, then continue').click();button('One main experience is plenty').click();button('Yes, definitely').click();await button('Save & Continue').onclick();assert.equal(run('current'),'starter_environment');assert.equal(read('breathing_room'),'Yes, definitely');
 button('Outdoors in nature').click();button('Indoor/cozy').click();button("I'd rather be comfortable").click();button('Extreme heat').click();button('Nothing in particular').click();assert.deepEqual(Array.from(run('answers.weather_avoid')),['Nothing in particular']);button('Rain').click();assert.deepEqual(Array.from(run('answers.weather_avoid')),['Rain']);
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();assert.equal(run('current'),'starter_environment');assert.equal(button('Rain').getAttribute('aria-pressed'),'true');assert.deepEqual(Array.from(read('hard_no_categories')),['Crowds']);
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_transportation');button('I prefer my partner to drive').click();button('Rideshare/taxi').click();button('Scenic routes are worth extra time').click();button('Keep travel simple and direct').click();button('Minimize walking from parking').click();button('Nothing in particular').click();assert.deepEqual(Array.from(run('answers.transport_considerations')),['Nothing in particular']);button('Need room for equipment or belongings').click();
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();assert.equal(run('current'),'starter_transportation');assert.equal(button('Rideshare/taxi').getAttribute('aria-pressed'),'true');assert.equal(read('journey_style').length,2);assert.equal(read('transport'),undefined);assert.equal(read('travel_distance').length,2);
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_daytime');assert.deepEqual(Array.from(read('transport_considerations')),['Need room for equipment or belongings']);

 button('Morning').click();button('Sunset').click();fill('daytime_ideas','Markets in the morning');button('It depends').click();await button('Save & Continue').onclick();assert.equal(read('planning_notice'),'A day or two');assert.equal(read('experience_notice'),'It depends');assert.equal(run('current'),'starter_familiarity');
 button('Mix favorites with new discoveries').click();fill('favorite_places','PRIVATE favorite park');assert.equal(w.document.getElementById('question-past_place_1_feedback').hidden,true);fill('past_place_1_name','PRIVATE old venue');assert.equal(w.document.getElementById('question-past_place_1_feedback').hidden,false);button('Never suggest again').click();await run('flush()');assert.equal(read('past_place_1_feedback'),'Never suggest again');fill('past_place_1_name','PRIVATE different venue');assert.equal(run('answers.past_place_1_feedback'),null);button('Not for us').click();
 await button('Save & Finish Later').onclick();await run('boot()');await button('Continue Getting Started').onclick();assert.equal(run('current'),'starter_familiarity');assert.equal(w.document.getElementById('past_place_1_name').value,'PRIVATE different venue');assert.equal(button('Not for us').getAttribute('aria-pressed'),'true');assert.equal(read('past_place_2_name'),undefined);w.document.getElementById('question-past_place_1_name').lastElementChild.click();assert.equal(run('answers.past_place_1_feedback'),null);assert.equal(w.document.getElementById('question-past_place_1_feedback').hidden,true);fill('past_place_1_name','PRIVATE different venue');button('Not for us').click();
 await button('Save & Continue').onclick();assert.equal(run('current'),'starter_upgrades');button('Ask me first').click();button('Always show me the better value').click();button('I’m willing to pay more for quality').click();button('Don’t optimize around price unless I ask').click();assert.deepEqual(Array.from(run('answers.savings_preferences')),['Don’t optimize around price unless I ask']);button('Save money when the experience stays just as good').click();assert.deepEqual(Array.from(run('answers.savings_preferences')),['Save money when the experience stays just as good']);await button('Save & Continue').onclick();
 assert.equal(run('current'),'starter_companions');button('Just the two of us').click();button('Our children').click();button('Our pet(s)').click();button('Very important').click();button('Keep DATE QUEST focused on us').click();await button('Save & Continue').onclick();assert.equal(run('current'),'starter_pause');assert.equal(read('suggest_others'),'Keep DATE QUEST focused on us');assert.equal(read('experience_companions').length,3);assert.equal(read('planning_for').length,2);assert.equal(read('budget_style'),undefined);

 assert(writes.flat().every(r=>r.question_key.startsWith('account_profile_v1_')));
 // A failed save keeps the person on the current screen and can be retried.
 await run("navigate('starter_about')");fail=true;button('Stay close to home').click();await button('Save & Continue').onclick();assert.equal(run('current'),'starter_about');
 fail=false;await run('flush()');await button('Save & Continue').onclick();assert.equal(run('current'),'starter_adventure');
 // Existing surprise answers survive without silently translating or rewriting them.
 store['alice:account_profile_v1_surprise']={user_id:'alice',question_key:'account_profile_v1_surprise',answer_json:{value:'Keep a little mystery'},skipped:false};
 await run('boot()');await run("navigate('starter_adventure')");assert(w.document.querySelector('#app').textContent.includes('Saved earlier: Keep a little mystery'));assert.equal(w.document.querySelectorAll('[aria-label="And how much do you like surprises?"] [aria-pressed="true"]').length,0);assert.equal(read('surprise'),'Keep a little mystery');
 await run("navigate('review')");assert.equal([...w.document.querySelectorAll('dt')].filter(n=>n.textContent==='And how much do you like surprises?').length,1);
 user={id:'bob',email:'bob@example.test'};await run('boot()');assert.equal(run('current'),'welcome');await button('Get Started').onclick();assert.equal(w.document.getElementById('call_me').value,'');assert.equal(run('answers.planning_for'),undefined);
 for(let i=0;i<28;i++)await button('Skip for Now').onclick();assert.equal(run('current'),'starter_pause');assert(Object.values(store).filter(r=>r.user_id==='bob').every(r=>['account_profile_v1_starter_resume','account_profile_v1_starter_started'].includes(r.question_key)));
 user=null;authChange('SIGNED_OUT');await new Promise(r=>setTimeout(r,10));assert(w.document.querySelector('h2').textContent.includes('Sign in'));
 console.log('PASS: approved opening/first twenty-eight screens, optional exit, multi/single selection, independent surprise defaults, save/resume/retry, legacy preservation, no invites, and account isolation.');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});

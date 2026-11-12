// npm run test:browser after `npx playwright install chromium`.
// PROFILE_BROWSER_EXECUTABLE can point to an existing Chromium executable.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
let browser;
(async()=>{
 for(const width of [320,390,1280]){
  browser=await chromium.launch({headless:true,...(process.env.PROFILE_BROWSER_EXECUTABLE?{executablePath:process.env.PROFILE_BROWSER_EXECUTABLE}:{}),args:process.env.PROFILE_BROWSER_ARGS?JSON.parse(process.env.PROFILE_BROWSER_ARGS):['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(15000);
  const errors=[],store=new Map();let failSave=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.exposeFunction('profileQuery',query=>{
   assert.equal(query.table,'user_onboarding_answers');
   if(query.rows){if(failSave)return {error:{message:'Test offline'}};query.rows.forEach(r=>{assert.equal(r.user_id,'alice');store.set(r.question_key,r)});return {data:query.rows};}
   assert.equal(query.owner,'alice');return {data:[...store.values()]};
  });
  await page.route('**/supabase.js',route=>route.fulfill({contentType:'application/javascript',body:`
   window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'alice',email:'alice@example.test'}}}),onAuthStateChange(){}},from:table=>{let rows=null,owner=null;const b={select(){return b},eq(k,v){owner=v;return b},like(){return b},upsert(r){rows=r;return b},then(resolve,reject){return window.profileQuery({table,rows,owner}).then(resolve,reject)}};return b}})};
  `}));
  await page.goto(pathToFileURL(path.join(root,'account-profile.html')).href);
  await page.getByRole('heading',{name:'Let’s get to know you a little.'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'I’ll Do This Later',exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Retry Save',exact:true}).count(),0);
  await page.getByRole('button',{name:'Get Started',exact:true}).click();
  await page.getByRole('heading',{name:'A Little About You',exact:true}).waitFor();
  await page.locator('#clear-call_me').click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'clear-call_me');
  await page.getByLabel('What should I call you?',{exact:true}).fill('John');
  await page.getByRole('button',{name:'Get outside',exact:true}).click();
  await page.getByRole('button',{name:'Food & dining',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Get outside',exact:true}).getAttribute('aria-pressed'),'true');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-starter-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  const adventure=page.getByRole('group',{name:'When we’re planning something for you, how adventurous do you want me to be?',exact:true});
  const surprises=page.getByRole('group',{name:'And how much do you like surprises?',exact:true});
  await adventure.getByRole('button',{name:'FAMILIAR',exact:true}).click();
  await adventure.getByRole('button',{name:'STRETCH',exact:true}).click();
  await surprises.getByRole('button',{name:'Give Me Some Mystery',exact:true}).click();
  assert.equal(await adventure.locator('[aria-pressed="true"]').count(),1);
  assert.equal(await surprises.locator('[aria-pressed="true"]').count(),1);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-comfort-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'Who Are We Planning For?',exact:true}).waitFor();
  await page.getByRole('button',{name:'My partner',exact:true}).click();
  await page.getByRole('button',{name:'Family',exact:true}).click();
  assert.equal(await page.locator('#companionNote').isVisible(),true);
  await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();
  await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();
  await page.getByRole('heading',{name:'Who Are We Planning For?',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Family',exact:true}).getAttribute('aria-pressed'),'true');
  assert.deepEqual(store.get('account_profile_v1_planning_for').answer_json.value,['My partner','Family']);
  assert.equal(store.get('account_profile_v1_call_me').answer_json.value,'John');
  await page.getByRole('button',{name:'Skip for Now',exact:true}).click();
  await page.getByRole('heading',{name:'What Helps You Feel Connected?',exact:true}).waitFor();
  assert.equal(await page.getByLabel('What else helps you feel connected?',{exact:true}).isVisible(),false);
  await page.getByRole('button',{name:'Good conversation',exact:true}).click();
  await page.getByRole('button',{name:'Quiet time together',exact:true}).click();
  await page.getByRole('button',{name:'Something else',exact:true}).click();
  await page.getByLabel('What else helps you feel connected?',{exact:true}).fill('Making music together');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-connection-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'Your Timing & Rhythm',exact:true}).waitFor();
  await page.getByRole('button',{name:'Weekday evenings',exact:true}).click();
  await page.getByRole('button',{name:'Weekend mornings',exact:true}).click();
  await page.getByRole('button',{name:'A few hours',exact:true}).click();
  await page.getByRole('button',{name:'A day or two',exact:true}).click();
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  assert.equal(store.get('account_profile_v1_planning_notice').answer_json.value,'A day or two');
  await page.getByRole('heading',{name:'Your Energy & Pace',exact:true}).waitFor();
  await page.getByRole('button',{name:'Easy & relaxed',exact:true}).click();
  await page.getByRole('button',{name:'It depends on the day',exact:true}).click();
  await page.getByRole('button',{name:'An hour or two',exact:true}).click();
  await page.getByRole('button',{name:'Half a day',exact:true}).click();
  await page.getByLabel('Is there anything that could make an experience physically uncomfortable for you?',{exact:true}).fill('Standing for long periods');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const descriptions=await page.locator('#question-energy_pace .choices button').evaluateAll(buttons=>buttons.every(b=>{const id=b.getAttribute('aria-describedby');return !!id&&!!document.getElementById(id)}));assert(descriptions);
  await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-energy-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();
  await page.getByRole('heading',{name:'Your Energy & Pace',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Half a day',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByLabel('Is there anything that could make an experience physically uncomfortable for you?',{exact:true}).inputValue(),'Standing for long periods');
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'Your Social Comfort',exact:true}).waitFor();
  await page.getByRole('button',{name:'Just us',exact:true}).click();await page.getByRole('button',{name:'Big crowds are fine',exact:true}).click();
  const meeting=page.getByRole('group',{name:'How do you feel about meeting or interacting with new people during an experience?',exact:true});assert.equal(await meeting.locator('[aria-pressed="true"]').count(),0);
  await meeting.getByRole('button',{name:'Sometimes',exact:true}).click();await meeting.getByRole('button',{name:'Only if it happens naturally',exact:true}).click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-social-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'Your Food & Dining Style',exact:true}).waitFor();
  await page.getByRole('button',{name:'I know what I like',exact:true}).click();await page.getByRole('button',{name:'I love discovering new foods',exact:true}).click();
  await page.getByRole('button',{name:'Coffee shops & bakeries',exact:true}).click();await page.getByRole('button',{name:'Picnics & outdoor dining',exact:true}).click();
  await page.getByLabel('Foods I don’t like or don’t want',{exact:true}).fill('Olives');await page.getByLabel('Foods I can’t have or must avoid',{exact:true}).fill('Peanuts');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-food-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();
  await page.getByRole('heading',{name:'Your Food & Dining Style',exact:true}).waitFor();assert.equal(await page.getByLabel('Foods I can’t have or must avoid',{exact:true}).inputValue(),'Peanuts');assert.equal(await page.getByLabel('Foods I don’t like or don’t want',{exact:true}).inputValue(),'Olives');
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'What Are You Into?',exact:true}).waitFor();
  await page.getByRole('button',{name:'Gardening & farms',exact:true}).click();await page.getByRole('button',{name:'Classes & learning',exact:true}).click();
  assert.equal(await page.getByLabel('What else do you already enjoy?',{exact:true}).isVisible(),false);
  await page.getByRole('button',{name:'Something else — Tell HEART STONE',exact:true}).click();
  await page.getByLabel('What else do you already enjoy?',{exact:true}).fill('Board game cafes');await page.getByLabel('What are you curious about, even if you haven’t tried it yet?',{exact:true}).fill('Pottery, sailing');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-interests-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();
  await page.getByRole('heading',{name:'What Are You Into?',exact:true}).waitFor();assert.equal(await page.getByLabel('What are you curious about, even if you haven’t tried it yet?',{exact:true}).inputValue(),'Pottery, sailing');assert.equal(await page.getByRole('button',{name:'Gardening & farms',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(store.get('account_profile_v1_curious_interests').answer_json.value,'Pottery, sailing');assert.equal(store.has('account_profile_v1_interests'),false);
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'How Far Should We Go?',exact:true}).waitFor();
  const lodging=page.getByRole('group',{name:'When you stay overnight, what kinds of places feel most like you?',exact:true});assert.equal(await lodging.isVisible(),false);
  await page.getByRole('button',{name:'Stay close',exact:true}).click();await page.getByRole('button',{name:'Worth the drive',exact:true}).click();
  await page.getByRole('button',{name:'Maybe—show me why it’s worth it',exact:true}).click();await page.getByRole('button',{name:'Occasionally',exact:true}).click();
  await lodging.getByRole('button',{name:'Hotel',exact:true}).click();await lodging.getByRole('button',{name:'Cabin',exact:true}).click();await lodging.getByRole('button',{name:'Bed & Breakfast / Inn',exact:true}).click();await lodging.getByRole('button',{name:'Resort',exact:true}).click();
  assert.equal(await lodging.locator('[aria-pressed="true"]').count(),3);assert.equal(await lodging.getByRole('button',{name:'Resort',exact:true}).getAttribute('aria-pressed'),'false');assert((await page.locator('#lodging_preferences-limit').textContent()).includes('Pick up to 3'));
  await page.getByLabel('Put my selected places in preference order (optional)',{exact:true}).check();await page.getByRole('button',{name:'Move Cabin earlier',exact:true}).click();
  await page.getByRole('button',{name:'Not really my thing',exact:true}).click();assert.equal(await lodging.isVisible(),false);
  await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();
  await page.getByRole('heading',{name:'How Far Should We Go?',exact:true}).waitFor();assert.equal(await lodging.isVisible(),false);assert.deepEqual(store.get('account_profile_v1_lodging_preferences').answer_json.value,['Cabin','Hotel','Bed & Breakfast / Inn']);
  await page.getByRole('button',{name:'Occasionally',exact:true}).click();assert.equal(await page.getByLabel('Put my selected places in preference order (optional)',{exact:true}).isChecked(),true);assert.equal(await page.locator('#lodging_preferences-order li span').first().textContent(),'Cabin');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-travel-'+width+'.png'),fullPage:true});
  await page.locator('#question-lodging_preferences').screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-lodging-'+width+'.png')});
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'Your Spending Comfort',exact:true}).waitFor();
  await page.getByRole('button',{name:'Free is fantastic',exact:true}).click();await page.getByRole('button',{name:'Treat ourselves now and then',exact:true}).click();await page.getByRole('button',{name:'Total for both',exact:true}).click();await page.getByRole('button',{name:'Transportation & parking',exact:true}).click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-spending-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'How Do You Like Plans to Happen?',exact:true}).waitFor();
  await page.getByRole('button',{name:'I usually end up being the planner',exact:true}).click();await page.getByRole('button',{name:'Please take some of the planning off my plate',exact:true}).click();await page.getByRole('button',{name:'Give me ideas — I’ll handle the rest',exact:true}).click();await page.getByRole('button',{name:'Handle almost everything — Give me what I need and tell me where to go',exact:true}).click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-planning-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();
  await page.getByRole('heading',{name:'How Do You Like Plans to Happen?',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Please take some of the planning off my plate',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(store.get('account_profile_v1_surprise').answer_json.value,'Give Me Some Mystery');assert.equal(store.has('account_profile_v1_planning'),false);assert.equal(store.has('account_profile_v1_budget_style'),false);
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'Decision-Making & Choice Style',exact:true}).waitFor();
  await page.getByRole('button',{name:'Show Me Everything',exact:true}).click();await page.getByRole('button',{name:'Just Decide for Me',exact:true}).click();await page.getByRole('button',{name:'Yes',exact:true}).click();
  assert.equal(await page.getByRole('group',{name:'When HEART STONE finds great possibilities, how would you usually like us to help you choose?',exact:true}).locator('[aria-pressed="true"]').count(),1);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-decisions-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'Personal Boundaries, Hard No’s & Safety Preferences',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Keep this private',{exact:true}).isChecked(),true);
  await page.getByRole('button',{name:'Crowds',exact:true}).click();await page.getByRole('button',{name:'Heights',exact:true}).click();await page.getByRole('button',{name:'Nothing comes to mind right now',exact:true}).click();
  const boundaries=page.getByRole('group',{name:'Anything you’d rather HEART STONE avoid?',exact:true});assert.equal(await boundaries.locator('[aria-pressed="true"]').count(),1);
  await page.getByRole('button',{name:'Heights',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Nothing comes to mind right now',exact:true}).getAttribute('aria-pressed'),'false');
  await page.getByLabel('Keep this private',{exact:true}).uncheck();assert.equal(await page.locator('input[required],textarea[required]').count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-boundaries-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();
  await page.getByRole('heading',{name:'Personal Boundaries, Hard No’s & Safety Preferences',exact:true}).waitFor();assert.equal(await page.getByLabel('Keep this private',{exact:true}).isChecked(),false);assert.equal(await page.getByRole('button',{name:'Heights',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(store.has('account_profile_v1_hard_no_details'),false);
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'Accessibility, Accommodations & Experience Needs',exact:true}).waitFor();assert.equal(await page.getByLabel('Keep this private',{exact:true}).isChecked(),true);
  await page.getByRole('button',{name:'Minimal walking',exact:true}).click();await page.getByRole('button',{name:'Easy restroom access',exact:true}).click();await page.getByRole('button',{name:'No accommodations right now',exact:true}).click();
  const needs=page.getByRole('group',{name:'Is there anything HEART STONE should consider to make experiences more comfortable or accessible for you?',exact:true});assert.equal(await needs.locator('[aria-pressed="true"]').count(),1);
  await page.getByRole('button',{name:'Step-free/wheelchair-friendly access',exact:true}).click();assert.equal(await page.getByRole('button',{name:'No accommodations right now',exact:true}).getAttribute('aria-pressed'),'false');
  await page.locator('#accommodation_details').fill('PRIVATE practical access note');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-accessibility-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();
  await page.getByRole('heading',{name:'Accessibility, Accommodations & Experience Needs',exact:true}).waitFor();assert.equal(await page.locator('#accommodation_details').inputValue(),'PRIVATE practical access note');assert.equal(await page.getByLabel('Keep this private',{exact:true}).isChecked(),true);assert.equal(store.get('account_profile_v1_decisions').answer_json.value,'Just Decide for Me');assert.equal(store.get('account_profile_v1_boundaries_private').answer_json.value,false);
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('heading',{name:'Special Occasions, Traditions & Meaningful Dates',exact:true}).waitFor();
  await page.getByRole('button',{name:'Memorial/remembrance dates',exact:true}).click();await page.locator('#occasion_1_name').fill('PRIVATE tradition');await page.locator('#occasion_1_date').fill('First Sunday in May');await page.locator('#question-occasion_1_handling').getByRole('button',{name:"This matters to me, but I don't want a reminder",exact:true}).click();
  await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();assert.equal(await page.locator('#occasion_1_date').inputValue(),'First Sunday in May');
  for(const [title,shot] of [['Special Occasions, Traditions & Meaningful Dates','occasions'],['Gifts, Giving & Thoughtfulness Style','thoughtfulness'],['Memory, Keepsakes & Story Preferences','memories']]){
   await page.getByRole('heading',{name:title,exact:true}).waitFor();
   if(shot==='thoughtfulness'){await page.locator('#question-thoughtful_receiving').getByRole('button',{name:'I’d rather not receive gifts',exact:true}).click();await page.locator('#question-thoughtful_giving').getByRole('button',{name:'Acts of service',exact:true}).click();await page.getByRole('button',{name:'No thanks',exact:true}).click();}
   if(shot==='memories'){await page.getByRole('button',{name:'I mostly just enjoy the moment',exact:true}).click();await page.getByRole('button',{name:'Only when I ask',exact:true}).click();await page.getByRole('button',{name:'Never',exact:true}).click();}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-'+shot+'-'+width+'.png'),fullPage:true});await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  }
  assert.equal(store.get('account_profile_v1_memory_followup').answer_json.value,'Never');
  for(const [title,shot] of [['Learning, Growth & Curiosity Style','learning'],['Surprise, Spontaneity & Control','surprise-control'],['Communication & Connection Style','communication']]){
   await page.getByRole('heading',{name:title,exact:true}).waitFor();
   if(shot==='learning'){await page.getByRole('button',{name:'Learn a new skill',exact:true}).click();await page.getByRole('button',{name:'Just for fun',exact:true}).click();await page.getByRole('button',{name:'No',exact:true}).click();}
   if(shot==='surprise-control'){
    await page.getByRole('button',{name:'Where we go',exact:true}).click();await page.getByRole('button',{name:"I'd rather know the details",exact:true}).click();assert.equal(await page.getByRole('button',{name:'Where we go',exact:true}).getAttribute('aria-pressed'),'false');
    await page.getByRole('button',{name:'Cost',exact:true}).click();await page.getByRole('button',{name:'Nothing—keep the surprise',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Cost',exact:true}).getAttribute('aria-pressed'),'false');await page.getByRole('button',{name:'Cost',exact:true}).click();await page.getByRole('button',{name:"Don't tell me—just lead the way",exact:true}).click();
    await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Cost',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(store.get('account_profile_v1_surprise').answer_json.value,'Give Me Some Mystery');
   }
   if(shot==='communication'){await page.getByRole('button',{name:'Quiet time together',exact:true}).click();await page.getByRole('button',{name:'Just being present',exact:true}).click();await page.getByRole('button',{name:'Not much — I’d rather focus on what we’re doing',exact:true}).click();await page.getByRole('button',{name:'No thanks',exact:true}).click();}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-'+shot+'-'+width+'.png'),fullPage:true});await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  }
  assert.equal(store.get('account_profile_v1_conversation_help').answer_json.value,'No thanks');assert.equal(store.get('account_profile_v1_discovery_openness').answer_json.value,'No');
  for(const [title,shot] of [['Social Battery & Recovery Style','recovery'],['Weather, Environment & Setting Preferences','environment'],['Transportation & Getting There Style','transportation']]){
   await page.getByRole('heading',{name:title,exact:true}).waitFor();
   if(shot==='recovery'){await page.getByRole('button',{name:'Head home and recharge',exact:true}).click();await page.getByRole('button',{name:'Take a break, then continue',exact:true}).click();await page.getByRole('button',{name:'One main experience is plenty',exact:true}).click();await page.getByRole('button',{name:'Yes, definitely',exact:true}).click();}
   if(shot==='environment'){await page.getByRole('button',{name:'Outdoors in nature',exact:true}).click();await page.getByRole('button',{name:'Indoor/cozy',exact:true}).click();await page.getByRole('button',{name:"I'd rather be comfortable",exact:true}).click();await page.getByRole('button',{name:'Rain',exact:true}).click();await page.getByRole('button',{name:'Nothing in particular',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Rain',exact:true}).getAttribute('aria-pressed'),'false');await page.getByRole('button',{name:'Rain',exact:true}).click();}
   if(shot==='transportation'){
    await page.getByRole('button',{name:'I prefer my partner to drive',exact:true}).click();await page.getByRole('button',{name:'Rideshare/taxi',exact:true}).click();await page.getByRole('button',{name:'Scenic routes are worth extra time',exact:true}).click();await page.getByRole('button',{name:'Minimize walking from parking',exact:true}).click();await page.getByRole('button',{name:'Nothing in particular',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Minimize walking from parking',exact:true}).getAttribute('aria-pressed'),'false');await page.getByRole('button',{name:'Need room for equipment or belongings',exact:true}).click();
    await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Rideshare/taxi',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.getByRole('button',{name:'Need room for equipment or belongings',exact:true}).getAttribute('aria-pressed'),'true');
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-'+shot+'-'+width+'.png'),fullPage:true});await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  }
  assert.equal(store.get('account_profile_v1_breathing_room').answer_json.value,'Yes, definitely');assert.deepEqual(store.get('account_profile_v1_weather_avoid').answer_json.value,['Rain']);
  for(const [title,shot] of [['Time-of-Day & Experience Timing Style','daytime'],['Familiar Places vs. New Discoveries','familiarity'],['Comfort With Cost Changes & Upgrades','upgrades'],['Who We Enjoy Experiences With','companions']]){
   await page.getByRole('heading',{name:title,exact:true}).waitFor();
   if(shot==='daytime'){await page.getByRole('button',{name:'Morning',exact:true}).click();await page.getByRole('button',{name:'Sunset',exact:true}).click();await page.locator('#daytime_ideas').fill('Morning markets');await page.getByRole('button',{name:'It depends',exact:true}).click();}
   if(shot==='familiarity'){
    await page.getByRole('button',{name:'Mix favorites with new discoveries',exact:true}).click();await page.locator('#favorite_places').fill('PRIVATE favorite park');assert.equal(await page.locator('#question-past_place_1_feedback').isVisible(),false);await page.locator('#past_place_1_name').fill('PRIVATE old venue');await page.getByRole('button',{name:'Never suggest again',exact:true}).click();await page.locator('#past_place_1_name').fill('PRIVATE different venue');assert.equal(await page.getByRole('button',{name:'Never suggest again',exact:true}).getAttribute('aria-pressed'),'false');await page.getByRole('button',{name:'Not for us',exact:true}).click();
    await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();assert.equal(await page.locator('#past_place_1_name').inputValue(),'PRIVATE different venue');assert.equal(await page.getByRole('button',{name:'Not for us',exact:true}).getAttribute('aria-pressed'),'true');
   }
   if(shot==='upgrades'){await page.getByRole('button',{name:'Ask me first',exact:true}).click();await page.getByRole('button',{name:'Always show me the better value',exact:true}).click();await page.getByRole('button',{name:'Don’t optimize around price unless I ask',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Always show me the better value',exact:true}).getAttribute('aria-pressed'),'false');}
   if(shot==='companions'){await page.getByRole('button',{name:'Just the two of us',exact:true}).click();await page.getByRole('button',{name:'Our children',exact:true}).click();await page.getByRole('button',{name:'Very important',exact:true}).click();await page.getByRole('button',{name:'Keep DATE QUEST focused on us',exact:true}).click();}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-'+shot+'-'+width+'.png'),fullPage:true});await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  }
  assert.equal(store.get('account_profile_v1_suggest_others').answer_json.value,'Keep DATE QUEST focused on us');assert.equal(store.get('account_profile_v1_planning_notice').answer_json.value,'A day or two');
  await page.getByRole('heading',{name:'Your profile grows with you',exact:true}).waitFor();
  await page.getByRole('button',{name:'My Profile',exact:true}).click();await page.getByRole('heading',{name:'Choose a profile topic',exact:true}).waitFor();assert.equal(await page.locator('#profileTopicList button').count(),28);assert.equal(await page.locator('details').getAttribute('open'),null);
  await page.getByLabel('Find a profile topic',{exact:true}).fill('No such topic');assert.equal(await page.locator('#profileTopicEmpty').isVisible(),true);await page.getByLabel('Find a profile topic',{exact:true}).fill('food');assert.equal(await page.locator('#profileTopicList button:visible').count(),1);
  await page.locator('#profileTopicList').getByRole('button',{name:'Your Food & Dining Style',exact:true}).click();await page.getByRole('heading',{name:'Your Food & Dining Style',exact:true}).waitFor();assert.equal(await page.locator('#food_requirements').inputValue(),'Peanuts');
  await page.getByRole('button',{name:'Save & Finish Later',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Continue Getting Started',exact:true}).click();await page.getByRole('heading',{name:'Your Food & Dining Style',exact:true}).waitFor();await page.getByRole('button',{name:'My Profile',exact:true}).click();
  await page.getByLabel('Find a profile topic',{exact:true}).fill('');assert.equal(await page.locator('#profileTopicList button:visible').count(),28);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TMPDIR||'/tmp','profile-topics-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Review My Profile',exact:true}).click();
  await page.getByRole('button',{name:'Edit A Little About You',exact:true}).click();
  failSave=true;await page.getByLabel('What should I call you?',{exact:true}).fill('Jeffrey');
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('button',{name:'Retry Save',exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'A Little About You',exact:true}).count(),1);
  assert(await page.getByRole('button',{name:'Leave without saving',exact:true}).isVisible());
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Leave without saving',exact:true}).click();
  assert(await page.getByLabel('What should I call you?',{exact:true}).isVisible());
  failSave=false;await page.getByRole('button',{name:'Retry Save',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('status').textContent==='Saved to your private account.');
  assert.equal(await page.getByRole('button',{name:'Retry Save',exact:true}).isVisible(),false);
  assert.equal(await page.getByRole('button',{name:'Leave without saving',exact:true}).isVisible(),false);
  assert.equal(store.get('account_profile_v1_call_me').answer_json.value,'Jeffrey');
  assert.equal(await page.getByRole('progressbar').count(),0);assert.deepEqual(errors,[]);await browser.close();browser=null;
 }
 console.log('PASS: Chromium 320/390/1280px screens, selections, private save/resume, optional skip, failure/retry, and no overflow or script errors.');
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});

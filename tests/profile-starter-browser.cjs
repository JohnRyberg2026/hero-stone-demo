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
  await page.getByRole('heading',{name:'Your profile grows with you',exact:true}).waitFor();
  await page.getByRole('button',{name:'Review My Profile',exact:true}).click();
  await page.getByRole('button',{name:'Edit A Little About You',exact:true}).click();
  failSave=true;await page.getByLabel('What should I call you?',{exact:true}).fill('Jeffrey');
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await page.getByRole('button',{name:'Retry Save',exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'A Little About You',exact:true}).count(),1);
  failSave=false;await page.getByRole('button',{name:'Retry Save',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('status').textContent==='Saved to your private account.');
  assert.equal(await page.getByRole('button',{name:'Retry Save',exact:true}).isVisible(),false);
  assert.equal(store.get('account_profile_v1_call_me').answer_json.value,'Jeffrey');
  assert.equal(await page.getByRole('progressbar').count(),0);assert.deepEqual(errors,[]);await browser.close();browser=null;
 }
 console.log('PASS: Chromium 320/390/1280px screens, selections, private save/resume, optional skip, failure/retry, and no overflow or script errors.');
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});

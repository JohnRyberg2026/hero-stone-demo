const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {enterAdultDemo,isolateBrowser}=require('./tools/browser-adult-entry.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.QUEST_CHROMIUM_PATH?{executablePath:process.env.QUEST_CHROMIUM_PATH,args:['--no-sandbox']}: {})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await isolateBrowser(page);
  await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:'window.supabase={createClient:()=>window.__sharedMock};'}));
  await page.addInitScript(()=>{
   const state=window.__sharedFixture={user:'one',listeners:[],calls:[],date:null,fail:false};
   const names={one:'Organizer Fictional',two:'Guest Two Fictional',three:'Guest Three Fictional'};
   window.__sharedMock={auth:{getUser:async()=>({data:{user:{id:state.user}}}),onAuthStateChange:fn=>{state.listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}};}},rpc:async(name,args)=>{
    state.calls.push({name,args:structuredClone(args)});
    if(state.fail)return {error:{message:'Fictional uncertain request'}};
    if(name==='shared_date_candidates')return {data:{self:{id:state.user,name:names[state.user]},people:['two','three'].map(id=>({id,name:names[id]}))}};
    const op=args.p_operation;
    if(op==='list')return {data:state.date?[structuredClone(state.date)]:[]};
    if(op==='create'||op==='revise')state.date={...args.p_payload,id:'fictional-date',revision:(state.date?.revision||0)+1,organizer:'one',state:'draft',participants:args.p_payload.participants.map(id=>({id,name:names[id],response:id==='one'?'pending':null}))};
    if(op==='send')state.date={...state.date,state:'pending',participants:state.date.participants.map(p=>({...p,response:p.id==='one'?'accepted':null}))};
    if(op==='respond')state.date={...state.date,state:'closed'};
    return {data:structuredClone(state.date)};
   }};
  });
  await page.goto('http://127.0.0.1:8765/shared-dates.html');await enterAdultDemo(page);
  assert.equal(await page.evaluate(()=>__sharedFixture.calls.length),0);
  await page.locator('#connectSharedAccount').click();await page.locator('#newAccountDate').click();
  await page.locator('#accountDateTitle').fill('Fictional dinner <script>');
  await page.locator('#accountDateWhen').fill('Friday 6 PM Eastern');await page.locator('#accountDateMeeting').fill('Fictional park');
  await page.locator('#accountPeople input').nth(0).check();await page.locator('#accountPeople input').nth(1).check();
  await page.locator('#saveAccountDate').click();await page.locator('#accountDateDetail').waitFor({state:'visible'});
  assert.equal(await page.locator('#accountRoster li').count(),3);assert.equal(await page.locator('#accountDetailTitle').textContent(),'Fictional dinner <script>');
  assert.equal(await page.evaluate(()=>__sharedFixture.calls.filter(c=>c.args.p_operation==='send').length),0);
  await page.locator('#reviewAccountSend').click();await page.locator('#accountSendReview').waitFor({state:'visible'});
  assert.equal(await page.locator('#accountSendSnapshot li').count(),3);
  await page.keyboard.press('Escape');assert(!(await page.locator('#accountSendReview').isVisible()));
  assert.equal(await page.evaluate(()=>__sharedFixture.calls.filter(c=>c.args.p_operation==='send').length),0);
  await page.locator('#reviewAccountSend').click();await page.locator('#confirmAccountSend').click();
  await page.waitForFunction(()=>document.querySelector('#accountDetailState').textContent.includes('Waiting'));
  assert.equal(await page.locator('#accountRoster li').filter({hasText:'Response private'}).count(),2);
  assert(await page.locator('[data-account-response=withdrawn]').isVisible());
  await page.locator('#editAccountDate').click();await page.locator('#accountDateTitle').fill('Unsaved change');await page.locator('#cancelAccountEdit').click();
  assert.equal(await page.locator('#accountDetailTitle').textContent(),'Fictional dinner <script>');
  assert.equal(await page.evaluate(()=>__sharedFixture.calls.filter(c=>c.args.p_operation==='revise').length),0);
  await page.evaluate(()=>{__sharedFixture.fail=true;});await page.locator('[data-account-response=withdrawn]').click();
  await page.waitForFunction(()=>document.querySelector('#sharedAccountFeedback').textContent.includes('uncertain'));
  assert.equal(await page.locator('#accountDetailState').textContent(),'Waiting for everyone to decide.');
  await page.evaluate(()=>{__sharedFixture.user='other';__sharedFixture.listeners.forEach(fn=>fn('SIGNED_IN',{user:{id:'other'}}));});
  assert(!(await page.locator('#accountDateDetail').isVisible()));assert.equal(await page.locator('#accountRoster li').count(),0);
  assert.equal(await page.locator('#accountDateTitle').inputValue(),'');assert.equal(await page.locator('#accountSendSnapshot li').count(),0);
  assert.equal(errors.length,0,errors.join('; '));
  console.log('PASS: real shared-date UI/transport with fictional RPC: three adults, explicit review/send, Escape cancellation, private responses, unsaved cancel, uncertain withdrawal and account-change clearing. Server authorization is covered separately.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

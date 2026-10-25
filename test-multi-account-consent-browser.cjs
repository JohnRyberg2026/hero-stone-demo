// Three isolated browser sessions against a fictional transport using the pure
// workflow model. This does not replace SQL authorization/concurrency testing.
const assert=require('node:assert/strict'),{chromium}=require('playwright'),M=require('./shared-date-model.js'),{isolateBrowser,enterAdultDemo}=require('./tools/browser-adult-entry.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const names={one:'Organizer Fictional',two:'Guest Two Fictional',three:'Guest Three Fictional'},calls=[],errors=[];
 let date=M.create({id:'fixture-date',organizer:'one',participants:Object.keys(names),title:'Our evening',when:'Friday 6 PM Eastern',meeting:'Fictional park'});date=M.send(date,'one',1);
 function view(actor){const d=M.view(date,actor);if(d.state==='draft'&&actor!==d.organizer)throw Error('This draft is private.');d.participants=d.participants.map(p=>({...p,name:names[p.id],response:p.id===actor?p.response:null}));return d;}
 async function rpc(actor,name,args){calls.push({actor,name,args:structuredClone(args)});try{
  if(args.p_expected_user!==actor)throw Error('Wrong account');
  if(name==='shared_date_candidates')return {data:{self:{id:actor,name:names[actor]},people:Object.keys(names).filter(id=>id!==actor).map(id=>({id,name:names[id]}))}};
  const op=args.p_operation,rev=args.p_expected_revision;
  if(op==='list')return {data:date.state==='draft'&&actor!=='one'?[]:[view(actor)]};
  if(op==='view')return {data:view(actor)};
  if(op==='respond')date=M.respond(date,actor,args.p_payload.response,rev);
  else if(op==='revise')date=M.revise(date,actor,args.p_payload,rev);
  else if(op==='send')date=M.send(date,actor,rev);
  else if(op==='begin')date=M.begin(date,actor,rev);
  else if(op==='stop')date=M.stop(date,actor,rev);
  else throw Error('Unexpected operation '+op);
  return {data:view(actor)};
 }catch(e){return {error:{message:e.message}};}}
 const pages={};
 for(const actor of Object.keys(names)){
  const context=await browser.newContext({viewport:actor==='one'?{width:1280,height:900}:{width:390,height:844}});await context.exposeBinding('fixtureRpc',(_,name,args)=>rpc(actor,name,args));const page=await context.newPage();pages[actor]=page;page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await isolateBrowser(page);
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'application/javascript',body:`window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:${JSON.stringify(actor)}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:(name,args)=>window.fixtureRpc(name,args)})};`}));
  await page.goto('http://127.0.0.1:8765/shared-dates.html');await enterAdultDemo(page);await page.locator('#connectSharedAccount').click();await page.locator('#accountDateButtons button').click();assert.equal(await page.locator('#accountRoster li').count(),3);assert.equal(await page.locator('#accountRoster li').filter({hasText:'Response private'}).count(),2);assert(await page.locator('#beginAccountDate').isHidden());
 }
 const {one,two,three}=pages;
 await two.locator('[data-account-response=accepted]').click();await two.waitForFunction(()=>document.querySelector('#accountRoster').textContent.includes('You accepted'));assert.equal(date.state,'pending');assert(await two.locator('#beginAccountDate').isHidden());
 // Revise while the third account still displays round one. It must not accept
 // the new round using the old screen's revision.
 await one.locator('#editAccountDate').click();await one.locator('#accountDateMeeting').fill('Different fictional meeting place');await one.locator('#saveAccountDate').click();await one.waitForFunction(()=>document.querySelector('#accountDateRevision').textContent.includes('2'));assert(date.participants.every(p=>p.response==='pending'));assert.equal(date.participants.length,3);
 await three.locator('[data-account-response=accepted]').click();await three.waitForFunction(()=>document.querySelector('#sharedAccountFeedback').textContent.includes('changed'));assert.equal(date.state,'draft');assert(date.participants.every(p=>p.response==='pending'));
 await one.locator('#reviewAccountSend').click();await one.locator('#confirmAccountSend').click();await one.waitForFunction(()=>document.querySelector('#accountDetailState').textContent.includes('Waiting'));
 for(const page of [two,three]){await page.locator('#refreshAccountDates').click();await page.waitForFunction(()=>document.querySelector('#accountDateRevision').textContent.includes('2'));assert((await page.locator('#accountDetailMeeting').textContent()).includes('Different fictional'));assert(await page.locator('[data-account-response=accepted]').isVisible());assert(await page.locator('#beginAccountDate').isHidden());}
 await two.locator('[data-account-response=accepted]').click();await two.waitForFunction(()=>document.querySelector('#accountRoster').textContent.includes('You accepted'));assert.equal(date.state,'pending');assert(await two.locator('#beginAccountDate').isHidden());
 await three.locator('[data-account-response=accepted]').click();await three.locator('#beginAccountDate').waitFor({state:'visible'});assert.equal(date.state,'confirmed');assert.equal(calls.filter(c=>c.args.p_operation==='begin').length,0);
 await three.locator('#beginAccountDate').click();await three.locator('#stopAccountDate').waitFor({state:'visible'});assert.equal(date.state,'started');
 await two.locator('#refreshAccountDates').click();await two.locator('#stopAccountDate').waitFor({state:'visible'});await two.locator('#stopAccountDate').click();await two.waitForFunction(()=>document.querySelector('#accountDetailState').textContent.includes('stopped'));assert.equal(date.state,'stopped');assert.equal(date.participants.length,3);assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS: three isolated accounts, complete roster/private responses, no early begin, revision resets approvals, stale acceptance rejected, fresh independent acceptance, explicit begin and participant stop. Fictional transport only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

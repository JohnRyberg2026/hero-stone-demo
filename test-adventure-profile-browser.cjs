const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {isolateBrowser}=require('./tools/browser-adult-entry.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await isolateBrowser(page);
   await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:'window.supabase={createClient:()=>window.__profileClient};'}));
   await page.addInitScript(()=>{
    const s=window.__profileFixture={user:'A',listeners:[],reads:[],hold:false,release:null,fail:false};
    window.__profileClient={auth:{getUser:async()=>({data:{user:s.user?{id:s.user}:null}}),onAuthStateChange:fn=>s.listeners.push(fn)},from:()=>({select:()=>({eq:(_,id)=>({maybeSingle:async()=>{
     s.reads.push(id);if(s.hold&&id==='A')await new Promise(resolve=>s.release=resolve);
     if(s.fail)return {error:{message:'Fictional failure'}};
     return {data:{account_id:id,revision:id==='A'?3:7,boundaries:{minimalWalking:true},interests:['Private fictional interest']}};
    }})})})};
   });
   await page.goto('http://127.0.0.1:8765/adventure-profile-preview.html');
   await page.waitForFunction(()=>document.querySelector('#statusRevision').textContent==='Saved revision: 3');
   assert(!(await page.locator('main').textContent()).includes('Private fictional interest'));
   await page.evaluate(()=>{__profileFixture.hold=true;});await page.locator('#refresh').click();
   await page.waitForFunction(()=>typeof __profileFixture.release==='function');
   await page.evaluate(()=>{__profileFixture.user='B';__profileFixture.listeners.forEach(fn=>fn('SIGNED_IN',{user:{id:'B'}}));});
   await page.waitForFunction(()=>document.querySelector('#statusRevision').textContent==='Saved revision: 7');
   await page.evaluate(()=>__profileFixture.release());
   // Wait for the older async read to finish and confirm it cannot replace B.
   await page.waitForTimeout(100);assert.equal(await page.locator('#statusRevision').textContent(),'Saved revision: 7');
   await page.evaluate(()=>{__profileFixture.fail=true;});await page.locator('#refresh').click();
   await page.waitForFunction(()=>document.querySelector('#statusHeading').textContent==='Unavailable');assert.equal(await page.locator('#statusRevision').textContent(),'');
   await page.evaluate(()=>{__profileFixture.user=null;__profileFixture.listeners.forEach(fn=>fn('SIGNED_OUT',null));});
   await page.waitForFunction(()=>document.querySelector('#statusHeading').textContent==='Sign in required');
   assert.equal(await page.locator('#statusRevision').textContent(),'');assert.equal(errors.length,0,errors.join('; '));
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'No horizontal overflow');await page.close();
  }
  console.log('PASS: mobile/desktop real preview, fictional accounts, delayed old-account suppression, unavailable/sign-out clearing, no private interest disclosure or page errors. No live database tested.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

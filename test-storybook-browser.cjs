const assert=require('node:assert/strict'),{chromium}=require('playwright'),{isolateBrowser}=require('./tools/browser-adult-entry.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await isolateBrowser(page);
 await page.goto('http://127.0.0.1:8765/storybook-preview.html');await page.locator('#bookYear').fill('2026');await page.locator('#bookForm button').click();assert.equal(await page.locator('#chapters button').count(),12);
 await page.locator('#newMoment').click();await page.locator('#momentDate').fill('2026-01-31');await page.locator('#momentText').fill('My own afternoon <script>');await page.locator('#momentForm button[type=submit]').click();
 assert.equal(await page.locator('#chapterTitle').textContent(),'January · 2026');assert.equal(await page.locator('#moments article').count(),1);assert.equal(await page.locator('#moments article p').textContent(),'My own afternoon <script>');
 await page.locator('#moments button').click();assert(await page.locator('#momentDate').isDisabled());await page.locator('#momentText').fill('Changed later');await page.locator('#cancelMoment').click();assert.equal(await page.locator('#moments article p').textContent(),'My own afternoon <script>');
 await page.locator('#moments button').click();await page.locator('#momentText').fill('Corrected later');await page.locator('#momentForm button[type=submit]').click();assert.equal(await page.locator('#moments h4').textContent(),'2026-01-31');
 await page.getByRole('button',{name:'February',exact:true}).click();assert.equal(await page.locator('#moments article').count(),0);await page.getByRole('button',{name:'January',exact:true}).click();assert.equal(await page.locator('#moments article p').textContent(),'Corrected later');
 assert.equal(await page.evaluate(()=>localStorage.length),0);assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));assert.equal(errors.length,0,errors.join('; '));
 await page.locator('#resetBook').click();assert.equal(await page.locator('#moments article').count(),0);assert(await page.locator('#bookSetup').isVisible());
 console.log('PASS: Story Book mobile preview: 12 chapters, explicit note capture, text-safe rendering, original-date editing, cancel, discard, no persistent storage or overflow.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

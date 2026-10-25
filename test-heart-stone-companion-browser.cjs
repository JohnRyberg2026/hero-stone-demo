const assert=require('node:assert/strict'),{chromium}=require('playwright'),{isolateBrowser}=require('./tools/browser-adult-entry.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await isolateBrowser(page);
 await page.addInitScript(()=>{window.__speechCalls=0;if(window.speechSynthesis)window.speechSynthesis.speak=()=>window.__speechCalls++;});
 await page.goto('http://127.0.0.1:8765/storybook-preview.html');
 assert(await page.locator('#meetHeartStone').isVisible());assert(!(await page.locator('#heartStoneGuide').isVisible()));assert.equal(await page.evaluate(()=>__speechCalls),0);assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
 await page.locator('#heartStoneMotion').click();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);assert.equal(await page.locator('#heartStoneMotion').getAttribute('aria-pressed'),'false');
 await page.locator('#bookTitle').fill('My untouched draft');await page.locator('#meetHeartStone').click();assert(await page.locator('#heartStoneGuide').isVisible());await page.locator('#startHeartStoneTour').click();
 assert((await page.locator('#heartStoneGuideMessage').textContent()).includes('twelve monthly chapters'));await page.locator('#nextHeartStoneStep').click();const paused=await page.locator('#heartStoneGuideMessage').textContent();await page.keyboard.press('Escape');assert(!(await page.locator('#heartStoneGuide').isVisible()));
 await page.locator('#meetHeartStone').click();assert.equal(await page.locator('#heartStoneGuideMessage').textContent(),paused);await page.locator('#nextHeartStoneStep').click();assert((await page.locator('#heartStoneGuideMessage').textContent()).includes('explicitly save'));await page.locator('#nextHeartStoneStep').click();assert(!(await page.locator('#heartStoneGuide').isVisible()));
 await page.locator('#hideHeartStone').click();assert(!(await page.locator('#meetHeartStone').isVisible()));await page.locator('#restoreHeartStone').click();assert(await page.locator('#meetHeartStone').isVisible());
 assert.equal(await page.locator('#bookTitle').inputValue(),'My untouched draft');assert.equal(await page.evaluate(()=>localStorage.length),0);assert.equal(await page.evaluate(()=>__speechCalls),0);assert.equal(errors.length,0,errors.join('; '));assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
 await page.emulateMedia({reducedMotion:'no-preference'});assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
 await page.locator('#heartStoneMotion').click();await page.waitForFunction(()=>document.getAnimations().some(a=>a.playState==='running'));assert.equal(await page.locator('#heartStoneMotion').getAttribute('aria-pressed'),'true');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getAnimations().length===0);assert.equal(await page.locator('#heartStoneMotion').getAttribute('aria-pressed'),'false');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#heartStoneMotion').click();await page.getByRole('button',{name:'Sit still',exact:true}).click();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);assert.equal(await page.evaluate(()=>__speechCalls),0);
 console.log('PASS: quiet invited heart companion, no automatic speech/animation, optional tour, Escape/pause/resume, hide/restore, draft preservation and reduced-motion mobile layout.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

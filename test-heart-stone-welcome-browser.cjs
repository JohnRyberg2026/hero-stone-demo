const assert=require('node:assert/strict'),{chromium}=require('playwright'),{isolateBrowser,enterAdultDemo}=require('./tools/browser-adult-entry.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await isolateBrowser(page);
 await page.goto('http://127.0.0.1:8765/heart-stone-welcome-preview.html');await enterAdultDemo(page);
 assert(!(await page.locator('#heartStoneGuide').isVisible()));assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
 const links=page.getByRole('navigation',{name:'Choose where to begin'}).getByRole('link');assert.equal(await links.count(),4);
 await page.locator('#meetHeartStone').click();assert((await page.locator('#heartStoneGuideMessage').textContent()).includes('choose where'));await page.locator('#startHeartStoneTour').click();assert((await page.locator('#heartStoneGuideMessage').textContent()).includes('Let’s Connect'));await page.keyboard.press('Escape');
 await page.getByRole('link',{name:'Our World',exact:false}).click();await page.waitForURL('**/storybook-preview.html');assert(await page.getByRole('heading',{name:'A little of your story.'}).isVisible());await page.getByRole('link',{name:'Back to the HEART STONE welcome'}).click();await page.waitForURL('**/heart-stone-welcome-preview.html');await enterAdultDemo(page);
 assert(!(await page.locator('#heartStoneGuide').isVisible()));assert.equal(await page.evaluate(()=>localStorage.length),0);assert.equal(errors.length,0,errors.join('; '));assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
 console.log('PASS: adult-gated quiet welcome, four explicit paths, optional contextual guide, Living Story Book navigation/return, no automatic motion or local storage.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__spoken=[];window.__cancels=0;
   Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Test voice',lang:'en-US',localService:true}],speak:u=>window.__spoken.push(u.text),cancel:()=>window.__cancels++,addEventListener(){},removeEventListener(){}}});
   window.SpeechSynthesisUtterance=function(text){this.text=text;};
  });
  await page.goto('http://127.0.0.1:8765/heart-stone-avatar-voice-preview.html');
  assert.equal(await page.evaluate(()=>__spoken.length),0);assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  assert(await page.locator('[data-play]').isDisabled());await page.locator('[data-enable]').check();assert(await page.locator('[data-play]').isDisabled());
  await page.locator('select').selectOption('0');await page.locator('[data-play]').click();assert.equal(await page.evaluate(()=>__spoken.length),1);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__cancels),1);
  await page.locator('[data-play]').click();await page.locator('[data-enable]').uncheck();assert.equal(await page.evaluate(()=>__cancels),2);
  const stroll=page.locator('#avatarMotionPreview button');await stroll.click();assert.equal(await stroll.getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>document.getAnimations().length),1);
  await stroll.click();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  await stroll.click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  await stroll.click();await page.emulateMedia({reducedMotion:'reduce'});assert(await stroll.isDisabled());assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  await page.emulateMedia({reducedMotion:'no-preference'});assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  await stroll.click();await page.waitForFunction(()=>document.querySelector('#avatarMotionPreview button').getAttribute('aria-pressed')==='false');
  await page.locator('[data-enable]').check();await page.locator('select').selectOption('0');await page.locator('[data-play]').click();await stroll.click();
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  assert(!(await page.locator('[data-enable]').isChecked()));assert(await page.locator('[data-play]').isDisabled());assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await page.emulateMedia({reducedMotion:'reduce'});assert(await stroll.isDisabled());await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-enable]').check();await page.locator('select').selectOption('0');await page.locator('[data-play]').click();assert.equal(await page.evaluate(()=>__spoken.length),4);await page.locator('[data-stop]').click();
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));}
  assert.equal(errors.length,0,errors.join(';'));console.log('PASS avatar preview: explicit voice opt-in, selection, Escape/disable, motion pause/finish, reduced motion and responsive widths. Speech engine simulated; audible output not tested.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

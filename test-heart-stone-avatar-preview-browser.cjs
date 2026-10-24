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
  await page.goto('http://127.0.0.1:8765/'+(process.env.AVATAR_WELCOME==='actual'?'heart-stone-welcome-preview.html':process.env.AVATAR_WELCOME?'heart-stone-avatar-welcome-preview.html':'heart-stone-avatar-voice-preview.html'));
  if(process.env.AVATAR_WELCOME){await require('./tools/browser-adult-entry.cjs').enterAdultDemo(page);assert.equal(await page.locator('nav a').count(),4);}
  assert.equal(await page.evaluate(()=>__spoken.length),0);assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  assert(!(await page.locator('#avatarSettings').isVisible()));await page.locator('#avatarSettingsToggle').click();assert.equal(await page.locator('#avatarSettingsToggle').getAttribute('aria-expanded'),'true');
  assert(await page.locator('[data-play]').isDisabled());await page.locator('[data-enable]').check();assert(await page.locator('[data-play]').isDisabled());
  await page.locator('select').selectOption('0');await page.locator('[data-play]').click();assert.equal(await page.evaluate(()=>__spoken.length),1);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__cancels),1);await page.locator('#avatarSettingsToggle').click();await page.locator('[data-enable]').check();await page.locator('select').selectOption('0');
  await page.locator('[data-play]').click();await page.locator('[data-enable]').uncheck();assert.equal(await page.evaluate(()=>__cancels),2);
  const stroll=page.locator('#avatarMotionPreview button');await stroll.click();assert.equal(await stroll.getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>document.getAnimations().length),1);assert.equal(await page.evaluate(()=>document.getAnimations()[0].effect.target.closest('#meetHeartStone')!==null),true);
  await stroll.click();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  await stroll.click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.getAnimations().length),0);await page.locator('#avatarSettingsToggle').click();
  await stroll.click();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#avatarMotionPreview button').disabled);assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  await page.emulateMedia({reducedMotion:'no-preference'});assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  await stroll.click();await page.waitForFunction(()=>document.querySelector('#avatarMotionPreview button').getAttribute('aria-pressed')==='false');
  await page.locator('[data-enable]').check();await page.locator('select').selectOption('0');await page.locator('[data-play]').click();await stroll.click();
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  assert(!(await page.locator('[data-enable]').isChecked()));assert(await page.locator('[data-play]').isDisabled());assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#avatarMotionPreview button').disabled);await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-enable]').check();await page.locator('select').selectOption('0');await page.locator('[data-play]').click();assert.equal(await page.evaluate(()=>__spoken.length),4);await page.locator('[data-stop]').click();
  // Quiet and hide must stop all three independent preview behaviors.
  await stroll.click();await page.locator('[data-play]').click();assert.equal(await page.locator('svg').count(),1);
  await page.locator('#avatarQuiet').click();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);assert(!(await page.locator('[data-enable]').isChecked()));assert(await page.locator('[data-play]').isDisabled());assert.equal(await page.locator('#heartStoneMotion').getAttribute('aria-pressed'),'false');
  await page.locator('[data-enable]').check();await page.locator('select').selectOption('0');await page.locator('[data-play]').click();await stroll.click();
  await page.locator('#hideHeartStone').click();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);assert(!(await page.locator('#avatarVoicePreview').isVisible()));assert(!(await page.locator('#avatarMotionPreview').isVisible()));
  const spokenBeforeRestore=await page.evaluate(()=>__spoken.length);await page.locator('#restoreHeartStone').click();assert(!(await page.locator('#avatarSettings').isVisible()));await page.locator('#avatarSettingsToggle').click();assert(await page.locator('#avatarVoicePreview').isVisible());assert(await page.locator('#avatarMotionPreview').isVisible());assert(!(await page.locator('[data-enable]').isChecked()));assert.equal(await page.evaluate(()=>__spoken.length),spokenBeforeRestore);assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  // Tour speech reads only an explicitly requested public step; advancing never speaks.
  await page.locator('#meetHeartStone').click();const hearStep=page.getByRole('button',{name:'Hear this step',exact:true,includeHidden:true});assert(await hearStep.isDisabled());
  await page.locator('[data-enable]').check();await page.locator('select').selectOption('0');const tourBefore=await page.evaluate(()=>__spoken.length);await hearStep.click();assert.equal(await page.evaluate(()=>__spoken.length),tourBefore+1);
  const cancelBefore=await page.evaluate(()=>__cancels);await page.locator('#startHeartStoneTour').click();await page.waitForFunction(n=>__cancels>n,cancelBefore);assert.equal(await page.evaluate(()=>__spoken.length),tourBefore+1);await hearStep.click();assert((await page.evaluate(()=>__spoken.at(-1))).includes('Let’s Connect'));
  await page.locator('#closeHeartStoneGuide').click();await page.waitForFunction(()=>document.querySelector('#heartStoneGuide').hidden);assert(await hearStep.isDisabled());
  await page.locator('#meetHeartStone').click();await page.evaluate(()=>document.querySelector('#heartStoneGuideMessage').textContent='Private content must never be read');await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Hear this step').disabled);assert.equal(await page.evaluate(()=>__spoken.length),tourBefore+2);
  await page.locator('#avatarQuiet').click();
  await page.locator('[data-enable]').check();await page.locator('select').selectOption('0');await page.locator('[data-play]').click();await stroll.click();await page.locator('#avatarSettingsToggle').click();assert(!(await page.locator('#avatarSettings').isVisible()));assert.equal(await page.evaluate(()=>document.getAnimations().length),0);await page.locator('#avatarSettingsToggle').click();assert(!(await page.locator('[data-enable]').isChecked()));
  await page.locator('[data-enable]').check();await page.locator('select').focus();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'avatarSettingsToggle');assert(!(await page.locator('#avatarSettings').isVisible()));
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));}
  assert.equal(errors.length,0,errors.join(';'));console.log('PASS avatar preview: explicit voice opt-in, selection, Escape/disable, motion pause/finish, reduced motion and responsive widths. Speech engine simulated; audible output not tested.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

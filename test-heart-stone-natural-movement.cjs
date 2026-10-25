'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch(process.env.AVATAR_CHROMIUM?{executablePath:process.env.AVATAR_CHROMIUM,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:true}:{headless:true});
 try{
  for(const width of [390,1280])for(const file of ['heart-stone-natural-movement.html','heart-stone-natural-movement-device.html']){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.join(__dirname,file));
   const play=page.locator('#play'),canvas=page.locator('canvas');await play.waitFor();
   await page.waitForFunction(()=>!document.getElementById('play').disabled);
   assert.equal(await canvas.getAttribute('data-frame'),'0');
   await play.click();await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.frame)>0);
   await page.keyboard.press('Escape');assert.equal(await canvas.getAttribute('data-frame'),'0');
   assert.equal(await play.getAttribute('aria-pressed'),'false');
   await play.click();await page.locator('#hide').click();assert(await canvas.isHidden());
   await page.locator('#hide').click();assert.equal(await canvas.getAttribute('data-frame'),'0');
   await play.click();await page.locator('#stop').click();assert.equal(await play.getAttribute('aria-pressed'),'false');
   await play.click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('finished'));
   await play.click();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('play').disabled);
   assert.equal(await canvas.getAttribute('data-frame'),'0');
   await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.getElementById('play').disabled);
   assert.equal(await play.getAttribute('aria-pressed'),'false');
   await play.click();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await play.getAttribute('aria-pressed'),'false');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
   if(width===390)await page.screenshot({path:path.join(__dirname,'docs/previews/heart-stone-greeting-study.png'),fullPage:true});
   console.log('PASS',width,file,'frames, completion, Escape, hide, Quiet, reduced motion, page leave, overflow');await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

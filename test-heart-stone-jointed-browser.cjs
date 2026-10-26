'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch(process.env.AVATAR_CHROMIUM?{executablePath:process.env.AVATAR_CHROMIUM,args:['--no-sandbox'],headless:true}:{headless:true});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.join(__dirname,'heart-stone-jointed-study-device.html'));
   await page.waitForFunction(()=>!document.getElementById('walk').disabled);
   const canvas=page.locator('canvas'),play=page.locator('#walk');assert.equal(await canvas.getAttribute('data-elapsed'),'0');
   await play.click();await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.elapsed)>100);await page.keyboard.press('Escape');
   const held=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(100);assert.equal(await canvas.evaluate(c=>c.toDataURL()),held);
   await page.locator('#hide').click();assert(await canvas.isHidden());await page.locator('#hide').click();assert.equal(await canvas.evaluate(c=>c.toDataURL()),held);assert.equal(await play.getAttribute('aria-pressed'),'false');
   await play.click();await page.locator('#stop').click();assert.equal(await play.getAttribute('aria-pressed'),'false');
   await play.click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('finished'));assert.equal(Number(await canvas.getAttribute('data-position')),638);
   await page.locator('#reset').click();assert.equal(await canvas.getAttribute('data-position'),'230');
   await play.click();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('walk').disabled);assert.equal(await play.getAttribute('aria-pressed'),'false');
   await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.getElementById('walk').disabled);assert.equal(await play.getAttribute('aria-pressed'),'false');
   await play.click();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await play.getAttribute('aria-pressed'),'false');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
   if(width===390)await page.screenshot({path:path.join(__dirname,'docs/previews/heart-stone-jointed-study.png'),fullPage:true});
   await page.close();console.log('PASS',width,'jointed rendering, finish, Quiet, Escape, Hide/Show, reset, reduced motion, page leave and overflow');
  }
  const page=await browser.newPage();await page.goto('file://'+path.join(__dirname,'heart-stone-jointed-study-device.html'));await page.waitForFunction(()=>!document.getElementById('walk').disabled);
  await page.clock.install();await page.clock.pauseAt(new Date());await page.locator('#walk').click();await page.clock.runFor(20);
  const image=await page.locator('canvas').evaluate(c=>c.toDataURL());
  const shoe=await page.locator('canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(270,514,12,15).data));assert(shoe.some((v,i)=>i%4===3&&v>128));
  await page.clock.runFor(60);assert.notEqual(await page.locator('canvas').evaluate(c=>c.toDataURL()),image,'movement must occur between former pose ticks');
  const next=await page.locator('canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(270,514,12,15).data));
  for(let i=0;i<shoe.length;i++)assert(Math.abs(next[i]-shoe[i])<=(i%4===3?0:1),'planted shoe pixels must remain still');
  await page.close();console.log('PASS continuous rendered motion and stable planted-shoe pixels');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

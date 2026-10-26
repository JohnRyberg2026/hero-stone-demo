'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch(process.env.AVATAR_CHROMIUM?{executablePath:process.env.AVATAR_CHROMIUM,args:['--no-sandbox'],headless:true}:{headless:true});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.join(__dirname,'heart-stone-walking-study-device.html'));
   await page.waitForFunction(()=>!document.getElementById('walk').disabled);
   const play=page.locator('#walk'),canvas=page.locator('canvas');
   assert.equal(await canvas.getAttribute('data-elapsed'),'0');
   const rest=await canvas.evaluate(c=>c.toDataURL());
   await play.click();await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.position)>250);
   assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),rest);
   await page.keyboard.press('Escape');
   const held=await canvas.getAttribute('data-elapsed');await page.waitForTimeout(100);assert.equal(await canvas.getAttribute('data-elapsed'),held);
   await page.locator('#hide').click();assert(await canvas.isHidden());await page.locator('#hide').click();assert.equal(await canvas.getAttribute('data-elapsed'),held);assert.equal(await play.getAttribute('aria-pressed'),'false');
   await play.click();await page.locator('#stop').click();const stopped=await canvas.getAttribute('data-elapsed');await page.waitForTimeout(100);assert.equal(await canvas.getAttribute('data-elapsed'),stopped);
   await play.click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('finished'));
   assert.equal(Number(await canvas.getAttribute('data-position')),670);
   await page.waitForTimeout(100);assert.equal(Number(await canvas.getAttribute('data-position')),670);
   await page.locator('#reset').click();assert.equal(await canvas.getAttribute('data-elapsed'),'0');
   await play.click();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('walk').disabled);assert.equal(await play.getAttribute('aria-pressed'),'false');
   await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.getElementById('walk').disabled);assert.equal(await play.getAttribute('aria-pressed'),'false');
   await play.click();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await play.getAttribute('aria-pressed'),'false');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
   if(width===390)await page.screenshot({path:path.join(__dirname,'docs/previews/heart-stone-walking-study.png'),fullPage:true});
   await page.close();console.log('PASS',width,'walk rendering, finish/hold, Escape, Quiet, Hide/Show, reset, reduced motion, page leave, overflow');
  }
  const page=await browser.newPage();
  await page.goto('file://'+path.join(__dirname,'heart-stone-walking-study-device.html'));
  await page.waitForFunction(()=>!document.getElementById('walk').disabled);
  await page.clock.install();await page.clock.pauseAt(new Date());await page.locator('#walk').click();
  await page.clock.runFor(20);
  const first=await page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.clock.runFor(60);assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),first,'held artwork must not drift between poses');
  let contact=null,stance=null;
  for(let i=0;i<15;i++){
   await page.clock.runFor(125);
   const current=await page.locator('canvas').evaluate(c=>{
    const x=Number(c.dataset.contact),a=c.getContext('2d').getImageData(Math.round(x)-3,520,7,9).data;
    return {contact:x,stance:c.dataset.stance,shoe:Array.from(a).some((v,index)=>index%4===3&&v>128)};
   });
   assert(current.shoe,'visible supporting shoe must be near its registered ground anchor');
   if(current.stance===stance)assert.equal(current.contact,contact,'support point must hold until handoff');
   contact=current.contact;stance=current.stance;
  }
  await page.close();console.log('PASS actual held-pose pixels and visible supporting shoe at stable contact anchors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

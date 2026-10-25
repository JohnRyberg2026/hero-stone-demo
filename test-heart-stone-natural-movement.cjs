'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http'),{chromium}=require('playwright');
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(__dirname,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(__dirname+path.sep)){res.writeHead(403).end();return;}
  try{const bytes=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'text/html');res.end(bytes);}catch{res.writeHead(404).end();}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.env.AVATAR_CHROMIUM?{executablePath:process.env.AVATAR_CHROMIUM,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:true}:{headless:true});
 try{
  for(const width of [390,1280])for(const file of ['heart-stone-natural-movement.html','heart-stone-natural-movement-device.html']){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(file.includes('-device')?'file://'+path.join(__dirname,file):'http://127.0.0.1:'+server.address().port+'/'+file);
   const play=page.locator('#play'),canvas=page.locator('canvas');await play.waitFor();
   await page.waitForFunction(()=>!document.getElementById('play').disabled);
   assert.equal(await canvas.getAttribute('data-frame'),'0');
   const rest=await canvas.evaluate(c=>c.toDataURL());
   const feet=await canvas.evaluate(c=>Array.from(c.getContext('2d').getImageData(0,Math.ceil(c.height*.62),c.width,Math.floor(c.height*.38)).data));
   await play.click();await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.frame)>0);
   await page.waitForTimeout(700);assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),rest,'rendered pixels must move');
   const currentFeet=await canvas.evaluate(c=>Array.from(c.getContext('2d').getImageData(0,Math.ceil(c.height*.62),c.width,Math.floor(c.height*.38)).data));
   // GPU/2D conversion can round an 8-bit RGB channel by one. Alpha/silhouette stays exact.
   for(let i=0;i<feet.length;i++)assert(Math.abs(currentFeet[i]-feet[i])<=(i%4===3?0:1),'lower body must stay fixed within one RGB rounding level');
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
  const page=await browser.newPage();
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args);};});
  await page.goto('file://'+path.join(__dirname,'heart-stone-natural-movement-device.html'));
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('unavailable'));
  assert(await page.locator('#play').isDisabled());assert(await page.locator('canvas').isVisible());await page.locator('#stop').click();assert((await page.locator('#status').textContent()).includes('unavailable'));
  await page.close();console.log('PASS unavailable GPU keeps a still portrait and disables playback');
  const lost=await browser.newPage();
  await lost.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const context=get.call(this,type,...args);if(type==='webgl')window.__testGL=context;return context;};});
  await lost.goto('file://'+path.join(__dirname,'heart-stone-natural-movement-device.html'));
  await lost.waitForFunction(()=>!document.getElementById('play').disabled);await lost.locator('#play').click();
  await lost.evaluate(()=>window.__testGL.getExtension('WEBGL_lose_context').loseContext());
  await lost.waitForFunction(()=>document.getElementById('status').textContent.includes('unavailable'));
  assert(await lost.locator('#play').isDisabled());assert.equal(await lost.locator('canvas').getAttribute('data-frame'),'0');
  assert(await lost.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(200,200,1,1).data[3]>0));
  await lost.close();console.log('PASS graphics context loss stops playback and restores still artwork');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});

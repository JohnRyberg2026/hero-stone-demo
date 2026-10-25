'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(__dirname,decodeURIComponent(req.url.split('?')[0]));try{const bytes=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.webp')?'image/webp':'text/html');res.end(bytes);}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({headless:true});for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/heart-stone-blink-preview.html');
 assert(await page.locator('main').isHidden());await page.locator('dialog input').check();await page.getByRole('button',{name:'Enter adult experience',exact:true}).click();await page.waitForFunction(()=>!document.getElementById('playBlink').disabled);
 assert.equal(await page.locator('canvas').getAttribute('data-frame'),'0');assert((await page.locator('canvas').boundingBox()).width<=width);
 await page.evaluate(()=>{window.blinkFrames=[];new MutationObserver(records=>{for(const r of records)window.blinkFrames.push(r.target.dataset.frame);}).observe(document.querySelector('canvas'),{attributes:true,attributeFilter:['data-frame']});});
 await page.locator('#playBlink').click();await page.waitForFunction(()=>window.blinkFrames.length>=5&&window.blinkFrames.at(-1)==='0');assert.deepEqual(await page.evaluate(()=>window.blinkFrames),['0','1','2','1','0']);
 for(const action of ['stop','quiet','escape','hide','pagehide']){
 await page.locator('#playBlink').click();if(action==='escape')await page.keyboard.press('Escape');else if(action==='pagehide')await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));else await page.locator('#'+({stop:'stopBlink',quiet:'quietBlink',hide:'hideBlink'}[action])).click();
 assert.equal(await page.locator('canvas').getAttribute('data-frame'),'0');if(action==='hide'){assert(await page.locator('#blinkStage').isHidden());await page.locator('#showBlink').click();assert(await page.locator('canvas').isVisible());}
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('playBlink').disabled);assert.equal(await page.locator('canvas').getAttribute('data-frame'),'0');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.getElementById('playBlink').disabled);assert.equal(await page.locator('canvas').getAttribute('data-frame'),'0');assert.deepEqual(errors,[]);
 await page.close();console.log('PASS blink browser',width,'entry, frames, stop, quiet, Escape, hide/show, page exit, reduced motion');
 }}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

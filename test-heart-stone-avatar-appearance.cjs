'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(__dirname,decodeURIComponent(req.url.split('?')[0]));try{const bytes=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.webp')?'image/webp':'text/html');res.end(bytes);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({headless:true});
 for(const width of [390,1280])for(const file of ['heart-stone-avatar-voice-preview.html','heart-stone-avatar-welcome-preview.html']){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/'+file);
 if(file.includes('welcome')){assert(await page.locator('main').isHidden());await page.locator('dialog input[type=checkbox]').check();await page.getByRole('button',{name:'Enter adult experience',exact:true}).click();}
 const image=page.locator('#meetHeartStone img');await image.waitFor();await image.evaluate(img=>img.decode());assert.equal(await page.locator('#meetHeartStone svg').count(),0);
 assert(await image.evaluate(img=>img.naturalWidth>0));
 await page.route('**/images/heartstone/approved-store-outfit.webp',route=>route.abort());await page.locator('#heartStoneOutfit').selectOption('store');await page.waitForFunction(()=>document.getElementById('heartStoneOutfitStatus').textContent.includes('could not load'));assert.equal(await image.getAttribute('data-outfit'),'casual');assert.equal(await page.locator('#heartStoneOutfit').inputValue(),'casual');await page.unroute('**/images/heartstone/approved-store-outfit.webp');
 await page.locator('#heartStoneOutfit').selectOption('store');await page.waitForFunction(()=>document.querySelector('#meetHeartStone img').dataset.outfit==='store');await image.evaluate(img=>img.decode());assert((await image.getAttribute('alt')).includes('compass'));
 await page.getByRole('button',{name:'Surprise me with an outfit',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#meetHeartStone img').dataset.outfit==='casual');
 await page.locator('#heartStoneOutfit').selectOption('store');await page.waitForFunction(()=>document.querySelector('#meetHeartStone img').dataset.outfit==='store');
 const bounds=await image.boundingBox();assert(bounds.width<=width);assert(bounds.height<=585);
 await page.locator('#avatarSettingsToggle').click();assert(await page.locator('#avatarMotionPreview button').isDisabled());assert(await page.locator('#avatarMotionPreview input').isDisabled());
 await page.locator('#avatarQuiet').click();await page.locator('#hideHeartStone').click();assert(await page.locator('#meetHeartStone').isHidden());assert(await page.locator('#heartStoneWardrobe').isHidden());await page.locator('#restoreHeartStone').click();assert(await image.isVisible());assert(await page.locator('#heartStoneWardrobe').isVisible());assert.equal(await image.getAttribute('data-outfit'),'store');
 await page.locator('#meetHeartStone').click();assert(await page.locator('#heartStoneGuide').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('#meetHeartStone img').count(),1);
 assert.deepEqual(errors,[]);if(width===390&&file.includes('welcome'))await page.screenshot({path:path.join(require('node:os').tmpdir(),'avatar-mobile-check.png'),fullPage:true});await page.close();console.log('PASS',width,file,'artwork, controls, reduced motion, no script errors');
 }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

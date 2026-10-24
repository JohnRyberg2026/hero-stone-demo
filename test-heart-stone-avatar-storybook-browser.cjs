const assert=require('node:assert/strict'),{chromium}=require('playwright'),{isolateBrowser}=require('./tools/browser-adult-entry.cjs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await isolateBrowser(page);
 await page.addInitScript(()=>{window.__words=[];window.__utterances=[];window.__stops=0;Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Test voice',lang:'en-US',localService:true}],speak:u=>{__words.push(u.text);__utterances.push(u);},cancel:()=>__stops++,addEventListener(){},removeEventListener(){}}});window.SpeechSynthesisUtterance=function(text){this.text=text;};});
 await page.goto('http://127.0.0.1:8765/storybook-preview.html');assert.equal(await page.evaluate(()=>__words.length),0);
 await page.locator('#bookTitle').fill('Private book sentinel');await page.locator('#bookForm button').click();await page.locator('#newMoment').click();await page.locator('#momentText').fill('PRIVATE MEMORY SENTINEL never narrate this.');
 await page.locator('#meetHeartStone').click();await page.locator('#avatarSettingsToggle').click();await page.locator('[data-enable]').check();await page.locator('#avatarVoicePreview select').selectOption('0');
 const hear=page.getByRole('button',{name:'Hear this step',exact:true,includeHidden:true});await hear.click();assert((await page.evaluate(()=>__words.at(-1))).includes('short tour of your Living Story Book'));
 await page.locator('#startHeartStoneTour').click();await page.waitForFunction(()=>__stops===1);assert.equal(await page.evaluate(()=>__words.length),1);await hear.click();assert((await page.evaluate(()=>__words.at(-1))).includes('twelve monthly chapters'));
 await page.locator('#nextHeartStoneStep').click();await hear.click();await page.locator('#nextHeartStoneStep').click();await hear.click();assert.equal(await page.evaluate(()=>__words.length),4);
 assert(!(await page.evaluate(()=>__words.join(' '))).includes('SENTINEL'));assert.equal(await page.locator('#momentText').inputValue(),'PRIVATE MEMORY SENTINEL never narrate this.');
 await page.locator('#hideHeartStone').click();assert(!(await page.locator('#avatarSettings').isVisible()));await page.locator('#restoreHeartStone').click();assert(!(await page.locator('#avatarSettings').isVisible()));assert.equal(await page.evaluate(()=>__words.length),4);assert.equal(await page.locator('#momentText').inputValue(),'PRIVATE MEMORY SENTINEL never narrate this.');
 assert.equal(await page.evaluate(()=>localStorage.length),0);assert.equal(errors.length,0,errors.join('; '));
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));}
 console.log('PASS Story Book public-tour voice: explicit narration, no automatic speech, private draft untouched/unspoken, quiet hide/restore, no storage and responsive widths. Speech simulated.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

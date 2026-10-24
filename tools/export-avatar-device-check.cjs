// Reproducible, public-text-only portable preview; no account or network code is added.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'heart-stone-avatar-voice-preview.html'),'utf8');
html=html.replace('Meet HEART STONE — voice rehearsal','HEART STONE — device voice check').replace('<h1>Meet HEART STONE</h1>',`<h1>Meet HEART STONE</h1><aside id="deviceCheckInstructions"><h2>Try HEART STONE on this device</h2><ol><li>Open Voice &amp; movement, enable voice, and choose an available voice.</li><li>Press Hear greeting. Confirm that you hear it, then try Stop voice and Quiet mode.</li><li>Open the tour and try Hear this step. If you want movement, invite a short stroll or explicitly start wandering.</li></ol><p>This file asks for no sign-in or microphone and saves no test results. Available voices depend on your device. Only you can confirm whether audio is audible; the page does not mark that test as passed.</p></aside>`);
html=html.replace(/<script src="(heart-stone-[a-z-]+\.js)"><\/script>/g,(_,name)=>'<script>\n'+fs.readFileSync(path.join(root,name),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
if(/<script[^>]+src=/.test(html))throw Error('Portable preview still has external scripts.');
const target=path.join(root,'heart-stone-avatar-device-check.html');
if(process.argv.includes('--check')){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==html){console.error('Portable avatar preview is stale. Run node tools/export-avatar-device-check.cjs');process.exit(1);}console.log('PASS portable avatar preview matches current source.');}
else{fs.writeFileSync(target,html);console.log('Wrote heart-stone-avatar-device-check.html');}

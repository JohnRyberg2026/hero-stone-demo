'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'heart-stone-speech-preview.html'),'utf8');
html=html.replace(/<script(?: defer)? src="([^"]+)"><\/script>/g,(_,file)=>{
 let source=fs.readFileSync(path.join(root,file.split('?')[0]),'utf8');
 for(const asset of ['images/heartstone/speech-strip-v1.webp','images/heartstone/speech-eyes-v1.webp'])source=source.split(asset).join('data:image/webp;base64,'+fs.readFileSync(path.join(root,asset)).toString('base64'));
 return '<script>'+source.replace(/<\/script/gi,'<\\/script')+'</script>';
});
// Inline scripts from the head need to run after the rehearsal DOM is available.
const scripts=[];html=html.replace(/<script>[\s\S]*?<\/script>/g,script=>{scripts.push(script);return '';});
html=html.replace('</body>',scripts.join('\n')+'</body>');
html=html.replace('<a href="heart-stone-avatar-welcome-preview.html">Back to welcome preview</a>','<p>Standalone device rehearsal. Nothing is saved, shared, ordered or booked. Your browser’s selected voice may use an online service.</p>');
// QuestAccess normally waits for DOMContentLoaded, which has not fired during parsing.
const output=path.join(root,'heart-stone-facial-device-check.html');
if(process.argv.includes('--check')){if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html){console.error('Facial device export is stale. Run node tools/export-heartstone-facial.cjs');process.exit(1);}console.log('PASS self-contained facial rehearsal export');}else{fs.writeFileSync(output,html);console.log('Exported heart-stone-facial-device-check.html');}

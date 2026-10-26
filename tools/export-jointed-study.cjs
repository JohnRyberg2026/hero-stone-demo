'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
let html=read('heart-stone-jointed-study.html');
for(const file of ['heart-stone-jointed-gait.js','heart-stone-jointed-renderer.js','heart-stone-jointed-study.js']){
 let script=read(file);if(file.endsWith('study.js'))script=script.replace('images/heartstone/jointed-parts-v1.png','data:image/png;base64,'+fs.readFileSync(path.join(root,'images/heartstone/jointed-parts-v1.png')).toString('base64'));
 html=html.replace('<script src="'+file+'"></script>','<script>'+script+'</script>');
}
const file=path.join(root,'heart-stone-jointed-study-device.html');
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==html)throw Error('Jointed study export is stale');console.log('PASS jointed portable export');}else{fs.writeFileSync(file,html);console.log('Saved jointed device study');}

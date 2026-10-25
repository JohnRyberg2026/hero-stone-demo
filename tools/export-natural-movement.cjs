'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
let html=read('heart-stone-natural-movement.html');
for(const file of ['heart-stone-natural-rig.js','heart-stone-natural-movement.js']){
 let js=read(file);
 if(file.endsWith('movement.js'))js=js.replace('images/heartstone/greeting-study-v1.png','data:image/png;base64,'+fs.readFileSync(path.join(root,'images/heartstone/greeting-study-v1.png')).toString('base64'));
 html=html.replace('<script src="'+file+'"></script>','<script>'+js+'</script>');
}
const output=path.join(root,'heart-stone-natural-movement-device.html');
if(process.argv.includes('--check')){if(fs.readFileSync(output,'utf8')!==html)throw Error('Natural movement device preview is stale');console.log('PASS natural movement portable export');}
else{fs.writeFileSync(output,html);console.log('Saved natural movement device preview');}

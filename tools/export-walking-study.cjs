'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const script=read('heart-stone-walking-study.js').replace('images/heartstone/walking-study-v1.png','data:image/png;base64,'+fs.readFileSync(path.join(root,'images/heartstone/walking-study-v1.png')).toString('base64'));
const html=read('heart-stone-walking-study.html').replace('<script src="heart-stone-walking-study.js"></script>','<script>'+script+'</script>').replace('<script src="heart-stone-walk-timing.js"></script>','<script>'+read('heart-stone-walk-timing.js')+'</script>');
const file=path.join(root,'heart-stone-walking-study-device.html');
if(process.argv.includes('--check')){if(read('heart-stone-walking-study-device.html')!==html)throw Error('Walking export is stale');console.log('PASS portable walking export');}
else{fs.writeFileSync(file,html);console.log('Saved portable walking study');}

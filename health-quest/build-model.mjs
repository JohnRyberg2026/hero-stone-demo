import {readFile,writeFile} from 'node:fs/promises';
const get=name=>readFile(new URL(name,import.meta.url),'utf8');
let html=await get('model.html'),engine=await get('model.mjs'),ui=await get('model-ui.mjs');
ui=ui.replace(/^import .*from '.\/model.mjs';\n/,'');
html=html.replace('<link rel="stylesheet" href="member.css">',`<style>${await get('member.css')}</style>`)
 .replace('<a href="../index.html">← Heartstone</a>','<p>Heartstone · Standalone working model</p>')
 .replace('<a href="member.html">Private notes development screen</a>','Live account integration is separate')
 .replace('<script type="module" src="model-ui.mjs"></script>',`<script type="module">\n${engine}\n${ui}\n</script>`);
await writeFile(new URL('working-model.html',import.meta.url),html);
console.log('Created self-contained working-model.html');

import {readFile,writeFile} from 'node:fs/promises';
const read=name=>readFile(new URL(name,import.meta.url),'utf8');
let html=await read('member.html');
const sources=await Promise.all(['private-records.mjs','member.mjs','test-session.mjs','development-config.mjs'].map(read));
const code=sources.map(source=>source.replace(/^import .*;\n/gm,'')).join('\n');
html=html.replace('<link rel="stylesheet" href="member.css">',`<style>${await read('member.css')}</style>`)
 .replace('<a href="../index.html">← Heartstone home</a>','<p>Health Quest Test · Private notes test</p>')
 .replace("import { mountTestSession } from './test-session.mjs';\nimport { developmentConfig } from './development-config.mjs';",code)
 .replace('if (developmentConfig) {',"if (typeof supabase === 'undefined') { document.getElementById('session-status').textContent = 'Could not load the sign-in library. Check your internet connection, then reload this file.'; } else if (developmentConfig) {");
await writeFile(new URL('test-signin.html',import.meta.url),html);
console.log('Created test-signin.html (public test-project config; no credentials).');

const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const files=fs.readdirSync('.').filter(p=>/^build\d+-preview\.html$/.test(p)).concat('Index.html');
assert.equal(files.length,30);
for(const path of files){
 const html=fs.readFileSync(path,'utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1,path);assert(!/supabase|localStorage|\.rpc\(/i.test(html),path);
 for(const [search,hash] of [['',''],['?connection=selected&invite=opaque','#access_token=opaque&type=invite']]){
  let target;vm.runInNewContext(scripts[0][1],{window:{location:{search,hash,replace:value=>target=value}}});
  assert.equal(target,'index.html'+search+hash,path);
 }
 assert(html.includes('href="index.html"'),path);assert(html.includes('<noscript>'),path);
}
console.log('PASS: 30 archived entries route to the current app, preserve invite/auth context and execute no legacy account actions.');

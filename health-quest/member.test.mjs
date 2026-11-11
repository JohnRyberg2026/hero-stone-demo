import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { mountMember } from './member.mjs';
const html=await readFile(new URL('./member.html',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
async function setup(initial=[]) {
  const dom=new JSDOM(html), doc=dom.window.document;
  let records=structuredClone(initial), user='alice', callback, writes=0, failure=false, exported;
  const client={
    auth:{getUser:async()=>({data:{user:user?{id:user}:null}}),onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};}},
    from(){return {select(){return this;},eq(){return this;},neq(){return this;},async order(){return {data:structuredClone(records)}}};},
    async rpc(name,input){writes++;if(failure)return {error:{message:'unavailable'}};
      const record={id:input.p_id,kind:input.p_kind,text:input.p_state==='deleted'?'':input.p_text,state:input.p_state,followup:input.p_followup,revision:input.p_revision+1,occurred_at:input.p_occurred_at};
      records=records.filter(r=>r.id!==record.id);if(record.state!=='deleted')records.push(record);return {data:record};}
  };
  let id=0;const ui=await mountMember(doc,client,{uuid:()=>`id-${++id}`,download:content=>{exported=content;}});
  return {doc,ui,get writes(){return writes;},get exported(){return exported;},fail(){failure=true;},signOut(){user=null;callback('SIGNED_OUT',null);},switchQuietly(){user='bob';},async submit(text){doc.getElementById('text').value=text;doc.getElementById('editor').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));},async confirm(){doc.getElementById('confirm').click();await settle();},dom};
}
test('review is required; confirmed save appears and reload retrieves it',async()=>{
  const app=await setup();await app.submit('Build a walking routine');
  assert.equal(app.writes,0);assert.equal(app.doc.getElementById('review').hidden,false);
  await app.confirm();assert.equal(app.writes,1);assert.match(app.doc.getElementById('records').textContent,/walking routine/);
  await app.ui.reload();assert.match(app.doc.getElementById('records').textContent,/walking routine/);app.ui.destroy();
});
test('failed save never claims success and retains review',async()=>{
  const app=await setup();app.fail();await app.submit('A goal');await app.confirm();
  assert.match(app.doc.getElementById('status').textContent,/not confirmed saved/);
  assert.equal(app.doc.getElementById('review').hidden,false);assert.doesNotMatch(app.doc.getElementById('records').textContent,/A goal/);app.ui.destroy();
});
test('sign out removes private notes and drafts',async()=>{
  const app=await setup([{id:'one',kind:'goal',text:'Private note',state:'reported',followup:false,revision:1}]);
  await app.submit('Private draft');app.signOut();
  assert.equal(app.doc.getElementById('workspace').hidden,true);assert.equal(app.doc.getElementById('text').value,'');assert.equal(app.doc.getElementById('records').textContent,'');app.ui.destroy();
});
test('quiet account switch cannot save old account draft',async()=>{
  const app=await setup();await app.submit('Private draft');app.switchQuietly();await app.confirm();
  assert.equal(app.writes,0);assert.equal(app.doc.getElementById('workspace').hidden,true);app.ui.destroy();
});
test('correction, stop follow-up, deletion and export require actual actions',async()=>{
  const app=await setup([{id:'one',kind:'goal',text:'Afternoon energy',state:'reported',followup:true,revision:1}]);
  const button=text=>[...app.doc.querySelectorAll('article button')].find(b=>b.textContent===text);
  button('Correct this note').click();await app.submit('Morning energy');await app.confirm();
  assert.match(app.doc.getElementById('records').textContent,/Morning energy/);
  button('Stop follow-up').click();assert.equal(app.writes,1);await app.confirm();assert.match(app.doc.getElementById('records').textContent,/Follow-up off/);
  app.doc.getElementById('export').click();await settle();assert.equal(JSON.parse(app.exported).records[0].text,'Morning energy');
  button('Delete this note').click();assert.equal(app.writes,2);await app.confirm();assert.match(app.doc.getElementById('records').textContent,/No saved notes/);app.ui.destroy();
});
test('stored HTML displays as text without creating executable elements',async()=>{
  const app=await setup([{id:'one',kind:'observation',text:'<img src=x onerror=alert(1)>',state:'planned',followup:false,revision:1}]);
  assert.equal(app.doc.querySelector('article img'),null);assert.match(app.doc.getElementById('records').textContent,/planned/);app.ui.destroy();
});

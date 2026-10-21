const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const m=require('./shared-date-model.js');
const draft=(participants=['organizer','alex','sam'])=>m.create({id:'date-1',organizer:'organizer',participants,title:'Dinner',when:'Decide together',meeting:'Decide together'});
const throws=(f,text)=>assert.throws(f,new RegExp(text));
let original=draft(),date=m.send(original,'organizer',1);
assert.equal(original.state,'draft');assert.equal(date.state,'pending');
throws(()=>m.begin(date,'organizer',1),'Every included');
date=m.respond(date,'alex','accepted',1);assert.equal(date.state,'pending');
throws(()=>m.begin(date,'alex',1),'Every included');
date=m.respond(date,'sam','accepted',1);assert.equal(date.state,'confirmed');
throws(()=>m.view(date,'outsider'),'Only an included');
throws(()=>m.respond(date,'outsider','accepted',1),'Only an included');
throws(()=>m.respond(date,'alex','declined',1),'Withdraw');
let started=m.begin(date,'alex',1);assert.equal(started.state,'started');
let stopped=m.stop(started,'sam',1);assert.equal(stopped.state,'stopped');assert.equal(stopped.stoppedBy,'sam');
assert.equal(started.state,'started');throws(()=>m.revise(started,'organizer',{participants:['organizer','alex'],title:'New',when:'Later',meeting:'Park'},1),'underway');
for(const response of ['declined','reschedule']){
 const pending=m.send(draft(),'organizer',1),closed=m.respond(pending,'sam',response,1);
 assert.equal(closed.state,response==='declined'?'closed':'needs_revision');assert.equal(closed.participants.length,3);
 throws(()=>m.begin(closed,'organizer',1),'Every included');
 throws(()=>m.respond(closed,'alex','accepted',1),'closed');
 const revised=m.revise(closed,'organizer',{participants:['organizer','alex','sam'],title:'New plan',when:'Later',meeting:'Park'},1);
 assert.equal(revised.revision,2);assert(revised.participants.every(p=>p.response==='pending'));assert.equal(revised.state,'draft');
 throws(()=>m.respond(revised,'alex','accepted',1),'changed');
}
const withdrawn=m.respond(date,'sam','withdrawn',1);assert.equal(withdrawn.state,'closed');assert.equal(date.state,'confirmed');
const revised=m.revise(date,'organizer',{participants:['organizer','alex'],title:'New plan',when:'Later',meeting:'Park'},1);
throws(()=>m.view(revised,'sam'),'Only an included');
throws(()=>m.revise(date,'alex',{participants:['organizer','alex'],title:'Oops',when:'Later',meeting:'Park'},1),'Only the organizer');
let pair=m.send(draft(['organizer','alex']),'organizer',1);pair=m.respond(pair,'alex','accepted',1);assert.equal(pair.state,'confirmed');
// Separate dating connections never inherit another invitation's response.
assert.equal(m.send(draft(['organizer','sam']),'organizer',1).participants[1].response,'pending');
throws(()=>draft(['organizer','alex','alex']),'only once');throws(()=>draft(['organizer']),'between 2');throws(()=>draft(['alex','sam']),'organizer must');
throws(()=>m.send(date,'organizer',1),'already sent');
throws(()=>m.respond(m.send(draft(),'organizer',1),'alex','withdrawn',1),'Only an accepted');
const html=fs.readFileSync('shared-date-preview.html','utf8');assert(html.includes('data-quest-audience="date"'));assert(html.includes('fictional adults only'));assert(html.includes('No accounts are linked'));assert(!/localStorage|sessionStorage|fetch\(|\.rpc\(/.test(fs.readFileSync('shared-date-preview.js','utf8')));
new vm.Script(fs.readFileSync('shared-date-preview.js','utf8'));
console.log('PASS: pair/group confirmation, individual responses, outsiders, stale rounds, revised rosters, withdrawn consent, stopping participation, immutable transitions, separate dates, rehearsal-only wiring.');
// Exercise the rendered controls, including the selected simulated actor.
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.value='';this.hidden=false;this.disabled=false;this.checked=false;this.dataset={};this.textContent='';}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes;this.value=nodes[0]?.value||''}
 querySelectorAll(tag){return this.children.flatMap(n=>typeof n==='object'?[...(n.tag===tag?[n]:[]),...n.querySelectorAll(tag)]:[])}
}
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]),els=Object.fromEntries(ids.map(id=>[id,new Element()]));
Object.assign(els.sharedTitle,{value:'Dinner'});els.sharedWhen.value='Later';els.sharedMeeting.value='Park';
const responses=['accepted','declined','reschedule','withdrawn'].map(response=>{const e=new Element('button');e.dataset.response=response;return e;});
const document={getElementById:id=>els[id],querySelectorAll:()=>responses,createElement:tag=>new Element(tag),createTextNode:t=>t};
vm.runInNewContext(fs.readFileSync('shared-date-preview.js','utf8'),{window:{SharedDateModel:m},document});
const sam=els.participants.querySelectorAll('input').find(e=>e.value==='demo-sam');sam.checked=true;
els.reviewSharedDate.onclick();assert.equal(els.sharedRevision.textContent,'Invitation round 1 · 3 people');
els.simulateSharedSend.onclick();assert.equal(els.sharedActor.value,'demo-alex');responses[0].onclick();assert(els.simulateSharedBegin.disabled);
els.sharedActor.value='demo-sam';els.sharedActor.onchange();responses[0].onclick();assert(!els.simulateSharedBegin.disabled);
els.simulateSharedBegin.onclick();assert(!els.simulateSharedStop.hidden);els.simulateSharedStop.onclick();assert.match(els.sharedState.textContent,/stopped/);
els.reviseSharedDate.onclick();assert.equal(els.sharedRevision.textContent,'Invitation round 2 · 3 people');assert(!els.simulateSharedSend.hidden);
els.resetSharedPreview.onclick();assert(els.sharedReview.hidden);assert(els.sharedResponses.hidden);
console.log('PASS: rehearsal controls handle a three-person round, selected actors, confirmation, start/stop, revision and reset.');

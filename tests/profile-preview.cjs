const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'heart-stone-first-journey.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/heart-stone-first-journey.html'}),w=dom.window;
let user={id:'alice',email:'alice@example.test'},authChange,failProfile=false,reads=[],writes=[];
const row=(key,value)=>({user_id:'alice',question_key:'account_profile_v1_'+key,answer_json:{value},skipped:false});
let rows=[row('interests',['Nature','Bookstores']),row('budget_style','Free experiences')];
w.scrollTo=()=>{};
w.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user}}),onAuthStateChange:fn=>authChange=fn},from:table=>{
  const filters={};let prefix=null,single=false,payload=null;
  const b={select(){return b},eq(k,v){filters[k]=v;return b},like(k,v){prefix=v;return b},limit(){return b},maybeSingle(){single=true;return b},upsert(r){payload=r;return b},then(resolve,reject){return Promise.resolve().then(()=>{
    if(payload){writes.push(payload);return {data:payload};}
    reads.push({table,filters:{...filters},prefix});
    if(prefix==='account_profile_v1_%'&&failProfile)return {error:{message:'offline'}};
    if(table!=='user_onboarding_answers')return {data:single?null:[]};
    const data=rows.filter(r=>(!filters.user_id||r.user_id===filters.user_id)&&(!filters.question_key||r.question_key===filters.question_key)&&(!prefix||r.question_key.startsWith(prefix.slice(0,-1))));
    return {data:single?data[0]||null:data};
  }).then(resolve,reject)}};return b;
}})};
const context=dom.getInternalVMContext(),run=s=>vm.runInContext(s,context);
run(fs.readFileSync(path.join(root,'profile-adventure-runtime.js'),'utf8'));
run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
async function choices(){await run('boot()');run("state.step='choices';state.limitsSavedAt=Date.now();render()");}
(async()=>{
  await choices();
  assert(reads.filter(r=>r.prefix==='account_profile_v1_%').every(r=>r.filters.user_id==='alice'));
  let headings=[...w.document.querySelectorAll('#app h2')].map(h=>h.textContent);
  assert(headings.includes('A nearby discovery'));assert(!headings.includes('A new flavor'));assert(!headings.includes('The scenic route'));
  assert(w.document.querySelector('#app').textContent.includes('Saved profile interests'));
  assert(w.document.querySelector('#app a[href="./account-profile.html"]'));
  // Existing explicit choices win over imported interests, without rewriting either source.
  rows[1].answer_json.value='Ask me each time';await choices();
  run("state.likes={Nature:'dislike',Bookstores:'like'};render()");
  headings=[...w.document.querySelectorAll('#app h2')].map(h=>h.textContent);
  assert.equal(headings[1],'A story around the corner');
  assert.equal(rows[0].answer_json.value[0],'Nature');
  // Written needs pause suggestions and their contents never enter markup or saved journeys.
  rows.push(row('accessibility','PRIVATE medical accommodation'));
  await choices();assert(w.document.querySelector('#app').textContent.includes('Your saved requirements come first'));
  assert(!w.document.querySelector('#app').textContent.includes('PRIVATE medical accommodation'));
  assert(![...w.document.querySelectorAll('button')].some(b=>b.textContent==='Choose this adventure'));
  rows=rows.filter(r=>!r.question_key.endsWith('accessibility'));rows.push(row('physical_comfort_notes','PRIVATE standing requirement'));await choices();
  assert(w.document.querySelector('#app').textContent.includes('Physical comfort needs'));assert(!w.document.querySelector('#app').textContent.includes('PRIVATE standing requirement'));assert(![...w.document.querySelectorAll('button')].some(b=>b.textContent==='Choose this adventure'));
  rows=rows.filter(r=>!r.question_key.endsWith('physical_comfort_notes'));rows.push(row('food_requirements','PRIVATE food requirement'));await choices();
  assert(w.document.querySelector('#app').textContent.includes('Foods you can’t have'));assert(!w.document.querySelector('#app').textContent.includes('PRIVATE food requirement'));assert(![...w.document.querySelectorAll('button')].some(b=>b.textContent==='Choose this adventure'));
  rows=rows.filter(r=>!r.question_key.endsWith('food_requirements'));rows.push(row('hard_no_categories',['Crowds']),row('boundaries_private',false),row('decisions','Just Decide for Me'),row('exploration','Wild'));await choices();
  assert(w.document.querySelector('#app').textContent.includes('Your boundaries'));assert(!w.document.querySelector('#app').textContent.includes('Crowds'));assert(![...w.document.querySelectorAll('button')].some(b=>b.textContent==='Choose this adventure'));
  rows=rows.filter(r=>!r.question_key.endsWith('hard_no_categories'));rows.push(row('accommodation_needs',['Step-free/wheelchair-friendly access']),row('accommodations_private',false));await choices();
  assert(w.document.querySelector('#app').textContent.includes('Your accessibility needs'));assert(!w.document.querySelector('#app').textContent.includes('Step-free/wheelchair-friendly access'));assert(![...w.document.querySelectorAll('button')].some(b=>b.textContent==='Choose this adventure'));
  rows=rows.filter(r=>!r.question_key.endsWith('accommodation_needs'));rows.push(row('surprise_essentials',['Cost']));await choices();
  assert(w.document.querySelector('#app').textContent.includes('Details you need beforehand'));assert(![...w.document.querySelectorAll('button')].some(b=>b.textContent==='Choose this adventure'));
  rows=rows.filter(r=>!r.question_key.endsWith('surprise_essentials'));rows.push(row('transport_considerations',['Need room for equipment or belongings']));await choices();
  assert(w.document.querySelector('#app').textContent.includes('Your transportation considerations'));assert(!w.document.querySelector('#app').textContent.includes('Need room for equipment or belongings'));assert(![...w.document.querySelectorAll('button')].some(b=>b.textContent==='Choose this adventure'));
  rows=rows.filter(r=>!r.question_key.endsWith('transport_considerations'));rows.push(row('past_place_1_name','PRIVATE excluded venue'),row('past_place_1_feedback','Never suggest again'));await choices();assert(w.document.querySelector('#app').textContent.includes('Places you don’t want repeated'));assert(!w.document.querySelector('#app').textContent.includes('PRIVATE excluded venue'));assert(![...w.document.querySelectorAll('button')].some(b=>b.textContent==='Choose this adventure'));
  run("state.name='Alice';state.memory='Private Alice memory'");await run('flushJourney()');
  assert(writes.every(r=>!JSON.stringify(r).includes('PRIVATE medical accommodation')));
  // Failed reads do not silently become an empty profile.
  rows=rows.filter(r=>!r.question_key.endsWith('accessibility')&&!r.question_key.endsWith('physical_comfort_notes')&&!r.question_key.endsWith('food_requirements'));failProfile=true;
  await choices();assert(w.document.querySelector('#app').textContent.includes('Check your saved profile'));
  assert(![...w.document.querySelectorAll('button')].some(b=>b.textContent==='Choose this adventure'));
  failProfile=false;
  // A queued old-account memory cannot be written under a newly signed-in account.
  const count=writes.length;
  run("state.memory='Private Alice memory'");const oldSave=run('flushJourney()');user={id:'bob',email:'bob@example.test'};authChange('SIGNED_OUT');await oldSave;
  assert.equal(writes.length,count);assert(!w.document.querySelector('#app').textContent.includes('Private Alice memory'));
  await choices();assert.equal(run('state.memory'),'');assert.deepEqual(Array.from(run('profileValues.interests || []')),[]);
  assert.equal(reads.filter(r=>r.prefix==='account_profile_v1_%').at(-1).filters.user_id,'bob');
  console.log('PASS: preview integration, own-account reads, imported interests, free filtering, written-requirement/read-error stops, no note disclosure, and queued-save/account isolation.');
  dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});

const assert=require('node:assert/strict'),S=require('./storybook-drafts.js'),Store=require('./storybook-account-store.js');
function setup(){
 const s={user:'A',calls:[],row:S.create('A',{id:'book',year:2026,title:'Private book'}),revision:0,error:null,changed:0};
 const client={auth:{getUser:async()=>({data:{user:s.user?{id:s.user}:null}}),onAuthStateChange:fn=>{s.auth=fn;return {data:{subscription:{unsubscribe(){}}}};}},rpc:async(name,args)=>{s.calls.push({name,args});if(s.after)s.after();if(s.error)return {error:s.error};return {data:{book:s.row,storageRevision:s.revision}};}};
 return {s,store:Store.create({client,onAccountChange:()=>s.changed++})};
}
(async()=>{
 let {s,store}=setup();s.user=null;assert.equal((await store.read('book')).reason,'signed_out');assert.equal(s.calls.length,0);
 ({s,store}=setup());const loaded=await store.read('book');assert(loaded.ok);assert.equal(s.calls[0].args.p_expected_user,'A');assert.equal(s.calls[0].args.p_operation,'read');
 const book=S.capture(s.row,'A',{id:'moment',happenedOn:'2026-10-22',text:'Private words'},0);s.row=book;assert((await store.save(book,0)).ok);assert.equal(s.calls.at(-1).args.p_expected_revision,0);assert.equal(s.calls.at(-1).args.p_book.visibility,'private');
 const count=s.calls.length;assert.equal((await store.save({...book,owner:'B'},0)).reason,'invalid_input');assert.equal(s.calls.length,count);
 assert.equal((await store.save(book,-1)).reason,'invalid_input');s.error={code:'40001'};assert.equal((await store.save(book,0)).reason,'revision_conflict');
 s.error={code:'transport',message:'private details must not be echoed'};const failed=await store.save(book,0);assert.equal(failed.reason,'unconfirmed');assert(failed.mayHaveSaved);assert(!JSON.stringify(failed).includes('private details'));
 ({s,store}=setup());s.after=()=>s.user='B';const changed=await store.read('book');assert.equal(changed.reason,'account_changed');assert(!changed.book);
 ({s,store}=setup());s.after=()=>{s.user='B';s.auth('SIGNED_IN',{user:{id:'B'}});};const uncertain=await store.create(s.row);assert.equal(uncertain.reason,'account_changed');assert(uncertain.mayHaveSaved);assert(!uncertain.book);
 ({s,store}=setup());s.row={...s.row,owner:'B'};assert.equal((await store.read('book')).reason,'unavailable');
 assert(!Store.valid({...book,moments:[...book.moments,{...book.moments[0]}]},'A'));assert(!Store.valid({...book,visibility:'public'},'A'));
 console.log('PASS: private Story Book storage transport contract, signed-out refusal, scoped RPC, ownership/schema checks, revision forwarding, uncertain saves and account-switch result suppression. Mocked transport; backend not installed.');
})().catch(e=>{console.error(e);process.exitCode=1;});

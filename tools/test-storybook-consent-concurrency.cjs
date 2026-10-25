// CI-only. Uses a dedicated disposable database, never a project URL.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Run only in the disposable GitHub Actions PostgreSQL service.');
const db='storybook_consent_concurrency',base=['-h','127.0.0.1','-U','postgres'],root=path.resolve(__dirname,'../database'),children=new Set();
function command(bin,args){const r=spawnSync(bin,args,{encoding:'utf8',timeout:20000});if(r.status!==0)throw Error(r.stderr||r.error?.message);return r.stdout;}
function session(sql,name='fixture'){const child=spawn('psql',[...base,'-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],{env:{...process.env,PGAPPNAME:name}});children.add(child);let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);const done=new Promise(resolve=>child.on('close',code=>{children.delete(child);resolve({code,out,err});}));child.stdin.on('error',()=>{});child.stdin.write("set statement_timeout='12s';\n"+sql+'\n');return {child,done,output:()=>out};}
async function query(sql){const s=session(sql);s.child.stdin.end();const r=await s.done;if(r.code!==0)throw Error(r.err);return r.out.trim();}
const pause=()=>new Promise(r=>setTimeout(r,40));
async function until(fn){const end=Date.now()+10000;while(Date.now()<end){if(await fn())return;await pause();}throw Error('Timed out waiting for actual database lock barrier');}
const ids=[1,2].map(n=>'11111111-0000-4000-8000-'+String(n).padStart(12,'0')),volume='33333333-0000-4000-8000-000000000001',relationship='22222222-0000-4000-8000-000000000001';
const actor=id=>`set role authenticated;set request.jwt.claim.sub='${id}';`;
const action=(id,op='review',hash=null,decision=null)=>`select public.review_relationship_storybook_consent('${id}','${volume}','include','${op}',${hash?`'${hash}'`:'null'},${decision?`'${decision}'`:'null'})->>'allApproved';`;
(async()=>{let created=false;try{
 command('createdb',[...base,db]);created=true;
 let setup=fs.readFileSync(path.join(root,'test-storybook-consent-ledger-isolated.sql'),'utf8').split('create function pg_temp.review')[0];
 setup=setup.replace(/\\ir ([\w-]+\.sql)/g,(_,file)=>fs.readFileSync(path.join(root,file),'utf8'));
 await query(setup+'\ncommit;');
 const hash=await query(actor(ids[0])+`select public.review_relationship_storybook_consent('${ids[0]}','${volume}','include')->>'fingerprint';`);
 assert.match(hash,/^[0-9a-f]{64}$/);
 const hold=async()=>{const s=session(`begin;select id from public.heart_stones where id='${relationship}' for update;select 'LOCK_READY';`,'storybook-holder');await until(()=>s.output().includes('LOCK_READY'));return s;};
 const waiting=async names=>until(async()=>Number(await query(`select count(*) from pg_stat_activity where datname='${db}' and application_name in (${names.map(n=>`'${n}'`).join(',')}) and wait_event_type='Lock';`))===names.length);
 let holder=await hold();
 const a=session(actor(ids[0])+action(ids[0],'respond',hash,'approved'),'storybook-approve-one'),b=session(actor(ids[1])+action(ids[1],'respond',hash,'approved'),'storybook-approve-two');
 a.child.stdin.end();b.child.stdin.end();await waiting(['storybook-approve-one','storybook-approve-two']);holder.child.stdin.end('commit;\n');assert.equal((await holder.done).code,0);
 for(const r of await Promise.all([a.done,b.done]))assert.equal(r.code,0,r.err);
 assert.equal(await query(actor(ids[0])+action(ids[0])),'true');
 assert.equal(await query(`select count(*) from hs_storybook_consent.responses where volume_id='${volume}' and fingerprint='${hash}' and decision='approved';`),'2');
 holder=await hold();const review=session(actor(ids[0])+action(ids[0]),'storybook-queued-review');review.child.stdin.end();await waiting(['storybook-queued-review']);
 holder.child.stdin.end(actor(ids[1])+action(ids[1],'respond',hash,'withdrawn')+'commit;\n');assert.equal((await holder.done).code,0);
 const result=await review.done;assert.equal(result.code,0,result.err);assert.equal(result.out.trim(),'false');
 assert.equal(await query(actor(ids[0])+action(ids[0])),'false');
 // A stale queued approval must not append a response after a committed edit.
 const countBefore=await query(`select count(*) from hs_storybook_consent.responses;`);
 holder=await hold();const stale=session(actor(ids[0])+action(ids[0],'respond',hash,'approved'),'storybook-stale-response');stale.child.stdin.end();await waiting(['storybook-stale-response']);
 holder.child.stdin.end(`update public.storybook_entries set caption='Fictional concurrent edit' where volume_id='${volume}';commit;\n`);assert.equal((await holder.done).code,0);
 const staleResult=await stale.done;assert.notEqual(staleResult.code,0);assert(staleResult.err.includes('Review the current content, audience and action'),staleResult.err);
 assert.equal(await query(`select count(*) from hs_storybook_consent.responses;`),countBefore);
 assert.equal(await query(actor(ids[0])+action(ids[0])),'false');
 // Removing a required participant cannot turn the remaining account into full consent.
 holder=await hold();const changedRoster=session(actor(ids[0])+action(ids[0]),'storybook-roster-review');changedRoster.child.stdin.end();await waiting(['storybook-roster-review']);
 holder.child.stdin.end(`update public.heart_stone_memberships set status='left' where user_id='${ids[1]}';commit;\n`);assert.equal((await holder.done).code,0);
 const rosterResult=await changedRoster.done;assert.notEqual(rosterResult.code,0);assert(rosterResult.err.includes('Participant scope requires explicit reconciliation'),rosterResult.err);
 assert.equal(await query(`select count(*) from hs_storybook_consent.responses;`),countBefore);
 console.log('PASS: simultaneous approvals persist independently; queued reviews respect withdrawal; committed edits reject stale queued approvals without writes; participant removal requires reconciliation.');
 }finally{for(const child of children)child.kill('SIGKILL');if(created)command('dropdb',[...base,'--force',db]);const cleanup=spawnSync('psql',[...base,'-d','postgres','-X','-v','ON_ERROR_STOP=1','-c','drop role if exists authenticated,anon;'],{encoding:'utf8',timeout:20000});assert.equal(cleanup.status,0,cleanup.stderr);console.log('PASS: disposable Story Book database and fixture roles removed.');}
})().catch(e=>{console.error(e);process.exitCode=1;});

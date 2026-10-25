// CI-only. Uses a dedicated disposable database, never a project URL.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process');
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Run only in the disposable GitHub Actions PostgreSQL service.');
const db='shared_date_concurrency',base=['-h','127.0.0.1','-U','postgres'],root=path.resolve(__dirname,'../database'),children=new Set();
function command(bin,args){const r=spawnSync(bin,args,{encoding:'utf8',timeout:20000});if(r.status!==0)throw Error(r.stderr||r.error?.message);return r.stdout;}
function session(sql,name='fixture'){const child=spawn('psql',[...base,'-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],{env:{...process.env,PGAPPNAME:name}});children.add(child);let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);const done=new Promise(resolve=>child.on('close',code=>{children.delete(child);resolve({code,out,err});}));child.stdin.on('error',()=>{});child.stdin.write("set statement_timeout='12s';\n"+sql+'\n');return {child,done,output:()=>out};}
async function query(sql){const s=session(sql);s.child.stdin.end();const r=await s.done;if(r.code!==0)throw Error(r.err);return r.out.trim();}
const pause=()=>new Promise(r=>setTimeout(r,40));
async function until(fn){const end=Date.now()+10000;while(Date.now()<end){if(await fn())return;await pause();}throw Error('Timed out waiting for actual database lock barrier');}
const ids=[1,2,3].map(n=>'11111111-0000-4000-8000-'+String(n).padStart(12,'0')),date='22222222-0000-4000-8000-000000000001';
const actor=id=>`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`;
const action=(op,id,payload='{}')=>`select public.shared_date_action('${op}','${id}','${date}',1,'${payload}',gen_random_uuid());`;
(async()=>{let created=false;try{
 command('createdb',[...base,db]);created=true;
 let setup=fs.readFileSync(path.join(root,'test-shared-dates-isolated.sql'),'utf8').split('\\ir shared-date-server-test.sql')[0];setup=setup.replace(/\\ir ([\w-]+\.sql)/g,(_,file)=>fs.readFileSync(path.join(root,file),'utf8'));
 await query(setup+`\ninsert into auth.users(id,raw_user_meta_data) select u,'{"first_name":"Fictional"}'::jsonb from unnest(array[${ids.map(id=>`'${id}'::uuid`).join(',')}]) u;
 insert into public.heart_stones values('${date}','${ids[0]}','connected');
 insert into public.heart_stone_memberships select '${date}',id,'active' from auth.users;
 insert into hs_shared_dates.verified_adults select id,now()-interval '1 day',now()+interval '1 day',null from auth.users;
 insert into hs_shared_dates.dates(id,organizer,title,when_text,meeting,state) values('${date}','${ids[0]}','Fictional','Decide together','Fictional','pending');
 insert into hs_shared_dates.participants(date_id,revision,user_id,response) select '${date}',1,id,case when id='${ids[0]}' then 'accepted' else 'pending' end from auth.users;
 commit;`);
 const hold=async()=>{const s=session(`begin;select id from hs_shared_dates.dates where id='${date}' for update;select 'LOCK_READY';`,'fixture-holder');await until(()=>s.output().includes('LOCK_READY'));return s;};
 const waiting=async names=>until(async()=>Number(await query(`select count(*) from pg_stat_activity where datname='${db}' and application_name in (${names.map(n=>`'${n}'`).join(',')}) and wait_event_type='Lock';`))===names.length);
 let holder=await hold();const a=session(actor(ids[1])+action('respond',ids[1],'{"response":"accepted"}'),'accept-two'),b=session(actor(ids[2])+action('respond',ids[2],'{"response":"accepted"}'),'accept-three');a.child.stdin.end();b.child.stdin.end();await waiting(['accept-two','accept-three']);holder.child.stdin.end('commit;\n');assert.equal((await holder.done).code,0);for(const r of await Promise.all([a.done,b.done]))assert.equal(r.code,0,r.err);
 assert.equal(await query(`select state from hs_shared_dates.dates where id='${date}';`),'confirmed');assert.equal(await query(`select count(*) from hs_shared_dates.participants where date_id='${date}' and response='accepted';`),'3');
 holder=await hold();const begin=session(actor(ids[0])+action('begin',ids[0]),'competing-begin');begin.child.stdin.end();await waiting(['competing-begin']);holder.child.stdin.end(actor(ids[1])+action('respond',ids[1],'{"response":"withdrawn"}')+'commit;\n');assert.equal((await holder.done).code,0);const result=await begin.done;assert.notEqual(result.code,0);assert(result.err.includes('Every included person must accept'),result.err);assert.equal(await query(`select state from hs_shared_dates.dates where id='${date}';`),'closed');assert.equal(await query(`select response from hs_shared_dates.participants where date_id='${date}' and user_id='${ids[1]}';`),'withdrawn');
 console.log('PASS: two real concurrent acceptances serialize without lost consent; withdrawal holding the row lock prevents a queued begin.');
 }finally{for(const child of children)child.kill('SIGKILL');if(created)command('dropdb',[...base,'--force',db]);const cleanup=spawnSync('psql',[...base,'-d','postgres','-X','-v','ON_ERROR_STOP=1','-c','drop role if exists authenticated,anon,service_role;'],{encoding:'utf8',timeout:20000});assert.equal(cleanup.status,0,cleanup.stderr);console.log('PASS: disposable concurrency database and fixture roles removed.');}
})().catch(e=>{console.error(e);process.exitCode=1;});

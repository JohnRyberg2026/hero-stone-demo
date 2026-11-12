const {PGlite}=require('@electric-sql/pglite'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const db=new PGlite(),read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('database/profile_guard_preflight.sql'),check=async()=>(await db.query(sql)).rows[0].preflight;
(async()=>{
 await db.exec(read('tests/fixtures/profile-server-schema.sql'));await db.exec(read('tests/fixtures/profile-bundle-schema.sql'));await db.exec(read('tests/fixtures/demo-rpc-baseline.sql'));
 await db.exec('alter table public.adventures add column demo_ready_at timestamptz');
 const result=await check();assert.equal(result.baseline_functions_match,true);assert.equal(result.required_columns_present,true);assert.equal(result.rls_enabled,true);assert.equal(result.guard_helper_present,false);assert.equal(result.deployment_ready,false);
 await db.exec("create or replace function public.reveal_demo_adventure(p_adventure_id uuid) returns text language plpgsql security definer as $$begin return 'CHANGED';end$$");let changed=await check();assert.equal(changed.baseline_functions_match,false);assert.equal(changed.functions.filter(f=>!f.baseline_matches).length,1);
 await db.exec('alter table public.recommendations disable row level security');assert.equal((await check()).rls_enabled,false);await db.exec('alter table public.recommendations enable row level security');await db.exec('alter table public.profiles rename column id to changed_id');assert.equal((await check()).required_columns_present,false);
 await db.exec('alter table public.profiles rename column changed_id to id');await db.exec(read('tests/fixtures/demo-rpc-baseline.sql'));await db.exec(read('database/demo_profile_requirements_guard.sql'));changed=await check();assert.equal(changed.guard_helper_present,true);assert.equal(changed.baseline_functions_match,false);assert.equal(changed.deployment_ready,false);
 assert.equal((await db.query('select * from public.user_onboarding_answers')).rows.length,0);assert.equal((await db.query('select * from public.test_writes')).rows.length,0);
 console.log('PASS: read-only preflight baseline hashes, changed-function detection, missing columns/RLS checks, partial-install signal, no data writes, and no false deployment-ready verdict.');await db.close();
})().catch(async e=>{console.error(e);await db.close();process.exitCode=1});

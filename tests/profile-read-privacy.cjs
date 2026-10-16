const {PGlite}=require('@electric-sql/pglite'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const db=new PGlite(),read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const alice='10000000-0000-0000-0000-000000000001',bob='10000000-0000-0000-0000-000000000002',eve='10000000-0000-0000-0000-000000000003',couple='20000000-0000-0000-0000-000000000001',request='30000000-0000-0000-0000-000000000001',chosen='40000000-0000-0000-0000-000000000001',other='40000000-0000-0000-0000-000000000002',adv='50000000-0000-0000-0000-000000000001';
const tables=['recommendation_requests','recommendations','adventures','adventure_steps'];
async function asUser(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role)}
async function counts(){return Promise.all(tables.map(async t=>(await db.query('select * from public.'+t)).rows.length))}
(async()=>{
 await db.exec(read('tests/fixtures/profile-server-schema.sql'));await db.exec(read('tests/fixtures/demo-rpc-baseline.sql'));await db.exec(read('database/demo_profile_requirements_guard.sql'));
 // Reproduce the relevant pre-existing membership read predicates, with broad SELECT grants.
 await db.exec(`alter function public.is_active_heart_stone_member(uuid) security definer;
 alter table public.recommendation_requests enable row level security;alter table public.recommendations enable row level security;alter table public.adventures enable row level security;alter table public.adventure_steps enable row level security;
 create policy existing_requests on public.recommendation_requests for select to public using(public.is_active_heart_stone_member(heart_stone_id));
 create policy existing_recs on public.recommendations for select to public using(public.is_active_heart_stone_member(heart_stone_id));
 create policy existing_adventures on public.adventures for select to authenticated using(public.is_active_heart_stone_member(heart_stone_id));
 create policy existing_steps on public.adventure_steps for select to authenticated using(exists(select 1 from public.adventures a where a.id=adventure_id and public.is_active_heart_stone_member(a.heart_stone_id)));
 grant select on public.recommendation_requests,public.recommendations,public.adventures,public.adventure_steps to anon,authenticated;
 create function public.get_alpha_quest_state(uuid) returns jsonb language sql security definer as $$ select jsonb_agg(to_jsonb(r)) from public.recommendations r $$;`);
 await db.exec(read('database/demo_profile_read_privacy.sql'));
 await db.query("insert into public.heart_stone_memberships values($1,$2,'active'),($1,$3,'active')",[couple,alice,bob]);await db.exec(`insert into public.recommendation_requests values('${request}','${couple}','${alice}',true,'date');insert into public.recommendations(id,request_id,heart_stone_id,title,is_demo) values('${chosen}','${request}','${couple}','Chosen',true),('${other}','${request}','${couple}','PRIVATE alternative',true);insert into public.adventures(id,heart_stone_id,status,created_by_user_id,source_recommendation_id,is_demo,title) values('${adv}','${couple}','proposed','${alice}','${chosen}',true,'Chosen');insert into public.adventure_steps(adventure_id,title) values('${adv}','PRIVATE unrevealed step');`);
 await asUser(alice);assert.deepEqual(await counts(),[1,2,1,1]);await asUser(bob);assert.deepEqual(await counts(),[0,0,0,0]);
 await db.exec('reset role');await db.exec(`update public.adventures set invitation_style='surprise' where id='${adv}'`);await asUser(bob);assert.deepEqual(await counts(),[0,0,1,0]);
 await db.exec('reset role');await db.exec(`update public.adventures set status='active',invitation_accepted_at=now() where id='${adv}'`);await asUser(bob);assert.deepEqual(await counts(),[0,0,1,0]);
 await db.exec('reset role');await db.exec(`update public.adventures set adventure_revealed_at=now() where id='${adv}'`);await asUser(bob);assert.deepEqual(await counts(),[0,1,1,1]);assert.equal((await db.query('select title from public.recommendations')).rows[0].title,'Chosen');
 // A permissive policy cannot defeat the new restrictive recommendation filter.
 await db.exec('reset role');await db.exec('create policy broad_legacy_read on public.recommendations for select to authenticated using(true)');await asUser(bob);assert.deepEqual(await counts(),[0,1,1,1]);
 try{await db.exec(`select public.get_alpha_quest_state('${couple}')`);assert.fail('Expected legacy RPC denial')}catch(e){assert.match(e.message,/permission denied/)}
 await asUser(eve);assert.deepEqual(await counts(),[0,0,0,0]);await asUser(null,'anon');assert.deepEqual(await counts(),[0,0,0,0]);
 await db.exec('reset role');await db.query("update public.heart_stone_memberships set status='inactive' where user_id=$1",[bob]);await asUser(bob);assert.deepEqual(await counts(),[0,0,0,0]);await asUser(alice);assert.deepEqual(await counts(),[1,2,1,1]);
 console.log('PASS: PostgreSQL creator-only drafts, sent metadata, acceptance without early detail access, revealed chosen-only sharing, private alternatives, restrictive-policy precedence, legacy read RPC denial, and inactive/outsider/anon isolation.');await db.close();
})().catch(async e=>{console.error(e);await db.close();process.exitCode=1});

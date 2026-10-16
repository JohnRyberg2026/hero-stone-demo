const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),db=new PGlite();
const alice='10000000-0000-0000-0000-000000000001',bob='10000000-0000-0000-0000-000000000002',couple='20000000-0000-0000-0000-000000000001';
const expectDenied=async sql=>{try{await db.exec(sql);assert.fail('Expected permission denial')}catch(e){assert.match(e.message,/permission denied|row-level security policy/);}};
(async()=>{
 await db.exec(read('tests/fixtures/profile-server-schema.sql'));
 await db.exec(`create domain public.surprise_level as text;create domain public.quest_reveal_mode as text;create domain public.wild_adventure_intensity as text;create domain public.wild_adventure_reveal_style as text;
 create function public.generate_recommendations_v2(uuid,integer) returns void language sql as $$ insert into public.test_writes values('generate') $$;
 create function public.accept_alpha_recommendation(uuid) returns void language sql as $$ insert into public.test_writes values('accept') $$;
 create function public.choose_recommendation(uuid) returns void language sql as $$ insert into public.test_writes values('choose') $$;
 create function public.compose_date_quest(uuid,public.surprise_level,public.quest_reveal_mode) returns void language sql as $$ insert into public.test_writes values('compose') $$;
 create function public.create_wild_adventure(uuid,uuid,uuid,public.wild_adventure_intensity,public.wild_adventure_reveal_style) returns void language sql as $$ insert into public.test_writes values('wild') $$;
 grant all on public.recommendation_requests,public.recommendations,public.adventures,public.adventure_steps,public.user_onboarding_answers to anon,authenticated;
 create policy owner_insert on public.user_onboarding_answers for insert to authenticated with check(user_id=auth.uid());
 create policy owner_update on public.user_onboarding_answers for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
 create policy owner_delete on public.user_onboarding_answers for delete to authenticated using(user_id=auth.uid());`);
 // Applying access restrictions without the requirement guard must abort the entire change.
 try{await db.exec(read('database/demo_profile_access_hardening.sql'));assert.fail('Expected prerequisite error')}catch(e){assert.equal(e.message,'PROFILE_GUARD_REQUIRED');await db.exec('rollback');}
 await db.exec(read('tests/fixtures/demo-rpc-baseline.sql'));await db.exec(read('database/demo_profile_requirements_guard.sql'));await db.exec(read('database/demo_profile_access_hardening.sql'));
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[alice]);await db.query("insert into public.heart_stone_memberships values($1,$2,'active'),($1,$3,'active')",[couple,alice,bob]);
 const begin=`select public.begin_demo_quest('${couple}','date','today',120,'moderate')`;
 const alternate=[`select public.begin_alpha_quest('${couple}','date','today',120,'moderate','{}',null,null,3)`,`select public.generate_recommendations_v2(null,3)`,`select public.accept_alpha_recommendation(null)`,`select public.choose_recommendation(null)`,`select public.compose_date_quest(null,null,null)`,`select public.create_wild_adventure(null,null,null,null,null)`];
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);for(const sql of alternate)await expectDenied(sql);
  for(const table of ['recommendation_requests','recommendations','adventures','adventure_steps']){
   for(const sql of [`insert into public.${table} default values`,`update public.${table} set ${table==='adventure_steps'?'title':'id'}=null`,`delete from public.${table}`,`truncate public.${table}`])await expectDenied(sql);
   assert.equal((await db.query('select has_table_privilege(current_user,$1,\'SELECT\') as ok',['public.'+table])).rows[0].ok,true);
  }
  await expectDenied('truncate public.user_onboarding_answers');await db.exec('reset role');
 }
 // Authenticated main demo calls retain the ability to invoke the now-private alpha dependency internally.
 await db.exec('set role authenticated');await db.exec(begin);await db.exec(`insert into public.user_onboarding_answers values('${alice}','account_profile_v1_call_me','{"value":"Test"}',false)`);assert.equal((await db.query('select * from public.user_onboarding_answers')).rows.length,1);
 await expectDenied(`insert into public.user_onboarding_answers values('${bob}','account_profile_v1_call_me','{"value":"Wrong owner"}',false)`);
 await db.exec(`update public.user_onboarding_answers set answer_json='{"value":"Edited"}' where user_id='${alice}'`);await db.exec(`delete from public.user_onboarding_answers where user_id='${alice}'`);await db.exec('reset role');assert.equal((await db.query('select action from public.test_writes')).rows[0].action,'begin');
 await db.query("insert into public.user_onboarding_answers values($1,'account_profile_v1_hard_no_details',$2,false)",[bob,JSON.stringify({value:'PRIVATE requirement'})]);await db.exec('set role authenticated');assert.equal((await db.query('select * from public.user_onboarding_answers')).rows.length,0);try{await db.exec(begin);assert.fail('Expected requirement stop')}catch(e){assert.equal(e.message,'PROFILE_REQUIREMENTS_UNVERIFIED')};await db.exec('reset role');
 console.log('PASS: draft access hardening prerequisite, six alternate RPC denials, four-table direct mutation denials, owner-only editing, preserved SELECT grants, and guarded demo internal calls.');await db.close();
})().catch(async e=>{console.error(e);await db.close();process.exitCode=1});

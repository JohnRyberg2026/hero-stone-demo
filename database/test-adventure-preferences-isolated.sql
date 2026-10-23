-- Disposable PostgreSQL only; fictional auth setup, all changes rolled back.
\set ON_ERROR_STOP on
begin;
create role authenticated;
create role anon;
create schema auth;
create table auth.users(id uuid primary key);
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
\ir ../supabase/migrations/20261022213100_adventure_preferences_draft.sql
\ir adventure-preferences-guard.sql
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
insert into public.quest_adventure_preferences(account_id,boundaries,interests) values(auth.uid(),'{"minimalWalking":true,"avoidCategories":["water"]}','["gardens"]');
do $$declare changed integer;begin
 update public.quest_adventure_preferences set revision=1,boundaries='{"minimalWalking":true,"avoidCategories":["water"],"maxBudget":40}' where account_id=auth.uid() and revision=0;
 get diagnostics changed=row_count;if changed<>1 then raise exception 'FAIL update';end if;
 update public.quest_adventure_preferences set revision=1 where account_id=auth.uid() and revision=0;
 get diagnostics changed=row_count;if changed<>0 then raise exception 'FAIL stale CAS';end if;
 begin update public.quest_adventure_preferences set revision=1 where account_id=auth.uid();raise exception 'FAIL bypass revision';exception when serialization_failure then null;end;
 begin update public.quest_adventure_preferences set revision=2,boundaries='{"maxBudget":-1}' where account_id=auth.uid();raise exception 'FAIL invalid budget';exception when check_violation then null;end;
 begin update public.quest_adventure_preferences set revision=2,account_id='00000000-0000-4000-8000-000000000002' where account_id=auth.uid();raise exception 'FAIL ownership transfer';exception when serialization_failure or insufficient_privilege then null;end;
 if (select interests from public.quest_adventure_preferences where account_id=auth.uid())<>'["gardens"]'::jsonb then raise exception 'FAIL interests';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$begin if exists(select from public.quest_adventure_preferences) then raise exception 'FAIL other account';end if;end $$;
reset role;
set local role anon;
do $$begin begin perform * from public.quest_adventure_preferences;raise exception 'FAIL anon';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
select case when to_regnamespace('hs_profile_rules') is null then 'PASS: isolated profile schema, ownership, revision enforcement and rollback' else 'FAIL' end as result;

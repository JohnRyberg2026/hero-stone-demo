-- Disposable CI ONLY, minimal legacy fixture; never install in a real project.
\set ON_ERROR_STOP on
begin;
create role authenticated;create role anon;create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon;
create table public.profiles(id uuid primary key,account_status text);
create table public.heart_stones(id uuid primary key);
create table public.heart_stone_memberships(heart_stone_id uuid references public.heart_stones,user_id uuid references public.profiles,status text);
create table public.storybook_volumes(id uuid primary key,heart_stone_id uuid references public.heart_stones,title text);
create table public.story_seeds(id uuid primary key,heart_stone_id uuid references public.heart_stones,source_occurred_at timestamptz);
create table public.storybook_entries(id uuid primary key,volume_id uuid references public.storybook_volumes,story_seed_id uuid references public.story_seeds,caption text);
insert into public.profiles values('11111111-0000-4000-8000-000000000001','active'),('11111111-0000-4000-8000-000000000002','active'),('11111111-0000-4000-8000-000000000003','active');
insert into public.heart_stones values('22222222-0000-4000-8000-000000000001');
insert into public.heart_stone_memberships select '22222222-0000-4000-8000-000000000001',id,'active' from public.profiles where id<>'11111111-0000-4000-8000-000000000003';
insert into public.storybook_volumes values('33333333-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','Fictional book');
insert into public.story_seeds values('44444444-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','2026-01-31');
insert into public.storybook_entries values('55555555-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001','Fictional caption');
\ir storybook-consent-ledger.sql
create function pg_temp.review(action text default 'include',op text default 'review',fingerprint text default null,decision text default null) returns jsonb language sql as $$select public.review_relationship_storybook_consent(auth.uid(),'33333333-0000-4000-8000-000000000001',action,op,fingerprint,decision)$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-0000-4000-8000-000000000001',true);
select set_config('test.fingerprint',pg_temp.review()->>'fingerprint',true);
do $$declare r jsonb;begin
 r:=pg_temp.review('include','respond',current_setting('test.fingerprint'),'approved');
 if (r->>'allApproved')::boolean or (r->>'executionEnabled')::boolean then raise exception 'FAIL single approval or execution';end if;
 if r ? 'responses' or r ? 'entries' then raise exception 'FAIL private data returned';end if;
 begin perform * from hs_storybook_consent.responses;raise exception 'FAIL direct access';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','11111111-0000-4000-8000-000000000002',true);
do $$begin
 if not (pg_temp.review('include','respond',current_setting('test.fingerprint'),'approved')->>'allApproved')::boolean then raise exception 'FAIL independent approval';end if;
 if (pg_temp.review('publish')->>'allApproved')::boolean or (pg_temp.review('export')->>'allApproved')::boolean then raise exception 'FAIL action reuse';end if;
 if (pg_temp.review('include','respond',current_setting('test.fingerprint'),'withdrawn')->>'allApproved')::boolean then raise exception 'FAIL withdrawal';end if;
end$$;
reset role;update public.storybook_entries set caption='Changed caption';set local role authenticated;
do $$begin
 begin perform pg_temp.review('include','respond',current_setting('test.fingerprint'),'approved');raise exception 'FAIL stale caption';exception when serialization_failure then null;end;
 if (pg_temp.review()->>'allApproved')::boolean then raise exception 'FAIL old approvals';end if;
end$$;
reset role;update public.storybook_entries set caption='Fictional caption';set local role authenticated;
do $$begin if pg_temp.review()->>'fingerprint'=current_setting('test.fingerprint') or (pg_temp.review()->>'allApproved')::boolean then raise exception 'FAIL restored text resurrected approval';end if;end$$;
select set_config('test.caption_hash',pg_temp.review()->>'fingerprint',true);
reset role;update public.story_seeds set source_occurred_at='2026-02-01';set local role authenticated;
do $$begin if pg_temp.review()->>'fingerprint'=current_setting('test.caption_hash') then raise exception 'FAIL original date not bound';end if;end$$;
reset role;insert into public.heart_stone_memberships values('22222222-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000003','active');set local role authenticated;
do $$begin if jsonb_array_length(pg_temp.review()->'participants')<>3 or (pg_temp.review()->>'allApproved')::boolean then raise exception 'FAIL changed roster';end if;end$$;
select set_config('test.before_leave',pg_temp.review()->>'fingerprint',true);
reset role;update public.heart_stone_memberships set status='left' where user_id='11111111-0000-4000-8000-000000000002';set local role authenticated;
do $$begin begin perform pg_temp.review();raise exception 'FAIL former member';exception when insufficient_privilege then null;end;end$$;
reset role;update public.heart_stone_memberships set status='active' where user_id='11111111-0000-4000-8000-000000000002';set local role authenticated;
do $$begin if pg_temp.review()->>'fingerprint'=current_setting('test.before_leave') or (pg_temp.review()->>'allApproved')::boolean then raise exception 'FAIL rejoin resurrected consent';end if;end$$;
set local role anon;
do $$begin begin perform public.review_relationship_storybook_consent('11111111-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','include');raise exception 'FAIL anon';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
select 'PASS: server-derived exact-version consent ledger, independent/action-scoped responses, withdrawal, content/date/roster invalidation, private ledger and no execution; rolled back' as result;

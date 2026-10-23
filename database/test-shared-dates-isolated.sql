-- Disposable PostgreSQL CI ONLY. Fake auth/base tables, never a Supabase install.
-- Production integration still requires the real baseline and migration review.
\set ON_ERROR_STOP on
begin;
set local statement_timeout='20s';
create role authenticated;
create role anon;
create role service_role;
create schema auth;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public.profiles(id uuid primary key references auth.users(id),first_name text,account_status text default 'active');
create table public.heart_stones(id uuid primary key,created_by_user_id uuid references auth.users(id),status text);
create table public.heart_stone_memberships(heart_stone_id uuid references public.heart_stones(id),user_id uuid references auth.users(id),status text,primary key(heart_stone_id,user_id));
-- Fixture names are not eligibility proof. Each proof is separately inserted by
-- the owner in the existing SQL tests; authenticated accounts cannot self-verify.
create function public.fixture_profile() returns trigger language plpgsql as $$begin insert into public.profiles(id,first_name) values(new.id,new.raw_user_meta_data->>'first_name');return new;end$$;
create trigger fixture_profile after insert on auth.users for each row execute function public.fixture_profile();
\ir shared-date-server.sql
\ir shared-date-candidates.sql
\ir shared-date-server-test.sql
-- Existing server suite exercises consent, revision, revocation and outsider
-- access. Also assert the additive response-privacy snapshot used by the UI.
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$declare d jsonb;p jsonb;begin
 d:=public.shared_date_action('view',auth.uid(),current_setting('test.other_date')::uuid);
 for p in select value from jsonb_array_elements(d->'participants') loop
  if p->>'id'<>auth.uid()::text and p->>'response' is not null then raise exception 'FAIL another participant response disclosed';end if;
 end loop;
 if jsonb_array_length(public.shared_date_candidates(auth.uid())->'people')<>1 then raise exception 'FAIL connected candidates after disconnection';end if;
end$$;
reset role;
rollback;
do $$begin
 if to_regnamespace('hs_shared_dates') is not null or to_regnamespace('auth') is not null or to_regclass('public.profiles') is not null or exists(select from pg_roles where rolname in ('authenticated','anon','service_role')) then raise exception 'FAIL fixture cleanup';end if;
end$$;
select 'PASS: disposable server consent, eligibility, revision, private responses and cleanup' as result;

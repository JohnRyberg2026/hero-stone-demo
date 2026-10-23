-- Disposable CI ONLY. Minimal observed read/grant contract, not a full baseline.
\set ON_ERROR_STOP on
begin;
create role authenticated;create role anon;create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon;
create table public.profiles(id uuid primary key,account_status text);
create table public.heart_stone_memberships(user_id uuid,heart_stone_id uuid,status text);
create table public.storybook_volumes(id uuid primary key,heart_stone_id uuid,title text,volume_year integer,state text);
alter table public.storybook_volumes enable row level security;
create view public.storybook_shared with(security_invoker=true) as select * from public.storybook_volumes;
grant select on public.storybook_shared to authenticated;
-- Two independent relationships, with an active member and a former member.
insert into public.profiles values('11111111-0000-4000-8000-000000000001','active'),('11111111-0000-4000-8000-000000000002','active');
insert into public.heart_stone_memberships values
 ('11111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','active'),
 ('11111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000002','left'),
 ('11111111-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000002','active');
insert into public.storybook_volumes values('33333333-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','Fictional shared volume',2026,'draft'),('33333333-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000002','Other relationship',2026,'draft');
\ir storybook-relationship-reader.sql
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-0000-4000-8000-000000000001',true);
do $$declare books jsonb;begin
 begin perform * from public.storybook_shared;raise exception 'FAIL old view unexpectedly readable';exception when insufficient_privilege then null;end;
 books:=public.list_my_relationship_storybooks(auth.uid(),'22222222-0000-4000-8000-000000000001');
 if jsonb_array_length(books)<>1 or books->0->>'title'<>'Fictional shared volume' or books->0->>'scope'<>'relationship' or (select count(*) from jsonb_object_keys(books->0))<>6 then raise exception 'FAIL summary whitelist';end if;
 begin perform public.list_my_relationship_storybooks(auth.uid(),'22222222-0000-4000-8000-000000000002');raise exception 'FAIL former member';exception when insufficient_privilege then null;end;
 begin perform public.list_my_relationship_storybooks('11111111-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000002');raise exception 'FAIL identity spoof';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','11111111-0000-4000-8000-000000000002',true);
do $$begin
 begin perform public.list_my_relationship_storybooks(auth.uid(),'22222222-0000-4000-8000-000000000001');raise exception 'FAIL unrelated relationship';exception when insufficient_privilege then null;end;
end$$;
reset role;update public.profiles set account_status='suspended' where id='11111111-0000-4000-8000-000000000002';set local role authenticated;
do $$begin begin perform public.list_my_relationship_storybooks(auth.uid(),'22222222-0000-4000-8000-000000000002');raise exception 'FAIL suspended account';exception when insufficient_privilege then null;end;end$$;
set local role anon;
do $$begin begin perform public.list_my_relationship_storybooks('11111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001');raise exception 'FAIL anonymous access';exception when insufficient_privilege then null;end;end$$;
reset role;
do $$begin if has_table_privilege('authenticated','public.storybook_volumes','SELECT') then raise exception 'FAIL widened table grants';end if;end$$;
rollback;
select 'PASS: old caller-permission view failure reproduced; summary reader isolates active relationships, rejects former/unrelated/suspended/spoofed/anonymous accounts, preserves base grants; rolled back' as result;

-- Disposable PostgreSQL CI only. Creates fake Supabase auth; never run on a real project.
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
\ir storybook-draft-server.sql
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$
declare a uuid:='00000000-0000-4000-8000-000000000001'; b jsonb; saved jsonb; other jsonb;
begin
 b:=jsonb_build_object('id','book','owner',a,'year',2026,'title','Fictional book','visibility','private','revision',0,'moments','[]'::jsonb);
 saved:=public.storybook_draft_action('create',a,'book',null,b);
 if saved->>'storageRevision'<>'0' then raise exception 'FAIL create'; end if;
 perform public.storybook_draft_action('create',a,'book',null,b);
 saved:=public.storybook_draft_action('list',a,null);
 if jsonb_array_length(saved)<>1 or saved->0->>'title'<>'Fictional book' or saved->0 ? 'moments' then raise exception 'FAIL private volume list';end if;
 b:=jsonb_set(b,'{revision}','1');
 b:=jsonb_set(b,'{moments}',jsonb_build_array(jsonb_build_object('id','moment','author',a,'source','user','happenedOn','2026-01-31','month',1,'text','My fictional note','revision',0)));
 saved:=public.storybook_draft_action('save',a,'book',0,b);
 if saved->>'storageRevision'<>'1' then raise exception 'FAIL save'; end if;
 saved:=public.storybook_draft_action('save',a,'book',0,b);
 if saved->>'storageRevision'<>'1' then raise exception 'FAIL retry duplicate'; end if;
 begin perform public.storybook_draft_action('save',a,'book',0,jsonb_set(b,'{title}','"Stale"'));raise exception 'FAIL stale allowed';exception when serialization_failure then null;end;
 begin perform public.storybook_draft_action('create',a,'book',null,jsonb_set(b,'{title}','"Overwrite"'));raise exception 'FAIL create overwrite';exception when serialization_failure then null;end;
 begin perform public.storybook_draft_action('save',a,'book',1,jsonb_set(b,'{visibility}','"public"'));raise exception 'FAIL public allowed';exception when invalid_parameter_value then null;end;
 other:=jsonb_set(jsonb_set(jsonb_set(b,'{revision}','2'),'{moments,0,happenedOn}','"2026-02-01"'),'{moments,0,month}','2');
 begin perform public.storybook_draft_action('save',a,'book',1,other);raise exception 'FAIL moved month';exception when invalid_parameter_value then null;end;
 begin perform public.storybook_draft_action('read','00000000-0000-4000-8000-000000000002','book');raise exception 'FAIL identity';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$begin
 if public.storybook_draft_action('list','00000000-0000-4000-8000-000000000002',null)<>'[]'::jsonb then raise exception 'FAIL other account list';end if;
 if exists(select from hs_storybook.drafts) then raise exception 'FAIL cross-account RLS';end if;
 begin perform public.storybook_draft_action('read','00000000-0000-4000-8000-000000000002','book');raise exception 'FAIL cross-account RPC';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$begin
 begin perform public.storybook_draft_action('read','00000000-0000-4000-8000-000000000001','book');raise exception 'FAIL anon';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select case when to_regnamespace('hs_storybook') is null then 'PASS: isolated private Story Book server, RLS, revisions, retries and rollback' else 'FAIL' end as result;

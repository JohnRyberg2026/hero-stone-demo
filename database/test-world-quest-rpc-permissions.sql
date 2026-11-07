begin;
select set_config('request.jwt.claims','{}',true),set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claim.role','',true);
do $check$
declare signature text;
begin
 foreach signature in array array['public.advance_world_quest(uuid)','public.begin_world_quest_challenge(uuid,integer)','public.cast_world_skip_vote(uuid,integer)','public.create_world_quest_team(text,text)','public.get_world_quest_state(uuid)','public.join_world_quest_team(text,text)','public.record_world_quest_result(uuid,integer,boolean,integer)','public.resume_world_quest_team()','public.reveal_world_quest_challenge(uuid,integer)','public.start_world_quest(uuid)','public.submit_world_quest_evidence(uuid,integer,text,text,text,bigint,integer)'] loop
   if has_function_privilege('anon',signature,'EXECUTE') then raise exception 'Anonymous grant remains: %',signature;end if;
   if not has_function_privilege('authenticated',signature,'EXECUTE') then raise exception 'Authenticated grant missing: %',signature;end if;
   if not has_function_privilege('service_role',signature,'EXECUTE') then raise exception 'Service grant missing: %',signature;end if;
 end loop;
end $check$;
set local role anon;
do $check$
begin
 begin execute 'select public.advance_world_quest(null::uuid)';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin execute 'select public.begin_world_quest_challenge(null::uuid,null::integer)';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin execute 'select public.cast_world_skip_vote(null::uuid,null::integer)';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin execute 'select public.create_world_quest_team(null::text,null::text)';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin execute 'select public.get_world_quest_state(null::uuid)';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin execute 'select public.join_world_quest_team(null::text,null::text)';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin execute 'select public.record_world_quest_result(null::uuid,null::integer,null::boolean,null::integer)';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin execute 'select public.resume_world_quest_team()';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin execute 'select public.reveal_world_quest_challenge(null::uuid,null::integer)';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin execute 'select public.start_world_quest(null::uuid)';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin execute 'select public.submit_world_quest_evidence(null::uuid,null::integer,null::text,null::text,null::text,null::bigint,null::integer)';raise exception 'Anonymous call unexpectedly succeeded';exception when insufficient_privilege then null;end;
 if public.current_user_email()<>'' then raise exception 'Signed-out helper exposed an email';end if;
 if public.is_active_heart_stone_member(gen_random_uuid()) then raise exception 'Signed-out active membership granted';end if;
 if public.is_any_heart_stone_member(gen_random_uuid()) then raise exception 'Signed-out membership granted';end if;
end $check$;
reset role;
set local role authenticated;
do $check$
begin
 begin execute 'select public.advance_world_quest(null::uuid)';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
 begin execute 'select public.begin_world_quest_challenge(null::uuid,null::integer)';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
 begin execute 'select public.cast_world_skip_vote(null::uuid,null::integer)';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
 begin execute 'select public.create_world_quest_team(null::text,null::text)';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
 begin execute 'select public.get_world_quest_state(null::uuid)';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
 begin execute 'select public.join_world_quest_team(null::text,null::text)';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
 begin execute 'select public.record_world_quest_result(null::uuid,null::integer,null::boolean,null::integer)';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
 begin execute 'select public.resume_world_quest_team()';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
 begin execute 'select public.reveal_world_quest_challenge(null::uuid,null::integer)';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
 begin execute 'select public.start_world_quest(null::uuid)';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
 begin execute 'select public.submit_world_quest_evidence(null::uuid,null::integer,null::text,null::text,null::text,null::bigint,null::integer)';exception when insufficient_privilege then raise exception 'Signed-in grant lost';when others then null;end;
end $check$;
reset role;
select 'PASS: 11 World Quest actions blocked before sign-in; signed-in/service grants preserved; signed-out helpers reveal no email or membership' as result;
rollback;

begin;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true),set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claims','{"role":"authenticated"}',true);
set local role authenticated;
do $check$
begin
 begin
   perform public.get_world_quest_state(gen_random_uuid());
   raise exception 'Nonmember team access unexpectedly succeeded';
 exception when raise_exception then
   if sqlerrm <> 'MEMBER_REQUIRED' then raise;end if;
 end;
end $check$;
reset role;
select 'PASS: signed-in nonmember team reads remain blocked' as result;
rollback;

begin;
select set_config('request.jwt.claims','{}',true),set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claim.role','',true);
set local role anon;
do $check$
begin
 begin perform public.capture_adventure_candidate_learning();raise exception 'Direct trigger invocation unexpectedly succeeded';exception when feature_not_supported then null;end;
 begin perform public.guard_demo_memory_storybook();raise exception 'Direct trigger invocation unexpectedly succeeded';exception when feature_not_supported then null;end;
 begin perform public.handle_new_auth_user();raise exception 'Direct trigger invocation unexpectedly succeeded';exception when feature_not_supported then null;end;
end $check$;
reset role;
select 'PASS: all three internal trigger functions reject direct signed-out invocation' as result;
rollback;

-- Run as database owner; synthetic identity and enrollment roll back.
begin;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true),
set_config('request.jwt.claim.role','authenticated',true),
set_config('request.jwt.claims','{"role":"authenticated"}',true);
do $check$
begin
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and p.prosrc like '%hs_pilot_internal.require_legacy_access()%')<>91 then raise exception 'Legacy boundary inventory drift';end if;
 if has_table_privilege('authenticated','hs_pilot_internal.legacy_accounts','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Client roster access';end if;
 if has_function_privilege('anon','hs_pilot_internal.require_legacy_access()','execute') then raise exception 'Anonymous guard grant';end if;
end $check$;
set local role authenticated;
do $check$
declare statement text;
begin
 foreach statement in array array['select public.accept_alpha_recommendation(null::uuid)',
'select public.accept_heart_stone_invitation(null::text)',
'select public.add_memory_keepsake(null::uuid,null::text,null::text,null::text,null::text)',
'select public.add_memory_media(null::uuid,null::text,null::text,null::text,null::memory_media_style,null::integer)',
'select public.add_memory_note(null::uuid,null::text,null::memory_note_visibility)',
'select public.add_story_seed_to_volume(null::uuid,null::uuid,null::integer,null::text,null::text)',
'select public.advance_world_quest(null::uuid)',
'select public.approve_memory_draft(null::uuid)',
'select public.approve_storybook_entry(null::uuid,null::boolean,null::boolean,null::boolean,null::boolean)',
'select public.archive_storybook_volume(null::uuid)',
'select public.assign_storybook_entry_section(null::uuid,null::uuid,null::integer)',
'select public.begin_alpha_quest(null::uuid,null::adventure_type,null::text,null::integer,null::text,null::text[],null::integer,null::text,null::integer)',
'select public.begin_demo_quest(null::uuid,null::adventure_type,null::text,null::integer,null::text,null::text[],null::integer,null::text,null::integer)',
'select public.begin_world_quest_challenge(null::uuid,null::integer)',
'select public.cancel_demo_adventure(null::uuid)',
'select public.cancel_heart_stone_invitation(null::uuid)',
'select public.cast_world_skip_vote(null::uuid,null::integer)',
'select public.choose_recommendation(null::uuid)',
'select public.complete_adventure_with_feedback(null::uuid,null::feedback_rating,null::text)',
'select public.complete_alpha_adventure(null::uuid,null::feedback_rating,null::text)',
'select public.complete_demo_adventure(null::uuid)',
'select public.complete_private_onboarding(null::boolean)',
'select public.complete_shared_onboarding(null::uuid)',
'select public.compose_date_quest(null::uuid,null::surprise_level,null::quest_reveal_mode)',
'select public.consume_recommendation_request(null::uuid)',
'select public.create_couple_tradition(null::uuid,null::text,null::text,null::tradition_recurrence,null::jsonb,null::uuid,null::timestamp with time zone,null::timestamp with time zone)',
'select public.create_heart_stone_invitation(null::text,null::text,null::integer)',
'select public.create_story_seed_from_memory(null::uuid,null::text)',
'select public.create_storybook_section(null::uuid,null::text,null::integer,null::text)',
'select public.create_storybook_volume(null::uuid,null::text,null::integer,null::text,null::text)',
'select public.create_wild_adventure(null::uuid,null::uuid,null::uuid,null::wild_adventure_intensity,null::wild_adventure_reveal_style)',
'select public.create_world_quest_team(null::text,null::text)',
'select public.decline_heart_stone_invitation(null::text)',
'select public.dismiss_alpha_quest(null::uuid)',
'select public.finalize_storybook_volume(null::uuid)',
'select public.generate_recommendations_v2(null::uuid,null::integer)',
'select public.get_alpha_adventure_history(null::uuid,null::integer)',
'select public.get_alpha_bootstrap()',
'select public.get_alpha_quest_state(null::uuid)',
'select public.get_alpha_readiness(null::uuid)',
'select public.get_demo_adventure_history(null::uuid,null::integer)',
'select public.get_live_alpha_gate(null::uuid)',
'select public.get_my_alpha_onboarding_status(null::uuid)',
'select public.get_world_quest_state(null::uuid)',
'select public.join_alpha_validation_session(null::uuid)',
'select public.join_world_quest_team(null::text,null::text)',
'select public.mark_storybook_volume_ready(null::uuid)',
'select public.open_demo_date_invitation(null::uuid)',
'select public.preview_heart_stone_invitation(null::text)',
'select public.propose_demo_recommendation(null::uuid)',
'select public.publish_storybook_volume(null::uuid,null::uuid)',
'select public.rate_memory(null::uuid,null::memory_rating,null::text,null::boolean)',
'select public.recommendation_learning_profile(null::uuid)',
'select public.record_recommendation_feedback(null::uuid,null::feedback_rating,null::text)',
'select public.record_tradition_occurrence(null::uuid,null::timestamp with time zone,null::text,null::uuid,null::text)',
'select public.record_world_quest_result(null::uuid,null::integer,null::boolean,null::integer)',
'select public.refresh_demo_recommendations(null::uuid,null::uuid[],null::integer)',
'select public.require_active_heart_stone_member(null::uuid)',
'select public.require_alpha_playable_heart_stone(null::uuid)',
'select public.respond_demo_date_invitation(null::uuid,null::boolean)',
'select public.resume_world_quest_team()',
'select public.reveal_demo_adventure(null::uuid)',
'select public.reveal_world_quest_challenge(null::uuid,null::integer)',
'select public.rotate_heart_stone_invitation(null::uuid,null::integer)',
'select public.run_alpha_validation_audit(null::uuid)',
'select public.run_live_alpha_readiness_audit(null::uuid)',
'select public.save_demo_adventure_feedback(null::uuid,null::feedback_rating,null::text)',
'select public.save_private_onboarding_answer(null::text,null::onboarding_answer_kind,null::jsonb,null::boolean)',
'select public.save_recommendation_context(null::uuid,null::context_mode,null::context_location_precision,null::text,null::text,null::text,null::numeric,null::numeric,null::text,null::timestamp with time zone,null::context_daypart,null::text,null::numeric,null::integer,null::timestamp with time zone,null::text,null::text,null::text,null::text,null::numeric,null::integer,null::boolean)',
'select public.save_shared_memory(null::uuid,null::memory_source_type,null::uuid,null::text,null::text,null::timestamp with time zone,null::text,null::text,null::boolean)',
'select public.save_shared_onboarding_answer(null::uuid,null::text,null::jsonb)',
'select public.set_alpha_adventure_step_status(null::uuid,null::text)',
'select public.set_demo_invitation_style(null::uuid,null::text)',
'select public.set_storybook_entry_caption(null::uuid,null::text)',
'select public.set_storybook_entry_inclusion(null::uuid,null::storybook_inclusion_state)',
'select public.set_storybook_entry_narrative(null::uuid,null::text,null::boolean)',
'select public.set_storybook_volume_state(null::uuid,null::storybook_volume_state)',
'select public.set_take_the_long_way(null::uuid,null::boolean,null::integer)',
'select public.set_tradition_state(null::uuid,null::tradition_state)',
'select public.set_travel_session_status(null::uuid,null::travel_session_status)',
'select public.set_travel_stop_status(null::uuid,null::travel_stop_status)',
'select public.signal_do_that_again(null::uuid,null::text,null::uuid,null::repeat_intent,null::text)',
'select public.start_alpha_validation_session(null::uuid)',
'select public.start_another_demo_adventure(null::uuid)',
'select public.start_travel_session(null::uuid,null::travel_session_mode,null::text,null::text,null::text,null::text,null::text,null::text,null::text,null::numeric,null::integer,null::boolean,null::integer)',
'select public.start_world_quest(null::uuid)',
'select public.submit_community_discovery(null::uuid,null::community_contribution_kind,null::discovery_character,null::text,null::text,null::text,null::text,null::text,null::numeric,null::numeric)',
'select public.submit_world_quest_evidence(null::uuid,null::integer,null::text,null::text,null::text,null::bigint,null::integer)',
'select public.suggest_travel_discovery_stops(null::uuid,null::integer)',
'select public.update_travel_position(null::uuid,null::text,null::text,null::text,null::numeric,null::numeric,null::text)',
'select public.withdraw_community_discovery(null::uuid)'] loop
  begin
   execute statement;
   raise exception 'Unrostered legacy call succeeded: %',statement;
  exception when insufficient_privilege then
   if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
  end;
 end loop;
end $check$;
reset role;
do $fixture$
declare a uuid:=gen_random_uuid();
begin
 insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Legacy boundary rollback fixture 20261107"}');
 insert into hs_pilot_internal.legacy_accounts(user_id) values(a);
 perform set_config('request.jwt.claim.sub',a::text,true);
end $fixture$;
set local role authenticated;
select hs_pilot_internal.require_legacy_access();
select * from public.preview_heart_stone_invitation('nonexistent-boundary-test-token');
do $check$
begin
 begin perform public.get_demo_adventure_history(gen_random_uuid(),1);raise exception 'Nonmember history succeeded';
 exception when raise_exception then
  if sqlerrm<>'not authorized for this HEART STONE' then raise;end if;
 end;
end $check$;
reset role;
select set_config('request.jwt.claim.role','service_role',true),set_config('request.jwt.claims','{"role":"service_role"}',true),set_config('request.jwt.claim.sub','',true);
select hs_pilot_internal.require_legacy_access();
rollback;
select 'PASS: all 91 unrostered calls denied by boundary; rostered access retains membership checks; service guard allowed; fixtures rolled back' as result;

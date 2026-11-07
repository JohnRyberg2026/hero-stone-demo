-- Legacy privileged APIs remain a development-only surface.
create schema hs_pilot_internal;
revoke all on schema hs_pilot_internal from public,anon,authenticated;
grant usage on schema hs_pilot_internal to authenticated;
create table hs_pilot_internal.legacy_accounts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now(),
 reason text not null default 'Existing-account development baseline'
);
alter table hs_pilot_internal.legacy_accounts enable row level security;
revoke all on hs_pilot_internal.legacy_accounts from public,anon,authenticated;
insert into hs_pilot_internal.legacy_accounts(user_id)
 select id from auth.users where not is_anonymous and deleted_at is null
 and created_at<=timestamptz '2026-09-06 10:57:07.29255+00';
create function hs_pilot_internal.require_legacy_access()
returns void language plpgsql stable security definer set search_path='' as $guard$
begin
 if auth.role()='service_role' then return;end if;
 if auth.uid() is null or not exists(select 1 from hs_pilot_internal.legacy_accounts where user_id=auth.uid()) then
  raise exception 'This legacy feature is limited to the existing development accounts.' using errcode='42501';
 end if;
end;
$guard$;
revoke all on function hs_pilot_internal.require_legacy_access() from public,anon;
grant execute on function hs_pilot_internal.require_legacy_access() to authenticated,service_role;


-- Checked insertion only: preserve signatures, attributes, grants and original logic.
do $migration$
declare target record;p record;body_new text;definition text;
begin
 for target in select * from (values
('public.accept_alpha_recommendation(uuid)','11cda57fad8191f84e30c5fe2786695d'),
('public.accept_heart_stone_invitation(text)','1481337904467add86887bedcf1ef944'),
('public.add_memory_keepsake(uuid,text,text,text,text)','a24ef4583908b93cd6c8f7e674ac495d'),
('public.add_memory_media(uuid,text,text,text,memory_media_style,integer)','c58db6d2546011056dd6ba329b440138'),
('public.add_memory_note(uuid,text,memory_note_visibility)','25e7a7c2aaba0e36437d3a172b2a8800'),
('public.add_story_seed_to_volume(uuid,uuid,integer,text,text)','840c6c9e9c91a2076f3391132a712ce1'),
('public.advance_world_quest(uuid)','4453130612c237a7793ed57b90418800'),
('public.approve_memory_draft(uuid)','8b300221c406f869313de33325f953c6'),
('public.approve_storybook_entry(uuid,boolean,boolean,boolean,boolean)','396bd35dfd0aca1b0d12f14e8e71c22f'),
('public.archive_storybook_volume(uuid)','156cb365e387772d0142c6a1a2259049'),
('public.assign_storybook_entry_section(uuid,uuid,integer)','36ebbe13634b872db36e14505ccb47f3'),
('public.begin_alpha_quest(uuid,adventure_type,text,integer,text,text[],integer,text,integer)','a3d4b28a4c97cb2a4e7d8e220f1386d5'),
('public.begin_demo_quest(uuid,adventure_type,text,integer,text,text[],integer,text,integer)','ee229ff444eb6bfed5d4e9cdf7b2260e'),
('public.begin_world_quest_challenge(uuid,integer)','4e31661dc3b72c7324416fe6b96dc161'),
('public.cancel_demo_adventure(uuid)','abab42184256364cf2eef3b29f4b62c0'),
('public.cancel_heart_stone_invitation(uuid)','174409c9c046e4299a500ae3132ec0e2'),
('public.cast_world_skip_vote(uuid,integer)','13118c55586079decfb2ebc02cca600f'),
('public.choose_recommendation(uuid)','76cc4b63b4c4c15abba2189fd4c1babb'),
('public.complete_adventure_with_feedback(uuid,feedback_rating,text)','5fb9082b7c0cc96c46f26459abb8e63d'),
('public.complete_alpha_adventure(uuid,feedback_rating,text)','4938e2e4afb585f0468b8294c6aa8eda'),
('public.complete_demo_adventure(uuid)','e70f2e149507cedb4ab728f4eb7d0a75'),
('public.complete_private_onboarding(boolean)','a9c118b21c3d8523e063ba40f19bcefc'),
('public.complete_shared_onboarding(uuid)','120bbef0e0cfea1b63b034ed2e8ecd28'),
('public.compose_date_quest(uuid,surprise_level,quest_reveal_mode)','5ae3a507042101443ad073eac355caa1'),
('public.consume_recommendation_request(uuid)','99d002d87ff1e64f0b3897606f44c1a4'),
('public.create_couple_tradition(uuid,text,text,tradition_recurrence,jsonb,uuid,timestamp with time zone,timestamp with time zone)','7c050ab016f27eb15b9e0648ebe2689b'),
('public.create_heart_stone_invitation(text,text,integer)','735d2cf52d6579f56643407cc685dca7'),
('public.create_story_seed_from_memory(uuid,text)','e956004a82aa836fe1501ad569ae0084'),
('public.create_storybook_section(uuid,text,integer,text)','167685c86a0427b12b2596374e2c1f47'),
('public.create_storybook_volume(uuid,text,integer,text,text)','479e07a07772b141c82dcd5ce24f00e5'),
('public.create_wild_adventure(uuid,uuid,uuid,wild_adventure_intensity,wild_adventure_reveal_style)','7dbdf530300dba50a58985935c227bae'),
('public.create_world_quest_team(text,text)','cde5c385d31817b69b7cf5fc945487c4'),
('public.decline_heart_stone_invitation(text)','369ce14efabaca24c79783645ff8ab75'),
('public.dismiss_alpha_quest(uuid)','8328faf27336391af29125be01ba3cdf'),
('public.finalize_storybook_volume(uuid)','e11e2d5a0169ccdba4682b10c8fdb77a'),
('public.generate_recommendations_v2(uuid,integer)','4a3b53697d6f77c90764cc7385a46268'),
('public.get_alpha_adventure_history(uuid,integer)','38ae932a45abf23daf89c5dc5e700e2b'),
('public.get_alpha_bootstrap()','ffe6d89ad51a8c451d94bd37de76449f'),
('public.get_alpha_quest_state(uuid)','30ee7ad83924cbf57844fa366549290e'),
('public.get_alpha_readiness(uuid)','9d2ba58b3dc6faab05939e71be98f88f'),
('public.get_demo_adventure_history(uuid,integer)','d748f7181c8515cc2539bf782cfba9c7'),
('public.get_live_alpha_gate(uuid)','222cd8ed0b321fdc808ec3f14b9f342f'),
('public.get_my_alpha_onboarding_status(uuid)','61c7eafc8739a8af4f17e4c693a9d67d'),
('public.get_world_quest_state(uuid)','51302d0d34d43d9f5abdd0a4b29101a6'),
('public.join_alpha_validation_session(uuid)','0c4cebaf67c86ebf7b5250c8979973df'),
('public.join_world_quest_team(text,text)','4740dbb5053be3d142397dec889a90ab'),
('public.mark_storybook_volume_ready(uuid)','3edb5da86219e31bff7c4e06d074c0a1'),
('public.open_demo_date_invitation(uuid)','3e1783b13f1649edc8c4559d02dddf1f'),
('public.preview_heart_stone_invitation(text)','3f5fdcbb342b6d2ec29fb74da1c4cf0d'),
('public.propose_demo_recommendation(uuid)','f6be250269758be5f1e7405e84cd3412'),
('public.publish_storybook_volume(uuid,uuid)','df88599b397c8f7ef2632a7f70eb8b74'),
('public.rate_memory(uuid,memory_rating,text,boolean)','e62152b8e1d602de1c63e9fc062d8bf2'),
('public.recommendation_learning_profile(uuid)','aca7a986d43912d8f693f94e6f2d89db'),
('public.record_recommendation_feedback(uuid,feedback_rating,text)','86a659d90d302c4ce485bb1e9a4d635f'),
('public.record_tradition_occurrence(uuid,timestamp with time zone,text,uuid,text)','8c74307a5f319eed2c71376162d25a1c'),
('public.record_world_quest_result(uuid,integer,boolean,integer)','bde06cd574362db1bc91133bf9f6b77c'),
('public.refresh_demo_recommendations(uuid,uuid[],integer)','214eee564d4d03a86f91f4c08e681a8d'),
('public.require_active_heart_stone_member(uuid)','1856813039a0d919e7f08090899d1332'),
('public.require_alpha_playable_heart_stone(uuid)','19dbdb23e0239a465719e26a41b5d709'),
('public.respond_demo_date_invitation(uuid,boolean)','0eca44c655c9472940c836acefb29684'),
('public.resume_world_quest_team()','57b5c5268c22d909154fe94272d27768'),
('public.reveal_demo_adventure(uuid)','c2a0b1b02bffad9d45b1b16364274813'),
('public.reveal_world_quest_challenge(uuid,integer)','bda1cbb7d7fea7b2bc34e714ad9dbd58'),
('public.rotate_heart_stone_invitation(uuid,integer)','f46e6a1e719b2615c0f17f2544461a94'),
('public.run_alpha_validation_audit(uuid)','c200697160a7eaab4c6935291143327b'),
('public.run_live_alpha_readiness_audit(uuid)','183e4016c49fcd1f952cf51e55ad4bf9'),
('public.save_demo_adventure_feedback(uuid,feedback_rating,text)','cfae3fab282202368790a5416be095f6'),
('public.save_private_onboarding_answer(text,onboarding_answer_kind,jsonb,boolean)','f4bf96098a9e8c6e311c86ad33decf2e'),
('public.save_recommendation_context(uuid,context_mode,context_location_precision,text,text,text,numeric,numeric,text,timestamp with time zone,context_daypart,text,numeric,integer,timestamp with time zone,text,text,text,text,numeric,integer,boolean)','6f3af47e15123b0865ec4aaa79de6cc7'),
('public.save_shared_memory(uuid,memory_source_type,uuid,text,text,timestamp with time zone,text,text,boolean)','27bbf19bff76b66fe1aabcc822568e1c'),
('public.save_shared_onboarding_answer(uuid,text,jsonb)','7713349969833d58f40feaab419df743'),
('public.set_alpha_adventure_step_status(uuid,text)','371d02a973efc448e6b8b43f391ef846'),
('public.set_demo_invitation_style(uuid,text)','7092af15b349f09e59e948678755857e'),
('public.set_storybook_entry_caption(uuid,text)','2f6a52c57df5eb2190a4ee4d19b048a6'),
('public.set_storybook_entry_inclusion(uuid,storybook_inclusion_state)','0e13adf396d5e92079587c2778ecd78c'),
('public.set_storybook_entry_narrative(uuid,text,boolean)','e122a56eaae2e2e6c9ca5d05ae26506c'),
('public.set_storybook_volume_state(uuid,storybook_volume_state)','738fdc0a27684ce737707133f847c898'),
('public.set_take_the_long_way(uuid,boolean,integer)','ad8608cceb0674cfc0b23bca678bf09e'),
('public.set_tradition_state(uuid,tradition_state)','156ab55e4931033416967169c224d226'),
('public.set_travel_session_status(uuid,travel_session_status)','65d56760d14344e98070318c5a4e479b'),
('public.set_travel_stop_status(uuid,travel_stop_status)','fc25e1741d9fbc9cb52621580eb9e15d'),
('public.signal_do_that_again(uuid,text,uuid,repeat_intent,text)','a7c5245050ed6b383fa91d66e5805de9'),
('public.start_alpha_validation_session(uuid)','c67f4d4d7b7882daaf490cb1fc386d01'),
('public.start_another_demo_adventure(uuid)','9bbbaa1d62f261a499598041c258957e'),
('public.start_travel_session(uuid,travel_session_mode,text,text,text,text,text,text,text,numeric,integer,boolean,integer)','799d77b6ae147135b71de2a23c29e097'),
('public.start_world_quest(uuid)','85cd7bdfbbb8c7e4a48c036666a7b90d'),
('public.submit_community_discovery(uuid,community_contribution_kind,discovery_character,text,text,text,text,text,numeric,numeric)','ca09c954d87ab6d23e8fa427d28d99fc'),
('public.submit_world_quest_evidence(uuid,integer,text,text,text,bigint,integer)','96a245f9193c3ca0f438e7a9d7a63133'),
('public.suggest_travel_discovery_stops(uuid,integer)','2d034d70fbe3b42ce1437e2f2ecc9017'),
('public.update_travel_position(uuid,text,text,text,numeric,numeric,text)','9fcc141d2115eee545f410314e3074ad'),
('public.withdraw_community_discovery(uuid)','6ef586a849ae6fca441ead8814cfe7c1')
 ) as planned(signature,fingerprint) loop
  select f.oid,f.prosrc,l.lanname,f.prosecdef into strict p
  from pg_proc f join pg_language l on l.oid=f.prolang
  where f.oid=target.signature::regprocedure;
  if not p.prosecdef or md5(p.prosrc)<>target.fingerprint then
   raise exception 'Function changed since boundary review: %',target.signature;
  end if;
  if p.lanname='plpgsql' then
   body_new:=regexp_replace(p.prosrc,'(^|\n)([ \t]*begin)\M',E'\\1\\2\n perform hs_pilot_internal.require_legacy_access();','i');
  elsif p.lanname='sql' then
   body_new:='select hs_pilot_internal.require_legacy_access();'||chr(10)||p.prosrc;
  else raise exception 'Unsupported function language: %',target.signature;
  end if;
  if body_new=p.prosrc or position('hs_pilot_internal.require_legacy_access()' in body_new)=0 then
   raise exception 'Entry guard insertion failed: %',target.signature;
  end if;
  definition:=pg_get_functiondef(p.oid);
  if cardinality(string_to_array(definition,p.prosrc))<>2 then raise exception 'Ambiguous function body: %',target.signature;end if;
  execute replace(definition,p.prosrc,body_new);
 end loop;
end $migration$;

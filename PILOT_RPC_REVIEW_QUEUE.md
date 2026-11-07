# Pilot privileged API review queue — November 7, 2026

Current inventory: **98** public SECURITY DEFINER functions callable by authenticated. This is a finite review queue, not a count of proven vulnerabilities.

The current invitation/calendar invoker wrappers and their internal implementations were tested separately in [PILOT_ACCESS_REVIEW.md](PILOT_ACCESS_REVIEW.md). They are not counted as public SECURITY DEFINER here. The six helpers/triggers have an explicitly limited accepted disposition; other entries are not cleared for broader enrollment by a source inspection alone.

A function can leave this queue's unresolved/partial state when its authorization and disclosure behavior are verified with authorized and unauthorized actors, or when server-side access is restricted for pilot users. A hidden button or route is not server isolation. A function deliberately retained for existing development must have that restricted-use decision recorded; it must not silently become part of the advertised pilot.

| Function signature | Current disposition |
| --- | --- |
| `accept_alpha_recommendation(uuid)` | Unresolved: authorization review or server isolation required |
| `accept_heart_stone_invitation(text)` | Partial: body inspected; legacy signed-in review incomplete |
| `add_memory_keepsake(uuid,text,text,text,text)` | Unresolved: authorization review or server isolation required |
| `add_memory_media(uuid,text,text,text,memory_media_style,integer)` | Unresolved: authorization review or server isolation required |
| `add_memory_note(uuid,text,memory_note_visibility)` | Unresolved: authorization review or server isolation required |
| `add_story_seed_to_volume(uuid,uuid,integer,text,text)` | Unresolved: authorization review or server isolation required |
| `advance_world_quest(uuid)` | Partial: anonymous denial + selected membership checks |
| `approve_memory_draft(uuid)` | Unresolved: authorization review or server isolation required |
| `approve_storybook_entry(uuid,boolean,boolean,boolean,boolean)` | Unresolved: authorization review or server isolation required |
| `archive_storybook_volume(uuid)` | Unresolved: authorization review or server isolation required |
| `assign_storybook_entry_section(uuid,uuid,integer)` | Unresolved: authorization review or server isolation required |
| `begin_alpha_quest(uuid,adventure_type,text,integer,text,text[],integer,text,integer)` | Unresolved: authorization review or server isolation required |
| `begin_demo_quest(uuid,adventure_type,text,integer,text,text[],integer,text,integer)` | Partial: body inspected; legacy signed-in review incomplete |
| `begin_world_quest_challenge(uuid,integer)` | Partial: anonymous denial + selected membership checks |
| `cancel_demo_adventure(uuid)` | Partial: body inspected; legacy signed-in review incomplete |
| `cancel_heart_stone_invitation(uuid)` | Partial: body inspected; legacy signed-in review incomplete |
| `capture_adventure_candidate_learning()` | Accepted scoped helper/trigger exception |
| `cast_world_skip_vote(uuid,integer)` | Partial: anonymous denial + selected membership checks |
| `choose_recommendation(uuid)` | Unresolved: authorization review or server isolation required |
| `complete_adventure_with_feedback(uuid,feedback_rating,text)` | Unresolved: authorization review or server isolation required |
| `complete_alpha_adventure(uuid,feedback_rating,text)` | Unresolved: authorization review or server isolation required |
| `complete_demo_adventure(uuid)` | Partial: body inspected; legacy signed-in review incomplete |
| `complete_private_onboarding(boolean)` | Partial: body inspected; legacy signed-in review incomplete |
| `complete_shared_onboarding(uuid)` | Partial: body inspected; legacy signed-in review incomplete |
| `compose_date_quest(uuid,surprise_level,quest_reveal_mode)` | Unresolved: authorization review or server isolation required |
| `consume_recommendation_request(uuid)` | Unresolved: authorization review or server isolation required |
| `create_couple_tradition(uuid,text,text,tradition_recurrence,jsonb,uuid,timestamp with time zone,timestamp with time zone)` | Unresolved: authorization review or server isolation required |
| `create_heart_stone_invitation(text,text,integer)` | Partial: body inspected; legacy signed-in review incomplete |
| `create_story_seed_from_memory(uuid,text)` | Unresolved: authorization review or server isolation required |
| `create_storybook_section(uuid,text,integer,text)` | Unresolved: authorization review or server isolation required |
| `create_storybook_volume(uuid,text,integer,text,text)` | Unresolved: authorization review or server isolation required |
| `create_wild_adventure(uuid,uuid,uuid,wild_adventure_intensity,wild_adventure_reveal_style)` | Unresolved: authorization review or server isolation required |
| `create_world_quest_team(text,text)` | Partial: anonymous denial + selected membership checks |
| `current_user_email()` | Accepted scoped helper/trigger exception |
| `decline_heart_stone_invitation(text)` | Partial: body inspected; legacy signed-in review incomplete |
| `dismiss_alpha_quest(uuid)` | Unresolved: authorization review or server isolation required |
| `finalize_storybook_volume(uuid)` | Unresolved: authorization review or server isolation required |
| `generate_recommendations_v2(uuid,integer)` | Unresolved: authorization review or server isolation required |
| `get_alpha_adventure_history(uuid,integer)` | Unresolved: authorization review or server isolation required |
| `get_alpha_bootstrap()` | Unresolved: authorization review or server isolation required |
| `get_alpha_quest_state(uuid)` | Unresolved: authorization review or server isolation required |
| `get_alpha_readiness(uuid)` | Unresolved: authorization review or server isolation required |
| `get_demo_adventure_history(uuid,integer)` | Partial: body inspected; legacy signed-in review incomplete |
| `get_heart_stone_partner_personalization(uuid)` | Partial: body inspected; legacy signed-in review incomplete |
| `get_live_alpha_gate(uuid)` | Unresolved: authorization review or server isolation required |
| `get_my_alpha_onboarding_status(uuid)` | Partial: body inspected; legacy signed-in review incomplete |
| `get_world_quest_state(uuid)` | Partial: anonymous denial + selected membership checks |
| `guard_demo_memory_storybook()` | Accepted scoped helper/trigger exception |
| `handle_new_auth_user()` | Accepted scoped helper/trigger exception |
| `is_active_heart_stone_member(uuid)` | Accepted scoped helper/trigger exception |
| `is_any_heart_stone_member(uuid)` | Accepted scoped helper/trigger exception |
| `join_alpha_validation_session(uuid)` | Unresolved: authorization review or server isolation required |
| `join_world_quest_team(text,text)` | Partial: anonymous denial + selected membership checks |
| `mark_storybook_volume_ready(uuid)` | Unresolved: authorization review or server isolation required |
| `open_demo_date_invitation(uuid)` | Partial: body inspected; legacy signed-in review incomplete |
| `preview_heart_stone_invitation(text)` | Partial: body inspected; legacy signed-in review incomplete |
| `propose_demo_recommendation(uuid)` | Partial: body inspected; legacy signed-in review incomplete |
| `publish_storybook_volume(uuid,uuid)` | Unresolved: authorization review or server isolation required |
| `rate_memory(uuid,memory_rating,text,boolean)` | Unresolved: authorization review or server isolation required |
| `recommendation_learning_profile(uuid)` | Unresolved: authorization review or server isolation required |
| `record_recommendation_feedback(uuid,feedback_rating,text)` | Unresolved: authorization review or server isolation required |
| `record_tradition_occurrence(uuid,timestamp with time zone,text,uuid,text)` | Unresolved: authorization review or server isolation required |
| `record_world_quest_result(uuid,integer,boolean,integer)` | Partial: anonymous denial + selected membership checks |
| `refresh_demo_recommendations(uuid,uuid[],integer)` | Partial: body inspected; legacy signed-in review incomplete |
| `require_active_heart_stone_member(uuid)` | Unresolved: authorization review or server isolation required |
| `require_alpha_playable_heart_stone(uuid)` | Unresolved: authorization review or server isolation required |
| `respond_demo_date_invitation(uuid,boolean)` | Partial: body inspected; legacy signed-in review incomplete |
| `resume_world_quest_team()` | Partial: anonymous denial + selected membership checks |
| `reveal_demo_adventure(uuid)` | Partial: body inspected; legacy signed-in review incomplete |
| `reveal_world_quest_challenge(uuid,integer)` | Partial: anonymous denial + selected membership checks |
| `rotate_heart_stone_invitation(uuid,integer)` | Partial: body inspected; legacy signed-in review incomplete |
| `run_alpha_validation_audit(uuid)` | Unresolved: authorization review or server isolation required |
| `run_live_alpha_readiness_audit(uuid)` | Unresolved: authorization review or server isolation required |
| `save_demo_adventure_feedback(uuid,feedback_rating,text)` | Partial: body inspected; legacy signed-in review incomplete |
| `save_private_onboarding_answer(text,onboarding_answer_kind,jsonb,boolean)` | Partial: body inspected; legacy signed-in review incomplete |
| `save_recommendation_context(uuid,context_mode,context_location_precision,text,text,text,numeric,numeric,text,timestamp with time zone,context_daypart,text,numeric,integer,timestamp with time zone,text,text,text,text,numeric,integer,boolean)` | Unresolved: authorization review or server isolation required |
| `save_shared_memory(uuid,memory_source_type,uuid,text,text,timestamp with time zone,text,text,boolean)` | Unresolved: authorization review or server isolation required |
| `save_shared_onboarding_answer(uuid,text,jsonb)` | Partial: body inspected; legacy signed-in review incomplete |
| `set_alpha_adventure_step_status(uuid,text)` | Unresolved: authorization review or server isolation required |
| `set_demo_invitation_style(uuid,text)` | Partial: body inspected; legacy signed-in review incomplete |
| `set_storybook_entry_caption(uuid,text)` | Unresolved: authorization review or server isolation required |
| `set_storybook_entry_inclusion(uuid,storybook_inclusion_state)` | Unresolved: authorization review or server isolation required |
| `set_storybook_entry_narrative(uuid,text,boolean)` | Unresolved: authorization review or server isolation required |
| `set_storybook_volume_state(uuid,storybook_volume_state)` | Unresolved: authorization review or server isolation required |
| `set_take_the_long_way(uuid,boolean,integer)` | Unresolved: authorization review or server isolation required |
| `set_tradition_state(uuid,tradition_state)` | Unresolved: authorization review or server isolation required |
| `set_travel_session_status(uuid,travel_session_status)` | Unresolved: authorization review or server isolation required |
| `set_travel_stop_status(uuid,travel_stop_status)` | Unresolved: authorization review or server isolation required |
| `signal_do_that_again(uuid,text,uuid,repeat_intent,text)` | Unresolved: authorization review or server isolation required |
| `start_alpha_validation_session(uuid)` | Unresolved: authorization review or server isolation required |
| `start_another_demo_adventure(uuid)` | Partial: body inspected; legacy signed-in review incomplete |
| `start_travel_session(uuid,travel_session_mode,text,text,text,text,text,text,text,numeric,integer,boolean,integer)` | Unresolved: authorization review or server isolation required |
| `start_world_quest(uuid)` | Partial: anonymous denial + selected membership checks |
| `submit_community_discovery(uuid,community_contribution_kind,discovery_character,text,text,text,text,text,numeric,numeric)` | Unresolved: authorization review or server isolation required |
| `submit_world_quest_evidence(uuid,integer,text,text,text,bigint,integer)` | Partial: anonymous denial + selected membership checks |
| `suggest_travel_discovery_stops(uuid,integer)` | Unresolved: authorization review or server isolation required |
| `update_travel_position(uuid,text,text,text,numeric,numeric,text)` | Unresolved: authorization review or server isolation required |
| `withdraw_community_discovery(uuid)` | Unresolved: authorization review or server isolation required |

Source baseline: `1c58e16d471b8398f3984f138fe28f41ce55814b`. Database role inventory read on November 7, 2026. No function access changed during inventory creation.

## Exit condition
Before new tester accounts are invited, every entry reachable by those accounts needs a recorded acceptable disposition or enforced server isolation. Test the pilot paths after isolation. This rule does not require making the advisor counter zero, removing necessary authenticated functions, or redesigning unrelated products.

# Pilot privileged API review queue — November 7, 2026

Current inventory: **98** public SECURITY DEFINER functions callable by authenticated. This is a finite review queue, not a count of proven vulnerabilities.

The current invitation/calendar invoker wrappers and their internal implementations were tested separately in [PILOT_ACCESS_REVIEW.md](PILOT_ACCESS_REVIEW.md). They are not counted as public SECURITY DEFINER here. Seven scoped exceptions remain; all other 91 entries are now restricted by a server-enforced existing-development roster. This does not certify their full legacy behavior.

A function can leave this queue's unresolved/partial state when its authorization and disclosure behavior are verified with authorized and unauthorized actors, or when server-side access is restricted for pilot users. A hidden button or route is not server isolation. A function deliberately retained for existing development must have that restricted-use decision recorded; it must not silently become part of the advertised pilot.

| Function signature | Current disposition |
| --- | --- |
| `accept_alpha_recommendation(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `accept_heart_stone_invitation(text)` | Server restricted to existing development roster; full legacy audit deferred |
| `add_memory_keepsake(uuid,text,text,text,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `add_memory_media(uuid,text,text,text,memory_media_style,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `add_memory_note(uuid,text,memory_note_visibility)` | Server restricted to existing development roster; full legacy audit deferred |
| `add_story_seed_to_volume(uuid,uuid,integer,text,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `advance_world_quest(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `approve_memory_draft(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `approve_storybook_entry(uuid,boolean,boolean,boolean,boolean)` | Server restricted to existing development roster; full legacy audit deferred |
| `archive_storybook_volume(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `assign_storybook_entry_section(uuid,uuid,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `begin_alpha_quest(uuid,adventure_type,text,integer,text,text[],integer,text,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `begin_demo_quest(uuid,adventure_type,text,integer,text,text[],integer,text,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `begin_world_quest_challenge(uuid,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `cancel_demo_adventure(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `cancel_heart_stone_invitation(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `capture_adventure_candidate_learning()` | Accepted scoped helper/trigger exception |
| `cast_world_skip_vote(uuid,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `choose_recommendation(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `complete_adventure_with_feedback(uuid,feedback_rating,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `complete_alpha_adventure(uuid,feedback_rating,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `complete_demo_adventure(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `complete_private_onboarding(boolean)` | Server restricted to existing development roster; full legacy audit deferred |
| `complete_shared_onboarding(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `compose_date_quest(uuid,surprise_level,quest_reveal_mode)` | Server restricted to existing development roster; full legacy audit deferred |
| `consume_recommendation_request(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `create_couple_tradition(uuid,text,text,tradition_recurrence,jsonb,uuid,timestamp with time zone,timestamp with time zone)` | Server restricted to existing development roster; full legacy audit deferred |
| `create_heart_stone_invitation(text,text,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `create_story_seed_from_memory(uuid,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `create_storybook_section(uuid,text,integer,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `create_storybook_volume(uuid,text,integer,text,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `create_wild_adventure(uuid,uuid,uuid,wild_adventure_intensity,wild_adventure_reveal_style)` | Server restricted to existing development roster; full legacy audit deferred |
| `create_world_quest_team(text,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `current_user_email()` | Accepted scoped helper/trigger exception |
| `decline_heart_stone_invitation(text)` | Server restricted to existing development roster; full legacy audit deferred |
| `dismiss_alpha_quest(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `finalize_storybook_volume(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `generate_recommendations_v2(uuid,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `get_alpha_adventure_history(uuid,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `get_alpha_bootstrap()` | Server restricted to existing development roster; full legacy audit deferred |
| `get_alpha_quest_state(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `get_alpha_readiness(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `get_demo_adventure_history(uuid,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `get_heart_stone_partner_personalization(uuid)` | Accepted scoped home lookup: active membership, no gender, consented pronouns |
| `get_live_alpha_gate(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `get_my_alpha_onboarding_status(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `get_world_quest_state(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `guard_demo_memory_storybook()` | Accepted scoped helper/trigger exception |
| `handle_new_auth_user()` | Accepted scoped helper/trigger exception |
| `is_active_heart_stone_member(uuid)` | Accepted scoped helper/trigger exception |
| `is_any_heart_stone_member(uuid)` | Accepted scoped helper/trigger exception |
| `join_alpha_validation_session(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `join_world_quest_team(text,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `mark_storybook_volume_ready(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `open_demo_date_invitation(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `preview_heart_stone_invitation(text)` | Server restricted to existing development roster; full legacy audit deferred |
| `propose_demo_recommendation(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `publish_storybook_volume(uuid,uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `rate_memory(uuid,memory_rating,text,boolean)` | Server restricted to existing development roster; full legacy audit deferred |
| `recommendation_learning_profile(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `record_recommendation_feedback(uuid,feedback_rating,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `record_tradition_occurrence(uuid,timestamp with time zone,text,uuid,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `record_world_quest_result(uuid,integer,boolean,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `refresh_demo_recommendations(uuid,uuid[],integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `require_active_heart_stone_member(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `require_alpha_playable_heart_stone(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `respond_demo_date_invitation(uuid,boolean)` | Server restricted to existing development roster; full legacy audit deferred |
| `resume_world_quest_team()` | Server restricted to existing development roster; full legacy audit deferred |
| `reveal_demo_adventure(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `reveal_world_quest_challenge(uuid,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `rotate_heart_stone_invitation(uuid,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `run_alpha_validation_audit(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `run_live_alpha_readiness_audit(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `save_demo_adventure_feedback(uuid,feedback_rating,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `save_private_onboarding_answer(text,onboarding_answer_kind,jsonb,boolean)` | Server restricted to existing development roster; full legacy audit deferred |
| `save_recommendation_context(uuid,context_mode,context_location_precision,text,text,text,numeric,numeric,text,timestamp with time zone,context_daypart,text,numeric,integer,timestamp with time zone,text,text,text,text,numeric,integer,boolean)` | Server restricted to existing development roster; full legacy audit deferred |
| `save_shared_memory(uuid,memory_source_type,uuid,text,text,timestamp with time zone,text,text,boolean)` | Server restricted to existing development roster; full legacy audit deferred |
| `save_shared_onboarding_answer(uuid,text,jsonb)` | Server restricted to existing development roster; full legacy audit deferred |
| `set_alpha_adventure_step_status(uuid,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `set_demo_invitation_style(uuid,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `set_storybook_entry_caption(uuid,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `set_storybook_entry_inclusion(uuid,storybook_inclusion_state)` | Server restricted to existing development roster; full legacy audit deferred |
| `set_storybook_entry_narrative(uuid,text,boolean)` | Server restricted to existing development roster; full legacy audit deferred |
| `set_storybook_volume_state(uuid,storybook_volume_state)` | Server restricted to existing development roster; full legacy audit deferred |
| `set_take_the_long_way(uuid,boolean,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `set_tradition_state(uuid,tradition_state)` | Server restricted to existing development roster; full legacy audit deferred |
| `set_travel_session_status(uuid,travel_session_status)` | Server restricted to existing development roster; full legacy audit deferred |
| `set_travel_stop_status(uuid,travel_stop_status)` | Server restricted to existing development roster; full legacy audit deferred |
| `signal_do_that_again(uuid,text,uuid,repeat_intent,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `start_alpha_validation_session(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `start_another_demo_adventure(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `start_travel_session(uuid,travel_session_mode,text,text,text,text,text,text,text,numeric,integer,boolean,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `start_world_quest(uuid)` | Server restricted to existing development roster; full legacy audit deferred |
| `submit_community_discovery(uuid,community_contribution_kind,discovery_character,text,text,text,text,text,numeric,numeric)` | Server restricted to existing development roster; full legacy audit deferred |
| `submit_world_quest_evidence(uuid,integer,text,text,text,bigint,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `suggest_travel_discovery_stops(uuid,integer)` | Server restricted to existing development roster; full legacy audit deferred |
| `update_travel_position(uuid,text,text,text,numeric,numeric,text)` | Server restricted to existing development roster; full legacy audit deferred |
| `withdraw_community_discovery(uuid)` | Server restricted to existing development roster; full legacy audit deferred |

Source baseline: `1c58e16d471b8398f3984f138fe28f41ce55814b`. Database role inventory read on November 7, 2026. No function access changed during inventory creation.

## Exit condition
Before new tester accounts are invited, every entry reachable by those accounts needs a recorded acceptable disposition or enforced server isolation. Test the pilot paths after isolation. This rule does not require making the advisor counter zero, removing necessary authenticated functions, or redesigning unrelated products.

## Legacy API boundary applied — November 7, 2026

Migration `gate_legacy_privileged_apis_with_checked_entry_guards` restricts 91 legacy public SECURITY DEFINER endpoints to the three preexisting development accounts. The private administrator-managed roster has RLS enabled and no client table grants. Signup does not enroll accounts. The trusted service role can use the guard; browser accounts cannot grant themselves access. Existing function signatures, grants and business checks were preserved through fingerprint-checked body insertion.

Seven exceptions remain: the six scoped helpers/triggers and `get_heart_stone_partner_personalization(uuid)`. The latter supports the simple home, requires active membership, omits gender and exposes pronouns only with consent. These exceptions are not blanket authorization for other legacy features. Current invitation/calendar/preferences APIs retain their separate ownership and participant checks.

Verification: all 91 typed-null calls by an unrostered authenticated identity failed with the specific boundary denial. A rollback-only rostered fixture passed the guard and preview, while its nonmember history request still failed membership authorization. The service guard check passed. Current invitation/lifecycle/private calendar/memory, preferences, shared availability, wish revocation, anonymous legacy and World Quest role regressions passed. Three existing roster entries remain; no boundary fixture profiles remain. No real invitation or memory was changed, no tester was added, and no paid AI call was made.

Advisor counts remain six anonymous and 98 authenticated privileged-function findings. RLS-without-policy INFO is now 22: the additional private roster deliberately denies client row access. Password-protection finding remains. This is a scoped server boundary, not full certification or enrollment clearance.

Source: [boundary migration](database/pilot-legacy-api-boundary.sql). Repeatable rollback checks: [boundary test](database/test-pilot-legacy-boundary.sql). A2 enrollment/API configuration and A3 password/recovery remain HOLD gates.

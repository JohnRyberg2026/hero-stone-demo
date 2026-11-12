# Account-holder profile implementation

## Coding checkpoint — October 16, 2026

The approved Profile Application Flow extends through Step 28. Its architecture pause point remains Step 29. The current implementation follows that baseline incrementally; coding progress is separate from architecture approval.

The opening and the first twenty-eight approved screens are implemented:

- Opening: Get Started / I’ll Do This Later; optional answers, no completion score.
- Step 1, A Little About You: optional private call-me name and the approved multi-select free-time choices.
- Step 2, Your Adventure Comfort Zone: single Familiar/Stretch/Wild default with descriptions, and the four independent surprise choices. These are defaults, never permission to exceed boundaries.
- Step 3, Who Are We Planning For?: multi-select partner/family/friends/group/sometimes just me. Selecting a context does not invite or share with anyone.
- Step 4, What Helps You Feel Connected?: multiple connection styles, plus an optional own-words field for Something else. A saved own-words answer remains accessible even if Something else is later deselected.
- Step 5, Your Timing & Rhythm: multiple availability windows and a single notice preference. Availability permits suggestions, not obligations or bookings; setup connects no calendars.
- Step 6, Your Energy & Pace: multiple comfortable paces and durations, plus optional physical-comfort notes. No medical details are required. Saving typical pace or duration does not change temporary limits for today.
- Step 7, Your Social Comfort: separate multi-select questions for preferred settings and interacting with new people. Crowd comfort does not imply an interest in meeting strangers; no personality labels are inferred.
- Step 8, Your Food & Dining Style: multiple food-adventurousness and food-experience choices. Optional separate fields distinguish ordinary dislikes from allergies/dietary requirements. Requirements pause sample suggestions until verified; dislikes are not promoted to safety constraints.
- Step 9, What Are You Into?: the approved enjoyment categories plus an optional own-words field. Curiosity has a separate optional own-words field; it never marks an existing like or changes adventure comfort. The saved design specified the curiosity prompt but no distinct curiosity option list, so it accepts multiple ideas in the member's words.
- Step 10, How Far Should We Go?: multiple typical-distance preferences, a farther-for-special default, and an overnight default. Lodging choices appear only with a positive overnight preference, are capped at three, and can optionally be ranked with move controls. Changing overnight to Not really my thing retains lodging answers as inactive; review identifies them as inactive.
- Step 11, Your Spending Comfort: multiple comfort levels and whole-experience cost factors. No income or required dollar disclosure. These preferences do not increase another person's comfort or change today's spending choices.
- Step 12, How Do You Like Plans to Happen?: multiple initiative/planning-work preferences and assistance levels. Asking HEART STONE to take the lead does not change surprise choices, bypass constraints, book anything, or send invitations.
- Step 13, Decision-Making & Choice Style: one default among Show Me Everything / Give Me 3 / Recommend the Best One / Just Decide for Me, with a separate Yes/No situation-flexibility question. This does not authorize actions or bypass boundaries. Couple style reconciliation is not implemented here.
- Step 14, Personal Boundaries, Hard No’s & Safety Preferences: multiple avoidance categories, optional details, and a private marker. Nothing comes to mind right now is exclusive with positive categories and distinct from leaving the question unanswered. Changing that choice does not erase saved written details.
- Step 15, Accessibility, Accommodations & Experience Needs: practical needs rather than diagnoses, optional details, and a private marker. No accommodations right now is exclusive with positive needs; all questions can be skipped. Written details remain independently editable.

The original 17-section scaffold remains available for additional details. It must not be described as the full approved 28-step flow. All 28 currently approved screens are now represented. The final readiness transition is not implemented yet; the starter does not claim a completed profile.

## Storage and compatibility

All answers use the existing owner-only `user_onboarding_answers` table and `account_profile_v1_` prefix. No schema or sharing-policy changes are required.

New keys: `call_me`, `free_time`, `planning_for`, `starter_resume`, and `starter_started`. The optional private `call_me` name is distinct from the required account identity in `profiles.first_name`; this flow does not alter the account identity or partner-visible name.

Steps 4–6 add `connection_styles`, `connection_other`, `available_windows`, `planning_notice`, `energy_pace`, `experience_length`, and `physical_comfort_notes`. These do not overwrite the earlier scaffold's free-text connection/timing or single pace answers. Their broader recommendation integration is still pending. Physical-comfort notes do participate in the existing written-requirement gate: sample suggestions pause until needs can be verified, and note contents do not appear in suggestion output.

Steps 7–9 add `social_settings`, `meeting_people`, `food_adventurousness`, `food_experiences`, `food_dislikes`, `food_requirements`, `enjoyed_interests`, `enjoyed_other`, and `curious_interests`. Earlier scaffold keys remain intact. New enjoyment categories and curiosities are saved separately from the older preview-supported `interests` taxonomy; broader recommendation use remains pending. The new `food_requirements` key joins the requirement gate without copying its contents into suggestion reasons, journey snapshots, or shares.

Steps 10–12 add `travel_distance`, `farther_for_special`, `overnight_comfort`, `lodging_preferences`, `lodging_ranked`, `spending_comfort`, `cost_considerations`, `planning_initiative`, and `planning_assistance`. The lodging array is ranked only when the member explicitly sets `lodging_ranked` to true; otherwise order conveys no priority. Saved lodging answers do not imply overnight openness. These new defaults are not yet consumed by the main recommendation engine or sample preview, and do not overwrite older travel, budget, planning, or surprise answers.

Step 13 reuses `decisions` and adds `decision_flexibility`. Steps 14–15 add `hard_no_categories`, `hard_no_details`, `boundaries_private`, `accommodation_needs`, `accommodation_details`, and `accommodations_private`. The older free-text `hard_nos` and `accessibility` keys remain intact, without inferred migration.

Private markers default to private in the UI, without writing an answer until the member acts. These are owner-only annotations, not sharing controls: turning a marker off never grants partner access or authorizes disclosure. Future consumers must still require explicit sharing permission. No partner planning integration with these new requirements is implemented yet.

Positive boundary/accessibility categories, malformed nonempty requirement data, and optional requirement details pause unverified sample suggestions. Generic requirement labels are shown; categories and explanations do not enter suggestion reasons or journey snapshots. None selections are not consent, do not erase other requirements, and never override written details. Wild, Just Decide for Me, and private-marker settings cannot bypass this gate.

Adventure comfort reuses `exploration`. Surprise level reuses `surprise`. Previously saved surprise wording is shown as a prior answer without translating or overwriting it. Members choose whether to replace it. Review displays shared fields once.

Starter resume is independent of the older additional-details resume key. Skipping keeps saved answers; unanswered fields remain unknown. Skipping the opening writes no answers. Retry Save appears only after a save failure.

## Existing preview integration

Supported saved interests and free-experience preferences inform the private first-journey sample preview. Written requirements and failed profile reads pause its suggestions. This is not integration with the main couple recommendation RPCs. Those remain unchanged.

## Verification

`npm ci && npm test` runs the save/resume, starter-flow, profile-runtime, and preview-integration suites with simulated private accounts.

`npx playwright install chromium` followed by `npm run test:browser` checks the starter at 320px, 390px, and 1280px widths, including save/reload, selection, skipping, and failure/retry. `PROFILE_BROWSER_EXECUTABLE` optionally selects an existing Chromium executable; `PROFILE_BROWSER_ARGS` optionally provides a JSON array of launch flags. Screenshots go to the temporary directory.

Real-account end-to-end verification and deployment remain separate steps. Test fixtures do not modify personal account answers.

## Steps 16–18

Meaningful occasions support the approved categories and two optional named items with free-form dates (no year required) and independent handling preferences, including no reminder. Private markers remain owner-only annotations. Thoughtfulness stores receiving and giving separately, with optional help preferences and no gift obligation. Memory preferences distinguish capture help from post-adventure prompts; no recap is required.

New keys: `meaningful_occasions`, `occasion_1_name`, `occasion_1_date`, `occasion_1_handling`, corresponding `occasion_2_*`, `occasions_private`, `thoughtful_receiving`, `thoughtful_giving`, `thoughtful_help`, `memory_styles`, `story_help`, `memory_followup`. These are private profile preferences only. Reminder scheduling, date-driven planning, purchases, capture, sharing, and prompt delivery are not implemented or authorized by these answers. No automations are created. Broader integrations must honor no-reminder, no-gift, only-on-request, and never preferences before use.

Latest general invitation decline/recovery fixes from main are included. Automated and responsive browser coverage extends through all 18 screens, including optional skips, private date persistence, independent giving/receiving, and no recap defaults.

## Steps 19–21

Learning, Growth & Curiosity Style saves discovery topics, desired learning depth, and openness beyond known interests separately from existing interests and Familiar/Stretch/Wild. Surprise, Spontaneity & Control saves delegation, required advance details, and reveal timing without changing the earlier surprise default. The know-details and nothing-to-reveal options are exclusive within their own lists. Mandatory consent/safety/accessibility/cost disclosure can never be waived by these preferences. Communication & Connection Style captures multiple ways of connecting, conversation amount, and optional prompt help without relationship scoring or judging differences.

Keys: `learning_discoveries`, `learning_amount`, `discovery_openness`, `surprise_delegation`, `surprise_essentials`, `surprise_reveal`, `communication_connection`, `conversation_amount`, `conversation_help`. All remain optional, owner-only, autosaved, editable, and independently resumable. Broader learning/ranking, surprise delivery, couple reconciliation, and conversation-prompt integration are pending. Required advance details pause the private sample preview until they can be verified; Nothing—keep the surprise cannot clear any other constraint. Tests cover selection exclusions, reload, preserved earlier defaults, no/skip paths, and all 21 screens at three widths. Includes current main Continue-selection and home-status visibility fixes.

## Steps 22–24

Social Battery & Recovery Style stores multiple recovery preferences, one usual itinerary density, and breathing-room preference. Weather, Environment & Setting Preferences keeps liked settings and weather flexibility separate from ordinary avoids; these do not create or replace hard boundaries. Transportation & Getting There Style stores multiple methods and journey preferences (several can fit different days), plus transportation considerations. Nothing in particular is exclusive within each relevant list, distinct from unknown, and cannot erase earlier access needs. Driver preferences do not assign another person or imply vehicle availability.

Keys: `recovery_style`, `itinerary_density`, `breathing_room`, `setting_preferences`, `weather_flexibility`, `weather_avoid`, `transport_methods`, `journey_style`, `transport_considerations`. All remain optional/private/editable with save/resume. New transportation considerations pause unverified sample suggestions with a generic label, without exposing selected details. Ordinary weather preferences do not become safety gates. Broader recovery-aware itinerary planning, weather pivots/live conditions, route/departure guidance, driver reconciliation, and transportation booking remain pending. No schema changes, sharing, bookings, or partner assignments. All 24 screens are covered by automated and three-width browser checks.

## Steps 25–28

Time-of-Day & Experience Timing Style stores multiple preferred times, optional own-words activity/time ideas, and a notice default separate from the earlier timing screen; earlier answers are preserved without inferred migration. Familiar Places vs. New Discoveries stores one familiarity default, optional favorites, and two optional named-item feedback entries. Feedback controls appear only with a name; changing or clearing that name clears its prior feedback to prevent transferring a veto to a different item. Negative repeat feedback pauses unverified sample suggestions with a generic label. No location details enter suggestion output.

Cost Changes & Upgrades stores one out-of-range handling default and multiple savings preferences; Don't optimize around price unless I ask is exclusive with the other savings choices. None authorize spending or expand another person's limit. Who We Enjoy Experiences With stores multiple companions separately from whether HEART STONE should suggest others, plus one-on-one importance. Choosing companions sends no invitation and cannot override Only when I ask or Keep DATE QUEST focused on us.

Keys: `adventure_daytimes`, `daytime_ideas`, `experience_notice`, `place_discovery`, `favorite_places`, `past_place_1_name`, `past_place_1_feedback`, corresponding `past_place_2_*`, `cost_change_handling`, `savings_preferences`, `experience_companions`, `one_on_one_importance`, `suggest_others`. Onboarding starts with two named-item slots rather than a full place catalog; expanding that catalog remains pending. Exact contextual activity/time option lists were not specified, so time-based ideas use optional own words.

All 28 approved profile screens are coded; this is not a declaration that the complete profile product is ready. Step 29 design remains paused. Final readiness transition, progressive phase/navigation refinement, full profile-to-planning integration, robust place exclusion matching, shared cost/group-envelope recalculation, real-account end-to-end testing, merge, and deployment remain pending. All new questions remain optional/private/autosaved/resumable. Test coverage extends through all 28 screens, all-skip behavior, name-scoped feedback clearing, independent defaults, and three viewport widths.

## Topic navigation

My Profile now lists all 28 approved screens directly, in their existing order, with an accessible search and no-results message. Search is temporary UI state and writes no profile answers. Opening a topic flushes pending edits first and updates the existing starter resume pointer; failures retain the overview and Retry Save. Members can jump to a topic, edit, stop, and resume there after reload. The opening remains free of a category list or completion pressure. Older extra-detail sections remain available under a collapsed Tell HEART STONE More disclosure.

Exact approved screen-to-phase assignments and readiness minimums were not specified in the retrieved baseline; this change preserves existing phase metadata and does not invent a readiness threshold or move the Step 29 design pause. Topic access/navigation is implemented; phase-break onboarding and readiness remain pending. Tests cover all 28 links, search/clear/no-results, no search writes, failed-save navigation, direct edit/reload/resume, and three viewport widths.

## Approved enjoyment integration

The private preview now consumes supported Step 9 `enjoyed_interests`: Nature & wildlife → Nature, Hiking & exploring → Walks, Local history & hidden places → Local history, Paranormal & unusual experiences → Paranormal stories, Volunteering & community → Volunteering. Other categories have no matching sample tags and remain saved without inferred matches. Curiosity and own-words notes do not become likes. The newer answer takes precedence whenever its key exists, including null/empty/malformed data; only absent newer keys fall back to the older scaffold interests. Explicit current like/dislike/unsure/skip answers still win per tag. All requirement gates and current time/walking/free limits run before ranking. No raw profile content enters snapshots or partner shares. Main couple planning integration remains pending.

## Main demo owner preflight

The main demo now reads fresh owner-only profile answers before finding, refreshing, displaying private recommendations, or choosing a recommendation. `profile-planning-guard.js` uses the same runtime requirement gates, rechecks auth and HEART STONE connection after its read, and returns only a generic result code. Read errors, missing modules, sign-out/account/connection changes, and unverified saved requirements stop the action and hide suggestion cards. No profile rows, requirement labels, or private explanations are sent to shared RPCs or partner views. Current action inputs remain unchanged; no new cost/interest assumptions enter the couple request.

This is a client-side owner preflight, not authoritative server enforcement or full couple-profile reconciliation. Existing invitations, accepted/active adventures, history, completion, and decline behavior remain outside this guard. Partner profiles are not queried or exposed. Server-side shared constraint enforcement and revalidation across the invitation lifecycle remain pending before calling this complete couple integration.

Validation: `npm test` now runs five suites, including fresh-owner reads, generic results, failure handling, account/connection changes, and actual main discovery handlers stopping before RPCs. `npm run test:planning-browser` checks the main-page stop/review-link/retry behavior at 320/390/1280px with simulated accounts and no live requests. No personal data was modified.

## Server draft: both-member requirement checks (not applied)

`database/demo_profile_requirements_guard.sql` is a reviewable SQL change, not a deployed migration. It adds an internal, non-exposed schema with revoked client access and a fresh both-member requirement lookup. The caller must be signed in and belong to a couple with exactly two active members. A shared generic exception contains no member identity, question key, category, explanation, or answer. Existing owner/membership/demo-state checks are retained. Six demo functions call the guard before generation, refresh deletion, proposal, sending style, acceptance, and reveal. Decline bypasses the requirement guard so it remains available. Demo function execution is limited to authenticated clients; the internal helper is not callable by anon/authenticated. Existing profile RLS/sharing policies are unchanged.

The SQL predicate matches the JS requirement classifier, including malformed values, none-vs-positive selections, written notes, skipped answers, and named-place exclusions. Tests run in pinned local PGlite PostgreSQL with isolated synthetic tables/accounts; they execute the modified function definitions, check denied actions leave data intact, verify allowed paths still work, test outsider/anonymous/private-helper denial, and confirm partner rows remain hidden by owner-only RLS. The test fixture snapshots six live function definitions inspected read-only on October 16; it contains no personal rows.

Deployment remains pending. Compare current live function definitions with `tests/fixtures/demo-rpc-baseline.sql` before applying; reconcile any later changes rather than overwriting them. Review advisors, actual role grants, staging behavior, rollback, and the rest of the server access surface first. These six entrypoints do not cover alternate alpha RPCs, direct table access/read policies, concurrent profile edits after a statement snapshot, or existing active-adventure operations. Full authoritative enforcement requires closing those paths and a defined concurrency/revalidation policy. No live functions, policies, migrations, or account answers were changed. This draft pauses unverified requirements rather than pretending candidate metadata verifies them. Unknown answers remain unknown, not a safety certification or forced disclosure requirement.

## Alternate-path access draft (not applied)

`database/demo_profile_access_hardening.sql` follows the requirement draft and removes direct client execution of six older generation/activation functions, while preserving definer-owned internal calls. It removes direct client mutation/admin privileges on recommendation requests, recommendations, adventures, and steps. SELECT grants and RLS remain unchanged. Authenticated owner profile CRUD remains available; anonymous/PUBLIC access and administrative profile-table privileges are removed. The current main client uses reads/RPCs rather than direct writes on those planning tables. Archived alpha/composer/Wild clients need a reviewed replacement before their direct entrypoints can be re-enabled.

A new local PostgreSQL suite proves the prerequisite check, alternate RPC denials, direct-write denials, preserved SELECT privileges and owner editing, and continued guarded demo internal calls. See `database/demo_profile_access_review.md` for read-only live metadata findings, test scope, compatibility impact, and outstanding read-policy/concurrency/staging review. Seven automated suites now run. No live database changes were made.

## Read-privacy draft (not applied)

`database/demo_profile_read_privacy.sql` adds restrictive creator/private-browsing filters for requests and recommendations, creator-only unsent demo adventures, and recipient step access only after reveal. Sent envelope metadata remains available for invitation synchronization. The selected recommendation becomes readable to the recipient after reveal, while alternatives remain private. Older `get_alpha_quest_state` client execution is revoked to avoid a definer read bypass. Local PostgreSQL tests exercise both members across send/accept/reveal, restrictive-policy precedence, inactive membership, outsiders, and anonymous roles. Eight automated suites now run.

This does not implement a sanitized cinematic envelope API: existing sent adventure rows still carry title/source fields. Row privacy and reveal-specific column masking are distinct. Ongoing invitation/story design, further read-RPC review, concurrency policy, real staging checks, and deployment remain pending. No live changes.

## Concurrency draft (not applied)

Protected demo actions now have a proposed transaction-locking upgrade in `database/demo_profile_concurrency.sql`: couple parent first, then sorted member profile parents, then a fresh requirement read. Account-profile edits lock the same profile parents; membership changes lock the couple parent. READ COMMITTED is required, missing/inactive parent context stops planning, and acceptance/reveal continue to recheck after later edits. Decline remains unaffected. This does not retroactively cancel committed actions or build ongoing-adventure adaptation.

Nine suites now run. The new local PostgreSQL test verifies trigger installation, transaction-held locks, fresh sequential rechecks, parent/membership failures, and older-isolation rejection. True independent-session contention testing is still pending in staging; this host could not initialize a non-root native PostgreSQL server. See the access review for ordering, cascade/trigger/deadlock risks to test, and exact verification limits. No live database changes or invitation-story changes.

## Combined database draft checkpoint

All four SQL drafts now load and pass together in the isolated integration test. `database/profile_guard_bundle.json` records their order and not-deployed status. The combined flow covers owner editing and private drafts, saved partner edits before proposal/acceptance/reveal, preserved decline, eventual chosen-only sharing, and direct-access denials. Ten automated suites run. This supplements the individual tests; it does not replace production candidate-generation, independent-session contention, PostgREST, or real-device staging tests. No live database changes.

## Read-only preflight checkpoint

A catalog-only baseline preflight now detects changed demo function bodies, missing required columns, disabled scoped RLS, and an existing/partial guard installation. It never marks deployment ready and does not read account answers or mutate the database. Its live read-only run on October 16 matched all six baseline functions, found required columns and scoped RLS, and confirmed the draft guard remains uninstalled. Eleven local suites pass, including deliberate drift/partial-install cases. The result must be refreshed before deployment and does not replace full schema/role/policy/staging validation.

## Server guard recovery checkpoint

The main app now translates the four public profile guard sentinel errors into generic recovery messages for generation, refresh, selection, send, acceptance, and reveal. Messages never identify which account supplied a requirement or render database details. A failed selection retains its private request state so retry remains available. No success panels advance on these failures; existing decline/cancel controls remain available. Twelve local suites cover the new recovery behavior as well as the existing profile/database drafts. This is draft client integration for SQL that remains uninstalled; staging and real-account checks remain pending.

## Optional exit during save failure

A failed profile save now exposes Leave without saving alongside the existing retry path. Confirmation explains that previously saved answers remain and unconfirmed changes may be lost. Canceling preserves the pending edits. Confirming invalidates queued jobs, clears the local pending queue and autosave timer, and returns home without deleting any saved rows. Departure is blocked while an active save is running. Account reload hides the escape action again. Local tests cover both confirmation outcomes, preserved stored answers, and no later queued write. No live changes or invitation-design changes.

## Profile keyboard focus checkpoint

Leave Unanswered now has a question-specific accessible name and restores focus to the replacement control after the screen refresh. Save & Finish Later focuses the overview heading, matching normal screen navigation. Automated DOM checks cover both paths. The separately merged personal invitation opening preview from main is included unchanged. All changes remain draft-only.

## Verified profile load recovery

A missing/non-array answer response no longer becomes an empty editable profile. After reading answers, an authentication error or changed account now shows a focused Retry Load screen instead of silently leaving the page loading. Owner remains unset, so edits cannot be staged or saved until a successful reload. Tests cover both auth failures, null/malformed reads, no writes during failed loads, and successful recovery. Current main invitation timing/place and romance/intimacy preview changes are included unchanged. Draft only; no live changes.

## Exact save confirmation checkpoint

Autosave now checks that the response contains every submitted answer key exactly once, rather than accepting a matching row count. Missing, duplicate, unrelated, null, or malformed confirmations preserve the retry batch and show an unconfirmed-save message. Reordered valid responses succeed. An unconfirmed response may follow a committed write; retry is the same owner-scoped idempotent upsert, and the UI does not claim the database rejected or rolled back those writes. Local tests cover these cases. No live changes.

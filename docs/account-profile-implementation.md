# Account-holder profile implementation

## Coding checkpoint — October 15, 2026

The approved Profile Application Flow extends through Step 28. Its architecture pause point remains Step 29. The current implementation follows that baseline incrementally; coding progress is separate from architecture approval.

The opening and the first nine approved screens are implemented:

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

The original 17-section scaffold remains available for additional details. It must not be described as the full approved 28-step flow. Steps 10–28 still need alignment with their approved screen specifications. The final readiness transition is not implemented yet; the starter does not claim a completed profile.

## Storage and compatibility

All answers use the existing owner-only `user_onboarding_answers` table and `account_profile_v1_` prefix. No schema or sharing-policy changes are required.

New keys: `call_me`, `free_time`, `planning_for`, `starter_resume`, and `starter_started`. The optional private `call_me` name is distinct from the required account identity in `profiles.first_name`; this flow does not alter the account identity or partner-visible name.

Steps 4–6 add `connection_styles`, `connection_other`, `available_windows`, `planning_notice`, `energy_pace`, `experience_length`, and `physical_comfort_notes`. These do not overwrite the earlier scaffold's free-text connection/timing or single pace answers. Their broader recommendation integration is still pending. Physical-comfort notes do participate in the existing written-requirement gate: sample suggestions pause until needs can be verified, and note contents do not appear in suggestion output.

Steps 7–9 add `social_settings`, `meeting_people`, `food_adventurousness`, `food_experiences`, `food_dislikes`, `food_requirements`, `enjoyed_interests`, `enjoyed_other`, and `curious_interests`. Earlier scaffold keys remain intact. New enjoyment categories and curiosities are saved separately from the older preview-supported `interests` taxonomy; broader recommendation use remains pending. The new `food_requirements` key joins the requirement gate without copying its contents into suggestion reasons, journey snapshots, or shares.

Adventure comfort reuses `exploration`. Surprise level reuses `surprise`. Previously saved surprise wording is shown as a prior answer without translating or overwriting it. Members choose whether to replace it. Review displays shared fields once.

Starter resume is independent of the older additional-details resume key. Skipping keeps saved answers; unanswered fields remain unknown. Skipping the opening writes no answers. Retry Save appears only after a save failure.

## Existing preview integration

Supported saved interests and free-experience preferences inform the private first-journey sample preview. Written requirements and failed profile reads pause its suggestions. This is not integration with the main couple recommendation RPCs. Those remain unchanged.

## Verification

`npm ci && npm test` runs the save/resume, starter-flow, profile-runtime, and preview-integration suites with simulated private accounts.

`npx playwright install chromium` followed by `npm run test:browser` checks the starter at 320px, 390px, and 1280px widths, including save/reload, selection, skipping, and failure/retry. `PROFILE_BROWSER_EXECUTABLE` optionally selects an existing Chromium executable; `PROFILE_BROWSER_ARGS` optionally provides a JSON array of launch flags. Screenshots go to the temporary directory.

Real-account end-to-end verification and deployment remain separate steps. Test fixtures do not modify personal account answers.

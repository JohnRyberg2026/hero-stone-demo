# Account-holder profile implementation

## Coding checkpoint — October 15, 2026

The approved Profile Application Flow extends through Step 28. Its architecture pause point remains Step 29. The current implementation follows that baseline incrementally; coding progress is separate from architecture approval.

The opening and the first three approved screens are implemented:

- Opening: Get Started / I’ll Do This Later; optional answers, no completion score.
- Step 1, A Little About You: optional private call-me name and the approved multi-select free-time choices.
- Step 2, Your Adventure Comfort Zone: single Familiar/Stretch/Wild default with descriptions, and the four independent surprise choices. These are defaults, never permission to exceed boundaries.
- Step 3, Who Are We Planning For?: multi-select partner/family/friends/group/sometimes just me. Selecting a context does not invite or share with anyone.

The original 17-section scaffold remains available for additional details. It must not be described as the full approved 28-step flow. Steps 4–28 still need alignment with their approved screen specifications. The final readiness transition is not implemented yet; the starter does not claim a completed profile.

## Storage and compatibility

All answers use the existing owner-only `user_onboarding_answers` table and `account_profile_v1_` prefix. No schema or sharing-policy changes are required.

New keys: `call_me`, `free_time`, `planning_for`, `starter_resume`, and `starter_started`. The optional private `call_me` name is distinct from the required account identity in `profiles.first_name`; this flow does not alter the account identity or partner-visible name.

Adventure comfort reuses `exploration`. Surprise level reuses `surprise`. Previously saved surprise wording is shown as a prior answer without translating or overwriting it. Members choose whether to replace it. Review displays shared fields once.

Starter resume is independent of the older additional-details resume key. Skipping keeps saved answers; unanswered fields remain unknown. Skipping the opening writes no answers. Retry Save appears only after a save failure.

## Existing preview integration

Supported saved interests and free-experience preferences inform the private first-journey sample preview. Written requirements and failed profile reads pause its suggestions. This is not integration with the main couple recommendation RPCs. Those remain unchanged.

## Verification

`npm ci && npm test` runs the save/resume, starter-flow, profile-runtime, and preview-integration suites with simulated private accounts.

`npx playwright install chromium` followed by `npm run test:browser` checks the starter at 320px, 390px, and 1280px widths, including save/reload, selection, skipping, and failure/retry. `PROFILE_BROWSER_EXECUTABLE` optionally selects an existing Chromium executable; `PROFILE_BROWSER_ARGS` optionally provides a JSON array of launch flags. Screenshots go to the temporary directory.

Real-account end-to-end verification and deployment remain separate steps. Test fixtures do not modify personal account answers.

# HEART STONE checkpoint — November 2, 2026

John completed the live pilot walkthrough: AI conversation and editable invitation draft; explicit transfer and application in invitations; acceptance, alternate-time and decline rehearsals; real invitation to connected partner Jessica; acceptance from Jessica’s account and confirmation in John’s inbox. Screenshots confirm the live round trip. The later walkthrough used the selected opening “Let’s make a little room for us.”

This records the tested path, not certification of every feature.

Follow-up polish: personalized acceptance heading, full-width conversation beneath a bounded avatar scene, composing/thinking/reply reactions, pause and reduced-motion support, explicit reschedule preview feedback.

## Saved and locked — November 2, 2026, evening

Baseline: f03eb9c06ad929bedd7105d92b5e99ba75c2426a (PRs 64–66 merged and deployed). This checkpoint preserves the working pilot; it does not certify all planned features as complete or lock repository permissions.

### Preserve completed work
- Live AI conversation, editable invitation handoff, explicit recipient review/send, Jessica receiving and accepting, and John seeing acceptance were demonstrated in the walkthrough.
- Accept/reveal, alternate-time suggestion preview, and decline rehearsals were demonstrated. Rehearsal results do not send account responses.
- Start a conversation now sits directly beneath the avatar; John approved that placement.
- Conversation composing/thinking/reply state changes passed functional tests; natural avatar movement remains unsatisfactory.
- Do not restart invitation or basic calendar walkthroughs merely because their evidence is absent from a summary. John reports these were already tested. The calendar's detailed live test evidence is not present in this checkpoint; that is an evidence gap, not a known failure.

### Avatar animation paused by John
- Current live avatar remains the CSS pose-fade version. It is not a rigged walking character.
- Two generated walking sheets were rejected for animation consistency and were NOT installed or published.
- Draft artwork retained as ChatGPT files: Heart Stone Walking Avatar Sprite Sheet.png; Eight-frame red-haired walking cycle sprite sheet.png.
- Resume only when requested. Brief: preserve appearance; sample resting, two small sideways steps, stop/turn, welcome gesture; then idle/listen/think/respond states. Require editable source and developer-reviewed web export. No animator has been hired or contacted.

### Code-confirmed unfinished work and next recommendation
- date-home.js persists personal calendar events and availability hearts under hs_personal_calendar_demo_v1_<account> in localStorage. No shared availability write/read occurs.
- index.html explicitly says selective sharing and shared availability hearts are not connected yet. Personal calendar entries do not sync across devices; reminders do not schedule notifications.
- Recommended next feature: optional availability sharing with the connected partner. Keep calendar event titles private by default, share only explicitly selected availability, support removal/expiry, enforce connection/account access, and never treat a heart as acceptance or an obligation. This is a recommendation, not an implemented feature.
- Other documented gaps: persistent preference learning/voice are outside the conversational pilot; distributed per-user rate limiting is required before expanding beyond pilot users.

### Working rule
Use this checkpoint and code evidence before proposing another test. Distinguish completed demonstrations, user-reported tests, missing evidence, planned features and known limitations.

## Shared availability implementation follow-up
The previously recommended date-only sharing is now implemented in shared-availability.js and database/shared-availability.sql. See SHARED_AVAILABILITY.md for verification and limits. Existing private events/hearts are not migrated. Automated and rollback database checks passed; the new feature's two-account visual walkthrough remains separate from already completed invitation/calendar tests. Avatar animation remains paused.


## Saved and locked — shared availability live test passed
John supplied screenshots showing his date-only heart shared with Jessica, then confirmed that Jessica could see it after refresh. John also confirmed removing his shared heart and refreshing Jessica's view made it disappear. Record the sender-share, recipient-read and owner-removal round trip as user-confirmed PASS. Do not ask to repeat it without a new regression or change. The feature shipped in PR 68 at baseline 558363c8abdc8a68749395bb83f8518b8120827a. This is a saved development checkpoint, not a repository permission lock.

Next recommended product step: let Heart Stone use a small set of explicitly approved personal date-planning preferences across conversations. The current conversational handler receives only the session transcript and explicitly cannot read preferences/prior sessions. Inspect existing personalization/onboarding storage before designing new storage. Keep saved preferences editable/deletable, do not automatically store chat text or infer partner preferences, and require explicit opt-in before use with AI. This is a proposed next step, not implemented. Keep the conversation pilot restricted until the documented server-side rate limit is implemented. Avatar animation remains paused.

## Planning preferences implementation — November 3, 2026
Explicit personal planning preferences and optional AI use are implemented; see PLANNING_PREFERENCES.md. Reuses owner-only onboarding storage; no inference or partner/calendar import. Automated and rollback database checks passed. Live user walkthrough pending for this new feature only. Previously completed invitation/calendar/availability tests stay closed. Avatar animation remains paused.


## Saved and locked — planning preference live checks, November 3, 2026
Baseline: f3197b6b68123ad83ff7c46344f9ee41696869bb (preferences PR 70 and direct-page PR 71). John supplied screenshots confirming private save with AI off, confirmed persistence after refresh, then supplied screenshots of saved AI opt-in and an AI reply using quiet walks/dinner at home. The reply referred to budget generally; exact use of the numeric $50 amount was not separately demonstrated. After John turned AI use off and started a fresh conversation, a screenshot showed Heart Stone could not see saved activity preferences. Record save, refresh persistence, opt-in behavior and opt-out behavior as live PASS. The last tested state has AI use off; preferences remain privately saved.

The direct page planning-preferences.html and static home link resolve access for older already-open home tabs. Fresh public-browser inspection verified the button mounts; authenticated live save/model tests were performed by John. Do not repeat these passed checks without a new regression or relevant change. Live deletion was not demonstrated; deletion/stale-editor isolation passed automated and rollback database tests.

Next confirmed engineering gap: the conversational handler still has no distributed per-account request limiter. Implement bounded usage before any expansion of the pilot allowlist, preserving existing account authorization and consent. Prefer short-window burst protection plus a daily cap, applied before paid provider calls, with no chat text in limiter storage and a clear retry message. This is the next proposed implementation, not completed by this checkpoint. Avatar animation remains paused.

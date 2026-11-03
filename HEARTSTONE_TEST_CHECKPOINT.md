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

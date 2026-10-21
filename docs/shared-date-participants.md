# DATE QUEST shared-date participant process

This change provides an in-memory process rehearsal and a pure transition model. It is not a multi-account messaging service or a security boundary. Open `shared-date-preview.html` from the invitation builder.

## Behavior

- The default is a one-on-one date: organizer and one invited person.
- One shared date can include additional consenting adults. Every included person sees the same participant roster and reviewed plan before responding.
- One account can organize distinct dates with different people. Responses belong to one date and revision; acceptance never transfers between connections or dates.
- Sending counts the organizer as accepting that specific plan. Every other person begins as pending. The date is confirmed only when everyone included accepts.
- A decline or withdrawal closes the invitation round without silently dropping anyone. A request for another time requires a revised invitation.
- Changing the time, meeting place, title or roster creates a new revision with all responses reset. The organizer must explicitly send it again.
- Any included participant can begin a confirmed date. Any included participant can stop an underway date. Beginning does not create consent to intimacy or any activity.
- Views reject identities outside the roster; revised invitations exclude removed participants. Historical access and retention need independent server rules before live use.
- The rehearsal intentionally retains nothing after a reload and never calls a messaging API. Profile names are fictional, and simulated responses are not consent from real people.

## Required live-service integration

`shared-date-model.js` is a behavioral specification, not authorization. Do not send browser-supplied participant objects, age flags, organizer identities or response statuses directly into a trusted database.

Live implementation needs a date record plus participant rows keyed by date/account, a monotonically increasing revision, and authenticated operations that lock/check the current round. Authenticate the actor on the server for every view and transition; verify current membership and adult eligibility using trusted records. No participant or organizer may answer for another account. Roster changes, revised times, revocation and begin operations must serialize to prevent a stale acceptance from confirming a changed date.

Per-participant privacy must also be enforced in RLS/RPCs, notifications, exports and memories. Participants should receive only the shared plan, disclosed roster and necessary response state. Never copy other connections, calendars, private preferences, intimate boundaries or memories into a group invitation. Adult-intimacy features require separate per-person opt-in and consent; DATE QUEST remains 18+, and WORLD QUEST family/mixed-age experiences remain family-safe.

The existing live pair-invitation schema is unchanged by this PR. It must not be reused by sending several independent pair invitations and labeling them one confirmed group date. This rehearsal contains no live send button.

## Validation

`node test-shared-date.cjs` checks pair/group confirmation, participant isolation, revision handling, decline/reschedule/withdrawal, stopping, and immutable transitions. Existing account invitation and date-plan handoff tests remain applicable.

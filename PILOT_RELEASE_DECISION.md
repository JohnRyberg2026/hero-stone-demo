# Date Quest pilot access decision — November 7, 2026

## Decision
**Continue existing-account development. HOLD new tester invitations and public enrollment.**

This is a scoped engineering release recommendation based on the work recorded below, not an independent security certification. No new accounts were invited, no access was expanded, no feature was disabled, and no release tag was created by writing this decision.

The reviewed core has passing checks. The unresolved shared-backend surface prevents declaring a new-account pilot ready. Do not describe the AI pilot allowlist as an app-wide access gate.

## Release lanes

| Activity | Decision | Boundary |
| --- | --- | --- |
| John/Jessica's existing development and previously demonstrated paths | Continue cautiously | Current scope; does not certify every older feature |
| Automated tests, synthetic rollback database tests, code maintenance | Continue | No real user records or paid provider calls needed |
| Kickstarter story, budget and prototype-demonstration preparation | Continue | Present actual capabilities; no new delivery promise or campaign launch implied |
| New tester accounts, external invitations, public enrollment | HOLD | Clear the three gates below first |
| Health Quest, avatar movement, new home options | Defer | Complete this pilot milestone before widening scope |

## Three gates before new testers

### A1 — Bound the authenticated backend surface
The database has 98 public SECURITY DEFINER functions callable by authenticated. This is not evidence of 98 vulnerabilities. It is an exact, named review inventory:
- 6 helpers/triggers: scoped exception documented below.
- 24 legacy/connection/onboarding functions: bodies inspected, but per-function signed-in authorization coverage incomplete.
- 11 World Quest actions: anonymous denial and selected membership checks verified; a complete signed-in World Quest review was not performed.
- 57 other functions: authorization review or server isolation still required.

The current invitation/calendar invoker APIs and private implementations are separately reviewed and tested. Older APIs still share the authenticated role. Hiding a page, excluding World Quest from the campaign, or adding a browser-only feature flag does not prevent a signed-in account from calling reachable RPCs.

**Exit:** every endpoint a new pilot account can reach has a documented acceptable disposition, or is blocked for pilot accounts by an enforced server boundary. Run the current-path regression after the boundary changes. See [the fixed review queue](PILOT_RPC_REVIEW_QUEUE.md). Prefer isolating unneeded paths when this is safer and smaller than redesigning them; verify dependency callers before revoking grants.

### A2 — Verify enrollment and API configuration
The actual Auth signup/enrollment configuration and the PostgREST exposed-schema configuration were not retrieved in this review. No claim is made that public account creation is disabled or that only intended pilot identities can access the whole app.

**Exit:** record the actual enrollment policy and exposed API schemas; allow only the intended onboarding route for new pilot accounts, keep privileged implementation schemas unexposed, and verify signed-out and signed-in nonparticipant denial. The existing conversation allowlist is one independently checked safeguard, not a substitute for this gate. Do not fetch or publish secret values to verify these settings.

### A3 — Resolve the new-account password/recovery decision
The advisor reports leaked-password protection disabled. Session expiry recovery is implemented; a password-reset UI is not. These are different features.

**Exit:** before creating external tester accounts, record the supported password-protection setting and an operational recovery/support route. Enable available protection or document an explicit, bounded alternative appropriate to a small controlled pilot. Confirm delivery/access for that route once; do not claim it is working from a mocked test.

No operator approval is being inferred from this document. Unknown settings remain unknown until verified.

## Reviewed core evidence

| Area | Evidence | Disposition |
| --- | --- | --- |
| Conversation account/pilot checks, consent and usage limits | Deployed handler inspected; 12 mocked server checks; GitHub workflow green | Scoped pass; configured pilot roster not read or expanded |
| Current and compatible older invitation send/reply paths | Synthetic sender/recipient/outsider database regression | Scoped pass |
| Schedule proposal/confirmation, stale revision, begin/finish | Synthetic participant and outsider regression | Scoped pass |
| Private calendar and personal memories | RLS/account separation tests; memory retention scoped to original participant's own words | Scoped pass |
| Preferences | Synthetic owner/partner checks, opt-in/off and delete revision tests; prior live consent evidence preserved | Scoped pass |
| Shared availability | New membership-revocation fix and synthetic tests | Scoped pass; no new live phone walkthrough claimed |
| Wish snapshots | Membership/relationship revocation, private-note and privilege tests; four mocked UI checks | Scoped pass; full live account-store walkthrough still pending |
| Client maintenance grants | 72 public app tables; 864 CRUD comparisons unchanged; no client maintenance grants; service access retained | Scoped pass |
| Latest source publication | Baseline `1c58e16d471b8398f3984f138fe28f41ce55814b` deployment succeeded; latest relevant GitHub regressions succeeded | Published evidence, not end-to-end certification |

## Exceptions that do not require blanket removal

**Six anonymous helper/trigger findings:** current-user email and membership helpers return no email/membership without an identity; trigger functions reject direct invocation. Their dependencies were inspected. Retain these scoped exceptions while reviewing any behavioral or signature changes.

**Twenty-one RLS-without-policy informational findings:** absence of a policy defaults to denying ordinary client row access. Do not add permissive policies to silence an informational warning. Privileged callers and new grants still require review; table-wide maintenance permissions were separately removed.

**Ninety-eight authenticated privileged-function findings:** necessary privileged routines are not automatically defects. The unresolved entries are a release gate because they are reachable, not merely because a counter is nonzero. Zero warnings is not the exit condition.

## Fixed finish line and next step
This decision-writing stage is complete when the queue, gates and evidence are saved and agree with the current inventory. That is now done.

The next coding task is **A1: choose and enforce the pilot server boundary for the named legacy endpoints**, starting with the functions required by home/sign-in versus unrelated legacy features. Do not start another unrelated subsystem during this task.

Once A1–A3 have recorded acceptable outcomes, take a release snapshot and perform a short check of only the newly changed phone/computer behavior. Do not restart John's passed invitation, availability or consent walkthroughs. No new manual testing is requested by this document.

## Review controls and limitations
The [read-only surface assertion](database/test-pilot-access-surface.sql) detects newly callable public privileged functions and newly anonymous privileged functions outside the recorded signatures. It passed against the current database. It does not mark partial/unresolved functions safe and does not run automatically in GitHub without a database runner. Browser/server CI uses mocked transport; database role tests use synthetic rollback fixtures.

Existing audit details and remediation references remain in [PILOT_ACCESS_REVIEW.md](PILOT_ACCESS_REVIEW.md). Sources, tests and database migration records are a reviewable development checkpoint, not a guarantee that every live interaction or every part of the broader Heartstone platform has been audited.

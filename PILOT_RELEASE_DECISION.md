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

### A1 — Legacy privileged RPC boundary implemented
## Legacy API boundary applied — November 7, 2026

Migration `gate_legacy_privileged_apis_with_checked_entry_guards` restricts 91 legacy public SECURITY DEFINER endpoints to the three preexisting development accounts. The private administrator-managed roster has RLS enabled and no client table grants. Signup does not enroll accounts. The trusted service role can use the guard; browser accounts cannot grant themselves access. Existing function signatures, grants and business checks were preserved through fingerprint-checked body insertion.

Seven exceptions remain: the six scoped helpers/triggers and `get_heart_stone_partner_personalization(uuid)`. The latter supports the simple home, requires active membership, omits gender and exposes pronouns only with consent. These exceptions are not blanket authorization for other legacy features. Current invitation/calendar/preferences APIs retain their separate ownership and participant checks.

Verification: all 91 typed-null calls by an unrostered authenticated identity failed with the specific boundary denial. A rollback-only rostered fixture passed the guard and preview, while its nonmember history request still failed membership authorization. The service guard check passed. Current invitation/lifecycle/private calendar/memory, preferences, shared availability, wish revocation, anonymous legacy and World Quest role regressions passed. Three existing roster entries remain; no boundary fixture profiles remain. No real invitation or memory was changed, no tester was added, and no paid AI call was made.

Advisor counts remain six anonymous and 98 authenticated privileged-function findings. RLS-without-policy INFO is now 22: the additional private roster deliberately denies client row access. Password-protection finding remains. This is a scoped server boundary, not full certification or enrollment clearance.

Source: [boundary migration](database/pilot-legacy-api-boundary.sql). Repeatable rollback checks: [boundary test](database/test-pilot-legacy-boundary.sql). A2 enrollment/API configuration and A3 password/recovery remain HOLD gates.

### A2 — Configuration verified; signup restriction still required
Live Auth settings show public email signup enabled, email confirmation required, anonymous signup disabled and listed social providers disabled. Effective REST exposed schemas are exactly `public, graphql_public`; application implementation schemas are excluded. Signed-out live calendar and invitation calls return 401/42501.

**HOLD:** disable public signup for the controlled pilot, reverify the live setting, and confirm the administrator-issued invitation route. Available connected tools do not support Auth configuration updates; no setting was changed and no account or email was created. See [live verification and exact next step](PILOT_ENROLLMENT_VERIFICATION.md). This is not a full GraphQL audit.

### A3 — Resolve the new-account password/recovery decision
The advisor reports leaked-password protection disabled. Session expiry recovery is implemented. A dedicated password-recovery screen/controller is now built, but recovery email requests remain disabled pending actual redirect, template and delivery verification. Mocked tests do not clear this gate.

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

A1's legacy privileged RPC boundary is applied and verified. The next task is **A2: verify actual enrollment and exposed API schema settings**, followed by A3's password/recovery decision. New testers remain on hold.

Once A1–A3 have recorded acceptable outcomes, take a release snapshot and perform a short check of only the newly changed phone/computer behavior. Do not restart John's passed invitation, availability or consent walkthroughs. No new manual testing is requested by this document.

## Review controls and limitations
The [read-only surface assertion](database/test-pilot-access-surface.sql) detects newly callable public privileged functions and newly anonymous privileged functions outside the recorded signatures. It passed against the current database. It does not mark partial/unresolved functions safe and does not run automatically in GitHub without a database runner. Browser/server CI uses mocked transport; database role tests use synthetic rollback fixtures.

Existing audit details and remediation references remain in [PILOT_ACCESS_REVIEW.md](PILOT_ACCESS_REVIEW.md). Sources, tests and database migration records are a reviewable development checkpoint, not a guarantee that every live interaction or every part of the broader Heartstone platform has been audited.

## Locked development baseline — November 8, 2026
[Locked checkpoint](DATE_QUEST_LOCKED_CHECKPOINT_2026-11-08.md) pins source `5c2d57b91b3a6f7a64ac66d7b0d018f6b4fdf6f4`, successful relevant GitHub regression/deployment and 15 passing database scripts. It records the newer membership, cancellation, pending-change visibility, independent/paged Memories and guarded Home behavior.

Reverified live Auth: signup remains enabled, email confirmation required, anonymous signup disabled; effective REST schemas remain public and graphql_public. The unfinished dashboard sign-in did not change those settings. A2 remains HOLD. A3 remains HOLD: password-protection warning and missing complete password-recovery/delivery evidence remain.

Next coding priority is account recovery. This checkpoint is not pilot enrollment, billing or launch clearance.

## Recovery implementation checkpoint — November 8, 2026
[Account recovery](ACCOUNT_RECOVERY_CHECKPOINT.md) now has an isolated in-memory Auth client, verified recovery-event/account checks, bounded failures and 19 mocked checks. Forgot password opens separately to avoid navigating away from open drafts. Email requests remain off until the exact canonical redirect and controlled real delivery/update/sign-in evidence pass. No email, password or Auth configuration was changed; A2 and A3 remain HOLD.

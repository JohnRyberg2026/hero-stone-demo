# Sign-in recovery and pilot access review — November 7, 2026

## Shipped frontend repair
The home page now listens synchronously to Auth state notifications. A signed-out session clears the previous connection, active adventure references, private profile/home displays, and sync timer through the existing disconnected UI. Sign-in is offered again without a page reload.

A changed account clears the previous account's display before restoring its connection. Restoration runs after the Auth callback returns and uses a session generation check; signout cancels queued restoration. Repeated notifications for the same account do not restart the home flow or erase private drafts.

Manual sign-in now validates missing credentials, blocks duplicate clicks, handles credential rejection, rate limiting, and thrown connection errors, rechecks the signed-in user before loading its connection, and restores the button on completion. Email/password inputs have autofill labels and the status is announced accessibly.

This is session recovery, not a password-reset implementation. There is no new recovery email flow, signup flow, account allowlist UI, or change to Auth configuration.

## Server access evidence
Inspected the deployed heartstone-conversation Edge Function, version 7:
- Gateway JWT verification is enabled.
- The handler validates the bearer token through Auth.
- It requires server configuration and a nonempty pilot allowlist, and rejects users outside it and anonymous users before provider calls.
- Existing distributed usage reservations remain in the handler.
No function deployment, pilot allowlist change, credential read, or paid model request was performed for this review. The configured list of pilot identities was not retrieved. These findings apply to conversation access, not every database RPC.

## Database advisor review: still a release boundary
Read-only security advisor results:
- 35 warnings for anonymous execution grants on older SECURITY DEFINER functions.
- 98 warnings for authenticated execution grants on SECURITY DEFINER functions.
- 21 informational RLS-enabled tables without policies.
- Leaked password protection disabled.

These are advisor findings, not proof that all listed functions permit unauthorized data access. Function body checks, intended callers, object grants and execution paths need individual review. RLS without policies is normally deny-by-default, so adding blanket policies would be inappropriate. Do not remove every authenticated grant or switch all functions to invoker indiscriminately.

No grants, policies, user records, passwords, or live invitations were changed. Do not describe the application as fully cleared for wider launch.

References:
- [Anonymous privileged function access](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Authenticated privileged function access](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## Verification
Six simulated session tests cover same-account notifications, signout clearing, changed-account deferred restoration, stale restore cancellation, duplicate sign-in protection, and missing/rejected/network/rate-limited sign-in responses. Inline HTML scripts parse. These tests join the calendar, invitation and planner checks in GitHub Actions; index.html changes now trigger that workflow.

No real user signed out, no password was reset, and no John/Jessica live walkthrough was repeated. Next: inspect the older Date Quest RPC grants and their authorization checks before expanding pilot access.

## Targeted permission repair applied — November 7, 2026

Applied database migration `restrict_legacy_date_quest_rpc_anonymous_access`. Reviewed 18 legacy Date Quest entry points: partner-connection invitations and demo adventure actions. Removed EXECUTE from PUBLIC and anon, while explicitly retaining authenticated and service_role access. No function bodies, tables, row policies, current invitations, memberships, or user records were changed.

The bodies already gate actions using identity, invitation ownership/recipient email, or active Heart Stone membership. Preview/decline/cancel functions return no authorized result when identity does not match. This change removes unnecessary pre-sign-in reachability; it does not replace those checks. Shared membership/email helpers, trigger functions, and World Quest functions were excluded from this pass.

| Function signature | Anonymous execution | Signed-in execution |
| --- | --- | --- |
| `accept_heart_stone_invitation(text)` | Denied | Preserved |
| `begin_demo_quest(uuid,adventure_type,text,integer,text,text[],integer,text,integer)` | Denied | Preserved |
| `cancel_demo_adventure(uuid)` | Denied | Preserved |
| `cancel_heart_stone_invitation(uuid)` | Denied | Preserved |
| `complete_demo_adventure(uuid)` | Denied | Preserved |
| `create_heart_stone_invitation(text,text,integer)` | Denied | Preserved |
| `decline_heart_stone_invitation(text)` | Denied | Preserved |
| `get_demo_adventure_history(uuid,integer)` | Denied | Preserved |
| `open_demo_date_invitation(uuid)` | Denied | Preserved |
| `preview_heart_stone_invitation(text)` | Denied | Preserved |
| `propose_demo_recommendation(uuid)` | Denied | Preserved |
| `refresh_demo_recommendations(uuid,uuid[],integer)` | Denied | Preserved |
| `respond_demo_date_invitation(uuid,boolean)` | Denied | Preserved |
| `reveal_demo_adventure(uuid)` | Denied | Preserved |
| `rotate_heart_stone_invitation(uuid,integer)` | Denied | Preserved |
| `save_demo_adventure_feedback(uuid,feedback_rating,text)` | Denied | Preserved |
| `set_demo_invitation_style(uuid,text)` | Denied | Preserved |
| `start_another_demo_adventure(uuid)` | Denied | Preserved |

Verification on the deployed database:
- All 18 direct calls under the anon role fail with insufficient_privilege.
- All 18 authenticated and service_role execution grants are present.
- All 18 null-input calls under the authenticated role reach existing identity/validation checks without an execution-grant denial.
- A synthetic signed-in nonmember cannot read demo history: the active membership check rejects it.
- Tests run in rollback-only transactions. No real account identity is used and no real invitation or adventure is invoked.
- Security advisor anonymous privileged-function warning count fell from 35 to 17. The 98 authenticated privileged-function warnings, 21 RLS informational findings, and disabled leaked-password protection remain for separate review.

Source: [permission patch](database/restrict-legacy-date-quest-rpc.sql).
Repeatable checks: [database role tests](database/test-legacy-date-quest-rpc-permissions.sql).
Remaining advisories and remediation links above still apply. This is a targeted hardening milestone, not a complete security clearance.

## Remaining anonymous access triage — November 7, 2026

Applied `restrict_world_quest_rpc_anonymous_access` to 11 reviewed World Quest actions. EXECUTE from PUBLIC/anon is removed; authenticated/service_role execution remains. Function bodies, teams, scores, memberships, storage and evidence were not changed.

- `advance_world_quest(uuid)`
- `begin_world_quest_challenge(uuid,integer)`
- `cast_world_skip_vote(uuid,integer)`
- `create_world_quest_team(text,text)`
- `get_world_quest_state(uuid)`
- `join_world_quest_team(text,text)`
- `record_world_quest_result(uuid,integer,boolean,integer)`
- `resume_world_quest_team()`
- `reveal_world_quest_challenge(uuid,integer)`
- `start_world_quest(uuid)`
- `submit_world_quest_evidence(uuid,integer,text,text,text,bigint,integer)`

Rollback-only database checks verify that every anonymous call is permission-denied and every authenticated/service execution grant remains. Null-input signed-in calls reach existing authorization/validation checks; this is not a complete positive World Quest walkthrough. A synthetic signed-in nonmember cannot read team state (MEMBER_REQUIRED).

Anonymous privileged-function warnings now total **6**, down from 17 in this pass and 35 before both repairs. The six are classified:
- `current_user_email()`: scoped to auth.uid(); returns empty text with no identity.
- `is_active_heart_stone_member(uuid)` and `is_any_heart_stone_member(uuid)`: scoped to auth.uid(); return false with no identity. Existing row policies use membership helpers, including PUBLIC-targeted policies on onboarding and recommendation tables. Do not revoke helper access just to reduce the counter without migrating dependent policies.
- `capture_adventure_candidate_learning()`, `guard_demo_memory_storybook()`, and `handle_new_auth_user()`: bound trigger functions. Direct invocation as anon is rejected by PostgreSQL with feature_not_supported. The actual trigger definitions were inspected; no trigger or signup configuration was changed.

The signed-out helper and direct-trigger checks passed. These observations classify the remaining six; they are not a blanket security clearance. Existing 98 authenticated privileged-function warnings, 21 RLS informational findings and disabled leaked-password protection remain. The next access-review scope is authenticated authorization, prioritizing the current Date Quest RPC path rather than blanket revocation.

Source: [World Quest permission patch](database/restrict-world-quest-rpc.sql).
Repeatable checks: [World Quest and helper role tests](database/test-world-quest-rpc-permissions.sql).
Remediation guidance: [anonymous privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

## Current Date Quest signed-in authorization — November 7, 2026

Reviewed the 12 public RPCs used by the current invitation/calendar UI and their 11 internal invitation implementations. Public entry points are SECURITY INVOKER with empty search paths and no anonymous EXECUTE. The privileged internal implementations also have empty search paths and no anonymous EXECUTE.

Found and fixed two expected-account guard inconsistencies:
- `my_picture` previously accepted a NULL expected account; the return/write was still scoped to auth.uid(), so this did not provide access to another account's picture.
- `propose_time` likewise allowed a NULL expected sender past its initial guard; its sender-ownership and active-pair checks still applied.
Both now use `IS DISTINCT FROM auth.uid()` to reject missing or mismatched identities. Public wrappers, table permissions, and ownership checks are preserved. Applied migration: `enforce_expected_account_for_picture_and_revised_time`.

A new database-role regression uses three generated synthetic accounts and an isolated connection in a rollback-only transaction. It verifies:
- Correct-owner picture read/write; missing/mismatched expected accounts denied.
- Expected-sender enforcement and idempotent sends.
- Sender cannot accept their own invitation; recipient may accept the displayed revision.
- Surprise title/story redaction before acceptance.
- Outsider denial for lists, partner lookup, reply, cancellation, scheduling, begin, finish, revised time, calendar, and private memory.
- Direct invitation/memory table access denied.
- Partner cannot read or overwrite another person's private calendar; calendar table RLS hides the other owner.
- Proposal confirmation must come from the other participant; pending proposals and stale revisions block beginning.
- Authorized begin/finish and separate private memory saves; no private memory in shared invitation JSON.
- Valid revised time works after rejecting a missing expected sender.
- Inactive pairs lose shared invitation listing/schedule access. Existing personal-memory retention remains: an original participant can read only their own words after disconnection.

All assertions passed on the deployed database. The final fixture-profile count was zero after rollback. No real user identities, invitations, calendar rows, or memories were used in the test. This is database-role verification, not a phone/browser walkthrough.

[Guard patch](database/expected-account-guards.sql) · [Repeatable authorization tests](database/test-current-date-quest-authorization.sql)

Advisor counts remain 6 anonymous privileged-function warnings, 98 authenticated privileged-function warnings, 21 RLS informational findings, and disabled leaked-password protection. The current 12 public entry points are not SECURITY DEFINER; the remaining older authenticated APIs and alternate entry points still need their own targeted review. Do not infer wider launch clearance from this scoped pass.

## Older invitation compatibility paths — November 7, 2026

Inspected `public.send_moment_invitation`, `public.respond_moment_invitation` and `hs_invitation_internal.respond_invitation`.

The older send wrapper delegates to the same sender-derived, active-pair-checked, idempotent implementation as the checked-send wrapper. It cannot supply another sender identity. The older reply delegates to `respond_revision(...,0,...)`: it supports the original revision, but rejects revised invitations. No bypass was found in these inspected compatibility paths, so no function/grant change was made.

Extended [current authorization tests](database/test-current-date-quest-authorization.sql) and ran them against the deployed database with synthetic accounts:
- Checked-send followed by the legacy send path with the same request returns the same invitation ID.
- Both public compatibility wrappers remain unavailable to anon.
- Legacy outsider send/reply fail authorization.
- The recipient can accept an original revision through the legacy path.
- Legacy acceptance of revision one fails with the expected stale-revision error.
- Revision-aware acceptance of that revision still succeeds.

The full synthetic sender/recipient/outsider regression passed and rolled back. No live user data changed. This closes this specific compatibility-path question; it does not certify unrelated older authenticated RPCs.

## Client table-maintenance permissions — November 7, 2026

Reviewed all 72 public application base tables/partitioned tables. Before repair, anon had TRUNCATE on 38 and authenticated had TRUNCATE/TRIGGER/REFERENCES on 48. These are privilege grants, not evidence that a browser client had an exposed SQL endpoint capable of executing them.

Applied `restrict_public_table_client_maintenance_privileges`:
- Removed TRUNCATE, REFERENCES, TRIGGER and MAINTAIN from PUBLIC, anon and authenticated for the 72 reviewed tables.
- Preserved existing SELECT, INSERT, UPDATE and DELETE grants, table contents, RLS policies, existing triggers and sequences.
- Removed these maintenance privileges from future public-table defaults for the application migration owner, postgres.
- Did not change managed storage/auth/extension schemas or supabase_admin's defaults. Future objects created by a different owner still need their own review.

Verification:
- Compared all four row-operation grants for anon, authenticated and service_role on every table: **864 before/after comparisons, zero changes**.
- All service_role effective grants, including maintenance privileges, are unchanged.
- Client maintenance grants are absent from every reviewed table, and postgres public-table defaults are restricted.
- Current/legacy invitation authorization, private calendar separation, preference consent/revisions, availability revocation, and wish snapshot revocation database regressions all passed again using generated synthetic accounts and rollback-only writes.
- No TRUNCATE or table-maintenance operation was executed. No live account records were edited.

[Applied grant patch](database/public-client-maintenance-grants.sql) · [Read-only repeatable assertions](database/test-public-client-maintenance-grants.sql)

Why this matters: [PostgreSQL row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html) does not cover whole-table TRUNCATE/REFERENCES operations. Maintenance privileges should be controlled independently of per-row policies.

Existing broader findings remain: 6 anonymous internal helper/trigger warnings, 98 authenticated privileged-function warnings, 21 RLS informational findings and disabled leaked-password protection. This pass closes the identified public-table maintenance-grant issue; it does not certify every legacy RPC or clear the entire platform for wider launch.

## Bounded release decision — November 7, 2026
See [PILOT_RELEASE_DECISION.md](PILOT_RELEASE_DECISION.md) for the current continue/hold/defer decision, three new-tester gates and exit conditions. The exact authenticated privileged API inventory is saved in [PILOT_RPC_REVIEW_QUEUE.md](PILOT_RPC_REVIEW_QUEUE.md); its read-only drift assertion passed. This documentation step expands no access and invites no accounts.

## Legacy API boundary applied — November 7, 2026

Migration `gate_legacy_privileged_apis_with_checked_entry_guards` restricts 91 legacy public SECURITY DEFINER endpoints to the three preexisting development accounts. The private administrator-managed roster has RLS enabled and no client table grants. Signup does not enroll accounts. The trusted service role can use the guard; browser accounts cannot grant themselves access. Existing function signatures, grants and business checks were preserved through fingerprint-checked body insertion.

Seven exceptions remain: the six scoped helpers/triggers and `get_heart_stone_partner_personalization(uuid)`. The latter supports the simple home, requires active membership, omits gender and exposes pronouns only with consent. These exceptions are not blanket authorization for other legacy features. Current invitation/calendar/preferences APIs retain their separate ownership and participant checks.

Verification: all 91 typed-null calls by an unrostered authenticated identity failed with the specific boundary denial. A rollback-only rostered fixture passed the guard and preview, while its nonmember history request still failed membership authorization. The service guard check passed. Current invitation/lifecycle/private calendar/memory, preferences, shared availability, wish revocation, anonymous legacy and World Quest role regressions passed. Three existing roster entries remain; no boundary fixture profiles remain. No real invitation or memory was changed, no tester was added, and no paid AI call was made.

Advisor counts remain six anonymous and 98 authenticated privileged-function findings. RLS-without-policy INFO is now 22: the additional private roster deliberately denies client row access. Password-protection finding remains. This is a scoped server boundary, not full certification or enrollment clearance.

Source: [boundary migration](database/pilot-legacy-api-boundary.sql). Repeatable rollback checks: [boundary test](database/test-pilot-legacy-boundary.sql). A2 enrollment/API configuration and A3 password/recovery remain HOLD gates.

## Reviewable cancellation message — November 8, 2026
Applied `checked_cancellation_with_optional_shared_note`. A separate 400-character cancellation_note preserves the rescheduling response_note. Authenticated invoker wrapper `cancel_moment_invitation_revision` checks expected account, active pair, participant, current revision and lifecycle through its private implementation. Both sender and recipient can cancel. Same-actor/same-message retries are stable; different retry text or another participant cannot overwrite the original note. Completed moments remain closed. Existing one-argument cancellation compatibility remains available with its prior behavior.

The app offers optional message → Review Cancellation → explicit confirmation. Back/edit/keep do not save, failures retain words, changed accounts cannot submit, and account-change events close the cancellation dialog. The cancellation and message appear as shared invitation status. No email or text is sent; external notifications are not implemented. Reservations are explicitly separate and their own confirmation is required. Copy makes no judgment or inference about relationships.

Database regression passed participant and same-note retry success plus outsider, spoofed/null account, stale revision, oversized message, completed moment, inactive pair and anonymous denial. Both participants' invitation lists show the canonical cancellation and note. Existing lifecycle/account-separation regression passed. UI regression passed review/back/keep, failure/retry, exact expected account/revision/note, safe text rendering and changed account denial. Calendar model regression verifies cancelled moments disappear from both participant projections when refreshed. This is not a claim of immediate push synchronization or a new live two-device walkthrough; each device must load/refresh the current shared state.

No real invitation was cancelled; all synthetic fixtures rolled back. Advisor counts unchanged: 6 anonymous / 98 authenticated public privileged findings, 25 RLS-without-policy INFO, existing password-protection warning. New tester release HOLD remains. The Heartstone Store was unchanged.

## Direct accepted-time changes — November 8, 2026
Accepted, unstarted invitations with a scheduled day now show **Suggest Another Time** for either participant. Invitations without a day retain **Choose Our Time and Place**. Both open the current schedule editor expanded after reloading and validating the invitation. Started/completed moments do not show the shortcut.

The existing versioned shared schedule API remains unchanged. Opening or editing sends nothing; explicit proposal confirmation is required. Failed proposals retain edits. Pending proposals cannot be self-confirmed and leave the previously confirmed plan unchanged until partner confirmation. The UI explains this and still states that email/text are not sent. No guest route, external reservation action or notification system is added.

Existing invitation lifecycle regression passes, plus new sender and recipient cases for direct expansion/prefill, no mutation on open/dismissed confirmation, preserved failed-save fields, expected account/version, pending proposals and no automatic confirmation. The transport mock now preserves the confirmed plan on proposal, matching the existing scheduling semantics. No new live two-device walkthrough or backend migration was performed for this shortcut. Release HOLD remains.

## Pending time-change visibility — November 8, 2026
Applied `participant_pending_time_change_summary`. The existing participant-only invitation list adds a minimal time_change summary (pending status and proposer ID only) for accepted, unstarted, incomplete moments. Existing active-pair/participant filtering and surprise handling remain. Full proposal details are still loaded through the schedule editor.

Invitation cards distinguish reviewer versus proposer and offer Review Time Change / View My Time Suggestion. Calendar entries show the same waiting/review distinction; the home attention count includes changes awaiting this account's review, not its own proposals. The current agreed calendar day remains until partner confirmation. Closing the schedule editor refreshes the inbox after subsequent shared-detail callbacks so saved changes are reflected. This is refresh-based, not push/email/text delivery.

Database rollback verification passed both-participant minimal summary, outsider denial, preserved current day and cleared pending marker/new agreed day after confirmation. Existing invitation and calendar regressions plus new role-specific card/projection/attention checks passed. Advisor counts unchanged (6 anonymous, 98 authenticated privileged functions, 25 RLS INFO and existing password-protection warning). No real proposal was created or confirmed, and release HOLD remains.

## Caller-relative reply priority — November 8, 2026
Applied `prioritize_actionable_invitation_collection`. Ordering now places incoming pending invitations, reschedule requests awaiting this sender, and accepted pending-time proposals awaiting this participant first. Underway moments follow, then upcoming accepted moments, outgoing/waiting invitations, and closed/completed records. Within each category creation time and ID give deterministic ordering.

Priority applies both before the 50-row selection limit and in final JSON aggregation. An older needed reply is not excluded simply because many recent closed records exist. The response still contains at most 50 invitations; this is not pagination or a claim that all history is visible. Existing participant/active-pair checks, surprise redaction and pending-time summary remain.

UI adds Your reply is needed labels and a count of reply-needed items in the displayed collection. The status says Showing N invitations rather than claiming that the displayed count is the entire collection. Own pending suggestions are excluded from the reply count. Memories retain their separate completed-moment presentation.

Synthetic rollback regression creates 52 newer closed rows plus six older lifecycle/action cases, proves the right items survive the limit and are ordered for each participant, and checks outsider denial. Existing UI lifecycle tests and new count/label tests pass. No real invitations were changed. Advisor counts unchanged: 6 anonymous / 98 authenticated privileged public functions, 25 RLS INFO and existing password-protection warning. Release HOLD remains; store unchanged.

## Separate completed-moment collection — November 8, 2026
Applied `separate_completed_moment_collection`. New authenticated invoker wrapper `list_completed_moment_invitations(heart_stone_id, invitation_id default null)` calls a private participant/active-membership-scoped implementation. It selects accepted completed moments before applying its own 50-item limit, ordered by completion time then ID. Supplying a selected invitation ID performs a completed-only lookup independent of the latest-50 list, with the same authorization. No private memory words are added to collection responses.

Memories now uses this dedicated collection rather than filtering the priority-limited active invitation results. Reopening a selected completed moment uses the direct completed lookup; its private words still load through the existing account-scoped memory API. The display says Showing N completed moments. It currently shows the latest 50 completed moments; this is not pagination or unlimited history access. Active invitation priority remains unchanged.

Synthetic rollback tests created 55 actionable invitations and 51 completed moments: active collection contains 50 actionable records, Memories independently contains the latest 50 completed records, and an exact lookup can retrieve the oldest authorized completed item outside that cap. Tests also cover participant equality, unknown ID, outsider denial, inactive pair exclusion and anonymous denial. UI lifecycle regression plus completed-only list/reopen integration passed. No real data was changed.

The existing collection policy still requires active paired memberships. This change does not change the separately documented retention of an original participant's own private words through the memory API after disconnection. Advisor counts remain 6 anonymous / 98 authenticated privileged public functions, 25 RLS INFO and existing password-protection warning. New tester HOLD remains.

## Earlier completed-memory pages — November 8, 2026
Applied `completed_moment_keyset_pages`. A new authenticated invoker wrapper calls a private participant/active-pair-scoped completed query using (completed_at, id) descending cursors. Cursors require both a finite completion timestamp and an ID. Each query returns at most 51 authorized rows: 50 visible items plus one lookahead to determine whether another page exists. No offset pagination or total-count claim is used.

Memories shows **Load Earlier Memories** when more history exists. Loading appends older rows without discarding current cards; failures preserve rows and cursor for retry. Refresh resets paging and includes new completions. Account changes clear the cursor/history and invalidate a pending collection read. View changes discard the old-view response. Exact completed-item reopening still uses the separate participant lookup. The prior latest-50 UI limitation is superseded by this paging flow.

Synthetic rollback tests with 60 equal-timestamp completions verify first-page lookahead, ID tie-break, 10 remaining rows, no overlap, empty final cursor, malformed/infinite cursor denial and outsider/anonymous boundaries. A newer completion inserted between page reads does not disturb the older cursor; refresh includes it. UI regressions cover append, failure/retry, preserving loaded cards, cursor values, new-completion stability, refresh reset and signout clearing. Earlier tests continue to cover private memory isolation and inactive-pair exclusion. No real account history was changed.

This remains refresh-based loading without push/email/text delivery. Stored private words are fetched only through their existing account-scoped API. Store and enrollment/billing remain unchanged; new tester HOLD remains.

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

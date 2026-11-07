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

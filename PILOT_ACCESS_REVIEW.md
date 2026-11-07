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

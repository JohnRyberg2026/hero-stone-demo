# Private records: hosted integration readiness

The November 13 connected-project check found only the live Heartstone project
and its default branch. Attempting a separate development branch returned
“Branching is supported only on the Pro plan or above.” No test branch was
created. No live schema or records were changed. No plan upgrade was performed.

A dedicated nonproduction project and two existing fictional test accounts are
needed. Do not paste passwords into chat or commit them. Supply the following
through the execution environment's secret mechanism:

- HQ_TEST_URL: dedicated test project URL.
- HQ_TEST_PUBLISHABLE_KEY: test publishable key (not secret/service-role).
- HQ_TEST_MEMBER_A_EMAIL / HQ_TEST_MEMBER_A_PASSWORD.
- HQ_TEST_MEMBER_B_EMAIL / HQ_TEST_MEMBER_B_PASSWORD.

The project needs Supabase Auth, a public.profiles table with id UUID primary
key matching its auth users, each test account's profile row, and the reviewed
20261111171532_health_quest_private_records.sql migration. Inspect project schema
before applying anything; this runner deliberately does not create schemas,
accounts or profile rows. Existing Heartstone identity conventions remain the
reference for eventual integration; this is not another member identity system.

Run `node health-quest/run-private-integration.mjs` from repository root. It
refuses the known live project before network access, uses isolated nonpersistent
SDK sessions, and tests save/retry, second-account reads/writes/impersonation,
correction/stale update, sign-out, fresh-session retrieval, pause and deletion.
It creates fictional text only. Successful runs clear that text through the
application deletion path; audit metadata/empty tombstone may remain. Failed
cleanup is reported explicitly. Passwords, tokens and raw SDK responses are
never printed. It is not a full member/physician/manufacturer test and does not
prove physical-device/browser UI continuity.

Status: runner prepared, hosted integration NOT run because a dedicated test
backend and credentials are not available. The existing 74-check prototype is
unchanged. Three environment-guard tests were added; local total is 77 checks.
Next: provide a dedicated test project, inspect/migrate it, then run the hosted
journey before claiming live-account persistence or changing production.

## Environment available — November 13, 2026 follow-up

A separate $0-quoted Health Quest Test project is now active. Its tables are
installed and development-config.mjs points there. The branch/Pro limitation no
longer blocks the backend. See TEST_ENVIRONMENT.md. Two authenticated test accounts
are still required; full hosted integration has not yet run.

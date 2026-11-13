# Health Quest Test — isolated environment

Created November 13, 2026 in the user-selected “the Heartstone” organization.
Supabase quoted $0/month for project creation; this is the returned quote, not a
promise that all future usage or upgrades are free. No paid upgrade accepted.

Project ID: vkwrcozaximcjedvtloc. Region: us-east-2. Creation returned ACTIVE_HEALTHY.
Production project is separate and unchanged. development-config.mjs now points
only to this test URL with its public publishable key, never a service-role key.

## Installed and verified

- Fresh public schema inspected empty before mutations.
- Dedicated test-only public.profiles table with owner SELECT/INSERT policies.
- Private-record migration applied: owner records, audit metadata and save RPC.
- Hosted SQL confirmed RLS on profiles/records/audit, no anonymous record SELECT,
  authenticated owner RLS and no authenticated audit SELECT.
- Actual unauthenticated PostgREST request using the publishable key returned
  HTTP 401 / SQLSTATE 42501. This is hosted transport verification, not a mock.
- Security advisor returned one INFO: internal audit table has RLS but no policy.
  This is intentional default-deny plus revoked client privileges; only the narrow
  authenticated-owner audit trigger writes metadata. No WARNING/ERROR returned.
  Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

The initial second migration attempt hit a server-generated timestamp collision
in migration history. Inspection confirmed rollback (records absent), then retry
applied successfully. No partial duplicate schema was left.

## Still required

Two authenticated fictional test accounts and matching public.profiles rows.
No real user/profile has been copied or created, and no email or invitation sent.
The connector exposes schema operations but no Auth admin user-creation method.
Do not insert raw auth credentials through SQL or commit passwords.

HOSTED_INTEGRATION.md describes environment configuration for the two-account
runner. The earlier branch/Pro blocker is bypassed by this separate project.
The runner has NOT yet passed against authenticated accounts. Tests of real
sign-in/correction/return and second-account isolation remain to run. The complete
fictional plan/order model is still browser-local; this backend currently stores
only goals/observations. The member screen still needs its test sign-in entry.

Resume: establish two test accounts through supported Supabase Auth administration
or member sign-up, prepare owner profile rows in this project, run the integration
script, then extend real persistence to approved formula versions. Preserve the
single existing Heartstone identity architecture for eventual production.

# Health Quest private records — development milestone

November 11, 2026. Development only; no hosted database or live app changes.

Implemented an additive migration for account-owned goals and observations,
plus a Supabase client adapter requiring approval and the expected signed-in
account. The existing conversation handler and shared Quest tables are unchanged.

Database behavior: owner-only RLS; immutable ownership/kind; revision checks;
action IDs for retry protection; metadata-only audit events; planned versus
reported state; optional follow-up; deletion clears text, time and follow-up,
retaining an empty tombstone to prevent stale restoration.

Verification uses PGlite's actual PostgreSQL engine with fictional identities,
including disk persistence and database restart. This is not a hosted Supabase
Auth, PostgREST, browser or cross-device test. Bootstrap auth.uid() is a local
test substitute. Run `npm ci --prefix health-quest` then
`npm test --prefix health-quest`.

The audit trigger is a narrow SECURITY DEFINER function in an unexposed schema;
direct execution and audit-table access are revoked. The save RPC uses SECURITY
INVOKER and owner RLS. Authenticated direct table writes remain possible under
RLS; explicit approval is an application requirement, not proof of human intent
that SQL can independently establish. Never give the model database credentials
or treat generated text as approval.

Deletion removes current health text, not provider backups or existing profile
documents. Production retention terms and member-facing export/deletion controls
must be completed before sensitive pilot ingestion. No real member data is
included in this repository or test suite.

Next: connect a development-only member interface using existing authentication;
test goals, observations, correction, stop-follow-up, export and deletion with
two real nonproduction accounts. Run hosted security advisors and test PostgREST
permissions before deployment. This change is a storage foundation, not a
completed private profile, conversational integration or live pilot.

## Member screen milestone — November 11, 2026

Added `health-quest/member.html` and an account-bound controller using the storage
adapter. Supports new goals/observations, planned/reported status, explicit review,
correction, follow-up preference removal, confirmed deletion and private JSON
export. Auth changes clear displayed notes, drafts and pending review; stale
asynchronous responses cannot render after sign-out. Saved text uses textContent.
No chat/model integration or automated follow-up is included yet.

The development configuration is deliberately null. Configure only an isolated
test project's URL and publishable key in a development checkout; this screen
must not silently connect to production. Existing home navigation is unchanged
until the test backend and account journey are verified.

Validation: 28 Health Quest checks pass (PostgreSQL/PGlite storage and jsdom UI
behavior); 12 existing conversation regression checks pass. UI tests use a fake
transport. Hosted Supabase Auth/PostgREST, browser rendering, voice input, real
account continuity and cross-device behavior remain unverified. No production
migration, deployment or real profile import was performed.

Next: provision or select an isolated nonproduction Supabase environment, apply
the reviewed migration there, connect the screen, and exercise two test accounts
through sign-in, save, correction, sign-out, return and account isolation. Then
add the approved conversational entry path and import John's reviewed profile
privately. Do not put his profile into this public repository.

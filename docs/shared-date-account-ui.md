# Shared dates connected to accounts — review candidate

## Delivered behavior

`shared-dates.html` is the account-connected counterpart of the fictional rehearsal. It links from the invitation builder. The page asks the user to connect the account already signed in through HEART STONE. It uses the existing publishable project key and pinned Supabase client; no service credential is included.

Connected people come from the new authenticated `shared_date_candidates` RPC. The result includes only the caller's own name/account identity and the IDs/names of people actively connected to them. It does not enumerate another person's separate relationships, contact information, private preferences, verification details or memories. Server validation still checks every participant's eligibility when an invitation is created, sent, accepted or begun.

Users explicitly save private account drafts; saving never sends. Send requires a fresh server read of that invitation version and a dialog showing the full reviewed guest list, time, meeting place and plan name. Only the organizer can send. There is no simulated-actor picker on this account page: accepting, declining, requesting another time, withdrawing, beginning and stopping all use the current authenticated account. The server enforces the actor and expected revision.

Individual responses remain private by default. An additive snapshot patch returns the full disclosed roster and the overall state, but only the caller's own individual response. The UI also masks other individual responses even if an older server returns them. There is no response-sharing feature in this version. A confirmed date necessarily indicates unanimous acceptance; the UI does not identify who declined or requested a change when a round closes or needs revision.

Unsent drafts remain organizer-only. An organizer may revise a saved date; all responses reset under the server's new revision. If someone from the original roster is no longer in the available-connection list, they are shown explicitly rather than silently omitted; saving requires reconnecting or explicitly removing them. The page uses plain text rendering for account-supplied names and plans.

Authentication is checked before and after each server operation. Account changes clear volatile plan, roster, identity, editor and review state. Failed/uncertain writes do not claim success and keep the same opaque retry identity. Browser storage holds only account-scoped request fingerprints and UUIDs, never plan contents. Drafts are saved to the server only through the explicit save action. Storage failure prevents the write rather than silently losing retry protection.

The review dialog can always be closed, including while a request is underway. Closing after sending starts cannot cancel the server request; the UI says it may still complete. Canceling review before sending issues no send request.

## Installation and scope

Depends on PRs #45, #47, #49 and #52. Install the approved server/relationship candidates and `shared-date-candidates.sql` through the project's reviewed migration workflow, then deploy the new page and scripts. The locked server checkpoint is preserved; response privacy is an additive replacement function, not an edit to the frozen installation artifact.

A real age-verification integration must populate trusted verification records. A browser 18+ confirmation is not verification. No existing account is enrolled automatically. The backend candidates remain uninstalled as of the tests; the live service will report that account features are unavailable until installation. Nothing has been deployed, booked, purchased, emailed or texted by this build work.

This page covers the shared-date account flow. It does not implement the full cinematic invitation, calendars, venue bookings, group memories, deletion/retention UI, proactive notifications or independently authorized response sharing. Refresh is manual. Browser/device visual testing and real separate-device testing remain release requirements.

## Verification

Eleven Node suites passed, including the new account-service and UI suites and all prior connection, invitation, store, profile and plan-handoff suites. New coverage includes no automatic sends, private draft saving, three-person review, cancel-before-send, revision forwarding, own-account responses, masking of other responses, uncertain writes, stable retries, missing backend handling, account changes and clearing of private content.

The combined database test installed the server, relationship and candidate/privacy changes inside a rollback-only transaction. Authenticated/anonymous tests passed for connection isolation, account identity checks, candidate field minimization, shared invitations across separate relationships, own-response visibility and revoked adult eligibility. The final query confirmed the new schema and fixture accounts were absent and the original unique index was restored. Concurrent multi-session stress testing has not been performed.

Reproduce the database test using `database/shared-date-account-rollback-test.sql` with psql and `ON_ERROR_STOP=1` against a disposable/staging Supabase database. Never remove its rollback.

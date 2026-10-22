# DATE QUEST adult connections — integrated review candidate

Status: **review candidate only; live release blocked**.

This candidate combines PRs #45, #47, #49, #52 and #54 with `main` at `b9037cd42ae2dbb75ccfa0c7ff678e09c639a628`. The integration preserves the three-part home-first DATE QUEST entry and calendar feedback fixes from PRs #48, #50 and #51. It adds a direct shared-dates link to the home page. The merged store/account-wishes work from PR #53 is also preserved, including private account saves and explicit partner sharing. Earlier review branches are left intact.

## Included behavior

DATE QUEST has explicit 18+ demo entry, separate optional intimate display and individual adult consent boundaries. WORLD QUEST remains family-safe by default; its optional adult setting must be specifically added and currently cannot activate adult content.

One account can select among independent dating connections in the reviewed migration. A shared date can include people from several connections without merging those relationships. Drafts are private; sending requires reviewed guest-list confirmation. Each participant answers from their own account, all included people must accept the same revision, material plan/roster changes reset responses, and anyone can withdraw or stop. Individual responses are private by default; the roster and aggregate state are shared.

## Validation evidence

| Check | Result |
| --- | --- |
| Current home-first entry / calendar tests | Passed with all adult/connection changes included |
| Complete local Node runner | 15 of 15 suites passed |
| Combined authenticated/anonymous database tests | Passed in a rollback-only transaction |
| Database cleanup | Shared-date schema absent; connection schema absent; original unique index restored; all eight fictional accounts absent |
| Frozen server checkpoint | Original files retained; response-privacy update is additive |
| Browser screenshots / real-device tests | Not completed; browser runtime was unavailable and its download could not be extracted |
| Concurrent multi-session database stress | Not completed |
| Live installation / verification / deployment | Not performed |

Reproduce local checks: `node tools/check-date-release.cjs`. The two account/store-wishes browser suites were attempted but blocked by the unavailable browser executable. Run `node tools/check-date-release.cjs --browser` with a running local/staging server and the configured browser runtime to include them.

Reproduce the complete database test: run `database/date-connection-release-rollback-test.sql` with psql and `ON_ERROR_STOP=1` against a disposable/staging Supabase database. It combines the installation candidates with all three server test sets and always rolls back. This script does not install production features.

## Release blockers

1. Configure a trusted adult-verification provider/process. The private eligibility table is intentionally empty after installation; browser confirmations, profile age flags and user metadata must not populate it. No real account is enrolled by this candidate.
2. Review/package/apply the backend candidates through the project's migration workflow, in the order below. The live database still has the original single-active-connection restriction. No backend candidate is installed.
3. Archived `build*-preview.html` and `Index.html` entries now redirect to the current app, preserving query strings and sign-in fragments. The 30 old implementations remain in Git history. Verify these redirects on the actual staging host, including case-sensitive paths, before enabling concurrent relationships.
4. Run browser, accessibility, separate-device and concurrent-session release tests against an isolated staging environment with explicitly authorized verified test accounts. Obtain deployment approval after those checks.

## Reviewed dependency order

| Order | File | Purpose |
| --- | --- | --- |
| 1 | `database/shared-date-server.sql` | Private participant storage and authenticated workflow |
| 2 | `database/multiple-dating-connections.sql` | Remove the global unique index; replace create/accept/bootstrap together |
| 3 | `database/shared-date-candidates.sql` | Account-scoped candidate lookup and private individual responses |

Install the reviewed backend changes atomically. Deploy explicit connection selection and supported entry points before enabling multiple memberships. Do not recreate the former unique index after users have multiple memberships without an explicitly reviewed reconciliation plan. The normal migration system must record the installation; these files are installation candidates, not fabricated migration-history entries.

## Boundaries of this candidate

The existing main-app home calendar remains a private device demo and its accepted-moment cards still use the legacy pair-invitation API. Account shared dates have their own page; no automatic shared-date-to-calendar publication is included. Venue purchases/bookings, optional individual-response sharing, group memories, legacy connection-create deduplication and retention/cancellation/disconnection UI remain separate work. General account preferences such as the existing global pronoun-sharing flag are not redesigned by this integration.

This document is a review handoff, not evidence that the application is production-ready. No real invitations, messages, payments, reservations or profile-verification records were created by the validation work.

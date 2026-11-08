# Locked Date Quest development checkpoint — November 8, 2026

## Lock
John approved saving and locking the current checkpoint. Preserve this feature baseline; continue subsequent development in later commits. This is an engineering checkpoint, not authorization to invite testers, take payments or launch a fundraiser.

Pinned source: [`5c2d57b91b3a6f7a64ac66d7b0d018f6b4fdf6f4`](https://github.com/JohnRyberg2026/hero-stone-demo/tree/5c2d57b91b3a6f7a64ac66d7b0d018f6b4fdf6f4).
The Git commit preserves the exact source; this document does not change repository protection or lock real user data.

Live home: https://johnryberg2026.github.io/hero-stone-demo/index.html#date-quest

## Included behavior
- Simple home with distinct Talk to Heartstone, Plan a Moment, Our Invitations and Heartstone Store buttons; Memories shortcut; interactive account calendar underneath.
- Store button is restored; further store work is deferred.
- Invitation review/send, participant replies, shared schedule proposal and confirmation, guarded begin/finish, separate private memories.
- Optional cancellation message with review/explicit confirmation, preserved failed-save words and a reminder to handle external bookings separately.
- Either participant can suggest another time. Pending review versus own waiting status is visible in invitations/calendar; agreed dates stay until partner confirmation.
- Reply-needed invitations prioritized before the server's 50-row active collection limit.
- Separate Memories collection with Load Earlier Memories, stable cursors, preserved failed-page retry and account-change clearing.
- Guarded Home navigation: clean draft returns directly; edited planner draft uses save/discard/stay; moment windows guard unsaved memory/schedule and in-progress saves.
- Founding rules: 10 couples plus five individual account holders; one free year, permanent recognition, lifetime USD $12/year billed annually. Public policy: one free month, then $12 annually. World Quest separate.
- Administrator-only founding enrollment and preview, plus own-account membership display. No real founding enrollment or billing activated.

## Verification at this checkpoint
GitHub regression run [42470421178](https://github.com/JohnRyberg2026/hero-stone-demo/actions/runs/42470421178) succeeded for the last functional commit. Pages deployment [42470422541](https://github.com/JohnRyberg2026/hero-stone-demo/actions/runs/42470422541) succeeded for the pinned source.

Reran all 14 saved database checks below against the deployed database, plus the new [current RPC boundary test](database/test-current-pilot-rpc-boundary.sql): **15 passed**. Database tests are owner-run scripts, not automatically executed by GitHub CI. Synthetic writes rolled back. No remaining rollback fixture profiles; no real founding members; existing legacy roster still three accounts.

| Pinned database check | Result |
| --- | --- |
| [database/test-pilot-access-surface.sql](database/test-pilot-access-surface.sql) | PASS |
| [database/test-pilot-legacy-boundary.sql](database/test-pilot-legacy-boundary.sql) | PASS |
| [database/test-current-date-quest-authorization.sql](database/test-current-date-quest-authorization.sql) | PASS |
| [database/planning-preferences-test.sql](database/planning-preferences-test.sql) | PASS |
| [database/shared-availability-test.sql](database/shared-availability-test.sql) | PASS |
| [database/test-wish-share-revocation.sql](database/test-wish-share-revocation.sql) | PASS |
| [database/test-founding-enrollment.sql](database/test-founding-enrollment.sql) | PASS |
| [database/test-founding-enrollment-preview.sql](database/test-founding-enrollment-preview.sql) | PASS |
| [database/test-private-membership-read.sql](database/test-private-membership-read.sql) | PASS |
| [database/test-cancellation-message.sql](database/test-cancellation-message.sql) | PASS |
| [database/test-pending-time-summary.sql](database/test-pending-time-summary.sql) | PASS |
| [database/test-invitation-reply-priority.sql](database/test-invitation-reply-priority.sql) | PASS |
| [database/test-completed-moment-collection.sql](database/test-completed-moment-collection.sql) | PASS |
| [database/test-completed-moment-pages.sql](database/test-completed-moment-pages.sql) | PASS |

New boundary test additionally verifies public wrappers remain SECURITY INVOKER, anonymous execution stays denied, ordinary accounts cannot use administrator enrollment/preview or read/write roster tables, and nonparticipants cannot call the newer paths successfully.

This is source, mocked UI/server and synthetic database evidence. It is not a new live phone/computer walkthrough, production load test, independent certification or delivery confirmation.

## Current pilot decision
**Continue existing-account development. HOLD new testers and public enrollment.**

Verified again November 8:
- Live Auth: public email signup enabled (`disable_signup=false`); email confirmation required; anonymous signup disabled.
- Effective REST exposed schemas: exactly public and graphql_public. Private implementation schemas are excluded.
- The attempted dashboard signup restriction is still unfinished at sign-in; no Auth setting was changed.
- Advisor: 6 anonymous and 98 authenticated public privileged-function findings; scoped exceptions and 91-function legacy restriction remain as documented.
- 25 RLS-without-policy informational findings include deliberately private deny-default tables; do not add permissive policies merely to silence them.
- Leaked-password protection remains disabled. Session recovery exists; a complete password-reset UI/delivery verification is not yet implemented.
- Guest invitation authorization, external email/text notifications, payment collection and external reservation handling are not implemented. Guest product permissions remain limited to accept, decline or suggest another time without account/real-name requirements; no guest access has been enabled.

Advisor references: [privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS informational findings](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Next coding priority
Implement a clear account-recovery entry and return flow, preserving private drafts and account separation. Confirm supported redirect/delivery configuration and actual recovery operation before clearing that gate. Public signup restriction still needs completion in the dashboard; no new tester, external invitation or charge is authorized by this checkpoint.

Detailed chronology: [PILOT_ACCESS_REVIEW.md](PILOT_ACCESS_REVIEW.md). Membership terms/integration: [DATE_QUEST_MEMBERSHIP_CHECKPOINT.md](DATE_QUEST_MEMBERSHIP_CHECKPOINT.md).

# Living Story Book staging handoff — 24 October 2026

Status: prepared, not installed or approved for release. The latest development UI supports explicit personal saves, relationship summaries, consent-status checks and confirmed withdrawal of a reviewed own approval. It cannot create shared approvals, read shared entries, publish or export. Separate avatar work is outside this handoff.

## Verified read-only prerequisites

`database/storybook-staging-preflight.sql` was executed against the connected project on 24 October. It reads PostgreSQL catalogs only, never account, book, memory or approval rows. The report is deliberately not a release gate by itself.

| Check | Observed result |
| --- | --- |
| Database major | 17 |
| Required column names | All 18 present; observed types returned for review |
| Membership status / volume state | Existing enum types; reader/ledger fixtures now use their observed labels |
| Inspected tables | RLS enabled on all five reported tables |
| Candidate schemas | Personal, relationship reader and consent ledger absent |
| Supabase development branches | None returned |

No schemas, grants, records, approval responses or publication state changed. Existing RLS flags and trigger counts do not establish correct access; full policies, privileges, dependencies and behavior must be tested. The script reports `installationAuthorized:false` and `releaseReady:false` unconditionally.

## Staging sequence

1. Identify or provision a separately authorized disposable staging target. Record its project identity and isolation before any installation. Do not use the connected project's existing books as test fixtures or copy personal data into staging.
2. Reproduce the complete existing schema without user data: enum types, constraints, indexes, RLS policies, grants, views, function bodies, enabled triggers and dependencies. Track the source revision. Minimal CI fixtures are not a substitute. The reader and ledger fixtures now reproduce the observed membership and volume-state enums (including the concurrency runner, which reuses the ledger setup), but still omit other baseline constraints and dependencies. Review service-role paths and every writer of books, entries, seeds, memberships and eligibility.
3. Run the preflight on staging and inspect types and dependencies, not just the column-presence boolean. Reproduce legacy authorized/unauthorized reader behavior before adding candidates. Preserve the observed view/base-grant mismatch as evidence rather than fixing it with broad grants.
4. Rehearse reviewed candidate installation on a clean staging copy. Relationship summary reader is separate from the personal draft schema. Install the consent ledger and publication guard together in one reviewed transaction after confirming the baseline; never leave the candidate ledger presented as enforcement without the guard. Existing-object conflicts require inspection, not a blind rerun or DROP. Prepare recorded migrations only after the rehearsal is accepted.
5. Seed fictional adult accounts and relationships. Keep trusted adult verification separate from profile claims. Use at least an owner, another required participant, an unrelated account and a former member, plus two independent relationships for isolation checks.
6. Run the acceptance matrix below and retain results with the exact source revision, target identity and migration list. Discard/reset the disposable target on failed installation rather than altering production to match a fixture. Rehearse recovery from a failed transaction and confirm the original baseline survives unchanged.
7. Perform separate-account phone/computer QA on staging. Keep production installation, merge and deployment separate. Sharing, approval creation and publication require their remaining design/security gates even if status and withdrawal work.

## Required evidence before advancing

| Area | Acceptance evidence still required on full baseline |
| --- | --- |
| Personal books | Owner-only save/reload; original dates and twelve chapters; retry/revision conflicts; no relationship access or automatic private-note transfer |
| Relationship summaries | Selected relationship only; former/nonmember/suspended/spoofed/anonymous denial; no widened base grants or entry text |
| Status and withdrawal | Exact action/version; independent responses; own withdrawal only; account/selection clearing; uncertain response recovery; no automatic retries |
| Concurrent legacy writers | Edits, entry inserts/deletes/moves, source edits, membership/eligibility changes and consent requests using actual writer lock order; bounded failure/retry handling; no stale approval reuse |
| Publication | Actual publish and alternate state setters cannot bypass the guard; new publication remains disabled; existing published records survive installation; archive/edit restrictions hold |
| Provenance and roster | Original contributors, source access, hidden Time Capsules, required participants and viewers reconciled; first-review active membership is not historical contributor consent |
| Devices and access | Phone/computer sessions, offline/reconnect, restored pages, keyboard/reduced motion and narrow screens; fictional browser tests do not establish device QA |

The CI ledger runner currently covers four defined races with relationship-lock barriers: simultaneous approvals, withdrawal before queued review, content edit before queued response, and participant removal before queued review. It does not cover every legacy writer or prove deadlock freedom. Source eligibility, participant reconciliation and delivery/export remain blockers. Do not backfill approvals from membership or historic flags.

## Resume

Next substantive integration gate: obtain a complete schema-only baseline in an isolated staging target and exercise the actual legacy writers against the candidates. Until that target is authorized and identified, continue only source preparation and local/disposable verification. Do not enable new shared approvals merely because a status screen exists.


## Export availability check

The connected tools expose catalog queries, migrations and branch operations, but no schema-export operation. Neither Supabase CLI nor `pg_dump` is available in this workspace. No connection credentials were requested, inspected or printed. A canonical schema-only export or a separately authorized isolated target is still required; reproducing selected catalog objects does not constitute a complete baseline. Catalog enum labels verified: membership `pending_connection / active / left`; book state `draft / assembling / ready / published / archived`.

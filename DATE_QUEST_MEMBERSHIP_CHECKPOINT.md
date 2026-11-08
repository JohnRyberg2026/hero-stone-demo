# Date Quest membership implementation checkpoint — November 7, 2026

## Approved product decisions
- Controlled founding pilot: 10 couples (20 registered people) plus 5 individual account holders, 25 registered participants total. Guest invitees are additional and do not occupy founding membership places.
- Founding members: one full year free, permanent Founding Member recognition, then a guaranteed lifetime USD $12/year billed annually even if new-member prices rise.
- After the pilot: public Date Quest membership starts with one free month, then USD $12/year billed annually. $1/month is an advertised equivalent, not a monthly billing plan.
- World Quest is a separate paid offering.
- Guest invitees need neither an account nor a real name. Their allowed actions are accept, decline, or suggest another time.
- After mutual acceptance, either participant may cancel or suggest rescheduling, without guilt or relationship judgments. A custom message is optional. External notifications require explicit confirmation. Both calendars must reflect the resulting status. External bookings require separate handling and cancellation confirmation. Repeated cancellations must not be interpreted as relationship trouble.

## Implemented in this checkpoint
`date-quest-membership.mjs` is a side-effect-free policy foundation:
- Validates exactly two accounts per couple place and one per individual place.
- Rejects duplicate accounts and over-capacity rosters; unused places of one type cannot increase the other type's quota.
- Calculates founding-year and public-month trial boundaries using ISO calendar days, independent of device timezone; anniversaries clamp to month end.
- Preserves founding recognition and the $12 annual rate when a different future new-member price is supplied.
- Defines the three permitted guest reply actions; everything else returns false.
- Produces terms previews only. It does not create an account, enroll a member, grant permissions, start a subscription, charge money or schedule automatic renewal.

Eight automated tests cover capacity, duplicates, rate protection, anniversary boundaries, public annual pricing, invalid inputs, unchanged activation dates and guest action restrictions. Added to GitHub regression checks.

## Integration boundaries and next coding work
The module is not yet imported into production enrollment, billing, or guest authorization. Browser-supplied tier, activation date or roster must never grant access. These pure checks are not a concurrency lock or security boundary.

Implemented in the server checkpoint below: an administrator-controlled enrollment transaction with persisted original activation and locked founding entitlement, atomic capacity checks, stable account identity, idempotent retries and administrator-only writes. Guest reply tokens must be invitation-scoped, expiring, revocable and stored as hashes; they must not expose calendars or private memories. Guest permissions must be enforced server-side before any guest route is enabled.

Payment processor integration, renewal consent, payment status and actual charge handling are unimplemented. Founding cancellation, lapse, rejoin and seat replacement semantics need an explicit decision before enrollment can alter or remove permanent recognition or the locked rate.

Calendar-day anniversary calculation is now the code default; enrollment must explicitly record the activation day using a documented timezone. This checkpoint does not set dates for any real member.

Cancellation/rescheduling requirements above are recorded but not implemented by this membership module. Existing in-app cancellation and shared schedule behavior remains as previously shipped; optional cancellation messages, external notification delivery and reservation handling are not newly claimed.

## Release status
Existing-account development continues. New testers remain HOLD under PILOT_RELEASE_DECISION.md. Public signup was last verified enabled; the attempted dashboard change is still blocked at sign-in and has not been applied. Password/recovery gate remains open. No new member was invited or charged during this checkpoint.

## Server enrollment implemented — November 7, 2026
Applied migrations `private_atomic_founding_enrollment` and `atomic_founding_quota_counters`. Source must be applied in order: [initial schema/function](database/founding-enrollment.sql), then [locked quota counters](database/founding-enrollment-quota-counters.sql).

The private `hs_membership_internal.enroll_founders(request_id, kind, account_ids)` function is executable by service_role only and requires a trusted service-role request. No public wrapper or browser enrollment button was added. Ordinary clients have neither schema usage, table grants nor execution rights. Service role has function execution but no direct table mutation grants. Tables have RLS with no client policies.

Quota admission uses a transaction advisory lock and a conditional row update of persisted counters. The counter cannot exceed its type's quota. A unique account key prevents duplicate places; unique request IDs and canonical account ordering make retries stable, including when capacity is full. Reusing a request ID with different accounts/type is rejected. A database uniqueness or serialization failure cannot consume a partial place: the transaction must roll back; retry with the original request ID.

Enrollment requires existing, nondeleted, nonanonymous accounts. The server saves the UTC calendar day of administrator enrollment as the original activation day and its one-year anniversary as the exclusive free-period end. Both members of a couple receive the same enrollment dates and locked terms. This does not verify they are a connected pair or enroll guest invitees. Terms are USD 1200 cents annually, permanent recognition and lifetime-rate flags true, version 2026-11-07. No browser metadata or future price setting can change those fields through the enrollment function.

No update/delete/replacement operation is offered. Relationship changes and signout do not return seats to the pool. Historical UUID membership records deliberately remain independent of the Auth-user deletion cascade; account erasure, transfer, replacement and lapse/rejoin behavior need a separate operational decision. Do not treat this as an implemented erasure or recovery process.

Verification: [synthetic rollback test](database/test-founding-enrollment.sql) passed exact 10-couple/5-individual quotas, 25-member total, duplicate/nonexistent/anonymous/incomplete-account denial, client self-enrollment/roster-read denial, original free-year and rate persistence, reordered idempotent retries, mismatched request rejection, and quota-counter consistency. It verifies the legacy development roster was not expanded. This is a single-session database regression; no multi-session load test is claimed. Conditional locked updates and unique constraints provide the concurrency protections.

After rollback: zero real founding enrollments, zero members, zero occupied places and zero remaining fixture profiles. No invitation was sent, no subscription or charge was created, and no Date Quest access gate was changed. Public and guest enrollment remain unimplemented. New-tester HOLD still applies.

Security advisor: six anonymous and 98 authenticated public privileged-function findings unchanged; RLS-without-policy INFO becomes 25, including the three deliberately private enrollment tables. Leaked-password protection finding remains. See [RLS advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Next coding step: an account-scoped read of saved membership terms, with privacy checks, before any enrollment operator UI. Do not open guest replies until their separate invitation-scoped server authorization exists.

## Owner-only membership display shipped — November 7, 2026
Applied `private_account_membership_terms`. Public `my_date_quest_membership(expected_user)` is an authenticated SECURITY INVOKER wrapper. Its private implementation requires auth.uid(), the exact expected account and a nonanonymous/nondeleted Auth account. It returns only the caller's saved terms or `{enrolled:false}`; no partner IDs, roster, seats, request IDs or enrollment IDs are returned. Authenticated now has schema usage and execution of this own-terms function only; enrollment function and all tables remain denied.

Profile & Settings has a collapsed **My Date Quest Membership** section. It loads on demand, shows no enrollment when absent, and explicitly says billing is inactive. Generation and account rechecks suppress stale results after account changes; timeout/error restores retry. No payment action is offered and the store was unchanged.

Database owner/partner/outsider/null/signed-out/anonymous, direct-table and self-enrollment tests passed with rollback fixtures. Enrollment regression still passes after the schema-usage change. Seven UI logic tests passed, covering saved terms, unenrolled display, malformed responses, changed accounts, signout, errors and stale timeout results. No real accounts were enrolled. The display is not an authorization gate, subscription or billing integration.

Security advisor counts remain six anonymous and 98 authenticated privileged public functions, 25 RLS-without-policy INFO (private deny-default tables), and the existing leaked-password protection warning. New tester HOLD remains.

## Administrator preview completed — November 8, 2026
Applied `administrator_founding_enrollment_preview`. The private, stable service-only preview checks candidate accounts, quotas, existing enrollment and request reuse without modifying records or reserving capacity. Saved enrollment retries return original dates; new dates are explicitly estimates. Commit remains a separate action and revalidates capacity. No browser admin route was added.

The [operator review guide](FOUNDING_ENROLLMENT_REVIEW.md) records the review/commit distinction and response reasons. [Rollback verification](database/test-founding-enrollment-preview.sql) passed, including exact before/after persisted-row comparison and a stale preview whose commit is rejected after capacity fills. No real account was enrolled; release HOLD remains.

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

Next implementation: an administrator-controlled enrollment transaction with persisted original activation and locked founding entitlement, atomic capacity checks, stable account identity, idempotent retries and administrator-only writes. Guest reply tokens must be invitation-scoped, expiring, revocable and stored as hashes; they must not expose calendars or private memories. Guest permissions must be enforced server-side before any guest route is enabled.

Payment processor integration, renewal consent, payment status and actual charge handling are unimplemented. Founding cancellation, lapse, rejoin and seat replacement semantics need an explicit decision before enrollment can alter or remove permanent recognition or the locked rate.

Calendar-day anniversary calculation is now the code default; enrollment must explicitly record the activation day using a documented timezone. This checkpoint does not set dates for any real member.

Cancellation/rescheduling requirements above are recorded but not implemented by this membership module. Existing in-app cancellation and shared schedule behavior remains as previously shipped; optional cancellation messages, external notification delivery and reservation handling are not newly claimed.

## Release status
Existing-account development continues. New testers remain HOLD under PILOT_RELEASE_DECISION.md. Public signup was last verified enabled; the attempted dashboard change is still blocked at sign-in and has not been applied. Password/recovery gate remains open. No new member was invited or charged during this checkpoint.

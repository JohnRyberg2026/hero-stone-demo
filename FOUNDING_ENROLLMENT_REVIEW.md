# Founding enrollment review — November 8, 2026

## Release boundary
New tester enrollment remains HOLD in PILOT_RELEASE_DECISION.md. This operator mechanism does not clear public signup, password recovery or guest authorization. Do not enroll the founding group or send external invitations as part of a test. No member is automatically granted legacy development access.

## Supported administrator sequence
1. Resolve the selected existing nonanonymous account identities through the administrator's trusted account-management workflow. Never infer identities from a first name or partner relationship alone.
2. Choose one individual account or two distinct accounts for a couple. Create one enrollment request UUID and keep it with that exact selection for retries.
3. In trusted server/database administration only, call `hs_membership_internal.preview_founding_enrollment(request_id, kind, account_ids)`. The function is private and executable only by service_role, with a trusted service-role request. There is no browser service key, public RPC or operator UI.
4. Review reason, member count, available places, estimated activation/free-year dates, USD $12 annual lifetime rate, permanent recognition, separate World Quest and inactive billing.
5. A real enrollment is a separate explicit operator decision using the existing `enroll_founders` function with the same request ID and account selection. Do not perform this while the release HOLD remains. It rechecks account eligibility, uniqueness and quota in its own transaction.

The preview does not reserve seats or create a durable approval token. Capacity and UTC day may change before enrollment. Preview dates are estimates until enrollment, then the stored original dates are returned on retry. Never show a preview as proof of enrollment, access or a subscription.

| Reason | Meaning | Operator response |
| --- | --- | --- |
| ready | Selection currently passes preflight | Review terms; commit only after release clearance and explicit enrollment decision |
| existing_enrollment | Same request and same canonical accounts already enrolled | Treat as an idempotent retry; retain original dates and terms |
| request_conflict | Request ID already belongs to a different selection | Investigate; do not silently create another enrollment |
| registered_accounts_required | At least one account missing, deleted or anonymous | Resolve registration/identity first |
| member_already_enrolled | A selected account already occupies a founding place | Review the existing place; do not transfer or replace automatically |
| place_type_full | This type's quota is filled | Do not substitute another type or expand the pilot silently |

Malformed kinds, null identifiers, wrong account counts and repeated account IDs raise validation errors. Authentication/role failures raise permission errors. Ordinary signed-in accounts cannot call the preview, view quotas or enumerate candidates through it.

## Verification
Synthetic rollback tests cover exact ready terms/capacity, stable reordered previews, nonexistent and duplicate accounts, conflicting request IDs, saved original enrollment dates, a preview becoming full before commit, and commit rejection after capacity changes. Persisted enrollment/member/limit rows are compared before and after preview and remain identical. Role checks reject ordinary clients and a non-service request even when using a service SQL role.

No multi-session load test is claimed. Commit concurrency is enforced by the existing transaction lock, conditional quota updates and unique constraints. No UI, billing, email, guest invitation or real enrollment was enabled by this change.

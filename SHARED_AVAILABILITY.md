# Shared availability — November 2, 2026

Adds explicit, date-only sharing with a selected connected partner. The private account calendar and private hearts are separate from these explicitly shared dates. Shared dates appear in a separate list after refresh/focus. No notifications, messages, invitations or acceptance occur.

Data API: `set_shared_availability` and `list_shared_availability` are security-invoker wrappers. Authenticated-only internal functions enforce `auth.uid()`, the expected account, active pair membership, ownership and membership-record identity. No client access to the internal table is granted; RLS is enabled with intentionally no policies as deny-by-default defense. Internal privileged functions use an empty search path. Only owner-authenticated deletion is possible, including after disconnection.

Dates expire from visibility at midnight in the sharer's browser timezone, validated against PostgreSQL timezone names. Past dates and dates beyond 366 days are rejected. Expired rows are retained internally; expiry means hidden, not physical erasure. Reads hide hearts if either saved membership is no longer active. Sharing is idempotent. Public calendar titles, private notes and conversations are absent from the data contract.

Verification: SQL rollback integration tests passed under authenticated role for both members, unknown user denial, expected-account mismatch, direct table denial, owner-only removal, duplicate writes, invalid/past dates and timezone validation, and expiry. Three browser-model tests passed for explicit-only payloads, account-change/in-flight clearing, expiry and calendar selection; existing calendar checks and eight conversation/handoff regressions passed. No full browser visual or live two-account UI walkthrough was performed for this new feature.

Security advisor review: the new private table produces an informational RLS-without-policy notice by design; direct access is revoked. The new public functions are invoker wrappers and not callable by anon. Existing unrelated project findings were not changed in this feature.


## Live pilot result
John confirmed the two-account UI walkthrough after deployment: his shared day appeared for Jessica after refresh; after John removed the heart and Jessica refreshed, the day disappeared. Both live checks passed. Earlier text describing this walkthrough as pending is superseded by this result. No additional test data was created by the assistant.

## Membership reactivation privacy repair — November 7, 2026

Found with synthetic rollback fixtures: an old share could become visible again if the same membership row was marked left and later active. Its membership ID had not changed, so the original active-record filter alone was insufficient to keep the share revoked.

Applied `mark_shared_availability_revoked_on_membership_change`:
- Private availability rows now have an internal `revoked_at` marker.
- A membership status transition marks all shares tied to that membership revoked, whether that membership was the sharer or recipient.
- List responses exclude revoked rows even after reactivation.
- An explicit owner Share action with a currently active pair clears revocation for that specific date/partner.
- Unchanged status/metadata updates preserve valid shares.
- Installation does not retroactively modify current shares. Private calendar data, invitations, profiles, memberships and existing triggers were not rewritten.
- Revoked rows remain stored internally until explicit owner removal or later retention work; revocation is loss of visibility, not a claim of physical erasure.

The first removal-based migration proposal was not applied (its tool confirmation expired). The applied repair uses revocation markers; the unexecuted proposal made no database changes.

Replaced the test runner's dependency on existing accounts with generated synthetic accounts and a separate connection. Expanded database checks passed for date-only payloads, idempotency, owner removal, expected-account/stranger denial, private-table denial, invalid/past dates and zones, expiry, departure and reactivation on either side, explicit re-sharing, stable metadata updates and unchanged private calendar entries. All test writes rolled back; fixture profile count afterward was zero.

[Applied repair](database/availability-membership-revocation.sql) · [Repeatable database checks](database/shared-availability-test.sql)

The security advisor introduced no additional warning category: 6 anonymous privileged-function warnings, 98 authenticated privileged-function warnings, 21 RLS informational findings, and disabled leaked-password protection remain part of the broader audit. This does not repeat or invalidate John's passed live share/remove walkthrough.

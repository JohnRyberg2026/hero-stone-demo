# Shared availability — November 2, 2026

Adds explicit, date-only sharing with a selected connected partner. The existing device-only calendar and private hearts are unchanged and never uploaded. Shared dates appear in a separate list after refresh/focus. No notifications, messages, invitations or acceptance occur.

Data API: `set_shared_availability` and `list_shared_availability` are security-invoker wrappers. Authenticated-only internal functions enforce `auth.uid()`, the expected account, active pair membership, ownership and membership-record identity. No client access to the internal table is granted; RLS is enabled with intentionally no policies as deny-by-default defense. Internal privileged functions use an empty search path. Only owner-authenticated deletion is possible, including after disconnection.

Dates expire from visibility at midnight in the sharer's browser timezone, validated against PostgreSQL timezone names. Past dates and dates beyond 366 days are rejected. Expired rows are retained internally; expiry means hidden, not physical erasure. Reads hide hearts if either saved membership is no longer active. Sharing is idempotent. Public calendar titles, private notes and conversations are absent from the data contract.

Verification: SQL rollback integration tests passed under authenticated role for both members, unknown user denial, expected-account mismatch, direct table denial, owner-only removal, duplicate writes, invalid/past dates and timezone validation, and expiry. Three browser-model tests passed for explicit-only payloads, account-change/in-flight clearing, expiry and calendar selection; existing calendar checks and eight conversation/handoff regressions passed. No full browser visual or live two-account UI walkthrough was performed for this new feature.

Security advisor review: the new private table produces an informational RLS-without-policy notice by design; direct access is revoked. The new public functions are invoker wrappers and not callable by anon. Existing unrelated project findings were not changed in this feature.

# Shared time and place

Accepted invitations have a Choose Our Time and Place action, also available in the reveal introduction. Either connected partner may propose a future date, time, IANA time zone, meeting place, and optional duration. The other partner must explicitly confirm. Either may clear a pending proposal or propose a replacement. Sharing occurs only on explicit submission; opening a form does not share.

The accepted invitation stays accepted. Pending details remain separate from the current plan. Confirmation updates the shared plan and increments its invitation revision, so older open pages cannot begin against obsolete details. Pending proposals block beginning, including older clients. A withdrawn replacement preserves the last confirmed plan. Started/completed moments cannot be rescheduled. These controls do not send email, SMS, or external calendar events.

The authenticated RPC checks expected account, invitation participation, active connection, accepted status, and proposal version under an invitation row lock. The public entry point uses invoker security; privileged implementation remains in the existing unexposed invitation schema with an empty search path. Clients have no direct table write access. No existing invitations were modified during deployment.

Validation: rollback-only database assertions cover both proposer roles, partner confirmation, self-confirmation refusal, unrelated/wrong accounts, stale versions, pending start guard, old invitation revision guard, past dates, clearing, and started immutability. Invitation UI checks cover explicit submission, proposal version, pending start control, and the existing invitation/start/finish/private-memory flows. Authenticated visual walkthrough is not automated.

Project-wide security advisor findings on older public functions and password protection remain part of the separate pilot access review; the new public RPC is authenticated-only and not security definer.

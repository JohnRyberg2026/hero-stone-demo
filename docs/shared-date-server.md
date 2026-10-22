# Shared-date server process — review candidate

## Status

The new SQL was executed and tested inside rollback-only transactions against the connected demo database on October 21, 2026. The successful test completed with `schema_absent = true`. No new schema, endpoint, verification record, fixture account or invitation remains installed. The existing pair-invitation API and the fictional rehearsal are unchanged.

This is an installation candidate, not an applied migration. Review before installation; keep the private schema out of Supabase’s exposed schema list. The table ACLs intentionally deny browser clients all direct access, with RLS enabled as defense in depth. The one public API is an invoker wrapper around a private authenticated operation. Internal privileged access is necessary for validating a shared roster without exposing other relationship/profile records.

## API

Call `shared_date_action` with `p_expected_user` equal to the current authenticated account ID. The server derives the actor from `auth.uid()` and rejects mismatches. Never pass a simulated actor from the rehearsal.

| Operation | Inputs in addition to expected account | Result |
| --- | --- | --- |
| create | payload, fresh request ID | Private organizer draft |
| list | none | Up to 50 dates in the caller’s current rosters; drafts only for their organizer |
| view | date ID | Current shared snapshot for an included person |
| send | date ID, expected revision, fresh request ID | Organizer accepts; invitees remain pending |
| respond | date ID, expected revision, payload with only `response`, fresh request ID | Caller’s response only |
| revise | date ID, expected revision, new payload, fresh request ID | New private draft; all responses reset |
| begin | date ID, expected revision, fresh request ID | Requires all included people to accept that version |
| stop | date ID, expected revision, fresh request ID | Any included participant can stop an underway date |

Create/revise payloads contain exactly `participants` (2–20 distinct account UUIDs including the organizer), `title`, `when` and `meeting`. Respond payloads contain only `response`: `accepted`, `declined`, `reschedule` or `withdrawn`. No private preferences, calendars, clothing details or intimate consent are accepted/copied. There are no WORLD QUEST adult-mode endpoints here.

Each write requires a request UUID. Retrying with the same account, request ID and exact arguments returns the current authorized snapshot without repeating the mutation. Reusing a request identity for different arguments fails. Responses always apply to the server-authenticated actor; there is no target respondent parameter. Date row locks serialize revisions, responses and begin/stop operations. This was verified through transaction/permission tests; simultaneous multi-connection stress testing has not been performed.

Drafts are visible only to the organizer. Sending discloses the reviewed plan and complete current roster to invitees before they decide. A decline/withdrawal closes the round; rescheduling requires revision. Removed participants cannot read the revised date or retrieve it by retrying an old successful request. Old revision rows remain private and are not exposed by the API; retention/deletion tooling is a later requirement.

## Adult eligibility

`hs_shared_dates.verified_adults` is empty on installation. Only a trusted server process or database administrator can write verification records; authenticated/anonymous clients cannot. No existing user is automatically enrolled. Do not backfill this table from the demo checkbox, `profiles.age_eligible` or user metadata. Those are not verification.

Positive consent operations require all participants to have a current, nonrevoked verification record and an active profile. Verification rows are locked during those checks. Integration with a real verification provider remains required before enabling live use. There is no intimate-content authorization in this API; accepting a date never consents to intimacy.

A person whose proof expires/is revoked, or whose connection ends, can still withdraw acceptance or stop an underway date. Their response returns only date identity, revision and state, without revealing the shared plan. An outsider gets no access. A person removed from the current roster loses access entirely.

## Existing relationship constraint

The live database has a unique index named `one_active_heart_stone_per_user`. Therefore PR #45’s selector is preparatory UI: it does not by itself enable multiple simultaneous underlying HEART STONE memberships.

These server tests use three fictional adult accounts in one shared HEART STONE connection and also test distinct two-person dates within that connection. The new code checks each invitee’s existing active connection with the organizer. It does not create connections or remove the legacy index. Supporting separate concurrent relationship connections across the whole app requires a dedicated migration and an audit of the existing creation, acceptance, resume, profile, history and memory paths. Removing the index alone would be unsafe because older functions/UI may assume a single active relationship.

## Verification and rollout

`shared-date-server-rollback-test.sql` combines installation and test fixtures in one transaction and rolls everything back. Run it with psql and `ON_ERROR_STOP=1` against a disposable/staging Supabase database. Test helpers use authenticated and anonymous roles, rather than checking only as database owner.

Coverage: direct table/helper denial; inability to self-verify; wrong expected account; create/send/accept retry behavior; outsider read/list denial; inability to answer for someone else; unanimity; revised invitation resets; stale revisions; removed participant and old-retry denial; revoked/expired proofs; expired connections; rescheduling; one-on-one dates; starting/stopping; RLS and role ACLs. Fake account creation invokes only the existing profile-creation trigger; no messages are sent.

The production security advisor was read after rollback. Its findings concern the existing schema, not this uninstalled candidate. New ACLs/RLS were verified in the transaction itself. After a reviewed installation, run the security advisor again against the installed schema.

Before release: install through the project’s normal migration workflow; configure trusted verification; complete the relationship constraint migration; add authenticated group UI transport (the current page is still a rehearsal); validate using separate devices/accounts; and obtain authorization to deploy. No live data should be copied from the rehearsal.

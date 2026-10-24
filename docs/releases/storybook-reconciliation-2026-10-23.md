# Living Story Book reconciliation — 23 October 2026

Status: review recommendation, not installation approval or a completed shared-book feature.

## Evidence reviewed

Read-only catalog inspection of the connected project covered the volume, entry and approval tables; their RLS flags, policies and SELECT privileges; the shared view options; four creation/approval/publication function bodies and EXECUTE grants; and enabled membership trigger definitions. No book, memory or account content was read. Repository searches found no calls to the inspected older Story Book APIs in tracked HTML/JavaScript; this is not proof that other clients never use them.

| Existing object | Observed behavior | Consequence |
| --- | --- | --- |
| `storybook_volumes` | Requires a relationship identity (`heart_stone_id`); enabled trigger checks active membership and rejects relationship reassignment | This is relationship storage, not an account-only personal book. Do not create a fake relationship for a personal book. |
| Entries and approvals | Enabled triggers resolve the parent relationship and require membership | Function-body authentication checks are only part of authorization; preserve the trigger boundary. |
| Core book tables | RLS enabled; no policies returned for the three inspected tables; neither anon nor authenticated has SELECT | Direct client reads are not currently an available integration path under these inspected grants. Do not broadly grant access to make a screen work. |
| `storybook_shared` | `security_invoker=true`; authenticated has SELECT; anon does not | Caller privileges on underlying relations still matter. The view grant alone does not prove it is usable. Validate with authorized fictional staging accounts. |
| Four inspected RPCs | SECURITY DEFINER; authenticated EXECUTE granted; anon EXECUTE denied; search path set to public | Review full dependency/trigger behavior in staging before adapting them. This subset is not a full function-security audit. |
| Publication | Checks active membership, ready state, valid finalization and current content fingerprint | Preserve these guards; existence does not establish unanimous participant publication consent. Do not activate publication in the personal-book slice. |

The inspected triggers call `require_active_heart_stone_member`, with an existing service-role branch. Their presence is evidence of a designed authorization boundary, not a substitute for negative tests against the full real baseline.

## Recommended integration contract

One application Story Book area should present separately authorized book scopes:

- **My personal books:** account-owned, private by default; twelve monthly chapters and user-written notes from the PR #56 candidate. A partner relationship is not required and grants no access.
- **Our relationship books:** preserve existing relationship IDs, source references, approvals, finalization and publication state. List/open only through an independently verified access path. Do not expose relationship books merely because the user opened a personal book.
- **Family/group/organization books:** remain unavailable until their membership, child/adult transitions, independent consent and sharing boundaries are implemented and tested. Do not reuse pair membership as group authorization.

These scopes may use separate storage adapters behind one application entry point. The reason for a separate personal store is the existing required relationship identity and different access/approval model. The recommendation does not yet approve permanent schema installation: first validate the existing reader and its permissions in staging and document the selected adapter contracts.

## No implicit transfer

Opening a book, accepting an invitation, ending an adventure, or belonging to a relationship never authorizes copying a private note. Existing invitation memories stay separate. A future copy flow must identify the source owner, exact text/date, destination scope and viewers, ask for action-specific approval, and record provenance without inventing memories. Shared contribution/publication requires its own approvals. No automatic backfill, migration, generated narrative, date rewriting or private-data merging is part of this recommendation.

## Required next checks

1. Reproduce older reader behavior with fictional member/nonmember accounts against a complete isolated baseline; review dependencies and view grants without widening them globally.
2. Test cross-relationship isolation, former-member access, approval identity and finalization invalidation; confirm what consent is actually required for publication.
3. Define one book-list interface that returns only verified accessible summaries, with scope and source explicit; backend failure must not masquerade as an empty saved library.
4. Keep existing books intact while the personal adapter is validated. Confirm original event dates, twelve monthly chapters, duplicate/retry behavior and account-change clearing.
5. Only then prepare recorded staging migrations and an end-to-end phone/computer demonstration. Production changes remain outside this checkpoint.

## Summary-reader review candidate

`database/storybook-relationship-reader.sql` proposes a narrow adapter for the older volumes. Its public wrapper does not elevate privileges; a private-schema function checks the authenticated/expected identity, active account and explicitly selected active relationship under row locks. It returns up to 100 summaries containing only ID, title, year, state, scope and relationship ID. It does not return entries, narrative, memories or approval records, change grants on existing tables, create books, transfer content or publish.

The CI-only test reproduces the observed caller-permission-view/base-grant mismatch using a minimal view fixture, then checks the candidate with active, unrelated, former-member, suspended, spoofed and anonymous identities. It is not a clone of all legacy tables/functions/triggers, and the candidate remains uninstalled. The development summary UI and account-scoped adapter are now implemented; full-baseline staging validation is still required. No policy widening is proposed.

## Approval review — shared contents remain blocked

A further read-only review inspected `storybook_volume_readiness`, `finalize_storybook_volume`, `set_storybook_entry_caption` and `storybook_content_fingerprint`, alongside the previously inspected approval/publication functions. No real content or approval rows were accessed and no functions were executed.

Observed in the inspected finalization path:

- `approve_storybook_entry` updates shared entry-level approval flags and inserts an actor approval record. The record does not contain a content fingerprint/revision in the inspected schema.
- `storybook_volume_readiness` checks review/inclusion state and generated-narrative approval flags. It does not join the per-person approval records or require each participant's approval of the current content. It does not test `title_approved` or `caption_approved`.
- `set_storybook_entry_caption` changes the caption and clears `caption_approved`; the inspected readiness expression does not use that cleared flag.
- Finalization invokes the readiness view and records a content fingerprint. Publication checks membership, state and that finalization fingerprint. Those checks protect against certain later content changes, but do not establish unanimous participant approval.
- The content fingerprint incorporates entry text and selected entry flags, but does not bind an exact participant roster and each person's action-specific approval to that version.

This is a demonstrated mismatch between the inspected code and the current product consent contract, not a claim that real books were exposed or published improperly. The full legacy system may have additional versioning paths; those must be mapped before replacing existing behavior. The app in this PR has no relationship-entry reader or publication control, so this work does not activate the older path.

Before enabling shared contents or publication, require a server-authoritative contract that binds exact content/source scope, original dates, participant roster, destination/viewer scope and action (contribution, inclusion, publication/export) to a version/fingerprint. Every required person must explicitly approve that same version for the relevant action. A material edit, participant/visibility change, withdrawal or eligibility/access change invalidates the relevant approval; silence is never consent. A private personal-book save is not one of these shared approvals.

Acceptance tests must include: one member's approval is insufficient; missing/declined/withdrawn approvals block; caption/title/source/date/roster/viewer edits invalidate; stale and concurrent approvals cannot authorize a newer version; finalization/publication cannot substitute a shared flag for participant approvals; inaccessible sources and unopened Time Capsules cannot be included. Preserve existing books and records while designing the new ledger/adapter. Do not backfill approval from membership or historic entry flags.


## Current handoff — 24 October

See `storybook-staging-plan-2026-10-24.md` for current scope, the catalog-only preflight findings and the full-baseline acceptance matrix. The consent ledger/publication guard, status UI and own-approval withdrawal are review candidates; their availability in source does not resolve the live legacy consent gap.

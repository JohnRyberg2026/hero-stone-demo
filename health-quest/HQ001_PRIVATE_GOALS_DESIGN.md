# HQ-001 — Private wellness goals (development design, not deployed)

Status: proposed design only. No production database migration or UI change.

## Scope
Reuse existing auth.users / public.profiles identity. Do not use public.memories or relationship-linked shared tables for health information. No partner, World Quest, Storybook, clinician, manufacturer, marketing or research access in HQ-001.

## Proposed storage
- `health_quest_goals`: UUID id, UUID owner_id (FK profiles.id), goal_text (bounded), optional pattern_note, status (active/paused/completed), followup_allowed boolean default false, created_at, updated_at, revision positive integer. Only store after explicit member approval; never infer approval from a model response.
- `health_quest_goal_events`: UUID id, UUID goal_id, UUID owner_id, event_type (created/corrected/paused/resumed/completed/followup_changed), timestamp, bounded change metadata. Append-only audit; avoid storing entire conversation transcripts.
- Treat correction as revisioned update with provenance, not silent replacement. Stop-followup action sets followup_allowed=false and is effective for all sessions.
- A separate deletion/retention design and member-accessible controls are required before any sensitive pilot data is accepted.

## Authorization invariants
1. RLS enabled for both tables; authenticated owner only: owner_id = (select auth.uid()) for SELECT/INSERT/UPDATE/DELETE as applicable. Event writes must verify the referenced goal belongs to the same owner. Deny anon.
2. Owner_id cannot be reassigned. Validate membership in auth.users through profiles; do not derive ownership from browser-supplied IDs.
3. The AI never writes directly. A validated, authenticated application action processes explicit consent and verifies persistence before claiming success.
4. Date Quest and World Quest cannot retrieve these records through shared context. Service-role access requires an explicit reviewed server authorization boundary.
5. Repeat action IDs should be idempotent; failed saves must not be described as successful.

## Acceptance checks
- Member approves saving a goal -> record persists; return visit on another device reads only their authorized goal.
- No permission -> no goal record.
- Member corrects afternoons to mornings -> current goal and event revision reflect correction.
- Member says stop asking -> followup_allowed false; no unsolicited health follow-up anywhere.
- A different authenticated member cannot select, update, or delete the goal or event; anonymous access fails.
- Date Quest cannot load or surface health goals without separate granular authorization.
- A failed or duplicate save cannot produce false confirmation or duplicate goals.
- Safety escalation is evaluated separately from goal storage; no diagnosis or automatic product recommendation.

## Implementation gate
Inspect existing SQL conventions and tests; create a proper migration through the repository's approved migration workflow; validate RLS with two distinct authenticated identities in a nonproduction environment. Do not deploy until reviewed. Existing Heartstone conversational handler is Date Quest-specific and should not be repurposed for health by prompt change alone.

# Integration baseline — 23 October 2026

Status: read-only project metadata review; installation and release remain blocked.

The connected project was inspected using catalog queries and migration listings only. No account rows, private memories, authentication credentials or book contents were read. No SQL installation, enrollment, invitation, merge or deployment was performed.

## Observed project state

| Area | Observation | Integration consequence |
| --- | --- | --- |
| PostgreSQL | Project reports 17.6; earlier disposable CI used 16 | CI now targets major version 17. This still does not recreate the complete Supabase environment. |
| Shared dates | `hs_shared_dates`, `hs_connection_internal`, `shared_date_action` and `shared_date_candidates` are absent | Browser/RPC candidates are not live features. Trusted adult verification and recorded staging installation remain prerequisites. |
| Connections | `public.one_active_heart_stone_per_user` exists | Multiple concurrent account connections are not enabled in the inspected database. Preserve the reviewed atomic dependency order in the earlier release handoff. |
| New personal books | `hs_storybook` and `storybook_draft_action` are absent | PR #56 personal-book account saving is not installed. Mock transport success is not evidence of live saves. |
| Adventure preferences | `public.adventure_preferences` is absent | New preference editor/review requires its reviewed schema and guards before live use. Existing profile fields are not a substitute. |
| Older Story Book | Relationship-linked `storybook_volumes`, `storybook_entries`, `storybook_entry_approvals` and memory/source/assembly objects exist | Reconcile the new personal-book path with this foundation before installing another permanent storage path. Do not replace, import or expose existing content implicitly. |

The migration list includes the August Living Story Book continuity foundation and later invitation begin/close/private-memory work. The latest listed migration at inspection was the October 22 account-wishes migration. Migration names establish installation history, not working UI, correct permissions or completed product behavior.

## Story Book reconciliation required

The existing annual volume has a required `heart_stone_id` and relationship-linked ownership; the new candidate is a private personal book owned by one account. These scopes are different. The existing entries include generated-narrative flags and approval fields, and there are approval records and finalization/publication functions. Their presence does not establish that these features are connected, safe to activate or compatible with the current no-synthetic-memory rules.

Before installation:

1. Review existing Story Book function bodies, grants, RLS and UI call sites in isolated staging; document what is actually used. This metadata review did not audit those permissions or read content.
2. Define personal versus relationship books explicitly. Retain private invitation memories as private; do not infer permission to copy them into a shared book.
3. Choose an adapter or an explicitly separate personal-book store with one coherent application entry point. Record why existing tables cannot safely support a personal book before making a second store permanent.
4. Preserve original event dates, twelve monthly chapters, provenance and explicit approvals. Existing generated text must never become an asserted real memory or be silently transferred.
5. Test separation, multiple relationships, account changes and existing annual volumes before any optional user-authorized transfer. Do not auto-migrate private content.

## Next integration checkpoint

A staging-ready package must account for the real baseline, enum/trigger/permission behavior and the older Story Book system, rather than only the minimal CI fixtures. Review and record the migration sequence; establish trusted adult verification; then validate separate-account phone/computer journeys. Pair and multi-adult lifecycle consolidation, full itinerary support and adventure recovery remain unfinished.

Current tests establish candidate behavior under documented fixtures. The two concurrency cases cover simultaneous acceptance and withdrawal-before-begin; they do not constitute comprehensive load or revocation-race testing. Nothing in this checkpoint authorizes production installation or publication.

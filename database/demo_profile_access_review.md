# Demo profile access review — October 16, 2026

Status: read-only live metadata review plus locally tested SQL drafts. Nothing applied to the live database.

## Findings and proposed restrictions

| Access path | Observed metadata | Draft behavior |
| --- | --- | --- |
| Six guarded demo entrypoints | Existing authenticated access; several also inherited PUBLIC execution | Requirement draft restricts execution to authenticated and checks both active members before guarded actions |
| `begin_alpha_quest`, `generate_recommendations_v2`, `accept_alpha_recommendation`, `choose_recommendation`, `compose_date_quest`, `create_wild_adventure` | Authenticated clients can call these alternate generation/activation paths | Access draft removes direct client execution; definer-owned internal calls remain possible |
| `recommendation_requests` | Member/creator INSERT policy plus broad table grants | Access draft removes direct client INSERT/UPDATE/DELETE and administrative privileges |
| `adventures` | Member UPDATE/DELETE policies plus broad table grants | Access draft removes direct client mutation; demo actions use guarded RPCs |
| `recommendations`, `adventure_steps` | Client SELECT policies plus broad table grants | Access draft keeps SELECT grants/RLS and removes direct client writes/admin privileges |
| `user_onboarding_answers` | Owner-only RLS for CRUD, but broad table grants | Access draft preserves authenticated CRUD, removes anon/PUBLIC grants and authenticated TRUNCATE/REFERENCES/TRIGGER |

RLS was enabled on all five reviewed tables. No separate column-level grants were found. Broad grants alone do not prove a row is accessible: RLS and function authorization also matter. The direct request-insert/adventure-update paths are relevant because their existing policies allow member mutations without the new requirement helper.

The current `index.html` uses SELECT for the four planning tables and performs their mutations through RPCs. This inspection supports the narrower client-permission proposal. Archived alpha/composer/Wild clients will lose these direct entrypoints and require a separately reviewed guarded API before re-enabling. This compatibility change is intentional in the draft and must be reviewed before deployment.

## Verification

`tests/profile-access-hardening.cjs` loads the isolated PostgreSQL fixtures and requirement draft, grants deliberately broad initial permissions, then applies the access draft. It verifies:

- Applying access restrictions without the prerequisite helper aborts.
- anon/authenticated cannot execute the six alternate paths.
- Direct INSERT/UPDATE/DELETE/TRUNCATE on all four planning tables is denied.
- SELECT grants remain intact; this does not replace testing actual production read policies.
- Owner-only profile CRUD still works; another person's rows remain inaccessible.
- The authenticated demo entrypoint still invokes its now-client-inaccessible internal dependency.
- A partner-only requirement still stops the guarded demo after hardening.

Legacy function bodies are represented by mutation-capable stubs for privilege tests; the six actual modified demo function definitions are exercised separately by `tests/profile-server-guard.cjs`. This is not a production-equivalent staging database.

## Still required before deployment

1. Freshly compare live RPC definitions, role memberships, policies, grants, and client dependencies with this review.
2. Review SELECT policies and read RPCs for private drafts versus shared invitation/adventure content. Keeping a SELECT grant does not certify the read surface.
3. Review other definer functions that write these tables and any omitted planner entrypoints.
4. Define concurrency and profile-change revalidation; the helper checks a statement-time view and does not serialize every profile edit with planning.
5. Test acceptance/reveal, decline/cancel/complete, history, and both-device behavior in staging with a reversible deployment/rollback plan and advisors.

Apply `demo_profile_requirements_guard.sql` before `demo_profile_access_hardening.sql` only after that review. These files are proposals, not applied migrations. WORLD QUEST and unrelated services are outside this change.

## Read restriction draft added

`demo_profile_read_privacy.sql` adds restrictive policies rather than replacing membership predicates. Requests are creator-only. Recommendations are visible to their request creator or, for other members, only when linked to a revealed sent demo adventure (or an existing active/completed non-demo adventure). Unchosen alternatives remain private. Unsent demo adventure rows are creator-only; sent envelope rows remain available to the recipient. Demo steps stay with their creator until reveal. `get_alpha_quest_state(uuid)` loses direct client execution because its definer body can otherwise return private drafts outside RLS; current main does not call it.

Local tests verify creator/recipient access before send, after send, after acceptance, and after reveal; an extra permissive recommendation policy does not bypass the restrictive filter. Inactive members, outsiders, and anonymous roles see no scoped rows. Completed/revealed shared material remains accessible to active participants rather than being treated as a private browsing draft.

Important remaining limit: RLS controls rows, not individual columns. A sent adventure row still includes its existing title/source fields before reveal. This draft protects private browsing, unchosen recommendations, and unrevealed step rows; it does not certify cinematic surprise secrecy. That requires a separate sanitized envelope API or column/view design, reconciled with the ongoing invitation/story design. Read RPCs beyond the inspected state/history functions and all cross-product surfaces still require review. No live policies or data were changed.

The read-only index inspection found primary-key indexes for request/adventure lookups and an existing unique partial index on `adventures.source_recommendation_id`. These support the new policy joins. The policies wrap `auth.uid()` in scalar subqueries. No production query benchmarks were run; broader read/list performance remains a staging check.

## Concurrency draft added

`demo_profile_concurrency.sql` adds transaction-held parent-row locks. Protected planning actions first lock the HEART STONE row, reread active membership, then lock both existing profile rows in UUID order before reading requirements. Missing parents/membership fail closed. A volatile function performs a separate fresh READ COMMITTED query after any lock wait. Non-READ-COMMITTED transactions are rejected with a generic retry code rather than accepting an older snapshot.

BEFORE triggers on account-profile answer INSERT/UPDATE/DELETE lock the corresponding existing profile parents; membership INSERT/UPDATE/DELETE lock existing couple parents. Locks stay held to commit/rollback. Ordinary first-journey answer keys are outside the account-profile trigger scope. Missing parent rows are tolerated by edit triggers during deletion cascades, while planning requires both parents. Trigger helpers remain internal with no client execute privilege.

This serializes participating edits with each protected action. An edit committed first is seen by the post-lock requirement read; an action acquiring locks first completes before the edit. Subsequent acceptance/reveal actions recheck. It does not retroactively cancel an already committed action or implement ongoing-adventure adaptation.

The local PGlite suite verifies SQL/trigger installation, transaction-held relation locks from planning/answer edits/membership edits, fresh sequential requirement rechecks, missing/inactive parents, and stale-isolation rejection. This is not a simultaneous-session contention test: PGlite uses one backend. A separate native PostgreSQL test server could not be initialized because this host disallows switching to the non-root user PostgreSQL requires. Real two-session blocking/deadlock/timeout tests remain required in staging, including account-deletion cascades, batch administrative edits, and interactions with existing adventure/learning triggers. No production locking behavior is claimed verified, and no live changes were made.

## Combined-draft verification

`profile_guard_bundle.json` records the four draft files in prerequisite order and explicitly marks them not deployed. The integration test loads all four into one isolated PostgreSQL database with existing membership RLS/CRUD permissions represented, then runs both-member flows using the actual modified demo RPC definitions. It verifies private browsing, a saved partner edit blocking a pre-existing recommendation's proposal, a later edit blocking acceptance while decline remains available, a post-acceptance edit blocking reveal, then successful reveal with only the chosen recommendation visible to the recipient. Direct write/old-read RPC denials and outsider/anonymous isolation remain in force together.

`tests/fixtures/profile-bundle-schema.sql` supplements the small server fixture. The underlying alpha generation dependency and old alternate endpoints are stubs, and recommendations are pre-seeded: this test verifies guard/access/privacy/lock integration, not production candidate generation, PostgREST, independent concurrent sessions, or two-device UI synchronization. The manifest is documentation/test input; it is not an automatic deployment command. Ten local suites now run; staging and real-account validation remain the next verification gate.

## Read-only baseline preflight

`profile_guard_preflight.sql` checks catalog metadata only. It compares normalized hashes of the six demo function bodies with the inspected baseline, checks required column names and RLS on five scoped tables, and reports whether the internal guard is already present. It never reads account rows or applies DDL, and always returns `deployment_ready: false` with outstanding gates. The bundle manifest points to this query but does not execute it.

The read-only live check on October 16 passed all six function comparisons, found all required columns, and found RLS enabled on all five tables; the draft helper was absent. Nothing was applied. Rerun immediately before any future deployment: this recorded result can become stale. The query does not verify every column type/constraint, policy body, privilege/role inheritance, dependency, trigger interaction, or candidate engine. Those remain staging/review checks.

The eleventh local test deliberately changes a function, disables RLS, removes a required column, and simulates a partial installation, confirming each is detected without user-data writes. `scripts/build-profile-preflight.py` regenerates the SQL fingerprints from the reviewed repository fixture only; do not regenerate the baseline automatically from a live target to make a mismatch disappear. A changed baseline requires reviewing/reconciling the function change first.

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

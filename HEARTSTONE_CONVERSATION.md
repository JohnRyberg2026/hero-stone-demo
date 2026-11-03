# Heart Stone conversational pilot

Builds on PR #61. Adds typed AI conversation, avatar activity states, and a reviewed invitation handoff. The original Plan / Reconnect / Continue paths remain available. The preview explains that sign-in is required; it does not simulate AI replies.

## Activation

Deploy `supabase/functions/heartstone-conversation/index.ts` with JWT verification enabled. Configure secrets in the Supabase dashboard, never in repository/browser files:

- `OPENAI_API_KEY`: a project key with a spending limit.
- `HEARTSTONE_MODEL`: an available Responses model supporting structured outputs.
- `HEARTSTONE_PILOT_USER_IDS`: comma-separated authenticated pilot UUIDs.
- `HEARTSTONE_ALLOWED_ORIGINS`: exact origins, e.g. `https://johnryberg2026.github.io`. Add an explicit local origin only for development.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are runtime-provided. The service-role key is used only server-side for the quota reservation RPC.

No new database tables, partner lookups, or send permissions. Auth is validated server-side with `/auth/v1/user`. The pilot allowlist is mandatory; missing configuration fails closed. Configure provider budget limits before enabling. The pilot now also has distributed per-account usage reservations: 6 requests per rolling minute and 100 per UTC day, before OpenAI. It remains restricted to the existing pilot allowlist. See CONVERSATION_USAGE_LIMITS.md; request limits do not replace provider spending controls.

The browser keeps at most nine exchanges in memory. OpenAI receives the current session transcript; requests set `store: false`, which disables Responses storage but does not promise zero provider retention. No transcript logging is implemented. End/clear, account/connection changes and leaving the page clear the UI. In-flight requests may finish server-side after clearing; stale results are discarded.

Only the explicitly reviewed draft moves via same-tab sessionStorage. It expires after ten minutes, is removed from storage when opened, and is checked against the signed-in account before display and application. The conversation never enters the URL or saved invitation. Existing wording replacement still requires confirmation. Applying wording does not save/send an invitation or select a recipient.

## Verification

Run `node --test tests/heartstone-conversation.test.mjs`, existing date/invitation checks and browser pilot checks. Automated tests use mocked Auth/OpenAI responses; they do not establish actual model behavior or account credentials.

Before release: configure secrets, deploy the function, make one authenticated live response, then walk through John and Jessica's accounts to review, send and respond to an invitation. Review generated wording for tone, privacy, pressure, invented facts and unsafe reconnection suggestions. Voice and long-term preference learning are outside this change.

Current verification: eight server/handoff tests and the existing date-entry, date-home and invitation-store-plan checks passed. Browser test is written but not run successfully: Chromium is absent, and its installation download returned truncated archives. Historical implementation-time status: live activation had not yet been performed when this paragraph was first written. Superseded by HEARTSTONE_TEST_CHECKPOINT.md: the function was subsequently deployed, live AI responses succeeded, and John/Jessica completed the real send/accept round trip. Browser automation remains unavailable; do not confuse that limit with the completed manual pilot.

The usage counter is server-only and contains no conversation text. Limiter schema must be deployed before the updated Edge Function. The browser handles quota cooldown without discarding typed words.

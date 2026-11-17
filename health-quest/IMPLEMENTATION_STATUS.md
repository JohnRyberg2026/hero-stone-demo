# Health Quest private records — development milestone

November 11, 2026. Development only; no hosted database or live app changes.

Implemented an additive migration for account-owned goals and observations,
plus a Supabase client adapter requiring approval and the expected signed-in
account. The existing conversation handler and shared Quest tables are unchanged.

Database behavior: owner-only RLS; immutable ownership/kind; revision checks;
action IDs for retry protection; metadata-only audit events; planned versus
reported state; optional follow-up; deletion clears text, time and follow-up,
retaining an empty tombstone to prevent stale restoration.

Verification uses PGlite's actual PostgreSQL engine with fictional identities,
including disk persistence and database restart. This is not a hosted Supabase
Auth, PostgREST, browser or cross-device test. Bootstrap auth.uid() is a local
test substitute. Run `npm ci --prefix health-quest` then
`npm test --prefix health-quest`.

The audit trigger is a narrow SECURITY DEFINER function in an unexposed schema;
direct execution and audit-table access are revoked. The save RPC uses SECURITY
INVOKER and owner RLS. Authenticated direct table writes remain possible under
RLS; explicit approval is an application requirement, not proof of human intent
that SQL can independently establish. Never give the model database credentials
or treat generated text as approval.

Deletion removes current health text, not provider backups or existing profile
documents. Production retention terms and member-facing export/deletion controls
must be completed before sensitive pilot ingestion. No real member data is
included in this repository or test suite.

Next: connect a development-only member interface using existing authentication;
test goals, observations, correction, stop-follow-up, export and deletion with
two real nonproduction accounts. Run hosted security advisors and test PostgREST
permissions before deployment. This change is a storage foundation, not a
completed private profile, conversational integration or live pilot.

## Member screen milestone — November 11, 2026

Added `health-quest/member.html` and an account-bound controller using the storage
adapter. Supports new goals/observations, planned/reported status, explicit review,
correction, follow-up preference removal, confirmed deletion and private JSON
export. Auth changes clear displayed notes, drafts and pending review; stale
asynchronous responses cannot render after sign-out. Saved text uses textContent.
No chat/model integration or automated follow-up is included yet.

The development configuration is deliberately null. Configure only an isolated
test project's URL and publishable key in a development checkout; this screen
must not silently connect to production. Existing home navigation is unchanged
until the test backend and account journey are verified.

Validation: 28 Health Quest checks pass (PostgreSQL/PGlite storage and jsdom UI
behavior); 12 existing conversation regression checks pass. UI tests use a fake
transport. Hosted Supabase Auth/PostgREST, browser rendering, voice input, real
account continuity and cross-device behavior remain unverified. No production
migration, deployment or real profile import was performed.

Next: provision or select an isolated nonproduction Supabase environment, apply
the reviewed migration there, connect the screen, and exercise two test accounts
through sign-in, save, correction, sign-out, return and account isolation. Then
add the approved conversational entry path and import John's reviewed profile
privately. Do not put his profile into this public repository.

## Connected fictional working model — November 13, 2026

Latest scope reconciled with Nov 12 target-build and store notes, and subsequent
phone direction: test-only model; assume sample formulas and prices completed;
no real orders/payments. Physician view is included; exercise/meals remain later.

Added model.html plus a pure calculation/workflow engine and UI. Demonstrates
30 days × 3 smoothies, 90 servings / 504g / 18 sample 28g packs; illustrative
ingredient amounts; rotating midday themes; $120 standard vs $98 bundle; member
approval of exact proposal; optional selected physician summary and revocation;
attributed demo recommendations; member acceptance for recalculation; renewed
approval; exact-version production review; shared sample product cart; fulfillment
payment rules; immutable simulated order snapshots and duplicate-submit handling.
All roles are simulated in one browser, not authenticated authorization boundaries.
Sample role sharing is not a substitute for production RLS/permissions tests.

The browser walkthrough verified plan creation, budget revision, optional formula
sharing while goals stayed private, physician recommendation, recalculation with
active plan unchanged until approval, production review, plan plus standard
product checkout, and order retrieval after reload. No real personal information
was entered. Sample tax/shipping are fixed demonstrations, not service quotes.
No Square setup was inspected or connected: the repo search found no integration
in the inspected storefront files, and no Square connector was exposed.

40 Health Quest automated checks and 12 conversation regression checks pass.
Sample persistence is browser localStorage, separate from private-record backend;
do not enter private health data. Browser storage failures are visible and do not
silently adopt unsaved state. Formula themes use the same illustrative mix, not
actual sellable recipes or measured nutrient totals.

Open model.html through `npm run dev --prefix health-quest`, or generate/open the
self-contained working-model.html with `node health-quest/build-model.mjs`.
The standalone copy contains no external scripts, network APIs or payment calls.

Next work: editable sample formula/ingredient catalog and stronger end-to-end
formulation revisions; then connect nonproduction identity/private persistence
and actual member/physician/manufacturer permissions. Real catalog readiness,
Square sandbox, packed UPS quotes, support and production policies remain launch
requirements. The shared Heartstone AI is not completed by this demo.

## Editable sample formula milestone — November 13, 2026

Added a seven-ingredient sample formula editor with milligram-precision storage.
Edits recalculate serving weight, total ingredient grams, 28g package count and
leftover. Revisions copy the latest proposal rather than reverting to an older
active plan; budget and physician schedule revisions preserve ingredient edits.
Existing approvals and order snapshots remain unchanged. A revised formula needs
member approval and new demo production review before simulated ordering.
Retail sample pricing remains fixed; this is not an ingredient-cost calculator.
43 Health Quest checks pass, including formula validation and UI recalculation.
No backend, production recipe, physician permission or payment changes.

## Sample production-cost milestone — November 13, 2026

Added editable hypothetical ingredient prices per kilogram, bag cost, labor and
overhead. Calculation uses integer milligrams/cents and BigInt intermediate
arithmetic, rounding once at the ingredient subtotal. Ingredient cost covers
full filled packages including leftover supply. Production cost is separate
from fixed demo retail price; difference excludes unentered costs and is not
labeled net profit. Cost revisions preserve original versions and require fresh
member approval/production review. Existing saved plans use explicit sample
cost defaults. No supplier price lookup or real cost claims.
46 Health Quest checks pass, including full-package costing and UI cost edits.

## Simulated order fulfillment — November 13, 2026

Added fulfillment-specific order transitions, separate simulated payment
collection, timestamped per-order history, stale-status rejection and idempotent
action references. Pickup uses preparing -> arrival at location -> handover;
delivery uses preparing -> out for delivery -> handover; shipping uses preparing
-> carrier handoff -> completion. Preparation never marks payment as collected.
Completion requires simulated payment. No real notifications, charges, carrier
updates or deliveries occur. Existing order item/version/price snapshots stay
unchanged. 50 Health Quest checks pass, including UI fulfillment controls.

## Reported daily use — November 13, 2026

Added My daily use for the fictional month: taken, skipped and unrecorded states
per day/slot. Plans never count as consumption. Corrections replace the current
report and retain timestamped history; repeated action IDs do not duplicate use.
Reports retain the formula version/serving weight originally recorded, including
when correcting an older slot after a plan revision. Totals count only taken
entries; skipped entries never generate catch-up servings. Browser-only sample
data; no real health-data ingestion or nutrition estimates. 53 checks pass.

## Supply estimates — November 13, 2026

Added supply summary under My daily use. Completed simulated plan orders add
full packaged grams; orders in progress remain pending. Reported consumption
subtracts only from its ingredient mix; identical mixes pool across cost/pricing
versions and changed mixes remain separate. Corrections recalculate the balance.
Negative balances explicitly identify missing supply records instead of hiding
them. Estimates exclude unreported use, waste and outside purchases. No automatic
refill, purchase, actual inventory guarantee or production integration. 56 Health
Quest checks pass.

## Sample refill proposals — November 13, 2026

Added explicit refill proposals for another full active-plan period, deducting
estimated available identical-formula supply and rounding shortfall to 28g packs.
Pending matching orders block another proposal; negative supply requires record
correction. Zero shortfall does not create a cart item. Member explicitly adds
refill to cart and still submits checkout separately. Sample price is proportional
to filled grams, clearly separate from real package pricing. Refill order snapshots
store actual refill grams; fulfillment adds only that quantity. Checkout rejects
refills if supply changed since proposal. 60 Health Quest checks pass.

## Physician ingredient-change proposals — November 13, 2026

Extended demo physician recommendations to seven ingredient amounts plus daily
schedule and required authored reason. Stored recommendations preserve exact
mix, source version, author and time. Acceptance creates recalculated proposal;
it never directly changes active plan. Renewed member approval and exact-version
production review are required before ordering. Validation rejects invalid mixes
and blank reasons; member view shows proposed amounts. This remains a simulated
role workflow without clinician authentication or actual clinical recommendations.
63 Health Quest checks pass.

## Contact a Person simulation — November 13, 2026

Added message review and optional minimal order summary, reference/status and
local demo-team replies. No automatic goals/formula/journal/transcript attachments.
Exact reviewed order summaries are rechecked before submission; duplicate action
references do not create duplicate requests. Local receipt explicitly does not
claim delivery to staff, live monitoring or response-time commitments. There is
no outbound messaging integration. 66 Health Quest checks pass.

## Sample ingredient exclusions — November 13, 2026

Added optional seven-ingredient exclusions to member request intake. Conflicts
are visible and block member approval, production review, custom plan checkout
and refill preparation. Setting an excluded ingredient to zero creates a new
version that can be reviewed without rewriting earlier records. This covers
only named sample ingredients, not cross-contact, medications, contraindications
or individualized medical suitability. Standard-store product exclusion checks
are not implemented. 69 Health Quest checks pass.

## Before-and-after proposal review — November 13, 2026

Added current versus proposed comparison for plan length, daily servings,
ingredient grams, serving weight, monthly powder, package quantities, sample
selling price and production-cost total. Shows source/version and reinforces
that active plan is unchanged until approval. Comparison clears after approval;
no clinical benefit or suitability inference. 72 Health Quest checks pass.

## Printable approved summary — November 13, 2026

Added member-reviewed approved-plan summary and browser print control. Uses exact
active version even when a newer proposal exists. Goals and aggregate reported
use are opt-in; production costs, support and conversations are excluded. Changing
options or model state invalidates the preview before printing. Print stylesheet
isolates the summary; no outbound sharing occurs. Browser print/PDF dialog itself
has not been visually tested. 74 Health Quest automated checks pass.

## Hosted integration preparation and blocker — November 13, 2026

Read-only connected inventory showed only live Heartstone and default main.
Attempted isolated branch creation; Supabase returned Pro-plan requirement.
No branch created, charges accepted, plan upgrade or live schema changes.
Prepared dedicated-project/two-account integration runner with live-target and
secret-key refusal, ephemeral SDK sessions and fictional test data cleanup.
77 local checks passed. Runner's unconfigured execution stopped before network
access; hosted integration remains unexecuted. Details: HOSTED_INTEGRATION.md.
Dedicated test backend and test-account credentials are required to proceed.

## Isolated test backend created — November 13, 2026

User delegated organization choice; used “the Heartstone.” Supabase quoted $0/month
and created Health Quest Test, separate from live project. Applied minimal test
identity schema and private-record migration. Hosted SQL verified RLS/grants;
actual unauthenticated API read returned 401/42501. Development config now targets
test backend. No real profiles/accounts, messages or production changes. Security
advisor only intentional default-deny audit INFO. Two authenticated fictional
accounts and test sign-in entry remain before the hosted integration runner can
verify cross-account save/correct/return. See TEST_ENVIRONMENT.md.

## Test sign-in entry — November 13, 2026

Connected development member page to an existing-account test sign-in controller,
sign-out, session restoration and authenticated owner-only profile-row preparation.
Private workspace clears on sign-out/account changes; password field clears on
submission and raw auth errors are not rendered. Hosted runner also prepares
owner profile rows. 80 local checks pass. Auth-user creation is not exposed by
the connector; two test users remain a concrete prerequisite before running the
hosted two-account journey. No invitation, email or real profile import occurred.

## Private plan storage — November 13, 2026

Installed `20261113213149_health_quest_private_plans.sql` in **Health Quest Test only**. Owner-scoped immutable proposal versions and separate exact-version approvals preserve previously approved plans. Expected versions reject stale proposals; action IDs support safe retries. The account-bound `private-plans.mjs` adapter checks the signed-in user before and after operations.

Validation: 18 local PostgreSQL/adapter tests passed for RLS separation, anonymous denial, immutable records, explicit approval, latest-proposal checks, stale versions, invalid mass, and retries. Hosted migration succeeded. No member plan data was created. Plan screen wiring and authenticated hosted plan testing remain next. This is fictional sample-plan storage, with no production, clinician, payment or clinical validation authority. Retention/deletion controls remain required before real health plan use.

## Private plan screen connected — November 16, 2026

The test member page now mounts an account-bound sample-plan screen beside private notes. Members review the exact seven-ingredient proposal before saving, reload saved versions, and separately review/approve the latest saved version. A later proposal preserves the prior approval. Sign-out/account changes clear the plan screen; failed saves retain the review and do not claim success. The downloadable test page was rebuilt.

Validation: all 101 local tests pass, including three new screen journeys covering save/return/approval/revision, failed writes, and account switching, alongside the existing PostgreSQL RLS/version checks. Authenticated hosted plan-screen testing with the two existing test accounts is still pending. No live deployment, payment integration, clinician clearance, or manufacturer permission implementation is claimed. John-only pilot blend clearance remains a launch requirement; purchase is unavailable here. This screen approves fictional sample contents only, not price/directions/bag quantities for an order.

Next: open the refreshed test-signin.html, sign in with existing test account A, save and approve a fictional sample plan, reload, then verify account B has none. Continue with server-enforced John review and exact order terms after hosted verification.

## Screen-to-PostgreSQL verification — November 16, 2026

Added a joined test that drives the actual plan screen through the account-bound storage adapter into PostgreSQL RPCs/RLS. Verified committed-save/lost-response retry without duplication, restored proposal and exact approval, stale second-tab rejection, preserved approved formula beside a newer proposal, visible account-switch clearing, account B denial, and account A return. All 107 local tests pass. This local PostgreSQL verification does not substitute for authenticated hosted/browser verification.

Plan summaries now display readable ingredient amounts, serving count and total grams for both latest proposal and approved version; approval no longer exposes raw JSON. Clear/reset unlocks the screen, and restored browser pages reload private data. Hosted two-account plan check remains pending; production/purchase remains unavailable.

## Exact-version review requests — November 16, 2026

Added member preview/confirmation of a request for John’s review, plus confirmed withdrawal. The owner-only append-only request history references an immutable plan version without copying private notes. The server requires the latest proposal and exact-version member approval for a new request. Action IDs permit retries after a committed request loses its response; revisions reject stale changes. Permitted request states are only requested/withdrawn, so members cannot forge clearance. No reviewer access policy, notification, email, purchase authority or production clearance is granted by this milestone.

Installed `20261116203344_health_quest_review_requests.sql` in Health Quest Test only. Hosted inspection confirms RLS enabled, anonymous reads denied, member updates denied and zero request rows created by this work. All 109 local tests passed, including the connected PostgreSQL screen journey for request preview, uncertain-response retry, withdrawal/reload, invalid clearance, immutable history, outdated/unapproved versions and account isolation. Rebuilt test-signin.html.

Hosted authenticated plan/request browser verification is still pending. John’s secure reviewer identity and portal are not yet connected: UI explicitly says a request is recorded privately, not delivered or cleared. Connecting a reviewer must restrict access to member-authorized exact versions, honor withdrawal and current-version checks, and preserve John-only pilot authority. A pending request on an older version must never clear a newer version. Purchase stays unavailable until review and exact order terms are implemented.

Security advisor: no new findings from this migration. Existing internal audit table deliberately has no client policy (default deny). Existing test Auth leaked-password protection is disabled; address before real-member launch: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .


## Hosted member verification and reviewer workspace — November 17, 2026

John’s guided browser screenshots confirm saved sample proposal v1, exact-version approval, recorded review request, page reload, separate account C with no saved notes/plans, and return to the original account with approval/request preserved. Account C was created after forgotten test credentials blocked B. This verifies the guided member journey; it is not a full adversarial hosted authorization audit.

Built an authenticated reviewer workspace in the bundled test page. A single server-managed reviewer slot represents John’s pilot authority and is intentionally unassigned until John identifies his reviewer account. No browser may self-assign it. Narrow internal security-definer functions authenticate the assigned reviewer and expose only currently requested, member-approved latest plan versions. They exclude private notes and unrelated plan history. All privileged helpers use an empty search_path, explicit auth/allowlist checks, and revoked default execute grants. Public wrappers run as invoker. Client writes to decisions and role assignment are denied.

Reviewer decisions are immutable and attributed, with a required reason and explicit preview/confirmation. They bind owner, plan, version and request revision. New proposal/withdrawal checks share the plan advisory lock with member operations. Renewed requests do not inherit older decisions; retries use action IDs. Sample review clearance is not professional clearance, price/quantity/direction approval, payment, purchase permission or production release. A held review can be followed by a withdrawn/new member request; existing decisions cannot be silently edited.

Validation: 124 local tests passed, including 15 reviewer tests spanning UI + PostgreSQL, non-reviewer denial, no self-assignment, no private-note exposure, exact confirmation/reason, immutable history, retries, withdrawal, stale versions, renewed consent, account clearing, role revocation and anonymous denial. After adding explicit default-deny role policy, the 15 reviewer checks passed again. Installed `20261117122104_health_quest_reviewer.sql` in Health Quest Test only. Hosted verification shows 0 assigned reviewers, anonymous queue denied, direct authenticated decision inserts denied, 0 decisions. No real member plan or credential was changed. Hosted reviewer sign-in remains untested until assignment.

Security advisor has no new findings. The existing test Auth leaked-password-protection warning remains a launch prerequisite: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Internal note audit has intentionally no client policy. Production Heartstone unchanged.

Resume: identify which test account is John’s reviewer identity, assign only that account server-side, download the updated test page from GitHub, and run the hosted review/withdrawal/version checks. Member-facing review-result presentation and exact purchase/production gating remain to build; old member text says portal not connected until activation. Restore included latest saved review-request sources after discovering the local workspace snapshot was older than GitHub.

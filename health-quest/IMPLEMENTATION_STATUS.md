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

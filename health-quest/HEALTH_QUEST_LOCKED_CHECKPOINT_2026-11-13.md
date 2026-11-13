# Health Quest — locked checkpoint and resume point

Locked at John Ryberg's request, November 13, 2026 (Eastern).
This records the existing build and its limits. It does not make test data
production-ready or imply deployment. No further feature work in this pause turn.

## Current conclusion

Health Quest has a connected fictional working model plus a separately tested
private-record storage foundation. It is ready for a structured prototype review,
not a real-member launch. The principal next milestone is connecting identity,
persistent records and permission-separated roles in nonproduction, rather than
continuing to add optional demonstration features.

One Heartstone identity/assistant will bridge Health Quest, Date Quest and World
Quest. Shared Heartstone AI completion is outside this milestone. Health Quest
remains centered on personalized Targeted Wellness and a shared full-product
store. Physician collaboration belongs in the initial release. Exercise, Meals,
Bucket List, expanded animation and scenery remain later scope.

## Frozen source and artifact

- Repository: JohnRyberg2026/hero-stone-demo.
- Development branch: health-quest-hq001-private-goals.
- Last functional source commit: 0178a68b5a671d3008df4476115aec4c16edf8f4.
- Working model: health-quest/working-model.html.
- Artifact SHA-256: 9bfe26d5319b9c4a3990f0ea841ba91b441be173b3e3957656aed0e0c0261425.
- Source: model.html, model.mjs, model-ui.mjs; rebuild with build-model.mjs.
- Existing live main branch and hosted database were not changed by this build.
- “Locked” means a documented baseline, not a technical branch-protection setting.

## Built in the fictional model

1. Member request, budget and seven sample ingredient exclusions.
2. Thirty-day example with three daily smoothies, monthly theme rotation,
   ingredient totals, serving weight, package quantities and leftover calculations.
3. Editable seven-ingredient example formula and versioned changes.
4. $120 standard / $98 bundle sample pricing; editable ingredient, packaging,
   labor and overhead costs kept separate from selling price.
5. Current/proposed comparison and exact-version member approval.
6. Optional formula/goals sharing in a simulated physician view; attributed,
   dated ingredient/schedule recommendations and member acceptance or decline.
7. Recalculated proposals require renewed member approval and production review.
8. Six sample store departments; shared sample cart with standard items and plans.
9. Pickup/deferred payment, delivery/member-vs-guest fee and prepaid-shipping
   demonstration; fixed sample tax/shipping, no service quotes.
10. Simulated orders, immutable item/version/price snapshots, independent payment
    collection, fulfillment paths, timestamped history and duplicate handling.
11. Taken/skipped/unknown daily-use entries, corrections, version-linked grams.
12. Completed-order supply, pending supply, recipe-specific balances and explicit
    refill proposals; no silent reorders or catch-up servings.
13. Reviewed support messages, optional minimal order summaries, local sample
    receipt/replies; no actual staff contact.
14. Approved-plan summary with optional goals/use totals and browser printing.
15. Browser-local persistence with visible write failures. Reload continuity
    tested. This is separate from authenticated private backend storage.

## Separate private-record foundation

Migration, Supabase client adapter and development member screen implement/test
owner-only records, approvals at application boundary, corrections, revision
checks, action IDs, metadata audit, tombstone deletion, account changes and export.
PGlite tests use PostgreSQL with fictional auth identities, not hosted Supabase
Auth/PostgREST. Development config remains null; it is not connected to the live
app. John's real profile has not been imported into this model. Do not put his
profile or real health information in this public repository or local demo.

## Validation evidence and limits

- Most recent unchanged-source run: 74 Health Quest automated checks passed.
- Existing conversation regression suite: 12 passed at the connected-model stage;
  conversation code unchanged since that run. Not a new rerun in this lock turn.
- Earlier actual browser walkthrough: create plan, budget revision, optional
  formula-only sharing, physician schedule recommendation, exact approval,
  production review, mixed cart checkout, order survives reload.
- Later additions have engine/DOM tests; not all have been visually checked.
  Phone layouts and browser print/PDF require visual verification.
- Tests are local logic, DOM and PostgreSQL-engine checks. They do not establish
  secure deployed roles, cross-device reliability or launch readiness.

## Outstanding before a real invited pilot

1. Select/provision an isolated test backend; inspect current source/schema first.
   Reuse Heartstone sign-in and add the agreed Health Quest entry/navigation.
2. Persist profiles, formula versions, approvals, sharing grants, physician
   recommendations, production review, cart/orders, journal and support in the
   backend with proper account/role isolation, audit and failure handling.
   Current private-record migration covers goals/observations only.
3. Test separate member, physician and manufacturer accounts, selected sharing,
   revocation, cross-device return, duplicates and stale concurrent changes.
   Tabs in the model are NOT authorization boundaries.
4. Load actual approved catalog/recipes, ingredient specifications, directions,
   prices and availability. Current theme formulas use one illustrative base,
   not the full Garden catalog. Nutrient totals, ingredient overlap, medication
   checks and real suitability review are not implemented. Exclusions are
   limited to seven sample ingredients; standard store checks are incomplete.
5. Integrate Square sandbox and verified payment confirmation; carrier quotes
   from packed weights/dimensions; configured pickup/local-delivery eligibility.
   Inspect actual Square setup rather than assuming it is complete.
6. Connect authorized human support delivery/status and actual fulfillment
   updates; final retention/deletion/export and operating policies.
7. Run the whole private pilot journey on phone with John's reviewed profile,
   then a small invited group. Import real data only after privacy checks.

Further gaps: recurring real-calendar/month rollover, robust sample backup/import,
production catalog administration, actual invitation delivery, verified educational
content in Secret Neighborhood Garden, real AI conversation-to-action integration.
These must not be described as implemented merely because sample screens exist.

## Exact resume point

Begin with this checkpoint and inspect current repository/backend. Keep the
functional model frozen as a reference. Implement the smallest nonproduction
vertical path using existing Heartstone identity: member sign-in -> private
approved plan -> save correction -> sign out/return on another session -> verify
account isolation. Then extend that same persistence/permission structure to
physician recommendation -> member approval -> manufacturer review. Preserve
existing Date Quest and World Quest behavior. Do not restart intake/design,
complete the shared Heartstone AI first, or keep adding optional demo features
as a substitute for connecting the platform.

No invitation, payment, message to staff/physician, live order, production batch,
public deployment, new account or live database migration occurred in this lock
turn. Pause here until John asks to resume.

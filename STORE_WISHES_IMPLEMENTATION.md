# Store wishes — first implementation

Implements the device-demo portion of the approved Browse → Save → Plan path.
- Existing clothing and local business cards can save to a common list.
- Personal wants, partner ideas and proposed bucket-list entries have category, connection note, preference, favorites and personal notes.
- Custom destinations and experiences can be added without a listing.
- Explicit device saves restore after refresh; entries support search, filtering, edit, source link, removal and undo.
- Plan From This adds the wish to the existing editable date draft, with unknown costs and unchecked provider details. Personal wish notes are not copied into the draft/invitation.
- Clothing catalog cards use name-only presentation; intimate guide remains display-only.

## Boundaries and outstanding work
This is a device demo, not account-protected storage. Connection names are organizational notes, not verified recipients or sharing grants. It does not implement partner wish access, account sync, or cross-device persistence. The UI states these limitations. No booking, purchase or invitation is automatically executed.

Before the full locked acceptance journey is complete, implement authenticated owner records and per-entry access grants, enforce access server-side, integrate relationship identities and independent participant consent, and test with John and Jessica in separate signed-in sessions. Do not describe local browser lists as private account storage.

## Validation
- `node test-date-store.cjs`
- `node test-wishes.cjs`
- `node --check wishes.js`
- `node --check date-store.js`
- `node --check local-date-builder.js`

These checks passed. A Playwright Chromium walkthrough at 390 × 844 also passed: save/reload, local-business save/edit preservation, date-draft handoff, private-note exclusion, remove/undo, intimate display-only behavior, no JavaScript page errors and no horizontal overflow. This is functional verification, not a complete accessibility or visual review.

Run the browser test with a local server on port 8765: `node test-wishes-browser.cjs`. Requires Playwright and its Chromium browser. Optional `QUEST_CHROMIUM_PATH` selects another Chromium executable; `QUEST_STORE_URL` selects the tested store URL. The test uses a fresh temporary browser context and does not touch real user accounts.


## Account implementation (prepared, not deployed)
`account-wishes.js` adds explicit device-to-account copying, cross-device reads after sign-in/refresh, private account editing with revision guards, deletion, and explicit sharing/revocation of wish snapshots to named active connections. Source private notes never enter shared snapshots. Only personal wants can be shared here; partner ideas and proposed group plans are not represented as someone else's wishes or mutual agreement.

Database migration: `supabase/migrations/20261022082818_store_wishes_account.sql`. It creates owner-only wish rows and recipient-specific snapshot rows with RLS. Snapshot creation copies only allowed source fields on the server, validates the reviewed revision and requires a currently connected relationship with both memberships active. Recipient access ends when either membership leaves or the relationship disconnects. Deleting the owner wish cascades to its shares. No new security-definer functions are introduced.

Verification: migration plus `database/test-store-wishes-account.sql` ran in a single transaction against the existing schema and rolled back successfully. Tests covered owner/recipient/outsider isolation, snapshot spoof prevention, private-note exclusion, stale edits/shares, relationship revocation and cascade deletion. Confirmed no test users or new tables remained afterward. Existing project security advisors were inspected; their pre-existing project-wide findings are outside this change. The migration objects were verified by transactional schema/policy tests; they are not currently deployed for an advisor scan.

`test-account-wishes-browser.cjs` passed in Chromium with mocked account transport: explicit import (no automatic sharing), edit/device separation, named recipient selection, shared-note-only disclosure, revocation, stale-edit rejection and clearing account content on account changes. SQL access-rule tests exercise the real database roles separately. This does not claim a real John/Jessica two-account end-to-end browser pass.

Deployment remains outstanding: review and apply the migration, publish the branch frontend, then run the real two-account walkthrough. The original device-only first-stage scope remains available. Shared snapshots are explicitly historical; source edits do not silently republish. Recipients recheck server access before adding a shared snapshot to a date draft; loaded views refresh on focus or the refresh button. Revocation stops future server reads and does not erase copies someone already saw.


## Release update — October 22, 2026
The account migration has now been applied to The Heart Stone Brain, and PR #53 was merged into main at d3d734df57aed5d52719605c08c3a16fdc7ba436. The rollback-only access-rule tests passed again against the deployed tables. The security advisor returned no findings for the new wish objects. The earlier not-deployed statements above describe the pre-release review checkpoint. GitHub Pages publishing is being checked separately; the real John/Jessica two-account browser walkthrough remains outstanding.

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

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

These checks passed. Browser/mobile verification remains pending: Playwright was available but the Chromium executable was missing and its download failed. No visual/browser pass is claimed.

# Heartstone — saved pause point (November 8, 2026)

## Resume here
The user explicitly requested a pause after selecting **livingwatergardens2025@gmail.com** as the intended primary administrator for the Founding Member preview dashboard. **Administrator authorization has NOT been granted. Account ownership/sign-in has NOT been verified.** Do not grant privileges until a trusted verification flow confirms control of the account.

When user says “resume” or “next”:
1. Continue with verifying that the user can sign into the existing Heartstone account **livingwatergardens2025@gmail.com**; do not request a password in chat.
2. After verification, securely set server-controlled app_metadata.heartstone_admin for that exact verified account; no other accounts.
3. Test authorized preview and unauthorized denial on phone/browser. Keep all enrollment confirmation disabled until pilot release gates are cleared.

## Locked decisions
- Pilot HOLD: no new tester invitations, public enrollment, real founding registrations or charges.
- 10 couple founding memberships + 5 individual memberships = 25 registered participants; first year free, permanent recognition, then lifetime $12/year billed annually. Public Date Quest: first month free then $12/year. World Quest separate.
- Living Storybook is a future optional add-on, not part of basic Date Quest. The simple home has a visible disabled “Living Storybook · Coming Later” button. Build first real storybook with consenting pilot participants later.
- Heartstone Store button remains on simple home.

## Current code/backend state
- GitHub: JohnRyberg2026/hero-stone-demo; founding-admin-preview.html is preview-only. index.html includes disabled Living Storybook button.
- Supabase project iqxhqxlcraatdheslqeo; edge function heartstone-admin-founding-enrollment v2 rejects confirm; public.admin_founding_enrollment_bridge also rejects confirm. Release HOLD is enforced server-side.
- No administrator assigned at this pause point. No claims of completed phone testing.

This file is a checkpoint, not a release approval or proof of account ownership.

# Heartstone locked development checkpoint — 2026-11-08

## Pilot product decisions
- Date Quest pilot: 10 couple memberships plus 5 individual memberships, totaling 25 registered participants. Guest invitees do not need accounts.
- Founding members: first year free, permanent founding recognition, then guaranteed lifetime $12/year billed annually. Public Date Quest: first month free, then $12/year. World Quest is separate.
- Living Storybook is an optional add-on beyond basic Date Quest. Home button stays visible but disabled and labeled "Living Storybook · Coming Later". Do not enable or price now. First real storybook should be developed from willing pilot participants with explicit sharing control.
- Heartstone Store remains accessible from simple home. Continue Date Quest pilot readiness before broadening features.

## Implemented and verified
- GitHub repo: JohnRyberg2026/hero-stone-demo; index.html contains the disabled Living Storybook button; founding-admin-preview.html is a preview-only dashboard.
- Supabase project: iqxhqxlcraatdheslqeo. Existing founding enrollment functions enforce eligibility, quotas and idempotency.
- Edge Function heartstone-admin-founding-enrollment version 2 authenticates user and requires server-controlled app_metadata.heartstone_admin=true. It only accepts preview, rejects confirm with release hold.
- Database RPC public.admin_founding_enrollment_bridge accepts service-role preview and rejects confirm while pilot release HOLD is active. Ordinary client execution is revoked.
- Pilot release HOLD remains active for new tester invitations and enrollment. No actual founding members enrolled as of last check.
- No registered account has been granted heartstone_admin yet. Do not infer admin identity or silently grant privileges.

## Immediate next step
Ask the operator to choose which of the three existing registered email accounts should become the founding enrollment administrator. Confirm account ownership/authorization through trusted workflow before assigning protected app metadata. Then test signed-in preview on phone, test unauthorized denial, and keep enrollment HOLD until other release gates are cleared.

## Security
Never embed service_role credentials in browser. Do not enable confirmation on dashboard, edge function or bridge during HOLD. No pilot account enrollment or external invitations in tests.

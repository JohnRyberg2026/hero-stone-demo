# Enrollment and exposed API verification — November 7, 2026

## Result
**A2 remains HOLD: public email signup is enabled.** Prefer administrator-issued pilot invitations with public signup disabled before adding external testers. No setting was changed, no account was created, and no confirmation email was sent.

## Observed configuration
Read the live public Auth settings endpoint with the browser publishable key:
- `disable_signup: false`: public signup is enabled.
- `mailer_autoconfirm: false`: email confirmation is required.
- Email provider enabled; phone, anonymous sign-in and all listed social providers disabled.
- SAML disabled; passkeys disabled.

Email confirmation verifies access to an inbox; it does not restrict enrollment to the pilot roster. Existing World Quest source includes `sb.auth.signUp`; hiding it would not close signup at Auth. The signup profile trigger creates a profile from supplied metadata; it does not add the account to the legacy development roster. Self-reported age eligibility is not age verification.

## Live Data API verification
A zero-row GET with an invalid Accept-Profile returned HTTP 406 / PGRST106 and listed exactly `public, graphql_public` as exposed schemas. Selecting `hs_pilot_internal` likewise returned 406 / PGRST106. Selecting public with `profiles?select=id&limit=0` returned 200 and no rows; this verifies the route, not row privacy.

The five application implementation schemas (`hs_invitation_internal`, `hs_availability_internal`, `hs_usage_internal`, `hs_wishes_internal`, `hs_pilot_internal`) are outside the server's advertised exposed list. GraphQL remains exposed; existing grants/RLS and the legacy function boundary still matter. This is not a full GraphQL audit.

Signed-out live POST calls to `my_private_calendar` and `list_moment_invitations`, using random nonuser UUIDs, returned HTTP 401 / SQLSTATE 42501 execution denial. No real records were requested. Signed-in participant/nonparticipant coverage is provided by the synthetic rollback regressions recorded in PILOT_ACCESS_REVIEW.md; no real-user HTTP token was obtained.

Session and role database settings did not expose a PostgREST schema override. Those null results were not treated as proof; the live HTTP response supplied the effective list.

## Required operator step
At [Auth signup settings](https://supabase.com/dashboard/project/iqxhqxlcraatdheslqeo/auth/providers), disable **Allow new users to sign up** while using administrator-issued invitations for a bounded pilot. Then re-read the public Auth settings and require `disable_signup: true`. Confirm the actual invitation/recovery route before sending invitations.

The connected Supabase tools available in this session can inspect database state but do not offer an Auth configuration update operation. Dashboard interaction requires an approved browser fallback; no secret key, management token, password or SMTP credential was fetched.

A3 password protection and recovery still requires separate completion. Existing accounts may continue development; no wider enrollment is cleared.

References: [General Auth configuration](https://supabase.com/docs/guides/auth/general-configuration), [Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api), [REST error codes](https://supabase.com/docs/guides/api/rest/postgrest-error-codes).

# Account recovery checkpoint — November 8, 2026

## Built; email activation remains HOLD
The sign-in area links **Forgot password?** to account-recovery.html in a separate tab, with noopener/noreferrer. It does not navigate the current planner/calendar page away. The recovery page and controller are published implementation, not evidence of successful real email delivery or a completed account reset.

`RECOVERY_EMAIL_ENABLED=false` deliberately disables recovery email requests in this UI until redirect/delivery configuration is verified. The page explains recovery is being prepared and directs members to the pilot coordinator. This is a UI activation gate; it does not disable Supabase's public recovery endpoint or replace server authorization.

## Security and behavior
- Explicit implicit-flow recovery client with persistSession=false and autoRefreshToken=false. It never reads/writes the main app's stored login. The Auth provider may still expire sessions under its password-change rules; no promise is made about provider-side session retention.
- A PASSWORD_RECOVERY event schedules server getUser verification after the synchronous Auth callback returns. INITIAL_SESSION or normal SIGNED_IN cannot authorize a password update.
- Updates require the same verified account immediately before updateUser. Account changes/signout invalidate pending operations and clear password fields.
- Recovery tokens are handled by the SDK, removed from the address after initialization/verification handling, and not logged by app code. Referrer policy is no-referrer. Passwords are never persisted to browser storage.
- Minimum 12-character password and matching confirmation; provider strength/same-password rejection remains retryable.
- Explicit email request only, fixed redirect destination, neutral account-existence response, duplicate prevention and one-minute retry guard.
- Bounded request/verification waits. An uncertain password save clears its recovery authorization and explains it may have succeeded, suggesting sign-in or a fresh link rather than claiming success.
- Recovery session stays in memory; saving does not sign into or switch the main app's stored account. Return-to-sign-in is a fixed app URL, with no user-supplied next/redirect target.
- Standard Supabase ConfirmationURL implicit links are the implemented flow. PKCE/custom token-hash email templates were not implemented or verified here.
- No actual recovery email was sent and no real password was entered or changed.

## Required before enabling requests
1. Verify Supabase Auth redirect allowlist includes exactly:
   https://johnryberg2026.github.io/hero-stone-demo/account-recovery.html
2. Verify the project's Site URL and recovery email template route users to this page, rather than localhost or an unrelated page. Check the actual template; do not assume the default is still installed.
3. Verify SMTP/provider delivery permissions for intended pilot addresses, rate limits and supported password protection. The existing leaked-password protection warning remains unresolved.
4. With explicit approval from the test account holder, perform one controlled real email-and-return test using this exact redirect while the general UI request gate remains off. The account holder enters and submits their new password themselves. Verify valid link, expired/reused link, account identity, and subsequent sign-in. Do not record passwords, tokens or secret URLs in screenshots, source, logs or chat.
5. Only after that evidence passes, set RECOVERY_EMAIL_ENABLED=true, rerun the recovery/whole-app checks, and publish the enabled request form. A passing mocked test alone is insufficient.

Available connected Supabase tools do not expose Auth configuration updates; prior dashboard sign-in was unfinished. No configuration setting was changed in this coding checkpoint.

## Verification
19 automated checks passed: activation gate, fixed destination, email validation, neutral unknown-account response, duplicate/cooldown/rate/network behavior, recovery-only authorization, deferred callback validation, verified update, password validation, provider rejections, account-change/signout invalidation, duplicate saves, expired links, session/referrer/storage properties, stalled requests and uncertain late saves. These are mocked Auth and source-integration checks, not real SMTP or password-change evidence.

The test joins the existing GitHub Date Quest regression workflow. No database schema/membership/store/invitation/memory data was changed. New tester HOLD remains.

Sources: [Supabase password reset API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [Password-based Auth](https://supabase.com/docs/guides/auth/passwords), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

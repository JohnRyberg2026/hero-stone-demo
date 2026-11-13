# Hosted private-note milestone — November 13, 2026

User-assisted test in John's own Chrome browser, using downloaded test-signin.html
against isolated Health Quest Test. This is separate from the fictional workflow
model and from live Heartstone.

Observed sequence from screenshots and guided actions:
- Test account A signs in and loads private notes.
- Explicitly reviewed fictional afternoon-energy goal saves.
- Goal appears after the requested browser reload.
- Correction changes afternoon to morning; one note remains.
- Account B signs in and displays no saved notes.
- Account A signs back in and the corrected morning-energy note returns.

Independent hosted read-only verification after the final screenshot found exactly
one nondeleted note across these two fixture accounts: owned by account A,
kind goal, text 'Test goal: improve morning energy.', state reported, revision 2,
follow-up false. Account B owns no nondeleted notes. No passwords were read.

This verifies the guided happy-path sign-in/save/correct/reload/account-switch
journey and observed read separation. It is not full hostile API authorization
coverage, cross-device testing, physician/manufacturer permissions, hosted
concurrent stale-write testing or hosted deletion verification. The prepared
password-based integration runner has not been executed with account credentials.
80 local automated checks remain the latest suite result; no code changed here.

Next: persist versioned proposed/approved sample plans in the test backend, with
owner isolation and revision checks; reuse the now-observed member session flow.
Keep physician/manufacturer views simulated until separate permission boundaries
are implemented and tested. Live Heartstone stays unchanged.

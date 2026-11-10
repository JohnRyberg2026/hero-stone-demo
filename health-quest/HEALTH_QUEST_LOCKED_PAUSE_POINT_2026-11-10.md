# Health Quest — LOCKED PAUSE POINT — 2026-11-10

## User direction
Save and lock all decisions and pause work here. Resume from this checkpoint, not from scratch. Phone-first, minimal typing, voice-directed work.

## Confirmed inspection
- GitHub repo: JohnRyberg2026/hero-stone-demo, default main.
- Development branch: health-quest-hq001-private-goals.
- Supabase project: The Heart Stone Brain (iqxhqxlcraatdheslqeo).
- Existing heartstone-conversation Edge Function authenticates users, uses pilot allowlist, short-lived session transcript, and Date Quest-specific instructions; no persistent cross-session wellness goals.
- Existing public.profiles identity reusable.
- Existing public.consent_events and user_preferences have owner-only policies; shared public.memories grants relationship-member access and MUST NOT store private health data.
- Existing public tables inspected have RLS enabled; this alone is not proof of complete safety.
- No live Supabase or main-branch changes made in this work session.

## Locked architecture
One Heartstone member identity and personality; privacy-separated Date Quest, World Quest, Health Quest and Living Storybook. Explicit granular permissions for cross-Quest use. Goals-first conversational Health Quest onboarding, no questionnaire; save only after approval; follow-up off unless allowed. Corrections and stop-asking honored across sessions and devices. Separate member-owned wellness goal records and append-only provenance/consent events. No AI diagnoses, prescriptions, unauthorized formula adjustments, marketing/research sharing or product upsell. Clinician and manufacturer portals are future, separately permissioned work.

## Six acceptance areas
1. Explicitly approved energy goal and afternoon pattern saved privately, recognized later.
2. Stop asking -> no follow-ups unless reopened.
3. Correct afternoons to mornings -> current record updated and acknowledged.
4. Date Quest has no unsolicited health details or interruption.
5. Alarming symptom -> safety handoff, not product suggestion or journaling.
6. Cross-device continuity, verified persistence, no silent failure/duplicates, database-enforced access.

## Completed work
- Read-only GitHub and Supabase discovery and policy inspection.
- Created branch health-quest-hq001-private-goals.
- Committed health-quest/HQ001_PRIVATE_GOALS_DESIGN.md at commit f8e089eece1de2a08ab78f8421040ca6180e2f8e.
- This checkpoint is a planning record, NOT an implemented migration or tested feature.

## Resume point
Next: create a reviewed HQ-001 SQL migration on the development branch (following repository conventions), plus security/behavior tests; verify with separate test identities in nonproduction before any deployment. Then wire explicit goal actions into a Health Quest-specific authenticated conversation path, keeping Date Quest unchanged. Verify Supabase current documentation before implementation. Do not claim feature is live until deployment and end-to-end tests confirm it.

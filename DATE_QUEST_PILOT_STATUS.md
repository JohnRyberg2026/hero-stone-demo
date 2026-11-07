# Date Quest pilot checkpoint — November 7, 2026

## Direction
Continue toward a focused, dependable Date Quest pilot. Keep the opening page to the three main actions, Our Memories shortcut, and interactive calendar. Health Quest and broader ecosystem expansion are later phases. Avatar movement remains paused.

## Implemented foundation
- Direct Date Quest entry, Switch Quest, and Home return navigation.
- Talk to Heartstone, six-step Plan a Moment, reviewed recipient/send, replies, revised-time proposals, accepted moments, shared beginning/closing, and private memories.
- Dedicated Invitations and Memories collections, compact cards, guarded Back navigation that stays visible inside moment dialogs.
- Private account calendar with revision conflicts, explicit browser import, date-based planning handoff, accepted invitation links, removal and session undo.
- Explicit date-only availability sharing with distinct private/shared calendar markers.
- Draft warnings for planner, calendar, private memory, and shared scheduling forms.
- Read timeout/retry handling for calendar, invitation, memory, and shared schedule reads. Shared-moment outages leave the private calendar usable.
- Same-account reconnections preserve private calendar drafts; account changes clear them. Old pending saves cannot reset or unlock a newer account's form.
- Readable invitation dates/times without silently converting the agreed wall time.
- GitHub Actions runs private-calendar, invitation-lifecycle, and planner-draft tests on relevant pushes and pull requests. This workflow reports failures; it does not block GitHub Pages publication or enforce branch protection.

## Evidence and limits
Earlier live demonstrations remain recorded in HEARTSTONE_TEST_CHECKPOINT.md: conversation-to-invitation, John/Jessica send/accept, availability share/remove, and explicit preference consent. Do not repeat those walkthroughs without a relevant regression.

The recent calendar sync, retry, draft, navigation, and overlapping-account-save changes have automated coverage using simulated transport and DOM objects. These are not fresh authenticated phone/desktop demonstrations or a full visual/accessibility audit. Passing deployment proves publication, not every live behavior.

Planner drafts save on the browser device. They are not cross-device account drafts. Private calendar records and private memory RPCs are different storage paths. Availability is not acceptance. Scheduling proposals require the other participant's confirmation. No external booking, payment, SMS, email, or device reminder is promised.

The Date Store account backend was deployed according to STORE_WISHES_IMPLEMENTATION.md; its documented real two-account walkthrough is still outstanding. Do not treat the older device-demo description or automated mock tests as evidence that the live account journey was demonstrated.

## Next bounded milestone
1. Keep automatic checks green and fix any reproducible regression before adding another subsystem.
2. When John resumes device testing, perform one targeted pass of newly changed behavior: account calendar reload between devices and propose/confirm a revised shared schedule. Preserve all earlier passed evidence; do not restart the entire test sequence.
3. Review the pilot's sign-in/recovery path and launch boundaries, including the existing project-wide security findings, before inviting additional users.
4. Choose the next product capability only after that release review. Avoid adding home-page buttons or starting Health Quest as a substitute for completing the pilot.

## Review correction
The simplified home hides the older Moments section. Calendar recovery messages must refer to visible Refresh Calendar or Our Invitations, not the hidden Refresh my moments control. The November 7 review fixes that guidance and adds an assertion for the visible status.

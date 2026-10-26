# HEART STONE avatar integration handoff

## Scope and ownership

Avatar development lives in `codex/avatar-voice-20261023`, draft PR #57. Application and Story Book development continues in PR #56. Do not replace the shared `heart-stone-companion.js`, welcome page, Story Book page, account flows or release runner with the standalone rehearsal.

The rehearsal entry is `heart-stone-avatar-voice-preview.html`. Its coordinator, voice and motion files are separate from the shared companion. The voice module currently depends on the existing companion element IDs and exact welcome-tour wording. An upstream wording change intentionally disables narration for unrecognized text; review the public-text allowlist before integration. Do not broaden this into reading arbitrary DOM content.

## Behavior contract

- Initial state is silent and still. No microphone, account access, private text capture or persistence.
- Voice needs explicit enabling, voice selection and a Hear action. Browser voice providers may process the disclosed public script online.
- Only the fixed greeting and four welcome-tour texts can be spoken. Moving through a tour never starts speech. Changing or closing the step stops it.
- Quiet mode, Escape and Hide stop all preview speech and motion. Show restores controls without playback. Quiet/Hide/Escape reset voice permission for the page.
- Motion stays in its stage, lasts one short cycle and respects reduced motion. Returning from a hidden or cached page does not restart movement or sound.
- No invitation, purchase, booking, sharing, memory write or database operation is connected to the avatar.

## Evidence and limits

Quiet-mode revision `e47ef2b0c9222080788e5086d98383640a5b32ee` passed the dedicated Chromium workflow:
https://github.com/JohnRyberg2026/hero-stone-demo/actions/runs/39991080806

Tour narration revision `9f4e115364771ff26a6e0049dcecf336c3344236` passed both avatar component suites. Its browser run was queued when this handoff was written:
https://github.com/JohnRyberg2026/hero-stone-demo/actions/runs/40011697216

A temporary local merge of that narration revision with PR #56 revision `9e6fe839a4879e81ac7fd8b9fee173770ceac910` had no conflicts. All 28 application component suites plus both avatar suites passed together. This does not certify compatibility with later upstream revisions. The trial merge was not published and PR #56 was not changed.

Browser speech is simulated in automated tests. Actual audible output, female-voice availability, mobile browser speech behavior and real back/forward-cache restoration still require device checks. The rehearsal now moves the existing companion figure within its own stationary button; there is only one character. The shared companion’s older playful-motion controls are hidden on this preview so the two animation controls cannot compete. This is still a standalone rehearsal, not an application-page installation.

## Before application integration

1. Refresh PR #56 and #57 heads and check current repository instructions. Use an isolated checkout, leaving other worktrees alone.
2. Trial-merge the latest application branch into the avatar branch. Resolve changes deliberately; never force-push another window's branch.
3. Run `node tools/check-date-release.cjs`, `node test-heart-stone-avatar-voice.cjs` and `node test-heart-stone-avatar-motion.cjs`.
4. With Playwright and Chromium installed, serve the checkout at port 8765 and run `node test-heart-stone-avatar-preview-browser.cjs`. Also run the application browser suites required by the latest release runner.
5. Review a single-character design and explicitly choose application mounting points. The standalone preview is not an automatic replacement for the welcome or Story Book page.
6. Test audible output on phone and computer, including Stop, Quiet, Hide, navigation, reduced motion and unavailable voices. Confirm no sound starts on load or restore.
7. Review the resulting diff and test evidence before merge or deployment. This handoff performs neither.

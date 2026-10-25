# HEART STONE movement study — October 25, 2026

User authorized resuming natural movement in the avatar window. Based on approved-artwork PR #58 at 850b7607778940c557a60f289d1e2cd55a8b365d. Isolated branch: codex/avatar-natural-motion-20261025. No existing app, companion, approved artwork or other-window branch is changed.

## Review candidate

heart-stone-natural-movement.html loads a new transparent eight-pose animation study. The first four poses play forward and backward once for a short presenting gesture and blink, then stop. No automatic playback or roaming. Quiet, Escape, Hide, reduced-motion changes and page lifecycle events stop/reset playback. Showing/returning never restarts it. No voice, microphone, network requests, account access or persistence. The device HTML embeds both artwork and script for offline review.

This is a limited hand-drawn frame study, not a finished natural-motion rig. Generated poses have small face/body/foot differences; four unique poses limit smoothness. Walking, lip sync, wardrobe animation and app integration remain unfinished. Neither the generated frame drawings nor their motion have user approval. Canonical approved artwork is preserved byte-for-byte.

## Assets and generation

Built-in image-generation tool, approved-casual.webp as reference. New asset: images/heartstone/greeting-study-v1.png, 1536×1024 RGBA, 4 columns × 2 rows. Source contains actual transparent exterior pixels. Browser capture: docs/previews/heart-stone-greeting-study.png.

Prompt: Preserve approved adult cartoon identity, auburn hair, black heart-print tank, denim shorts, sneakers and visible heart compass; create eight equal-cell full-body frames with fixed camera and planted feet, subtle presenting hand gesture, slight head inclination and a brief blink, no bounce or walking. Follow-up: remove all backdrop/glow/shadows while preserving drawings and layout. Generation did not achieve perfect pose consistency; retain review status.

## Verification

`node test-heart-stone-natural-movement.cjs` with Playwright Chromium passed at 390px and 1280px. Checks loaded frames and actual advancement, completion, Escape, Hide/Show without restart, Quiet, reduced-motion change/reset, pagehide cancellation, responsive overflow and script errors. Actual mobile rehearsal screenshot inspected. These tests validate playback/control behavior, not human assessment of naturalness or device audio.

Local runtime can use AVATAR_CHROMIUM=/path/to/chromium and NODE_PATH pointing to installed Playwright. No changes to existing application release runners or their historical test claims.

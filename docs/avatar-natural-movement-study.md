# HEART STONE movement study — October 25, 2026

User authorized resuming natural movement in the avatar window. Based on approved-artwork PR #58 at 850b7607778940c557a60f289d1e2cd55a8b365d. Isolated branch: codex/avatar-natural-motion-20261025. No existing app, companion, approved artwork or other-window branch is changed.

## Review candidate

heart-stone-natural-movement.html now uses only the first illustration from the transparent frame sheet. heart-stone-natural-rig.js continuously deforms a 40×56 triangle mesh with small shoulder, elbow, wrist and head movements over 2.6 seconds. Eased timing returns to the exact rest coordinates. The pelvis, legs and feet are anchored; the lower region is copied directly from the source. There is no frame swapping, whole-body bounce or blink in this revision. No automatic playback or roaming. Quiet, Escape, Hide, reduced-motion changes and page lifecycle events stop/reset playback. Showing/returning never restarts it. No voice, microphone, account access or persistence. The source page loads its local scripts/art; the device HTML embeds everything and requires no network requests.

This is a limited 2D mesh gesture study, not a full character rig. Only small in-plane movement is supported; large turns and limb occlusion need layered artwork and a more complete rig. Walking, blinking, lip sync, wardrobe animation and app integration remain unfinished. The chosen generated drawing differs slightly from the canonical approved image and remains a review asset. Neither the generated frame drawings nor their motion have user approval. Canonical approved artwork is preserved byte-for-byte. If GPU animation is unavailable or its context is lost, the portrait stays still and playback is disabled. The multi-file source page should be served over HTTP; use the device HTML for local-file review.

## Assets and generation

Built-in image-generation tool, approved-casual.webp as reference. New asset: images/heartstone/greeting-study-v1.png, 1536×1024 RGBA, 4 columns × 2 rows. Source contains actual transparent exterior pixels. Browser capture: docs/previews/heart-stone-greeting-study.png.

docs/previews/heart-stone-greeting-smooth.gif records actual browser playback. It loops for review; the interactive gesture runs once per explicit Play. No new generated artwork was added for the continuous-motion refinement.

Prompt: Preserve approved adult cartoon identity, auburn hair, black heart-print tank, denim shorts, sneakers and visible heart compass; create eight equal-cell full-body frames with fixed camera and planted feet, subtle presenting hand gesture, slight head inclination and a brief blink, no bounce or walking. Follow-up: remove all backdrop/glow/shadows while preserving drawings and layout. Generation did not achieve perfect pose consistency; retain review status.

## Verification

`node test-heart-stone-natural-rig.cjs` checks anchored lower-body coordinates throughout playback, continuous start/end, finite positions and non-folding mesh cells. `node test-heart-stone-natural-movement.cjs` uses Playwright Chromium at 390px and 1280px on HTTP source and offline device pages. It checks actual changing canvas pixels, stable lower-body silhouette/pixels (one RGB rounding level allowed), completion, Escape, Hide/Show without restart, Quiet, reduced-motion change/reset, pagehide cancellation, responsive overflow and script errors. An unavailable-GPU fixture checks still-portrait fallback and disabled playback. These tests validate playback/control behavior, not human assessment of naturalness or device audio.

`node tools/export-natural-movement.cjs` regenerates the portable HTML from source scripts/art; `--check` detects stale output.

Local runtime can use AVATAR_CHROMIUM=/path/to/chromium and NODE_PATH pointing to installed Playwright. No changes to existing application release runners or their historical test claims.

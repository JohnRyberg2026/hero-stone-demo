# HEART STONE walking study — October 25, 2026

Continues the user-authorized natural movement work in draft PR #59. Existing approved images, greeting study and other-window application files remain unchanged.

## Implemented

heart-stone-walking-study.html provides a short, explicitly started walk within a bounded canvas. Eight registered illustration poses provide contact, bent-knee passing and recovery phases over two cycles. Root travel accelerates/decelerates with an eased curve. Hip anchors and source-frame heights are normalized; the lowest shoe stays near the ground baseline. Quiet, Escape, Hide, reduced-motion changes and page lifecycle events cancel playback and hold the current pose/location. Showing or returning never resumes automatically. Return to start is explicit; replay starts a new walk. The last contact pose is held at the endpoint rather than teleporting back.

The device HTML embeds the artwork and JavaScript for local offline review. The source page needs only its local script and artwork. No voice, microphone, accounts, storage, background roaming or application integration.

## Artwork and registration

Built-in image-generation tool used approved-casual.webp as the identity/outfit reference. Prompt requested a transparent twelve-frame, three-quarter right-facing relaxed walk with consistent auburn hair, heart-print tank, denim shorts, sneakers and visible green heart compass; alternating heel contacts, toe push-off, passing knees and opposing arm swing. First generation repeated a lead leg and was rejected. A corrective edit specified the near/far leg phases individually and retained the character/outfit.

New asset: images/heartstone/walking-study-v1.png, 1024×1536 RGBA. The generator returned uneven cell spacing and cropped the last row. Actual alpha-component bounds were analyzed; only the first eight complete poses are used. docs/walking-atlas-registration.json records source rectangles and hip anchors. A duplicate contact pose and all cropped bottom-row poses are excluded. No canonical approved asset was overwritten. This remains unapproved animation artwork derived from the approved appearance.

## Limits

This is a frame-animation study, not finished natural locomotion. Generated anatomy/face/stride and arm-swing consistency still need visual review. Eight poses limit smoothness; height normalization cannot fully remove proportional differences. It has no stance-foot world-space locking, independent limb rig, turn animation or transition to a neutral standing pose. Foot sliding and knee/arm timing remain refinement targets. Root movement is confined to a test stage, not navigation around the application. Do not describe this as a completed human-quality walk.

## Verification

`node test-heart-stone-walking-study.cjs` in actual Chromium checks the offline page at 390px and 1280px: no initial movement, changed canvas pixels, completion at the endpoint, holding position, Escape, Quiet, Hide/Show without restart, explicit reset, reduced-motion changes, pagehide cancellation, overflow and script errors. Browser captures inspected; the initial uniform-cell implementation visibly clipped shoes and included neighboring feet, and was replaced with per-pose registration.

`node tools/export-walking-study.cjs` regenerates the standalone device HTML; `--check` detects stale output. Browser capture: docs/previews/heart-stone-walking-study.png. docs/previews/heart-stone-walking-study.gif shows actual playback; the GIF loops for review, while the interactive walk plays once per request. Tests check behavior, not aesthetic approval or biomechanical accuracy.

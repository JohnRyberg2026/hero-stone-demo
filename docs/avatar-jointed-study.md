# HEART STONE continuous painted-limb study — October 26, 2026

This is an additional comparison study in draft PR #59. The earlier registered-pose walk remains unchanged and available. Canonical approved images and application branches are unchanged. No deployment or merge.

## Change

The earlier walk has eight separate illustrations and cannot render missing in-between poses. This experiment instead draws one body/face and separate painted upper arms, forearms/hands, thighs, lower legs and shoes. A continuous two-bone solution keeps thigh/shin lengths fixed; stance ankles hold their world location, swing feet lift and land, and arms swing in opposition. The torso shifts vertically by less than one pixel. Shoes remain flat during stance and move independently of shin rotation.

Visual refinement: the near arm now renders in front of the torso. The previous all-arms-behind order hid it during forward swing. Cached per-part alpha masks soften upper-arm, thigh and shin endpoints along their local bone axes; forearms render underneath softened upper-arm ends. This reduces hard cutout boundaries and the shin's hard ankle crop without changing the original PNG. Soften joint edges is on by default. Toggling it pauses and redraws the same pose, with no automatic restart. Both edge modes use the corrected near-arm layer order. This toggle compares joint compositing, not the whole previous version.

Play runs a bounded 2.4-second walk. Quiet, Escape, Hide, reduced-motion changes and page lifecycle events stop and hold the current pose. Showing/returning never restarts movement. Return to start is explicit. The offline device HTML embeds all scripts and art. No voice, microphone, account access, storage, automatic motion or external network requests.

## Asset preparation

Built-in image-generation tool used images/heartstone/approved-casual.webp as the identity reference. New derived asset: images/heartstone/jointed-parts-v1.png, 1254×1254 RGBA. Canonical artwork was not overwritten. This derived face/body and its assembly remain unapproved for final use.

Generation prompt: a transparent nine-part painted paper-doll atlas preserving the approved adult cartoon face, auburn hair, heart-print black tank, denim shorts, green/gold heart compass and black sneakers; one connected head/hair/torso/shorts body, two upper arms, two forearms with relaxed hands, two thighs, two lower legs with complete shoes; matching three-quarter right-facing view, separated cells, rounded joint overlaps, no backdrop/shadows/text. Cleanup prompt: keep every part's position/size/identity; replace hollow elliptical ends with solid rounded matching skin, remove rings and stray exterior debris, preserve transparent exterior and all clothing/compass/shoes.

Source rectangles and joint anchors are in heart-stone-jointed-renderer.js. Rectangles come from alpha-component bounds. The renderer splits each lower-leg source around the ankle for independent flat shoe placement and applies width/proportion adjustments when assembling parts. All rendered frames use the same painted sources; no face swapping or crossfading.

## Limits

This is a research rig, not finished natural locomotion. Painted joint seams, overlap/occlusion, limb proportions and the frontal/three-quarter silhouette need visual review and better rig artwork. Feet have no heel-to-toe roll. Start and stop do not yet transition from/to a neutral standing pose; the last walk pose is held. There are no turns, lip sync, wardrobe animation or app integration. Geometric tests do not establish believable human motion or aesthetic approval.

## Verification

`node test-heart-stone-jointed-gait.cjs` checks the complete walk at 1 ms intervals for fixed thigh/shin lengths, planted stance ankles, ground clearance, finite/continuous knee and foot paths and opposing arms. `node test-heart-stone-jointed-browser.cjs` passed actual Chromium at 390px and 1280px for rendering, endpoint, Quiet/Escape/Hide/reset, reduced motion, page leave and overflow. Clock-controlled checks show canvas motion between former pose ticks and unchanged planted-shoe pixels (one RGB rounding level allowed). Rest/moving captures were inspected, including visible seam/proportion limitations.

The browser suite also verifies that original/softened edge modes render different pixels, sampled face/compass regions remain unchanged, changing the mode stops and holds playback, and the forward-swing near forearm is visibly painted over the torso. At 390px and 1280px both comparisons pass. Human visual review is still needed; this is not proof that all joint silhouettes or overlaps are anatomically correct.

`node tools/export-jointed-study.cjs` regenerates the standalone device HTML; `--check` detects stale output. docs/previews/heart-stone-jointed-study.png is the actual mobile screen. The MP4 records actual canvas states at approximately 30 frames per second; it has no audio. These are development previews, not final design approval.

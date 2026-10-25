# HEART STONE animation art — first reference

The approved base identity remains approved-casual.webp. expression-reference-v1.webp is a proposed six-expression reference sheet, not approved replacement identity art, not a rig and not production animation frames.

Expressions: rest, blink, listen, speak, smile, curious. Preserve adult identity, auburn hair, natural approved body proportions and visible heart compass. Keep facial movement restrained and approachable.

Before animation: separate aligned facial layers or produce a consistent deformable rig. The six portraits vary in head position; do not swap complete panels as animation frames. The speaking portrait is an expression reference, not phoneme/viseme coverage or synchronized speech. Listening expression does not indicate microphone capture.

Next deliverable: registered eyes-open/half/closed layers and neutral plus speech mouth shapes for one fixed head pose, with an explicit play/stop rehearsal. Preserve Quiet, Hide, Escape, reduced-motion and page-exit cancellation. No automatic audio or animated whole-image bouncing. No changes to application or account flows in this art step.

## Blink prototype — October 25
Added blink-strip-v1.webp and heart-stone-blink-preview.html, an isolated canvas playback of open/half/closed eyelids. Playback requires Play one blink, runs once in about 205 ms, and resets on Stop, Quiet, Escape, Hide, page exit, or reduced-motion activation. Show never resumes playback. Unit tests cover cancellation, stale callbacks and ordered poses. Browser checks are added to the approved-avatar workflow.

This generated strip still requires visual review for registration and likeness; it does not replace approved-casual.webp or implement lip sync, gestures, continuous idle animation or production rigging. No microphone, audio, measurement data, account or purchase behavior is connected.

## Blink inspection controls
Added quarter-speed inspection and explicit still-pose buttons for open, half-closed and closed eyelids. Selecting a still pose cancels scheduled playback; Quiet/Stop restore open eyes. Still-pose inspection remains available with reduced motion enabled, while timed playback stays disabled. These controls aid visual review and do not establish production animation quality.

## Speech activity rehearsal
Added speech-strip-v1.webp and heart-stone-speech-preview.html. The existing allowlisted public-greeting voice module emits state-only events; no text or account data is included. Mouth poses cycle only after an actual speech-start callback and a separate mouth-movement opt-in. Waiting, Stop, end/error, Quiet, Hide, Escape, page exit and reduced motion restore the resting mouth. Quiet/Hide/Escape reset voice and movement opt-ins. Show never starts playback. Playback is bounded to 15 seconds of mouth movement.

This is a speech-activity illustration, not phoneme or viseme synchronization. Generated frames still need visual registration review. Browser checks use simulated speech callbacks and do not prove real-device audio timing, female voice availability or lip-sync quality. No main app or database changes.

## Speech pause and resume
The speech rehearsal now exposes Pause voice and Resume voice when the browser supports them. Mouth activity stops immediately while a pause is requested, stays at rest while paused or awaiting resume, and restarts only on the owned utterance's resume callback. Canceled/replaced utterance callbacks cannot resume mouth movement. Unit and simulated browser checks cover these transitions; real-device pause/resume behavior remains to be checked.

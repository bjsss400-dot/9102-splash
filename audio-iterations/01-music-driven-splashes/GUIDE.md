# Iteration 1 — Usage and implementation guide

This guide describes the historical music-driven splash prototype. The final artwork instead uses music-driven board movement and dive sound effects. This archive is not a complete standalone browser project.

## Historical integration

To reconstruct this version, use a separate compatible project copy with the group's drawing, time and input files:

1. Place this archived `audio-mechanic.js` at that copy's root.
2. Copy `assets/poolside-study.wav` to the same relative path.
3. Retain the existing audio setup/update/meter calls. In `drawBorderText()`, use `getAudioBorderMessage()` for the message. Preserve the group's other mechanics and their public interfaces.
4. Include compatible p5.js and p5.sound libraries. The original full package used local libraries and proportional canvas styling; those wrapper files are not included in this archive.
5. Serve the project over HTTP, for example with Live Server. The archive folder alone has no `index.html` to open.

## Interaction

Click the artwork or press M to start. The first 1.4 seconds learn the average level. Subsequent peaks trigger splashes of different strengths. M pauses/resumes; a normal painting click preserves a deliberate pause. Existing splashes can finish after music pauses. Other input behaviours depend on the compatible group project used for reconstruction.

## How the detector works

`audioTrack` stores the music. `audioAmplitude` reads that track, not the microphone. `audioState` stores playback status, current level, average level and 60 recent readings.

- A fast interpolation follows current loudness; a slow interpolation estimates the baseline.
- A candidate begins when the signal exceeds a silence floor and an adaptive threshold.
- The detector collects a peak for 100 ms and compares it with the baseline at onset.
- Contrast maps to power 0.55, 1.1 or 1.85, passed to `triggerSplash()` at a fixed point and depth.
- A minimum 420 ms interval and a falling-level re-arm rule limit repeated triggering.

The Time mechanic controls splash duration; the drawing mechanic controls appearance. Audio selects trigger time and power. The history graph is an amplitude history, not an FFT spectrum. Sixty drawing frames cover about one second at 60 fps and a longer interval at lower frame rates.

## Music and tuning

Poolside Study is the original 24-second, 80 BPM demonstration loop generated with OpenAI Codex assistance. Its strong accents occur every three seconds; the visual detector follows measured audio rather than a three-second timer. This is amplitude-onset detection, not general beat or tempo recognition.

To try another track in a reconstruction, update `AUDIO_TRACK`, then tune analysis `gain` and contrast thresholds. Analysis gain changes detection sensitivity; playback gain is set separately. Credit each replacement track's creator, source and reuse terms.

## Contribution and AI assistance

OpenAI Codex assisted with the code, peak detector, tests, original music generation and documentation. The implementation uses measured amplitude to drive a visual event and keeps the audio mechanic in a separate file. Functions outside the course are referenced in the source and README.

The original full package contained group files that are not part of this archive. Its old notes about incomplete Perlin functions and responsive styling described that package, not the final group project. This archive and its documentation do not establish an additional development iteration or replace the repository's genuine commit history.

Future experiments could compare tracks, thresholds and strength mappings. Any contribution claim should describe work actually completed and understood by the contributor.

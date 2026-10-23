# A Bigger Splash — Audio Mechanic

An audio contribution to the group's p5.js reinterpretation of David Hockney's *A Bigger Splash* (1967). Music gives the painting's frozen splash a new sequence of moments: stronger musical accents produce larger splashes while the architectural composition remains still.

## Run

Open this folder with VS Code and choose **Open with Live Server** on `index.html`. Alternatively, run `python3 -m http.server 8765` in this folder and visit `http://localhost:8765`. Use an HTTP server instead of double-clicking the HTML, because audio loading needs it. All libraries and the demonstration music are included locally.

- Click the artwork or press **M** to start the music.
- Press **M** again to pause/resume. Pausing preserves the track position. Other clicks do not undo a deliberate pause.
- Click the pool for a manual splash; drag horizontally for wind.
- Press **1 / 2 / 3 / 4** for day / sunset / night / sunrise.
- The upper-right graph shows the last 60 analysed drawing frames (approximately one second at 60 fps). The thin bar below it shows current smoothed loudness. This is an amplitude history, not a frequency spectrum or the raw audio waveform.

## Audio contribution and techniques

`audio-mechanic.js` owns audio loading, playback state, loudness analysis, peak detection and the meter. It preserves the shared names `audioState`, `setupAudioMechanic`, `updateAudioMechanic`, `startAudio`, `toggleAudio` and `drawAudioMeter`.

1. `loadSound` loads a real audio file. `userStartAudio` unlocks browser sound after a user gesture. `p5.Amplitude.setInput(audioTrack)` analyses this track only; no microphone permission is requested.
2. `getLevel()` returns amplitude. Analysis gain increases sensitivity without changing playback volume. A fast `lerp` smooths the current level; a slow `lerp` estimates typical loudness. Time-dependent interpolation factors keep the response similar at different frame rates.
3. The first 1.4 seconds after starting/resuming establish the baseline. A candidate starts when the level exceeds both a silence floor and `average * 1.2 + 0.012`. The detector collects its peak for 100 ms.
4. Peak contrast is `(peak - baseline) / max(baseline, 0.06)`. Contrast below 0.6 gives small power **0.55**; contrast from 0.6 to below 1.6 gives medium power **1.1**; contrast of 1.6 or more gives large power **1.85**. A 420 ms minimum gap and a falling-level re-arm rule prevent one sustained sound from creating a splash every frame.
5. `triggerSplash(0.60, power, SPLASH_BASE_Y)` hands the event to the existing Time mechanic. Position and depth stay fixed, so the size comparison comes from power. The Time module controls rise, hold, fall, fade and ripples; the existing Perlin module draws the splash.

The visual code does not schedule a splash every three seconds. The demo **audio** has a strong accent every three seconds; the detector responds to its actual measured signal. Other tracks will produce different timings. This is amplitude-based onset detection, not a universal musical-beat or tempo estimator.

## Music

**Poolside Study** is an original 24-second instrumental demonstration loop created with OpenAI Codex for this project: 80 BPM, soft bell notes, a harmonic bed, light percussion, and stronger accents every four beats. It contains no samples from external recordings. `assets/poolside-study.wav` is the actual audio loaded by the sketch. `tools/make-demo-music.py` records how it was synthesised and can regenerate it; Python is not required when viewing the artwork.

To use the group's music, put its WAV/MP3 file in `assets/` and update `AUDIO_TRACK`. Tune `AUDIO_SETTINGS.gain` and contrast thresholds if its dynamics differ. Add that track's artist, source and permission/licence information to the final group README.

## Mechanic ownership / integration

| File | Responsibility | Status in this package |
| --- | --- | --- |
| `audio-mechanic.js` | Audio member — add your actual name before submission | Implemented here |
| `sketch.js` | Shared orchestration / Audio member | Only border-message integration changed |
| `time-mechanic.js` | Time member | Copied unchanged from supplied version |
| `perlin-random-mechanic.js` | Perlin / Random member | Copied unchanged; supplied version still contains TODOs and empty water functions |
| `input-controls.js`, `artwork-base.js` | Input member | Copied unchanged |
| `index.html`, `style.css` | Shared wrapper / Input member | Small integration changes: local libraries, viewport meta and proportional canvas display |

This is a runnable audio integration package, not a declaration that every group member's work is finished. Keep teammates' newer versions when merging. Add real member names and their own techniques/references to the final group README.

## AI acknowledgement

OpenAI Codex (ChatGPT) assisted with the audio implementation, peak-detection design, playback/error handling, meter, integration text, responsive display, original demo-music synthesis, documentation and behavioural tests. The generated code measures audio amplitude, compares a smoothed level with a slower baseline, classifies short peaks into three strengths, and passes events to the group's existing splash interface. The audio source and modified integration files also contain acknowledgement comments. Existing teammates' contributions retain their own original comments and acknowledgements. Review and understand this code before presenting it; describe any subsequent personal changes accurately.

## References and dependencies

- [p5.Amplitude](https://p5js.org/reference/p5.sound/p5.Amplitude/) — amplitude measurement and selecting an input track.
- [userStartAudio](https://p5js.org/reference/p5/userStartAudio/) — gesture-based browser audio activation.
- [p5 lerp](https://p5js.org/reference/p5/lerp/) — interpolation used for level smoothing and the running baseline.
- [MDN Math.exp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/exp) — elapsed-time interpolation factors.
- [MDN Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) — waiting for audio-context activation and reporting failures.
- Bundled p5.js **1.11.3** and p5.sound **1.0.1** were copied from the existing local p5 project; their upstream headers are preserved. This p5 1.x sound library uses callback-based `loadSound`. Its source documents that API; newer reference examples may use a different API. See [p5.js](https://github.com/processing/p5.js) and [p5.sound](https://github.com/processing/p5.js-sound).

## Verification

Run `node tests/audio.test.cjs` with Node.js. No packages need installing. Tests cover silence, warmup, sustained sound, pause/resume, pending-start cancellation, failed-load retry, a long background-tab stall, invalid readings, and the 60-sample history. They replay RMS measurements from the shipped WAV at 30 and 60 fps, checking all three sizes, minimum splash spacing, and large splashes near the track's strong accents. This numerical replay supplements browser testing; it does not emulate every browser's audio processing.

Browser checks also confirmed the idle state, playing meter and automatic splashes, pause with a flat meter, and manual pool splashes plus night-mode switching while music stays paused. No console errors or warnings were observed during these checks. Both narrow and desktop-sized layouts were inspected.

The original source files in Downloads are untouched. The four teammate-owned JavaScript files listed as unchanged can be compared byte-for-byte with the supplied versions.

## Submission work still owned by the group

The assignment requires at least **three meaningful commits per member**, excluding initial setup. This package does not create or fabricate contribution history. Use your real group repository and make genuine, reviewable development commits. Complete real member names, merge the Perlin member's finished version and verify the final group project before submission.

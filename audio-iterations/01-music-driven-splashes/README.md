# Iteration 1 — Music-driven splashes

Audio contributor: Zihuai Liu.

This historical prototype reinterprets the frozen splash in David Hockney's A Bigger Splash (1967): stronger measured musical accents produce larger splashes while the composition remains still. It is archived from the original full audio integration package. The final root application uses a different board-and-dive audio design.

## Scope and use

This directory contains the audio source, music, tests and generation tool. It has no standalone `index.html`, drawing modules or bundled p5 libraries. Follow [GUIDE.md](GUIDE.md) to reconstruct it in a separate compatible project copy. Serve that copy over HTTP.

- Click the artwork or press M to start; M pauses/resumes. Other clicks preserve a deliberate pause.
- A 60-reading history displays recent amplitude. It is not an FFT spectrum or raw waveform.
- Pool clicks, wind dragging and time-of-day keys are supplied by the compatible group's input module.

## Audio techniques

`audio-mechanic.js` owns loading, playback state, amplitude analysis, peak detection and the meter. It retains the shared names `audioState`, `setupAudioMechanic`, `updateAudioMechanic`, `startAudio`, `toggleAudio` and `drawAudioMeter`.

1. `loadSound` loads the track; `userStartAudio` enables browser audio after interaction. `p5.Amplitude.setInput(audioTrack)` selects that track, without microphone input.
2. Analysis gain increases sensitivity separately from playback volume. Fast and slow interpolation estimate current loudness and its baseline. Elapsed-time interpolation factors make 30/60 fps responses comparable.
3. A 1.4-second startup/resume period establishes the baseline. A candidate must exceed both the silence floor and `average * 1.2 + 0.012`. Its peak is collected for 100 ms.
4. Contrast is `(peak - baseline) / max(baseline, 0.06)`. Below 0.6 gives power 0.55; from 0.6 to below 1.6 gives 1.1; at least 1.6 gives 1.85. A 420 ms minimum interval and falling-level re-arm rule prevent sustained signals from repeatedly triggering.
5. `triggerSplash(0.60, power, SPLASH_BASE_Y)` sends the event to the Time mechanic. Position/depth remain fixed, so power determines size. Other group modules own the animation lifetime and appearance.

The detector responds to measured amplitude, not a fixed beat timer. It is onset detection, not a general musical-tempo estimator.

## Music

Poolside Study is an original 24-second, 80 BPM instrumental loop generated with OpenAI Codex assistance. It combines bell-like notes, a harmonic bed and percussion, with stronger accents every four beats. The generator uses mathematical signals and noise rather than external recording samples.

`assets/poolside-study.wav` is the archived track. `tools/make-demo-music.py` can regenerate it; Python is not required to play the artwork. This track differs from the root application's 8-second `audio/demo.wav`. Credit the source and reuse terms of any replacement recording.

## AI acknowledgement

OpenAI Codex (ChatGPT) assisted with the audio implementation, peak-detection design, playback/error handling, meter, integration text, original package's responsive display, demo-music synthesis, documentation and behaviour tests. The code compares smoothed amplitude with a slower baseline, classifies short peaks into three strengths and passes events to the group's splash interface. Source, test and generator acknowledgements are retained. The responsive wrapper and other group files from that original package are not included in this archive.

## References

- [p5.Amplitude](https://p5js.org/reference/p5.sound/p5.Amplitude/) — amplitude analysis and track input.
- [userStartAudio](https://v1.p5js.org/reference/p5/userStartAudio/) — gesture-based audio activation.
- [lerp](https://p5js.org/reference/p5/lerp/) — interpolation.
- [Math.exp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/exp) — elapsed-time interpolation factors.
- [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) — asynchronous activation and failures.

The original full package used p5.js 1.11.3 and p5.sound 1.0.1, preserving their library headers. Those libraries are not bundled in this archive; the current root application has its own CDN dependencies.

## Verification scope

Run `node tests/audio.test.cjs` from this directory, with Node.js and no extra packages. Tests cover silence, warmup, sustained sound, pause/resume, pending-start cancellation, failed-load retry, background stalls, invalid readings and the 60-reading history. They replay RMS readings from the shipped WAV at 30/60 fps to check three splash strengths, spacing and strong accents. This is a numerical simulation, not a full browser/audio-device test.

The original notes reported browser checks of the full historical package, including pause, splashes and layout. Those checks do not verify the final root application. Archive commits preserve existing work; meaningful development contributions are assessed from the actual changes and history, not from archive count alone.

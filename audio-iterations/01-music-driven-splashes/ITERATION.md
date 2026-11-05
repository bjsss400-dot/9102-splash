# Iteration 1 — Music-driven splashes

Contributor: Zihuai Liu
Source: the contributor's original `bigger-splash-audio 2` package.
Archive commit: `611ecc3`, 23 October 2026.

## Design and implementation

- Measure the background track with `p5.Amplitude`.
- Compare a quickly smoothed level with a slower average to detect short peaks above the baseline.
- Map peak contrast to small, medium or large splashes.
- Use startup learning, a minimum trigger interval and a falling-level re-arm rule to prevent repeated triggers.
- Provide playback controls, a loudness-history display and an original demonstration track.

## Included files

`audio-mechanic.js` and `assets/poolside-study.wav` are the archived implementation and music. `tests/audio.test.cjs` contains behaviour tests; `tools/make-demo-music.py` generates the demonstration track. [README.md](README.md) explains the technical design; [GUIDE.md](GUIDE.md) describes historical integration.

Only the audio contribution is archived here. This folder has no standalone `index.html` and does not contain the complete group artwork.

## Change in design direction

This version makes music trigger splashes. It does not contain the later board creak, rebound tone or recorded landing sound. Version 2 maps music to board movement and adds feedback to the Space-key dive.

## Inspection and testing

From this directory, run `node tests/audio.test.cjs`. To inspect its visuals, integrate it into a separate compatible project copy using GUIDE.md.

The archived code retains its OpenAI Codex acknowledgement. The archive date records preservation of the supplied source, not a new implementation date.

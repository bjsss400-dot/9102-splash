# A Bigger Splash

A p5.js group interpretation of David Hockney's painting. This branch adds
Okun's first Perlin noise and randomness iteration to the group's current code.

## Run and controls

Open this project folder in VS Code and open `index.html` with Live Server.
The p5.js libraries load from a CDN, so an internet connection is required.

- Wait without moving the mouse to see the gentle natural breeze.
- Drag left or right to add the Input member's gust to that breeze.
- Click inside the pool to trigger the existing timed splash and ripples.
- Press `1`, `2`, `3`, `4` for day, sunset, night and sunrise.
- Audio is still a placeholder on this version. The on-screen music prompt and
  `M` control do not play music yet; the Audio member will complete them.

## Mechanic ownership and integration

| Area | File and responsibility |
| --- | --- |
| Perlin noise and randomness — Aokun Liu (Okun) | `perlin-random-mechanic.js`: natural breeze and saved frond variation in this iteration. |
| Time-based — Time member | `time-mechanic.js`: daylight colours, sky objects, splash phases and ripples. |
| User input — Input member | `input-controls.js`: clicks, keyboard controls and mouse gusts. `artwork-base.js`, `index.html` and `style.css` provide the shared scene and page. |
| Audio — Audio member | `audio-mechanic.js`: reserved for audio analysis and audio-driven behaviour. `sketch.js` connects the modules. |

`setupVariation()` and `updateWind()` keep the existing entry points.
Input writes `wind.gust`; Okun reads it and writes `wind.value`. Existing palms,
bushes, reflections, sky streaks and splash lean already read that shared value.
Frond colours continue to use Time's `lightColours` palette every frame.
This iteration changes no other member's JavaScript file or splash timing.

## Okun iteration 1 — natural wind and stable fronds

The starting point is the group's `main` commit `e1d5cac2`.
The scene, palm drawing structure, leaflets and painted splash already existed.
Okun's additions are:

1. `randomSeed(FROND_SEED)` and `random()` generate and save traits for 24 fronds
   during setup: length, curl, width, shade, softness and a distinct noise offset.
   Small ranges preserve the two palms' original proportions and green palette.
2. `noise()` adds one slow natural breeze to the mouse gust, so the scene moves
   gently even without dragging. Each frond also has a small independent flutter.
3. `deltaTime` advances the noise input in seconds. Long gaps are capped to avoid
   a sudden jump when returning to the browser tab.

Random values are not regenerated while drawing. The same seed reproduces the
leaf traits after refresh; it does not fix the noise field or the whole animation.
The first version intentionally leaves the pool texture hooks empty and keeps
the group's existing `scatter()`-based splash rendering. Water texture, floating
leaves and additional splash variation remain possible future iterations.

## Checks for this version

- Refresh: the leaf traits stay the same; no frame-by-frame random flicker.
- No input: the wind changes gently; both palms remain in their original places.
- Drag each way: the shared wind responds left and right, then the gust decays.
- Switch time of day: frond colours follow the shared palette.
- Click the pool repeatedly: the existing splash lifecycle and ripples still run.

## AI acknowledgement and references

OpenAI Codex assisted with the implementation, comments, integration checks and
this README for Okun's iteration 1. The previous scene and other mechanics are
retained from the group repository; their contributors should maintain their
own acknowledgements. Okun should review and understand the code before presenting it.

- [Artwork reference — The David Hockney Foundation](https://www.thedavidhockneyfoundation.org/artwork/3667)
- [p5.js noise](https://p5js.org/reference/p5/noise/)
- [p5.js random](https://p5js.org/reference/p5/random/)
- [p5.js randomSeed](https://p5js.org/reference/p5/randomSeed/)
- [p5.js deltaTime](https://p5js.org/reference/p5/deltaTime/)

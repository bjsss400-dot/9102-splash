# A Bigger Splash

A p5.js group interpretation of David Hockney's painting. This branch contains
Okun's first iteration, which adds Perlin noise and randomness to the group's
existing code.

## How to run it

Open this folder in VS Code and run `index.html` with Live Server. The p5.js
library loads from a CDN, so you need an internet connection.

- Leave the mouse still and the scene moves on its own with a gentle breeze.
- Drag left or right to add a gust on top of that breeze (Input member's part).
- Click on the pool to trigger the existing splash and ripples.
- Press `1`, `2`, `3` or `4` to switch between day, sunset, night and sunrise.
- Audio is still a placeholder in this version: the on-screen music prompt and
  the `M` key don't play anything yet. The Audio member will finish that part.

## Who works on what

| Area | File | Notes |
| --- | --- | --- |
| Perlin noise and randomness — Okun | `perlin-random-mechanic.js` | Natural breeze and saved frond variation (this iteration) |
| Time-based — Time member | `time-mechanic.js` | Daylight colours, sky objects, splash phases and ripples |
| User input — Input member | `input-controls.js` | Clicks, keyboard controls and mouse gusts |
| Shared scene / page | `artwork-base.js`, `index.html`, `style.css` | Base scene and layout |
| Audio — Audio member | `audio-mechanic.js` | Reserved for audio analysis and audio-driven behaviour |
| Module wiring | `sketch.js` | Connects the modules |

`setupVariation()` and `updateWind()` stay as the existing entry points. Input
writes `wind.gust`; I read that value and update `wind.value` from it. The palms,
bushes, reflections, sky streaks and splash lean already read `wind.value`, so
they all react together. Frond colours keep using Time's `lightColours` palette
each frame. I didn't change any other member's JavaScript file or the splash
timing in this iteration.

## Okun's iteration 1 — natural wind and stable fronds

I started from the group's `main` commit `e1d5cac2`, so the scene, palm drawing
structure, leaflets and painted splash were already there. My changes:

1. During `setup()`, `randomSeed(FROND_SEED)` and `random()` generate traits for
   the 24 fronds — length, curl, width, shade, softness and a noise offset. I
   kept the ranges small so the two palms keep their original proportions and
   green palette.
2. `noise()` adds one slow natural breeze on top of the mouse gust, so the scene
   moves gently even when nothing is dragged. Each frond also flutters a little
   on its own.
3. The noise input is advanced by `deltaTime` in seconds, and I cap long gaps so
   the scene doesn't jump when you come back to the tab.

The random traits are only generated once, not every frame, so refreshing with
the same seed reproduces the same leaf traits. The seed does not fix the noise
field or the whole animation.

For this first version I left the pool texture hooks empty and kept the group's
existing `scatter()`-based splash rendering. Water texture, floating leaves and
more splash variation can come in later iterations.

## What I checked

- Refreshing the page: the leaf traits stay the same, no frame-by-frame random
  flicker.
- With no input: the wind changes gently and both palms stay in their original
  places.
- Dragging left and right: the shared wind responds in the right direction, then
  the gust decays.
- Switching time of day: frond colours follow the shared palette.
- Clicking the pool repeatedly: the existing splash lifecycle and ripples still
  work.

## AI use and references

I used AI mainly to double-check how a few p5.js functions behave (e.g. `noise()`,
`randomSeed()`, `deltaTime`), to confirm the code was correct, and to help tidy up
the code logic and formatting at the end. The design and debugging of this iteration 
are my own.

The scene and other mechanics come from the group repository; the other members should
keep their own acknowledgements for their parts.

- [Artwork reference — The David Hockney Foundation](https://www.thedavidhockneyfoundation.org/artwork/3667)
- [p5.js noise](https://p5js.org/reference/p5/noise/)
- [p5.js random](https://p5js.org/reference/p5/random/)
- [p5.js randomSeed](https://p5js.org/reference/p5/randomSeed/)
- [p5.js deltaTime](https://p5js.org/reference/p5/deltaTime/)

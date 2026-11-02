# A Bigger Splash

A collaborative interactive artwork made with p5.js, based on David Hockney's *A Bigger Splash* (1967). The house, pool, palms and diving board are redrawn with code. Four mechanics introduce changing light, natural movement, sound and viewer interaction into the composition.

## Inspiration and visual approach

The starting point is the contrast between the painting's still architecture and its sudden splash. The clear shapes and large areas of colour give each mechanic room to be visible without losing the original composition. The viewer can disturb the water and act as an unseen diver, while wind and changing light keep the scene moving between interactions.

For the water, Hockney's pool paintings also informed the use of curved, connected reflection lines. These lines move continuously and become smaller towards the back of the pool. The effect is a painted interpretation of reflected light rather than a physical water simulation. The original artwork is documented by [The David Hockney Foundation](https://www.thedavidhockneyfoundation.org/artwork/3667).

## Integration status

**Checked on 3 November 2026.** The latest individual contributions have not all been merged into `main` yet. Main currently contains Aokun's second iteration; the latest reflection and falling-leaf work is on `perlin_noise_and_randomness_aokun_liu`. The audio branch, `9103-Zihuai-Liu`, contains the corrected music path and required sound files, which are still missing from main.

The contribution sections below describe the individual work, including features awaiting integration. Update this status once the final combined version has been merged and checked.

## How to run

1. Download or clone the repository and open the project folder in VS Code.
2. Open `index.html` using Live Server, or serve the folder with another local web server.
3. Open the local address in a desktop browser with a mouse and keyboard.
4. For the combined version, keep the `audio/` folder alongside `index.html`. Click **Play music** to start sound.

The page loads p5.js 1.9.4 and p5.sound 1.9.4 from a CDN, so an internet connection is needed. No build step is required. Use a web server rather than opening the HTML file directly, so the sound files can load correctly. The canvas is currently fixed at 660 × 660 pixels.

## Interaction guide

| Action | Effect |
| --- | --- |
| Leave the scene running | The light changes automatically and the palms move in a natural breeze. The latest Perlin version also adds moving reflection lines and falling leaves. |
| Drag left or right over the painting | Add wind in that direction. The palms and water details respond to the shared wind. |
| Move the pointer over the water without dragging | Leave small ripples behind the pointer. |
| Click inside the pool | Trigger a splash and expanding ripples. |
| Hold Space, then release | Bend the diving board and launch an unseen dive. Holding longer increases the charge. |
| Press `1`, `2`, `3` or `4` | Jump to day, sunset, night or sunrise. The automatic cycle continues afterwards. |
| Click **Play music**, or press `M` | Start, pause or resume music once the audio module and sound files are integrated. |
| Adjust **Board amplitude** | Change how strongly the board responds to music. This adjusts the visual response, not the playback volume. |

## Mechanic ownership

| Mechanic | Contributor | Main file | Contribution |
| --- | --- | --- | --- |
| Time-based | `chung-en` — full name to be added | `time-mechanic.js` | Day/night progression, scene palettes, sky objects, timed splashes and ripples, solar shadows and reflections. |
| User input | `bjsss400-dot` — full name to be added | `input-controls.js` | Mouse and keyboard controls, drag gusts, pointer ripples, dive charging and the board's spring movement. |
| Perlin noise and randomness | Aokun Liu (`bighothot1017`) | `perlin-random-mechanic.js` | Natural wind, stored frond variation, independent leaf movement, perspective water reflections and falling-leaf behaviour. |
| Audio | Zihuai Liu (`x1227309318-blip`) | `audio-mechanic.js` | Music amplitude analysis, music-driven board movement and sounds for charging, rebound and landing. |

### Time-based — chung-en

The current module uses an 80-second cycle to change the scene's colours and sky objects. It also manages splash stages and ripples, and draws shadows and reflections that respond to the lighting.

**To complete:** add the contributor's full name, the main design decisions, the timing techniques used, meaningful iteration links, and any additional references.

### User input — bjsss400-dot

The current module turns mouse dragging into gusts, draws ripples under the pointer, and uses mouse clicks and the Space key to trigger water interactions. A spring-like board motion provides feedback during and after a charged dive. Related scene and page work is in `artwork-base.js`, `index.html` and `style.css`.

**To complete:** add the contributor's full name, the reasons for these controls, meaningful iteration links, and any additional references. Confirm the interaction guide against the final merged version.

### Perlin noise and randomness — Aokun Liu

**File:** `perlin-random-mechanic.js`  
**Development branch:** [perlin_noise_and_randomness_aokun_liu](https://github.com/bjsss400-dot/9102-splash/tree/perlin_noise_and_randomness_aokun_liu)

#### Design intention

This mechanic adds variation to the natural parts of the scene while keeping the architecture and composition recognisable. Wind connects the palms, water and loose leaves. The movement continues without input, but a mouse drag gives the viewer a clear influence over its direction.

#### What Perlin noise controls

- Two slowly changing noise samples form the natural breeze. Each palm follows the shared wind with a slight delay, and separate noise offsets give its fronds individual movement.
- Noise deforms the connected water-reflection lines over time and varies their brightness. Nearby points sample nearby noise coordinates, so the lines bend smoothly instead of jumping between unrelated shapes.
- Noise adds gentle sideways sway and tipping to falling leaves, and small currents and bobbing after they reach the water.

#### What randomness controls

- During setup, `randomSeed(9103)` and `random()` generate and store traits for 24 palm fronds: length, curl, width, shade, softness and a noise offset. The stored traits prevent frame-by-frame shape flicker.
- Short water marks receive different starting positions, lengths, widths and opacities once during setup.
- Each falling-leaf batch contains 2–5 leaves with randomly chosen horizontal starting positions. Consecutive batches have different counts. Every leaf starts above the picture; none are created directly on the water.

In the latest falling-leaf version, size, base colour and the float/sink durations are fixed. Randomness chooses the batch count and sky positions; noise supplies the continuous variation in movement. The fixed random seed repeats the initial random choices, but does not fix the noise field or guarantee an identical animation after refresh.

#### Water and leaf implementation

The water pattern uses an irregular network of neighbouring cells. Each cell contains the area nearest to its centre; shared boundaries become curved reflection lines. The network is built once, then noise deforms it during drawing. A depth projection compresses distant lines and opens out those in the foreground. This gives the pattern a relationship to the pool's perspective rather than laying a flat pattern across the screen.

Reflection brightness reads the Time module's `dayPhase`. Sunlight produces stronger highlights; moonlight produces a weaker, cooler reflection. Both fade gradually as the corresponding light source approaches the horizon. `clip()` keeps the water details inside the pool.

Leaves follow three states: `falling`, `floating` and `sinking`. They fall from above the picture, settle onto the water, float for about 1.5 seconds, then fade and shrink over about 2.2 seconds to suggest sinking. Their movement follows the wind both in the air and on the surface. Near the sides, they slow down instead of jumping to the opposite edge. State transitions and elapsed time control this lifecycle; noise controls the motion within it.

`deltaTime` is converted to seconds for movement updates, with each step capped at 0.05 seconds to reduce large jumps after a tab interruption. `push()` and `pop()` isolate drawing styles and clipping from the other modules. Explicitly enabling a filled clipping mask also fixes airborne leaves disappearing after another module leaves both fill and stroke disabled.

#### Connection to the group code

The User input module writes `wind.gust`. This module reads that value, combines it with the natural breeze and writes `wind.value`. It also reads the Time module's palette and lighting phase, so the leaves and reflections belong to the same day/night scene.

The existing entry points, including `setupVariation()` and `updateWind()`, remain available to `sketch.js`. Water drawing functions are called by the shared scene. The palms' original structure and the existing splash renderer came from the group baseline; this contribution extends the natural motion and surface detail rather than claiming those baseline elements as new work.

#### Development and iterations

| Stage | Change and purpose | Commit |
| --- | --- | --- |
| Iteration 1 | Added a natural breeze and stored random frond traits, so the trees moved without input and their shapes remained stable. | [971c74e](https://github.com/bjsss400-dot/9102-splash/commit/971c74e9cb8f644c04f2444d9bb0a60461c574f7) |
| Iteration 2 | Increased the visibility of wind and individual frond movement, and added fine water marks and drifting surface leaves. | [b77babe](https://github.com/bjsss400-dot/9102-splash/commit/b77babe1a0c0d7581483c1e360e3d68ea523f23f) |
| Iteration 3 | Replaced permanently placed surface leaves with batches that fall, float and sink, giving the movement a complete lifecycle. | [22aa535](https://github.com/bjsss400-dot/9102-splash/commit/22aa53584c9c768c6792bc86b2fc3316eb0aa32b) |
| Further refinement — 4.4 | Developed connected perspective reflections with sunlight and moonlight; kept the leaves green, strengthened their wind response, fixed their visibility and ensured every leaf begins in the sky. | [7f7db78](https://github.com/bjsss400-dot/9102-splash/commit/7f7db78c1e9eef5c4522aa58ac528af66e3a03f3) |

#### Checks completed

The 1 November local integration preview combined this contribution with the then-current Time, Input and Audio code. Checks covered left/right wind, music playback, charged dives, all four lighting presets, and the falling/floating/sinking states without script errors. Separate checks also covered repeatable initial frond traits, continuous airborne-leaf visibility and leaf movement near the picture edges. These results apply to that preview; the final merged version should be checked again after further group changes.

### Audio — Zihuai Liu

The audio module measures the music's amplitude and uses it to move the board. It also supplies interaction sounds during charging, rebound and landing. The latest branch uses `audio/demo.wav` and `audio/splash.wav`.

**To complete:** explain the audio choices and amplitude mapping, add meaningful iteration links, and credit the creator, source and usage permission for each music or sound asset.

## Project structure and integration

Each mechanic has its own script. `sketch.js` runs setup, updates the mechanics and draws the scene. `artwork-base.js` provides the composition and calls the relevant drawing functions. `index.html` loads the libraries and scripts; `style.css` controls the page layout.

Time-based and User input development is currently on `main`. Perlin and Audio development also uses the personal branches listed above. A branch contains the shared files needed to run the work, so the presence of a file on someone's branch does not mean that person created it.

This is the shared group README. Each member should complete their section here, keeping the other members' contributions and the common instructions intact.

## References and asset credits

- [David Hockney Foundation — A Bigger Splash (1967)](https://www.thedavidhockneyfoundation.org/artwork/3667): source artwork for the composition, architecture, pool and splash.
- [p5.js `noise()`](https://p5js.org/reference/p5/noise/): smooth variation used for wind, water deformation and leaf movement.
- [p5.js `random()`](https://p5js.org/reference/p5/random/): selection of frond traits, water-mark properties, leaf counts and starting positions.
- [p5.js `randomSeed()`](https://p5js.org/reference/p5/randomSeed/): repeatable initial random choices.
- [p5.js `deltaTime`](https://p5js.org/reference/p5/deltaTime/): frame-time information used by the Perlin module's movement updates.
- [p5.js `clip()`](https://p5js.org/reference/p5/clip/): masks that keep water details and airborne leaves within their drawing areas.

**To complete:** each member should add any other code or technique references used in their contribution. Add the exact artwork credits for the additional pool-texture reference images, and the audio creator/source/licence details before submission.

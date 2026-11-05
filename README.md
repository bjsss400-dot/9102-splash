# A Bigger Splash

A collaborative interactive artwork made with p5.js, based on David Hockney's *A Bigger Splash* (1967). The house, pool, palms and diving board are redrawn with code. Four mechanics introduce changing light, natural movement, sound and viewer interaction into the composition.

## Inspiration and visual approach

The starting point is the contrast between the painting's still architecture and its sudden splash. The clear shapes and large areas of colour give each mechanic room to be visible without losing the original composition. The viewer can disturb the water and act as an unseen diver, while wind and changing light keep the scene moving between interactions.

For the water, Hockney's pool paintings also informed the use of curved, connected reflection lines. These lines move continuously and become smaller towards the back of the pool. The effect is a painted interpretation of reflected light rather than a physical water simulation. The original artwork is documented by [The David Hockney Foundation](https://www.thedavidhockneyfoundation.org/artwork/3667).

## How to run

1. Download or clone the repository and open the project folder in VS Code.
2. Open `index.html` using Live Server, or serve the folder with another local web server.
3. Open the local address in a desktop browser with a mouse and keyboard.
4. For the combined version, keep the `audio/` folder alongside `index.html`. Click **Play music** to start sound.

The page loads p5.js 1.9.4 and the accompanying p5.sound add-on from a CDN, so an internet connection is needed. No build step is required. Use a web server rather than opening the HTML file directly, so the sound files can load correctly. The canvas is currently fixed at 660 × 660 pixels.

## Interaction guide

| Action | Effect |
| --- | --- |
| Leave the scene running | The light changes automatically and the palms move in a natural breeze. The latest Perlin version also adds moving reflection lines and falling leaves. |
| Drag left or right over the painting | Add wind in that direction. The palms and water details respond to the shared wind. |
| Move the pointer over the water without dragging | Leave small ripples behind the pointer. |
| Click inside the pool | Trigger a splash and expanding ripples. |
| Hold Space, then release | Bend the diving board and launch an unseen dive. Holding longer increases the charge. |
| Press `1`, `2`, `3` or `4` | Jump to day, sunset, night or sunrise. The automatic cycle continues afterwards. |
| Click **Play music**, or press `M` | Start, pause or resume background music. Dive sound effects remain available when music is paused. |
| Adjust **Board amplitude** | Change how strongly the board responds to music. This adjusts the visual response, not the playback volume. |

## Techniques

We rebuilt David Hockney’s A Bigger Splash in p5.js using rectangles, lines and custom shapes. In draw(), we update the scene and then draw it from back to front. This keeps the house in front of the palms and the diving board above the moving water, preserving the composition as the viewer interacts with it.
- Time and light. We use millis() to run an 80-second cycle through day, sunset, night and sunrise. lerp() blends the RGB values of the sky, building and pool between four palettes. The same clock moves the sun and moon. Shadows stretch across the deck as the sun gets lower. Splashes have their own timers, so pressing a number key to change the light leaves a splash in motion.
- Wind and water. We use randomSeed() and random() during setup to give each palm frond a consistent length and curl. During animation, noise() produces a gradually changing breeze. Dragging sideways adds a gust to that breeze, so the palms sway and the floating leaves drift in response to the same wind.
- The unseen diver. Moving the pointer across the pool leaves faint rings, while clicking creates a splash at that spot. Holding Space bends the board and reveals a dotted arc towards the landing point. Releasing Space starts the dive. A longer hold sends the unseen diver farther and produces a larger splash, letting the viewer act out the moment suggested by the painting.
- Sound and movement. We use p5.Amplitude to measure the music’s loudness and smooth the readings with lerp(). Louder passages bend the idle board further. During a dive, the viewer’s input takes priority. A creak accompanies the bend, a short tone marks the rebound, and a recorded splash marks the landing.

## Mechanic ownership

| Mechanic | Contributor | Main file | Description |
| --- | --- | --- | --- |
| Time-based | `Chen Chung-En`  | `time-mechanic.js` | Moves the scene through an 80-second day and night cycle. As the sun and moon move, the colours, shadows and pool reflections change. A separate timer controls how each splash rises, falls and leaves fading ripples. |
| User input | `Jinsa Bai`  | `input-controls.js` | Lets viewers click the pool to create a splash, move the pointer across the water to leave ripples, or drag sideways to create wind. Holding Space bends the board. Releasing it makes the board spring back and sends the unseen diver into the pool. |
| Perlin noise and randomness | `Aokun Liu`| `perlin-random-mechanic.js` | Gives each palm frond its own shape and uses Perlin noise to create a changing breeze. The fronds sway at slightly different rates, while floating leaves and surface marks drift across the pool in the same wind. |
| Audio | `Zihuai Liu` | `audio-mechanic.js` | Uses the music’s loudness to control how far the idle diving board bends. During a dive, a creak accompanies the charge, a short tone marks the board’s rebound, and a recorded splash plays when the diver lands. |

## Audio assets and development history

- `audio/demo.wav`: an 8-second program-generated demonstration loop, according to the audio development record. It is distinct from the archived 24-second Poolside Study track; this 8-second file's generation script is not included.
- `audio/splash.wav`: an approximately 1.36-second sound effect downloaded online and supplied by the audio contributor, originally named `y2362.wav`. Its original download page, creator and reuse terms have not yet been recorded. Source attribution remains incomplete.
- [Audio development record](audio-iterations/README.md): two historical implementations. Archive folders are not loaded by the final artwork and are not standalone copies of the complete group project.

## AI acknowledgement

- Anthropic Claude helped us write parts of artwork-base.js and input-controls.js. We used measurements from the painting and our reference images to place the objects. Claude helped turn those measurements into drawing code using picX() and picY(), including the window reflections, director’s chair and bendable board. It also helped implement the dive and pointer ripples. The dive moves through three states (ready, charging and flying), and a spring calculation makes the board wobble after release. The pointer reuses a fixed set of rings that expand and fade.
- OpenAI ChatGPT (Codex) helped structure time-mechanic.js and integrate its lighting, shadows, reflections and splash timing. The shadow code projects silhouettes away from the sun. The reflection code flips and compresses the scene objects vertically and clips them to the pool. A separate timer controls each splash as it rises, peaks, falls and fades.
- OpenAI Codex helped create the initial audio implementation, including amplitude mapping, playback controls and charge/rebound/landing feedback. The analyser reads the backing track and uses its smoothed loudness to adjust the board’s bend. The code removes the previous audio offset before applying the next one so motion does not build up across frames. Web Audio oscillators synthesize the charge and rebound sounds; state transitions trigger the short effects once. Codex also assisted with the archived prototype's peak detector, demo-music synthesis, tests and documentation, as recorded in that archive. These are separate from the final board-response implementation.

## External references

[David Hockney Foundation — A Bigger Splash (1967)](https://www.thedavidhockneyfoundation.org/artwork/3667): source artwork for the composition, architecture, pool and splash.

- [p5.Amplitude](https://p5js.org/reference/p5.sound/p5.Amplitude/): track amplitude analysis; visual response uses loudness, not FFT frequency bands.
- [loadSound](https://v1.p5js.org/reference/p5/loadSound/): load music and the recorded landing effect.
- [userStartAudio](https://v1.p5js.org/reference/p5/userStartAudio/): enable audio following a user gesture.
- [lerp](https://p5js.org/reference/p5/lerp/): smooth the visual audio level.
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API): oscillator, low-pass filter, gain nodes and scheduled pitch/gain changes for interaction effects.

`p5.js noise()`: smooth variation used for wind, water deformation and leaf movement.
// This technique is from https://p5js.org/reference/p5/noise/

`p5.js random()`: selection of frond traits, water-mark properties, leaf counts and starting positions. // This technique is from https://p5js.org/reference/p5/random/

`p5.js randomSeed()`: repeatable initial random choices. // This technique is from https://p5js.org/reference/p5/randomSeed/

`p5.js deltaTime`: frame-time information used by the Perlin module's movement updates. // This technique is documented at https://p5js.org/reference/p5/deltaTime/

`p5.js clip()`: masks that keep water details and airborne leaves within their drawing areas. // This technique is from https://p5js.org/reference/p5/clip/

`p5.js millis()`: measures elapsed time for the 80-second day cycle and times each splash and ripple independently. // This technique is from https://p5js.org/reference/p5/millis/

`MDN Object.keys()`: lists the named colours in the day palette so the same loop can blend every scene colour between time periods. // This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys

`MDN Math.pow()`: raises the sun’s or moon’s calculated elevation to the power of 0.75 to shape its path across the sky. // This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/pow

`p5.js applyMatrix()`: projects the house, palm and chair silhouettes away from the sun and lengthens their shadows when the sun is low. // This technique is from https://p5js.org/reference/p5/applyMatrix/

`p5.js drawingContext`: gives the sketch access to the underlying 2D canvas context so it can set opacity for a whole drawing layer. // This technique is from https://p5js.org/reference/p5/drawingContext/

`MDN Canvas globalAlpha`: controls shadow opacity and makes the reflected house, palms and chair fainter at night. // This technique is from https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalAlpha

`p5.js beginShape()`: starts a custom polygon for each face of the bending diving board. // This technique is from https://p5js.org/reference/p5/beginShape/

`p5.js vertex()`: traces one edge of the board forwards and the opposite edge backwards to form its curved outline. // This technique is from https://p5js.org/reference/p5/vertex/

`MDN JavaScript functions`: explains how the sketch saves the original deck and water drawing functions so it can insert shadow and reflection layers in the correct order. // This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions

`MDN default parameters`: supplies a default splash strength and water position when a call to triggerSplash() omits them. // This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters

`MDN Number.isFinite()`: checks that the splash coordinates and strength are finite numbers before the animation starts. // This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite

`MDN Array.splice()`: removes expired ripples and discards the oldest entries when the list exceeds 36. // This technique is from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice

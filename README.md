# A Bigger Splash

A p5.js group interpretation of David Hockney's *A Bigger Splash* (1967).

## AI acknowledgement — user input and shared artwork

The user input contribution and its shared scene drawing were developed with AI assistance. The acknowledgements previously included in the source comments are collected here.

### Claude (Anthropic)

Claude assisted with:

- The initial dive interaction: ready, charging and flying states; the spring motion of the diving board; and the pointer-following water ripples in `input-controls.js`.
- The drawing code in `artwork-base.js`, including picture-relative layout coordinates (`picX` and `picY`), reflections in the glass, the director's chair and the bending diving board. The visual layout follows Hockney's painting and the team's reference images, as described in the original scene acknowledgement.

### OpenAI Codex (ChatGPT)

OpenAI Codex assisted with:

- Measuring hold duration in milliseconds, sampling the final duration on release, and mapping short holds to small splashes near the board and longer holds to larger splashes farther away.
- Direct mouse pressing on the board, matching mouse and keyboard releases to the active hold, and previewing the landing position.
- Making short-hold splashes smaller and removing the pool-click splash trigger, together with the related instructions in `sketch.js`.
- The small-splash scaling adjustment in `drawOneSplash()` in `perlin-random-mechanic.js`. This acknowledgement covers that input-related adjustment; it does not describe the other member's Perlin noise and randomness work.
- The regression checks in `tests/input-charge.test.cjs` for hold timing, input handling, splash size and integration with the group modules.
- Moving these source-comment acknowledgements into this README.
- Adding submerged pool walls, a shaded floor and perspective-scaled refracted-light curves to `artwork-base.js`, using the supplied pool reference image and the group's existing day/night palette.

This section records assistance for the user input contribution and its shared artwork. Other members' existing acknowledgements remain with their contributions.

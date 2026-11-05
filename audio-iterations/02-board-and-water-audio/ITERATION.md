# Iteration 2 — Board and water audio

Contributor: Zihuai Liu
Implementation previously added in `149717a`; snapshot archived in `cecc651` on 23 October 2026.

## Design change

Version 1 used music peaks to trigger different splash sizes. Version 2 connects audio to the group's board and Space-key dive. It does not retain automatic music-triggered splashes.

1. **Music-driven board:** smooth the track amplitude and add a visual offset to the idle board. A slider controls response strength.
2. **Charging:** sustain a filtered sawtooth sound while charging. Charge affects pitch and gain.
3. **Rebound:** play one synthesized tone on the transition from charging to flying.
4. **Landing:** play the supplied recording, originally named `y2362.wav` and stored as `audio/splash.wav`. Charge changes gain, not pitch.
5. **Visual tuning:** development notes record increasing the music response coefficient from 0.42 to 0.95, plus an offset of `charge * 0.45` while charging.
6. **Connection fix:** development notes record replacing chained audio-node connections with separate `connect()` calls after an error interrupted the scene.

## Development notes

Playback controls, the response slider and demonstration music were followed by charge, rebound and landing feedback. Earlier synthesized splash attempts were replaced with the supplied WAV. A previously supplied MOV had no audio track and was not used as the final sound source. These are development decisions; source snapshots of every intermediate experiment are not included.

## Archived files and current application

The archived JavaScript and two WAV files preserve the version in `cecc651`. The root directory remains the runnable application. The two WAV files still match their root counterparts, but the root JavaScript subsequently changed: status controls are now created before loading the landing sound. The historical JavaScript has not been updated to match it.

Run the root `index.html` through Live Server or another HTTP server. Click to start music, use M to pause or resume it, and hold/release Space to dive. The slider changes visual response; M controls background music independently of dive effects.

The module depends on the group's `board`, `diver`, `updateBoard()` and p5.sound. Its wrapper removes the previous visual offset before the next spring calculation.

## Sources and AI assistance

- `demo.wav` is described in the development record as a program-generated demonstration loop, distinct from the 24-second version-1 track.
- The contributor confirms that `splash.wav` was downloaded online. Its original page, creator and reuse terms have not yet been recorded; attribution remains incomplete.
- OpenAI Codex assisted with the implementation; the acknowledgement remains in the archived source.

Earlier notes reported syntax/browser checks and matching hashes at the time of archiving. Those historical checks do not establish that this snapshot is identical to the current application or verified in every browser.

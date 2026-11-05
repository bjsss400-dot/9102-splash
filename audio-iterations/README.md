# Audio development record

Contributor: Zihuai Liu

This directory contains two historical audio implementations and their development notes. The running artwork uses the root `audio-mechanic.js` and `audio/`; `index.html` does not load either archive.

| Version | Design | Archive commit | Files |
| --- | --- | --- | --- |
| 1 | Measured music peaks trigger small, medium and large splashes. | `611ecc3` | [Music-driven splashes](01-music-driven-splashes/ITERATION.md) |
| 2 | Music moves the idle board; charging, release and landing receive sound feedback. | `cecc651` | [Board and water audio](02-board-and-water-audio/ITERATION.md) |

The first implementation was preserved from the contributor's original `bigger-splash-audio 2` package. The second had already been added in `149717a` before its archive was created. Archive commits record preservation of existing work, rather than when each idea was first developed. No third implementation is included.

The archived JavaScript, audio, tests and music-generation tool are historical snapshots. Their documentation is maintained to distinguish them from the current application. Later root-level integration includes the corrected music path, restored assets and initialization of status controls before sound-loading callbacks.

See each version's AI acknowledgement and source notes. Existing Git commits retain their original messages and contents; these English documentation updates do not rewrite that history.

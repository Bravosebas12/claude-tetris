# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris implemented in vanilla JavaScript, HTML5 Canvas, and CSS. No dependencies, no build step, no package.json.

## Running

No install/build needed. Open directly or serve statically:

```bash
open index.html                 # macOS, just opens the file
python3 -m http.server 8000     # or: npx serve .
```

There is no test suite, linter, or bundler configured for this project.

## Architecture

Three files, no modules — everything is loaded via a single `<script src="game.js">` and runs against globals.

- **`index.html`** — DOM shell: main `<canvas id="board">` (300×600, i.e. `COLS*BLOCK` × `ROWS*BLOCK`), a `<canvas id="next-canvas">` for the piece preview, HUD spans (`#score`, `#lines`, `#level`), and the pause/game-over `#overlay`.
- **`style.css`** — dark/retro arcade visual theme.
- **`game.js`** — all game logic, structured around one big mutable state block (`board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId`) declared at the top and reassigned by `init()`.

Key mechanics in `game.js`:

- **Board**: `ROWS × COLS` matrix; each cell is `0` (empty) or an index 1–7 into `COLORS`/`PIECES` identifying which tetromino locked there.
- **Pieces**: square matrices in `PIECES`. Rotation (`rotateCW`) is a transpose + row reversal, not a lookup table of rotation states.
- **Collision** (`collide`): bounds + board-overlap check used by movement, rotation, ghost projection, and spawn.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` columns until one doesn't collide.
- **Game loop** (`loop`): driven by `requestAnimationFrame`; accumulates `dt` into `dropAccum` and advances the piece one row once `dropAccum >= dropInterval`.
- **Line clears** (`clearLines`): scans bottom-up, splices full rows out and unshifts empty rows in; re-checks the same index (`r++`) since rows shift down.
- **Scoring/leveling**: `LINE_SCORES = [0, 100, 300, 500, 800]` × current `level`; hard drop adds 2 pts/row dropped, soft drop 1 pt/row. Level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level-1)*90)`.
- **Ghost piece** (`ghostY`): projects `current` straight down until it would collide, drawn at `globalAlpha = 0.2`.
- Game over is triggered inside `spawn()` when the newly spawned piece immediately collides.

Tunable constants live at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS*BLOCK` × `ROWS*BLOCK`).

Note: the README (`README.md`) is written in Spanish and documents controls, scoring, and customization in more detail — consult it for user-facing behavior questions.

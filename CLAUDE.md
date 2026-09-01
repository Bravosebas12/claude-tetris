# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-page Tetris implementation in vanilla JavaScript, HTML5 Canvas, and CSS. No dependencies, no build step, no package.json.

## Running / testing

There is no build/test/lint tooling. To run the game, open `index.html` directly or serve the directory statically:

```bash
open index.html                 # macOS, direct file open
python3 -m http.server 8000     # or: npx serve .
```

There are no automated tests. Verify changes by loading the page in a browser and playing.

## Architecture

Three files, all loaded directly by `index.html` (no modules/bundler):

- `index.html` — DOM structure: main `<canvas id="board">` (300×600, i.e. `COLS×BLOCK` × `ROWS×BLOCK`), a `<canvas id="next-canvas">` for the next-piece preview, the score/lines/level panel, and the pause/game-over overlay.
- `style.css` — dark/retro arcade styling for the panel and overlay.
- `game.js` — all game logic, in one file, using module-level `let` state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) rather than a class or state container.

### Key mechanics in `game.js`

- **Board**: `ROWS × COLS` matrix; each cell is `0` (empty) or a piece color index (1–8).
- **Pieces**: `PIECES` are square matrices; rotation is done via `rotateCW` (transpose + reverse), not by storing pre-rotated states. Piece 8 (`NUT`) is a 3×3 "nut" with a real empty center (`[[8,8,8],[8,0,8],[8,8,8]]`) — its top row can seal that hole once it lands, permanently blocking that row from `clearLines` until the rows above it clear. Rendered via `drawNut` (a single filled ring with a cut-out circle) instead of the per-cell `drawBlock` loop.
- **Collision**: `collide(shape, ox, oy)` checks board bounds and cell overlap.
- **Wall kicks**: `tryRotate` rotates then tries offsets `[0, -1, 1, -2, 2]` until one doesn't collide.
- **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulates elapsed time in `dropAccum`, and drops the piece one row (or locks it) once `dropAccum >= dropInterval`.
- **Locking/clearing**: `lockPiece` → `merge` (writes piece into `board`) → `clearLines` (scans bottom-up, splices full rows, unshifts empty rows at top, re-checks the same row index after a splice) → `spawn`.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` × `level`; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row.
- **Level/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Ghost piece**: `ghostY()` projects the current piece straight down to its landing row; drawn at `globalAlpha = 0.2`.
- **Game over**: triggered in `spawn()` when a freshly spawned piece immediately collides.

If you change `COLS`, `ROWS`, or `BLOCK` in `game.js`, also update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).

### Controls (keydown handler at bottom of `game.js`)

`ArrowLeft`/`ArrowRight` move, `ArrowUp`/`KeyX` rotate, `ArrowDown` soft drop, `Space` hard drop, `KeyP` pause (works even mid-pause/game-over; other keys are ignored while paused or game over).

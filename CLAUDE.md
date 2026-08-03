# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris implemented in vanilla JavaScript, HTML5 Canvas, and CSS. No dependencies, no build step, no package.json. README.md is in Spanish and is the authoritative feature/behavior spec.

## Running

There is no build or install step. Open `index.html` directly, or serve it with any static server, e.g.:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`. There are no tests, linter, or package manager configured in this repo.

## Architecture

Three files, no modules/bundler — `index.html` loads `game.js` as a single classic script relying on global scope and top-level `let`/`const` state.

- **`index.html`** — DOM shell: `<canvas id="board">` (300×600, the play field) and `<canvas id="next-canvas">` (120×120, next-piece preview), plus the score/lines/level panel and the pause/game-over overlay.
- **`style.css`** — dark/retro arcade visual theme only.
- **`game.js`** — all game logic, in one file:
  - **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a piece color index `1–7`.
  - **Pieces**: `PIECES` are fixed square matrices (I/O/T/S/Z/J/L). Rotation is `rotateCW` (transpose + reverse), not precomputed rotation states.
  - **Collision**: `collide(shape, ox, oy)` is the single source of truth for whether a shape placement is legal — used by movement, rotation, ghost-piece projection, and the drop loop.
  - **Wall kicks**: `tryRotate()` rotates then tries offsets `[0, -1, 1, -2, 2]` against `collide` before giving up on the rotation.
  - **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulates `dropAccum` and drops the piece one row (or calls `lockPiece()`) once `dropAccum >= dropInterval`.
  - **Locking a piece**: `lockPiece()` → `merge()` writes the piece into `board`, then `clearLines()`, then `spawn()`.
  - **Line clears / scoring**: `clearLines()` scans bottom-up, removes full rows, unshifts empty rows at the top. Score uses `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 points/row dropped, soft drop adds 1 point/row.
  - **Leveling**: `level` increases every 10 lines; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
  - **Ghost piece**: `ghostY()` projects the current piece straight down via `collide` and is drawn with `globalAlpha = 0.2` in `draw()`.
  - **Game over**: detected in `spawn()` when a freshly spawned piece already collides — triggers `endGame()` and shows the overlay.
  - All game state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, timing vars) lives in module-level `let` bindings reset by `init()`; there is no state container/class.

## Tunable constants (game.js)

`COLS` (10), `ROWS` (20), `BLOCK` (30px cell size), `COLORS` (per-piece palette), `LINE_SCORES`, `dropInterval` (initial, 1000ms). If `COLS`, `ROWS`, or `BLOCK` change, the `<canvas id="board">` `width`/`height` in `index.html` must be updated to match (`COLS × BLOCK` and `ROWS × BLOCK`).

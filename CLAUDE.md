# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-page vanilla JavaScript Tetris implementation. No build step, no package manager, no dependencies — `index.html`, `style.css`, and `game.js` are loaded directly by the browser.

## Running

```bash
open index.html        # macOS, just open the file
# or serve it:
python3 -m http.server 8000
```

There is no test suite, linter, or build/compile step. Verify changes by opening the game in a browser and playing it.

## Architecture

All game /logic lives in `game.js` as a single flat module with module-level mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.), reset in `init()` and driven by a `requestAnimationFrame` loop (`loop()`).

- **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a piece-type index `1–7` used to look up color in `COLORS`.
- **Pieces**: `PIECES` defines each tetromino as a square matrix of type indices. `randomPiece()` deep-copies a shape and centers it at spawn. Rotation (`rotateCW`) transposes + reverses rows; `tryRotate()` applies it with basic wall-kick offsets (`[0, -1, 1, -2, 2]`), keeping the first non-colliding kick.
- **Collision** (`collide`): the single source of truth for whether a shape at a given offset is legal (out of bounds or overlapping a filled cell). Movement, rotation, ghost-piece projection, and spawn-blocking (game over) all go through it.
- **Locking a piece**: `lockPiece()` → `merge()` (stamp shape into `board`) → `clearLines()` (bottom-up full-row sweep, scores via `LINE_SCORES[cleared] * level`, recomputes `level`/`dropInterval`) → `spawn()` (promote `next` to `current`, generate new `next`, check game-over via `collide`).
- **Rendering** (`draw`, `drawNext`, `drawBlock`, `drawGrid`): pure redraw each frame from current state onto two `<canvas>` elements (`board`, `next-canvas`) — no diffing. Ghost piece is `ghostY()` (project `current` straight down until collision) drawn at `alpha = 0.2`.
- **Input**: a single `keydown` listener switches on `e.code` for movement/rotation/drop/pause; disabled while `paused` or `gameOver`.

Tunable constants sit at the top of `game.js`: `COLS`, `ROWS`, `BLOCK` (must stay in sync with the `<canvas id="board">` `width`/`height` in `index.html`, i.e. `COLS×BLOCK` and `ROWS×BLOCK`), `COLORS`, `LINE_SCORES`, and the initial `dropInterval`.

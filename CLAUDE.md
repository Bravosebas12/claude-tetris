# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page vanilla JavaScript Tetris implementation. No build step, no package manager, no dependencies — three files (`index.html`, `style.css`, `game.js`) that run directly in a browser via Canvas 2D.

## Running the game

There is no build/lint/test tooling in this repo. To run it:

```bash
open index.html                # macOS, opens directly — works fine since there are no modules/fetches
# or, for a local server:
python3 -m http.server 8000    # then visit http://localhost:8000
```

## Architecture

Everything lives in `game.js` (~300 lines, single file, no modules). The game state is a set of module-level `let` variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) mutated directly by functions — there is no state container or class structure.

Key pieces, in the order data flows through them:

- **Board model**: `board` is a `ROWS × COLS` matrix (`createBoard`); each cell is `0` (empty) or a color index `1–7` identifying which piece locked there.
- **Pieces**: `PIECES` holds the 7 tetromino shapes as square matrices. `randomPiece()` builds `{ type, shape, x, y }`. Rotation is a matrix transpose + reverse (`rotateCW`), not a lookup table of rotation states.
- **Collision** (`collide(shape, ox, oy)`): the single source of truth for "can the piece be here" — used for movement, rotation, ghost-piece projection, and drop.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` columns until one doesn't collide, else the rotation is discarded.
- **Game loop** (`loop`, driven by `requestAnimationFrame`): accumulates elapsed time in `dropAccum`; once it exceeds `dropInterval`, the piece drops a row or locks via `lockPiece()`. `lockPiece` → `merge()` (bakes the piece into `board`) → `clearLines()` → `spawn()` (promotes `next` to `current`, generates a new `next`; if the new piece immediately collides, `endGame()` fires).
- **Ghost piece** (`ghostY`): projects `current` straight down until it would collide, drawn at `globalAlpha = 0.2` in `draw()`.
- **Scoring/leveling**: `clearLines()` uses `LINE_SCORES = [0, 100, 300, 500, 800]` × `level`; level increments every 10 lines cleared, and `dropInterval = max(100, 1000 - (level-1) * 90)` recomputes drop speed each time.
- **Rendering**: two canvases — `#board` (main play field) and `#next-canvas` (next-piece preview) — both drawn from scratch each frame in `draw()` / `drawNext()` via `drawBlock()`.
- **Input**: a single `keydown` listener switches on `e.code` (arrows, `KeyX` for rotate, `Space` for hard drop, `KeyP` for pause), guarded by `paused`/`gameOver`.

## Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell size in px), `COLORS`, `LINE_SCORES`, initial `dropInterval`. If you change `COLS`/`ROWS`/`BLOCK`, also update the `width`/`height` attributes of `<canvas id="board">` in `index.html` to match (`COLS × BLOCK` by `ROWS × BLOCK`).

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build step. Open directly or serve statically:

```bash
open index.html                  # macOS — direct open
python3 -m http.server 8000      # local server → http://localhost:8000
npx serve .                      # alternative with Node
```

## Architecture

Single-page vanilla JS game. Three files, no dependencies, no bundler.

- **`index.html`** — DOM skeleton: `<canvas id="board">` (300×600 px) for the playfield, `<canvas id="next-canvas">` (120×120 px) for piece preview, HUD elements (`#score`, `#lines`, `#level`), and `#overlay` for PAUSE / GAME OVER states.
- **`style.css`** — dark/retro theme. Overlay uses `backdrop-filter: blur`.
- **`game.js`** — all game logic (~305 lines, `'use strict'`).

### game.js internals

| Concept | Implementation |
|---|---|
| Board state | `board`: `ROWS×COLS` matrix; `0` = empty, `1–7` = piece color index |
| Piece object | `{ type, shape, x, y }` where `shape` is a 2-D array |
| Rotation | `rotateCW()` — transpose + reverse rows; `tryRotate()` attempts kicks `[0, -1, 1, -2, 2]` |
| Collision | `collide(shape, ox, oy)` — checks bounds and board occupancy |
| Game loop | `requestAnimationFrame`-based; accumulates `dropAccum` against `dropInterval` |
| Line clear | `clearLines()` — splices full rows and unshifts empty row; updates score/level/speed |
| Speed curve | `dropInterval = max(100, 1000 − (level−1) × 90)` ms |
| Ghost piece | `ghostY()` projects piece down; drawn at `globalAlpha = 0.2` |
| Scoring | `LINE_SCORES = [0, 100, 300, 500, 800] × level`; hard drop +2/cell, soft drop +1/row |

### Key state variables (module-level `let`)

`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `animId`

### Game flow

```
init() → createBoard() + spawn() + requestAnimationFrame(loop)
loop(ts) → accumulate dt → drop/lock → draw() → rAF(loop)
lockPiece() → merge() → clearLines() → spawn()
spawn() → if collide on entry → endGame()
```

## Tunable constants (top of `game.js`)

`COLS` (10), `ROWS` (20), `BLOCK` (30 px), `COLORS` (7-color palette), `LINE_SCORES`.  
If `COLS`, `ROWS`, or `BLOCK` change, update canvas `width`/`height` in `index.html` accordingly (`COLS×BLOCK` / `ROWS×BLOCK`).

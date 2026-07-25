# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build step or dependencies. Open directly or serve locally:

```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .
```

Then open `http://localhost:8000`.

## Architecture

Three files, no framework:

- **`index.html`** — DOM structure: `<canvas id="board">` (300×600px) for the playfield, `<canvas id="next-canvas">` (120×120px) for the piece preview, a sidebar with score/lines/level HUD, and a shared overlay div for both PAUSE and GAME OVER states.
- **`style.css`** — Dark/retro arcade theme using flexbox, CSS variables, and `backdrop-filter` on the overlay.
- **`game.js`** — All game logic (~300 lines, `'use strict'`, no modules).

### game.js internals

The board is a `ROWS × COLS` matrix where `0` = empty, `1–7` = piece color index. A piece is `{ type, shape, x, y }` where `shape` is a 2D array of color indices.

Key functions and their roles:

| Function | Role |
|---|---|
| `collide(shape, ox, oy)` | Bounds + overlap check |
| `rotateCW(shape)` | Transpose + reverse rows |
| `tryRotate()` | Rotate with wall-kick offsets `[0, -1, 1, -2, 2]` |
| `ghostY()` | Projects piece straight down to find landing row |
| `lockPiece()` | `merge()` → `clearLines()` → `spawn()` |
| `clearLines()` | Bottom-up scan; splices full rows and unshifts empty ones |
| `loop(ts)` | `requestAnimationFrame` loop; accumulates `dt` against `dropInterval` |
| `init()` | Full reset; called on load and on restart button click |

Speed formula: `dropInterval = Math.max(100, 1000 − (level − 1) × 90)` ms. Level increments every 10 lines.

### Tunable constants in game.js

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`. If `COLS`, `ROWS`, or `BLOCK` change, the `<canvas>` dimensions in `index.html` must match (`COLS × BLOCK` and `ROWS × BLOCK`).

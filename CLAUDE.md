# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build step or dependencies. Open directly or serve statically:

```bash
# Windows
start index.html

# Local server (recommended to avoid file:// quirks)
python3 -m http.server 8000
# or
npx serve .
```

## Architecture

This is a zero-dependency, single-page Tetris game. All logic lives in three files:

- `index.html` — DOM structure: two `<canvas>` elements (`#board` 300×600, `#next-canvas` 120×120), HUD spans, and the pause/game-over overlay.
- `style.css` — Dark/retro theme; no logic.
- `game.js` — Entire game (~305 lines, `'use strict'`).

### game.js internals

**State**: all mutable state is module-level vars — `board` (2D array `ROWS×COLS`, values 0 or color index 1–7), `current`/`next` piece objects `{type, shape, x, y}`, and numeric counters for score/lines/level.

**Key functions and their roles**:
- `collide(shape, ox, oy)` — bounds + overlap check; used everywhere before any move.
- `tryRotate()` — clockwise rotation (`rotateCW`) with 5-offset wall-kick attempts `[0, -1, 1, -2, 2]`.
- `lockPiece()` → `merge()` + `clearLines()` + `spawn()` — the piece-settle pipeline.
- `ghostY()` — projects current piece straight down; result used by both `draw()` and `hardDrop()`.
- `loop(ts)` — `requestAnimationFrame` loop; accumulates `dropAccum` and calls `lockPiece()` or moves down when `dropAccum >= dropInterval`.
- `draw()` — clears canvas, draws grid, locked board cells, ghost (alpha 0.2), then current piece.
- `init()` — full reset; also called by the restart button.

**Speed formula**: `dropInterval = Math.max(100, 1000 − (level − 1) × 90)` ms. Level increments every 10 lines.

**Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` × level. Hard drop adds 2 pts/row; soft drop adds 1 pt/row.

### Canvas sizing constraint

If `COLS`, `ROWS`, or `BLOCK` are changed in `game.js`, the `<canvas id="board">` dimensions in `index.html` must be updated to match (`COLS × BLOCK` wide, `ROWS × BLOCK` tall).

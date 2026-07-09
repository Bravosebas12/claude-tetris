# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build step. Open `index.html` directly in a browser, or serve it with any static server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000`.

## Architecture

Three files, no dependencies, no bundler:

- **`index.html`** — DOM structure: `<canvas id="board">` (300×600 px) for the main board, `<canvas id="next-canvas">` (120×120 px) for the piece preview, a sidebar panel with score/lines/level, and a shared overlay `<div id="overlay">` for both PAUSE and GAME OVER states.
- **`style.css`** — Dark retro-arcade theme. Layout is flexbox. Overlays use `backdrop-filter`.
- **`game.js`** — All game logic (~305 lines, `'use strict'`, no modules).

### `game.js` internals

**State** is held in module-level `let` variables: `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `lastTime`, `animId`.

**Board** is a `ROWS × COLS` array where `0` = empty and `1–7` = piece color index.

**Piece object**: `{ type, shape, x, y }` where `shape` is a 2D matrix of color indices.

**Key functions**:
| Function | What it does |
|---|---|
| `collide(shape, ox, oy)` | Bounds + overlap check |
| `rotateCW(shape)` | Transpose + reverse rows |
| `tryRotate()` | Rotation with ±1/±2 column wall kicks |
| `ghostY()` | Projects drop landing row |
| `lockPiece()` | `merge → clearLines → spawn` |
| `clearLines()` | Scans bottom-up; splices full rows; updates score/level/speed |
| `loop(ts)` | `requestAnimationFrame` loop; accumulates `dropAccum`; calls `draw()` |
| `init()` | Full reset; called on load and on restart |

**Speed formula**: `dropInterval = Math.max(100, 1000 − (level − 1) × 90)` ms.

**Scoring**: `LINE_SCORES[cleared] × level`; hard drop adds `2 pts/cell`, soft drop adds `1 pt/row`.

### Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`. If you change `COLS`, `ROWS`, or `BLOCK`, update the `width`/`height` attributes on `<canvas id="board">` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).

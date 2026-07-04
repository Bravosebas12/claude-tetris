# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build step, no dependencies. Open directly in a browser:

```bash
# Linux
xdg-open index.html

# Or serve locally (recommended to avoid browser file:// quirks)
python3 -m http.server 8000
# then open http://localhost:8000
```

## Architecture

Three files, no framework:

- `index.html` — DOM structure: a 300×600 `<canvas id="board">` for the board, a second `<canvas id="next-canvas">` for the next-piece preview, a HUD panel, and an overlay div for pause/game-over states.
- `style.css` — Dark/retro arcade theme using flexbox, CSS variables, and `backdrop-filter` on overlays.
- `game.js` — All game logic (~300 lines, `'use strict'`, no modules). Key globals: `board` (ROWS×COLS matrix, cells hold 0 or a color index 1–7), `current` and `next` (piece objects with `shape`, `x`, `y`, `type`).

### Core game.js flow

```
init() → spawn() → requestAnimationFrame(loop)
loop(ts): accumulate dt → drop or lockPiece() → draw()
lockPiece(): merge() → clearLines() → spawn()
spawn(): if new piece immediately collides → endGame()
```

### Key functions

| Function | Purpose |
|---|---|
| `collide(shape, ox, oy)` | Bounds + overlap check against `board` |
| `rotateCW(shape)` | Transpose + row-reverse to rotate clockwise |
| `tryRotate()` | Rotation with wall kicks (offsets: 0, ±1, ±2) |
| `ghostY()` | Projects current piece straight down for ghost rendering |
| `clearLines()` | Bottom-up scan; splices full rows, unshifts empty row |

### Tunable constants (top of game.js)

`COLS` (10), `ROWS` (20), `BLOCK` (30 px), `COLORS`, `LINE_SCORES`. If `COLS`, `ROWS`, or `BLOCK` change, the canvas `width`/`height` attributes in `index.html` must match (`COLS×BLOCK` and `ROWS×BLOCK`).

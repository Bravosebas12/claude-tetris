# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Vanilla Tetris. HTML5 Canvas + CSS + JS. No build step, no package manager, no dependencies, no tests.

## Running

```bash
open index.html                # macOS, direct file open
python3 -m http.server 8000    # or: npx serve .   /   php -S localhost:8000
```
No install/build/lint/test commands exist in this repo.

## Architecture

Three files, no modules:

- `index.html` — DOM shell: `#board` canvas (300×600, 10×20 grid at BLOCK=30px), `#next-canvas` preview (120×120), HUD spans (`#score`/`#lines`/`#level`), pause/game-over `#overlay`.
- `style.css` — dark/retro theme only, no logic-relevant classes beyond `.hidden` toggling the overlay.
- `game.js` — entire game logic, single global scope (`'use strict'`, no imports/exports).

### State
All mutable game state lives in one set of module-level `let` bindings declared at the top of `game.js` (`board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId`) — not encapsulated in a class or object. `init()` resets all of them and kicks off the RAF loop; `restartBtn` calls `init()` directly.

### Board/piece model
- `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or `1–8` (piece-color index into `COLORS`, index 8 = the non-standard "ring" piece).
- Pieces (`PIECES`) are fixed square matrices; rotation is done by transposing (`rotateCW`), not by lookup tables.
- `current`/`next` pieces are `{ type, shape, x, y }`.

### Core flow
`init()` → `requestAnimationFrame(loop)` → each frame accumulates `dt`, drops the piece one row when `dropAccum >= dropInterval`, calls `draw()`, and reschedules itself. Locking a piece (`lockPiece`) runs `merge()` → `clearLines()` → `spawn()`; `spawn()` promotes `next` to `current`, generates a new `next`, and calls `endGame()` if the new piece immediately collides.

Collision (`collide`), rotation with wall-kicks (`tryRotate`, kick offsets `[0,-1,1,-2,2]`), and the ghost-piece landing position (`ghostY`) are the three functions most edits to gameplay feel will touch.

Input is a single `keydown` listener switching on `e.code` (arrows + `KeyX` rotate + `Space` hard drop + `KeyP` pause), gated by `paused`/`gameOver`.

### Tunable constants (top of `game.js`)
`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, initial `dropInterval`, `RING_CHANCE` (spawn probability of the 3×3 hollow-center "ring" piece, index `RING`/8 in `PIECES`/`COLORS`). If `COLS`/`ROWS`/`BLOCK` change, also update the `#board` canvas `width`/`height` in `index.html` to match (`COLS×BLOCK` by `ROWS×BLOCK`).

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla-JS Tetris (HTML5 Canvas). Three files: `index.html`, `style.css`, `game.js`. No `package.json`, no bundler, no transpiler, no test/lint tooling — do not introduce any without being asked.

## Running

```bash
open index.html              # macOS; the file:// path works, there are no module imports
python3 -m http.server 8000  # or any static server, then http://localhost:8000
```

Verification is manual in a browser: there is no test suite and nothing to build.

## Architecture

All game state lives in module-level `let` bindings in `game.js` (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `animId`). `init()` resets every one of them and is also the restart handler — any new piece of state must be reset there or it leaks across games.

- **Board**: `ROWS × COLS` array of ints. `0` = empty; `1–7` index into both `COLORS` and `PIECES`, so those two arrays must stay index-aligned (both start with a `null` placeholder at index 0).
- **Pieces**: square-ish matrices rotated by transpose+row-reverse (`rotateCW`). There is no SRS kick table — `tryRotate` just tries x-offsets `[0,-1,1,-2,2]` and gives up.
- **Collision**: `collide(shape, ox, oy)` is the single gate for every movement, rotation, ghost projection, and the spawn-time game-over check. It reads the global `board`.
- **Loop**: `requestAnimationFrame` accumulator in `loop()`. Gravity fires when `dropAccum >= dropInterval`; drawing happens every frame. Speed: `dropInterval = max(100, 1000 - (level-1)*90)`, level rises every 10 lines, both recomputed inside `clearLines()`.
- **Rendering**: full clear + redraw each frame in draw order grid → locked board → ghost (`alpha 0.2`) → current piece. `drawNext()` is *not* on the frame loop; it is called only from `spawn()`.

### Canvas sizing is duplicated

`COLS`, `ROWS`, `BLOCK` in `game.js` and the `width`/`height` attributes of `<canvas id="board">` in `index.html` must be changed together (`COLS*BLOCK` × `ROWS*BLOCK`). Same for `drawNext`'s hardcoded `NB = 30` and the 4×4 centering math against `#next-canvas` (120×120).

### rAF lifecycle

`endGame()` and `togglePause()` call `cancelAnimationFrame(animId)`, but that cancel is *not* what stops the loop when game-over is reached from inside `loop()` (gravity → `lockPiece` → `spawn` → `endGame`): there `animId` is the frame already firing, so the cancel is a no-op. The actual stop is the `if (gameOver || paused) return;` guard in `loop()`, placed after `draw()` (so the final state still renders) and before the reschedule, because `lockPiece()` can flip the flag mid-frame. Any new code path that ends or suspends the game must set one of those flags — cancelling `animId` alone is not enough. `init()` also cancels before starting, to avoid duplicated rAF chains.

## Conventions

- `'use strict'` at the top of `game.js`; ES6+ syntax, no modules — `index.html` loads the script with a plain `<script src>` tag.
- User-facing strings (overlay text, README, HTML copy) are **Spanish**; identifiers and comments in code are English/Spanish-mixed. Keep new UI text in Spanish.
- HUD updates are explicit: call `updateHUD()` after mutating `score`, `lines`, or `level`.
- Styling is plain CSS with a dark palette hardcoded in `style.css` (accent `#7aa2f7`, background `#0f0f17`); no CSS variables or preprocessor.

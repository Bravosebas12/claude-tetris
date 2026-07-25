# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla JS Tetris. No build tools, no package manager, no dependencies. Three files: `index.html` (DOM/canvas), `style.css` (dark/retro theme), `game.js` (all game logic, ~300 lines).

## Running / testing

No build step. Open directly or serve statically:

```bash
open index.html                 # macOS, just opens the file
python3 -m http.server 8000     # or: npx serve .
```

There is no test suite, linter, or bundler configured. Verify changes manually in a browser.

## Architecture

Everything lives in `game.js` as top-level functions operating on module-level mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc. — declared at line 43, reset in `init()`). There are no classes/modules — this is intentional for the project's "vanilla, no framework" style; keep additions consistent with that pattern rather than introducing a class hierarchy or module system.

Key pieces, in `game.js`:

- **Board model**: `ROWS × COLS` matrix, each cell is `0` (empty) or a color index `1–7` identifying which piece locked there.
- **Pieces**: `PIECES` array of square matrices (`I` is 4×4, others 3×3, `O` is 2×2). Rotation is `rotateCW` — a transpose-based 90° CW rotation, not a lookup table of rotation states (so it always rotates around the shape's own matrix, no SRS-style kick tables beyond the simple one below).
- **Collision**: `collide(shape, ox, oy)` checks bounds and overlap against `board`. Used for movement, rotation, gravity, and ghost-piece projection — any new movement feature should reuse this rather than duplicating bounds checks.
- **Wall kicks**: `tryRotate()` applies `rotateCW` then tries offsets `[0, -1, 1, -2, 2]` until one doesn't collide.
- **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulates `dt` into `dropAccum`, and advances the piece down (or locks it) once `dropAccum >= dropInterval`.
- **Locking**: `lockPiece()` → `merge()` (bake piece into `board`) → `clearLines()` → `spawn()` next piece.
- **Line clearing**: `clearLines()` scans bottom-up, splices full rows out and unshifts empty rows at top; updates score/level/dropInterval via `updateHUD()`.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` × current `level`; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row.
- **Level/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level-1)*90)` ms.
- **Ghost piece**: `ghostY()` projects `current` straight down until it would collide; drawn at `globalAlpha = 0.2` in `draw()`.
- **Rendering**: `draw()` clears and redraws grid + locked board + ghost + current piece every frame on the main canvas; `drawNext()` renders the preview piece on the separate `next-canvas`.
- **Game over**: triggered in `spawn()` if the newly spawned piece immediately collides; shows the overlay via `endGame()`.
- **Input**: single `keydown` listener (arrow keys move/rotate/soft-drop, `Space` hard-drops, `P` toggles pause). Pausing/game-over both use the same `#overlay` element, differentiated by `overlayTitle` text.

### Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (px per cell), `COLORS` (per-piece palette), `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, the `<canvas id="board">` `width`/`height` in `index.html` must be updated to match (`COLS × BLOCK`, `ROWS × BLOCK`).

Note: the README (in Spanish) duplicates much of this architecture description and the controls table — keep both in sync if behavior changes.

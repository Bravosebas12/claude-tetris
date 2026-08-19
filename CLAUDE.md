# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Tetris implementation in vanilla JavaScript using the HTML5 Canvas API. No dependencies, no build step, no framework — just `index.html`, `style.css`, and `game.js`. There is no `package.json`.

## Running the game

Open `index.html` directly in a browser, or serve it with any static file server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`.

There are no build, lint, or test commands — none exist in this project.

## Architecture

All game logic lives in `game.js` (~300 lines, global scope, no modules). It cooperates with two other files:

- `index.html` — DOM structure: a `300×600` `<canvas id="board">` for the playfield, a `120×120` `<canvas id="next-canvas">` for the next-piece preview, the score/lines/level panel, and a pause/game-over overlay.
- `style.css` — dark/retro arcade visual theme (flexbox layout, monospace HUD, `backdrop-filter` overlays).
- `game.js` — everything else, structured as follows:

**Board model**: a `ROWS × COLS` (20×10) matrix where each cell is `0` (empty) or a color index `1–7` identifying which piece locked there.

**Pieces**: the 7 tetrominoes are defined as square matrices in `PIECES`, each cell value doubling as a `COLORS` index. Rotation is done via matrix transpose+reverse (`rotateCW`), not by storing pre-rotated states.

**Collision & rotation**: `collide(shape, ox, oy)` checks board bounds and overlap with locked cells. `tryRotate()` rotates the current piece and attempts wall kicks at offsets `[0, -1, 1, -2, 2]` columns, keeping the first non-colliding result.

**Game loop**: `loop(timestamp)`, driven by `requestAnimationFrame`, accumulates elapsed time (`dropAccum`) and drops the current piece one row once it exceeds `dropInterval`; otherwise locks the piece via `lockPiece()`.

**Locking & line clears**: `lockPiece()` calls `merge()` (writes the piece into the board), `clearLines()` (scans bottom-up, splices full rows and unshifts empty ones at the top), then `spawn()` (promotes `next` to `current`, generates a new `next`, and triggers `endGame()` if the new piece immediately collides).

**Scoring & leveling**: line clears score via `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by the current level; hard drop adds 2 points/cell, soft drop 1 point/row. Level increments every 10 lines cleared; `dropInterval` scales as `max(100, 1000 - (level - 1) * 90)` ms.

**Rendering**: `draw()` clears and redraws the grid, locked board cells, a semi-transparent ghost piece (`ghostY()` projects the current piece's landing row), and the current piece, every frame. `drawNext()` renders the preview canvas separately.

**Input**: a single `keydown` listener maps arrow keys/`X`/`Space`/`P` to movement, rotation, soft/hard drop, and pause — see the Controles table in `README.md` for the full mapping.

## Tunable constants

Key constants near the top of `game.js`: `COLS`, `ROWS`, `BLOCK` (cell pixel size), `COLORS`, `LINE_SCORES`, and the initial `dropInterval`. If `COLS`, `ROWS`, or `BLOCK` change, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).

## Notes

- The README (`README.md`) is written in Spanish and contains the same architecture/flow description in more detail, plus the full controls table — consult it for user-facing documentation.
- Code and UI text elsewhere in the project are also in Spanish; keep new UI-facing strings consistent with that.

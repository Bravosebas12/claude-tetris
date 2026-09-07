# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Tetris implementation in vanilla JavaScript, HTML5 Canvas, and CSS — no dependencies, no build step, no package manager. The entire game lives in three files: `index.html`, `style.css`, `game.js`.

## Running the game

There is no build/lint/test tooling. To run:

```bash
# Open directly
start index.html      # Windows

# Or serve locally (recommended, avoids any file:// quirks)
python3 -m http.server 8000
npx serve .
```

Then open the page (or `http://localhost:8000`) in a browser and verify changes manually — there is no automated test suite.

## Architecture

All game logic lives in `game.js` (~300 lines), structured as one flat set of functions operating on module-level state (no classes, no framework):

- **Board model**: `board` is a `ROWS × COLS` (20×10) matrix; each cell is `0` (empty) or a color index `1–7` identifying the piece that occupies it.
- **Pieces**: `PIECES` defines the 7 tetrominoes as square matrices. `randomPiece()` creates the active/next piece; `rotateCW()` rotates via transpose + row-reverse.
- **Collision**: `collide(shape, ox, oy)` checks board bounds and overlap with locked cells; used for movement, rotation, spawn, and ghost-piece projection.
- **Wall kicks**: `tryRotate()` rotates the current piece, then tries offsets `[0, -1, 1, -2, 2]` columns until a non-colliding position is found.
- **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulates elapsed time in `dropAccum`, and advances the piece one row (or locks it) once `dropInterval` is exceeded.
- **Locking / clearing**: `lockPiece()` → `merge()` writes the piece into `board`, then `clearLines()` sweeps bottom-to-top, splicing full rows out and unshifting empty rows in.
- **Scoring/leveling**: `LINE_SCORES = [0, 100, 300, 500, 800]` × `level`; hard drop adds 2 pts/cell, soft drop 1 pt/row. Level increments every 10 lines; `dropInterval = max(100, 1000 - (level-1)*90)` ms.
- **Ghost piece**: `ghostY()` projects the current piece straight down to its landing row; drawn at `globalAlpha = 0.2` in `draw()`.
- **Rendering**: `draw()` redraws the grid, locked board, ghost piece, and current piece on the main canvas every frame; `drawNext()` renders the next-piece preview on a separate canvas.
- **Input**: a single `keydown` listener dispatches arrow keys / `X` (rotate) / `Space` (hard drop) / `P` (pause), gated by `paused`/`gameOver` state.
- **Lifecycle**: `init()` resets all state and starts the loop; `spawn()` promotes `next` to `current` and generates a new `next`, triggering `endGame()` if the new piece immediately collides.

Tunable constants sit at the top of `game.js`: `COLS`, `ROWS`, `BLOCK` (cell size in px), `COLORS`, `LINE_SCORES`, and the initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, the `<canvas id="board">` `width`/`height` in `index.html` must be updated to match (`COLS × BLOCK`, `ROWS × BLOCK`).

The README (`README.md`, in Spanish) has additional detail on controls and game flow.

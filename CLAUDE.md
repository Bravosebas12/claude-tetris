# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Tetris implementation in vanilla JavaScript, HTML5 Canvas, and CSS. No dependencies, no build step, no `package.json`. The entire game lives in three files:

- `index.html` — DOM structure: the main `<canvas id="board">` (300×600, 10×20 grid of 30px blocks), the `<canvas id="next-canvas">` preview, HUD elements (`#score`, `#lines`, `#level`), and the pause/game-over overlay.
- `style.css` — dark/retro arcade visual theme.
- `game.js` — all game logic (~300 lines, single file, no modules).

## Running the game

There's no build/test/lint tooling. Just serve or open the files directly:

```bash
# Open directly
start index.html       # Windows

# Or serve locally (any static server works)
python3 -m http.server 8000
npx serve .
```

Then open in a browser (or `http://localhost:8000` if serving). To verify changes, open `index.html` in a browser and play — there is no automated test suite.

## Architecture

Everything is global state and top-level functions in `game.js` — no classes, no modules, no build step. Key pieces:

- **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or an index 1–7 into `COLORS`/`PIECES` identifying which tetromino locked there.
- **Pieces**: `PIECES` defines each tetromino as a square matrix of color indices. `current` and `next` are `{ type, shape, x, y }` objects; `randomPiece()` creates new ones.
- **Rotation**: `rotateCW(shape)` transposes + reverses rows. `tryRotate()` applies it and, on collision, attempts wall kicks via `kicks = [0, -1, 1, -2, 2]` (small horizontal offsets) before giving up.
- **Collision**: `collide(shape, ox, oy)` checks board bounds and overlap with locked cells — the single source of truth used by movement, rotation, and drop logic.
- **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulates elapsed time in `dropAccum`, and advances the piece down one row (or locks it) once `dropAccum >= dropInterval`.
- **Locking a piece**: `lockPiece()` → `merge()` (writes the piece into `board`) → `clearLines()` → `spawn()` (promotes `next` to `current`, generates a new `next`; if the new piece immediately collides, calls `endGame()`).
- **Line clearing / scoring**: `clearLines()` scans bottom-up, splicing out full rows and unshifting empty ones at the top. Score uses `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row. `level` increments every 10 lines, and `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Ghost piece**: `ghostY()` projects `current`'s landing row by repeatedly testing `collide` downward; drawn at `globalAlpha = 0.2`.
- **Rendering**: `draw()` clears and redraws the grid, locked board, ghost piece, and current piece every frame onto `#board`; `drawNext()` renders the preview piece onto `#next-canvas`.
- **Input**: a single `keydown` listener handles arrows (move/soft-drop), `ArrowUp`/`KeyX` (rotate), `Space` (hard drop), `KeyP` (pause, works even while paused/game-over — other keys are ignored in that state).

## Tunable constants (in `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell size px), `COLORS`, `LINE_SCORES`, `dropInterval` (initial fall speed). If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK` by `ROWS × BLOCK`).

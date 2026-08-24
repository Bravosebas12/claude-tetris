# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A classic Tetris implementation in vanilla JavaScript with HTML5 Canvas. No dependencies, no build process, no package.json — just three files that cooperate: `index.html`, `style.css`, `game.js`.

## Running the game

There is no build/lint/test tooling. To run:

```bash
start index.html       # Windows: open directly in a browser
```

Or serve it locally (needed if you add features requiring `fetch`/modules with strict CORS):

```bash
python3 -m http.server 8000
npx serve .
php -S localhost:8000
```

There are no automated tests. Verify changes manually by opening the game in a browser and checking behavior (movement, rotation, line clears, scoring, pause/game-over overlays).

## Architecture

All game logic lives in `game.js` (~300 lines), organized as global state + pure-ish functions rather than classes:

- **Board model**: `board` is a `ROWS × COLS` matrix (20×10). Each cell is `0` (empty) or an index 1–7 into `COLORS`, identifying which piece type occupies it.
- **Pieces**: `PIECES` defines the 7 tetrominoes as square matrices. `current` and `next` are piece instances `{ type, shape, x, y }`. Rotation is done via `rotateCW` (transpose + row reverse), not by storing rotation states.
- **Collision** (`collide`): checks board bounds and existing fixed blocks; used for movement, rotation, spawning, and ghost-piece projection.
- **Wall kicks** (`tryRotate`): after rotating, tries horizontal offsets `[0, -1, 1, -2, 2]` until one doesn't collide, else the rotation is discarded.
- **Game loop** (`loop`): driven by `requestAnimationFrame`; accumulates elapsed time in `dropAccum` and advances the piece one row once `dropInterval` is exceeded.
- **Locking** (`lockPiece` → `merge` + `clearLines` + `spawn`): fixes the current piece into `board`, clears completed rows (scanned bottom-up, with the same row index re-checked after a splice since rows shift down), then spawns the next piece.
- **Scoring/leveling**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 pts/row, soft drop 1 pt/row. Level increments every 10 lines; `dropInterval = max(100, 1000 - (level-1)*90)`.
- **Ghost piece** (`ghostY`): projects `current` straight down until it would collide, drawn at low alpha in `draw()`.
- **Rendering**: `draw()` redraws the whole board canvas every frame (grid, locked blocks, ghost, current piece); `drawNext()` renders the next-piece preview canvas separately.
- **Game over**: triggered in `spawn()` when a freshly spawned piece immediately collides.

Control flow: keyboard events (`keydown`) mutate `current`/game state directly, then the next `draw()` call (from the running `loop`) reflects the change — there's no separate render-on-input path.

Tunable constants live at the top of `game.js` (`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval`). If `COLS`, `ROWS`, or `BLOCK` change, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).

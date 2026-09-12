# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Tetris implementation in vanilla JavaScript using the HTML5 Canvas API. No dependencies, no build step, no package manager — just `index.html`, `style.css`, and `game.js`.

## Running the game

There is no build/lint/test tooling. Open `index.html` directly in a browser, or serve it with any static server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`.

## Architecture

Everything lives in `game.js` as top-level state and functions (no modules, no classes) operating on a small set of shared globals: `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `animId`.

- **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or an index 1–7 into `COLORS`/`PIECES` identifying which tetromino occupies it.
- **Pieces**: `PIECES` defines the 7 tetrominoes as square matrices. Rotation (`rotateCW`) is done by transposing + reversing rows — there's no separate rotation-state table, the shape matrix itself is rotated in place.
- **Collision** (`collide`): checks a shape against board bounds and already-locked cells; it's the single primitive used by movement, rotation, and drop logic.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` and takes the first that doesn't collide, else discards the rotation.
- **Game loop** (`loop`, driven by `requestAnimationFrame`): accumulates elapsed time in `dropAccum` and advances the piece one row (or locks it via `lockPiece`) once `dropInterval` is exceeded.
- **Locking a piece** (`lockPiece`): `merge()` bakes the current shape into `board`, `clearLines()` removes completed rows (and rechecks the same row index after splicing, since rows above shift down), then `spawn()` promotes `next` to `current` and generates a new `next`. If the newly spawned piece immediately collides, `endGame()` fires.
- **Ghost piece** (`ghostY`): projects straight down from the current position to find the landing row; drawn at low alpha in `draw()`.
- **Scoring/leveling**: `LINE_SCORES[cleared] * level` on line clear; level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)`.
- **Rendering**: `draw()` redraws the whole board canvas every frame (grid → locked blocks → ghost → current piece); `drawNext()` renders the next-piece preview on a separate small canvas.
- **Input**: a single `keydown` listener switches on `e.code` for movement/rotation/drop/pause; disabled while `paused` or `gameOver`.

## Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell pixel size), `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).

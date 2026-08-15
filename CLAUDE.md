# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-page Tetris implementation in vanilla JavaScript, HTML5 Canvas, and CSS. No dependencies, no build step, no package.json — three files: `index.html`, `style.css`, `game.js`.

## Running / testing

There is no build, lint, or test tooling. To run the game, serve the directory and open it in a browser (opening `index.html` directly also works since there are no modules or fetch calls):

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`. Verify changes manually in the browser — there is no automated test suite.

## Architecture

All game logic lives in `game.js` as top-level functions operating on module-level mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) — there are no classes or modules.

- **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a color index `1–7` identifying which piece type occupies it.
- **Pieces**: `PIECES` defines the 7 tetrominoes as square matrices of color indices. `randomPiece()` clones a shape and centers it horizontally at `y = 0`. Rotation (`rotateCW`) is a transpose + row reversal, not a lookup table of rotation states.
- **Collision** (`collide`): checks board bounds and existing filled cells for a given shape at a given offset. Used for movement, rotation, ghost-piece projection, and spawn-collision (game-over) checks — this is the one function nearly everything else calls into.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` in order and keeps the first that doesn't collide.
- **Locking pipeline**: `lockPiece()` → `merge()` (writes piece into `board`) → `clearLines()` (scans bottom-up, splices full rows, unshifts empty rows, updates score/level/dropInterval) → `spawn()` (promotes `next` to `current`, generates a new `next`, and triggers `endGame()` if the new piece already collides at spawn).
- **Game loop** (`loop`, driven by `requestAnimationFrame`): accumulates elapsed time in `dropAccum`; once it exceeds `dropInterval`, the piece drops one row or locks. Every frame calls `draw()` regardless.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` indexed by lines cleared at once, multiplied by `level`. Hard drop adds 2 points per row dropped; soft drop adds 1 point per row.
- **Leveling**: `level` increases every 10 lines; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Rendering**: `draw()` clears and redraws the grid, locked board cells, the ghost piece (`ghostY()` projects `current` straight down, drawn at `globalAlpha = 0.2`), then the current piece — in that order, onto the `#board` canvas. `drawNext()` renders the upcoming piece onto a separate `#next-canvas`.
- **Input**: a single `keydown` listener switches on `e.code` (arrows for move/soft-drop, `ArrowUp`/`KeyX` for rotate, `Space` for hard drop, `KeyP` for pause) and is gated by `paused`/`gameOver`.

Tunable constants at the top of `game.js`: `COLS`, `ROWS`, `BLOCK` (px per cell), `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A vanilla-JavaScript Tetris game (HTML5 Canvas + CSS). No build step, no dependencies, no `package.json`, no framework. Three source files do everything: `index.html`, `style.css`, `game.js`.

## Running

There is nothing to build or install. Either open `index.html` directly in a browser, or serve the directory statically:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

There is no test suite, linter, or build command — verification is manual, by playing the game in a browser.

## Architecture (`game.js`)

All game logic lives in `game.js` (~300 lines, single global scope, `'use strict'`). Key things to understand before editing:

- **Board model**: `board` is a `ROWS × COLS` matrix. Each cell is `0` (empty) or a color index `1–7`. The color index is also the piece-type identity — `COLORS` and `PIECES` are both 1-indexed arrays whose index `0` is `null`, so a cell's value directly maps to its color and origin piece.
- **Pieces** are square matrices (`PIECES[1..7]`). Rotation is computed, not stored: `rotateCW` transposes + reverses. `tryRotate` applies wall kicks by attempting horizontal offsets `[0, -1, 1, -2, 2]` and keeping the first that doesn't collide.
- **Collision** (`collide(shape, ox, oy)`) is the single source of truth for all movement, rotation, ghost projection, drops, and game-over detection. Anything that moves a piece checks `collide` first.
- **Game loop** (`loop`) is `requestAnimationFrame`-driven, accumulating `dropAccum` and dropping one row when it exceeds `dropInterval`. When the piece can't drop, `lockPiece` → `merge` → `clearLines` → `spawn`. If a freshly spawned piece already collides, `endGame` fires.
- **Mutable game state** is a single `let` declaration on line ~43 (`board, current, next, score, ...`). `init()` resets all of it and is the entry point (called on load and by the restart button).
- **Rendering**: `draw()` redraws every frame — grid, locked board, ghost piece (`globalAlpha 0.2`), then the current piece. `drawNext()` renders the preview canvas only when a piece spawns. `drawBlock` is the shared cell renderer for both canvases.

## DOM contract (`index.html` ↔ `game.js`)

`game.js` looks up these element IDs at load time: `board`, `next-canvas`, `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`. Renaming any of these requires updating both files.

The main canvas size is hardcoded in `index.html` and must equal `COLS × BLOCK` by `ROWS × BLOCK` (currently 300 × 600). **If you change `COLS`, `ROWS`, or `BLOCK` in `game.js`, update the `<canvas id="board">` width/height in `index.html` to match**, or rendering will be clipped or scaled.

## Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell pixel size), `COLORS` (per-piece palette), `LINE_SCORES` (`[0,100,300,500,800]`, multiplied by level), and the initial `dropInterval` (1000ms). Speed scales as `max(100, 1000 − (level − 1) × 90)`; level increases every 10 lines cleared.

## Note

README.md and in-game UI text are in Spanish. Match that convention for user-facing strings.

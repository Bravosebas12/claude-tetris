# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris in vanilla JavaScript + HTML5 Canvas. Three files, no dependencies, no build step, no tests, no `package.json`.

## Running

Open `index.html` directly, or serve statically (`python3 -m http.server 8000`, `npx serve .`). There is nothing to install, compile, or lint — after editing, reload the browser.

## Architecture

`game.js` is a single non-module `<script>` loaded at the end of `<body>`, so everything lives in global scope and the DOM element lookups at the top of the file run after the markup exists. Do not move the script tag into `<head>` or add `type="module"` without reworking those lookups.

### The color-index contract

`PIECES[n]` cells contain the literal value `n` (the I piece is made of `1`s, the O piece of `2`s, …), and that same value indexes `COLORS[n]`. Board cells store `0` for empty or the piece index otherwise. So one number carries three meanings: piece type, occupancy, and color. Both `PIECES[0]` and `COLORS[0]` are `null` padding to keep the indexing 1-based. Adding or reordering a piece means editing both arrays in lockstep and keeping each shape matrix filled with its own index.

### State and lifecycle

All mutable state is module-level `let` variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `animId`). `init()` is the single reset point and doubles as the restart-button handler — any new state variable must be initialized there, not just declared.

`loop()` is a `requestAnimationFrame` accumulator: it adds `dt` to `dropAccum` and steps the piece down when `dropAccum >= dropInterval`. Pause works by *cancelling* the frame rather than gating inside the loop, so resuming must reset `lastTime = performance.now()` first — otherwise the first `dt` after resume is the whole paused duration.

### Piece flow

`spawn()` promotes `next` to `current` and generates a new `next`; if the freshly spawned piece already collides it calls `endGame()`. Note that `spawn()` continues and draws the preview after `endGame()`, and the loop is stopped by `cancelAnimationFrame` rather than by an early return. `lockPiece()` is the merge → `clearLines()` → `spawn()` chain, reached from gravity, soft drop, and hard drop alike.

Rotation is transpose-and-reverse (`rotateCW`) plus a simplified wall kick: `tryRotate()` tries horizontal offsets `[0, -1, 1, -2, 2]` and silently abandons the rotation if all collide. This is not SRS — there are no per-piece kick tables and no rotation-state tracking.

`collide()` deliberately allows `ny < 0` (above the board) so pieces can spawn/rotate partially off the top.

### Rendering

Everything redraws every frame in `draw()`: grid, locked board, ghost piece at `ghostY()` with `alpha 0.2`, then the current piece. `drawBlock()` is shared by both canvases and takes the cell size as a parameter, so the preview canvas reuses it with `NB = 30` over an assumed 4×4 area (centered via `offX`/`offY`).

### Coupled constants

`<canvas id="board">` in `index.html` is hard-coded at `300 × 600`. Changing `COLS`, `ROWS`, or `BLOCK` in `game.js` requires updating those attributes to `COLS × BLOCK` and `ROWS × BLOCK`. Likewise `#next-canvas` is `120 × 120`, matching 4 × `NB`.

Scoring: `LINE_SCORES[cleared] * level`, plus 2/cell for hard drop and 1/row for soft drop. Level is `floor(lines / 10) + 1` and speed is `max(100, 1000 - (level - 1) * 90)` ms — both recomputed only inside `clearLines()`.

## Conventions

- User-facing strings (overlay text, README, HTML) are in Spanish; code identifiers and comments are English-leaning. Keep new UI text Spanish.
- The file is `'use strict'` ES6+ written for the browser directly — no transpilation, so avoid syntax that needs a build step.

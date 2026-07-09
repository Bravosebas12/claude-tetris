# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla JavaScript Tetris implementation using HTML5 Canvas. No dependencies, no build step, no package.json — just `index.html`, `style.css`, and `game.js`.

## Running the game

There is no build or test tooling. To run:

```bash
open index.html            # macOS, direct file open
npx serve .                 # or: python3 -m http.server 8000
```

Then open the served URL in a browser. Any change to `game.js`/`style.css`/`index.html` just needs a browser refresh.

## Architecture

Everything lives in `game.js` (~300 lines), organized around a single global game-loop driven by `requestAnimationFrame`:

- **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a piece color index (1–7).
- **Pieces**: `PIECES` are square matrices; `rotateCW` rotates via transpose + row-reverse.
- **Collision**: `collide(shape, ox, oy)` checks board bounds and overlap with locked cells.
- **Wall kicks**: `tryRotate` retries the rotation at `±1`/`±2` column offsets before giving up.
- **Game loop**: `loop(ts)` accumulates elapsed time in `dropAccum` and drops the piece one row once `dropInterval` is exceeded.
- **Line clears**: `clearLines` scans bottom-to-top, removing full rows and unshifting empty ones at the top.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop = 2 pts/cell, soft drop = 1 pt/row.
- **Level/speed**: level increases every 10 lines; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Ghost piece**: `ghostY()` projects the current piece straight down; drawn at `globalAlpha = 0.2`.

Control flow: `init()` builds the board, seeds `next`, calls `spawn()`, and starts the `requestAnimationFrame` loop. `spawn()` colliding immediately triggers `endGame()`. Keyboard input (`keydown`) drives movement, rotation, soft/hard drop, and pause.

## Tunable constants (top of game.js)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK` by `ROWS × BLOCK`).

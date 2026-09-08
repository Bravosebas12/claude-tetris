# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Vanilla Tetris implementation. HTML5 Canvas + CSS + JavaScript ES6+. No dependencies, no build step, no package.json.

## Running

No install/build. Just open `index.html` directly, or serve statically:

```bash
python3 -m http.server 8000
# or
npx serve .
```

There is no test suite, linter, or bundler configured.

## Architecture

Three files, no modules:

- `index.html` — DOM structure: main `<canvas id="board">` (300×600, 10×20 grid at BLOCK=30), a `<canvas id="next-canvas">` preview, HUD spans (`score`/`lines`/`level`), and a pause/game-over overlay.
- `style.css` — dark/retro arcade visual theme.
- `game.js` — all game logic, driven entirely by global mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) and a `requestAnimationFrame` loop.

Key mechanics in `game.js` (all constants/functions live at module scope, no classes):

- **Board model**: `ROWS × COLS` matrix, each cell is `0` (empty) or a piece color index 1–7.
- **Pieces**: `PIECES` array of square shape matrices. `rotateCW` does transpose+reverse for rotation; `tryRotate` applies wall-kick offsets `[0, -1, 1, -2, 2]` before giving up on a rotation.
- **Collision**: `collide(shape, ox, oy)` checks bounds and existing board cells.
- **Game loop**: `loop(ts)` accumulates delta time and drops the piece every `dropInterval` ms; on collision below, calls `lockPiece()` (merge → clearLines → spawn).
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` × current level; hard drop adds 2 pts/cell dropped, soft drop adds 1 pt/row.
- **Leveling/speed**: level = `floor(lines/10) + 1`; `dropInterval = max(100, 1000 - (level-1)*90)`.
- **Ghost piece**: `ghostY()` projects the current piece straight down; drawn at `globalAlpha = 0.2`.

If you change `COLS`, `ROWS`, or `BLOCK`, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS×BLOCK` and `ROWS×BLOCK`).

The README (in Spanish) has more narrative detail on the same mechanics if needed.

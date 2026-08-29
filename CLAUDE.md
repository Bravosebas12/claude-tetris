# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla JavaScript Tetris. No build step, no package manager, no dependencies, no tests. Three files: `index.html`, `style.css`, `game.js`.

## Running

Open `index.html` directly in a browser, or serve it statically:

```bash
python3 -m http.server 8000
```

There is no build, lint, or test command — none are configured in this repo.

## Architecture

All game logic lives in `game.js` (~300 lines) as top-level functions operating on module-scoped mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `animId`). There is no class structure, module system, or state container.

- **Board**: `ROWS × COLS` matrix where each cell is `0` (empty) or a color index `1–7` identifying the piece that occupies it.
- **Pieces**: hardcoded as square matrices in `PIECES` (index 0 unused, 1–7 are I/O/T/S/Z/J/L). Rotation is computed on the fly via `rotateCW` (transpose + row reverse) — no pre-rotated states are stored.
- **Collision** (`collide`): bounds + board-overlap check, called before every move/rotate/drop.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` until one doesn't collide, else the rotation is discarded.
- **Game loop** (`loop`): driven by `requestAnimationFrame`, accumulates delta time in `dropAccum` and advances the piece one row once `dropInterval` is exceeded.
- **Line clearing** (`clearLines`): scans bottom-up, splices full rows out and unshifts empty rows at the top; scoring uses `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`.
- **Level/speed**: level increases every 10 lines; `dropInterval = max(100, 1000 - (level - 1) * 90)`.
- **Ghost piece**: `ghostY()` projects the current piece straight down to its landing row; drawn at `globalAlpha = 0.2`.
- Rendering (`draw`, `drawNext`, `drawGrid`, `drawBlock`) and input handling (`keydown` listener) live in the same file, directly manipulating the two `<canvas>` elements (`board` and `next-canvas`) and the HUD DOM elements (`score`, `lines`, `level`, `overlay`).

### Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (px per cell), `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).

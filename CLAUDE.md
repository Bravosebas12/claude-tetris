# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Vanilla Tetris implementation using HTML5 Canvas, CSS, and plain JavaScript (ES6+). No build step, no bundler, no package manager, no dependencies. The entire game logic lives in a single file, `game.js`.

## Running the game

There is no build/lint/test tooling in this repo. To run it, just serve or open the static files:

```bash
start index.html        # Windows: open directly
# or serve locally (recommended for consistent behavior)
python3 -m http.server 8000
npx serve .
php -S localhost:8000
```

Then open the file directly or `http://localhost:8000`.

## Architecture

Three files cooperate, with all logic centralized in `game.js`:

- `index.html` — DOM structure: main `<canvas id="board">` (300×600, i.e. `COLS × BLOCK` by `ROWS × BLOCK`), a `<canvas id="next-canvas">` for the next-piece preview, HUD elements (`#score`, `#lines`, `#level`), and a shared `#overlay` used for both PAUSE and GAME OVER states.
- `style.css` — dark/retro arcade visual theme.
- `game.js` — all game state and logic, structured around:
  - **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a color index `1–7` identifying which piece type locked there.
  - **Pieces**: the 7 standard tetrominoes are defined as square matrices in `PIECES`. Rotation is done via `rotateCW` (transpose + row reversal), not by storing pre-rotated states.
  - **Collision** (`collide`): checks board bounds and overlap with locked cells.
  - **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` columns until one doesn't collide, else the rotation is discarded.
  - **Game loop** (`loop`): driven by `requestAnimationFrame`; accumulates elapsed time in `dropAccum` and drops the piece one row once `dropInterval` is exceeded, otherwise calls `lockPiece()`.
  - **Line clearing** (`clearLines`): scans bottom-up, splices full rows out and unshifts empty rows at the top; re-checks the same row index (`r++`) since rows shift down.
  - **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop awards 2 points per row dropped, soft drop 1 point per row.
  - **Level/speed**: level increases every 10 lines; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
  - **Ghost piece** (`ghostY`): projects the current piece straight down to its landing row, drawn at `globalAlpha = 0.2`.

Control flow: `init()` creates the board, seeds `next`, calls `spawn()`, and starts the `loop`. `spawn()` promotes `next` to `current` and generates a new `next`; if the new `current` immediately collides, `endGame()` fires and the GAME OVER overlay is shown. Keyboard input (`keydown` listener) handles movement/rotation/drops/pause; `P` toggles pause via `togglePause()`, which cancels/restarts the animation frame loop and reuses `#overlay` for the PAUSE state.

## Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval` (initial). If `COLS`, `ROWS`, or `BLOCK` change, update the `width`/`height` attributes of `<canvas id="board">` in `index.html` to match (`COLS × BLOCK` by `ROWS × BLOCK`).

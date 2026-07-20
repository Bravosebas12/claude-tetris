# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Vanilla Tetris implementation: HTML5 Canvas + CSS3 + plain JavaScript (ES6+). No dependencies, no build step, no package.json.

## Running the game

No install/build required. Any of these work:

```bash
start index.html        # Windows - open directly
python3 -m http.server 8000   # then open http://localhost:8000
npx serve .
php -S localhost:8000
```

There is no test suite, linter, or build/bundling process in this repo.

## Architecture

Three files, no modules/imports — everything in `game.js` runs as a single global script loaded by `index.html`.

- **`index.html`** — DOM shell: main `<canvas id="board">` (300×600, i.e. `COLS×BLOCK` by `ROWS×BLOCK`), a `<canvas id="next-canvas">` for the piece preview, HUD spans (`score`/`lines`/`level`), and a hidden `#overlay` reused for both PAUSE and GAME OVER states.
- **`style.css`** — dark/retro arcade visuals only; no layout logic relevant to gameplay.
- **`game.js`** — all game logic, organized around a few core concepts:
  - **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a color index `1–7` identifying the piece that occupies it.
  - **Pieces**: `PIECES` are square matrices (one array per tetromino type). Rotation (`rotateCW`) is a matrix transpose, not a lookup table of rotation states.
  - **Collision** (`collide(shape, ox, oy)`): the single source of truth for whether a shape placement is legal (bounds + overlap with locked blocks). Every movement/rotation/drop function funnels through it.
  - **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` in order and keeps the first that doesn't collide.
  - **Game loop** (`loop`, driven by `requestAnimationFrame`): accumulates elapsed time in `dropAccum` and advances the piece one row once it exceeds `dropInterval`; `dropInterval` shrinks as `level` increases (`max(100, 1000 - (level-1)*90)` ms).
  - **Line clearing** (`clearLines`): scans bottom-up, splices full rows out and unshifts empty rows at the top; re-checks the same row index after a splice (`r++` inside the loop).
  - **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row.
  - **Ghost piece** (`ghostY`): projects the current piece straight down via repeated `collide` checks; drawn at `globalAlpha = 0.2`.
  - State (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `animId`, ...) lives in module-level `let` bindings reset by `init()` — there is no encapsulating class/object.

### Control flow

```
init() → createBoard(), spawn first piece, requestAnimationFrame(loop)
loop(ts) → accumulate dt → drop piece or lockPiece() → draw() → schedule next frame
keydown → move/rotate/soft-drop/hard-drop/pause (ignored while paused or gameOver)
```

`spawn()` promotes `next` to `current` and generates a new `next`; if the new `current` immediately collides, `endGame()` fires and the GAME OVER overlay is shown. `togglePause()` reuses the same overlay for the PAUSE state.

## Tunable constants (in `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, the `#board` canvas `width`/`height` in `index.html` must be updated to match (`COLS×BLOCK`, `ROWS×BLOCK`).

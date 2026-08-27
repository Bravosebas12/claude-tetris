# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris implemented in vanilla JavaScript (ES6+), HTML5 Canvas, and CSS. No dependencies, no build step, no package.json.

## Running

No install/build required — this is static, client-side only.

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html        # Windows
```

Or serve locally (needed if testing anything that requires an HTTP origin):

```bash
python3 -m http.server 8000
npx serve .
php -S localhost:8000
```

There is no test suite, linter, or build/watch process in this repo.

## Architecture

Three files, no modules/bundler — `index.html` loads `game.js` directly as a classic script.

- **`index.html`** — DOM shell: main `<canvas id="board">` (300×600, i.e. `COLS×BLOCK` by `ROWS×BLOCK`), a side panel with score/lines/level and a `<canvas id="next-canvas">` preview, and a shared `#overlay` div used for both pause and game-over states.
- **`style.css`** — dark/retro arcade visuals; no logic.
- **`game.js`** — all game logic, structured around a small set of global `let` state variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) mutated in place by the functions below rather than passed around.

### Core model

- **Board**: `ROWS × COLS` matrix (`createBoard`), each cell is `0` (empty) or a color index `1–7` identifying which piece locked there.
- **Pieces**: `PIECES` holds the 7 standard tetrominoes as square matrices; `COLORS` maps piece index → color. A piece in play is `{ type, shape, x, y }`. Rotation is done by matrix transpose+reverse (`rotateCW`), not by predefined rotation states.
- **Collision** (`collide`): checks board bounds and existing locked cells for a shape at a given offset. Nearly every other mechanic (movement, rotation, ghost, spawn, gravity) is built on calling this.
- **Wall kicks** (`tryRotate`): on rotation collision, retries the rotated shape at x-offsets `[0, -1, 1, -2, 2]` before giving up on the rotation.
- **Locking** (`lockPiece` → `merge` + `clearLines` + `spawn`): merges the current piece into `board`, clears completed rows (shifting rows down, unshifting an empty row at top), then spawns the next piece.
- **Game loop** (`loop`): `requestAnimationFrame`-driven; accumulates elapsed time in `dropAccum` and forces the piece down a row once it exceeds `dropInterval`, then redraws every frame regardless.
- **Scoring/leveling**: `LINE_SCORES = [0,100,300,500,800]` × `level` on line clears; hard drop adds `2` points per cell dropped, soft drop `1` point per row. Level = `floor(lines/10)+1`; `dropInterval = max(100, 1000 - (level-1)*90)`.
- **Ghost piece**: `ghostY()` projects the current piece straight down via repeated `collide` checks; drawn at `globalAlpha 0.2` in `draw()`.

### Rendering

`draw()` clears and redraws the whole board canvas every frame (grid → locked cells → ghost piece → current piece); `drawNext()` similarly redraws the next-piece canvas whenever `spawn()` runs. There's no dirty-rect optimization — the whole thing is simple full redraws.

### Input

A single `keydown` listener switches on `e.code` (arrows, `Space`, `KeyX`, `KeyP`) and gates all gameplay input on `paused`/`gameOver`. `restartBtn` click re-runs `init()`.

## Tunable constants (`game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS×BLOCK` by `ROWS×BLOCK`).

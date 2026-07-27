# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Classic Tetris implemented in vanilla JavaScript with HTML5 Canvas and CSS — no dependencies, no build step, no package.json. The entire game logic lives in a single file, `game.js` (~300 lines).

## Running the game

There is no build/lint/test tooling. Just open or serve the static files:

```bash
open index.html        # macOS, opens directly in the default browser

# or serve locally (recommended so changes reload cleanly):
python3 -m http.server 8000
npx serve .
php -S localhost:8000
```

Then visit `http://localhost:8000`. Since there's no bundler or transpiler, changes to `game.js`/`style.css`/`index.html` are reflected on a browser refresh with no intermediate step.

## Architecture

Three files cooperate, each with a single responsibility:

- **`index.html`** — DOM structure: the main `<canvas id="board">` (300×600), a `<canvas id="next-canvas">` for the next-piece preview, the score/lines/level panel, and the pause/game-over overlay.
- **`style.css`** — dark/retro arcade visual theme (flexbox layout, monospace scoreboard, `backdrop-filter` overlay).
- **`game.js`** — all game logic, structured around a few core mechanisms:
  - **Board model**: a `ROWS × COLS` matrix where each cell is `0` (empty) or a color index `1–7` identifying which piece locked there.
  - **Pieces**: the 7 classic tetrominoes plus a challenge piece are defined as square matrices in `PIECES`. Rotation (`rotateCW`) is done via transpose + row-reverse, not lookup tables. The 8th piece, the **tuerca** (`NUT_TYPE = 8`, `[[8,8,8],[8,0,8],[8,8,8]]`), is a 3×3 ring with an empty center; once locked, that center cell is surrounded on all sides and can never be filled again, permanently blocking its row from ever clearing. It's dealt from the same random pool as the other 7 (`randomPiece`), so it appears with equal (1/8) probability.
  - **Collision** (`collide`): checks a shape against board bounds and already-locked cells at a given offset. Used both for movement and for wall-kick rotation.
  - **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` until one doesn't collide, so pieces can rotate near walls.
  - **Game loop** (`loop`): driven by `requestAnimationFrame`; accumulates elapsed time in `dropAccum` and drops the piece one row once `dropAccum >= dropInterval`.
  - **Line clearing** (`clearLines`): scans bottom-to-top, splices full rows out and unshifts empty rows at the top.
  - **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by current level; hard drop adds 2 points/row dropped, soft drop adds 1 point/row.
  - **Leveling/speed**: level increases every 10 cleared lines; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
  - **Ghost piece** (`ghostY`): projects the current piece straight down to its landing row and renders it at `globalAlpha = 0.2`.
  - **Tuerca hole marker** (`drawNutHole`): draws a stroked circle over the tuerca's central cell so its hole reads visually as a nut, both while the piece is falling and in the `NEXT` preview; drawn on top of the normal block/ghost rendering in `draw()` and `drawNext()`.
  - **Flow**: `init()` builds the board and starts the loop → `spawn()` promotes `next` to `current` and generates a new `next`; if the freshly spawned piece immediately collides, `endGame()` fires and the Game Over overlay is shown. `togglePause()` (bound to `P`) stops/resumes the `requestAnimationFrame` loop.

Keyboard input is handled by a single `keydown` listener at the bottom of `game.js` (arrows to move/rotate/soft-drop, `Space` for hard drop, `P` to pause); the restart button calls `init()` directly.

## Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell pixel size), `COLORS`, `LINE_SCORES`, and the initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `width`/`height` attributes of `<canvas id="board">` in `index.html` to match (`COLS × BLOCK` by `ROWS × BLOCK`).

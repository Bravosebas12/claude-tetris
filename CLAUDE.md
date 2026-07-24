# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Tetris implementation in vanilla JavaScript, HTML5 Canvas, and CSS. No dependencies, no build process, no package.json, no test suite. The entire game logic lives in a single file, `game.js` (~300 lines).

## Running the game

There is no build/lint/test tooling. To run:

```bash
start index.html       # Windows: open directly in browser
# or serve statically, e.g.
npx serve .
python3 -m http.server 8000
```

There are no automated tests. Verify changes manually by opening the game in a browser and playing it (movement, rotation, soft/hard drop, line clears, pause, game over/restart).

## Architecture

Three files cooperate with no module system — everything is loaded via a single `<script src="game.js">` tag and relies on globals:

- **`index.html`** — DOM structure: the `#board` canvas (300×600, 10×20 cells at `BLOCK=30`px), the `#next-canvas` preview (120×120), HUD elements (`#score`, `#lines`, `#level`), and the `#overlay` for PAUSE/GAME OVER states.
- **`style.css`** — dark/retro arcade visual theme.
- **`game.js`** — all game state and logic, structured around:
  - **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a piece color index (1–7).
  - **Pieces**: `PIECES` defines the 7 tetrominoes as square matrices. `rotateCW` rotates via transpose + row reversal.
  - **Collision** (`collide`): checks board bounds and existing locked cells.
  - **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` until one doesn't collide.
  - **Game loop** (`loop`): driven by `requestAnimationFrame`, accumulates elapsed time in `dropAccum` and advances the piece down a row once `dropAccum >= dropInterval`.
  - **Line clearing** (`clearLines`): scans bottom-to-top, splices full rows out and unshifts empty rows at the top.
  - **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row.
  - **Level/speed**: level increases every 10 lines; `dropInterval = max(100, 1000 - (level-1)*90)` ms.
  - **Ghost piece** (`ghostY`): projects the current piece straight down to its landing row, drawn at `globalAlpha = 0.2`.
  - Module-level `let` state (`board, current, next, score, lines, level, paused, gameOver, ...`) is reset in `init()`, which is also invoked on restart.

### Control flow

```
init() → createBoard(), spawn first pieces, requestAnimationFrame(loop)
loop(ts) → accumulate dt → drop piece or lockPiece() when dropInterval elapsed → draw() → recurse via rAF
keydown → move / tryRotate / softDrop / hardDrop / togglePause
```

`spawn()` promotes `next` to `current` and generates a new `next`; if the new `current` immediately collides, `endGame()` fires and the GAME OVER overlay is shown.

## Tunable constants (in `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`, `ROWS`, or `BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS×BLOCK` by `ROWS×BLOCK`).

## Notes

- The README (`README.md`) is written in Spanish and contains a more detailed walkthrough of each file — consult it for additional context.
- `index.html` sets `lang="es"`; UI copy elsewhere (overlay text, controls list) is in Spanish too. Keep new user-facing text consistent with that unless told otherwise.

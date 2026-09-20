# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris implemented in vanilla JavaScript with HTML5 Canvas and CSS. No dependencies, no build step, no `package.json`.

## Running / testing

There is no build, lint, or test tooling. To run the game, open `index.html` directly or serve the directory statically:

```bash
python3 -m http.server 8000   # or: npx serve .
```

Then open `http://localhost:8000`. Verify changes by reloading the page and playing (there are no automated tests).

## Architecture

Three files, no modules/bundler — `index.html` loads `game.js` as a plain script:

- **`index.html`** — DOM structure: main `<canvas id="board">` (300×600, 10×20 grid), a `<canvas id="next-canvas">` for the next-piece preview, HUD elements (`#score`, `#lines`, `#level`), and a `#overlay` used for both PAUSE and GAME OVER states.
- **`style.css`** — dark/retro arcade visual theme.
- **`game.js`** — all game logic, organized around this flow:
  - `init()` creates the board, seeds `next` via `randomPiece()`, calls `spawn()`, and starts `requestAnimationFrame(loop)`.
  - `loop(ts)` accumulates elapsed time (`dropAccum`) and advances the piece one row once `dropInterval` is exceeded, otherwise calls `lockPiece()`.
  - `lockPiece()` → `merge()` (writes the piece into `board`) → `clearLines()` → `spawn()` (promotes `next` to `current`, generates a new `next`; triggers `endGame()` if the new piece immediately collides).
  - Keydown handler dispatches movement/rotation/soft-drop/hard-drop/pause; `P` toggles pause independent of game-over state.

Key data structures/algorithms:
- `board`: `ROWS × COLS` matrix, `0` = empty, `1–8` = piece color index (see `COLORS`/`PIECES`), `9` (`HOLE`) = the Nut piece's center cell — occupied for collision/merge/line-clear purposes, but rendered as a circular hole instead of a filled block.
- 8 pieces total in `PIECES` (`randomPiece()` picks uniformly across `PIECES.length - 1`): the 7 classic tetrominoes plus the **Nut** (`[[8,8,8],[8,HOLE,8],[8,8,8]]`), a 3×3 "challenge" piece — its difficulty comes from being a bulky solid 3×3 block, not from blocking line clears (the hole cell still counts as filled).
- Pieces are square matrices in `PIECES`; rotation (`rotateCW`) is transpose + row reverse.
- `drawMatrix(context, matrix, ox, oy, size, alpha)` is the shared renderer for the board, current piece, ghost, and next-preview; it draws all blocks first, then `HOLE` cells as circles (`drawHole`) in a second pass so the circle isn't clipped by neighboring blocks drawn afterward.
- `collide(shape, ox, oy)` checks board bounds and existing blocks for a shape at a given offset.
- `tryRotate()` implements basic wall kicks by retrying the rotated shape at offsets `[0, -1, 1, -2, 2]`.
- `ghostY()` projects the current piece straight down to compute the ghost-piece landing row; used both for rendering and hard-drop scoring.
- Scoring: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop = 2 pts/row dropped, soft drop = 1 pt/row. Level increases every 10 lines; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.

Tunable constants live at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval`, plus `NUT`/`HOLE` (piece/cell indices for the Nut piece) and `BOARD_BG` (must match `#board`'s background in `style.css`, since it's used to punch out the Nut's hole). If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).

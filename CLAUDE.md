# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla JavaScript Tetris. Three files, no dependencies, no build step, no package.json:

- `index.html` — DOM structure: `#board` canvas (300×600, the game grid), `#next-canvas` (120×120, next-piece preview), score/lines/level panel, pause/game-over overlay.
- `style.css` — dark/retro arcade visual theme.
- `game.js` — all game logic (~300 lines), a single top-level script with module-level mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, etc.).

## Running / testing

No build or test tooling exists. To run the game, open `index.html` directly or serve the directory statically, e.g.:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. There is no lint or test command — verify changes by playing the game in a browser.

## Architecture

`game.js` is organized around a `requestAnimationFrame` loop (`loop()`) and a handful of pure-ish helper functions operating on shared module state:

- **Board model**: `ROWS × COLS` matrix where each cell is `0` (empty) or a color index `1–7` identifying the piece that occupies it.
- **Pieces**: `PIECES` holds the 7 tetromino shapes as square matrices. `randomPiece()` deep-copies a shape and centers it at spawn. Rotation (`rotateCW`) is a transpose + row-reverse of the shape matrix — there is no per-piece rotation state table (no SRS), just naive 90° matrix rotation.
- **Collision** (`collide`): checks a shape against board bounds and already-locked cells.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` columns until one doesn't collide, else the rotation is discarded.
- **Locking** (`lockPiece` → `merge` + `clearLines` + `spawn`): merges the current piece into `board`, clears full rows (shifting the matrix, not recreating it), then spawns the next piece. If the newly spawned piece immediately collides, `endGame()` fires.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` indexed by lines-cleared-at-once, multiplied by `level`. Hard drop adds 2 pts/row dropped, soft drop 1 pt/row.
- **Leveling/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level-1)*90)` ms.
- **Rendering** (`draw`, `drawNext`, `drawBlock`, `drawGrid`): plain Canvas 2D, redrawn fully every frame. Ghost piece is drawn first at its projected landing row (`ghostY()`) with `globalAlpha = 0.2`, then the real piece on top.
- **Input**: single `keydown` listener switches on `e.code` (arrows, `KeyX` to rotate, `Space` for hard drop, `KeyP` to pause). Pause/game-over both use the same `#overlay` element, toggled via `overlay-title`/`overlay-score` text and `classList`.

When tuning game feel, the relevant constants are all at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, and the initial `dropInterval` set in `init()`. If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK` by `ROWS × BLOCK`).

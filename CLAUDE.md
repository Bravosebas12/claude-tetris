# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris, vanilla JavaScript + HTML5 Canvas + CSS. No build step, no dependencies, no `package.json`. 3 files total: `index.html`, `style.css`, `game.js`.

## Running / testing

No build/lint/test tooling exists. To run the game, serve or open `index.html` directly:

```bash
xdg-open index.html          # Linux, open directly
python3 -m http.server 8000  # or any static server, then visit localhost:8000
```

There are no automated tests. Verify changes by playing the game in a browser and exercising the golden path (spawn, move, rotate, soft/hard drop, line clear, level up, game over, restart, pause).

## Architecture

Everything lives in `game.js` (single file, no modules). Key pieces:

- **Board model**: `board` is a `ROWS × COLS` matrix (20×10). Each cell is `0` (empty) or a piece-color index `1–7`.
- **Pieces**: `PIECES` are square matrices; `current`/`next` pieces hold `{ type, shape, x, y }`. Rotation is `rotateCW` (transpose + reverse rows), not a lookup table — there's no distinct rotation-state per piece.
- **Collision** (`collide`): checks a shape against board bounds and existing fixed cells.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` columns until one doesn't collide, else the rotation is discarded.
- **Game loop** (`loop`): driven by `requestAnimationFrame`, accumulates `dt` and drops the piece one row once `dropAccum >= dropInterval`; also calls `draw()` every frame.
- **Locking** (`lockPiece` → `merge` + `clearLines` + `spawn`): merges the current piece into `board`, clears full rows (scanning bottom-up, splicing and unshifting an empty row), then spawns the next piece.
- **Scoring/leveling**: `LINE_SCORES = [0, 100, 300, 500, 800]` × `level`; hard drop adds 2 pts/row dropped, soft drop 1 pt/row. Level increments every 10 lines; `dropInterval = max(100, 1000 - (level-1)*90)`.
- **Ghost piece** (`ghostY`): projects current piece straight down to its landing row, drawn at `globalAlpha = 0.2`.
- **Rendering**: `draw()` redraws the full board canvas each frame (grid → locked cells → ghost → current piece). `drawNext()` renders the preview canvas separately.
- **Game over**: triggered in `spawn()` if the newly spawned piece immediately collides.
- **Input**: single `keydown` listener switches on `e.code` (arrows, `KeyX` rotate, `Space` hard drop, `KeyP` pause); ignored while paused or game over (except unpause).

Tunable constants live at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`. If `COLS`/`ROWS`/`BLOCK` change, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS×BLOCK` by `ROWS×BLOCK`).

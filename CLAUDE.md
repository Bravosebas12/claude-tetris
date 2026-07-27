# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Vanilla-JS Tetris implementation. Three files, no dependencies, no build step, no package manager:

- `index.html` — DOM structure: `<canvas id="board">` (300×600, the play field) and `<canvas id="next-canvas">` (120×120, next-piece preview), plus the score/lines/level panel and pause/game-over overlay.
- `style.css` — dark/retro arcade theme (flexbox layout, backdrop-filter overlays).
- `game.js` — all game logic (~300 lines, single file, no modules).

## Running

No install/build. Just serve or open the files directly:

```bash
open index.html              # macOS, or double-click
python3 -m http.server 8000  # or: npx serve .
```

There is no test suite, linter, or build tooling in this repo — verify changes by loading `index.html` in a browser and playing.

## Architecture (`game.js`)

Everything lives in module-level `let` state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `animId`) mutated in place by the functions below — there is no class/store abstraction.

- **Board**: a `ROWS × COLS` matrix; each cell is `0` (empty) or a color index `1–7` identifying which piece locked there.
- **Pieces**: hardcoded as square matrices in `PIECES` (index 0 unused, 1–7 = I,O,T,S,Z,J,L), paired with `COLORS` by the same index. Rotation is `rotateCW` (transpose + reverse), not a lookup table.
- **Collision** (`collide`): bounds + occupied-cell check against `board`, used before every move/rotate/drop.
- **Wall kicks** (`tryRotate`): after rotating, tries x-offsets `[0, -1, 1, -2, 2]` in order and takes the first that doesn't collide.
- **Locking** (`lockPiece` → `merge` + `clearLines` + `spawn`): merges the piece into `board`, clears full rows (shifting cleared rows to `unshift` a fresh empty row at top), then spawns the next piece. `spawn` also detects game-over: if the new piece immediately collides at its spawn position, `endGame()` fires.
- **Game loop** (`loop`, driven by `requestAnimationFrame`): accumulates elapsed time in `dropAccum`; once it exceeds `dropInterval`, the piece drops one row (or locks if it can't).
- **Scoring**: `LINE_SCORES = [0,100,300,500,800]` indexed by lines-cleared-at-once, multiplied by `level`. Hard drop adds 2 pts/row dropped, soft drop 1 pt/row.
- **Leveling/speed**: level = `floor(lines/10)+1`; `dropInterval = max(100, 1000 - (level-1)*90)` ms, recalculated in `clearLines`.
- **Ghost piece** (`ghostY`): projects `current` straight down until collision, drawn at `globalAlpha = 0.2` in `draw()`.
- **Rendering**: `draw()` redraws the whole board canvas each frame (grid, locked blocks, ghost, current piece); `drawNext()` redraws the separate preview canvas whenever `spawn()` runs.
- **Input**: a single `keydown` listener switches on `e.code` (arrows + `KeyX` for rotate, `Space` for hard drop, `KeyP` for pause, handled before the paused/gameOver early-return).

### Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell px size), `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `width`/`height` attributes of `<canvas id="board">` in `index.html` to match (`COLS×BLOCK` by `ROWS×BLOCK`).

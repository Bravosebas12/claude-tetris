# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Vanilla JavaScript Tetris implementation using HTML5 Canvas. Three files, no dependencies, no build step, no `package.json`.

- `index.html` — DOM structure: `#board` canvas (300×600, the 10×20 grid), `#next-canvas` (120×120, next-piece preview), HUD spans (`#score`, `#lines`, `#level`), and the pause/game-over `#overlay`.
- `style.css` — dark/retro arcade visual theme (flexbox layout, backdrop-blur overlay).
- `game.js` — all game logic (~300 lines, single file, no modules).

## Running / testing

There is no build, lint, or test tooling in this repo. To run the game, serve the directory statically and open it in a browser:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Or open `index.html` directly in a browser (`start index.html` on Windows). Verify changes manually by playing the game — there are no automated tests.

## Architecture (`game.js`)

Everything lives in one file with module-level `let` state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) — no classes, no build-time modules.

- **Board model**: `ROWS × COLS` matrix; each cell is `0` (empty) or a color index `1–7` identifying which piece locked there.
- **Pieces**: `PIECES` array of square matrices (index 0 unused so piece type == color index). Rotation is a transpose+reverse (`rotateCW`), not stored per-orientation.
- **Collision** (`collide`): checks a shape against board bounds and locked cells at a given offset. This is the single shared predicate — used for movement, rotation, ghost-piece projection, and spawn-blocking (game-over check). Reuse it rather than writing new bounds checks.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` and takes the first that doesn't collide.
- **Lock sequence**: `lockPiece()` → `merge()` (bake into board) → `clearLines()` (scan bottom-up, splice full rows, unshift empty rows, update score/level/dropInterval) → `spawn()` (promote `next` to `current`, generate new `next`, check spawn collision → `endGame()`).
- **Game loop** (`loop`, driven by `requestAnimationFrame`): accumulates elapsed time in `dropAccum`; when it exceeds `dropInterval`, drops the piece one row or locks it. Also calls `draw()` every frame.
- **Ghost piece** (`ghostY`): projects `current` straight down via repeated `collide` checks; drawn at `globalAlpha = 0.2`.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` × `level` on line clear; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row. Level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)`.
- **Input**: single `keydown` listener switches on `e.code` (arrows, `Space`, `KeyX` for rotate, `KeyP` for pause). Input is ignored while `paused` or `gameOver`.
- **Cross-file constraint**: if `COLS`, `ROWS`, or `BLOCK` change, the `#board` canvas `width`/`height` in `index.html` must be updated to match (`COLS × BLOCK`, `ROWS × BLOCK`).

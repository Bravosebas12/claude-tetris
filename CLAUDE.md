# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla JavaScript Tetris implementation using HTML5 Canvas. No dependencies, no build step, no package.json — just static files served or opened directly.

## Running

No install or build required.

```bash
start index.html       # Windows: open directly in browser
npx serve .             # or any static file server, then visit http://localhost:8000
```

There are no tests, linter, or build/watch commands configured in this repo.

## Architecture

Three files, each with a single responsibility:

- **`index.html`** — DOM structure: the main `#board` canvas (300×600, 10×20 grid at `BLOCK=30`px), the `#next-canvas` piece preview, HUD elements (`#score`, `#lines`, `#level`), and the `#overlay` for pause/game-over states.
- **`style.css`** — dark/retro arcade visual theme only; no layout logic depends on it.
- **`game.js`** — all game logic, in one file, using module-level `let` state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) rather than a class or state container.

### Core flow

`init()` creates an empty board, seeds `next` via `randomPiece()`, calls `spawn()` to promote it to `current`, then starts `requestAnimationFrame(loop)`.

`loop(ts)` accumulates elapsed time (`dropAccum`) and drops the current piece one row once `dropAccum >= dropInterval`; otherwise it locks the piece (`lockPiece`) and redraws (`draw()`). Every animation frame reschedules itself via `animId`.

Keyboard input (`keydown` listener) is the only user input path: arrows move/rotate/soft-drop, `Space` hard-drops, `P` toggles pause.

### Key mechanics to know before modifying

- **Piece/board representation**: `PIECES` are 4×4 (or smaller) matrices of color indices (0 = empty, 1–7 = piece color); `board` is a `ROWS × COLS` matrix of the same color indices. A piece's on-board position is tracked separately via `current.x`/`current.y`.
- **Rotation** (`rotateCW`): transpose + reverse rows, no distinct rotation states are stored — the shape matrix itself is rotated in place.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` and keeps the first that doesn't collide; otherwise the rotation is discarded.
- **Collision** (`collide`): checks board bounds and already-locked cells; called before every move and to compute the ghost piece position.
- **Locking** (`lockPiece` → `merge` + `clearLines` + `spawn`): fixes the piece into `board`, clears completed rows (shifting rows down, unshifting an empty row at top), then spawns the next piece. If the newly spawned piece immediately collides, `endGame()` fires.
- **Scoring**: `LINE_SCORES = [0,100,300,500,800]` × `level` on line clear; hard drop adds `2` points/row dropped, soft drop adds `1` point/row. Level increases every 10 lines cleared, and `dropInterval` is recalculated as `max(100, 1000 - (level-1)*90)` ms.
- **Ghost piece** (`ghostY`): projects `current` straight down until it would collide, drawn at `globalAlpha = 0.2`.

When changing `COLS`, `ROWS`, or `BLOCK` in `game.js`, the `#board` canvas `width`/`height` attributes in `index.html` must be updated to match (`COLS × BLOCK`, `ROWS × BLOCK`) — they are not computed dynamically.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A playable classic Tetris built with vanilla JavaScript and the HTML5 Canvas 2D API. **No dependencies, no build step, no tests, no `package.json`.** Three source files: `index.html`, `style.css`, `game.js`. The README is in Spanish.

## Running it

Open `index.html` directly in a browser, or serve statically:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
npx serve .
```

There is nothing to build, lint, or test — changes take effect on browser reload.

## Architecture

All game logic lives in `game.js` (~300 lines, module-free — everything is top-level, loaded via a plain `<script>` tag). Key things to understand before editing:

- **Piece encoding is doubly-meaningful.** Each cell value is both the piece type (1–7) *and* the index into the `COLORS` array. The board stores `0` (empty) or a color/type index. `PIECES` and `COLORS` are 1-indexed with a `null` at index 0, so type numbers line up directly.
- **Rotation** (`rotateCW`) transposes + reverses the square shape matrix. `tryRotate` applies basic wall kicks by testing horizontal offsets `[0, -1, 1, -2, 2]` and taking the first that doesn't collide.
- **`collide(shape, x, y)`** is the single source of truth for legality — used for movement, rotation, ghost projection, hard/soft drop, and spawn-time game-over detection. Any new movement must go through it.
- **Game loop** (`loop`) is `requestAnimationFrame`-driven, accumulating `dt` into `dropAccum` and dropping one row when it exceeds `dropInterval`. Pause/resume works by cancelling/restarting the RAF (`animId`) and resetting `lastTime`.
- **State is a set of module-level `let` variables** (`board`, `current`, `next`, `score`, etc.), all (re)initialized in `init()`, which is also the restart handler. There is no state object or class.
- **Scoring/leveling** happens in `clearLines`: `LINE_SCORES[cleared] * level`; level = `floor(lines/10)+1`; speed = `max(100, 1000 - (level-1)*90)` ms.

## Coupling to watch

The board canvas geometry is hard-coded in two places that must stay in sync: the `COLS`/`ROWS`/`BLOCK` constants in `game.js` (10 × 20 × 30) and `<canvas id="board" width="300" height="600">` in `index.html` (must equal `COLS*BLOCK` × `ROWS*BLOCK`). Changing board dimensions requires editing both files.

DOM element IDs referenced in `game.js` (`board`, `next-canvas`, `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`) must match `index.html`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla-JS Tetris on HTML5 Canvas. Three files: `index.html`, `style.css`, `game.js`. No package.json, no build, no bundler, no tests, no lint config, no dependencies.

## Running

```bash
open index.html            # direct, works fine (no modules/fetch)
python3 -m http.server 8000  # or any static server
```

Verifying a change = reloading the browser. There is no test command; if a check is needed, do it by reasoning over `game.js` or by driving the page in a browser.

## Architecture (`game.js`)

Single script, no modules. Everything is module-scope: DOM refs are resolved once at load time (safe because `<script>` sits at the end of `<body>`), and mutable game state lives in one `let` declaration list (`board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId`). `init()` is called at the bottom of the file, so the game auto-starts on load, and the restart button re-calls `init()`.

Key invariants when editing:

- **Board is `ROWS × COLS` of ints**: `0` = empty, `1–7` = piece type, which doubles as the index into both `COLORS` and `PIECES`. Adding a piece means appending to both arrays in lockstep and widening the `Math.random() * 7` in `randomPiece()`.
- **Pieces are square matrices** so `rotateCW` (transpose + reverse) works in place; `tryRotate` retries kicks `[0,-1,1,-2,2]` and silently drops the rotation if all fail.
- **Rendering is full-redraw every frame** from `loop()` → `draw()`; there is no dirty tracking. The NEXT preview is the exception — `drawNext()` is only called from `spawn()`.
- **Two clocks**: `requestAnimationFrame` drives frames, `dropAccum`/`dropInterval` drives gravity. Pause/game-over both `cancelAnimationFrame(animId)` and rely on `lastTime = performance.now()` being reset before resuming, otherwise a huge `dt` teleports the piece down.
- **Canvas size is hardcoded in HTML**: `#board` is `300×600` = `COLS*BLOCK × ROWS*BLOCK`. Changing `COLS`, `ROWS`, or `BLOCK` in `game.js` requires editing the `width`/`height` attributes in `index.html` too. Same coupling for `#next-canvas` (`120×120`) and the `NB = 30` / 4-cell grid inside `drawNext()`.
- **Scoring**: `LINE_SCORES[cleared] * level`, plus 2/cell for hard drop and 1/row for soft drop. Level = `floor(lines/10)+1`, speed = `max(100, 1000 - (level-1)*90)`.

## Conventions

- User-facing strings (overlay text, button label, README) are in **Spanish**; identifiers and comments in code are English/Spanish-mixed — match the surrounding file.
- `'use strict'` at the top of `game.js`; ES6+ syntax is used freely, no transpilation target to respect.
- The README documents the architecture in detail (in Spanish) and includes a tunable-constants table — keep it in sync when changing gameplay constants or controls.

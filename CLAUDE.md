# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

There is no build step, no `package.json`, no bundler, no test suite and no linter. Do not add one unless asked. Verify changes by loading the page in a browser:

```powershell
start index.html            # open the file directly
python -m http.server 8000  # or serve statically, then open http://localhost:8000
```

## Architecture

Three files, loaded as classic (non-module) scripts:

- `index.html` — DOM shell: `<canvas id="board">` (300×600), the panel spans `#score` / `#lines` / `#level`, `<canvas id="next-canvas">` (120×120), and the single `#overlay` reused for both PAUSA and GAME OVER.
- `style.css` — dark arcade theme. `.overlay.hidden` is the show/hide switch that JS toggles.
- `game.js` — the whole game, in layered order: constants → DOM refs → one block of `let` globals (`board, current, next, score, …`) → geometry helpers (`createBoard`, `collide`, `rotateCW`, `ghostY`) → state mutators (`merge`, `clearLines`, `lockPiece`, `spawn`) → renderers (`drawBlock`, `drawGrid`, `draw`, `drawNext`) → `loop`, the `keydown` handler, and `init`.

Control flow: `init()` builds state and starts `requestAnimationFrame(loop)`; `loop` accumulates `dt` into `dropAccum` and drops one row per `dropInterval`, redrawing every frame; a piece that cannot descend goes `lockPiece()` → `merge` → `clearLines` → `spawn`. `init()` is the only reset path — called at load and bound to `#restart-btn`.

## Invariants to preserve

- Cell values `1–7` are simultaneously the piece type, the fill value inside `PIECES[type]`, and the index into `COLORS`. Board cells and shape matrices share that one space, so `COLORS` and `PIECES` must be reordered together.
- `<canvas id="board">` `width`/`height` in `index.html` must equal `COLS * BLOCK` × `ROWS * BLOCK`. `drawNext` centers into a fixed 4×4 grid at 30px, matching `#next-canvas` at 120×120.
- `collide` is the single source of truth for legality (walls, floor, occupied cells); rows above the board (`ny < 0`) are intentionally allowed. Route every move, rotation and drop through it.
- Rotation is naive transpose-and-reverse plus `[0,-1,1,-2,2]` column kicks in `tryRotate` — not SRS. The I piece uses a 4×4 matrix so it rotates about its center.
- `game.js` has no exports and runs on load; `'use strict'` is on and every function is a global.

## Known quirks (pre-existing — don't mistake them for your change)

- `loop` resets `dropAccum = 0` instead of subtracting `dropInterval`, so drop timing drifts slightly under frame jitter.
- Resuming from pause resets `lastTime = performance.now()` to avoid one huge `dt`.

## Language

User-facing text is Spanish (`<html lang="es">`, `PAUSA`, `Reiniciar`, `Puntuación`), as is the README. Keep UI strings in Spanish; code identifiers are English and comments are mixed — follow the surrounding file.

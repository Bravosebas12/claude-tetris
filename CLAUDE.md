# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build, no install, no package manager. Open `index.html` directly, or serve statically:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
npx serve .
```

There are no tests, lint config, or CI. The repo is three files (`index.html`, `style.css`, `game.js`) plus the README.

## Architecture

The whole game is a single IIFE-less script (`game.js`, ~300 lines) in `'use strict'` mode. Key things that aren't obvious from a quick scan:

- **Mutable module-level state.** `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `animId` are all top-level `let` bindings. `init()` resets them; the `Reiniciar` button rebinds `init`. There is no class or closure encapsulation — anything you add lives in the same flat scope.

- **Cell encoding doubles as color index.** Board cells are `0` (empty) or `1..7`. Those same indices index into `COLORS` and `PIECES`. If you add a piece type, both arrays must grow in lockstep, and `randomPiece()`'s `Math.floor(Math.random() * 7) + 1` must be updated.

- **Rotation = transpose + row-reverse**, with a fixed 5-offset wall-kick list `[0, -1, 1, -2, 2]` in `tryRotate`. This is *not* the SRS kick table; rotating against a wall may silently fail in cases real Tetris would kick. Don't assume SRS semantics.

- **Game loop is rAF-driven with a dt accumulator.** `loop(ts)` accumulates `dt` into `dropAccum` and triggers a single row drop per frame when it crosses `dropInterval`. Pausing works by `cancelAnimationFrame` + resetting `lastTime` on resume — there's no separate "tick paused" flag inside `loop`.

- **Top-out detection lives in `spawn()`.** If the freshly-spawned piece collides on entry, `endGame()` fires. There is no separate "lock above ceiling" check; the spawn collision *is* the game-over signal.

- **HUD updates are manual.** `updateHUD()` is called explicitly after score/lines/level changes (in `clearLines`, `softDrop`, the keydown handler). New code paths that mutate those values must call it themselves — the renderer doesn't.

- **Canvas size is coupled to constants.** `<canvas id="board" width="300" height="600">` in `index.html` must match `COLS * BLOCK` × `ROWS * BLOCK`. Changing `COLS`/`ROWS`/`BLOCK` in `game.js` without editing the HTML produces a misaligned board.

- **Speed curve.** `dropInterval = max(100, 1000 − (level − 1) × 90)` ms; level increments every 10 cleared lines. Cap is 100 ms (level 11+).

## Conventions

- UI strings, README, and code comments are in Spanish. Match that when editing user-facing text.
- Vanilla ES6+, no transpile step — keep it browser-native (no imports, no JSX, no TS).

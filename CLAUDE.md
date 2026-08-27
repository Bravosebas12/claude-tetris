# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla-JS Tetris on HTML5 Canvas. Three source files, no dependencies, no `package.json`, no build step, no tests, no linter. UI strings and `README.md` are in Spanish — keep new user-facing text in Spanish.

## Running

Open `index.html` directly (`start index.html` on Windows), or serve statically:

```bash
python3 -m http.server 8000   # then http://localhost:8000
npx serve .
```

There is no build/lint/test command. Verification is manual: reload the page and play.

## Architecture

`index.html` → markup + the two canvases; `style.css` → dark arcade theme; `game.js` → all logic (~300 lines, single top-level scope, no modules).

### The central invariant: one integer means three things

A cell value of `1`–`7` is simultaneously the piece type, the index into `COLORS`, and the "occupied" flag; `0` means empty. `PIECES` and `COLORS` are both 1-indexed with a leading `null` so that indices line up. Every piece matrix is filled with its own type number (the T piece's cells all contain `3`), which is why `merge()` can copy shape cells straight into `board` and `drawBlock()` can take a raw board cell as its color. Adding a piece means appending to *both* arrays and filling the new matrix with its index.

### State and lifecycle

All game state lives in one `let board, current, next, score, ...` declaration. `init()` is the single reset point and is bound directly to the restart button — there is no separate "new game" path. `spawn()` moves `next` into `current` and generates a new `next`; if the freshly spawned piece already collides it calls `endGame()`.

### Game loop

`loop(ts)` is a `requestAnimationFrame` callback that accumulates `dt` into `dropAccum` and drops one row when `dropAccum >= dropInterval`. **`draw()` runs only inside `loop`**, so input handling never renders directly — a keypress mutates `current` and the next frame paints it. Pause cancels the rAF and resume re-seeds `lastTime` from `performance.now()` before restarting it, so the paused span does not arrive as one huge `dt`.

`endGame()` calls `cancelAnimationFrame(animId)`, but when the game ends from inside `loop` (via `lockPiece` → `spawn`), that id is the frame already executing, so cancelling it is a no-op. `loop()` guards this itself: it checks `gameOver` right after `draw()` and returns before scheduling the next frame, so the current frame still paints the final state but the loop doesn't keep running (and re-locking/re-spawning) behind the Game Over overlay. Touch this if you rework lock/end-game flow.

### Rotation

`rotateCW()` is a plain transpose-and-reverse over the square matrix; no rotation-state index is tracked. `tryRotate()` implements a simplified kick table — horizontal offsets `[0, -1, 1, -2, 2]` only, not SRS — and abandons the rotation if all five fail.

### Coupling to watch

- `COLS`, `ROWS`, `BLOCK` in `game.js` must match the hardcoded `width`/`height` on `<canvas id="board">` in `index.html` (`COLS × BLOCK` by `ROWS × BLOCK`).
- `drawNext()` centers the preview inside a fixed 4×4 grid at 30px, sized to the 120×120 `#next-canvas`.
- `game.js` resolves every DOM node at top level, so the `<script>` must stay at the end of `<body>` with no `defer`.
- Progression is derived, not incremental: `level = floor(lines / 10) + 1` and `dropInterval = max(100, 1000 - (level - 1) * 90)`, both recomputed in `clearLines()`.

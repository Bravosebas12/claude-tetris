# feat/challenge-mode — Objective-driven challenge modes

## Goal

Add selectable modes with explicit objectives and handicaps: a 40-line sprint under
2 minutes, rising garbage every 10s, a pre-filled board, invisible locked blocks, and
inverted rotation at higher levels.

Source: feature 4 of the reference feature set.

## Shared constraints

- Only `index.html`, `style.css`, `game.js`. Classic `<script>`, no modules, no deps.
- ES6+ vanilla JS, two-space indent, semicolons, single quotes.
- Player-visible UI text in **Spanish**; identifiers and code comments in **English**.
- `init()` is also the restart handler: reset every new state variable and
  `cancelAnimationFrame(animId)` before starting a new loop.
- Reuse existing helpers: `createBoard()`, `collide()`, `rotateCW()`, `tryRotate()`,
  `merge()`, `clearLines()`, `draw()`, `endGame()`, `loop()`.
- The default mode must be `classic` and must behave exactly like today.

## Steps

1. **Mode table** — `MODES`, a list of
   `{ id, label, setup(), onTick(dt), checkGoal() }`, plus a `mode` state variable.
   `init(modeId = 'classic')` looks the mode up, runs `setup()` after `createBoard()`,
   and resets every mode-specific variable. Wire `restartBtn` to restart the
   currently selected mode.

2. **Mode selector** — reuse `#overlay`: show a start screen listing the modes
   (Spanish labels) before the first game. `endGame()` returns the player there.

3. **Sprint 40L / 2:00** — `timeLeft` counted down in `onTick(dt)` from the existing
   `dt` in `loop()`. Show `TIEMPO` and `OBJETIVO` in the panel. `checkGoal()` wins at
   `lines >= 40`; time running out ends the game as a loss. Both paths need an
   `endGame(message)` variant that reports the objective outcome, not only the score.

4. **Basura ascendente** — every 10s (`garbageAccum` in `onTick`): if the top row has
   any occupied cell, end the game; otherwise `board.shift()` and
   `board.push(garbageRow())` (a filled row with one random empty column). Also
   `current.y--` so the falling piece keeps its position relative to the stack,
   and end the game if that makes `current` collide.

5. **Bloques prefijados** — `setup()` seeds the bottom N rows with a fixed, hand-picked
   pattern (leave at least one column clear so the board is solvable).

6. **Piezas invisibles** — after `merge()`, add the written cells to an `invisible`
   `Set` keyed `r * COLS + c`. `draw()` skips those cells. Re-index the set on every
   line clear exactly as the row splice shifts rows down, or the mask desyncs.
   Optionally reveal the whole board for ~300ms after each clear.

7. **Rotación inversa** — when the mode flag is on and `level >= N`, rotate
   counter-clockwise: apply `rotateCW()` three times, or add a `rotateCCW()` helper.
   Reuse the existing kick loop in `tryRotate()` either way.

8. **`style.css`** — styles for the mode selector list and the objective HUD block.

## Verification

```bash
python3 -m http.server 8000   # open http://localhost:8000
```

- Each mode starts from the selector and shows its own objective HUD.
- **Sprint**: clearing 40 lines before the timer ends shows a win message; letting the
  timer expire shows a loss. The countdown pauses with `P`.
- **Basura**: a garbage row rises every 10s with exactly one gap; the falling piece
  keeps its relative position; a full stack ends the game instead of corrupting `board`.
- **Prefijados**: the seeded pattern is present at start and is clearable.
- **Invisibles**: locked blocks disappear from the render but still block collisions;
  after several line clears the hidden cells still match the real board (reveal them
  from the console to compare).
- **Rotación inversa**: past the threshold level, `Up` rotates the other way and wall
  kicks still work.
- Restart from each mode resets the board, the timer, the garbage accumulator and the
  invisible set.
- Regression: `classic` mode is byte-for-byte the same experience as before this branch.

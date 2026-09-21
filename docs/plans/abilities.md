# feat/abilities — Chargeable ability system

## Goal

An energy bar that fills as lines are cleared and can be spent on one of five
abilities: see the next 5 pieces, swap the current piece, slow time for 10s,
undo the last placement, or unlock the hold slot.

Source: feature 5 of the reference feature set.

## Dependency note

The hold ability overlaps with `feat/hold-piece`. This branch is built independently
from `main`, so it ships a minimal hold of its own; the overlap is resolved when
rebasing onto `main` after `feat/hold-piece` is merged.

## Shared constraints

- Only `index.html`, `style.css`, `game.js`. Classic `<script>`, no modules, no deps.
- ES6+ vanilla JS, two-space indent, semicolons, single quotes.
- Player-visible UI text in **Spanish**; identifiers and code comments in **English**.
- `init()` is also the restart handler: reset every new state variable.
- Reuse existing helpers: `randomPiece()`, `spawn()`, `collide()`, `lockPiece()`,
  `drawNext()`, `drawBlock()`, `updateHUD()`, `loop()`.

## Steps

1. **State** — `energy` (0..100), `slowUntil` (timestamp), `undoSnapshot`,
   `holdUnlocked`, `hold`, `holdUsed`. Reset all in `init()`.

2. **Charging** — in the line-clear scoring path, `energy = Math.min(100, energy + cleared * 15)`.
   Show it in the panel.

3. **Piece queue** — the "see next 5" ability needs a real queue. Replace the single
   `next` variable with `nextQueue` (array of 5): `init()` fills it, `spawn()` does
   `current = nextQueue.shift(); nextQueue.push(randomPiece());`. Every current
   reference to `next` (in `spawn()` and `drawNext()`) must be updated.

4. **`index.html`** — an energy bar (`<div id="energy-bar"><div id="energy-fill">`),
   plus an ability list with Spanish labels, costs, and the number-key hint (1..5).
   Enlarge/stack the preview area so it can show 5 pieces when the ability is active.

5. **Abilities** — a table of `{ id, label, cost, run() }` invoked by
   `Digit1`..`Digit5` in the `keydown` switch. Refuse (and flash the bar) when
   `energy < cost`; otherwise deduct and run:
   - **Ver 5 siguientes** — toggle a `previewCount` of 5 for a fixed duration or
     until the next lock; `drawNext()` renders 1 or 5 previews accordingly.
   - **Cambiar pieza** — discard `current`, pull from `nextQueue` via the same path
     `spawn()` uses; end the game if the incoming piece collides at spawn.
   - **Ralentizar 10s** — `slowUntil = performance.now() + 10000`; `loop()` compares
     `dropAccum` against `dropInterval * 2` while active.
   - **Deshacer** — at the **start** of every `lockPiece()`, store
     `{ board: board.map(r => [...r]), score, lines, level, current: {...} }`.
     The ability restores that snapshot and calls `updateHUD()`. Only one level deep.
   - **Hold** — set `holdUnlocked = true`, then `C` / `Shift` parks the current piece,
     once per piece (`holdUsed` reset in `spawn()`).

6. **`style.css`** — energy fill with a width transition; dim abilities the player
   cannot currently afford.

## Verification

```bash
python3 -m http.server 8000   # open http://localhost:8000
```

- Clear lines and watch the bar fill; confirm it caps at 100.
- Press an ability key with insufficient energy → refused, nothing is deducted.
- **Ver 5** → the preview shows exactly the next 5 pieces, and they arrive in that order.
- **Cambiar pieza** → the current piece is replaced and the queue advances by one.
- **Ralentizar** → the fall rate halves for ~10s then returns to the level's interval.
- **Deshacer** → board, score, lines and level match the state before the last lock;
  pressing it twice in a row does not restore a stale snapshot.
- **Hold** → only usable after unlocking; once per piece.
- Regression: queue refill never leaves `nextQueue` short, pause/game over/restart
  reset energy, `slowUntil`, the snapshot and the hold slot.

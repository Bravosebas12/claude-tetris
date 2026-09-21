# feat/hold-piece — Hold system

## Goal

Let the player park the current piece in a reserve slot and swap it back in later,
limited to one swap per piece. Strategic value: banking an I-piece for a Tetris.

Source: feature 6 of the reference feature set.

## Shared constraints

- Only `index.html`, `style.css`, `game.js`. Classic `<script>`, no modules, no deps.
- ES6+ vanilla JS, two-space indent, semicolons, single quotes.
- Player-visible UI text in **Spanish**; identifiers and code comments in **English**.
- `init()` is also the restart handler: it must reset every new state variable and
  `cancelAnimationFrame(animId)` before starting a new loop.
- Reuse existing helpers: `collide()`, `randomPiece()`, `spawn()`, `drawBlock()`,
  `drawNext()`, `updateHUD()`.

## Steps

1. **`index.html`** — add a `HOLD` panel section above the `NEXT` section:
   `<canvas id="hold-canvas" width="120" height="120">`. Add `<kbd>C</kbd> reservar`
   to the controls list.

2. **State** — add `hold` (piece type number or `null`) and `holdUsed` (boolean) to
   the `let` declaration block; reset both to `null` / `false` in `init()`.

3. **`holdPiece()`** — new function:
   - Return immediately if `holdUsed`, `paused`, or `gameOver`.
   - If `hold === null`: store `current.type`, then pull the next piece
     (`current = next; next = randomPiece(); drawNext();`).
   - Else: swap — build a fresh piece from `PIECES[hold]` (deep-copy the matrix,
     `x = Math.floor(COLS/2) - Math.floor(shape[0].length/2)`, `y = 0`, exactly as
     `randomPiece()` does), store the outgoing `current.type` in `hold`.
   - Set `holdUsed = true`, call `drawHold()`.
   - If the swapped-in piece collides at its spawn position, call `endGame()`.

4. **Reset the lock** — set `holdUsed = false` inside `spawn()`, so the allowance
   refreshes once per locked piece (not on every hold press).

5. **`drawHold()`** — mirror `drawNext()` against `hold-canvas`. When `holdUsed` is
   true, render at reduced alpha (`drawBlock(..., 0.35)`); that dimming is the
   "blocked" indicator. Clear the canvas when `hold === null`.

6. **Input** — in the `keydown` switch, add `case 'KeyC': case 'ShiftLeft':
   case 'ShiftRight': holdPiece(); break;`. The handler already returns early when
   `paused || gameOver`.

7. **`style.css`** — reuse the existing `.panel-section` rules; only add a
   `.blocked` modifier if the alpha dimming reads poorly.

## Verification

```bash
python3 -m http.server 8000   # open http://localhost:8000
```

- Press `C` with an empty hold → current piece parks, next piece takes over.
- Press `C` again on the same piece → nothing happens, the preview is dimmed.
- Let the piece lock → `C` works again and swaps the two pieces.
- Press `Shift` → same behavior as `C`.
- Hold a piece near the top of a tall stack → swapping in a colliding piece ends
  the game cleanly (overlay shown, loop stopped).
- Click **Reiniciar** → hold slot is empty and the canvas is cleared.
- Regression: move/rotate/soft drop/hard drop, line clears, level speedup, pause.

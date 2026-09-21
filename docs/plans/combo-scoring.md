# feat/combo-scoring — Combo mode and multipliers

## Goal

Reward chained and skilful clears: a consecutive-clear combo multiplier, T-spin
detection, back-to-back Tetris, and Perfect Clear, with on-canvas feedback.

Source: feature 3 of the reference feature set.

## Shared constraints

- Only `index.html`, `style.css`, `game.js`. Classic `<script>`, no modules, no deps.
- ES6+ vanilla JS, two-space indent, semicolons, single quotes.
- Player-visible UI text in **Spanish**; identifiers and code comments in **English**.
- `init()` is also the restart handler: reset every new state variable.
- Reuse existing helpers: `collide()`, `merge()`, `clearLines()`, `lockPiece()`,
  `tryRotate()`, `draw()`, `updateHUD()`.

## Steps

1. **State** — add `combo` (`-1` when idle), `b2b` (boolean), `lastMoveWasRotation`
   (boolean) and `flash` (`{ text, expiresAt }` or `null`). Reset all in `init()`.

2. **Rotation tracking** — `tryRotate()` sets `lastMoveWasRotation = true` on a
   successful rotation; every horizontal move, soft drop and hard drop sets it `false`.
   This is the classic T-spin precondition.

3. **T-spin detection** — in `lockPiece()`, **before** `clearLines()`:
   `current.type === 3` (T) AND `lastMoveWasRotation` AND at least 3 of the 4
   diagonal corners around the T's center cell are occupied or out of bounds.
   Compute the center from the piece origin (`current.x + 1`, `current.y + 1` for the
   3x3 T matrix).

4. **Split scoring out of `clearLines()`** — today `clearLines()` mutates `score`,
   `lines`, `level` and `dropInterval` inline. Refactor it to **return** the number of
   cleared rows only, and move all scoring into a new `applyScore(cleared, { tSpin })`:
   - Base: `LINE_SCORES[cleared] * level` (unchanged).
   - Combo: `combo++` when `cleared > 0`, else `combo = -1`.
     Bonus `50 * combo * level` while `combo > 0`.
   - Back-to-back: a Tetris (`cleared === 4`) or a T-spin clear while `b2b` is already
     true multiplies that clear's value by 1.5. Set `b2b` true after such a clear,
     false after any other clear (a no-clear lock does not break B2B).
   - Perfect Clear: board fully empty after the clear → large flat bonus
     (e.g. `2000 * level`).
   - Keep `lines`, `level` and `dropInterval` updates here, then `updateHUD()`.
   Call it from `lockPiece()` with the T-spin flag.

5. **HUD** — add `COMBO` and `B2B` readouts to the side panel in `index.html`
   (`#combo`, `#b2b`); update them in `updateHUD()`. Spanish labels.

6. **Visual feedback** — set `flash = { text, expiresAt: performance.now() + 900 }`
   on notable events and render it centered in `draw()` with fading alpha.
   Spanish/standard labels: `COMBO x3`, `TETRIS`, `T-SPIN`, `PERFECT CLEAR`.

7. **Audio (optional)** — if added, generate short beeps with `AudioContext`
   oscillators created on first user input. No asset files, no dependencies.

## Verification

```bash
python3 -m http.server 8000   # open http://localhost:8000
```

- Clear a line with consecutive pieces → `COMBO` climbs and the bonus is added;
  lock a piece with no clear → combo resets to idle.
- Clear a Tetris twice in a row → the second one shows the B2B bonus.
- Perform a T-spin double (rotate a T into a notch as the last move) → `T-SPIN` flashes
  and the score jumps; confirm a T dropped without rotating does **not** trigger it.
- Empty the board completely → `PERFECT CLEAR` bonus.
- Regression: base line scores and the level curve are unchanged when no combo is
  active (`LINE_SCORES[cleared] * level`); pause, game over and restart reset combo,
  B2B and the flash.

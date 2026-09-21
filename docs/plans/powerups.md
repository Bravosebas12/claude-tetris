# feat/powerups — Random power-up pieces

## Goal

Every N cleared lines, spawn a special piece carrying one of five effects:
Bomba, Rayo, Tinte, Gravedad, Congelar.

Source: feature 1 of the reference feature set.

## Shared constraints

- Only `index.html`, `style.css`, `game.js`. Classic `<script>`, no modules, no deps.
- ES6+ vanilla JS, two-space indent, semicolons, single quotes.
- Player-visible UI text in **Spanish**; identifiers and code comments in **English**.
- `init()` is also the restart handler: reset every new state variable.
- Reuse existing helpers: `merge()`, `clearLines()`, `lockPiece()`, `spawn()`,
  `randomPiece()`, `drawBlock()`, `draw()`, `loop()`.
- **Invariant**: `board` stays a `ROWS x COLS` matrix of ints where `0` is empty and
  `1..7` index `COLORS`. Do not overload those values to encode power-up data.

## Steps

1. **Constants** — `POWERUP_EVERY = 10` (lines) and a `POWERUPS` table of
   `{ id, label, color, apply(cells) }` where `cells` is the list of `{ r, c }`
   the piece just merged into.

2. **State** — `linesSincePowerup`, `pendingPowerup` (queue the next spawned piece as
   special), `frozenUntil` (timestamp), `wildcards` (a `Set` of `r * COLS + c` keys).
   Reset all in `init()`.

3. **Spawning** — in the scoring path, `linesSincePowerup += cleared`; when it crosses
   `POWERUP_EVERY`, subtract and set `pendingPowerup` to a random `POWERUPS` entry.
   `randomPiece()` attaches `piece.powerup = pendingPowerup` (a normal tetromino shape
   carrying the effect) and clears the pending flag.

4. **Trigger** — in `lockPiece()`, right after `merge()` and **before** `clearLines()`,
   call `current.powerup.apply(mergedCells)` when present. Have `merge()` return the
   list of cells it wrote so the effect knows its origin.

5. **Effects** — each a small function over `board`:
   - **Bomba** — zero a 3x3 neighborhood around every merged cell (clamped to bounds).
   - **Rayo** — zero the full row and the full column of the piece origin cell.
   - **Tinte** — add the merged cells to `wildcards`; make the line-full test in
     `clearLines()` treat a wildcard cell as filled. Drop the keys of removed rows and
     re-index the keys of rows that shift down, or `wildcards` will desync.
   - **Gravedad** — per column, collapse every gap: pull non-zero cells down to the
     bottom, preserving their order. Re-index `wildcards` the same way.
   - **Congelar** — `frozenUntil = performance.now() + 5000`. In `loop()`, skip the
     `dropAccum` gravity step while `ts < frozenUntil` (keep accepting input and
     keep drawing). Reset `dropAccum = 0` when it expires so the piece does not
     instantly drop.

6. **Rendering** — in `draw()`, give the power-up piece a pulsing stroke
   (`Math.sin(performance.now() / 200)`); tint wildcard cells distinctly. Show the
   active effect and the freeze countdown in the side panel (`index.html` + Spanish label).

## Verification

```bash
python3 -m http.server 8000   # open http://localhost:8000
```

- Clear 10 lines → the next piece spawns visibly marked as a power-up.
- Force each of the five effects from the devtools console and, after each one, assert
  the board invariant: `board.length === 20 && board.every(r => r.length === 10)` and
  every cell is `0` or a valid `COLORS` index.
- Bomba near a wall and near the floor → no out-of-bounds write.
- Tinte → the tinted row clears even with a gap at the wildcard cell; clear rows both
  above and below the wildcard and confirm the `wildcards` keys stay aligned.
- Gravedad → holes collapse, no cell is lost or duplicated.
- Congelar → the piece stops falling for ~5s, moves and rotations still respond, and
  gravity resumes normally after.
- Regression: pause during a freeze, game over, and restart clear `frozenUntil`,
  `wildcards` and the power-up counter.

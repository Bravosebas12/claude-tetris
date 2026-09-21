# feat/extra-pieces — Non-standard pieces

## Goal

Add occasional non-tetromino pieces: three pentominoes (+, U, Y), a 1x1 mono block
awarded as a Tetris reward, and a hollow 3x3 ring as a challenge piece.

Source: feature 2 of the reference feature set.

## Shared constraints

- Only `index.html`, `style.css`, `game.js`. Classic `<script>`, no modules, no deps.
- ES6+ vanilla JS, two-space indent, semicolons, single quotes.
- Player-visible UI text in **Spanish**; identifiers and code comments in **English**.
- `init()` is also the restart handler: reset every new state variable.
- Reuse existing helpers: `collide()`, `rotateCW()`, `tryRotate()`, `drawBlock()`, `drawNext()`.

## Steps

1. **`COLORS`** — append distinct hues for the 5 new shapes (indices 8..12). The
   `board` matrix stores these indices directly, so the array order is the contract.

2. **`PIECES`** — append square-padded matrices so `rotateCW()` (transpose + reverse)
   keeps working:
   - `+` pentomino, `U` pentomino, `Y` pentomino → 5x5 grids.
   - mono → `[[11]]` (1x1).
   - hollow ring → `[[12,12,12],[12,0,12],[12,12,12]]` (3x3).

3. **`randomPiece()`** — currently hardcodes `Math.floor(Math.random() * 7) + 1`.
   Replace with a weighted picker:
   - Standard tetrominoes 1..7 keep the bulk of the probability.
   - Pentominoes appear with a low chance (~8% combined).
   - The hollow ring only unlocks at `level >= 3`.
   - The mono is **not** random: queue it explicitly after a 4-line clear
     (a `pendingReward` variable consumed by `randomPiece()` on the next call).

4. **Spawn offset** — a padded 5x5 matrix can have empty leading rows, which would
   make the piece look like it floats. Compute the first non-empty row of the shape
   and set the spawn `y` to `-firstNonEmptyRow` so the visible top sits at row 0.
   `collide()` already tolerates negative `ny` (it only checks `ny >= 0` for board hits).

5. **Rotation kicks** — `tryRotate()` uses `[0, -1, 1, -2, 2]`. Test `+` and `U`
   against both walls; widen to `[0, -1, 1, -2, 2, -3, 3]` only if a wall-adjacent
   rotation actually fails.

6. **`drawNext()`** — it assumes a 4x4 preview grid
   (`offX = Math.floor((4 - shape[0].length) / 2)`, `NB = 30`, canvas 120x120).
   Generalize: `const cells = Math.max(4, shape.length, shape[0].length);`
   `const NB = nextCanvas.width / cells;` and center with `cells` instead of `4`.
   Otherwise the 5x5 pentominoes overflow the preview canvas.

7. **`index.html` / `style.css`** — no structural change required; the preview canvas
   stays 120x120 because step 6 makes the block size adaptive.

## Verification

```bash
python3 -m http.server 8000   # open http://localhost:8000
```

- Force each new type from the devtools console (e.g. override `randomPiece` or set
  `current.shape`) and confirm: it renders at spawn without floating, rotates against
  the left wall, the right wall and the floor, and locks into `board` correctly.
- Confirm the NEXT preview fits every shape, including the 5x5 pentominoes and the 1x1.
- Clear 4 lines at once → the next piece is the 1x1 mono.
- Reach level 3 → the hollow ring starts appearing; confirm its inner gap stays empty
  in `board` after locking.
- Confirm a full row still clears with any new piece contributing to it.
- Regression: standard tetromino distribution still feels normal, ghost piece tracks,
  pause, game over, restart.

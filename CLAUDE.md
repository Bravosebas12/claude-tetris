# Tetris

Vanilla JS/HTML5 Canvas Tetris implementation. No build step, no dependencies, no package.json — just open `index.html` or serve the directory statically.

## Files

- `index.html` — DOM structure: board canvas (300×600, 10×20 cells @ 30px), next-piece preview canvas, HUD (score/lines/level), pause/game-over overlay.
- `style.css` — dark/retro arcade theme.
- `game.js` — all game logic (~300 lines, single file, no modules).

## Architecture (game.js)

- **Board**: `ROWS × COLS` matrix, each cell `0` (empty), `1-8` (color index of the locking piece), or `9`/`HOLE` (nut's dead center cell).
- **Pieces**: `PIECES` array of shape matrices; `COLORS` array maps piece type to color. Rotation via `rotateCW` (transpose + reverse rows). Piece 8 is the **nut** (`NUT`): a 3×3 shape with an empty center, `[[8,8,8],[8,0,8],[8,8,8]]`. When it locks, `merge()` stamps `HOLE` into the center board cell (unless something is already there) — that cell becomes permanently unreachable, walled in on all 4 sides.
- **Collision**: `collide(shape, ox, oy)` checks bounds and existing board cells.
- **Wall kicks**: `tryRotate` tries offsets `[0, -1, 1, -2, 2]` after rotating.
- **Game loop**: `requestAnimationFrame`-driven `loop()`, accumulates delta time against `dropInterval`.
- **Line clear**: `clearLines()` scans bottom-up, splices full rows, unshifts empty rows at top. Rows containing a `HOLE` cell never count as full — they can never be cleared.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` × level; hard drop = 2 pts/row, soft drop = 1 pt/row.
- **Level/speed**: level = `floor(lines/10) + 1`; `dropInterval = max(100, 1000 - (level-1)*90)`.
- **Ghost piece**: `ghostY()` projects landing row, drawn at `globalAlpha=0.2`.

Flow: `init()` → `createBoard()` + `spawn()` (moves `next` → `current`, generates new `next`) → `requestAnimationFrame(loop)`. `spawn()` colliding immediately triggers `endGame()`.

## Controls

Arrow keys move/rotate/soft-drop, Space = hard drop, P = pause. Handled via a single `keydown` listener in `game.js`.

## Conventions

- Single global mutable state block (`board, current, next, score, ...`) declared with `let` at top — no classes, no modules.
- UI text (labels, overlay, README) is in Spanish; code identifiers and comments are in English.
- Tunable constants (`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`) live at the top of `game.js`. Changing `COLS`/`ROWS`/`BLOCK` requires updating the `<canvas id="board">` width/height in `index.html` to match.

## Testing

No test suite. Verify changes by opening `index.html` in a browser (or `npx serve .` / `python3 -m http.server`) and playing through: movement, rotation/wall-kicks, soft/hard drop, line clears, level speed-up, pause, and game-over/restart.

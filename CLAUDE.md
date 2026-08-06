# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Project**: Vanilla JavaScript Tetris game. No build, no dependencies—just HTML, CSS, and JavaScript.

**Running the game**:
- Option 1 (direct): Open `index.html` in a browser
- Option 2 (recommended): Serve locally:
  - `python3 -m http.server 8000` then visit `http://localhost:8000`
  - Or: `npx serve .`
  - Or: `php -S localhost:8000`

**Testing changes**: Save and refresh the browser—no build step needed.

## Architecture

### Three-File Structure

1. **index.html** — DOM markup
   - Two `<canvas>` elements: `#board` (300×600 px) for gameplay, `#next-canvas` (120×120 px) for next piece preview
   - Info panel: score, lines, level, controls legend
   - Overlay for pause/game-over screens
   - No inline scripts; all logic is in `game.js`

2. **style.css** — Dark/retro arcade theme
   - Flexbox layout for main container + info sidebar
   - CSS variables for spacing, colors, fonts
   - `backdrop-filter: blur()` for overlays
   - No responsive breakpoints (fixed 300×600 canvas)

3. **game.js** — Core logic (~300 lines)
   - Constants: `COLS=10`, `ROWS=20`, `BLOCK=30` (px per cell)
   - Piece definitions and color palette
   - Game state: board matrix, current/next pieces, score/level/lines, pause/gameOver flags
   - Functions: collision detection, rotation, line clearing, rendering

### Game Board Model

The `board` is a 2D array (`ROWS × COLS`):
- `0` = empty cell
- `1–7` = filled cell (indicates piece type and color via `COLORS` array)

Pieces are 4×4 matrices (sparse, mostly 0s). The current piece has `{ type, shape, x, y }`:
- `shape`: 4×4 matrix (rotatable)
- `x, y`: top-left corner position on the board

### Game Loop

```
init()
  ├─ createBoard()
  ├─ spawn() → place current piece, queue next
  └─ requestAnimationFrame(loop)
       ↓
  loop(timestamp)
    ├─ Accumulate elapsed time into dropAccum
    ├─ If dropAccum ≥ dropInterval: try move down or lock piece
    ├─ draw() → render board, ghost, current piece, next piece preview
    └─ requestAnimationFrame(loop)

  keydown event → move/rotate/soft-drop/hard-drop/pause/restart
```

**dropInterval** (milliseconds): speed at which pieces fall. Decreases with level:
```
dropInterval = max(100, 1000 - (level - 1) × 90)
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `createBoard()` | Returns empty ROWS×COLS array |
| `randomPiece()` | Generates random piece with position centered at top |
| `collide(shape, ox, oy)` | Returns true if shape would hit wall, floor, or existing blocks |
| `rotateCW(shape)` | Rotates shape 90° clockwise; returns new 4×4 matrix |
| `tryRotate()` | Attempts rotation with wall-kick offsets `[0, ±1, ±2]`; applies if no collision |
| `merge()` | Places current piece permanently on board |
| `clearLines()` | Scans board bottom→top; removes full rows and shifts rest down |
| `spawn()` | Moves `next` piece to `current`, generates new `next` piece |
| `endGame()` | Shows overlay, disables input |
| `draw()` | Renders board grid, placed blocks, ghost piece, current piece |
| `loop(timestamp)` | Main game loop; called by `requestAnimationFrame` |

### Scoring & Levels

**Line scoring** (from `LINE_SCORES` array):
- 1 line: 100 × level
- 2 lines: 300 × level
- 3 lines: 500 × level
- 4 lines (Tetris): 800 × level
- Hard drop: +2 pts per row dropped
- Soft drop: +1 pt per row

**Level progression**: Level increases every 10 lines cleared. Max practical level ~20–30 before speed approaches instant.

### Piece Rotation & Wall Kicks

Standard Tetris rotation (clockwise). Wall-kick offsets `[0, -1, 1, -2, 2]` let pieces rotate against walls:
1. Try rotation at original position
2. Try shifting left 1 cell, then right 1, left 2, right 2
3. First that doesn't collide is applied; others are skipped

This allows diagonal rotations near boundaries without looking glitchy.

### Ghost Piece

The "ghost" shows where the current piece would land:
- Calculate final `y` by simulating downward movement until collision
- Draw ghost with `globalAlpha = 0.2` (semi-transparent)

## Customization Points

All tunable constants are at the top of `game.js`:

| Constant | Default | Notes |
|----------|---------|-------|
| `COLS` | 10 | Board width in cells. Update canvas width: `COLS × BLOCK` |
| `ROWS` | 20 | Board height in cells. Update canvas height: `ROWS × BLOCK` |
| `BLOCK` | 30 | Pixels per cell. Update canvas dimensions accordingly |
| `COLORS` | 7 colors | Palette for pieces 1–7; index 0 is unused (null) |
| `LINE_SCORES` | `[0, 100, 300, 500, 800]` | Points for clearing 0, 1, 2, 3, 4 lines |

> ⚠️ If you change `COLS`, `ROWS`, or `BLOCK`, **update the `<canvas>` dimensions in `index.html` to match** (width: `COLS × BLOCK`, height: `ROWS × BLOCK`). Also adjust `#next-canvas` if needed.

## Common Tasks

**Test a logic change**: Save, refresh browser, play through a few sequences (lines, rotations, game-over).

**Adjust difficulty**: Modify `dropInterval` calculation or `LINE_SCORES` table.

**Change colors**: Edit `COLORS` array (hex values or CSS color names).

**Tweak board size**: Change `COLS`, `ROWS`, `BLOCK`, and sync canvas dimensions in HTML.

**Debug piece placement**: Add `console.log(current, board)` in `merge()` or `spawn()`.

## Browser DevTools Tips

- **Console**: Logs any collisions or state changes you add with `console.log()`
- **Elements**: Inspect `#board` and `#next-canvas` to verify dimensions match constants
- **Performance**: The game uses `requestAnimationFrame`, which throttles to ~60 FPS. No optimization needed for standard hardware

## Notes

- **No transpilation**: Uses ES6 (const/let, arrow functions, template literals, Array.from). Works in all modern browsers.
- **Canvas only**: No DOM manipulation for gameplay—all rendering is direct to canvas context.
- **Input handling**: One `keydown` listener; no key-repeat debouncing (intentional for responsive feel).
- **No persistence**: Score/level are lost on refresh; no localStorage usage.

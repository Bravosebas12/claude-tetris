# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**No build process, no dependencies.** This is vanilla HTML5 Canvas + CSS + JavaScript.

### Running the game

```bash
# Option 1: Python 3
python3 -m http.server 8000
# Then open http://localhost:8000

# Option 2: Node.js
npx serve .

# Option 3: Direct file (macOS/Linux)
open index.html
```

### Testing changes

The game runs instantly with no compilation. Make changes to `.js`/`.css`/`.html` → refresh browser → test manually. The game is fully interactive: test movement, rotation, line clears, pause/resume, game over, soft/hard drop, and wall kicks.

---

## Architecture Overview

### File structure
- **`index.html`** — DOM structure: main canvas (300×600px), next-piece preview canvas (120×120px), score/lines/level panel, pause/gameover overlay, controls display
- **`style.css`** — Dark theme styling, flexbox layout, CSS variables for colors, backdrop filters for overlays
- **`game.js`** — All game logic (~300 lines): board model, piece mechanics, collision detection, rendering, game loop, event handling

### Core concepts

**Board model** — 2D array (`ROWS × COLS`, default 20×10). Each cell is `0` (empty) or a color index `1–7` (identifies piece type).

**Pieces** — 7 Tetris shapes defined as 2D arrays with color indices. Spawn at column center, y=0. Rotation uses matrix transpose + row-reversal (`rotateCW`).

**Collision detection** (`collide`) — Checks if piece shape at position (x,y) overlaps board boundaries or filled cells.

**Wall kicks** (`tryRotate`) — When rotation fails, tries offsets `[0, -1, 1, -2, 2]` to shift piece sideways and allow rotation near walls.

**Game loop** (`loop`) — `requestAnimationFrame` callback. Accumulates elapsed time; drops piece by 1 row when `dropAccum ≥ dropInterval` (milliseconds). Triggers `lockPiece()` on collision.

**Scoring** — Line clears award `LINE_SCORES[numLines] × level`. Hard drop: +2 per cell. Soft drop: +1 per row. Level increases every 10 lines; fall speed accelerates.

**Ghost piece** — Rendered semi-transparent at the predicted landing position to show where current piece will lock.

---

## Key Functions in `game.js`

| Function | Purpose |
|----------|---------|
| `createBoard()` | Returns new empty ROWS×COLS matrix |
| `randomPiece()` | Generates random piece with shape, type, centered x position |
| `collide(shape, ox, oy)` | Returns true if piece at (ox,oy) hits boundary or board collision |
| `rotateCW(shape)` | Returns 90° clockwise rotation of shape matrix |
| `tryRotate()` | Rotates current piece with wall-kick offsets; updates current.shape and current.x if successful |
| `merge()` | Locks current piece onto board (merges shape cells into board array) |
| `clearLines()` | Removes complete rows, shifts board down, increments lines and level |
| `ghostY` | Calculates y position where current piece will lock (used for ghost piece rendering) |
| `draw()` | Renders grid, board cells, ghost piece, and current piece to main canvas |
| `drawNext()` | Renders next piece preview to next-canvas |
| `spawn()` | Moves `next` to `current`, generates new `next`, checks game-over condition |
| `lockPiece()` | Merges current onto board, clears lines, spawns next piece |
| `loop(timestamp)` | Main game loop: accumulates time, drops piece, renders, requests next frame |
| `handleKeyDown(e)` | Processes input: arrow keys (move/drop), space (hard drop), P (pause), X/↑ (rotate) |
| `init()` | Initializes board, spawns first piece, starts game loop |

---

## Tuning Parameters (in `game.js`)

```javascript
const COLS = 10;              // Board width in cells
const ROWS = 20;              // Board height in cells
const BLOCK = 30;             // Pixel size of each cell
const COLORS = [null, ...];   // Color hex codes for pieces 1–7
const LINE_SCORES = [...];    // Points for 1/2/3/4 line clears
// Fall speed: dropInterval = max(100, 1000 - (level-1)*90) ms
```

**If you change `COLS`, `ROWS`, or `BLOCK`**, update canvas dimensions in `index.html` to match: `<canvas id="board" width="COLS*BLOCK" height="ROWS*BLOCK">`.

---

## Common Changes

### Add a new piece type
1. Add color hex to `COLORS` array (e.g., `'#new_hex'` as index 8)
2. Add 4×4 shape matrix to `PIECES` array
3. The type index will auto-increment in `randomPiece()`

### Adjust fall speed curve
Modify the dropInterval formula in the level calculation. Current: `max(100, 1000 - (level-1)*90)`. Increase the 90 to make it slower; decrease for faster gameplay.

### Change scoring
Edit `LINE_SCORES` array (indices: 0 unused, 1=single, 2=double, 3=triple, 4=tetris). Modify hard-drop (+2) and soft-drop (+1) multipliers in `lockPiece()`.

### Customize colors
Hex codes in `COLORS[1–7]` map to piece types. CSS panel background is in `style.css`.

---

## Game States

- **Playing** — Active game loop, pieces falling
- **Paused** — Loop stopped, overlay hidden, board frozen (press P to toggle)
- **Game Over** — New piece can't spawn; overlay shows final score; click "Reiniciar" to reset

---

## Notable Implementation Details

- **No block physics beyond collision** — Pieces move instantly on input; falling is time-based
- **Wall kicks only on rotation** — No SRS (Super Rotation System); uses simple kickback offsets
- **Ghost piece is visual only** — Calculated but doesn't affect gameplay logic
- **Line-clear is instant** — No animation; rows disappear immediately after lockPiece
- **Next piece is spawned before current locks** — `spawn()` is called during `lockPiece()`, so next-canvas always has a piece to display

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vanilla JavaScript Tetris implementation using HTML5 Canvas. No build process, no dependencies, no frameworks—just open and run. Educational/practice project demonstrating classic game mechanics.

## Running the Game

**Browser (direct):**
```bash
start index.html    # Windows
open index.html     # macOS
xdg-open index.html # Linux
```

**Local server (recommended for testing):**
```bash
python3 -m http.server 8000
# or
npx serve .
# then open http://localhost:8000
```

## Architecture

### Three-file structure:
- **index.html** — DOM structure with two canvases (main board 300×600px, next-piece preview 120×120px), stats panel (score/lines/level), controls list, overlay for pause/game-over states
- **style.css** — Dark arcade aesthetic with monospace fonts for stats, backdrop blur overlays, flexbox layout
- **game.js** — All game logic (~300 lines, vanilla ES6+)

### Core game.js components:

**State model:**
- `board`: ROWS×COLS matrix (20×10), each cell = 0 (empty) or 1–7 (piece color index)
- `current`/`next`: pieces with `{type, shape, x, y}` where shape is 2D array
- `score`/`lines`/`level`: progression tracking
- Pieces defined as square matrices in `PIECES` array (I, O, T, S, Z, J, L)

**Collision & movement:**
- `collide(shape, ox, oy)`: checks board boundaries + overlap with locked blocks
- `tryRotate()`: rotates via `rotateCW()` (transpose + reverse rows), applies wall kicks [0, -1, 1, -2, 2] if collision detected
- Movement: arrow keys shift `current.x`/`current.y` if no collision

**Game loop:**
- `requestAnimationFrame`-based loop in `loop(timestamp)`
- Accumulates delta time (`dropAccum`), drops piece one row when exceeds `dropInterval`
- `dropInterval = max(100, 1000 - (level-1) * 90)` ms — speeds up each level
- Level increases every 10 lines cleared

**Piece lifecycle:**
1. `spawn()`: moves `next` → `current`, generates new `next`, checks instant collision (triggers game over if true)
2. Piece falls until collision
3. `lockPiece()` → `merge()` → `clearLines()` → `spawn()`

**Scoring (classic Tetris formula):**
- Line clears: `LINE_SCORES[n] * level` where `LINE_SCORES = [0, 100, 300, 500, 800]` for 1-4 lines
- Soft drop: +1 per row
- Hard drop: +2 per row from current position to ghost position

**Ghost piece:**
- `ghostY()`: projects piece downward until collision
- Rendered at 20% opacity (`globalAlpha = 0.2`) during `draw()`

**Rendering:**
- `draw()`: clears canvas, draws grid lines, board blocks, ghost piece, current piece
- `drawBlock()`: renders individual blocks with color + white highlight strip for 3D effect
- `drawNext()`: renders preview piece centered in 4×4 grid on second canvas

**Controls (keydown listener):**
- Arrow left/right: horizontal movement
- Arrow up / X: rotate clockwise
- Arrow down: soft drop
- Space: hard drop (instant fall to ghost position)
- P: pause toggle

**State transitions:**
- Pause: stops `requestAnimationFrame` loop, shows overlay, P resumes
- Game over: triggered by spawn collision, shows final score overlay, restart button calls `init()`

## Key Parameters (game.js constants)

| Constant | Value | Purpose |
|----------|-------|---------|
| `COLS` | 10 | Board width |
| `ROWS` | 20 | Board height |
| `BLOCK` | 30 | Pixel size per cell |
| `COLORS` | Array[8] | Null + 7 piece colors (cyan, yellow, purple, green, red, indigo, orange) |
| `LINE_SCORES` | [0,100,300,500,800] | Points for 1-4 line clears |
| `dropInterval` (initial) | 1000 | Starting fall speed in ms |

**Note:** Changing `COLS`/`ROWS`/`BLOCK` requires updating canvas dimensions in index.html (`width`/`height` = `COLS*BLOCK` × `ROWS*BLOCK`).

## Making Changes

- **Piece behavior:** Modify `PIECES` array (shape matrices), `rotateCW()` (rotation logic), `tryRotate()` (wall kick offsets)
- **Scoring:** Edit `LINE_SCORES`, soft/hard drop point values in `softDrop()`/`hardDrop()`
- **Speed curve:** Adjust formula in `clearLines()` where `dropInterval` is calculated
- **Visual style:** Colors in `COLORS` array, CSS variables/styles in style.css
- **Board size:** Change `COLS`/`ROWS`/`BLOCK` + sync canvas dimensions in HTML

## Testing Changes

1. Start local server (`python3 -m http.server 8000`)
2. Open in browser
3. Play through scenarios:
   - Line clears (single/double/triple/tetris)
   - Rotation near walls/floor
   - Hard/soft drops
   - Pause/unpause
   - Game over + restart
4. Check browser console for errors
5. Test responsive rendering if CSS changed

## Code Style

- ES6+ features: `const`/`let`, arrow functions, template literals, `Array.from`, spread operator
- Strict mode (`'use strict'`)
- Function naming: imperative verbs (`collide`, `merge`, `spawn`, `lockPiece`)
- No comments in original (code is self-documenting with clear names)
- Minimal abstractions—direct Canvas 2D API calls, inline game loop

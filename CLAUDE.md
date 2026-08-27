# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step, no dependencies — just HTML, CSS, and vanilla JavaScript.

**Open directly:**
```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

**With a local static server (recommended for testing):**
```bash
python3 -m http.server 8000   # Python 3
npx serve .                    # Node.js
php -S localhost:8000          # PHP
```
Then visit `http://localhost:8000`.

## Architecture

**File structure:** `index.html` (DOM + two canvases), `style.css` (dark/retro theme), `game.js` (~300 lines of game logic). No frameworks, no bundler, no virtual DOM.

**Board model:** A `ROWS × COLS` matrix (20×10 by default) where each cell holds `0` (empty) or a color index 1–7 identifying a locked piece. Updated by `merge()` after each piece locks.

**Pieces:** Defined as square matrices in `PIECES` array. Rotation via `rotateCW()` (transpose + reverse rows). The `tryRotate()` function attempts wall kicks at offsets `[0, -1, 1, -2, 2]` before giving up.

**Collision detection:** `collide(shape, ox, oy)` checks bounds and board overlap — used everywhere (movement, rotation, ghost projection, auto-drop). Single source of truth.

**Game loop:** `loop()` runs on `requestAnimationFrame`, accumulating elapsed time `dt` against `dropInterval`. When `dt >= dropInterval`, the piece auto-drops one row or locks. `dropInterval` shrinks with level: `max(100, 1000 - (level-1)*90)` ms.

**Piece lifecycle:** 
- `spawn()` promotes `next` → `current`, generates new `next`. If `current` collides at spawn, `endGame()` fires.
- `lockPiece()` calls `merge()` (stamp piece on board), `clearLines()` (score update + level calculation), then `spawn()` again.

**Line clearing:** `clearLines()` scans from bottom, removes complete rows and unshifts empty rows at top. Updates score via `LINE_SCORES[cleared_count] * level` and recalculates level every 10 cleared lines.

**Ghost piece:** `ghostY()` projects current piece downward to show landing spot. Rendered at `alpha = 0.2` in `draw()`.

**Rendering:** All drawing via `drawBlock()` helper on two canvases (`#board` for gameplay, `#next-canvas` for piece preview). No retained state — full redraw each frame.

**Tunable constants** at the top of `game.js`:
- `COLS`, `ROWS` — board dimensions (10×20 default)
- `BLOCK` — cell size in pixels (30 default)
- `COLORS` — palette by piece type
- `LINE_SCORES` — points per line clear count `[0, 100, 300, 500, 800]`

**Note:** If you change `COLS`, `ROWS`, or `BLOCK`, update the `<canvas id="board">` width/height in `index.html` to match: `width = COLS * BLOCK`, `height = ROWS * BLOCK`.

## Controls

| Key | Action |
|-----|--------|
| `← →` | Move left/right |
| `↑` or `X` | Rotate clockwise |
| `↓` | Soft drop (accelerate fall) |
| `Space` | Hard drop (instant) |
| `P` | Pause/resume |

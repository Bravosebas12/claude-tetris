# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Run the game:**
```bash
# Option 1: Direct open (macOS)
open index.html

# Option 2: Local server (recommended)
python3 -m http.server 8000
# then navigate to http://localhost:8000
```

No build step, no dependencies—vanilla HTML5 Canvas, CSS, and JavaScript ES6+.

## Project Overview

A fully playable **Tetris** implementation featuring:
- 10×20 grid with 7 standard piece types (I, O, T, S, Z, J, L)
- Rotation with wall-kick support (±1, ±2 column offsets)
- Soft drop (↓) and hard drop (Space)
- Ghost piece preview showing landing position
- Next-piece preview
- Classic Tetris scoring (100/300/500/800 points per line, multiplied by level)
- Level progression (every 10 lines cleared, speed increases)
- Pause and restart mechanics

**Files:**
- `index.html` — DOM structure and two canvas elements (game board + next preview)
- `style.css` — Dark arcade theme with flexbox layout
- `game.js` — ~300 lines of vanilla JS with all game logic
- `README.md` — Spanish documentation with detailed mechanics explanation

## Architecture & Key Concepts

### Game State & Constants

**Board model** (`game.js:45–46`): A 2D array (`ROWS × COLS`) where each cell holds `0` (empty) or a color index (1–7).

**Piece definition** (`game.js:18–27`): 7 tetromino shapes as 4×4 matrices with type identifiers. Shape data uses numeric IDs (1–7) that map to `COLORS` array.

**Key parameters** (tunable at top of `game.js`):
```javascript
COLS = 10;              // Board width
ROWS = 20;              // Board height
BLOCK = 30;             // Pixel size of one cell
COLORS = [null, ...];   // 7-color palette for piece types
LINE_SCORES = [0, 100, 300, 500, 800];  // Points per cleared line count
```

> **Important:** If you change `COLS`, `ROWS`, or `BLOCK`, also update the `<canvas id="board" width="" height="">` dimensions in `index.html` to match: `width = COLS × BLOCK`, `height = ROWS × BLOCK`.

### Collision Detection

**`collide(shape, ox, oy)`** (`game.js:55–66`): Checks if a piece overlaps existing blocks, exceeds board bounds, or would go above the top (out of render area is allowed, but collision with locked blocks is not). This function is the foundation for movement, rotation, and locking.

### Rotation Mechanics

**`rotateCW(shape)`** (`game.js:68–75`): Performs 90° clockwise rotation via matrix transpose + row reversal.

**`tryRotate()`** (`game.js:77–87`): Attempts rotation; if it collides, tries wall-kick offsets `[0, -1, 1, -2, 2]` before giving up. This allows pieces to rotate near walls.

### Game Loop & Physics

**`loop(ts)`** (`game.js:243–257`): Called via `requestAnimationFrame`. Accumulates elapsed time (`dropAccum`) and drops the piece when it exceeds `dropInterval` (milliseconds). On collision, calls `lockPiece()`.

**Drop intervals** scale by level:
```javascript
dropInterval = Math.max(100, 1000 - (level - 1) * 90);
```
Slower at level 1 (1000ms), faster at higher levels, capped at 100ms.

### Line Clearing & Scoring

**`clearLines()`** (`game.js:96–113`): Scans from bottom to top; any full row is removed and replaced with an empty row at the top. Clears as many rows as detected in one pass. Updates score by `LINE_SCORES[clearedCount] × level` and advances level every 10 lines.

**Score rewards:**
- Line clear: `LINE_SCORES[n] × level` (e.g., 4 lines = 800 × level)
- Soft drop: +1 per row
- Hard drop: +2 per cell traveled

### Ghost Piece

**`ghostY()`** (`game.js:115–119`): Projects where the current piece will land by stepping down until collision, without modifying state.

**Rendering** (`game.js:198–202`): The ghost is drawn with `globalAlpha = 0.2` at the calculated Y position.

### State Management

**Game states:** `paused` (boolean) and `gameOver` (boolean) control the overlay display and input handling.

**`togglePause()`** (`game.js:229–241`): Pauses the game loop, shows overlay, and resumes from stored timestamp when unpaused.

**`endGame()`** (`game.js:221–227`): Stops the loop, shows "GAME OVER" overlay with final score.

**`init()`** (`game.js:259–275`): Resets all state, creates a fresh board, spawns the first piece, and starts the loop.

## Rendering Pipeline

1. **`draw()`** (`game.js:188–208`): Each frame:
   - Clear canvas
   - Draw grid
   - Draw all locked blocks on board
   - Draw ghost piece (semi-transparent)
   - Draw current active piece
2. **`drawNext()`** (`game.js:210–219`): Renders next piece in the sidebar canvas (4×4 grid).
3. **`drawBlock(ctx, x, y, colorIndex, size, alpha)`** (`game.js:159–169`): Utility to draw one cell with color, highlight shine, and transparency support.

## Key Functions Reference

| Function | Purpose |
|----------|---------|
| `createBoard()` | Initialize empty grid |
| `randomPiece()` | Generate random piece with position |
| `collide(shape, ox, oy)` | Check for overlaps |
| `rotateCW(shape)` | Rotate shape 90° clockwise |
| `tryRotate()` | Attempt rotation with wall kicks |
| `merge()` | Lock piece onto board |
| `clearLines()` | Remove full rows, update score/level |
| `ghostY()` | Calculate landing Y position |
| `hardDrop()` | Instant drop + scoring |
| `softDrop()` | One-row drop + scoring |
| `lockPiece()` | Merge, clear lines, spawn next |
| `spawn()` | Move next → current, generate new next |
| `loop(ts)` | Game loop (RAF callback) |
| `togglePause()` | Pause/resume |
| `endGame()` | Trigger game over |

## Common Customizations

**Change board size:** Update `COLS`/`ROWS`, then adjust canvas `width`/`height` in HTML.

**Adjust speed:** Modify `dropInterval` calculation or starting value (line 266).

**Change colors:** Edit `COLORS` array (hex strings).

**Tweak piece shapes:** Edit `PIECES` array (4×4 matrices with type indices).

**Modify scoring:** Edit `LINE_SCORES` array.

**Alter level progression:** Change the multiplier in `clearLines()` line 109: `Math.floor(lines / 10) + 1`.

## Input Handling

Keyboard events (`game.js:277–300`):
- `←` / `→`: Move left/right
- `↑` / `X`: Rotate clockwise
- `↓`: Soft drop
- `Space`: Hard drop
- `P`: Pause/unpause

All input is blocked when `paused || gameOver` (except P key for pause toggle).

## No Dependencies

This is pure vanilla JavaScript—no npm, no build tools, no external libraries. It runs in any modern browser with HTML5 Canvas support.

## Clima en Tijuana

Cuando me pidas información sobre el clima en Tijuana, México, seguiré estos pasos:

1. **Obtener datos meteorológicos** de la API Open-Meteo para Tijuana (32.5149°N, 116.9718°W)
2. **Extraer información:**
   - Temperatura actual
   - Condición del clima
   - Humedad
   - Velocidad del viento
   - Temperatura aparente (sensación térmica)
   - Índice UV
3. **Responder en español** con información clara y legible
4. **Incluir contexto** — zona horaria (América/México_City)

**Endpoint:**
```
https://api.open-meteo.com/v1/forecast?latitude=32.5149&longitude=-116.9718&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index&timezone=America/Mexico_City
```

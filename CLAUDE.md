# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A fully playable Tetris game implementation in vanilla JavaScript, HTML5, and CSS3. No dependencies, no build process—just pure web technologies.

## Running the Game

**Option 1: Direct file opening**
```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

**Option 2: Local server (recommended)**
```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```
Then navigate to `http://localhost:8000`.

## Architecture

### File Structure
- **`index.html`** — DOM structure and two canvas elements (main board + next piece preview)
- **`style.css`** — Styling with dark/retro arcade aesthetic (flexbox, variables, backdrop-filter)
- **`game.js`** — All game logic (~300 lines), no external dependencies

### game.js Organization

**Constants (tunable parameters):**
- `COLS`, `ROWS`, `BLOCK` — Board dimensions and cell pixel size
- `COLORS` — 7-color palette indexed by piece type (1–7)
- `PIECES` — 7 standard Tetris pieces as 2D arrays; indices correspond to colors
- `LINE_SCORES` — Points for clearing 1, 2, 3, or 4 lines; multiplied by level

**Core Game State:**
- `board` — 2D array (ROWS × COLS) where each cell is 0 (empty) or a color index (1–7)
- `current` — Active piece with `type`, `shape`, `x`, `y`
- `next` — Preview of the upcoming piece
- Game metrics: `score`, `lines`, `level`, `paused`, `gameOver`
- `dropInterval` — Current fall speed in milliseconds; recalculated on level up

**Key Functions:**
- `createBoard()` — Initialize empty board
- `randomPiece()` — Generate random piece with centered spawn position
- `collide(shape, ox, oy)` — Boundary and block overlap detection
- `rotateCW(shape)` — Rotate piece 90° clockwise (transpose + reverse rows)
- `tryRotate()` — Attempt rotation; if blocked, apply wall-kick offsets (0, ±1, ±2 columns)
- `merge()` — Lock current piece into board
- `clearLines()` — Remove full rows, insert empty rows at top, calculate score
- `draw()` — Render grid, board blocks, ghost piece, and active piece
- `loop(timestamp)` — Game loop driven by `requestAnimationFrame`; accumulates dt and executes drop when `dropAccum ≥ dropInterval`

**Scoring & Difficulty:**
- Standard Tetris scoring: base points [0, 100, 300, 500, 800] multiplied by (level + 1)
- Hard drop awards 2 points per row; soft drop awards 1 point per row
- Level increments every 10 lines
- Drop speed formula: `max(100, 1000 − (level − 1) × 90)` ms

**Ghost Piece:**
- `ghostY` calculation projects the current piece downward to its final resting position
- Rendered with `globalAlpha = 0.2` for visual clarity

### Control Flow

```
init()
  ├─ createBoard()              → empty matrix
  ├─ next = randomPiece()
  ├─ spawn()                    → move next to current, generate new next
  └─ start game loop
       ↓
loop(timestamp)
  ├─ Accumulate elapsed time
  ├─ If elapsed ≥ dropInterval → lower piece or lock it
  ├─ Render board + ghost + current piece
  └─ Schedule next frame

keydown events → move / rotate / soft-drop / hard-drop / pause
```

When a newly spawned piece collides immediately (`spawn()`), `endGame()` triggers and displays the Game Over overlay.

## Game Mechanics

- **7 standard pieces** with rotation and wall-kick support
- **Soft drop** (↓) — accelerated descent
- **Hard drop** (Space) — instant drop with point bonus
- **Ghost piece** — shows landing position
- **Next preview** — display upcoming piece
- **Pause/Resume** (P key)
- **Level system** — increases every 10 lines, accelerates gravity
- **Game Over detection** — collision on spawn

## Customization

To modify gameplay, adjust the constants at the top of `game.js`:

| Constant     | Default | Notes                                      |
|--------------|---------|---------------------------------------------|
| `COLS`       | 10      | Also update canvas width in HTML            |
| `ROWS`       | 20      | Also update canvas height in HTML           |
| `BLOCK`      | 30      | Update canvas dimensions: COLS×BLOCK, ROWS×BLOCK |
| `COLORS`     | 7 hex   | Custom color palette for each piece         |
| `LINE_SCORES`| [0,...] | Points per line(s) cleared, multiplied by level |

**Important:** When changing `COLS`, `ROWS`, or `BLOCK`, synchronize the `<canvas>` width/height in `index.html` to match: `width="COLS × BLOCK"` and `height="ROWS × BLOCK"`.

## Technologies

- **HTML5 Canvas** — all rendering via 2D context
- **CSS3** — flexbox layout, CSS variables for colors, backdrop-filter for overlays
- **ES6+ JavaScript** — arrow functions, template literals, destructuring, Array methods
- **requestAnimationFrame** — browser-synchronized game loop

No build tools, transpilers, package manager, or external libraries.
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a vanilla JavaScript implementation of the classic Tetris game. It's a single-file HTML5 game with no build process, no dependencies, and no frameworks—just open `index.html` and play.

## Running the Game

**Option 1: Direct file**
```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

**Option 2: Local server (recommended)**
```bash
python3 -m http.server 8000
npx serve .
php -S localhost:8000
```

Then navigate to `http://localhost:8000`.

## Architecture

The game is organized into three files:

- **`index.html`**: DOM structure with two canvas elements (main board and next-piece preview) and UI elements (score, lines, level display). Also includes pause/game-over overlays.
- **`style.css`**: Dark/retro arcade theme using CSS variables, flexbox layout, and backdrop blur for overlays.
- **`game.js`**: All game logic (~300 lines). See below for key concepts.

## Key Game Logic Concepts

### Game State
- `board`: 2D array (ROWS × COLS) where each cell is `0` (empty) or a color index (1–7) representing a locked block
- `current`: active falling piece with `{ type, shape, x, y }`
- `next`: upcoming piece to spawn
- Score/lines/level tracking and HUD updates

### Core Algorithms

**Collision detection** (`collide`)
- Checks if a piece shape at position `(ox, oy)` overlaps with locked blocks or board boundaries
- Used for movement, rotation, and ghost-piece calculation

**Rotation** (`rotateCW`, `tryRotate`)
- `rotateCW` transposes and reverses the shape matrix for clockwise rotation
- `tryRotate` implements wall-kick: if rotation fails at current position, tries offsets ±1, ±2 before rejecting

**Line clearing** (`clearLines`)
- Iterates bottom-to-top; full rows are removed and empty rows inserted at top
- Updates score/level/drop-speed based on lines cleared

**Ghost piece** (`ghostY`)
- Simulates piece falling to find final landing position; drawn at low alpha to preview where piece will lock

### Game Loop
- `loop(timestamp)` runs at 60 FPS via `requestAnimationFrame`
- Accumulates time delta; when accumulated time ≥ `dropInterval`, piece drops one row
- Calls `lockPiece()` when piece can't drop further (merge, clear lines, spawn next)

### Input Handling
- Arrow keys: move/soft-drop
- Up/X: rotate
- Space: hard drop
- P: pause/unpause
- Restart button: calls `init()`

## Tunable Constants in `game.js`

| Constant      | Meaning                                | Default |
|---------------|----------------------------------------|---------|
| `COLS`        | Board width                            | 10      |
| `ROWS`        | Board height                           | 20      |
| `BLOCK`       | Pixel size per cell                    | 30      |
| `COLORS`      | Piece color palette (7 pieces)         | varies  |
| `LINE_SCORES` | Points for 1–4 lines cleared           | [0,100,300,500,800] |
| `dropInterval` | Initial fall speed (milliseconds)      | 1000    |

**Important**: If you change `COLS`, `ROWS`, or `BLOCK`, update the canvas dimensions in `index.html` accordingly (`width = COLS * BLOCK`, `height = ROWS * BLOCK`).

## Common Tasks

**Add a new piece variant**
- Define its shape in `PIECES` array
- Add corresponding color to `COLORS` array
- Update piece generation logic if needed

**Adjust difficulty**
- Tweak `dropInterval` start value or level-speed formula in `clearLines`
- Modify `LINE_SCORES` multipliers

**Change visual style**
- Update `COLORS` array for piece colors
- Edit `style.css` for board/UI styling
- Adjust `drawBlock()` highlight/shadow in `game.js`

**Add game mechanics**
- Hold piece: extend state with `hold` variable; intercept input and swap `current` with `hold`
- Preview multiple pieces: add more canvas previews; extend `next` to a queue
- Particle effects: add to `draw()` or create separate canvas layer

## Conventions

- No external libraries; vanilla ES6+
- Single-responsibility: `createBoard()`, `randomPiece()`, `collide()`, etc. are isolated
- Game state lives in module scope; all logic functions read/mutate it
- Drawing is decoupled from logic; `draw()` renders current state without side effects

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build step — open directly or serve statically:

```powershell
# Windows
start index.html

# Or with a local server
python3 -m http.server 8000
npx serve .
```

## Architecture

Three files, no dependencies, no bundler:

- **`index.html`** — DOM structure: `<canvas id="board">` (300×600px) for the board, `<canvas id="next-canvas">` (120×120px) for the preview, `#overlay` div for pause/game-over states.
- **`style.css`** — dark/retro aesthetic; backdrop-filter overlays.
- **`game.js`** — all game logic (~300 lines). Key functions:
  - `init()` / `spawn()` — set up board and piece lifecycle
  - `loop(timestamp)` — `requestAnimationFrame` game loop; accumulates delta time against `dropInterval`
  - `collide()` — bounds + overlap detection
  - `tryRotate()` — rotation with ±1/±2 column wall kicks
  - `clearLines()` — removes full rows bottom-up, inserts empty row at top
  - `draw()` — renders grid, ghost piece (`globalAlpha=0.2`), current piece, next-piece preview
  - `lockPiece()` — merges piece into board, clears lines, updates score/level, spawns next
  - `endGame()` — shows overlay

## Key constants (game.js)

| Constant | Default | Notes |
|---|---|---|
| `COLS` / `ROWS` | 10 / 20 | Must match canvas `width`/`height` = `COLS×BLOCK` / `ROWS×BLOCK` |
| `BLOCK` | 30 | Pixel size per cell |
| `COLORS` | 7 colors | Index 1–7 maps to piece types I/O/T/S/Z/J/L |
| `LINE_SCORES` | `[0,100,300,500,800]` | Multiplied by current level |

Speed formula: `Math.max(100, 1000 - (level - 1) * 90)` ms per drop. Level increments every 10 lines.

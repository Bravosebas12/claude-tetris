# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A playable classic Tetris implemented in vanilla JavaScript with HTML5 Canvas and CSS. No dependencies, no build step, no package.json — just three files.

## Running the game

No install or build required.

```bash
start index.html       # Windows: open directly in the browser
```

Or serve it locally (recommended so `file://` restrictions don't bite):

```bash
python3 -m http.server 8000
npx serve .
php -S localhost:8000
```

Then open `http://localhost:8000`. There are no lint, build, or test scripts in this project.

## Architecture

Three files, single responsibility each:

- `index.html` — DOM structure: the `#board` canvas (300×600, 10×20 grid at `BLOCK`=30px), the `#next-canvas` preview, the HUD panel, and the pause/game-over `#overlay`.
- `style.css` — dark/retro arcade visual theme (flexbox layout, backdrop-blur overlays).
- `game.js` — all game logic, organized around one game loop and a set of pure-ish helper functions operating on module-level state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.). No classes, no modules — everything is top-level functions and `const`/`let` bindings in one file.

### Core flow

```
init()
  createBoard()            → empty ROWS×COLS matrix
  next = randomPiece()
  spawn()                  → promotes next to current, generates a new next
  requestAnimationFrame(loop)

loop(timestamp)
  accumulate dt
  if dt >= dropInterval: move piece down or lockPiece()
  draw()                   → grid + board + ghost piece + current piece
  requestAnimationFrame(loop)

keydown → move / rotate / soft-drop / hard-drop / pause (see index.html controls list)
```

If a piece collides immediately on `spawn()`, `endGame()` fires and the Game Over overlay is shown.

### Key mechanics (all in `game.js`)

- **Board model**: `ROWS × COLS` matrix where each cell is `0` (empty) or a 1–7 color index identifying the piece type.
- **Pieces**: defined as square matrices in `PIECES`. Rotation (`rotateCW`) is transpose + row-reverse.
- **Collision** (`collide`): checks board bounds and overlap with already-locked cells.
- **Wall kicks** (`tryRotate`): on a blocked rotation, tries offsets `[-1, 1, -2, 2]` columns before giving up.
- **Line clearing** (`clearLines`): scans bottom-up; a full row is spliced out and an empty row unshifted at the top.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by current level; hard drop adds 2 pts/cell dropped, soft drop 1 pt/row.
- **Leveling/speed**: level increases every 10 lines; `dropInterval = max(100, 1000 - (level-1)*90)` ms.
- **Ghost piece** (`ghostY`): projects the current piece straight down to its landing row, drawn at `globalAlpha = 0.2`.

### Tunable constants (in `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval`. If you change `COLS`/`ROWS`/`BLOCK`, also update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Tetris implementation in vanilla JavaScript with HTML5 Canvas. No dependencies, no build step, no package.json.

## Running the game

There is no build/lint/test tooling in this repo. To run it:

```bash
start index.html        # Windows: open directly in the browser
# or serve it locally (recommended, avoids any file:// quirks)
python3 -m http.server 8000
npx serve .
```

Then open the page (or `http://localhost:8000`) in a browser. Verify changes manually by playing the game — there is no automated test suite.

## Architecture

Three files, no modules/bundler:

- `index.html` — DOM structure: the `#board` canvas (300×600, i.e. `COLS×BLOCK` by `ROWS×BLOCK`), the `#next-canvas` preview, the score/lines/level panel, and the pause/game-over overlay.
- `style.css` — dark/retro arcade visual theme.
- `game.js` — all game logic, organized around a small set of global state variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) and functions operating on them:
  - **Board model**: a `ROWS × COLS` matrix; each cell is `0` (empty) or a piece-color index (1–7).
  - **Pieces**: the 7 tetrominoes are defined as square matrices in `PIECES`. Rotation (`rotateCW`) is done via transpose + row reversal, not stored per-orientation.
  - **Collision** (`collide`): checks board bounds and existing fixed blocks.
  - **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` columns until a non-colliding position is found.
  - **Game loop** (`loop`): driven by `requestAnimationFrame`; accumulates elapsed time (`dropAccum`) and advances the piece one row once `dropInterval` is exceeded.
  - **Line clearing** (`clearLines`): scans bottom-up, splices full rows out and unshifts empty rows at the top.
  - **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row.
  - **Leveling/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
  - **Ghost piece** (`ghostY`): projects the current piece straight down to its landing row, drawn at `globalAlpha = 0.2`.

Control flow: `init()` builds the board, spawns the first pieces, and starts the `requestAnimationFrame` loop. `spawn()` promotes `next` to `current` and generates a new `next`; if the newly spawned piece immediately collides, `endGame()` fires and the Game Over overlay is shown. Keyboard input (`keydown` listener) handles movement/rotation/soft-drop/hard-drop/pause; `P` toggles pause independent of `gameOver` state.

Tunable constants live at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`, `ROWS`, or `BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK` and `ROWS × BLOCK`).

README.md is in Spanish and contains the same architecture notes in more detail — consult it for prose explanations if needed.

## GitHub Actions

Three Claude-powered workflows live in `.github/workflows/`:

- `claude.yml` — runs when someone mentions `@claude` in an issue/PR comment, review, or when an
  issue is opened/assigned with `@claude` in the title or body. Does whatever the mention asks
  (implement a fix, answer a question, etc.).
- `claude-code-review.yml` — runs automatically on every PR (opened/synchronize/reopened) and posts
  an automated code review via the `code-review` plugin.
- `claude-issue-triage.yml` — runs automatically when an issue is opened or edited (and does **not**
  mention `@claude`, to avoid double-firing with `claude.yml`). Ensures a fixed set of project
  labels exists (type, `area:*`, `priority:*`, `complexity:*`, `needs-info`, `triaged`), has Claude
  read the issue plus the relevant source, assigns labels from that fixed set, and posts a Spanish
  diagnostic comment (probable cause, code involved, proposed fix, acceptance criteria). That
  comment is meant to be the input for a follow-up `@claude` mention that implements the fix.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

There is no build step, no `package.json`, no bundler, no test suite and no linter. Do not add one unless asked. Verify changes by loading the page in a browser:

```powershell
start index.html            # open the file directly
python -m http.server 8000  # or serve statically, then open http://localhost:8000
```

## Architecture

Three files, loaded as classic (non-module) scripts:

- `index.html` — DOM shell: `<canvas id="board">` (300×600), the panel spans `#score` / `#lines` / `#level`, `<canvas id="next-canvas">` (120×120), and the single `#overlay` reused for the name prompt, PAUSA and GAME OVER — its `#name-form`, `#ranking-list` and `#restart-btn` children are shown/hidden per state.
- `style.css` — dark arcade theme. The generic `.hidden { display: none; }` utility is the show/hide switch JS toggles on any element (the overlay itself included).
- `game.js` — the whole game, in layered order: constants → DOM refs → one block of `let` globals (`board, current, next, score, …, playerName, playerKey, awaitingName`) → geometry helpers (`createBoard`, `collide`, `rotateCW`, `ghostY`) → state mutators (`merge`, `clearLines`, `lockPiece`, `spawn`) → renderers (`drawBlock`, `drawGrid`, `draw`, `drawNext`) → ranking helpers (`toDisplayName`, `loadRanking`/`saveRanking`, `recordScore`, `renderRanking`) → `loop`, the `keydown` handler, the name-prompt flow (`showOverlay`, `promptForName`, `confirmName`), and `init`.

Control flow: the game never starts on its own — `promptForName()` runs at load and shows the overlay's name form; submitting it (`confirmName`) sets `playerName`/`playerKey` and calls `init()`, which builds state and starts `requestAnimationFrame(loop)`. `loop` accumulates `dt` into `dropAccum` and drops one row per `dropInterval`, redrawing every frame; a piece that cannot descend goes `lockPiece()` → `merge` → `clearLines` → `spawn`. `init()` is the only game-state reset path; `#restart-btn` triggers `promptForName()` first (reinicio pide nombre de nuevo), not `init()` directly. `awaitingName` gates the `keydown` handler while the name form is up, since no board/piece exists yet.

## Invariants to preserve

- Cell values `1–7` are simultaneously the piece type, the fill value inside `PIECES[type]`, and the index into `COLORS`. Board cells and shape matrices share that one space, so `COLORS` and `PIECES` must be reordered together.
- `<canvas id="board">` `width`/`height` in `index.html` must equal `COLS * BLOCK` × `ROWS * BLOCK`. `drawNext` centers into a fixed 4×4 grid at 30px, matching `#next-canvas` at 120×120.
- `collide` is the single source of truth for legality (walls, floor, occupied cells); rows above the board (`ny < 0`) are intentionally allowed. Route every move, rotation and drop through it.
- Rotation is naive transpose-and-reverse plus `[0,-1,1,-2,2]` column kicks in `tryRotate` — not SRS. The I piece uses a 4×4 matrix so it rotates about its center.
- `game.js` has no exports and runs on load; `'use strict'` is on and every function is a global.
- Player identity is case-insensitive: `playerKey` is always the lowercased, whitespace-collapsed name (`toDisplayName(...).toLowerCase()`), so "Ariana"/"ariana"/"ARIANA" resolve to the same ranking entry. `playerName` (Title Case, e.g. "Ariana") is display-only and gets refreshed on every `recordScore` call, so the ranking always shows the most recently confirmed casing.
- Ranking persists in `localStorage`: `tetris-ranking` (JSON array of `{key, name, score}`, each player's *best* score only, sorted desc) and `tetris-last-player` (last confirmed display name, used to prefill the name prompt). Both are read/written only through `loadRanking`/`saveRanking`/`recordScore` — don't touch `localStorage` for these directly elsewhere.
- Player names are untrusted free text: `renderRanking` builds the list with `createElement`/`textContent`, never `innerHTML`. Keep it that way — don't switch to string-concatenated HTML.

## Known quirks (pre-existing — don't mistake them for your change)

- `loop` resets `dropAccum = 0` instead of subtracting `dropInterval`, so drop timing drifts slightly under frame jitter.
- Resuming from pause resets `lastTime = performance.now()` to avoid one huge `dt`.

## Language

User-facing text is Spanish (`<html lang="es">`, `PAUSA`, `Reiniciar`, `Puntuación`), as is the README. Keep UI strings in Spanish; code identifiers are English and comments are mixed — follow the surrounding file.

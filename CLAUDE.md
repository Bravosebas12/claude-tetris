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

- `index.html` — DOM shell: `<canvas id="board">` (300×600) inside `.board-wrap` (which also holds the `#toast` combo banner), the panel spans `#score` / `#lines` / `#level` / `#hold-section` (`<canvas id="hold-canvas">`, 120×120) / `#next-canvas` (120×120), and the single `#overlay` reused for the name prompt, PAUSA and GAME OVER — its `#name-form`, `#ranking-list` and `#restart-btn` children are shown/hidden per state.
- `style.css` — dark arcade theme. The generic `.hidden { display: none !important; }` utility is the show/hide switch JS toggles on any element (the overlay itself included) — it needs `!important` because several elements (`#name-form`, canvases) are styled by id, which otherwise outranks a plain class.
- `game.js` — the whole game, in layered order: constants (including piece/color tables and the combo/T-spin scoring constants) → DOM refs → one block of `let` globals (`board, current, next, score, …, playerName, playerKey, awaitingName, heldType, holdLocked, combo, lastClearWasTetris, pendingRewardPiece, lastActionWasRotate, …`) → geometry helpers (`createBoard`, `collide`, `rotateCW`, `ghostY`, `tryRotate`, `detectTSpin`) → state mutators (`merge`, `clearLines`, `lockPiece`, `spawn`, `pieceFromType`, `pickPieceType`, `randomPiece`, `holdPiece`) → renderers (`drawBlock`, `drawGrid`, `draw`, `drawPiecePreview`/`drawNext`/`drawHold`) → ranking helpers (`toDisplayName`, `loadRanking`/`saveRanking`, `recordScore`, `renderRanking`) → UI feedback (`showToast`) → sound (`getAudioCtx`, `playTone`, `playComboSound`) → `loop`, the `keydown` handler, the name-prompt flow (`showOverlay`, `promptForName`, `confirmName`), and `init`.

Control flow: the game never starts on its own — `promptForName()` runs at load and shows the overlay's name form; submitting it (`confirmName`) sets `playerName`/`playerKey`, unlocks the (suspended-until-gesture) `AudioContext`, and calls `init()`, which builds state and starts `requestAnimationFrame(loop)`. `loop` accumulates `dt` into `dropAccum` and drops one row per `dropInterval`, redrawing every frame; a piece that cannot descend goes `lockPiece()` → `detectTSpin` → `merge` → `clearLines` → `spawn`. `init()` is the only game-state reset path; `#restart-btn` triggers `promptForName()` first (reinicio pide nombre de nuevo), not `init()` directly. `awaitingName` gates the `keydown` handler while the name form is up, since no board/piece exists yet.

## Invariants to preserve

- Cell values `1–12` are simultaneously the piece type, the fill value inside `PIECES[type]`, and the index into `COLORS`. Board cells and shape matrices share that one space, so `COLORS` and `PIECES` must be reordered together. `1–7` are the standard tetrominoes; `8–10` and `12` are special pieces that spawn occasionally via `pickPieceType`/`SPECIAL_TYPES` (plus, U and Y pentominoes, and a hollow 3×3 "challenge" piece); `11` (the 1×1 "reward" piece) is never chosen at random — it only spawns via `pendingRewardPiece`, set by `clearLines` after a Tetris (4-line clear).
- `<canvas id="board">` `width`/`height` in `index.html` must equal `COLS * BLOCK` × `ROWS * BLOCK`. `drawPiecePreview` (shared by `drawNext` and `drawHold`) centers into a fixed 4×4 grid at 30px, matching `#next-canvas`/`#hold-canvas` at 120×120 — so any new piece type must fit in a 4×4 bounding box.
- `collide`, `rotateCW`, `ghostY` and `drawPiecePreview` are fully generic over shape-matrix size (no 3×3/4×4 assumption baked in) — this is what let the pentomino pieces (§ below) slot in without touching any of them.
- `collide` is the single source of truth for legality (walls, floor, occupied cells); rows above the board (`ny < 0`) are intentionally allowed. Route every move, rotation and drop through it.
- Rotation is naive transpose-and-reverse plus `[0,-1,1,-2,2]` column kicks in `tryRotate` — not SRS. Non-square pieces are padded into a square bounding box so they rotate about a stable center instead of jumping: `I` uses 4×4 (real shape 4×1), the `U` pentomino uses 3×3 (real shape 2×3), the `Y` pentomino uses 4×4 (real shape 4×2).
- T-spin detection (`detectTSpin`) is a simplified heuristic, not real SRS T-spin detection: last action was a successful rotation of a `T` piece (`lastActionWasRotate`, set in `tryRotate`, cleared only by `ArrowLeft`/`ArrowRight` — drops don't clear it, since a straight hard-drop after rotating into a slot should still count), and ≥3 of the T's 3×3 bounding-box corners are occupied. It's called in `lockPiece` *before* `merge()`.
- Hold (`heldType`/`holdLocked`, keys `KeyC`/`ShiftLeft`/`ShiftRight`, `holdPiece`): swapping always returns the previously-held piece in spawn orientation (rotation state is discarded). `holdLocked` blocks repeat use until the in-play piece actually settles (reset in `lockPiece`, not in `holdPiece`) — don't reset it anywhere else, or hold-spam becomes possible.
- Combo/score bonuses (`clearLines`): `combo` resets to `0` on any 0-line lock; `lastClearWasTetris`/B2B and Perfect Clear are only evaluated on a lock that actually cleared ≥1 line. These are additive to the base `LINE_SCORES[cleared] * level` score, not replacements for it.
- Sound (`playTone`/`playComboSound`) is synthesized with the Web Audio API — no audio files, consistent with "no build step, no asset pipeline". `AudioContext` starts suspended until a user gesture; it's resumed once in `confirmName` (the "Jugar" submit is a real click/Enter).
- `game.js` has no exports and runs on load; `'use strict'` is on and every function is a global.
- Player identity is case-insensitive: `playerKey` is always the lowercased, whitespace-collapsed name (`toDisplayName(...).toLowerCase()`), so "Ariana"/"ariana"/"ARIANA" resolve to the same ranking entry. `playerName` (Title Case, e.g. "Ariana") is display-only and gets refreshed on every `recordScore` call, so the ranking always shows the most recently confirmed casing.
- Ranking persists in `localStorage`: `tetris-ranking` (JSON array of `{key, name, score}`, each player's *best* score only, sorted desc) and `tetris-last-player` (last confirmed display name, used to prefill the name prompt). Both are read/written only through `loadRanking`/`saveRanking`/`recordScore` — don't touch `localStorage` for these directly elsewhere.
- Player names are untrusted free text: `renderRanking` builds the list with `createElement`/`textContent`, never `innerHTML`. Keep it that way — don't switch to string-concatenated HTML.

## Known quirks (pre-existing — don't mistake them for your change)

- `loop` resets `dropAccum = 0` instead of subtracting `dropInterval`, so drop timing drifts slightly under frame jitter.
- Resuming from pause resets `lastTime = performance.now()` to avoid one huge `dt`.

## Language

User-facing text is Spanish (`<html lang="es">`, `PAUSA`, `Reiniciar`, `Puntuación`), as is the README. Keep UI strings in Spanish; code identifiers are English and comments are mixed — follow the surrounding file.

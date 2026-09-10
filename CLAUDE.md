# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A classic Tetris implementation in vanilla JavaScript, HTML5 Canvas, and CSS. No dependencies, no build step, no `package.json`. The entire game lives in three files:

- `index.html` — DOM structure: the main `<canvas id="board">` (300×600, 10×20 grid of 30px blocks), the `<canvas id="next-canvas">` preview, HUD elements (`#score`, `#lines`, `#level`, `#combo`), the theme/sound toggle buttons, and the pause/game-over overlay.
- `style.css` — dark/retro arcade visual theme.
- `game.js` — all game logic, rendering, effects and audio (single file, no modules).

## Running the game

There's no build/test/lint tooling. Just serve or open the files directly:

```bash
# Open directly
start index.html       # Windows

# Or serve locally (any static server works)
python3 -m http.server 8000
npx serve .
```

Then open in a browser (or `http://localhost:8000` if serving). To verify changes, open `index.html` in a browser and play — there is no automated test suite.

## Architecture

Everything is global state and top-level functions in `game.js` — no classes, no modules, no build step. Key pieces:

- **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or an index 1–8 into `COLORS`/`PIECES` identifying which piece locked there.
- **Pieces**: `PIECES` defines each piece as a square matrix of color indices, including the 7 classic tetrominoes plus an 8th challenge piece, the "nut" (`NUT = 8`): a 3×3 ring (`[[8,8,8],[8,0,8],[8,8,8]]`) with an empty center that can never be filled by another piece, permanently blocking that row from being cleared (unless the row above it clears first, exposing the hole from above so a later piece can fill it). `current` and `next` are `{ type, shape, x, y }` objects; `randomPiece()` creates new ones, picking uniformly among all 8 types.
- **Nut holes rendering**: `holes` is a render-only `ROWS × COLS` matrix (parallel to `board`, kept in sync in `merge()` and `clearLines()`) marking which locked cells are a nut's empty center, so `draw()`/`drawNext()` can paint a circle there via `drawNutHole()`. It never participates in collision or line-clear logic — `board` alone is the source of truth for those.
- **Rotation**: `rotateCW(shape)` transposes + reverses rows. `tryRotate()` applies it and, on collision, attempts wall kicks via `kicks = [0, -1, 1, -2, 2]` (small horizontal offsets) before giving up.
- **Collision**: `collide(shape, ox, oy)` checks board bounds and overlap with locked cells — the single source of truth used by movement, rotation, and drop logic.
- **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulates elapsed time in `dropAccum`, and advances the piece down one row (or locks it) once `dropAccum >= dropInterval`.
- **Locking a piece**: `lockPiece()` → `merge()` (writes the piece into `board`) → `clearLines(neutralTurn)` → `spawn()` (promotes `next` to `current`, generates a new `next`; if the new piece immediately collides, calls `endGame()`). `neutralTurn` is `true` when the locked piece was a `BOMB`, so an empty-landing bomb doesn't break the combo streak.
- **Line clearing / scoring**: `clearLines()` scans bottom-up, splicing out full rows and unshifting empty ones at the top. Score uses `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level` and by `comboMultiplier()`; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row (neither is affected by the combo). `level` increments every 10 lines, and `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Chained combo**: `combo` counts consecutive piece placements that cleared at least one line; `comboMultiplier()` returns `min(combo, COMBO_MAX)` (capped at x10) and scales line-clear score. Locking a piece that clears nothing resets `combo` to 0 — except a `BOMB` landing empty, which is a neutral turn that preserves the streak. `comboFx` drives a fading "COMBO xN" overlay on the board (`draw()`) once `combo >= 2`; the HUD's `#combo-section` gets a `combo-active` class for the same condition.
- **Ghost piece**: `ghostY()` projects `current`'s landing row by repeatedly testing `collide` downward; drawn at `globalAlpha = 0.2`.
- **Rendering**: `draw()` clears the canvas, applies the screen-shake translation (if `shake` is active) inside a `ctx.save()`/`ctx.restore()` pair, then redraws the grid, locked board, ghost piece, and current piece every frame onto `#board`; `drawNext()` renders the preview piece onto `#next-canvas`. Because `draw()` has a mid-function `if (gameOver) return`, that early exit also calls `ctx.restore()` first so the save/restore stack never leaks. `cssVar(name, fallback)` caches `getComputedStyle` lookups for theme colors used while drawing (nut holes, grid lines, combo/banner text); `applyTheme()` clears the cache so a theme switch is picked up on the next frame.
- **Input**: a single `keydown` listener calls `unlockAudio()` first (any key is a valid gesture to unlock/resume the `AudioContext`), then handles `KeyM` (mute toggle, works even while paused/game-over — see below), `KeyP` (pause, same), arrows (move/soft-drop), `ArrowUp`/`KeyX` (rotate), `Space` (hard drop). Movement/rotation sounds only fire when the action actually succeeds (`tryRotate()` now returns `true`/`false` for this).

## Visual effects

All effects below are **render-only state** — like `holes`, none of them are read by `collide()`, scoring, or any other gameplay logic, and a bug in them cannot affect the board:

- `particles` (array of `{x, y, vx, vy, life, maxLife, color, size}`), `flashes` (array of `{row, t}`), `banner` (single `{text, t, color}` or `null`), and `shake` (single `{t, dur, mag}` or `null`) are ticked every frame in `tickEffects(dt)` (called from `loop()`, right after `animClock += dt`) and rendered in `draw()`. They follow the same `{t}`-accumulator idiom already used by `blast`/`comboFx`.
- `clearLines()` captures each full row's index **and a copy of its color values** (`board[r].slice()`) *before* splicing it out — the splice/unshift immediately destroys that row's position in `board`, so this is the only point where the flash/particle color/position can be read.
- **Line clear**: each cleared row gets a white `flashes` entry plus a handful of `spawnLineParticles` in the row's own color. 1–3 lines play `SFX.clear(n)`; 4 lines (`cleared >= 4`) instead play `SFX.tetris()`, show a "¡TETRIS!" `banner`, and trigger a bigger `shakeScreen`.
- **Combo**: unchanged `comboFx` mechanism, but the popup now pops in with a scale easing and shifts color by multiplier tier (amber → orange → pink → cyan at x10). `pulseCombo()` removes then re-adds the `combo-active` class (forcing a reflow in between) so the CSS `combo-pulse` keyframe replays on every multiplier increase — previously it only played once, since re-toggling an already-present class doesn't restart a CSS animation.
- **Level up**: `clearLines()` captures `prevLevel` before recomputing `level`; if it went up, shows a "NIVEL N" banner and plays `SFX.levelUp()`.
- **Bomb**: `explode()` keeps the existing `blast` ring, adds `SFX.bomb()`, a strong `shakeScreen`, and a burst of `spawnParticles` at the blast center.
- **Hard drop**: small `shakeScreen` + `SFX.hardDrop()`.
- **Screen shake**: `shakeScreen(mag, dur)` sets/replaces `shake` (a stronger shake in flight is never downgraded by a weaker one). `draw()` wraps its whole body in `ctx.save()`/translate-by-shake/`ctx.restore()`, but the initial `ctx.clearRect()` happens *before* the translate (in identity transform) so the full canvas is always cleared — the board's opaque background comes from CSS (`#board { background: var(--board-bg) }`), so the sliver revealed at an edge during a shake reads as the board jolting, not as a rendering artifact.
- HUD: `updateHUD()` also toggles a `combo-hot` class (`combo >= 5`) for a stronger glow at high combo tiers.

## Audio

Entirely synthesized with the Web Audio API — no audio files, no `<audio>` tags, no dependencies:

- `unlockAudio()` lazily creates a single `audioCtx`/`masterGain` pair on first use and calls `resume()` if suspended; it's invoked from the `keydown` listener and every button click (`restartBtn`, `themeToggle`, `soundToggle`) since browsers require a user gesture to start/resume an `AudioContext`. If the browser has no `AudioContext`, `unlockAudio()` no-ops and every `SFX.*` call becomes a silent no-op — the game never depends on audio.
- `tone(opts)` is the one primitive behind almost every sound: an `OscillatorNode` with an exponential attack/decay `GainNode` envelope (avoids clicks), disconnected from the graph in `onended` (no node leaks). `noise(opts)` is the same idea with a cached white-noise `AudioBufferSourceNode` through a swept lowpass filter, used for the bomb and the hard-drop thud. Both are guarded by a `voices` counter capped at `MAX_VOICES` so rapid key-repeat can't stack into distortion; `throttled(key, fn)` additionally rate-limits `move`/`rotate`/`softDrop` to `MOVE_SFX_THROTTLE` ms apart.
- `SFX` is a plain object of fire-and-forget functions (`move`, `rotate`, `softDrop`, `hardDrop`, `lock`, `clear(n)`, `tetris`, `combo(mult)`, `levelUp`, `bomb`, `gameOver`) — `SFX.combo(mult)` is the pitch-rises-with-the-streak signature sound. None of them ever `await` or block the game loop.
- Mute: `setMuted(v)` sets `masterGain.gain.value` and persists to `localStorage` (`SOUND_STORAGE_KEY = 'tetris-muted'`); `initSound()` restores it at boot, mirroring the existing `applyTheme`/`initTheme` pattern. Toggled by `KeyM` (works even while paused/game-over, like `KeyP`) or the `#sound-toggle` HUD button.

## Tunable constants (in `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell size px), `COLORS`, `LINE_SCORES`, `dropInterval` (initial fall speed), `COMBO_MAX` (combo multiplier cap), `COMBO_FX_DURATION` (ms the "COMBO xN" overlay stays visible), `MASTER_VOLUME`, `MAX_VOICES`, `MOVE_SFX_THROTTLE` (audio), `MAX_PARTICLES`, `FLASH_DURATION`, `BANNER_DURATION`, `PARTICLE_GRAVITY`, `SHAKE_HARD_DROP`/`SHAKE_TETRIS`/`SHAKE_BOMB` (visual effects). If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK` by `ROWS × BLOCK`).

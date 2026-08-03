# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Vanilla JavaScript Tetris implementation using HTML5 Canvas. Three files, no dependencies, no build step, no `package.json`.

## Running / testing

No automated tests — verify changes by playing the game in a browser (`start index.html` on Windows, or serve the directory statically).

## Architecture (`game.js`)

- **Collision** (`collide`): checks a shape against board bounds and locked cells at a given offset. This is the single shared predicate — used for movement, rotation, ghost-piece projection, and spawn-blocking (game-over check). Reuse it rather than writing new bounds checks.
- **Pieces**: `PIECES` index doubles as the color index into `COLORS` and the value baked into locked board cells — keep the piece list and color list in sync.
- **Cross-file constraint**: if `COLS`, `ROWS`, or `BLOCK` change, the `#board` canvas `width`/`height` in `index.html` must be updated to match (`COLS × BLOCK`, `ROWS × BLOCK`).

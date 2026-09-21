'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Each skin owns its palette (12 color indices, index 0 unused) plus its own
// block-drawing routine. `drawBlock(context, x, y, colorIndex, size, alpha)`
// draws one cell at grid coordinates (x, y) — `x * size`/`y * size` pixels —
// so both the board (size = BLOCK) and the preview slots (size = NB) share it.
const SKINS = {
  retro: {
    id: 'retro',
    label: 'Retro',
    theme: 'retro',
    gridColor: '#22222e',
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#7986cb', // J - indigo
      '#ffb74d', // L - orange
      '#4db6ac', // + pentomino - teal
      '#f06292', // U pentomino - pink
      '#9575cd', // Y pentomino - violet
      '#fff176', // mono reward - bright yellow
      '#90a4ae', // hollow ring - blue grey
    ],
    // Flat fill with a soft top highlight — the historical look, kept as the
    // regression baseline for the other skins.
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const px = x * size + 1, py = y * size + 1, s = size - 2;
      context.globalAlpha = alpha;
      context.fillStyle = this.colors[colorIndex];
      context.fillRect(px, py, s, s);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px, py, s, 4);
      context.globalAlpha = 1;
    },
  },
  neon: {
    id: 'neon',
    label: 'Neón',
    theme: 'neon',
    gridColor: '#1a2a3a',
    colors: [
      null,
      '#00e5ff', // I - cyan
      '#ffea00', // O - yellow
      '#e040fb', // T - purple
      '#00e676', // S - green
      '#ff1744', // Z - red
      '#536dfe', // J - indigo
      '#ff9100', // L - orange
      '#1de9b6', // + pentomino - teal
      '#f50057', // U pentomino - pink
      '#7c4dff', // Y pentomino - violet
      '#ffff00', // mono reward - bright yellow
      '#b0bec5', // hollow ring - blue grey
    ],
    // Dark fill with a glowing outline. `save()/restore()` keeps the shadow
    // state from leaking into the flash text or the power-up outline.
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const color = this.colors[colorIndex];
      const px = x * size + 1, py = y * size + 1, s = size - 2;
      context.save();
      context.globalAlpha = alpha;
      context.shadowBlur = size * 0.6;
      context.shadowColor = color;
      context.fillStyle = 'rgba(8,10,20,0.9)';
      context.fillRect(px, py, s, s);
      context.shadowBlur = 0;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px + 1, py + 1, Math.max(0, s - 2), Math.max(0, s - 2));
      context.restore();
    },
  },
  pastel: {
    id: 'pastel',
    label: 'Pastel',
    theme: 'pastel',
    gridColor: '#dcd6e8',
    colors: [
      null,
      '#a8dee6', // I - cyan
      '#f3e2a0', // O - yellow
      '#d7b6dd', // T - purple
      '#b8dcb0', // S - green
      '#eab3ae', // Z - red
      '#b6bfe6', // J - indigo
      '#f0c9a0', // L - orange
      '#a6d9cd', // + pentomino - teal
      '#f0bcd0', // U pentomino - pink
      '#c7bce6', // Y pentomino - violet
      '#f5eeb0', // mono reward - bright yellow
      '#c6cdd2', // hollow ring - blue grey
    ],
    // Soft, desaturated fill with rounded corners; falls back to a square
    // fillRect when the context has no roundRect support.
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const px = x * size + 1, py = y * size + 1, s = size - 2;
      context.globalAlpha = alpha;
      context.fillStyle = this.colors[colorIndex];
      const radius = Math.min(5, s / 3);
      if (typeof context.roundRect === 'function') {
        context.beginPath();
        context.roundRect(px, py, s, s, radius);
        context.fill();
      } else {
        context.fillRect(px, py, s, s);
      }
      context.globalAlpha = 1;
    },
  },
  pixel: {
    id: 'pixel',
    label: 'Pixel',
    theme: 'pixel',
    gridColor: '#33333f',
    // Shares the retro palette on purpose — only the texture differs — kept
    // as a live reference so the two never drift apart.
    colors: null,
    // Flat fill plus a cheap two-rect checker texture on top, at low alpha so
    // it reads as a dither pattern without a per-pixel loop.
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const px = x * size + 1, py = y * size + 1, s = size - 2;
      context.globalAlpha = alpha;
      context.fillStyle = this.colors[colorIndex];
      context.fillRect(px, py, s, s);
      context.fillStyle = 'rgba(0,0,0,0.2)';
      const half = s / 2;
      context.fillRect(px, py, half, half);
      context.fillRect(px + half, py + half, s - half, s - half);
      context.globalAlpha = 1;
    },
  },
};

// pixel intentionally reuses retro's palette verbatim — only the texture differs.
SKINS.pixel.colors = SKINS.retro.colors;

const SKIN_STORAGE_KEY = 'tetris.skin';

function loadSkin() {
  try {
    const id = localStorage.getItem(SKIN_STORAGE_KEY);
    return SKINS[id] ? id : 'retro';
  } catch (err) {
    return 'retro';
  }
}

function saveSkin(id) {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, id);
  } catch (err) {
    // Storage may be unavailable (private mode, quota); the skin just won't persist.
  }
}

let activeSkin = SKINS[loadSkin()];

// Standard tetrominoes are types 1..7; everything above is a non-standard piece.
const STANDARD_TYPES = [1, 2, 3, 4, 5, 6, 7];
const PENTOMINO_TYPES = [8, 9, 10];
const MONO_TYPE = 11;
const RING_TYPE = 12;
// Chance of drawing a non-standard piece instead of a tetromino.
const EXTRA_PIECE_CHANCE = 0.08;
// The hollow ring only shows up once the player is warmed up.
const RING_MIN_LEVEL = 3;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[0,8,0],[8,8,8],[0,8,0]],                  // + pentomino
  [[9,0,9],[9,9,9],[0,0,0]],                  // U pentomino
  [[0,10,0,0],[10,10,0,0],[0,10,0,0],[0,10,0,0]], // Y pentomino
  [[11]],                                      // mono (Tetris reward)
  [[12,12,12],[12,0,12],[12,12,12]],           // hollow ring (challenge)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const COMBO_BONUS = 50;
const TSPIN_BONUS = 400;
const B2B_MULTIPLIER = 1.5;
const PERFECT_CLEAR_BONUS = 2000;
const FLASH_MS = 900;

// A power-up piece is granted every POWERUP_EVERY cleared lines.
const POWERUP_EVERY = 10;
const FREEZE_MS = 5000;

// Each effect runs right after the piece is merged, before lines are cleared.
// `cells` is the list of board cells the piece just wrote.
const POWERUPS = [
  {
    id: 'bomba',
    label: 'Bomba',
    color: '#ff5252',
    apply(cells) {
      for (const { r, c } of cells)
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const y = r + dr, x = c + dc;
            if (y >= 0 && y < ROWS && x >= 0 && x < COLS) clearCell(y, x);
          }
    },
  },
  {
    id: 'rayo',
    label: 'Rayo',
    color: '#40c4ff',
    apply(cells) {
      const origin = cells[cells.length - 1];
      for (let c = 0; c < COLS; c++) clearCell(origin.r, c);
      for (let r = 0; r < ROWS; r++) clearCell(r, origin.c);
    },
  },
  {
    id: 'tinte',
    label: 'Tinte',
    color: '#ea80fc',
    // Turns the holes underneath the piece into wildcards: empty cells that
    // still count as filled when checking for a complete line.
    apply(cells) {
      const lowestByColumn = new Map();
      for (const { r, c } of cells)
        if (!lowestByColumn.has(c) || lowestByColumn.get(c) < r) lowestByColumn.set(c, r);
      for (const [c, r] of lowestByColumn)
        for (let y = r + 1; y < ROWS; y++)
          if (board[y][c] === 0) wildcards.add(y * COLS + c);
    },
  },
  {
    id: 'gravedad',
    label: 'Gravedad',
    color: '#69f0ae',
    apply() {
      for (let c = 0; c < COLS; c++) {
        const stack = [];
        for (let r = ROWS - 1; r >= 0; r--) if (board[r][c]) stack.push(board[r][c]);
        for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) board[r][c] = stack[i] || 0;
      }
      // Holes are gone, so any pending wildcard is consumed.
      wildcards.clear();
    },
  },
  {
    id: 'congelar',
    label: 'Congelar',
    color: '#80d8ff',
    apply() {
      frozenUntil = performance.now() + FREEZE_MS;
    },
  },
];

const QUEUE_SIZE = 5;
const MAX_ENERGY = 100;
const ENERGY_PER_LINE = 15;
const PREVIEW_MS = 15000;
const SLOW_MS = 10000;

const REVEAL_MS = 320;

// Every mode is the classic game plus a handicap and, optionally, an objective.
const MODES = [
  {
    id: 'classic',
    label: 'Clásico',
    hint: 'Sin objetivo',
  },
  {
    id: 'sprint',
    label: 'Sprint 40 líneas',
    hint: '40 líneas en 2:00',
    targetLines: 40,
    timeLimitMs: 120000,
  },
  {
    id: 'garbage',
    label: 'Basura ascendente',
    hint: 'Una fila sube cada 10s',
    garbageEveryMs: 10000,
  },
  {
    id: 'prefilled',
    label: 'Bloques prefijados',
    hint: 'El tablero empieza sucio',
    prefillRows: 5,
  },
  {
    id: 'invisible',
    label: 'Piezas invisibles',
    hint: 'Las piezas fijadas se ocultan',
    invisible: true,
  },
  {
    id: 'reverse',
    label: 'Rotación inversa',
    hint: 'Desde el nivel 2 se rota al revés',
    reverseFromLevel: 2,
  },
];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const energyFillEl = document.getElementById('energy-fill');
const energyValueEl = document.getElementById('energy-value');
const abilityListEl = document.getElementById('ability-list');
const modeEl = document.getElementById('mode');
const objectiveEl = document.getElementById('objective');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const modeListEl = document.getElementById('mode-list');
const restartBtn = document.getElementById('restart-btn');
const comboEl = document.getElementById('combo');
const b2bEl = document.getElementById('b2b');
const powerupEl = document.getElementById('powerup');
const skinSelectEl = document.getElementById('skin-select');

let board, current, nextQueue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let mode, timeLeft, garbageAccum, invisibleCells, revealUntil;
let hold, holdUsed, pendingReward;
let combo, b2b, lastMoveWasRotation, flash;
let linesSincePowerup, pendingPowerup, frozenUntil, wildcards;
let energy, previewUntil, slowUntil, undoSnapshot, pieceStartScore;
let audioCtx = null;

const ABILITIES = [
  {
    id: 'preview',
    label: 'Ver 5 siguientes',
    cost: 30,
    run() { previewUntil = performance.now() + PREVIEW_MS; drawNext(); },
  },
  {
    id: 'swap',
    label: 'Cambiar pieza',
    cost: 25,
    run() { spawn(); },
  },
  {
    id: 'slow',
    label: 'Ralentizar 10s',
    cost: 40,
    run() { slowUntil = performance.now() + SLOW_MS; },
  },
  {
    id: 'undo',
    label: 'Deshacer',
    cost: 50,
    available: () => undoSnapshot !== null,
    run() { restoreSnapshot(); },
  },
  {
    // Hold ships as a base feature, so this ability refunds the once-per-piece
    // limit instead of unlocking the slot.
    id: 'hold',
    label: 'Reservar de nuevo',
    cost: 20,
    available: () => holdUsed,
    run() { holdUsed = false; drawHold(); },
  },
];

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  const piece = { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0, powerup: null };
  if (pendingPowerup) {
    piece.powerup = pendingPowerup;
    pendingPowerup = null;
  }
  return piece;
}

function clearCell(r, c) {
  board[r][c] = 0;
  wildcards.delete(r * COLS + c);
}

// Rows above the removed one shift down by one, so their wildcard keys move too.
function reindexWildcardsAfterClear(removedRow) {
  const next = new Set();
  for (const key of wildcards) {
    const r = Math.floor(key / COLS);
    const c = key % COLS;
    if (r === removedRow) continue;
    if (r < removedRow) next.add((r + 1) * COLS + c);
    else next.add(key);
  }
  wildcards = next;
}

function isRowComplete(r) {
  for (let c = 0; c < COLS; c++)
    if (board[r][c] === 0 && !wildcards.has(r * COLS + c)) return false;
  return true;
}

function pickType() {
  // A Tetris grants the 1x1 block on the very next piece.
  if (pendingReward) {
    pendingReward = false;
    return MONO_TYPE;
  }
  if (Math.random() < EXTRA_PIECE_CHANCE) {
    const pool = level >= RING_MIN_LEVEL
      ? [...PENTOMINO_TYPES, RING_TYPE]
      : PENTOMINO_TYPES;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return STANDARD_TYPES[Math.floor(Math.random() * STANDARD_TYPES.length)];
}

function randomPiece() {
  return makePiece(pickType());
}

function clonePiece(piece) {
  return { type: piece.type, shape: piece.shape.map(row => [...row]), x: piece.x, y: piece.y };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function rotateCCW(shape) {
  return rotateCW(rotateCW(rotateCW(shape)));
}

function tryRotate() {
  const inverted = mode.reverseFromLevel && level >= mode.reverseFromLevel;
  const rotated = inverted ? rotateCCW(current.shape) : rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastMoveWasRotation = true;
      return;
    }
  }
}

function merge() {
  const cells = [];
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) {
        const y = current.y + r, x = current.x + c;
        board[y][x] = current.shape[r][c];
        cells.push({ r: y, c: x });
        if (mode.invisible) invisibleCells.add(y * COLS + x);
      }
  return cells;
}

// Rows above the removed one shift down, so their hidden-cell keys move too.
function reindexInvisibleAfterClear(removedRow) {
  if (!mode.invisible) return;
  const next = new Set();
  for (const key of invisibleCells) {
    const r = Math.floor(key / COLS);
    const c = key % COLS;
    if (r === removedRow) continue;
    next.add(r < removedRow ? (r + 1) * COLS + c : key);
  }
  invisibleCells = next;
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (isRowComplete(r)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      reindexWildcardsAfterClear(r);
      reindexInvisibleAfterClear(r);
      cleared++;
      r++;
    }
  }
  // A Tetris grants the 1x1 reward piece on the next spawn.
  if (cleared === 4) pendingReward = true;
  return cleared;
}

// The T-spin test runs before the piece is merged into the board.
function detectTSpin() {
  if (current.type !== 3 || !lastMoveWasRotation) return false;
  const corners = [[0, 0], [2, 0], [0, 2], [2, 2]];
  let blocked = 0;
  for (const [dc, dr] of corners) {
    const x = current.x + dc;
    const y = current.y + dr;
    if (x < 0 || x >= COLS || y >= ROWS) { blocked++; continue; }
    if (y >= 0 && board[y][x]) blocked++;
  }
  return blocked >= 3;
}

function isBoardEmpty() {
  return board.every(row => row.every(v => v === 0));
}

function setFlash(text) {
  flash = { text, expiresAt: performance.now() + FLASH_MS };
}

// Short synthesized blip; no audio assets, no dependencies.
function beep(freq, ms) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.04;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + ms / 1000);
  } catch (err) {
    // Audio is a nicety; never let it break the game loop.
  }
}

function applyScore(cleared, tSpin) {
  if (!cleared) {
    combo = -1;
    if (tSpin) setFlash('T-SPIN');
    updateHUD();
    return;
  }

  const difficult = cleared === 4 || tSpin;
  let gained = (LINE_SCORES[cleared] || 0) * level;
  if (tSpin) gained += TSPIN_BONUS * cleared * level;
  if (difficult && b2b) gained *= B2B_MULTIPLIER;

  combo++;
  if (combo > 0) gained += COMBO_BONUS * combo * level;

  lines += cleared;
  level = Math.floor(lines / 10) + 1;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  energy = Math.min(MAX_ENERGY, energy + cleared * ENERGY_PER_LINE);
  grantPowerupProgress(cleared);
  // Briefly reveal the hidden stack after a clear in the invisible mode.
  if (mode.invisible) revealUntil = performance.now() + REVEAL_MS;

  const perfect = isBoardEmpty();
  if (perfect) gained += PERFECT_CLEAR_BONUS * level;

  score += Math.round(gained);
  b2b = difficult;

  if (perfect) { setFlash('PERFECT CLEAR'); beep(1046, 220); }
  else if (tSpin) { setFlash('T-SPIN'); beep(784, 160); }
  else if (cleared === 4) { setFlash('TETRIS'); beep(659, 160); }
  else if (combo > 0) { setFlash(`COMBO x${combo + 1}`); beep(440 + combo * 40, 110); }

  updateHUD();
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lastMoveWasRotation = false;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    lastMoveWasRotation = false;
    updateHUD();
  } else {
    lockPiece();
  }
}

function grantPowerupProgress(cleared) {
  linesSincePowerup += cleared;
  while (linesSincePowerup >= POWERUP_EVERY) {
    linesSincePowerup -= POWERUP_EVERY;
    pendingPowerup = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
  }
}

// One-step rollback support for the Deshacer ability. The score is the one the
// piece started with, so undoing also refunds its soft- and hard-drop points.
function takeSnapshot() {
  undoSnapshot = {
    board: board.map(row => [...row]),
    score: pieceStartScore,
    lines,
    level,
    piece: clonePiece(current),
    queue: nextQueue.map(clonePiece),
  };
}

function restoreSnapshot() {
  if (!undoSnapshot) return;
  board = undoSnapshot.board.map(row => [...row]);
  score = undoSnapshot.score;
  lines = undoSnapshot.lines;
  level = undoSnapshot.level;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  current = clonePiece(undoSnapshot.piece);
  nextQueue = undoSnapshot.queue.map(clonePiece);
  undoSnapshot = null;
  pieceStartScore = score;
  dropAccum = 0;
  drawNext();
  updateHUD();
}

function lockPiece() {
  takeSnapshot();
  const tSpin = detectTSpin();
  const cells = merge();
  if (current.powerup) current.powerup.apply(cells);
  const cleared = clearLines();
  applyScore(cleared, tSpin);
  if (checkGoal()) return;
  spawn();
}

function checkGoal() {
  if (mode.targetLines && lines >= mode.targetLines) {
    const used = (mode.timeLimitMs - timeLeft) / 1000;
    finishGame('¡OBJETIVO!', `${mode.targetLines} líneas en ${used.toFixed(1)}s`);
    return true;
  }
  return false;
}

function spawn() {
  current = nextQueue.shift();
  nextQueue.push(randomPiece());
  pieceStartScore = score;
  holdUsed = false;
  lastMoveWasRotation = false;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
  drawHold();
}

// Park the current piece in the reserve slot; allowed once per piece.
function holdPiece() {
  if (holdUsed || paused || gameOver) return;
  const outgoing = current.type;
  if (hold === null) {
    current = nextQueue.shift();
    nextQueue.push(randomPiece());
    drawNext();
  } else {
    current = makePiece(hold);
  }
  hold = outgoing;
  holdUsed = true;
  drawHold();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
}

function useAbility(index) {
  const ability = ABILITIES[index];
  if (!ability || paused || gameOver) return;
  if (energy < ability.cost) return;
  if (ability.available && !ability.available()) return;
  energy -= ability.cost;
  ability.run();
  updateHUD();
}

function randomGarbageRow() {
  const gap = Math.floor(Math.random() * COLS);
  return Array.from({ length: COLS }, (_, c) => (c === gap ? 0 : Math.floor(Math.random() * 7) + 1));
}

function raiseGarbage() {
  if (board[0].some(v => v !== 0)) {
    endGame();
    return;
  }
  board.shift();
  board.push(randomGarbageRow());
  reindexInvisibleAfterRaise();
  // Keep the falling piece at the same height relative to the stack.
  current.y--;
  if (collide(current.shape, current.x, current.y)) endGame();
}

function reindexInvisibleAfterRaise() {
  if (!mode.invisible) return;
  const next = new Set();
  for (const key of invisibleCells) {
    const r = Math.floor(key / COLS);
    if (r === 0) continue;
    next.add(key - COLS);
  }
  invisibleCells = next;
}

function prefillBoard(rows) {
  for (let r = ROWS - rows; r < ROWS; r++) board[r] = randomGarbageRow();
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  modeEl.textContent = mode.label;
  if (mode.timeLimitMs) {
    objectiveEl.textContent = `${lines}/${mode.targetLines} · ${formatTime(timeLeft)}`;
  } else {
    objectiveEl.textContent = mode.hint;
  }
  comboEl.textContent = combo > 0 ? `x${combo + 1}` : '-';
  b2bEl.textContent = b2b ? 'SÍ' : '-';
  const frozenLeft = frozenUntil - performance.now();
  if (frozenLeft > 0) {
    powerupEl.textContent = `Congelado ${(frozenLeft / 1000).toFixed(1)}s`;
  } else if (current && current.powerup) {
    powerupEl.textContent = current.powerup.label;
  } else {
    powerupEl.textContent = '-';
  }
  energyFillEl.style.width = `${energy}%`;
  energyValueEl.textContent = `${energy}%`;
  for (const item of abilityListEl.children) {
    const ability = ABILITIES[Number(item.dataset.index)];
    const usable = energy >= ability.cost && (!ability.available || ability.available());
    item.classList.toggle('affordable', usable);
  }
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  activeSkin.drawBlock(context, x, y, colorIndex, size, alpha ?? 1);
}

function drawGrid() {
  ctx.strokeStyle = activeSkin.gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  const hiding = mode.invisible && performance.now() > revealUntil;

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (hiding && invisibleCells.has(r * COLS + c)) continue;
      drawBlock(ctx, c, r, board[r][c], BLOCK);
    }

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // wildcards left behind by the Tinte power-up
  ctx.save();
  ctx.strokeStyle = '#ea80fc';
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 2;
  for (const key of wildcards) {
    const r = Math.floor(key / COLS), c = key % COLS;
    ctx.strokeRect(c * BLOCK + 2, r * BLOCK + 2, BLOCK - 4, BLOCK - 4);
  }
  ctx.restore();

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);

  if (current.powerup) drawPowerupOutline();

  if (performance.now() < slowUntil) {
    ctx.save();
    ctx.fillStyle = 'rgba(122,162,247,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  drawFlash();
}

function drawPowerupOutline() {
  const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 200);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = current.powerup.color;
  ctx.lineWidth = 2;
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        ctx.strokeRect((current.x + c) * BLOCK + 1, (current.y + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
  ctx.restore();
}

function drawFlash() {
  if (!flash) return;
  const remaining = flash.expiresAt - performance.now();
  if (remaining <= 0) { flash = null; return; }
  ctx.save();
  ctx.globalAlpha = Math.min(1, remaining / FLASH_MS);
  ctx.fillStyle = '#ffd54f';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(flash.text, canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

// Draws one shape inside a square slot of `size` pixels at (0, offsetY).
// The reference grid is 4x4, but it widens for the non-standard pieces.
function drawShapeInSlot(context, shape, offsetY, size, alpha) {
  const cells = Math.max(4, shape.length, shape[0].length);
  const NB = size / cells;
  const offX = (cells - shape[0].length) / 2;
  // `offsetY` is always a multiple of `size` (a whole number of slots), so
  // dividing by NB stays a whole number of grid rows — same grid space the
  // active skin's drawBlock already expects.
  const offY = (cells - shape.length) / 2 + offsetY / NB;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      drawBlock(context, offX + c, offY + r, shape[r][c], NB, alpha);
    }
}

function drawNext() {
  const showAll = performance.now() < previewUntil;
  const count = showAll ? QUEUE_SIZE : 1;
  const slot = showAll ? 60 : 120;
  const height = slot * count;
  if (nextCanvas.height !== height) nextCanvas.height = height;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  for (let i = 0; i < count; i++)
    drawShapeInSlot(nextCtx, nextQueue[i].shape, i * slot, slot);
}

function drawHold() {
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  holdCanvas.classList.toggle('blocked', holdUsed);
  if (hold === null) return;
  drawShapeInSlot(holdCtx, PIECES[hold], 0, 120, holdUsed ? 0.35 : 1);
}

function buildSkinSelector() {
  for (const id of Object.keys(SKINS)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = SKINS[id].label;
    skinSelectEl.appendChild(option);
  }
  skinSelectEl.value = activeSkin.id;
}

// Applies a skin hot: no page reload needed. `board` is only set once the
// game has started (init() runs before it), so this also covers the start
// screen and pause overlay, where the render loop is not ticking.
function applySkin(id) {
  activeSkin = SKINS[id] ? SKINS[id] : SKINS.retro;
  document.body.dataset.skin = activeSkin.theme;
  saveSkin(activeSkin.id);
  skinSelectEl.value = activeSkin.id;
  if (board) {
    drawNext();
    drawHold();
    if (current) draw();
  }
}

function finishGame(title, message) {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = title;
  overlayScore.textContent = message;
  restartBtn.classList.remove('hidden');
  modeListEl.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function endGame() {
  finishGame('GAME OVER', `Puntuación: ${score.toLocaleString()}`);
}

function togglePause() {
  if (gameOver || !current) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    overlay.classList.add('hidden');
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    restartBtn.classList.add('hidden');
    modeListEl.classList.add('hidden');
    overlay.classList.remove('hidden');
  }
}

function onTick(dt) {
  if (mode.timeLimitMs) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      finishGame('TIEMPO AGOTADO', `${lines}/${mode.targetLines} líneas`);
      return;
    }
  }
  if (mode.garbageEveryMs) {
    garbageAccum += dt;
    if (garbageAccum >= mode.garbageEveryMs) {
      garbageAccum = 0;
      raiseGarbage();
    }
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  onTick(dt);
  if (gameOver) return;
  // The Congelar power-up suspends gravity; input and rendering keep running.
  const frozen = ts < frozenUntil;
  if (frozen) {
    dropAccum = 0;
  } else {
    dropAccum += dt;
    // The Ralentizar ability halves the fall speed while it lasts.
    const effectiveInterval = ts < slowUntil ? dropInterval * 2 : dropInterval;
    if (dropAccum >= effectiveInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  if (gameOver) return;
  draw();
  updateHUD();
  if (ts > previewUntil && nextCanvas.height !== 120) drawNext();
  animId = requestAnimationFrame(loop);
}

function buildAbilityList() {
  abilityListEl.innerHTML = '';
  ABILITIES.forEach((ability, i) => {
    const li = document.createElement('li');
    li.dataset.index = String(i);
    li.innerHTML = `<kbd>${i + 1}</kbd><span>${ability.label}</span><em>${ability.cost}</em>`;
    abilityListEl.appendChild(li);
  });
}

function buildModeList() {
  modeListEl.innerHTML = '';
  for (const m of MODES) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${m.label}</strong><span>${m.hint}</span>`;
    li.addEventListener('click', () => init(m.id));
    modeListEl.appendChild(li);
  }
}

function showModeSelect() {
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'TETRIS';
  overlayScore.textContent = 'Elige un modo';
  restartBtn.classList.add('hidden');
  modeListEl.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function init(modeId) {
  mode = MODES.find(m => m.id === modeId) || MODES[0];
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  timeLeft = mode.timeLimitMs || 0;
  garbageAccum = 0;
  invisibleCells = new Set();
  revealUntil = 0;
  hold = null;
  holdUsed = false;
  pendingReward = false;
  combo = -1;
  b2b = false;
  lastMoveWasRotation = false;
  flash = null;
  linesSincePowerup = 0;
  pendingPowerup = null;
  frozenUntil = 0;
  wildcards = new Set();
  energy = 0;
  previewUntil = 0;
  slowUntil = 0;
  undoSnapshot = null;
  pieceStartScore = 0;
  nextCanvas.height = 120;
  if (mode.prefillRows) prefillBoard(mode.prefillRows);
  nextQueue = Array.from({ length: QUEUE_SIZE }, () => randomPiece());
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

// Arrows and space scroll the page by default, which would drag the board out
// of view mid-game, so every key the game owns is claimed here.
const GAME_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
  'KeyX', 'KeyC', 'KeyP', 'ShiftLeft', 'ShiftRight',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
]);

document.addEventListener('keydown', e => {
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (e.code === 'KeyP') { togglePause(); return; }
  if (!current || paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) {
        current.x--;
        lastMoveWasRotation = false;
      }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) {
        current.x++;
        lastMoveWasRotation = false;
      }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdPiece();
      break;
    case 'Digit1':
    case 'Digit2':
    case 'Digit3':
    case 'Digit4':
    case 'Digit5':
      useAbility(Number(e.code.slice(5)) - 1);
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => init(mode.id));

skinSelectEl.addEventListener('change', () => applySkin(skinSelectEl.value));

buildAbilityList();
buildModeList();
buildSkinSelector();
document.body.dataset.skin = activeSkin.theme;
mode = MODES[0];
showModeSelect();

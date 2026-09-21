'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
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
];

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

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const comboEl = document.getElementById('combo');
const b2bEl = document.getElementById('b2b');
const powerupEl = document.getElementById('powerup');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let hold, holdUsed, pendingReward;
let combo, b2b, lastMoveWasRotation, flash;
let linesSincePowerup, pendingPowerup, frozenUntil, wildcards;
let audioCtx = null;

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

function tryRotate() {
  const rotated = rotateCW(current.shape);
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
      }
  return cells;
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (isRowComplete(r)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      reindexWildcardsAfterClear(r);
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
  grantPowerupProgress(cleared);

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

function lockPiece() {
  const tSpin = detectTSpin();
  const cells = merge();
  if (current.powerup) current.powerup.apply(cells);
  const cleared = clearLines();
  applyScore(cleared, tSpin);
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
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
    current = next;
    next = randomPiece();
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

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
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
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = '#22222e';
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

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

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

function drawPreview(context, previewCanvas, shape, alpha) {
  context.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  if (!shape) return;
  // Keep a 4x4 reference grid, but shrink the blocks if a piece is wider.
  const cells = Math.max(4, shape.length, shape[0].length);
  const NB = previewCanvas.width / cells;
  const offX = Math.floor((cells - shape[0].length) / 2);
  const offY = Math.floor((cells - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, offX + c, offY + r, shape[r][c], NB, alpha);
}

function drawNext() {
  drawPreview(nextCtx, nextCanvas, next.shape);
}

function drawHold() {
  const shape = hold === null ? null : PIECES[hold];
  drawPreview(holdCtx, holdCanvas, shape, holdUsed ? 0.35 : 1);
  holdCanvas.classList.toggle('blocked', holdUsed);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  // The Congelar power-up suspends gravity; input and rendering keep running.
  const frozen = ts < frozenUntil;
  if (frozen) {
    dropAccum = 0;
  } else {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  draw();
  updateHUD();
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
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
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
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
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdPiece();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

init();

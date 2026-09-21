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
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

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
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const powerupEl = document.getElementById('powerup');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let linesSincePowerup, pendingPowerup, frozenUntil, wildcards;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
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
  if (cleared) {
    grantPowerupProgress(cleared);
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
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
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
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
  const cells = merge();
  if (current.powerup) current.powerup.apply(cells);
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
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

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
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
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
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
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

init();

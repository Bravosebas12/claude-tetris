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
  '#bbdefb', // J - pale blue
  '#ffb74d', // L - orange
  '#9e9e9e', // NUT - metallic gray
  '#37474f', // BOMB - carbón oscuro (el arte real lo pinta drawBomb)
];

const NUT = 8; // tipo de pieza "tuerca": anillo 3x3 con hueco central que nunca se puede llenar
const BOMB = 9; // tipo de pieza "bomba": power-up 1x1 que al aterrizar explota un área 3x3

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // NUT
  [[9]],                                       // BOMB
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const BOMB_MIN_LINES = 4;
const BOMB_MAX_LINES = 8;
const BOMB_BLOCK_SCORE = 50;
const BLAST_DURATION = 350; // ms de la animación de explosión

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
const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = themeToggle.querySelector('.theme-toggle-icon');

const THEME_STORAGE_KEY = 'tetris-theme';

let board, holes, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let linesUntilBomb, blast, animClock;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function bombInterval() {
  return BOMB_MIN_LINES + Math.floor(Math.random() * (BOMB_MAX_LINES - BOMB_MIN_LINES + 1));
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomPiece() {
  if (linesUntilBomb <= 0) {
    linesUntilBomb = bombInterval();
    return makePiece(BOMB);
  }
  return makePiece(Math.floor(Math.random() * 8) + 1);
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
  if (gameOver || paused) return;
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
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) {
        board[current.y + r][current.x + c] = current.shape[r][c];
        holes[current.y + r][current.x + c] = 0; // si se rellena un hueco previamente expuesto, deja de dibujarse
      }
  if (current.type === NUT) holes[current.y + 1][current.x + 1] = 1;
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      holes.splice(r, 1);
      holes.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    linesUntilBomb -= cleared;
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
  if (gameOver || paused) return;
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (gameOver || paused) return;
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  if (gameOver) return;
  if (current.type === BOMB) explode(current.x, current.y);
  else merge();
  clearLines();
  spawn();
}

function explode(cx, cy) {
  let destroyed = 0;
  const cols = new Set();
  for (let r = cy - 1; r <= cy + 1; r++) {
    if (r < 0 || r >= ROWS) continue;
    for (let c = cx - 1; c <= cx + 1; c++) {
      if (c < 0 || c >= COLS) continue;
      cols.add(c);
      if (board[r][c]) destroyed++;
      board[r][c] = 0;
      holes[r][c] = 0;
    }
  }
  if (destroyed) {
    score += destroyed * BOMB_BLOCK_SCORE * level;
    updateHUD();
  }
  blast = { cx, cy, t: 0 };
  cols.forEach(collapseColumn);
}

function collapseColumn(c) {
  const stack = [];
  for (let r = ROWS - 1; r >= 0; r--)
    if (board[r][c]) stack.push([board[r][c], holes[r][c]]);
  for (let r = ROWS - 1; r >= 0; r--) {
    const cell = stack[ROWS - 1 - r];
    board[r][c] = cell ? cell[0] : 0;
    holes[r][c] = cell ? cell[1] : 0;
  }
}

function spawn() {
  const piece = next;
  if (collide(piece.shape, piece.x, piece.y)) {
    endGame();
    return;
  }
  current = piece;
  next = randomPiece();
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  if (colorIndex === BOMB) { drawBomb(context, x, y, size, alpha); return; }
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawBomb(context, x, y, size, alpha) {
  const cx = x * size + size / 2;
  const cy = y * size + size / 2;
  context.globalAlpha = alpha ?? 1;

  // cuerpo esférico
  const radius = size * 0.36;
  const bodyGrad = context.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.15, cx, cy, radius);
  bodyGrad.addColorStop(0, '#546e7a');
  bodyGrad.addColorStop(1, '#1c262b');
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fillStyle = bodyGrad;
  context.fill();

  // brillo
  context.beginPath();
  context.arc(cx - radius * 0.35, cy - radius * 0.35, radius * 0.22, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.fill();

  // mecha
  const fuseStartX = cx + radius * 0.55;
  const fuseStartY = cy - radius * 0.55;
  const fuseEndX = cx + radius * 0.95;
  const fuseEndY = cy - radius * 1.4;
  context.strokeStyle = '#8d6e63';
  context.lineWidth = Math.max(1.5, size * 0.06);
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(fuseStartX, fuseStartY);
  context.quadraticCurveTo(cx + radius * 1.3, cy - radius * 0.9, fuseEndX, fuseEndY);
  context.stroke();

  // chispa pulsante
  const pulse = 0.5 + 0.5 * Math.sin((animClock || 0) / 120);
  const sparkRadius = size * (0.09 + 0.04 * pulse);
  const sparkGrad = context.createRadialGradient(fuseEndX, fuseEndY, 0, fuseEndX, fuseEndY, sparkRadius);
  sparkGrad.addColorStop(0, '#fff59d');
  sparkGrad.addColorStop(0.5, '#ffb300');
  sparkGrad.addColorStop(1, 'rgba(255,179,0,0)');
  context.beginPath();
  context.arc(fuseEndX, fuseEndY, sparkRadius, 0, Math.PI * 2);
  context.fillStyle = sparkGrad;
  context.fill();

  context.globalAlpha = 1;
}

function drawNutHole(context, x, y, size, alpha) {
  drawBlock(context, x, y, NUT, size, alpha);
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--board-bg').trim() || '#1a1a25';
  context.beginPath();
  context.arc(x * size + size / 2, y * size + size / 2, size * 0.28, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = 'rgba(0,0,0,0.35)';
  context.lineWidth = 1.5;
  context.stroke();
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim() || '#22222e';
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

  // huecos de tuercas ya bloqueadas
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (holes[r][c]) drawNutHole(ctx, c, r, BLOCK);

  // animación de explosión de bomba
  if (blast) {
    const t = Math.min(blast.t / BLAST_DURATION, 1);
    const alpha = 1 - t;
    const bx = (blast.cx + 0.5) * BLOCK;
    const by = (blast.cy + 0.5) * BLOCK;
    const maxRadius = BLOCK * 2.1; // cubre el área 3x3
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffb300';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, maxRadius * t, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,183,0,0.25)';
    ctx.beginPath();
    ctx.arc(bx, by, maxRadius * t * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (gameOver) return;

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
  if (current.type === NUT) drawNutHole(ctx, current.x + 1, gy + 1, BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  if (current.type === NUT) drawNutHole(ctx, current.x + 1, current.y + 1, BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (next.type === BOMB) {
    drawBomb(nextCtx, 0.5, 0.5, 60);
    return;
  }
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
  if (next.type === NUT) drawNutHole(nextCtx, offX + 1, offY + 1, NB);
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  paused = false;
  cancelAnimationFrame(animId);
  animId = null;
  draw();
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
  animClock += dt;
  if (blast) {
    blast.t += dt;
    if (blast.t >= BLAST_DURATION) blast = null;
  }
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  holes = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  linesUntilBomb = bombInterval();
  blast = null;
  animClock = 0;
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

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
  themeToggle.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  themeToggleIcon.textContent = theme === 'light' ? '☀️' : '🌙';
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyTheme(next);
});

initTheme();
init();

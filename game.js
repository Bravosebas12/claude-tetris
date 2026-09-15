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
  '#9e9e9e', // N - tuerca (nut)
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
  [[8,8,8],[8,0,8],[8,8,8]],                  // N - tuerca (nut, hueco inerte)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const CLEAR_COLUMN_STAGGER = 12; // ms de retraso entre columna y columna (barrido izq->der)
const CLEAR_PARTICLE_LIFE = 180; // ms de vida de cada fragmento
const CLEAR_PARTICLES_PER_BLOCK = 5;
const CLEAR_GRAVITY = 0.0004; // px/ms^2 aplicado a los fragmentos

const GRID_COLORS = { dark: '#22222e', light: '#c4c4d4' };
const THEME_STORAGE_KEY = 'tetris-theme';
const START_LEVEL_KEY = 'tetris-start-level';

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
const pauseOverlay = document.getElementById('pause-overlay');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const startLevelSelect = document.getElementById('start-level-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, theme;
let clearing, clearingRows, particles, clearAnimElapsed, clearAnimTotal;
let startLevel;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
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
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function getFullRows() {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(v => v !== 0)) rows.push(r);
  }
  return rows;
}

function removeRows(rows) {
  if (!rows.length) return;
  const rowSet = new Set(rows);
  const kept = board.filter((_, r) => !rowSet.has(r));
  const cleared = rows.length;
  const emptyRows = Array.from({ length: cleared }, () => new Array(COLS).fill(0));
  board = [...emptyRows, ...kept];

  lines += cleared;
  score += (LINE_SCORES[cleared] || 0) * level;
  level = startLevel + Math.floor(lines / 10);
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  updateHUD();
}

function startClearAnimation(rows) {
  clearingRows = rows;
  particles = [];
  for (const r of rows) {
    for (let c = 0; c < COLS; c++) {
      const colorIndex = board[r][c];
      if (!colorIndex) continue;
      const cx = c * BLOCK + BLOCK / 2;
      const cy = r * BLOCK + BLOCK / 2;
      for (let i = 0; i < CLEAR_PARTICLES_PER_BLOCK; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.05 + Math.random() * 0.08;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.05,
          size: 3 + Math.random() * 3,
          color: COLORS[colorIndex],
          delay: c * CLEAR_COLUMN_STAGGER,
          life: CLEAR_PARTICLE_LIFE,
          maxLife: CLEAR_PARTICLE_LIFE,
        });
      }
    }
  }
  clearAnimElapsed = 0;
  clearAnimTotal = (COLS - 1) * CLEAR_COLUMN_STAGGER + CLEAR_PARTICLE_LIFE;
  clearing = true;
}

function updateClearAnimation(dt) {
  clearAnimElapsed += dt;
  for (const p of particles) {
    if (p.delay > 0) {
      p.delay -= dt;
      continue;
    }
    p.vy += CLEAR_GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  if (clearAnimElapsed >= clearAnimTotal) {
    finishClearAnimation();
  }
}

function finishClearAnimation() {
  removeRows(clearingRows);
  clearingRows = [];
  particles = [];
  clearing = false;
  spawn();
}

function drawParticles() {
  for (const p of particles) {
    if (p.delay > 0) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
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

function lockPiece() {
  merge();
  const rows = getFullRows();
  if (rows.length) {
    startClearAnimation(rows);
  } else {
    spawn();
  }
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
  ctx.strokeStyle = GRID_COLORS[theme];
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

  // board (las filas en animación de limpieza se omiten: se dibujan como partículas)
  for (let r = 0; r < ROWS; r++) {
    if (clearing && clearingRows.includes(r)) continue;
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);
  }

  if (clearing) {
    drawParticles();
    return;
  }

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
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

function applyTheme(t) {
  theme = t === 'light' ? 'light' : 'dark';
  document.body.classList.toggle('light-theme', theme === 'light');
  themeToggle.checked = theme === 'light';
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function initTheme() {
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY));
}

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'light' : 'dark');
});

function getStoredStartLevel() {
  const v = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
  return Number.isFinite(v) && v >= 1 && v <= 9 ? v : 1;
}

function setStoredStartLevel(v) {
  localStorage.setItem(START_LEVEL_KEY, String(v));
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    pauseOverlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    startLevelSelect.value = getStoredStartLevel();
    pauseOverlay.classList.remove('hidden');
  }
}

pauseResumeBtn.addEventListener('click', () => {
  if (paused) togglePause();
});

pauseRestartBtn.addEventListener('click', init);

startLevelSelect.addEventListener('change', e => {
  setStoredStartLevel(parseInt(e.target.value, 10));
});

function loop(ts) {
  if (gameOver) return;
  const dt = ts - lastTime;
  lastTime = ts;

  if (clearing) {
    updateClearAnimation(dt);
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
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  startLevel = getStoredStartLevel();
  level = startLevel;
  paused = false;
  gameOver = false;
  clearing = false;
  clearingRows = [];
  particles = [];
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (e.code === 'Escape') {
    if (e.target === startLevelSelect) return; // let the native select popup close on its own
    togglePause();
    return;
  }
  if (paused || gameOver || clearing) return;
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

initTheme();
init();

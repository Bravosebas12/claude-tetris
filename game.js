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
  '#9e9e9e', // Nut - metal
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
  [[8,8,8],[8,0,8],[8,8,8]],                  // Nut
];

const NUT = 8;
const HOLE = 9;

const LINE_SCORES = [0, 100, 300, 500, 800];

const SKINS = {
  retro: {
    label: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d', '#9e9e9e'],
    board: '#1a1a25',
    grid: '#22222e',
    hole: '#333',
    glow: 0,
    radius: 0,
    pixel: false,
  },
  neon: {
    label: 'Neon',
    colors: [null, '#00fff9', '#faff00', '#ff00f7', '#00ff66', '#ff2d55', '#5c6bff', '#ff9500', '#e0e0e0'],
    board: '#020204',
    grid: '#0a0a12',
    hole: '#00fff9',
    glow: 16,
    radius: 0,
    pixel: false,
  },
  pastel: {
    label: 'Pastel',
    colors: [null, '#a7d8f0', '#fff3b0', '#d9b8f5', '#b8f2d1', '#f7b8c4', '#c3c9ff', '#ffd6a5', '#d6d6d6'],
    board: '#fdf6f9',
    grid: '#eee2ea',
    hole: '#c9c9c9',
    glow: 0,
    radius: 8,
    pixel: false,
  },
  pixel: {
    label: 'Pixel Art',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d', '#9e9e9e'],
    board: '#1a1a25',
    grid: '#22222e',
    hole: '#333',
    glow: 0,
    radius: 0,
    pixel: true,
  },
};

let currentSkin = SKINS.retro;

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
const skinSelect = document.getElementById('skin-select');

const pauseOverlay = document.getElementById('pause-overlay');
const pauseMain = document.getElementById('pause-main');
const pauseControls = document.getElementById('pause-controls');
const resumeBtn = document.getElementById('resume-btn');
const restartPauseBtn = document.getElementById('restart-pause-btn');
const controlsBtn = document.getElementById('controls-btn');
const backBtn = document.getElementById('back-btn');
const startLevelSelect = document.getElementById('start-level');

const MAX_START_LEVEL = 10;
for (let i = 1; i <= MAX_START_LEVEL; i++) {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = i;
  startLevelSelect.appendChild(opt);
}

let board, current, next, score, lines, level, startLevel, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

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
  if (current.type === NUT && board[current.y + 1][current.x + 1] === 0)
    board[current.y + 1][current.x + 1] = HOLE;
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0 && v !== HOLE)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
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

function lockPiece() {
  merge();
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
}

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex || colorIndex === HOLE) return;
  const skin = currentSkin;
  const color = skin.colors[colorIndex];
  const bx = x * size + 1;
  const by = y * size + 1;
  const bw = size - 2;
  const bh = size - 2;

  context.globalAlpha = alpha ?? 1;
  context.shadowBlur = skin.glow;
  context.shadowColor = skin.glow ? color : 'transparent';
  context.fillStyle = color;

  if (skin.radius) {
    roundRectPath(context, bx, by, bw, bh, skin.radius);
    context.fill();
  } else {
    context.fillRect(bx, by, bw, bh);
  }

  context.shadowBlur = 0;

  if (skin.pixel) {
    // pixel-art texture: 2x2 checker pattern of light/dark dots
    const step = size / 4;
    context.fillStyle = 'rgba(0,0,0,0.15)';
    for (let py = 0; py < 4; py++)
      for (let px = 0; px < 4; px++)
        if ((px + py) % 2 === 0)
          context.fillRect(bx + px * step, by + py * step, step, step);
  } else {
    // highlight
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(bx, by, bw, 4);
  }

  context.globalAlpha = 1;
}

function drawHole(context, x, y, size, alpha) {
  const skin = currentSkin;
  context.globalAlpha = alpha ?? 1;
  context.strokeStyle = skin.hole;
  context.shadowBlur = skin.glow;
  context.shadowColor = skin.glow ? skin.hole : 'transparent';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x * size + size / 2, y * size + size / 2, size * 0.32, 0, Math.PI * 2);
  context.stroke();
  context.shadowBlur = 0;
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = currentSkin.grid;
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
    for (let c = 0; c < COLS; c++) {
      drawBlock(ctx, c, r, board[r][c], BLOCK);
      if (board[r][c] === HOLE) drawHole(ctx, c, r, BLOCK);
    }

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
  if (current.type === NUT) drawHole(ctx, current.x + 1, gy + 1, BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  if (current.type === NUT) drawHole(ctx, current.x + 1, current.y + 1, BLOCK);
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
  if (next.type === NUT) drawHole(nextCtx, offX + 1, offY + 1, NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function openPauseMenu() {
  cancelAnimationFrame(animId);
  showPauseView('main');
  pauseOverlay.classList.remove('hidden');
}

function closePauseMenu() {
  pauseOverlay.classList.add('hidden');
  lastTime = performance.now();
  loop(lastTime);
}

function showPauseView(view) {
  pauseMain.classList.toggle('hidden', view !== 'main');
  pauseControls.classList.toggle('hidden', view !== 'controls');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (paused) {
    openPauseMenu();
  } else {
    closePauseMenu();
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
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
  animId = requestAnimationFrame(loop);
}

function applySkin(name) {
  if (!SKINS[name]) name = 'retro';
  currentSkin = SKINS[name];
  document.body.dataset.skin = name;
  skinSelect.value = name;
  localStorage.setItem('tetris-skin', name);
  if (board) {
    draw();
    if (next) drawNext();
  }
}

skinSelect.addEventListener('change', () => applySkin(skinSelect.value));
applySkin(localStorage.getItem('tetris-skin') || 'retro');

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  startLevel = Number(startLevelSelect.value) || 1;
  level = startLevel;
  paused = false;
  gameOver = false;
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

resumeBtn.addEventListener('click', () => { if (paused) togglePause(); });
restartPauseBtn.addEventListener('click', () => { paused = false; init(); });
controlsBtn.addEventListener('click', () => showPauseView('controls'));
backBtn.addEventListener('click', () => showPauseView('main'));

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
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

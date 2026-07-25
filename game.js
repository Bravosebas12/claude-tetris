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
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
];

const PASTEL_COLORS = [
  null,
  '#a8dadc', // I
  '#ffe8a3', // O
  '#d8b4e2', // T
  '#b5e5c8', // S
  '#f4a9a8', // Z
  '#b8d4f0', // J
  '#f6cba3', // L
];

function drawBlockRetro(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(px, py, s, 4);
}

function drawBlockNeon(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.save();
  context.shadowBlur = 14;
  context.shadowColor = color;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  context.shadowBlur = 0;
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(px, py, s, 4);
  context.restore();
}

function roundedBlockPath(context, px, py, s, r) {
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(px, py, s, s, r);
  } else {
    context.moveTo(px + r, py);
    context.arcTo(px + s, py, px + s, py + s, r);
    context.arcTo(px + s, py + s, px, py + s, r);
    context.arcTo(px, py + s, px, py, r);
    context.arcTo(px, py, px + s, py, r);
    context.closePath();
  }
}

function drawBlockPastel(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  const r = Math.min(6, s / 3);
  roundedBlockPath(context, px, py, s, r);
  context.fillStyle = color;
  context.fill();
  context.save();
  roundedBlockPath(context, px, py, s, r);
  context.clip();
  context.fillStyle = 'rgba(255,255,255,0.3)';
  context.fillRect(px, py, s, Math.max(4, s * 0.3));
  context.restore();
}

function drawBlockPixel(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  const half = s / 2;
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(px, py, half, half);
  context.fillRect(px + half, py + half, s - half, s - half);
  context.fillStyle = 'rgba(0,0,0,0.18)';
  context.fillRect(px + half, py, s - half, half);
  context.fillRect(px, py + half, half, s - half);
}

const SKINS = {
  retro:  { name: 'Retro',  colors: COLORS,        boardBg: null,      draw: drawBlockRetro },
  neon:   { name: 'Neon',   colors: COLORS,        boardBg: '#000000', draw: drawBlockNeon },
  pastel: { name: 'Pastel', colors: PASTEL_COLORS, boardBg: '#26233a', draw: drawBlockPastel },
  pixel:  { name: 'Pixel',  colors: COLORS,        boardBg: null,      draw: drawBlockPixel },
};

let currentSkin = localStorage.getItem('tetris-skin') || 'retro';
if (!SKINS[currentSkin]) currentSkin = 'retro';

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

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
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

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
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

function boardBackground() {
  const skin = SKINS[currentSkin];
  return skin.boardBg || getComputedStyle(document.documentElement).getPropertyValue('--board-bg').trim();
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[currentSkin];
  const color = skin.colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  skin.draw(context, x, y, color, size);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim();
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
  ctx.fillStyle = boardBackground();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = boardBackground();
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
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

document.getElementById('theme-switch').addEventListener('change', e => {
  document.body.classList.toggle('light', e.target.checked);
});

const skinOptions = document.querySelectorAll('.skin-option');

function applySkin(id) {
  if (!SKINS[id]) return;
  currentSkin = id;
  localStorage.setItem('tetris-skin', currentSkin);
  skinOptions.forEach(btn => btn.classList.toggle('active', btn.dataset.skin === currentSkin));
  draw();
  drawNext();
}

skinOptions.forEach(btn => {
  btn.classList.toggle('active', btn.dataset.skin === currentSkin);
  btn.addEventListener('click', () => applySkin(btn.dataset.skin));
});

init();

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

const SKINS = {
  retro: {
    gridColor: '#22222e',
    bgColor: '#1a1a25',
    blockStyle: 'flat',
    colors: COLORS,
  },
  neon: {
    gridColor: '#1a0033',
    bgColor: '#000000',
    blockStyle: 'glow',
    colors: [null, '#00ffff','#ffff00','#ff00ff','#00ff88','#ff3366','#6688ff','#ffaa00'],
  },
  pastel: {
    gridColor: '#d4c5e8',
    bgColor: '#f5e6ff',
    blockStyle: 'rounded',
    colors: [null, '#a8dadc','#f1faee','#cdb4db','#b5e48c','#ffadad','#bdb2ff','#ffd6a5'],
  },
  pixel: {
    gridColor: '#5c4033',
    bgColor: '#2b1d0e',
    blockStyle: 'pixel',
    colors: [null, '#5fcde4','#f5d547','#c884d4','#9bd09b','#e58c8c','#8e95d4','#e8c470'],
  },
};
const SKIN_STORAGE_KEY = 'tetris.skin';
const DEFAULT_SKIN = 'retro';

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
let currentSkin = DEFAULT_SKIN;
let lastSavedSkin = DEFAULT_SKIN;

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

function loadSkinPreference() {
  try {
    const s = localStorage.getItem(SKIN_STORAGE_KEY);
    return SKINS[s] ? s : DEFAULT_SKIN;
  } catch (e) { return DEFAULT_SKIN; }
}

function saveSkinPreference(name) {
  try { localStorage.setItem(SKIN_STORAGE_KEY, name); } catch (e) {}
}

function applySkin(name) {
  const skinName = SKINS[name] ? name : DEFAULT_SKIN;
  currentSkin = skinName;
  // Toggle the skin-* class on body and both canvases
  const skinClasses = Object.keys(SKINS).map(k => 'skin-' + k);
  [document.body, canvas, nextCanvas].forEach(el => {
    if (!el) return;
    el.classList.remove(...skinClasses);
    el.classList.add('skin-' + skinName);
  });
  if (currentSkin !== lastSavedSkin) saveSkinPreference(skinName);
  const sel = document.getElementById('skin-select');
  if (sel) sel.value = skinName;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[currentSkin];
  const color = skin.colors[colorIndex];
  const style = skin.blockStyle;
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  const px = x * size + 1;
  const py = y * size + 1;
  const sz = size - 2;

  if (style === 'glow') {
    context.shadowBlur = 15;
    context.shadowColor = color;
    context.fillRect(px, py, sz, sz);
    context.shadowBlur = 0;
  } else if (style === 'rounded') {
    const r = sz * 0.2;
    context.beginPath();
    context.moveTo(px + r, py);
    context.lineTo(px + sz - r, py);
    context.arcTo(px + sz, py, px + sz, py + r, r);
    context.lineTo(px + sz, py + sz - r);
    context.arcTo(px + sz, py + sz, px + sz - r, py + sz, r);
    context.lineTo(px + r, py + sz);
    context.arcTo(px, py + sz, px, py + sz - r, r);
    context.lineTo(px, py + r);
    context.arcTo(px, py, px + r, py, r);
    context.closePath();
    context.fill();
  } else if (style === 'pixel') {
    context.fillRect(px, py, sz, sz);
    // 4x4 checkerboard texture using the base color and a darkened overlay
    const cell = sz / 4;
    context.fillStyle = 'rgba(0,0,0,0.25)';
    for (let pr = 0; pr < 4; pr++) {
      for (let pc = 0; pc < 4; pc++) {
        if ((pr + pc) % 2 === 0) {
          context.fillRect(px + pc * cell, py + pr * cell, cell, cell);
        }
      }
    }
  } else {
    // flat (retro, default)
    context.fillRect(px, py, sz, sz);
  }

  // Top highlight (only for flat and glow styles)
  if (style === 'flat' || style === 'glow') {
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(px, py, sz, 4);
  }
  context.globalAlpha = 1;
  context.shadowBlur = 0;
}

function drawGrid() {
  ctx.strokeStyle = SKINS[currentSkin].gridColor;
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
  // Background color from the active skin
  ctx.fillStyle = SKINS[currentSkin].bgColor;
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

// Apply persisted skin before the game starts so drawBlock/drawGrid see it
lastSavedSkin = loadSkinPreference();
applySkin(lastSavedSkin);

// Skin selector wiring
const skinSelect = document.getElementById('skin-select');
if (skinSelect) {
  skinSelect.addEventListener('change', e => {
    applySkin(e.target.value);
    draw();
    drawNext();
  });
}

init();

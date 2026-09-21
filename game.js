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

const QUEUE_SIZE = 5;
const MAX_ENERGY = 100;
const ENERGY_PER_LINE = 15;
const PREVIEW_MS = 15000;
const SLOW_MS = 10000;

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
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');

let board, current, nextQueue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let energy, previewUntil, slowUntil, undoSnapshot, holdUnlocked, hold, holdUsed;

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
    id: 'hold',
    label: 'Activar hold (C)',
    cost: 20,
    available: () => !holdUnlocked,
    run() { holdUnlocked = true; drawHold(); },
  },
];

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomPiece() {
  return makePiece(Math.floor(Math.random() * 7) + 1);
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
    energy = Math.min(MAX_ENERGY, energy + cleared * ENERGY_PER_LINE);
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

// One-step rollback support for the Deshacer ability.
function takeSnapshot() {
  undoSnapshot = {
    board: board.map(row => [...row]),
    score,
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
  dropAccum = 0;
  drawNext();
  updateHUD();
}

function lockPiece() {
  takeSnapshot();
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = nextQueue.shift();
  nextQueue.push(randomPiece());
  holdUsed = false;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
  drawHold();
}

// Available only after the hold ability has been bought; once per piece.
function holdPiece() {
  if (!holdUnlocked || holdUsed || paused || gameOver) return;
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

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
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

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);

  if (performance.now() < slowUntil) {
    ctx.save();
    ctx.fillStyle = 'rgba(122,162,247,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

// Draws one shape inside a square slot of `size` pixels at (0, offsetY).
function drawShapeInSlot(context, shape, offsetY, size) {
  const NB = size / 4;
  const offX = (4 - shape[0].length) / 2;
  const offY = (4 - shape.length) / 2;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const x = (offX + c) * NB;
      const y = offsetY + (offY + r) * NB;
      context.fillStyle = COLORS[shape[r][c]];
      context.fillRect(x + 1, y + 1, NB - 2, NB - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x + 1, y + 1, NB - 2, 3);
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
  holdCanvas.classList.toggle('locked', !holdUnlocked);
  if (!holdUnlocked || hold === null) return;
  holdCtx.globalAlpha = holdUsed ? 0.35 : 1;
  drawShapeInSlot(holdCtx, PIECES[hold], 0, 120);
  holdCtx.globalAlpha = 1;
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
  dropAccum += dt;
  const effectiveInterval = ts < slowUntil ? dropInterval * 2 : dropInterval;
  if (dropAccum >= effectiveInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (ts > previewUntil && nextCanvas.height !== 120) drawNext();
  if (gameOver) return;
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
  energy = 0;
  previewUntil = 0;
  slowUntil = 0;
  undoSnapshot = null;
  holdUnlocked = false;
  hold = null;
  holdUsed = false;
  nextCanvas.height = 120;
  nextQueue = Array.from({ length: QUEUE_SIZE }, () => randomPiece());
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

restartBtn.addEventListener('click', init);

buildAbilityList();
init();

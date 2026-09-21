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
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const modeEl = document.getElementById('mode');
const objectiveEl = document.getElementById('objective');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const modeListEl = document.getElementById('mode-list');
const restartBtn = document.getElementById('restart-btn');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let mode, timeLeft, garbageAccum, invisibleCells, revealUntil;

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
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) {
        const y = current.y + r, x = current.x + c;
        board[y][x] = current.shape[r][c];
        if (mode.invisible) invisibleCells.add(y * COLS + x);
      }
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
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      reindexInvisibleAfterClear(r);
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (mode.invisible) revealUntil = performance.now() + REVEAL_MS;
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
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
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
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;
  draw();
  updateHUD();
  animId = requestAnimationFrame(loop);
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
  if (mode.prefillRows) prefillBoard(mode.prefillRows);
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (!current || paused || gameOver) return;
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

restartBtn.addEventListener('click', () => init(mode.id));

buildModeList();
mode = MODES[0];
showModeSelect();

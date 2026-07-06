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

// Persisted high-score tracking (Unit 2: records + start screen + combo)
const STORAGE_KEY = 'tetris.leaderboard';
const MAX_LINES_KEY = 'tetris.maxLines';
const LEADERBOARD_SIZE = 5;

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
let combo = 0;
let bestCombo = 0;
let maxLines = 0;
let inStartScreen = false;

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
    combo++;
    if (combo > bestCombo) bestCombo = combo;
    updateHUD();
  } else {
    combo = 0;
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
  if (lines > maxLines) {
    maxLines = lines;
    try { localStorage.setItem(MAX_LINES_KEY, String(maxLines)); } catch (e) {}
  }
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  const nameSection = document.getElementById('name-input-section');
  const topPrompt = document.getElementById('top-score-prompt');
  if (isTopScore(score)) {
    nameSection.classList.remove('hidden');
    topPrompt.classList.remove('hidden');
    const input = document.getElementById('player-name');
    if (input) input.value = '';
  } else {
    nameSection.classList.add('hidden');
    topPrompt.classList.add('hidden');
  }
  document.getElementById('best-combo').textContent = bestCombo;
  document.getElementById('max-lines-display').textContent = maxLines;
  renderLeaderboard(document.querySelector('#gameover-leaderboard tbody'), score);
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

// ---- Leaderboard + persistence (Unit 2) ----

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveLeaderboard(lb) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lb));
  } catch (e) {}
}

function isTopScore(s) {
  const lb = loadLeaderboard();
  if (lb.length < LEADERBOARD_SIZE) return s > 0;
  return s > lb[lb.length - 1].score;
}

function addToLeaderboard(entry) {
  const lb = loadLeaderboard();
  lb.push(entry);
  lb.sort((a, b) => b.score - a.score);
  lb.length = Math.min(lb.length, LEADERBOARD_SIZE);
  saveLeaderboard(lb);
  return lb;
}

function resetLeaderboard() {
  saveLeaderboard([]);
}

function renderLeaderboard(tbody, highlightScore, highlightName) {
  if (!tbody) return;
  tbody.innerHTML = '';
  const lb = loadLeaderboard();
  if (lb.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4" style="opacity:0.5;">Sin records todavía</td>';
    tbody.appendChild(tr);
    return;
  }
  lb.forEach((entry, i) => {
    const tr = document.createElement('tr');
    tr.className = 'leaderboard-entry';
    // Prefer name-based highlight when provided (disambiguates ties)
    if (highlightName != null && entry.name === highlightName && entry.score === highlightScore) {
      tr.classList.add('highlight');
    } else if (highlightName == null && highlightScore != null && entry.score === highlightScore) {
      tr.classList.add('highlight');
    }
    tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(entry.name)}</td><td>${entry.score.toLocaleString()}</td><td>${entry.lines}</td>`;
    tbody.appendChild(tr);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showStartScreen() {
  // Hide all modals first
  document.querySelectorAll('.modal, .overlay').forEach(el => el.classList.add('hidden'));
  const ss = document.getElementById('start-screen');
  if (ss) ss.classList.remove('hidden');
  renderLeaderboard(document.querySelector('#start-leaderboard tbody'));
}

function hideStartScreen() {
  const ss = document.getElementById('start-screen');
  if (ss) ss.classList.add('hidden');
}

function startGame(startLevel = 1) {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  paused = false;
  gameOver = false;
  combo = 0;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  hideStartScreen();
  overlay.classList.add('hidden');
  inStartScreen = false;
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function init(startLevel = 1) {
  // Load persisted max-lines
  try {
    const stored = parseInt(localStorage.getItem(MAX_LINES_KEY) || '0', 10);
    maxLines = Number.isFinite(stored) ? stored : 0;
  } catch (e) { maxLines = 0; }

  // Unit 3 may provide a skin API; call it defensively if present
  if (typeof applySkin === 'function') {
    const skin = typeof loadSkinPreference === 'function' ? loadSkinPreference() : 'retro';
    applySkin(skin);
  }

  // Show start screen instead of starting a game immediately
  inStartScreen = true;
  paused = false;
  gameOver = false;
  showStartScreen();
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  if (!current) return;
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

restartBtn.addEventListener('click', () => startGame());

document.getElementById('play-btn').addEventListener('click', () => {
  startGame();
});

document.getElementById('reset-records-btn').addEventListener('click', () => {
  if (confirm('¿Borrar todos los records?')) {
    resetLeaderboard();
    renderLeaderboard(document.querySelector('#start-leaderboard tbody'));
  }
});

document.getElementById('save-score-btn').addEventListener('click', () => {
  const input = document.getElementById('player-name');
  const name = ((input && input.value) || 'Anónimo').trim().slice(0, 12) || 'Anónimo';
  addToLeaderboard({ name, score, lines });
  document.getElementById('name-input-section').classList.add('hidden');
  // Highlight the entry we just inserted by name + score (disambiguates ties)
  renderLeaderboard(document.querySelector('#gameover-leaderboard tbody'), score, name);
});

// Enter in the name input also saves
const playerNameInput = document.getElementById('player-name');
if (playerNameInput) {
  playerNameInput.addEventListener('keydown', e => {
    if (e.code === 'Enter') {
      e.preventDefault();
      document.getElementById('save-score-btn').click();
    }
  });
}

init();

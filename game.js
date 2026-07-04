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
  '#1976D2', // J - blue
  '#ffb74d', // L - orange
  '#e8e8ff', // Marco - plateado especial (rara)
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
  [[8,8,8],[8,0,8],[8,8,8]],                  // Marco (rara)
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
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const hudLeaderboardEl = document.getElementById('hud-leaderboard');
const hudBestComboEl = document.getElementById('hud-best-combo');
const hudMaxLinesEl = document.getElementById('hud-max-lines');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const overlayRecords = document.getElementById('overlay-records');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const overlayLeaderboardEl = document.getElementById('overlay-leaderboard');
const overlayBestComboEl = document.getElementById('overlay-best-combo');
const overlayMaxLinesEl = document.getElementById('overlay-max-lines');

let board, current, next, score, lines, level, combo, paused, gameOver, lastTime, dropAccum, dropInterval, animId, currentHighlight;

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.remove('light-mode');
    themeIcon.textContent = '🌙';
  } else {
    document.body.classList.add('light-mode');
    themeIcon.textContent = '☀️';
  }
  localStorage.setItem('tetris-theme', isDark ? 'dark' : 'light');
}

// Load saved theme on startup (dark is default)
const savedTheme = localStorage.getItem('tetris-theme');
if (savedTheme === 'light') {
  themeToggle.checked = false;
  applyTheme(false);
}

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked);
});

const RECORDS_KEY = 'tetris-records';

function defaultRecords() {
  return { leaderboard: [], bestCombo: 0, maxLines: 0 };
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return defaultRecords();
    const parsed = JSON.parse(raw);
    return {
      leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
      bestCombo: Number(parsed.bestCombo) || 0,
      maxLines: Number(parsed.maxLines) || 0,
    };
  } catch (e) {
    return defaultRecords();
  }
}

function saveRecords() {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

let records = loadRecords();

function isTopScore(s) {
  return records.leaderboard.length < 5 ||
    s > records.leaderboard[records.leaderboard.length - 1].score;
}

function addLeaderboardEntry(name, s) {
  const entry = { name, score: s };
  records.leaderboard.push(entry);
  records.leaderboard.sort((a, b) => b.score - a.score);
  records.leaderboard = records.leaderboard.slice(0, 5);
  saveRecords();
  return records.leaderboard.includes(entry) ? entry : null;
}

function checkAndUpdateHistoricRecords() {
  let changed = false;
  if (combo > records.bestCombo) { records.bestCombo = combo; changed = true; }
  if (lines > records.maxLines) { records.maxLines = lines; changed = true; }
  if (changed) {
    saveRecords();
    renderRecordsUI(currentHighlight);
  }
}

function renderLeaderboardList(listEl, highlightEntry) {
  listEl.innerHTML = '';
  if (!records.leaderboard.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Sin records aún';
    listEl.appendChild(li);
    return;
  }
  records.leaderboard.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-entry' + (entry === highlightEntry ? ' highlight' : '');
    li.innerHTML = `<span class="rank">${i + 1}.</span><span class="name">${entry.name}</span><span class="score">${entry.score.toLocaleString()}</span>`;
    listEl.appendChild(li);
  });
}

function renderRecordsUI(highlightEntry) {
  renderLeaderboardList(hudLeaderboardEl, highlightEntry);
  renderLeaderboardList(overlayLeaderboardEl, highlightEntry);
  hudBestComboEl.textContent = records.bestCombo;
  overlayBestComboEl.textContent = records.bestCombo;
  hudMaxLinesEl.textContent = records.maxLines;
  overlayMaxLinesEl.textContent = records.maxLines;
}

function resetRecords() {
  if (!confirm('¿Seguro que quieres borrar todos los records?')) return;
  records = defaultRecords();
  saveRecords();
  currentHighlight = null;
  renderRecordsUI();
}

function saveCurrentEntry() {
  const name = (nameInput.value.trim() || 'AAA').toUpperCase().slice(0, 3);
  currentHighlight = addLeaderboardEntry(name, score);
  nameForm.classList.add('hidden');
  renderRecordsUI(currentHighlight);
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.random() < 0.05
    ? 8
    : Math.floor(Math.random() * 7) + 1;
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
    combo++;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  } else {
    combo = 0;
  }
  checkAndUpdateHistoricRecords();
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
    return;
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
  ctx.strokeStyle = getCSSVar('--grid-color') || '#22222e';
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
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlayRecords.classList.remove('hidden');
  const qualifies = isTopScore(score);
  nameForm.classList.toggle('hidden', !qualifies);
  if (qualifies) nameInput.value = '';
  currentHighlight = null;
  renderRecordsUI(null);
  overlay.classList.remove('hidden');
  if (qualifies) nameInput.focus();
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
    overlayRecords.classList.add('hidden');
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
      if (gameOver) return;
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
  combo = 0;
  currentHighlight = null;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  overlayRecords.classList.add('hidden');
  nameForm.classList.add('hidden');
  renderRecordsUI();
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

restartBtn.addEventListener('click', () => {
  if (gameOver && !nameForm.classList.contains('hidden')) {
    saveCurrentEntry();
  }
  init();
});

nameForm.addEventListener('submit', e => {
  e.preventDefault();
  saveCurrentEntry();
});

resetRecordsBtn.addEventListener('click', resetRecords);

init();

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
  '#ADD8E6', // J - pale blue
  '#ffb74d', // L - orange
];

const COLORS_LIGHT = [
  null,
  '#00bcd4', // I - cyan vivid
  '#ffc107', // O - amber vivid
  '#9c27b0', // T - deep purple vivid
  '#4caf50', // S - green vivid
  '#f44336', // Z - red vivid
  '#2196f3', // J - blue vivid
  '#ff9800', // L - orange vivid
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
const hsListEl = document.getElementById('highscore-list');
const overlayHsListEl = document.getElementById('overlay-highscore-list');
const bestComboEl = document.getElementById('best-combo');
const maxLinesEl = document.getElementById('max-lines');
const nameEntryEl = document.getElementById('name-entry');
const playerNameInput = document.getElementById('player-name');
const saveScoreBtn = document.getElementById('save-score-btn');
const clearScoresBtn = document.getElementById('clear-scores-btn');

const HS_KEY = 'tetris.highscores';
const STATS_KEY = 'tetris.stats';
const MAX_SCORES = 5;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, lightMode, combo, bestCombo;

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) { /* almacenamiento no disponible */ }
}

let highscores = loadJSON(HS_KEY, []);
if (!Array.isArray(highscores)) highscores = [];
highscores = highscores
  .filter(h => h && typeof h === 'object' && Number.isFinite(Number(h.score)))
  .map(h => ({ name: String(h.name || 'Jugador'), score: Number(h.score), lines: Number(h.lines) || 0, level: Number(h.level) || 1, date: String(h.date || '') }))
  .slice(0, MAX_SCORES);
const rawStats = loadJSON(STATS_KEY, {});
let stats = { bestCombo: Number(rawStats.bestCombo) || 0, maxLines: Number(rawStats.maxLines) || 0 };

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
  return cleared;
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
  if (clearLines() > 0) {
    combo++;
    if (combo > bestCombo) bestCombo = combo;
  } else {
    combo = 0;
  }
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
  const color = (lightMode ? COLORS_LIGHT : COLORS)[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = lightMode ? '#c8c8d8' : '#22222e';
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

function scoreQualifies() {
  if (score <= 0) return false;
  return highscores.length < MAX_SCORES || score > highscores[highscores.length - 1].score;
}

function updateStats() {
  let changed = false;
  if (bestCombo > stats.bestCombo) { stats.bestCombo = bestCombo; changed = true; }
  if (lines > stats.maxLines) { stats.maxLines = lines; changed = true; }
  if (changed) saveJSON(STATS_KEY, stats);
}

function saveScore() {
  const name = playerNameInput.value.trim() || 'Jugador';
  const entry = { name, score, lines, level, date: new Date().toISOString().slice(0, 10) };
  let idx = highscores.findIndex(h => entry.score > h.score);
  if (idx === -1) idx = highscores.length;
  highscores.splice(idx, 0, entry);
  highscores = highscores.slice(0, MAX_SCORES);
  saveJSON(HS_KEY, highscores);
  nameEntryEl.classList.add('hidden');
  renderHighscores(idx);
}

function renderHsList(listEl, highlightIdx) {
  listEl.innerHTML = '';
  if (!highscores.length) {
    const li = document.createElement('li');
    li.className = 'hs-empty';
    li.textContent = 'Sin records';
    listEl.appendChild(li);
    return;
  }
  highscores.forEach((h, i) => {
    const li = document.createElement('li');
    if (i === highlightIdx) li.classList.add('hs-new');
    const name = document.createElement('span');
    name.className = 'hs-name';
    name.textContent = `${i + 1}. ${h.name}`;
    const sc = document.createElement('span');
    sc.className = 'hs-score';
    sc.textContent = h.score.toLocaleString();
    li.append(name, sc);
    listEl.appendChild(li);
  });
}

function renderHighscores(highlightIdx) {
  renderHsList(hsListEl, highlightIdx);
  renderHsList(overlayHsListEl, highlightIdx);
  bestComboEl.textContent = stats.bestCombo;
  maxLinesEl.textContent = stats.maxLines;
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  updateStats();
  renderHighscores();
  overlayHsListEl.classList.remove('hidden');
  const qualifies = scoreQualifies();
  nameEntryEl.classList.toggle('hidden', !qualifies);
  overlay.classList.remove('hidden');
  if (qualifies) {
    playerNameInput.value = 'Jugador';
    playerNameInput.focus();
    playerNameInput.select();
  }
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    nameEntryEl.classList.add('hidden');
    overlayHsListEl.classList.add('hidden');
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
  combo = 0;
  bestCombo = 0;
  lightMode = document.body.classList.contains('light-mode');
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  renderHighscores();
  nameEntryEl.classList.add('hidden');
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
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

saveScoreBtn.addEventListener('click', saveScore);
playerNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveScore();
});

clearScoresBtn.addEventListener('click', () => {
  highscores = [];
  stats = { bestCombo: 0, maxLines: 0 };
  try {
    localStorage.removeItem(HS_KEY);
    localStorage.removeItem(STATS_KEY);
  } catch (e) { /* almacenamiento no disponible */ }
  renderHighscores();
  clearScoresBtn.blur();
});

const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  lightMode = !lightMode;
  document.body.classList.toggle('light-mode', lightMode);
  themeToggle.textContent = lightMode ? '☾ DARK MODE' : '☀ LIGHT MODE';
});

lightMode = false;
init();

'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SKINS = {
  retro: {
    label: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d', '#90a4ae'],
  },
  neon: {
    label: 'Neon',
    colors: [null, '#00e5ff', '#faff00', '#e040fb', '#00ff85', '#ff1744', '#536dfe', '#ff9100', '#b0bec5'],
  },
  pastel: {
    label: 'Pastel',
    colors: [null, '#a8dadc', '#ffe8a3', '#d7bde2', '#b7e4c7', '#f4a6a6', '#b8c6ec', '#ffd6a5', '#cfd8dc'],
  },
  pixel: {
    label: 'Pixel art',
    colors: [null, '#26c6da', '#fdd835', '#ab47bc', '#66bb6a', '#ef5350', '#5c6bc0', '#ffa726', '#78909c'],
  },
};

const NUT_TYPE = 8;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // Tuerca (anillo 3x3, hueco central)
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
const overlayStats = document.getElementById('overlay-stats');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const pauseOverlay = document.getElementById('pause-overlay');
const pauseMain = document.getElementById('pause-main');
const pauseControls = document.getElementById('pause-controls');
const resumeBtn = document.getElementById('resume-btn');
const restartPauseBtn = document.getElementById('restart-pause-btn');
const showControlsBtn = document.getElementById('show-controls-btn');
const hideControlsBtn = document.getElementById('hide-controls-btn');
const startLevelSelect = document.getElementById('start-level-select');
const recordsListEl = document.getElementById('records-list');
const bestComboEl = document.getElementById('best-combo');
const bestLinesEl = document.getElementById('best-lines');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const highscoreForm = document.getElementById('highscore-form');
const playerNameInput = document.getElementById('player-name');
const saveScoreBtn = document.getElementById('save-score-btn');
const skinSelect = document.getElementById('skin-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let comboCount, maxComboThisGame;

const RECORDS_KEY = 'tetris-records';

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECORDS_KEY));
    return {
      scores: Array.isArray(parsed?.scores) ? parsed.scores : [],
      bestCombo: Number(parsed?.bestCombo) || 0,
      bestLines: Number(parsed?.bestLines) || 0,
    };
  } catch {
    return { scores: [], bestCombo: 0, bestLines: 0 };
  }
}

function saveRecords() {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

let records = loadRecords();

function qualifiesForTop5(candidateScore) {
  if (candidateScore <= 0) return false;
  if (records.scores.length < 5) return true;
  return candidateScore > records.scores[records.scores.length - 1].score;
}

function renderRecords(highlightEntry) {
  recordsListEl.innerHTML = '';
  if (records.scores.length === 0) {
    const li = document.createElement('li');
    li.className = 'records-empty';
    li.textContent = 'Sin puntuaciones aún';
    recordsListEl.appendChild(li);
  } else {
    for (const entry of records.scores) {
      const li = document.createElement('li');
      if (entry === highlightEntry) li.classList.add('highlight');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'rec-name';
      nameSpan.textContent = entry.name;
      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'rec-score';
      scoreSpan.textContent = entry.score.toLocaleString();
      li.appendChild(nameSpan);
      li.appendChild(scoreSpan);
      recordsListEl.appendChild(li);
    }
  }
  bestComboEl.textContent = records.bestCombo;
  bestLinesEl.textContent = records.bestLines;
}

function submitHighscore() {
  const name = (playerNameInput.value || '').trim().slice(0, 12) || 'Jugador';
  const entry = { name, score, lines, level };
  records.scores.push(entry);
  records.scores.sort((a, b) => b.score - a.score);
  records.scores = records.scores.slice(0, 5);
  saveRecords();
  highscoreForm.classList.add('hidden');
  renderRecords(records.scores.includes(entry) ? entry : undefined);
}

renderRecords();

saveScoreBtn.addEventListener('click', submitHighscore);
playerNameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') submitHighscore();
});

resetRecordsBtn.addEventListener('click', () => {
  if (!confirm('¿Seguro que quieres borrar todos los récords?')) return;
  records = { scores: [], bestCombo: 0, bestLines: 0 };
  saveRecords();
  renderRecords();
});

const THEME_KEY = 'tetris-theme';
const START_LEVEL_KEY = 'tetris-start-level';
const MAX_START_LEVEL = 15;
let gridLineColor = '#22222e';
let startLevel = 1;

function populateStartLevelSelect() {
  for (let l = 1; l <= MAX_START_LEVEL; l++) {
    const option = document.createElement('option');
    option.value = l;
    option.textContent = l;
    startLevelSelect.appendChild(option);
  }
}

function getPreferredStartLevel() {
  const saved = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
  return saved >= 1 && saved <= MAX_START_LEVEL ? saved : 1;
}

populateStartLevelSelect();
startLevel = getPreferredStartLevel();
startLevelSelect.value = startLevel;

startLevelSelect.addEventListener('change', () => {
  startLevel = parseInt(startLevelSelect.value, 10);
  localStorage.setItem(START_LEVEL_KEY, startLevel);
});

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  gridLineColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim();
  themeToggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
  themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
}

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

applyTheme(getPreferredTheme());

themeToggleBtn.addEventListener('click', () => {
  const nextTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
});

const SKIN_KEY = 'tetris-skin';
let currentSkinId = 'retro';

function applySkin(id) {
  if (!SKINS[id]) id = 'retro';
  currentSkinId = id;
  document.documentElement.setAttribute('data-skin', id);
  skinSelect.value = id;
  // Redraw immediately if a game is already in progress.
  if (current) draw();
  if (next) drawNext();
}

function getPreferredSkin() {
  const saved = localStorage.getItem(SKIN_KEY);
  return SKINS[saved] ? saved : 'retro';
}

applySkin(getPreferredSkin());

skinSelect.addEventListener('change', () => {
  localStorage.setItem(SKIN_KEY, skinSelect.value);
  applySkin(skinSelect.value);
});

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
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
  const cleared = clearLines();
  if (cleared > 0) {
    comboCount++;
    if (comboCount > maxComboThisGame) maxComboThisGame = comboCount;
  } else {
    comboCount = 0;
  }
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

function roundedRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function drawBlockRetro(context, x, y, color, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawBlockNeon(context, x, y, color, size, alpha) {
  context.save();
  context.globalAlpha = alpha ?? 1;
  const px = x * size + 2, py = y * size + 2, s = size - 4;
  context.shadowColor = color;
  context.shadowBlur = 12;
  context.fillStyle = 'rgba(8, 8, 16, 0.85)';
  context.fillRect(px, py, s, s);
  context.shadowBlur = 6;
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.strokeRect(px, py, s, s);
  context.restore();
}

function drawBlockPastel(context, x, y, color, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  const px = x * size + 2, py = y * size + 2, s = size - 4;
  roundedRectPath(context, px, py, s, s, size * 0.22);
  context.fillStyle = color;
  context.fill();
  roundedRectPath(context, px, py, s, s * 0.42, size * 0.18);
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.fill();
  context.globalAlpha = 1;
}

function drawBlockPixel(context, x, y, color, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  // pixel-art dither texture
  const sub = 4;
  const cell = s / sub;
  context.fillStyle = 'rgba(0,0,0,0.15)';
  for (let ry = 0; ry < sub; ry++) {
    for (let rx = 0; rx < sub; rx++) {
      if ((rx + ry) % 2 === 0) continue;
      context.fillRect(px + rx * cell, py + ry * cell, cell, cell);
    }
  }
  context.strokeStyle = 'rgba(0,0,0,0.45)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  context.globalAlpha = 1;
}

const BLOCK_RENDERERS = {
  retro: drawBlockRetro,
  neon: drawBlockNeon,
  pastel: drawBlockPastel,
  pixel: drawBlockPixel,
};

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = SKINS[currentSkinId].colors[colorIndex];
  const renderer = BLOCK_RENDERERS[currentSkinId] || drawBlockRetro;
  renderer(context, x, y, color, size, alpha);
}

function drawNutHole(context, x, y, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  context.strokeStyle = SKINS[currentSkinId].colors[NUT_TYPE];
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x * size + size / 2, y * size + size / 2, size * 0.3, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridLineColor;
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
  if (current.type === NUT_TYPE) drawNutHole(ctx, current.x + 1, gy + 1, BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  if (current.type === NUT_TYPE) drawNutHole(ctx, current.x + 1, current.y + 1, BLOCK);
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
  if (next.type === NUT_TYPE) drawNutHole(nextCtx, offX + 1, offY + 1, NB);
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  cancelAnimationFrame(animId);
  animId = null;
  draw();
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlayStats.textContent = `Líneas: ${lines} · Combo máximo: ${maxComboThisGame}`;

  let recordsChanged = false;
  if (maxComboThisGame > records.bestCombo) {
    records.bestCombo = maxComboThisGame;
    recordsChanged = true;
  }
  if (lines > records.bestLines) {
    records.bestLines = lines;
    recordsChanged = true;
  }
  if (recordsChanged) saveRecords();

  if (qualifiesForTop5(score)) {
    highscoreForm.classList.remove('hidden');
    playerNameInput.value = '';
    setTimeout(() => playerNameInput.focus(), 0);
  } else {
    highscoreForm.classList.add('hidden');
  }

  renderRecords();
  overlay.classList.remove('hidden');
}

function showPauseMenu() {
  pauseControls.classList.add('hidden');
  pauseMain.classList.remove('hidden');
  pauseOverlay.classList.remove('hidden');
}

function hidePauseMenu() {
  pauseOverlay.classList.add('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    hidePauseMenu();
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    showPauseMenu();
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
  if (gameOver || paused) { animId = null; return; }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  cancelAnimationFrame(animId);
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  comboCount = 0;
  maxComboThisGame = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  hidePauseMenu();
  highscoreForm.classList.add('hidden');
  animId = requestAnimationFrame(loop);
}

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

resumeBtn.addEventListener('click', togglePause);
restartPauseBtn.addEventListener('click', init);
showControlsBtn.addEventListener('click', () => {
  pauseMain.classList.add('hidden');
  pauseControls.classList.remove('hidden');
});
hideControlsBtn.addEventListener('click', () => {
  pauseControls.classList.add('hidden');
  pauseMain.classList.remove('hidden');
});

init();

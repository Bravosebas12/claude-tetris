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
  '#64b5f6', // J - azul palido
  '#ffb74d', // L - orange
  '#b0bec5', // Tuerca - gris metálico
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
  [[8,8,8],[8,0,8],[8,8,8]],                  // Tuerca (nut)
];

const PASTEL_COLORS = [
  null,
  '#a8dee8', // I - cyan pastel
  '#fbe7a1', // O - yellow pastel
  '#dcb6e0', // T - purple pastel
  '#bfe3bd', // S - green pastel
  '#f0b3ae', // Z - red pastel
  '#b8d4f0', // J - blue pastel
  '#f5cfa0', // L - orange pastel
  '#d6dade', // Tuerca - gris pastel
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const THEME_KEY = 'tetris-theme';
const SKIN_KEY = 'tetris-skin';

const SKINS = {
  retro: { label: 'Retro', colors: COLORS },
  neon: { label: 'Neon', colors: COLORS },
  pastel: { label: 'Pastel', colors: PASTEL_COLORS },
  pixel: { label: 'Pixel Art', colors: COLORS },
};

let currentSkin = 'retro';

const SCORES_KEY = 'tetris-highscores';
const MAX_SCORES = 5;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeLabel = document.getElementById('theme-label');
const skinSelect = document.getElementById('skin-select');
const recordsList = document.getElementById('records-list');
const bestComboEl = document.getElementById('best-combo');
const bestLinesEl = document.getElementById('best-lines');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const overlayNewRecord = document.getElementById('overlay-newrecord');
const overlayRecords = document.getElementById('overlay-records');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');

const pauseOverlay = document.getElementById('pause-overlay');
const pauseMainView = document.getElementById('pause-main');
const pauseControlsView = document.getElementById('pause-controls');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const showControlsBtn = document.getElementById('show-controls-btn');
const backFromControlsBtn = document.getElementById('back-from-controls-btn');
const startLevelValue = document.getElementById('start-level-value');
const startLevelDecBtn = document.getElementById('start-level-dec');
const startLevelIncBtn = document.getElementById('start-level-inc');

const MAX_START_LEVEL = 15;

let board, current, next, hold, canHold, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, combo, runMaxCombo;
let startLevel = 1;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomPiece() {
  return makePiece(Math.floor(Math.random() * 8) + 1);
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
    if (combo > runMaxCombo) runMaxCombo = combo;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  } else {
    combo = -1;
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
  canHold = true;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
  drawHold();
}

function holdPiece() {
  if (paused || gameOver || !canHold) return;
  const currentType = current.type;
  if (hold === null) {
    hold = currentType;
    spawn();
  } else {
    const swapType = hold;
    hold = currentType;
    current = makePiece(swapType);
    if (collide(current.shape, current.x, current.y)) endGame();
  }
  canHold = false;
  drawHold();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawRetroBlock(context, x, y, color, size) {
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
}

function drawNeonBlock(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.shadowColor = color;
  context.shadowBlur = 12;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(255,255,255,0.6)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
}

function drawPastelBlock(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  const r = Math.min(6, s / 2);
  context.fillStyle = color;
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
  context.fill();
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.beginPath();
  context.arc(px + s * 0.3, py + s * 0.3, s * 0.15, 0, Math.PI * 2);
  context.fill();
}

function drawPixelBlock(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  const cell = Math.max(2, Math.floor(s / 4));
  context.fillStyle = 'rgba(0,0,0,0.15)';
  for (let ty = 0; ty < s; ty += cell * 2) {
    for (let tx = 0; tx < s; tx += cell * 2) {
      context.fillRect(px + tx, py + ty, cell, cell);
      context.fillRect(px + tx + cell, py + ty + cell, cell, cell);
    }
  }
  context.strokeStyle = 'rgba(0,0,0,0.4)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
}

const SKIN_DRAWERS = {
  retro: drawRetroBlock,
  neon: drawNeonBlock,
  pastel: drawPastelBlock,
  pixel: drawPixelBlock,
};

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[currentSkin];
  const color = skin.colors[colorIndex];
  context.save();
  context.globalAlpha = alpha ?? 1;
  (SKIN_DRAWERS[currentSkin] || drawRetroBlock)(context, x, y, color, size);
  context.restore();
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
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

function drawHold() {
  const NB = 30;
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  holdCanvas.classList.toggle('locked', !canHold);
  if (hold === null) return;
  const shape = PIECES[hold];
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(holdCtx, offX + c, offY + r, shape[r][c], NB);
}

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SCORES_KEY));
    return {
      scores: Array.isArray(parsed?.scores) ? parsed.scores : [],
      bestCombo: parsed?.bestCombo || 0,
      bestLines: parsed?.bestLines || 0,
    };
  } catch {
    return { scores: [], bestCombo: 0, bestLines: 0 };
  }
}

function saveRecords(data) {
  localStorage.setItem(SCORES_KEY, JSON.stringify(data));
}

function qualifiesForTop(finalScore) {
  if (finalScore <= 0) return false;
  const { scores } = loadRecords();
  return scores.length < MAX_SCORES || finalScore > scores[scores.length - 1].score;
}

function addScoreRecord(name, finalScore, finalLines, finalCombo) {
  const data = loadRecords();
  data.scores.push({ name: name || 'Jugador', score: finalScore, lines: finalLines, combo: finalCombo });
  data.scores.sort((a, b) => b.score - a.score);
  data.scores = data.scores.slice(0, MAX_SCORES);
  data.bestCombo = Math.max(data.bestCombo, finalCombo);
  data.bestLines = Math.max(data.bestLines, finalLines);
  saveRecords(data);
  return data.scores.findIndex(
    e => e.name === (name || 'Jugador') && e.score === finalScore && e.lines === finalLines && e.combo === finalCombo
  );
}

function updateBestStats(finalLines, finalCombo) {
  const data = loadRecords();
  data.bestCombo = Math.max(data.bestCombo, finalCombo);
  data.bestLines = Math.max(data.bestLines, finalLines);
  saveRecords(data);
}

function renderRecords(highlightIndex = -1) {
  const data = loadRecords();
  recordsList.innerHTML = '';
  if (!data.scores.length) {
    const li = document.createElement('li');
    li.className = 'record-empty';
    li.textContent = 'Sin récords aún';
    recordsList.appendChild(li);
  } else {
    data.scores.forEach((entry, i) => {
      const li = document.createElement('li');
      li.className = 'record-item' + (i === highlightIndex ? ' record-highlight' : '');
      const rank = document.createElement('span');
      rank.className = 'record-rank';
      rank.textContent = `${i + 1}.`;
      const name = document.createElement('span');
      name.className = 'record-name';
      name.textContent = entry.name;
      const sc = document.createElement('span');
      sc.className = 'record-score';
      sc.textContent = entry.score.toLocaleString();
      li.append(rank, name, sc);
      recordsList.appendChild(li);
    });
  }
  bestComboEl.textContent = data.bestCombo;
  bestLinesEl.textContent = data.bestLines;
}

function resetRecords() {
  if (!confirm('¿Seguro que quieres borrar todos los récords?')) return;
  localStorage.removeItem(SCORES_KEY);
  renderRecords();
}

function saveCurrentScore() {
  const rankIndex = addScoreRecord(playerNameInput.value.trim(), score, lines, runMaxCombo);
  overlayNewRecord.classList.add('hidden');
  renderRecords(rankIndex);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlayRecords.classList.remove('hidden');
  if (qualifiesForTop(score)) {
    overlayNewRecord.classList.remove('hidden');
    playerNameInput.value = '';
    renderRecords();
    overlay.classList.remove('hidden');
    playerNameInput.focus();
  } else {
    updateBestStats(lines, runMaxCombo);
    renderRecords();
    overlay.classList.remove('hidden');
  }
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

function showPauseMenu() {
  showPauseMainView();
  updateStartLevelUI();
  pauseOverlay.classList.remove('hidden');
}

function hidePauseMenu() {
  pauseOverlay.classList.add('hidden');
}

function showPauseMainView() {
  pauseMainView.classList.remove('hidden');
  pauseControlsView.classList.add('hidden');
}

function showPauseControlsView() {
  pauseMainView.classList.add('hidden');
  pauseControlsView.classList.remove('hidden');
}

function updateStartLevelUI() {
  startLevelValue.textContent = String(startLevel);
  startLevelDecBtn.disabled = startLevel <= 1;
  startLevelIncBtn.disabled = startLevel >= MAX_START_LEVEL;
}

function changeStartLevel(delta) {
  startLevel = Math.min(MAX_START_LEVEL, Math.max(1, startLevel + delta));
  updateStartLevelUI();
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
  if (!gameOver && !paused) animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  hold = null;
  canHold = true;
  score = 0;
  lines = 0;
  level = startLevel;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  combo = -1;
  runMaxCombo = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  drawHold();
  overlay.classList.add('hidden');
  overlayNewRecord.classList.add('hidden');
  overlayRecords.classList.add('hidden');
  hidePauseMenu();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
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
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdPiece();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
resetRecordsBtn.addEventListener('click', resetRecords);
saveScoreBtn.addEventListener('click', saveCurrentScore);
playerNameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') saveCurrentScore();
});

resumeBtn.addEventListener('click', togglePause);
pauseRestartBtn.addEventListener('click', init);
showControlsBtn.addEventListener('click', showPauseControlsView);
backFromControlsBtn.addEventListener('click', showPauseMainView);
startLevelDecBtn.addEventListener('click', () => changeStartLevel(-1));
startLevelIncBtn.addEventListener('click', () => changeStartLevel(1));

function setThemeUI(isLight) {
  document.body.classList.toggle('light', isLight);
  themeIcon.textContent = isLight ? '☀️' : '🌙';
  themeLabel.textContent = isLight ? 'LIGHT' : 'DARK';
  themeToggleBtn.setAttribute('aria-pressed', String(isLight));
}

function initTheme() {
  setThemeUI(localStorage.getItem(THEME_KEY) === 'light');
}

themeToggleBtn.addEventListener('click', () => {
  const isLight = !document.body.classList.contains('light');
  setThemeUI(isLight);
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  draw();
  drawNext();
  drawHold();
});

function setSkin(skin) {
  currentSkin = SKINS[skin] ? skin : 'retro';
  document.body.dataset.skin = currentSkin;
  skinSelect.value = currentSkin;
  localStorage.setItem(SKIN_KEY, currentSkin);
  draw();
  drawNext();
  drawHold();
}

function initSkin() {
  setSkin(localStorage.getItem(SKIN_KEY) || 'retro');
}

skinSelect.addEventListener('change', () => setSkin(skinSelect.value));

updateStartLevelUI();
initTheme();
init();
initSkin();

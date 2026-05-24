'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SKINS = {
  retro: {
    palette: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d'],
    bg: '#1a1a25',
    grid: '#22222e',
    drawBlock(ctx, x, y, idx, size, alpha) {
      if (!idx) return;
      ctx.globalAlpha = alpha ?? 1;
      ctx.fillStyle = this.palette[idx];
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      ctx.globalAlpha = 1;
    }
  },
  neon: {
    palette: [null, '#00ffff', '#ffff00', '#ff00ff', '#00ff88', '#ff4444', '#4488ff', '#ff8800'],
    bg: '#000010',
    grid: '#001122',
    drawBlock(ctx, x, y, idx, size, alpha) {
      if (!idx) return;
      const color = this.palette[idx];
      ctx.globalAlpha = alpha ?? 1;
      ctx.shadowBlur = 14 * (alpha ?? 1);
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  },
  pastel: {
    palette: [null, '#a8e6f0', '#ffeaa7', '#d4a8e8', '#b8e6b8', '#f0a8a8', '#a8b8e8', '#f0c8a0'],
    bg: '#f0eeff',
    grid: '#ddd8f0',
    drawBlock(ctx, x, y, idx, size, alpha) {
      if (!idx) return;
      ctx.globalAlpha = alpha ?? 1;
      ctx.fillStyle = this.palette[idx];
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x * size + 2, y * size + 2, size - 4, size - 4, 6);
        ctx.fill();
      } else {
        ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
      }
      ctx.globalAlpha = 1;
    }
  },
  pixel: {
    palette: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d'],
    bg: '#1a1a25',
    grid: '#22222e',
    drawBlock(ctx, x, y, idx, size, alpha) {
      if (!idx) return;
      ctx.globalAlpha = alpha ?? 1;
      ctx.fillStyle = this.palette[idx];
      ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      const cellSize = (size - 2) / 4;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let miniRow = 0; miniRow < 4; miniRow++) {
        for (let miniCol = 0; miniCol < 4; miniCol++) {
          if ((miniRow + miniCol) % 2 === 0) {
            ctx.fillRect(
              x * size + 1 + miniCol * cellSize,
              y * size + 1 + miniRow * cellSize,
              cellSize,
              cellSize
            );
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }
};

let activeSkin = 'retro';

function getSkin() {
  return SKINS[activeSkin];
}

function setSkin(name) {
  if (!SKINS[name]) name = 'retro';
  activeSkin = name;
  localStorage.setItem('tetris.skin', name);
  document.body.dataset.skin = name;
  document.querySelectorAll('.skin-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.skin === name);
  });
  if (typeof current !== 'undefined' && current) draw();
  if (typeof next !== 'undefined' && next) drawNext();
}

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
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const startScoresTable = document.getElementById('start-scores-table');
const gameoverSummary = document.getElementById('gameover-summary');
const newRecordBanner = document.getElementById('new-record-banner');
const playerNameInput = document.getElementById('player-name');
const saveBtn = document.getElementById('save-btn');
const resetScoresBtn = document.getElementById('reset-scores-btn');
const gameoverScoresTable = document.getElementById('gameover-scores-table');
const pauseOverlay = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const nivelDisplay = document.getElementById('nivel-display');
const nivelDec = document.getElementById('nivel-dec');
const nivelInc = document.getElementById('nivel-inc');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let combo, maxCombo;

let startLevel = Math.min(15, Math.max(1, parseInt(localStorage.getItem('tetris.startLevel'), 10) || 1));
nivelDisplay.textContent = startLevel;

// ---- Leaderboard helpers ----

function loadScores() {
  try {
    return JSON.parse(localStorage.getItem('tetris.scores')) || [];
  } catch (e) {
    return [];
  }
}

function saveScores(arr) {
  localStorage.setItem('tetris.scores', JSON.stringify(arr));
}

function isNewRecord(s) {
  const scores = loadScores();
  return scores.length < 5 || s > (scores[4] ? scores[4].score : -1);
}

function insertScore(entry) {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  scores.splice(5);
  saveScores(scores);
}

function buildScoresTable(highlightEntry) {
  const scores = loadScores();
  if (scores.length === 0) {
    const p = document.createElement('p');
    p.style.cssText = 'font-size:11px;color:#444466;margin-top:4px;';
    p.textContent = 'Sin récords todavía.';
    return p;
  }

  const table = document.createElement('table');
  table.className = 'scores-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Líneas</th><th>Combo</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  scores.forEach((entry, i) => {
    const tr = document.createElement('tr');
    if (
      highlightEntry &&
      entry.name === highlightEntry.name &&
      entry.score === highlightEntry.score &&
      entry.lines === highlightEntry.lines &&
      entry.combo === highlightEntry.combo
    ) {
      tr.className = 'hl';
    }
    tr.innerHTML =
      `<td>${i + 1}</td>` +
      `<td>${escapeHtml(entry.name ?? '')}</td>` +
      `<td>${entry.score.toLocaleString()}</td>` +
      `<td>${entry.lines}</td>` +
      `<td>${entry.combo}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStartScores() {
  startScoresTable.innerHTML = '';
  startScoresTable.appendChild(buildScoresTable(null));
}

function renderGameoverScores(highlightEntry) {
  gameoverScoresTable.innerHTML = '';
  gameoverScoresTable.appendChild(buildScoresTable(highlightEntry));
}

// ---- Game logic ----

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
    level = Math.floor(lines / 10) + startLevel;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    combo++;
    if (combo > maxCombo) maxCombo = combo;
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
  if (cleared === 0) combo = 0;
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
  getSkin().drawBlock(context, x, y, colorIndex, size, alpha);
}

function drawGrid() {
  ctx.strokeStyle = getSkin().grid;
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
  ctx.fillStyle = getSkin().bg;
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
  nextCtx.fillStyle = getSkin().bg;
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
  overlayScore.textContent =
    `Puntuación: ${score.toLocaleString()}  |  Líneas: ${lines}  |  Combo: ${maxCombo}`;

  // Show game-over summary, hide plain restart button
  gameoverSummary.classList.remove('hidden');
  restartBtn.classList.add('hidden');

  // Pre-fill name from localStorage
  playerNameInput.value = localStorage.getItem('tetris.lastName') || '';

  // New record banner
  if (isNewRecord(score)) {
    newRecordBanner.classList.remove('hidden');
  } else {
    newRecordBanner.classList.add('hidden');
  }

  // Render table (no highlight yet — user hasn't saved)
  renderGameoverScores(null);

  overlay.classList.remove('hidden');
}

function togglePause() {
  if (!current) return;
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    pauseOverlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    pauseOverlay.classList.remove('hidden');
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
  level = startLevel;
  combo = 0;
  maxCombo = 0;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (startLevel - 1) * 90);
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

// ---- Button handlers ----

// Pause overlay — Reanudar
resumeBtn.addEventListener('click', () => {
  if (!paused) return;
  togglePause();
});

// Pause overlay — Reiniciar
pauseRestartBtn.addEventListener('click', init);

// Nivel inicial − / +
nivelDec.addEventListener('click', () => {
  startLevel = Math.max(1, startLevel - 1);
  nivelDisplay.textContent = startLevel;
  localStorage.setItem('tetris.startLevel', startLevel);
});

nivelInc.addEventListener('click', () => {
  startLevel = Math.min(15, startLevel + 1);
  nivelDisplay.textContent = startLevel;
  localStorage.setItem('tetris.startLevel', startLevel);
});

// Game-over overlay restart button
restartBtn.addEventListener('click', init);

// Save score and restart
saveBtn.addEventListener('click', () => {
  let name = playerNameInput.value.trim().slice(0, 12) || 'Anónimo';
  localStorage.setItem('tetris.lastName', name);
  const entry = { name, score, lines, combo: maxCombo };
  insertScore(entry);
  renderGameoverScores(entry);
  renderStartScores();
  init();
});

// Reset leaderboard
resetScoresBtn.addEventListener('click', () => {
  if (confirm('¿Borrar todos los récords?')) {
    localStorage.removeItem('tetris.scores');
    renderGameoverScores(null);
    renderStartScores();
  }
});

// Start screen
startBtn.addEventListener('click', () => {
  startOverlay.classList.add('hidden');
  init();
});

// ---- Keyboard ----

document.addEventListener('keydown', e => {
  if (!current) return;
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

// ---- Skin buttons ----
document.querySelectorAll('.skin-btn').forEach(btn => {
  btn.addEventListener('click', () => setSkin(btn.dataset.skin));
});

// ---- Startup: show start screen with current leaderboard ----
renderStartScores();
// Restore saved skin (before init so first draw uses correct skin)
setSkin(localStorage.getItem('tetris.skin') || 'retro');
// Do NOT call init() here — wait for startBtn click.

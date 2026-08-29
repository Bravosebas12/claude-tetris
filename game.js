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
  '#b0bec5', // 8 - wildcard (Tinte)
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

const POWERUP_LINE_INTERVAL = 5;      // cada cuántas líneas eliminadas se evalúa un power-up
const POWERUP_CHANCE = 0.35;          // probabilidad de que aparezca al llegar al intervalo
const POWERUP_FREEZE_DURATION = 5000; // ms que dura Congelar
const POWERUP_FLASH_DURATION = 300;   // ms del flash de activación
const POWERUP_BOMB_RADIUS = 1;        // radio 1 = área 3x3
const WILDCARD_COLOR_INDEX = 8;

const POWERUP_TYPES = {
  bomba:    { label: 'BOMBA',    glyph: 'bomb',      color: '#333333', accent: '#ff5252' },
  rayo:     { label: 'RAYO',     glyph: 'lightning', color: '#fff59d', accent: '#fbc02d' },
  tinte:    { label: 'TINTE',    glyph: 'drop',      color: '#ce93d8', accent: '#8e24aa' },
  gravedad: { label: 'GRAVEDAD', glyph: 'arrowDown', color: '#78909c', accent: '#37474f' },
  congelar: { label: 'CONGELAR', glyph: 'snowflake', color: '#80deea', accent: '#00acc1' },
};
const POWERUP_KEYS = Object.keys(POWERUP_TYPES);

const GRID_COLORS = { dark: '#22222e', light: '#dcdfec' };
const THEME_KEY = 'tetris-theme';

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

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let linesSincePowerup, freezeTimeoutId, frozenUntilDrop, activeFlash;
let theme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(forcePowerup) {
  if (forcePowerup) {
    const kind = POWERUP_KEYS[Math.floor(Math.random() * POWERUP_KEYS.length)];
    return { type: 0, shape: [[1]], x: Math.floor(COLS / 2), y: 0, powerup: kind };
  }
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
    linesSincePowerup += cleared;
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
  if (current.powerup) {
    applyPowerup(current.powerup, current.x, current.y);
  } else {
    merge();
  }
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  const rollPowerup = linesSincePowerup >= POWERUP_LINE_INTERVAL && Math.random() < POWERUP_CHANCE;
  if (linesSincePowerup >= POWERUP_LINE_INTERVAL) linesSincePowerup -= POWERUP_LINE_INTERVAL;
  next = randomPiece(rollPowerup);
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

const POWERUP_EFFECTS = {
  bomba: applyBomba,
  rayo: applyRayo,
  tinte: applyTinte,
  gravedad: applyGravedad,
  congelar: applyCongelar,
};

function applyPowerup(kind, x, y) {
  POWERUP_EFFECTS[kind](x, y);
  activeFlash = { untilTs: performance.now() + POWERUP_FLASH_DURATION, kind };
}

function applyBomba(x, y) {
  let destroyed = 0;
  for (let dr = -POWERUP_BOMB_RADIUS; dr <= POWERUP_BOMB_RADIUS; dr++) {
    for (let dc = -POWERUP_BOMB_RADIUS; dc <= POWERUP_BOMB_RADIUS; dc++) {
      const ny = y + dr, nx = x + dc;
      if (ny < 0 || ny >= ROWS || nx < 0 || nx >= COLS) continue;
      if (board[ny][nx]) {
        board[ny][nx] = 0;
        destroyed++;
      }
    }
  }
  score += destroyed * 10;
  updateHUD();
}

function applyRayo(x, y) {
  board.splice(y, 1);
  board.unshift(new Array(COLS).fill(0));

  for (let r = 0; r < ROWS; r++) {
    board[r][x] = 0;
  }

  lines += 1;
  score += (LINE_SCORES[1] || 0) * level;
  level = Math.floor(lines / 10) + 1;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  updateHUD();
}

function applyTinte() {
  const presentColors = new Set();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c] !== WILDCARD_COLOR_INDEX) presentColors.add(board[r][c]);

  if (presentColors.size === 0) return;

  const colorsArr = [...presentColors];
  const target = colorsArr[Math.floor(Math.random() * colorsArr.length)];

  let converted = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === target) { board[r][c] = WILDCARD_COLOR_INDEX; converted++; }

  score += converted * 5;
  updateHUD();
}

function applyGravedad() {
  for (let c = 0; c < COLS; c++) {
    const colValues = [];
    for (let r = 0; r < ROWS; r++) if (board[r][c]) colValues.push(board[r][c]);
    const gap = ROWS - colValues.length;
    for (let r = 0; r < ROWS; r++) board[r][c] = r < gap ? 0 : colValues[r - gap];
  }
  clearLines();
}

function applyCongelar() {
  if (freezeTimeoutId) clearTimeout(freezeTimeoutId);
  frozenUntilDrop = true;
  freezeTimeoutId = setTimeout(() => {
    frozenUntilDrop = false;
    freezeTimeoutId = null;
  }, POWERUP_FREEZE_DURATION);
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

function drawPowerupGlyph(context, x, y, size, glyph, color) {
  const cx = x * size + size / 2;
  const cy = y * size + size / 2;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;
  switch (glyph) {
    case 'bomb':
      context.beginPath();
      context.arc(cx, cy + size * 0.08, size * 0.22, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(cx + size * 0.1, cy - size * 0.14);
      context.lineTo(cx + size * 0.22, cy - size * 0.3);
      context.stroke();
      break;
    case 'lightning':
      context.beginPath();
      context.moveTo(cx + size * 0.08, cy - size * 0.32);
      context.lineTo(cx - size * 0.14, cy + size * 0.02);
      context.lineTo(cx + size * 0.04, cy + size * 0.02);
      context.lineTo(cx - size * 0.08, cy + size * 0.32);
      context.stroke();
      break;
    case 'drop':
      context.beginPath();
      context.moveTo(cx, cy - size * 0.3);
      context.quadraticCurveTo(cx + size * 0.22, cy + size * 0.08, cx, cy + size * 0.28);
      context.quadraticCurveTo(cx - size * 0.22, cy + size * 0.08, cx, cy - size * 0.3);
      context.stroke();
      break;
    case 'arrowDown':
      context.beginPath();
      context.moveTo(cx - size * 0.2, cy - size * 0.2);
      context.lineTo(cx, cy + size * 0.2);
      context.lineTo(cx + size * 0.2, cy - size * 0.2);
      context.stroke();
      break;
    case 'snowflake':
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI / 3) * i;
        const dx = Math.cos(angle) * size * 0.28;
        const dy = Math.sin(angle) * size * 0.28;
        context.beginPath();
        context.moveTo(cx - dx, cy - dy);
        context.lineTo(cx + dx, cy + dy);
        context.stroke();
      }
      break;
  }
}

function drawPowerupPiece(context, px, py, size, kind, ghost) {
  const cfg = POWERUP_TYPES[kind];
  context.globalAlpha = ghost ? 0.2 : 1;
  context.fillStyle = cfg.color;
  context.fillRect(px * size + 1, py * size + 1, size - 2, size - 2);
  if (!ghost) {
    context.strokeStyle = cfg.accent;
    context.lineWidth = 2;
    context.strokeRect(px * size + 2, py * size + 2, size - 4, size - 4);
    drawPowerupGlyph(context, px, py, size, cfg.glyph, cfg.accent);
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = GRID_COLORS[theme];
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
      if (current.shape[r][c]) {
        if (current.powerup) drawPowerupPiece(ctx, current.x + c, gy + r, BLOCK, current.powerup, true);
        else drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
      }

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) {
        if (current.powerup) drawPowerupPiece(ctx, current.x + c, current.y + r, BLOCK, current.powerup);
        else drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
      }

  if (activeFlash) {
    if (performance.now() > activeFlash.untilTs) {
      activeFlash = null;
    } else {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = POWERUP_TYPES[activeFlash.kind].accent;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  }
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        if (next.powerup) drawPowerupPiece(nextCtx, offX + c, offY + r, NB, next.powerup);
        else drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
      }
}

function endGame() {
  gameOver = true;
  if (freezeTimeoutId) { clearTimeout(freezeTimeoutId); freezeTimeoutId = null; }
  frozenUntilDrop = false;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function setTheme(newTheme) {
  theme = newTheme === 'light' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', theme);
  themeToggle.checked = theme === 'light';
  localStorage.setItem(THEME_KEY, theme);
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
  if (!frozenUntilDrop) {
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
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  setTheme(theme);
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  linesSincePowerup = 0;
  if (freezeTimeoutId) { clearTimeout(freezeTimeoutId); freezeTimeoutId = null; }
  frozenUntilDrop = false;
  activeFlash = null;
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
themeToggle.addEventListener('change', () => setTheme(themeToggle.checked ? 'light' : 'dark'));

init();

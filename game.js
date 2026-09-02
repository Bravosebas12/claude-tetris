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

// ---- Piezas especiales ----
const SPECIAL_EVERY_LINES = 3;   // aparece una pieza especial cada N líneas completadas
const ABILITY_BONUS = 50;        // puntos extra al activar una habilidad
const ABILITY_KEYS = ['bomba', 'rayo', 'tinte', 'gravedad', 'congelar'];
const FREEZE_MS = 5000;          // duración de la congelación
const ABILITY_INFO = {
  bomba:    { emoji: '💣', color: '#ff7043' },
  rayo:     { emoji: '⚡', color: '#4dd0e1' },
  tinte:    { emoji: '🎨', color: '#ba68c8' },
  gravedad: { emoji: '⬇️', color: '#81c784' },
  congelar: { emoji: '❄️', color: '#7986cb' },
};

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
const themeToggleBtn = document.getElementById('theme-toggle');
const specialEl = document.getElementById('special-countdown');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let linesAtLastSpecial, specialQueued, frozenUntil, effects, shakeUntil, shakeMag;

function applyTheme(isLight) {
  document.body.classList.toggle('light-theme', isLight);
  themeToggleBtn.textContent = isLight ? '☀️' : '🌙';
}

function initTheme() {
  const isLight = localStorage.getItem('theme') === 'light';
  applyTheme(isLight);
}

function toggleTheme() {
  const isLight = !document.body.classList.contains('light-theme');
  applyTheme(isLight);
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

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
  if (current.ability) return; // las piezas especiales (2×2) no rotan
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
    if (lines - linesAtLastSpecial >= SPECIAL_EVERY_LINES) {
      specialQueued = true;
      linesAtLastSpecial = lines;
    }
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
  const ability = current.ability;
  if (ability === 'bomba') {
    explodeBomb(current);
  } else {
    merge();
  }
  if (ability) {
    applyAbility(ability, current);
    score += ABILITY_BONUS;
  }
  clearLines();
  spawn();
}

// ---- Habilidades de las piezas especiales ----

function makeSpecial(piece) {
  const t = piece.type;
  piece.ability = ABILITY_KEYS[Math.floor(Math.random() * ABILITY_KEYS.length)];
  piece.shape = [[t, t], [t, t]];
  piece.x = Math.floor(COLS / 2) - 1;
  piece.y = 0;
}

// Centro (en celdas) de una pieza especial 2×2 ya fijada.
function specialCenter(piece) {
  return { c: piece.x, r: Math.min(ROWS - 1, piece.y + 1) };
}

function explodeBomb(piece) {
  const { c: cx, r: cy } = specialCenter(piece);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = cy + dr, c = cx + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
    }
  }
  effects.push({ kind: 'shock', t: 0, dur: 480, x: (cx + 0.5) * BLOCK, y: (cy + 0.5) * BLOCK });
  effects.push({ kind: 'flash', t: 0, dur: 260 });
  triggerShake(220, 7);
}

function applyAbility(ability, piece) {
  switch (ability) {
    case 'rayo':
      zapLine(piece);
      break;
    case 'tinte':
      tintBoard();
      break;
    case 'gravedad':
      applyGravity();
      effects.push({ kind: 'settle', t: 0, dur: 420 });
      triggerShake(180, 5);
      break;
    case 'congelar':
      frozenUntil = performance.now() + FREEZE_MS;
      effects.push({ kind: 'flash', t: 0, dur: 300, color: '160,210,255' });
      break;
  }
}

function zapLine(piece) {
  const { c: cx, r: cy } = specialCenter(piece);
  if (Math.random() < 0.5) {
    for (let c = 0; c < COLS; c++) board[cy][c] = 0;
    effects.push({ kind: 'beam', t: 0, dur: 380, orient: 'row', index: cy });
  } else {
    for (let r = 0; r < ROWS; r++) board[r][cx] = 0;
    effects.push({ kind: 'beam', t: 0, dur: 380, orient: 'col', index: cx });
  }
  effects.push({ kind: 'flash', t: 0, dur: 200 });
}

function tintBoard() {
  const counts = new Array(COLORS.length).fill(0);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c]) counts[board[r][c]]++;

  let best = 0;
  for (let i = 1; i < counts.length; i++)
    if (counts[i] > counts[best]) best = i;
  if (best === 0 || counts[best] === 0) return; // tablero sin bloques: no-op

  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === best) {
        cells.push({ r, c });
        board[r][c] = 0;
      }
    }
  }
  effects.push({ kind: 'dissolve', t: 0, dur: 650, cells });
}

function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c]) {
        board[write][c] = board[r][c];
        if (write !== r) board[r][c] = 0;
        write--;
      }
    }
    for (let r = write; r >= 0; r--) board[r][c] = 0;
  }
}

function triggerShake(ms, mag) {
  shakeUntil = performance.now() + ms;
  shakeMag = mag;
}

function spawn() {
  current = next;
  next = randomPiece();
  if (specialQueued) {
    makeSpecial(next);
    specialQueued = false;
  }
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
  if (specialEl) {
    specialEl.textContent = Math.max(0, SPECIAL_EVERY_LINES - (lines - linesAtLastSpecial));
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
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-line-color').trim();
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

function drawSpecialBlocks(context, x, y, cols, rows, size, ability) {
  const info = ABILITY_INFO[ability];
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
  // bloques en tono pizarra con halo de color de la habilidad
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = (x + c) * size + 1;
      const py = (y + r) * size + 1;
      context.save();
      context.shadowColor = info.color;
      context.shadowBlur = 6 + pulse * 12;
      context.fillStyle = '#2b2f3a';
      context.fillRect(px, py, size - 2, size - 2);
      context.restore();
      context.strokeStyle = info.color;
      context.lineWidth = 2;
      context.strokeRect(px + 1, py + 1, size - 4, size - 4);
    }
  }
  // emoji de habilidad centrado sobre el bloque
  context.save();
  context.globalAlpha = 0.85 + pulse * 0.15;
  context.font = `${Math.floor(size * cols * 0.7)}px serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(info.emoji, (x + cols / 2) * size, (y + rows / 2) * size + 2);
  context.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let sx = 0, sy = 0;
  if (performance.now() < shakeUntil) {
    sx = (Math.random() * 2 - 1) * shakeMag;
    sy = (Math.random() * 2 - 1) * shakeMag;
  }
  ctx.save();
  ctx.translate(sx, sy);

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
  if (current.ability) {
    drawSpecialBlocks(ctx, current.x, current.y, 2, 2, BLOCK, current.ability);
  } else {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  }

  drawEffects();

  ctx.restore();

  drawFrost();
}

function drawEffects() {
  const W = canvas.width, H = canvas.height;
  for (const e of effects) {
    const p = Math.min(1, e.t / e.dur);
    ctx.save();
    if (e.kind === 'flash') {
      ctx.fillStyle = `rgba(${e.color || '255,255,255'}, ${0.45 * (1 - p)})`;
      ctx.fillRect(0, 0, W, H);
    } else if (e.kind === 'shock') {
      const maxR = BLOCK * 4;
      ctx.globalAlpha = 1 - p;
      ctx.beginPath();
      ctx.arc(e.x, e.y, p * maxR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,180,80,1)';
      ctx.lineWidth = 7 * (1 - p);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(e.x, e.y, p * maxR * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,120,40,${0.35 * (1 - p)})`;
      ctx.fill();
    } else if (e.kind === 'beam') {
      ctx.globalAlpha = 1 - p;
      let grad;
      if (e.orient === 'row') {
        const y = e.index * BLOCK;
        grad = ctx.createLinearGradient(0, y, 0, y + BLOCK);
        grad.addColorStop(0, 'rgba(77,208,225,0)');
        grad.addColorStop(0.5, 'rgba(200,255,255,1)');
        grad.addColorStop(1, 'rgba(77,208,225,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, y - BLOCK * 0.3, W, BLOCK * 1.6);
      } else {
        const x = e.index * BLOCK;
        grad = ctx.createLinearGradient(x, 0, x + BLOCK, 0);
        grad.addColorStop(0, 'rgba(77,208,225,0)');
        grad.addColorStop(0.5, 'rgba(200,255,255,1)');
        grad.addColorStop(1, 'rgba(77,208,225,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - BLOCK * 0.3, 0, BLOCK * 1.6, H);
      }
    } else if (e.kind === 'dissolve') {
      for (const cell of e.cells) {
        const hue = (cell.c * 24 + cell.r * 12 + e.t * 0.6) % 360;
        const scale = 1 + 0.35 * p;
        const s = BLOCK * scale;
        const px = cell.c * BLOCK + BLOCK / 2 - s / 2;
        const py = cell.r * BLOCK + BLOCK / 2 - s / 2;
        ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${1 - p})`;
        ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
      }
    } else if (e.kind === 'settle') {
      ctx.fillStyle = `rgba(130,200,255,${0.25 * (1 - p)})`;
      for (let c = 0; c < COLS; c += 2) {
        const h = H * (0.4 + 0.6 * p);
        ctx.fillRect(c * BLOCK + BLOCK * 0.3, H - h, BLOCK * 0.4, h);
      }
    }
    ctx.restore();
  }
}

function drawFrost() {
  const now = performance.now();
  if (now >= frozenUntil) return;
  const W = canvas.width, H = canvas.height;
  ctx.save();
  ctx.fillStyle = 'rgba(120,180,255,0.12)';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(200,230,255,0.65)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);
  // copos a la deriva
  ctx.fillStyle = 'rgba(235,245,255,0.9)';
  for (let i = 0; i < 12; i++) {
    const fx = ((i * 97 + now * 0.02) % W);
    const fy = ((i * 53 + now * 0.05 + i * 40) % H);
    ctx.beginPath();
    ctx.arc(fx, fy, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  const remain = Math.ceil((frozenUntil - now) / 1000);
  ctx.fillStyle = 'rgba(230,245,255,0.95)';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`❄ CONGELADO  ${remain}s`, W / 2, 28);
  ctx.restore();
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  if (next.ability) {
    drawSpecialBlocks(nextCtx, offX, offY, 2, 2, NB, next.ability);
    return;
  }
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
  if (gameOver) return;
  const dt = ts - lastTime;
  lastTime = ts;

  for (const e of effects) e.t += dt;
  if (effects.length) effects = effects.filter(e => e.t < e.dur);

  const frozen = ts < frozenUntil;
  if (frozen) {
    dropAccum = 0;
  } else {
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
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  linesAtLastSpecial = 0;
  specialQueued = false;
  frozenUntil = 0;
  effects = [];
  shakeUntil = 0;
  shakeMag = 0;
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
  // durante la congelación se puede reposicionar, pero no forzar el descenso
  if (performance.now() < frozenUntil && (e.code === 'ArrowDown' || e.code === 'Space')) {
    if (e.code === 'Space') e.preventDefault();
    return;
  }
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
themeToggleBtn.addEventListener('click', toggleTheme);

initTheme();
init();

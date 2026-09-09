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
  '#00ffff', // BOMB - electric cyan
  '#ff2ad1', // N - tuerca (rosa eléctrico)
];

const BOMB = 8;
const NUT = 9;
const NUT_CHANCE = 0.04; // la tuerca es rara: ~1 de cada 25 piezas

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8]],                                       // BOMB - single block
  [[9,9,9],[9,0,9],[9,9,9]],                  // N - tuerca: anillo con hueco central
];

const REGULAR_TYPES = 7; // las 7 piezas clásicas; la tuerca se sortea aparte

const LINE_SCORES = [0, 100, 300, 500, 800];

// ---- THEME SYSTEM ----
const THEMES = {
  retro: {
    name: 'Retro',
    shadowBlur: 0,
    pattern: false,
    css: {
      '--bg-primary': '#0f0f17',
      '--bg-canvas': '#1a1a25',
      '--text-primary': '#e0e0e0',
      '--text-secondary': '#888',
      '--accent': '#7aa2f7',
      '--border': '#2a2a3a',
      '--grid-color': '#22222e',
      '--label-color': '#555570',
    }
  },
  neon: {
    name: 'Neon',
    shadowBlur: 15,
    pattern: false,
    css: {
      '--bg-primary': '#0a0a1a',
      '--bg-canvas': '#0f0f2a',
      '--text-primary': '#00ffff',
      '--text-secondary': '#00ff88',
      '--accent': '#ff00ff',
      '--border': '#00ffff',
      '--grid-color': '#00ff3344',
      '--label-color': '#00ff88',
    }
  },
  pastel: {
    name: 'Pastel',
    shadowBlur: 0,
    pattern: false,
    css: {
      '--bg-primary': '#faf5f0',
      '--bg-canvas': '#fff8f5',
      '--text-primary': '#5d6d7b',
      '--text-secondary': '#9db4c4',
      '--accent': '#ff9999',
      '--border': '#ffe0d4',
      '--grid-color': '#ffe8dd',
      '--label-color': '#c9a3a3',
    }
  },
  pixelart: {
    name: 'Pixel Art',
    shadowBlur: 0,
    pattern: true,
    css: {
      '--bg-primary': '#0f0f17',
      '--bg-canvas': '#1a1a25',
      '--text-primary': '#e0e0e0',
      '--text-secondary': '#888',
      '--accent': '#7aa2f7',
      '--border': '#2a2a3a',
      '--grid-color': '#22222e',
      '--label-color': '#555570',
    }
  }
};

let currentTheme = 'retro';

function applyTheme(themeKey) {
  if (!THEMES[themeKey]) return;
  currentTheme = themeKey;
  const theme = THEMES[themeKey];
  const root = document.documentElement;
  Object.entries(theme.css).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  localStorage.setItem('tetris_theme', themeKey);
  draw();
}

function adjustBrightness(hex, factor) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, Math.round((num >> 16) * (1 + factor))));
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 0x00FF) * (1 + factor))));
  const b = Math.max(0, Math.min(255, Math.round((num & 0x0000FF) * (1 + factor))));
  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

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

let board, holes, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function getBoardFullness() {
  let filled = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 0) filled++;
    }
  }
  return filled / (ROWS * COLS);
}

function createHoles() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
}

function randomType() {
  const fullness = getBoardFullness();

  // Bomb: 1% base → 15% cuando tablero ≥70% lleno
  const bombChance = Math.min(0.01 + (fullness * 0.20), 0.15);

  const roll = Math.random();

  if (roll < bombChance) return BOMB;
  if (Math.random() < NUT_CHANCE) return NUT;

  return Math.floor(Math.random() * REGULAR_TYPES) + 1;
}

function randomPiece() {
  const type = randomType();
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
  for (let r = 0; r < current.shape.length; r++) {
    const y = current.y + r;
    if (y < 0) continue; // la pieza puede asomar por encima del tablero
    for (let c = 0; c < current.shape[r].length; c++) {
      const x = current.x + c;
      const value = current.shape[r][c];
      if (value) {
        board[y][x] = value;
        holes[y][x] = false; // un bloque real tapa un hueco de tuerca previo
      } else if (current.type === NUT) {
        holes[y][x] = true; // en la tuerca el único 0 es el centro
      }
    }
  }
}

// Una fila cuenta como completa si sus únicas celdas vacías son huecos de tuerca.
function isRowComplete(r) {
  for (let c = 0; c < COLS; c++)
    if (!board[r][c] && !holes[r][c]) return false;
  return true;
}

function explodeBomb() {
  const centerX = current.x;
  const centerY = current.y;

  let cleared = 0;

  // Clear 3x3 area centered on bomb
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = centerX + dx;
      const ty = centerY + dy;

      if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS) {
        if (board[ty][tx] !== 0) cleared++;
        board[ty][tx] = 0;
      }
    }
  }

  score += cleared * 50;
  updateHUD();
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (isRowComplete(r)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      holes.splice(r, 1);
      holes.unshift(new Array(COLS).fill(false));
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
  const isBomb = (current.type === BOMB);

  merge();

  if (isBomb) {
    explodeBomb();
  }

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
  context.globalAlpha = alpha ?? 1;

  const theme = THEMES[currentTheme];

  if (colorIndex === BOMB) {
    // BOMB: radial gradient cyan→magenta
    const cx = x * size + size / 2;
    const cy = y * size + size / 2;
    const radius = (size - 2) / 2;

    const grad = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#00ffff');
    grad.addColorStop(0.8, '#ff00ff');
    grad.addColorStop(1, 'rgba(255,0,255,0.3)');

    context.fillStyle = grad;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  } else {
    // Standard block with theme effects
    const color = COLORS[colorIndex];

    // Neon glow effect
    if (theme.shadowBlur > 0) {
      context.shadowColor = color;
      context.shadowBlur = theme.shadowBlur;
    } else {
      context.shadowBlur = 0;
    }

    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    context.shadowBlur = 0;

    // Pixel art pattern effect
    if (theme.pattern) {
      const patternColor = adjustBrightness(color, -0.2);
      context.fillStyle = patternColor;
      for (let py = 0; py < 2; py++) {
        for (let px = 0; px < 2; px++) {
          if ((px + py) % 2 === 0) {
            context.fillRect(x * size + 1 + px * (size - 2) / 2, y * size + 1 + py * (size - 2) / 2, (size - 2) / 2, (size - 2) / 2);
          }
        }
      }
    } else {
      // highlight
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    }
  }

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

  if (gameOver) return; // no pintar pieza en curso tras el fin de partida

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
  if (gameOver) return;
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
  if (gameOver) return; // endGame ya canceló el rAF: no relanzarlo
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  holes = createHoles();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');

  // Load and apply saved theme
  const savedTheme = localStorage.getItem('tetris_theme') || 'retro';
  applyTheme(savedTheme);
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.value = currentTheme;
  }

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

document.getElementById('theme-select')?.addEventListener('change', e => {
  applyTheme(e.target.value);
});

init();

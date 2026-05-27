'use strict';

// ─── Constantes del tablero ───────────────────────────────────────────────────

/** Número de columnas del tablero */
const COLS = 10;
/** Número de filas del tablero */
const ROWS = 20;
/** Tamaño en píxeles de cada celda cuadrada */
const BLOCK = 30;

// ─── Paleta de colores ────────────────────────────────────────────────────────

/**
 * Colores de cada tipo de pieza.
 * El índice 0 es null (celda vacía); los índices 1–7 corresponden a las piezas I, O, T, S, Z, J, L.
 */
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

// ─── Definición de piezas ─────────────────────────────────────────────────────

/**
 * Matrices 2D que definen la forma de cada pieza (tetromino).
 * El valor en cada celda es el índice de color (0 = vacío).
 * Índice 0 es null; índices 1–7 son I, O, T, S, Z, J, L.
 */
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

// ─── Puntuación por líneas ────────────────────────────────────────────────────

/**
 * Puntos base según cuántas líneas se eliminan a la vez (antes de multiplicar por nivel).
 * Índice = nº de líneas: 0→0, 1→100, 2→300, 3→500, 4→800 (Tetris).
 */
const LINE_SCORES = [0, 100, 300, 500, 800];

// ─── Referencias al DOM ───────────────────────────────────────────────────────

/** Canvas principal donde se dibuja el tablero de juego (300×600 px) */
const canvas = document.getElementById('board');
/** Contexto 2D del canvas principal */
const ctx = canvas.getContext('2d');

/** Canvas pequeño para mostrar la siguiente pieza (120×120 px) */
const nextCanvas = document.getElementById('next-canvas');
/** Contexto 2D del canvas de siguiente pieza */
const nextCtx = nextCanvas.getContext('2d');

/** Elemento HTML que muestra la puntuación actual */
const scoreEl = document.getElementById('score');
/** Elemento HTML que muestra el total de líneas eliminadas */
const linesEl = document.getElementById('lines');
/** Elemento HTML que muestra el nivel actual */
const levelEl = document.getElementById('level');

/** Panel de superposición (overlay) para PAUSA y GAME OVER */
const overlay = document.getElementById('overlay');
/** Título del overlay: "PAUSA" o "GAME OVER" */
const overlayTitle = document.getElementById('overlay-title');
/** Texto secundario del overlay: muestra la puntuación al terminar */
const overlayScore = document.getElementById('overlay-score');
/** Botón de reinicio que aparece en el overlay */
const restartBtn = document.getElementById('restart-btn');

// ─── Estado global del juego ──────────────────────────────────────────────────

/**
 * @type {number[][]} board       - Matriz ROWS×COLS; 0 = vacío, 1–7 = índice de color de la pieza fijada.
 * @type {{type,shape,x,y}} current  - Pieza que el jugador controla ahora mismo.
 * @type {{type,shape,x,y}} next     - Siguiente pieza (se muestra en el canvas de preview).
 * @type {number} score           - Puntuación acumulada.
 * @type {number} lines           - Total de líneas eliminadas desde el inicio.
 * @type {number} level           - Nivel actual (sube 1 cada 10 líneas).
 * @type {boolean} paused         - Si el juego está en pausa.
 * @type {boolean} gameOver       - Si la partida ha terminado.
 * @type {number} lastTime        - Timestamp del último frame (ms); usado para calcular dt.
 * @type {number} dropAccum       - Acumulador de tiempo (ms) para saber cuándo bajar la pieza.
 * @type {number} dropInterval    - Ms entre cada caída automática; decrece con el nivel.
 * @type {number} animId          - ID del requestAnimationFrame activo; permite cancelarlo.
 */
let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

// ─── Inicialización del tablero ───────────────────────────────────────────────

/**
 * Crea y devuelve un tablero vacío (matriz ROWS×COLS rellena de ceros).
 * @returns {number[][]}
 */
function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

// ─── Generación de piezas ─────────────────────────────────────────────────────

/**
 * Genera una pieza aleatoria y la coloca centrada en la parte superior del tablero.
 * @returns {{type: number, shape: number[][], x: number, y: number}}
 */
function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]); // copia profunda para no mutar PIECES
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

// ─── Detección de colisiones ──────────────────────────────────────────────────

/**
 * Comprueba si la forma `shape` colocada en (ox, oy) colisiona con los bordes o con piezas fijadas.
 * @param {number[][]} shape - Matriz de la pieza a comprobar.
 * @param {number} ox        - Columna de origen (esquina superior izquierda de la shape).
 * @param {number} oy        - Fila de origen.
 * @returns {boolean} true si hay colisión.
 */
function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue; // celda vacía, ignorar
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true; // fuera de límites
      if (ny >= 0 && board[ny][nx]) return true;           // choca con pieza fijada
    }
  }
  return false;
}

// ─── Rotación ─────────────────────────────────────────────────────────────────

/**
 * Rota una matriz 90° en sentido horario.
 * Algoritmo: transponer + invertir columnas → nueva fila c = columna invertida de la original.
 * @param {number[][]} shape
 * @returns {number[][]} Nueva matriz rotada.
 */
function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

/**
 * Intenta rotar la pieza activa en sentido horario aplicando wall kicks.
 * Prueba desplazamientos [0, -1, +1, -2, +2] en X hasta encontrar una posición sin colisión.
 * Si ninguna funciona, la rotación se cancela (sin cambio de estado).
 */
function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2]; // desplazamientos horizontales a probar
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

// ─── Fijar pieza en el tablero ────────────────────────────────────────────────

/**
 * Copia las celdas de la pieza activa (`current`) al tablero (`board`).
 * Después de esto la pieza queda "fijada" y deja de moverse.
 */
function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

// ─── Eliminación de líneas ────────────────────────────────────────────────────

/**
 * Recorre el tablero de abajo hacia arriba buscando filas completas.
 * Por cada fila completa: la elimina (splice), inserta una fila vacía arriba (unshift),
 * actualiza puntuación, líneas totales, nivel y velocidad de caída.
 */
function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);                       // elimina la fila completa
      board.unshift(new Array(COLS).fill(0));   // añade fila vacía arriba
      cleared++;
      r++; // re-comprueba la misma fila (ahora ocupa una nueva)
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level; // puntos × nivel
    level = Math.floor(lines / 10) + 1;           // sube nivel cada 10 líneas
    dropInterval = Math.max(100, 1000 - (level - 1) * 90); // velocidad máx 100 ms
    updateHUD();
  }
}

// ─── Pieza fantasma (ghost) ───────────────────────────────────────────────────

/**
 * Calcula la fila Y más baja a la que puede llegar la pieza activa sin colisionar.
 * Se usa para dibujar el "ghost" (silueta semitransparente que indica dónde caerá).
 * @returns {number} Fila Y de la posición final.
 */
function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

// ─── Movimientos del jugador ──────────────────────────────────────────────────

/**
 * Hard drop: baja la pieza instantáneamente hasta el fondo y la fija.
 * Suma 2 puntos por cada fila recorrida.
 */
function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2; // bonus por distancia caída
  current.y = gy;
  lockPiece();
}

/**
 * Soft drop: baja la pieza una fila manualmente (tecla ↓).
 * Si puede bajar, suma 1 punto. Si no, fija la pieza.
 */
function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

// ─── Ciclo de vida de una pieza ───────────────────────────────────────────────

/**
 * Fija la pieza activa en el tablero, elimina líneas completas y genera la siguiente pieza.
 */
function lockPiece() {
  merge();
  clearLines();
  spawn();
}

/**
 * Pone en juego la siguiente pieza: `next` pasa a ser `current` y se genera un nuevo `next`.
 * Si la nueva pieza colisiona al aparecer → fin del juego.
 * Actualiza el canvas de preview.
 */
function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame(); // la pieza no cabe → tablero lleno
  }
  drawNext();
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

/**
 * Actualiza los elementos del HUD (score, lines, level) con los valores actuales.
 */
function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

// ─── Renderizado ──────────────────────────────────────────────────────────────

/**
 * Dibuja un bloque individual en el canvas dado.
 * El bloque tiene un pequeño margen de 1px y un brillo en el borde superior.
 * @param {CanvasRenderingContext2D} context - Contexto donde dibujar.
 * @param {number} x           - Columna (en unidades de celdas).
 * @param {number} y           - Fila (en unidades de celdas).
 * @param {number} colorIndex  - Índice en COLORS (0 = no dibuja nada).
 * @param {number} size        - Tamaño en píxeles de la celda.
 * @param {number} [alpha=1]   - Opacidad (0–1); se usa 0.2 para el ghost.
 */
function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return; // celda vacía
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // franja de brillo en el borde superior del bloque
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

/**
 * Dibuja las líneas de cuadrícula sobre el canvas principal.
 */
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

/**
 * Frame de renderizado principal. Limpia el canvas y dibuja en orden:
 * 1. Cuadrícula
 * 2. Piezas fijadas en el tablero
 * 3. Ghost (silueta donde caerá la pieza)
 * 4. Pieza activa
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // 1. Tablero: piezas ya fijadas
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // 2. Ghost: silueta semitransparente en la posición de aterrizaje
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // 3. Pieza activa
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

/**
 * Dibuja la siguiente pieza centrada en el canvas de preview (nextCanvas).
 * Usa un tamaño de bloque fijo de 30px y centra la forma en una cuadrícula 4×4.
 */
function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2); // offset para centrar horizontalmente
  const offY = Math.floor((4 - shape.length) / 2);     // offset para centrar verticalmente
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

// ─── Control del juego ────────────────────────────────────────────────────────

/**
 * Termina la partida: cancela el loop de animación y muestra el overlay de GAME OVER
 * con la puntuación final.
 */
function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

/**
 * Alterna el estado de pausa.
 * - Al pausar: cancela el rAF y muestra el overlay de PAUSA.
 * - Al reanudar: reinicia `lastTime` y vuelve a lanzar el loop.
 * No hace nada si el juego ya terminó.
 */
function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now(); // evita un dt enorme tras la pausa
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

// ─── Game loop ────────────────────────────────────────────────────────────────

/**
 * Bucle principal del juego, llamado por requestAnimationFrame cada frame.
 * Acumula el tiempo transcurrido (`dropAccum`); cuando supera `dropInterval`
 * baja la pieza una fila (o la fija si no puede bajar). Luego dibuja el frame.
 * @param {DOMHighResTimeStamp} ts - Timestamp del frame actual (ms).
 */
function loop(ts) {
  const dt = ts - lastTime; // tiempo desde el frame anterior
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++; // bajar pieza automáticamente
    } else {
      lockPiece(); // no puede bajar más → fijar
    }
  }
  draw();
  animId = requestAnimationFrame(loop); // programa el siguiente frame
}

// ─── Inicialización / Reinicio ────────────────────────────────────────────────

/**
 * Inicializa (o reinicia) toda la partida: crea tablero limpio, resetea variables,
 * genera las dos primeras piezas y arranca el loop de animación.
 */
function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000; // 1 segundo entre caídas en nivel 1
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();        // convierte `next` en `current` y genera nuevo `next`
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId); // por si había un loop previo activo
  animId = requestAnimationFrame(loop);
}

// ─── Controles de teclado ─────────────────────────────────────────────────────

/**
 * Escucha pulsaciones de tecla:
 * - P            → pausar / reanudar
 * - ← / →        → mover pieza izquierda / derecha
 * - ↓            → soft drop (bajar una fila con punto extra)
 * - ↑ / X        → rotar en sentido horario
 * - Espacio      → hard drop (caída instantánea)
 */
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
      e.preventDefault(); // evita scroll de página
      hardDrop();
      break;
  }
  updateHUD();
});

// ─── Arranque ─────────────────────────────────────────────────────────────────

restartBtn.addEventListener('click', init);

init(); // arranca el juego al cargar la página

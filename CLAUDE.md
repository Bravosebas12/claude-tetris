# CLAUDE.md

Guía Claude Code repo.

## Proyecto

Tetris vanilla JS. Sin deps, sin build, sin frameworks. Corre en navegador, HTML5 Canvas + CSS. Abrir `index.html` o server local.

Stack: HTML5 (Canvas 2D), CSS3 (Flexbox, backdrop-filter), JS ES6+.

## Correr

Directo:
```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

Server local (recomendado):
```bash
python3 -m http.server 8000
npx serve .
php -S localhost:8000
```
Visitar `http://localhost:8000`.

## Arquitectura

3 archivos integrados.

### `index.html`
- 2 `<canvas>`: board (300×600px), preview next-piece (120×120px)
- Sidebar: score/lines/level, controles
- Modal overlay PAUSE / GAME OVER
- Sin scaffolding framework, markup mínimo

### `style.css`
- Dark theme: `#0f0f17` fondo (arcade)
- Flexbox layout dos columnas
- Fuente monospace scores/labels
- `backdrop-filter: blur(4px)` en modals
- Colores hardcoded, no variables CSS (simplicidad intencional)

### `game.js` (~305 líneas) — lógica completa

**Board**: `board` array 2D (`ROWS`×`COLS`), celda `0` vacía o `1–7` color pieza. `ROWS=20`, `COLS=10`, `BLOCK=30`px.

**Piezas**: `PIECES` array 7 shapes (matriz 2D, ID 1–7 como valores). `randomPiece()` spawnea centrado, shape copia fresca. `current` = pieza cayendo `{type, shape, x, y}`. `next` = preview. Rotación: `rotateCW()` transpone+invierte; `tryRotate()` wall kicks, offsets `[0,-1,1,-2,2]`.

**Colisión**: `collide(shape, ox, oy)` — choca bordes o bloques fijos. Usado en movimiento, rotación, ghost.

**Loop**: `loop(ts)` via `requestAnimationFrame`. Acumula `dt` en `dropAccum` hasta `>= dropInterval`. `draw()` cada frame. Al aterrizar: `lockPiece()` → `merge()` → `clearLines()` → `spawn()`.

**Líneas/Score**: `clearLines()` escanea abajo→arriba, borra filas llenas, inserta blancas arriba. Score clásico: `LINE_SCORES[clearedCount] * level` (0/100/300/500/800). Hard drop +2pt/celda, soft drop +1pt/fila. Nivel +1 cada 10 líneas; velocidad `max(100, 1000-(level-1)*90)` ms.

**Dibujo**: `draw()` limpia canvas, grid, bloques board, ghost (20% opacidad), pieza cayendo. `drawBlock(ctx,x,y,colorIndex,size,alpha)` rellena+highlight. `drawNext()` renderiza next en canvas separado, centrado área 4×4. Ghost via `ghostY()`: proyecta pieza hacia abajo hasta colisión.

**Input**: flechas mover; Arriba/X rotar; Abajo soft drop (+1pt); Espacio hard drop (+2pt/celda); P pausa; botón restart llama `init()`.

**Estado**: flags `paused`, `gameOver`. Game over: overlay, cancela animation frame, permite restart. Pausa: overlay, cancela frame, `lastTime` reset al resumir.

## Patrones clave

**Constantes** (top `game.js`): `COLS`,`ROWS`,`BLOCK` (dims — actualizar canvas width/height en HTML si cambian); `COLORS[1–7]` hex por pieza; `PIECES[1–7]` matrices; `LINE_SCORES` puntos 1-4 líneas.

**Canvas**: ambos 2D context, sin WebGL. Board: `ctx.clearRect()` cada frame. Preview: centrado via `offX`/`offY`. Sin issues pixel-perfect, antialiasing del navegador.

**Estado**: todo en `let` module-scope, no encapsulado en objeto — lógica flat.

**Rotación**: wall kicks críticos jugabilidad. 5 offsets `[0,-1,1,-2,2]` tras rotar, primero sin colisión gana. Base SRS.

## Tareas comunes

**Nueva pieza**: matriz 4×4 en `PIECES` (índice 0–7); color hex en `COLORS` (índice 0–7); ajustar spawn-logic si cambia probabilidad.

**Velocidad juego**: fórmula `dropInterval` en `clearLines()`:
```javascript
dropInterval = Math.max(100, 1000 - (level - 1) * 90);
```
Valores menores = caída más rápida. Mínimo 100ms.

**Dimensiones board**: actualizar `COLS`/`ROWS` Y canvas `width`/`height` en `index.html`:
```html
<canvas id="board" width="COLS * BLOCK" height="ROWS * BLOCK"></canvas>
```

**Testing**: sin suite formal. Manual en navegador:
1. `python3 -m http.server 8000`
2. Abrir `http://localhost:8000`
3. Verificar: movimiento, rotación, wall kicks, clears, scoring, niveles, pausa

**Debug**: DevTools (F12). Sin build/transpile, stack traces 1:1 a source. `console.log()` imprime en consola DevTools.

## Estructura archivos

```
claude-tetris/
├── index.html       # DOM, dos canvas, modal overlay
├── style.css         # Dark theme, flexbox, backdrop blur
├── game.js           # Lógica completa (~305 líneas)
├── README.md         # Doc usuario (español)
└── CLAUDE.md         # Este archivo
```

## Notas futuras

- Sin build: cambios efecto inmediato al refrescar
- Sin testing framework; agregar test files si hace falta, no corren solos
- Solo Canvas 2D; performance excelente board 10×20
- Accesibilidad: control solo teclado, sin mouse
- i18n: texto/UI español (configurable en HTML/CSS)

# CLAUDE.md

Guía para Claude Code en este repositorio.

## Comandos

HTML/JS puro, sin build/lint/tests ni `package.json`.

- Ejecutar: abrir `index.html` en el navegador, o `npx serve .` → `http://localhost:3000`.

## Arquitectura

Juego completo en `game.js` (script clásico, sin módulos), cargado por `index.html` sobre `<canvas id="board">` 300×600 (10×20 celdas de 30px) más un `<canvas id="next-canvas">` para la vista previa. Arranca con `init()` + `requestAnimationFrame(loop)`.

- **Bucle** (`loop`): acumula `dt` en `dropAccum`; al superar `dropInterval` baja la pieza una fila o llama a `lockPiece()`.
- **Tablero**: matriz `ROWS × COLS`, cada celda `0` (vacía) o índice de color 1–7.
- **Piezas** (`PIECES`): matrices cuadradas fijas; rotación vía `rotateCW` (transposición + reverso de filas) y wall kicks en `tryRotate` (prueba desplazamientos `[0,-1,1,-2,2]`).
- **Colisiones** (`collide`): límites del tablero + solape con celdas ya fijadas.
- **Ghost piece** (`ghostY`): proyecta la caída final de la pieza actual, se dibuja con alpha 0.2.
- **Puntuación/nivel**: `LINE_SCORES` `[0,100,300,500,800]` × nivel; nivel sube cada 10 líneas (`clearLines`); velocidad = `max(100, 1000 − (nivel−1)×90)` ms.
- **Estado global mutable**: `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`.
- **Input**: `keydown` global — flechas mover/rotar/soft-drop, Espacio hard-drop, `P` pausa; ignorado si `paused` o `gameOver`.

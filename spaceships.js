'use strict';

// Fondo animado con naves espaciales que sobrevuelan el tablero de Tetris.
// Independiente de la lógica del juego (game.js): dibuja sobre su propio canvas.

const spaceCanvas = document.getElementById('space-bg');
const spaceCtx = spaceCanvas.getContext('2d');

const SHIP_COLORS = ['#7aa2f7', '#e57373', '#81c784', '#ffd54f', '#ba68c8', '#4dd0e1'];

let ships = [];
let spaceAnimId;

function resizeSpaceCanvas() {
  spaceCanvas.width = window.innerWidth;
  spaceCanvas.height = window.innerHeight;
}

function randomShip() {
  const size = 14 + Math.random() * 16;
  const fromLeft = Math.random() < 0.5;
  return {
    x: fromLeft ? -size * 2 : window.innerWidth + size * 2,
    y: Math.random() * window.innerHeight,
    size,
    speed: (0.4 + Math.random() * 1.2) * (fromLeft ? 1 : -1),
    color: SHIP_COLORS[Math.floor(Math.random() * SHIP_COLORS.length)],
    bobPhase: Math.random() * Math.PI * 2,
    bobSpeed: 0.01 + Math.random() * 0.02,
    flickerPhase: Math.random() * Math.PI * 2,
  };
}

function initShips(count) {
  ships = Array.from({ length: count }, randomShip);
  // Reparte la posición inicial en pantalla en lugar de fuera de ella,
  // para que ya haya naves visibles al cargar.
  ships.forEach(ship => {
    ship.x = Math.random() * window.innerWidth;
  });
}

function drawShip(ship) {
  const { size, color } = ship;
  const facingRight = ship.speed > 0;

  spaceCtx.save();
  spaceCtx.translate(ship.x, ship.y);
  if (!facingRight) spaceCtx.scale(-1, 1);

  // Estela
  const glow = spaceCtx.createLinearGradient(-size * 1.8, 0, 0, 0);
  glow.addColorStop(0, 'rgba(255,255,255,0)');
  glow.addColorStop(1, 'rgba(255,255,255,0.25)');
  spaceCtx.fillStyle = glow;
  spaceCtx.fillRect(-size * 1.8, -size * 0.08, size * 1.8, size * 0.16);

  // Cuerpo de la nave (triángulo estilizado)
  spaceCtx.beginPath();
  spaceCtx.moveTo(size * 0.9, 0);
  spaceCtx.lineTo(-size * 0.6, -size * 0.4);
  spaceCtx.lineTo(-size * 0.3, 0);
  spaceCtx.lineTo(-size * 0.6, size * 0.4);
  spaceCtx.closePath();
  spaceCtx.fillStyle = color;
  spaceCtx.fill();

  // Cabina
  spaceCtx.beginPath();
  spaceCtx.arc(size * 0.1, 0, size * 0.16, 0, Math.PI * 2);
  spaceCtx.fillStyle = 'rgba(255,255,255,0.8)';
  spaceCtx.fill();

  // Luz de motor parpadeante
  const flicker = 0.5 + 0.5 * Math.sin(ship.flickerPhase);
  spaceCtx.beginPath();
  spaceCtx.arc(-size * 0.55, 0, size * 0.12 * flicker, 0, Math.PI * 2);
  spaceCtx.fillStyle = 'rgba(255, 180, 80, 0.9)';
  spaceCtx.fill();

  spaceCtx.restore();
}

function updateShip(ship) {
  ship.x += ship.speed;
  ship.bobPhase += ship.bobSpeed;
  ship.flickerPhase += 0.15;
  ship.y += Math.sin(ship.bobPhase) * 0.3;

  const margin = ship.size * 3;
  if (ship.speed > 0 && ship.x - margin > window.innerWidth) {
    Object.assign(ship, randomShip(), { x: -margin, speed: Math.abs(ship.speed) });
  } else if (ship.speed < 0 && ship.x + margin < 0) {
    Object.assign(ship, randomShip(), { x: window.innerWidth + margin, speed: -Math.abs(ship.speed) });
  }
}

function spaceLoop() {
  spaceCtx.clearRect(0, 0, spaceCanvas.width, spaceCanvas.height);
  for (const ship of ships) {
    updateShip(ship);
    drawShip(ship);
  }
  spaceAnimId = requestAnimationFrame(spaceLoop);
}

function initSpaceBackground() {
  resizeSpaceCanvas();
  initShips(6);
  cancelAnimationFrame(spaceAnimId);
  spaceLoop();
}

window.addEventListener('resize', resizeSpaceCanvas);

initSpaceBackground();

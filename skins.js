'use strict';

// Visual skins registry for the Tetris board.
// Each skin defines its own 13-entry color palette (index 0 = null, matching
// the shape of the classic COLORS array in game.js), its own grid/board
// background colors, and its own block-drawing routine with the exact same
// signature as the original drawBlock(context, x, y, colorIndex, size, alpha).

(function () {
  // ---- Retro: identical to the original hard-coded look ----
  const retroColors = [
    null,
    '#4dd0e1', // I - cyan
    '#ffd54f', // O - yellow
    '#ba68c8', // T - purple
    '#81c784', // S - green
    '#e57373', // Z - red
    '#90caf9', // J - pale blue
    '#ffb74d', // L - orange
    '#f06292', // + pentominó - rosa
    '#4db6ac', // U pentominó - verde azulado
    '#dce775', // Y pentominó - lima
    '#ffffff', // 1x1 single - blanco
    '#90a4ae', // 3x3 hueca - gris
  ];

  function retroDraw(context, x, y, colorIndex, size, alpha) {
    const color = retroColors[colorIndex];
    context.globalAlpha = alpha ?? 1;
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    // highlight
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    context.globalAlpha = 1;
  }

  // ---- Neon: saturated palette + glow, on a black board ----
  const neonColors = [
    null,
    '#00e5ff', // I
    '#ffee00', // O
    '#e040fb', // T
    '#00ff6a', // S
    '#ff1744', // Z
    '#2979ff', // J
    '#ff9100', // L
    '#ff4081', // + pentominó
    '#1de9b6', // U pentominó
    '#eeff41', // Y pentominó
    '#ffffff', // single
    '#b0bec5', // hollow
  ];

  function neonDraw(context, x, y, colorIndex, size, alpha) {
    const color = neonColors[colorIndex];
    context.globalAlpha = alpha ?? 1;
    context.shadowColor = color;
    context.shadowBlur = 12;
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    // reset the glow immediately so it never bleeds into later draws
    // (grid lines, next-piece canvas) in the same frame.
    context.shadowBlur = 0;
    context.shadowColor = 'transparent';
    context.fillStyle = 'rgba(255,255,255,0.18)';
    context.fillRect(x * size + 1, y * size + 1, size - 2, 3);
    context.globalAlpha = 1;
  }

  // ---- Pastel: soft/muted palette + rounded corners ----
  const pastelColors = [
    null,
    '#a8e6ea', // I
    '#fff2b3', // O
    '#d9b8e8', // T
    '#bfe3c0', // S
    '#f3b3b0', // Z
    '#bcdcf5', // J
    '#ffd9ad', // L
    '#f7c6d9', // + pentominó
    '#b3ddd6', // U pentominó
    '#eef0b8', // Y pentominó
    '#fafafa', // single
    '#cfd8dc', // hollow
  ];

  function pastelDraw(context, x, y, colorIndex, size, alpha) {
    const color = pastelColors[colorIndex];
    context.globalAlpha = alpha ?? 1;
    const px = x * size + 1;
    const py = y * size + 1;
    const s = size - 2;
    const radius = Math.min(6, s / 4);
    context.fillStyle = color;
    if (context.roundRect) {
      context.beginPath();
      context.roundRect(px, py, s, s, radius);
      context.fill();
    } else {
      context.fillRect(px, py, s, s);
    }
    context.fillStyle = 'rgba(255,255,255,0.28)';
    const hs = Math.min(4, s);
    if (context.roundRect) {
      context.beginPath();
      context.roundRect(px, py, s, hs, [radius, radius, 0, 0]);
      context.fill();
    } else {
      context.fillRect(px, py, s, hs);
    }
    context.globalAlpha = 1;
  }

  // ---- Pixel art: flat palette + checker-dither texture ----
  const pixelColors = [
    null,
    '#26c6da',
    '#fdd835',
    '#ab47bc',
    '#66bb6a',
    '#ef5350',
    '#42a5f5',
    '#ffa726',
    '#ec407a',
    '#26a69a',
    '#d4e157',
    '#ffffff',
    '#78909c',
  ];

  function pixelDraw(context, x, y, colorIndex, size, alpha) {
    const color = pixelColors[colorIndex];
    context.globalAlpha = alpha ?? 1;
    const px = x * size + 1;
    const py = y * size + 1;
    const s = size - 2;
    const half = s / 2;
    context.fillStyle = color;
    context.fillRect(px, py, s, s);
    // 2x2 checker dither for a pixel-art texture
    context.fillStyle = 'rgba(0,0,0,0.15)';
    context.fillRect(px, py, half, half);
    context.fillRect(px + half, py + half, s - half, s - half);
    context.fillStyle = 'rgba(255,255,255,0.15)';
    context.fillRect(px + half, py, s - half, half);
    context.fillRect(px, py + half, half, s - half);
    context.globalAlpha = 1;
  }

  window.SKINS = [
    {
      id: 'retro',
      label: 'Retro',
      colors: retroColors,
      gridColor: null, // null => defer to the current light/dark theme's grid color
      boardBg: null,    // null => defer to the CSS --board-bg variable
      draw: retroDraw,
    },
    {
      id: 'neon',
      label: 'Neon',
      colors: neonColors,
      gridColor: '#0a2a2e',
      boardBg: '#000000',
      draw: neonDraw,
    },
    {
      id: 'pastel',
      label: 'Pastel',
      colors: pastelColors,
      gridColor: '#e0d4e8',
      boardBg: '#fbeee6',
      draw: pastelDraw,
    },
    {
      id: 'pixel',
      label: 'Pixel art',
      colors: pixelColors,
      gridColor: '#33364a',
      boardBg: '#20232a',
      draw: pixelDraw,
    },
  ];
})();

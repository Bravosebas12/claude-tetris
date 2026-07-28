'use strict';

// Contract consumed by game.js:
//   Skins.drawBlock(context, x, y, colorIndex, size, alpha)
//   Skins.drawBackground(context, width, height)
//   Skins.init()
//
// game.js calls these on every frame; keep them fast and side-effect free
// beyond the given canvas context.

const Skins = (() => {
  const retro = {
    id: 'retro',
    label: 'Retro',
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#90caf9', // J - pale blue
      '#ffb74d', // L - orange
      '#9e9e9e', // N - tuerca (gris metálico)
    ],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = this.colors[colorIndex];
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    },
    drawBackground() {},
  };

  let current = retro;

  function drawBlock(context, x, y, colorIndex, size, alpha) {
    current.drawBlock(context, x, y, colorIndex, size, alpha);
  }

  function drawBackground(context, width, height) {
    current.drawBackground(context, width, height);
  }

  function init() {
    // Foundation stub: only 'retro' is registered. Future skins register
    // themselves here and populate #skin-selector.
  }

  return { drawBlock, drawBackground, init };
})();

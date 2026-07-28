'use strict';

const Skins = (() => {
  function clamp(v) {
    return Math.max(0, Math.min(255, v));
  }

  function shadeColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const r = clamp(((num >> 16) & 0xff) + Math.round(2.55 * percent));
    const g = clamp(((num >> 8) & 0xff) + Math.round(2.55 * percent));
    const b = clamp((num & 0xff) + Math.round(2.55 * percent));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function traceRoundedRect(context, x, y, w, h, r) {
    if (typeof context.roundRect === 'function') {
      context.beginPath();
      context.roundRect(x, y, w, h, r);
      return;
    }
    // Manual fallback for engines without CanvasRenderingContext2D.roundRect
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

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

  const neon = {
    id: 'neon',
    label: 'Neon',
    colors: [
      null,
      '#00e5ff', // I
      '#ffee00', // O
      '#e040fb', // T
      '#00ff85', // S
      '#ff1744', // Z
      '#2979ff', // J
      '#ff9100', // L
      '#b0bec5', // N
    ],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      context.globalAlpha = alpha ?? 1;
      context.shadowBlur = 12;
      context.shadowColor = color;
      context.fillStyle = color;
      context.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
      // Canvas shadow state persists across draw calls; reset immediately so
      // it doesn't bleed into grid lines or the next block drawn afterwards.
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      context.strokeStyle = 'rgba(255,255,255,0.45)';
      context.lineWidth = 1;
      context.strokeRect(x * size + 2.5, y * size + 2.5, size - 5, size - 5);
      context.globalAlpha = 1;
    },
    drawBackground(context, width, height) {
      context.fillStyle = '#050507';
      context.fillRect(0, 0, width, height);
    },
  };

  const pastel = {
    id: 'pastel',
    label: 'Pastel',
    colors: [
      null,
      '#a7d8de', // I
      '#f5e6a8', // O
      '#d8b4e2', // T
      '#b8e0c2', // S
      '#f0b8b8', // Z
      '#b8cbe8', // J
      '#f2cfa0', // L
      '#cfd3d6', // N
    ],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      context.globalAlpha = alpha ?? 1;
      const px = x * size + 2;
      const py = y * size + 2;
      const w = size - 4;
      const h = size - 4;
      const radius = Math.max(2, size * 0.18);
      traceRoundedRect(context, px, py, w, h, radius);
      context.fillStyle = this.colors[colorIndex];
      context.fill();
      traceRoundedRect(context, px, py, w, h * 0.4, Math.max(2, size * 0.14));
      context.fillStyle = 'rgba(255,255,255,0.4)';
      context.fill();
      context.globalAlpha = 1;
    },
    drawBackground(context, width, height) {
      context.fillStyle = '#faf7f2';
      context.fillRect(0, 0, width, height);
    },
  };

  const pixelArt = {
    id: 'pixel',
    label: 'Pixel Art',
    colors: [
      null,
      '#4dd0e1', // I
      '#ffd54f', // O
      '#ba68c8', // T
      '#81c784', // S
      '#e57373', // Z
      '#90caf9', // J
      '#ffb74d', // L
      '#9e9e9e', // N
    ],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      context.globalAlpha = alpha ?? 1;
      const color = this.colors[colorIndex];
      const dark = shadeColor(color, -28);
      const px = x * size + 1;
      const py = y * size + 1;
      const w = size - 2;
      const h = size - 2;
      context.fillStyle = color;
      context.fillRect(px, py, w, h);
      const cell = Math.max(2, Math.floor(w / 4));
      context.fillStyle = dark;
      for (let ry = 0; ry < h; ry += cell) {
        for (let rx = 0; rx < w; rx += cell) {
          if (((rx / cell) + (ry / cell)) % 2 === 0) {
            context.fillRect(px + rx, py + ry, Math.min(cell, w - rx), Math.min(cell, h - ry));
          }
        }
      }
      context.strokeStyle = 'rgba(0,0,0,0.35)';
      context.lineWidth = 1;
      context.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
      context.globalAlpha = 1;
    },
    drawBackground() {},
  };

  const registry = {};
  [retro, neon, pastel, pixelArt].forEach(skin => { registry[skin.id] = skin; });

  let current = retro;

  function drawBlock(context, x, y, colorIndex, size, alpha) {
    current.drawBlock(context, x, y, colorIndex, size, alpha);
  }

  function drawBackground(context, width, height) {
    current.drawBackground(context, width, height);
  }

  function triggerRedraw() {
    if (window.Game && typeof window.Game.redraw === 'function') {
      window.Game.redraw();
      return;
    }
    // Foundation fallback: game.js exposes these as top-level script globals.
    if (typeof window.draw === 'function') window.draw();
    if (typeof window.drawNext === 'function') window.drawNext();
  }

  function applyBodyClass(skin) {
    Array.from(document.body.classList)
      .filter(c => c.startsWith('skin-'))
      .forEach(c => document.body.classList.remove(c));
    document.body.classList.add(`skin-${skin.id}`);
  }

  function updateSelectorUI() {
    document.querySelectorAll('.skin-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.skinId === current.id);
    });
  }

  function applySkin(id) {
    const skin = registry[id] || retro;
    current = skin;
    applyBodyClass(skin);
    localStorage.setItem('tetris-skin', skin.id);
    updateSelectorUI();
    triggerRedraw();
  }

  function ensureStylesheet() {
    if (document.querySelector('link[href="skins.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'skins.css';
    document.head.appendChild(link);
  }

  function buildSelector() {
    let container = document.getElementById('skin-selector');
    if (!container) {
      container = document.createElement('div');
      container.id = 'skin-selector';
      container.className = 'panel-section';
      const panel = document.querySelector('aside.panel');
      if (panel) {
        const controls = panel.querySelector('.controls');
        if (controls) panel.insertBefore(container, controls);
        else panel.appendChild(container);
      }
    }

    container.innerHTML = '';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = 'SKIN';
    container.appendChild(label);

    const row = document.createElement('div');
    row.className = 'skin-options';
    Object.values(registry).forEach(skin => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'skin-btn';
      btn.textContent = skin.label;
      btn.dataset.skinId = skin.id;
      if (skin.id === current.id) btn.classList.add('active');
      btn.addEventListener('click', () => applySkin(skin.id));
      row.appendChild(btn);
    });
    container.appendChild(row);
  }

  function init() {
    ensureStylesheet();
    const saved = localStorage.getItem('tetris-skin');
    current = (saved && registry[saved]) ? registry[saved] : retro;
    applyBodyClass(current);
    buildSelector();
  }

  return { drawBlock, drawBackground, init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Skins.init);
} else {
  Skins.init();
}

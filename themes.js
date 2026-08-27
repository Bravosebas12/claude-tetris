'use strict';

// Cache the default rendering functions before any overrides
const DEFAULT_DRAW_BLOCK = drawBlock;
const DEFAULT_DRAW_GRID = drawGrid;

// Theme definitions
const THEMES = [
  {
    name: 'Retro',
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#7986cb', // J - indigo
      '#ffb74d', // L - orange
    ],
    drawBlock: undefined,
    drawGrid: undefined,
    cssClass: 'theme-retro',
  },
  {
    name: 'Neon',
    colors: [
      null,
      '#00ffff', // I - cyan
      '#ffff00', // O - yellow
      '#ff00ff', // T - magenta
      '#00ff00', // S - green
      '#ff0000', // Z - red
      '#0099ff', // J - blue
      '#ffaa00', // L - orange
    ],
    drawBlock: function(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = COLORS[colorIndex];
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 15;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.shadowColor = 'transparent';
      context.globalAlpha = 1;
    },
    drawGrid: function() {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
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
    },
    cssClass: 'theme-neon',
  },
  {
    name: 'Pastel',
    colors: [
      null,
      '#b8e6f0', // I - light cyan
      '#fff4b3', // O - light yellow
      '#e8c4f0', // T - light purple
      '#c8f0d8', // S - light green
      '#f0b3b3', // Z - light red
      '#d8c4f0', // J - light indigo
      '#f0d8b3', // L - light orange
    ],
    drawBlock: undefined,
    drawGrid: undefined,
    cssClass: 'theme-pastel',
  },
  {
    name: 'Pixel art',
    colors: [
      null,
      '#0088ff', // I - blue
      '#ffff00', // O - yellow
      '#9900ff', // T - purple
      '#00ff00', // S - green
      '#ff0000', // Z - red
      '#0088ff', // J - blue
      '#ff8800', // L - orange
    ],
    drawBlock: function(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = COLORS[colorIndex];
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      // Checkerboard texture pattern
      context.fillStyle = 'rgba(255, 255, 255, 0.1)';
      const step = 4;
      for (let px = x * size + 1; px < (x + 1) * size - 1; px += step) {
        for (let py = y * size + 1; py < (y + 1) * size - 1; py += step) {
          if (((px - (x * size + 1)) / step + (py - (y * size + 1)) / step) % 2 === 0) {
            context.fillRect(px, py, step, step);
          }
        }
      }
      context.globalAlpha = 1;
    },
    drawGrid: undefined,
    cssClass: 'theme-pixel',
  },
];

// Theme management
let currentTheme = null;

function getThemeByName(name) {
  return THEMES.find(t => t.name === name);
}

function applyTheme(theme) {
  if (!theme) return;

  currentTheme = theme;

  // Update global COLORS
  COLORS = theme.colors;

  // Update rendering functions
  if (theme.drawBlock) {
    drawBlock = theme.drawBlock;
  } else {
    drawBlock = DEFAULT_DRAW_BLOCK;
  }

  if (theme.drawGrid) {
    drawGrid = theme.drawGrid;
  } else {
    drawGrid = DEFAULT_DRAW_GRID;
  }

  // Update CSS class
  if (theme.cssClass) {
    document.documentElement.dataset.theme = theme.cssClass.replace('theme-', '');
  }

  // Persist to localStorage
  try {
    localStorage.setItem('tetris-theme', theme.name);
  } catch (e) {
    // localStorage unavailable (private browsing, quota exceeded, etc.)
    console.warn('Unable to save theme preference:', e.message);
  }

  // Update active button
  updateActiveThemeButton();
}

function renderThemeButtons() {
  const themePanel = document.getElementById('theme-panel');
  if (!themePanel) return;

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Tema:';
  themePanel.appendChild(label);

  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'theme-buttons';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.flexDirection = 'column';
  buttonContainer.style.gap = '6px';

  THEMES.forEach(theme => {
    const btn = document.createElement('button');
    btn.className = 'btn theme-btn';
    btn.dataset.theme = theme.name;
    btn.textContent = theme.name;
    btn.addEventListener('click', () => applyTheme(theme));
    buttonContainer.appendChild(btn);
  });

  themePanel.appendChild(buttonContainer);
}

function updateActiveThemeButton() {
  const buttons = document.querySelectorAll('.theme-btn');
  buttons.forEach(btn => {
    if (btn.dataset.theme === currentTheme.name) {
      btn.classList.add('theme-active');
    } else {
      btn.classList.remove('theme-active');
    }
  });
}

function loadTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem('tetris-theme');
  } catch (e) {
    // localStorage unavailable (private browsing, quota exceeded, etc.)
    console.warn('Unable to load theme preference:', e.message);
  }

  let theme = null;

  if (savedTheme) {
    theme = getThemeByName(savedTheme);
  }

  if (!theme) {
    theme = getThemeByName('Retro');
  }

  applyTheme(theme);
}

// Initialize on page load
function initializeThemes() {
  renderThemeButtons();
  loadTheme();
}

// Check if DOM is already loaded, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeThemes);
} else {
  // DOM already loaded, initialize immediately
  initializeThemes();
}

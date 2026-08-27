'use strict';

// DOM elements (lazy initialization to avoid DOMContentLoaded race)
let pauseOverlayEl, pauseBoxEl, pauseTitleEl, pauseMenuEl, levelSelectEl, controlsViewEl;

// State for controls visibility
let controlsVisible = false;

// Define onPauseChange immediately so game.js can call it without race conditions
// eslint-disable-next-line no-unused-vars
function onPauseChange(isPaused) {
  // Initialize DOM elements on first call if not already done
  if (!pauseOverlayEl) {
    pauseOverlayEl = document.getElementById('pause-overlay');
    if (!pauseOverlayEl) return; // Abort if element not found
    pauseBoxEl = pauseOverlayEl.querySelector('.overlay-box');
  }

  if (isPaused) {
    // Ensure menu is built before showing
    if (!pauseMenuEl) buildPauseMenu();
    // Show pause overlay
    if (pauseOverlayEl) pauseOverlayEl.classList.remove('hidden');
    // Reset controls visibility
    controlsVisible = false;
    if (controlsViewEl) controlsViewEl.classList.add('hidden');
    // Update level select to current starting level
    if (levelSelectEl) levelSelectEl.value = startingLevel;
  } else {
    // Hide pause overlay
    if (pauseOverlayEl) pauseOverlayEl.classList.add('hidden');
  }
}

// Build pause menu structure (lazy, called on first pause)
function buildPauseMenu() {
  if (pauseMenuEl) return; // Already built

  // Create title
  pauseTitleEl = document.createElement('p');
  pauseTitleEl.textContent = 'PAUSA';
  pauseTitleEl.id = 'pause-title';

  // Create menu container
  pauseMenuEl = document.createElement('div');
  pauseMenuEl.className = 'pause-menu';

  // Button: Reanudar (Resume)
  const reanudarBtn = document.createElement('button');
  reanudarBtn.className = 'btn';
  reanudarBtn.textContent = 'Reanudar';
  reanudarBtn.addEventListener('click', togglePause);
  pauseMenuEl.appendChild(reanudarBtn);

  // Button: Reiniciar (Restart)
  const reiniciarBtn = document.createElement('button');
  reiniciarBtn.className = 'btn';
  reiniciarBtn.textContent = 'Reiniciar';
  reiniciarBtn.addEventListener('click', () => {
    init(startingLevel);
    // init() calls onPauseChange(false), which hides the overlay
  });
  pauseMenuEl.appendChild(reiniciarBtn);

  // Button: Ver controles (Show Controls)
  const verControlesBtn = document.createElement('button');
  verControlesBtn.className = 'btn';
  verControlesBtn.textContent = 'Ver controles';
  verControlesBtn.addEventListener('click', toggleControls);
  pauseMenuEl.appendChild(verControlesBtn);

  // Level selector section
  const levelSectionEl = document.createElement('div');
  levelSectionEl.className = 'level-select-section';

  const levelLabelEl = document.createElement('label');
  levelLabelEl.htmlFor = 'level-select';
  levelLabelEl.textContent = 'Nivel inicial: ';
  levelLabelEl.className = 'level-label';

  levelSelectEl = document.createElement('select');
  levelSelectEl.id = 'level-select';
  levelSelectEl.className = 'level-select';
  for (let i = 1; i <= 10; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    levelSelectEl.appendChild(option);
  }
  levelSelectEl.value = startingLevel;
  levelSelectEl.addEventListener('change', (e) => {
    startingLevel = parseInt(e.target.value, 10);
  });

  levelSectionEl.appendChild(levelLabelEl);
  levelSectionEl.appendChild(levelSelectEl);
  pauseMenuEl.appendChild(levelSectionEl);

  // Create controls view (hidden by default)
  controlsViewEl = document.createElement('div');
  controlsViewEl.className = 'controls-view hidden';
  controlsViewEl.innerHTML = `
    <div class="controls-list">
      <ul>
        <li><kbd>←</kbd><kbd>→</kbd> mover</li>
        <li><kbd>↑</kbd> rotar</li>
        <li><kbd>↓</kbd> bajar</li>
        <li><kbd>Space</kbd> caída</li>
        <li><kbd>P</kbd>/<kbd>Escape</kbd> pausa</li>
      </ul>
    </div>
  `;
  pauseMenuEl.appendChild(controlsViewEl);

  // Append menu to overlay box
  pauseBoxEl.appendChild(pauseTitleEl);
  pauseBoxEl.appendChild(pauseMenuEl);
}

// Toggle controls visibility
function toggleControls() {
  controlsVisible = !controlsVisible;
  if (controlsVisible) {
    controlsViewEl.classList.remove('hidden');
  } else {
    controlsViewEl.classList.add('hidden');
  }
}

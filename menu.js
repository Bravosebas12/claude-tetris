'use strict';

const Menu = (() => {
  const STORAGE_KEY = 'tetris-start-level';
  const LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

  let pauseMenuEl = null;
  let controlsPanelEl = null;
  let menuButtons = [];
  const levelSelectors = [];
  let focusIndex = 0;

  function readStoredLevel() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = parseInt(raw, 10);
    return Number.isInteger(n) && n >= 1 && n <= 10 ? n : 1;
  }

  function syncLevelSelector(container, n) {
    container.querySelectorAll('.menu-level-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.level) === n);
    });
  }

  function syncAllSelectors(n) {
    levelSelectors.forEach(sel => syncLevelSelector(sel, n));
  }

  function setStartLevel(n) {
    if (typeof Game !== 'undefined') Game.startLevel = n;
    localStorage.setItem(STORAGE_KEY, String(n));
    syncAllSelectors(n);
  }

  function buildLevelSelector() {
    const wrap = document.createElement('div');
    wrap.className = 'menu-level-selector';

    const label = document.createElement('span');
    label.className = 'menu-level-label';
    label.textContent = 'NIVEL INICIAL';
    wrap.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'menu-level-grid';
    LEVELS.forEach(n => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'menu-level-btn';
      btn.textContent = String(n);
      btn.dataset.level = String(n);
      btn.addEventListener('click', () => setStartLevel(n));
      grid.appendChild(btn);
    });
    wrap.appendChild(grid);

    levelSelectors.push(wrap);
    return wrap;
  }

  function buildControlsPanel() {
    const panel = document.createElement('div');
    panel.className = 'menu-controls-panel hidden';
    const ul = document.createElement('ul');
    const items = [
      ['←', '→ mover'],
      ['↑ / X', 'rotar'],
      ['↓', 'bajar'],
      ['Space', 'caída'],
      ['P / Esc', 'pausa'],
    ];
    items.forEach(([key, desc]) => {
      const li = document.createElement('li');
      const kbd = document.createElement('kbd');
      kbd.textContent = key;
      li.appendChild(kbd);
      li.appendChild(document.createTextNode(' ' + desc));
      ul.appendChild(li);
    });
    panel.appendChild(ul);
    return panel;
  }

  function getMountPoint(id, fallbackParentSelector) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      const parent = document.querySelector(fallbackParentSelector) || document.body;
      parent.appendChild(el);
    }
    return el;
  }

  function focusButton(idx) {
    if (!menuButtons.length) return;
    focusIndex = ((idx % menuButtons.length) + menuButtons.length) % menuButtons.length;
    menuButtons[focusIndex].focus();
  }

  function handleMenuKeydown(e) {
    if (!pauseMenuEl || pauseMenuEl.classList.contains('hidden')) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        e.stopPropagation();
        focusButton(focusIndex + 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        focusButton(focusIndex - 1);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
      default:
        break;
    }
  }

  function init() {
    pauseMenuEl = getMountPoint('pause-menu', '.wrapper');
    pauseMenuEl.classList.add('overlay', 'hidden');
    pauseMenuEl.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'overlay-box menu-box';

    const title = document.createElement('p');
    title.className = 'menu-title';
    title.textContent = 'PAUSA';
    box.appendChild(title);

    const resumeBtn = document.createElement('button');
    resumeBtn.type = 'button';
    resumeBtn.className = 'menu-btn';
    resumeBtn.textContent = 'Reanudar';
    resumeBtn.addEventListener('click', () => close());
    box.appendChild(resumeBtn);

    const restartBtn = document.createElement('button');
    restartBtn.type = 'button';
    restartBtn.className = 'menu-btn';
    restartBtn.textContent = 'Reiniciar';
    restartBtn.addEventListener('click', () => {
      if (typeof Game !== 'undefined') Game.start(Game.startLevel);
      close();
    });
    box.appendChild(restartBtn);

    const controlsToggleBtn = document.createElement('button');
    controlsToggleBtn.type = 'button';
    controlsToggleBtn.className = 'menu-btn';
    controlsToggleBtn.textContent = 'Ver controles';
    box.appendChild(controlsToggleBtn);

    controlsPanelEl = buildControlsPanel();
    controlsToggleBtn.addEventListener('click', () => {
      controlsPanelEl.classList.toggle('hidden');
    });
    box.appendChild(controlsPanelEl);

    box.appendChild(buildLevelSelector());

    pauseMenuEl.appendChild(box);

    menuButtons = [resumeBtn, restartBtn, controlsToggleBtn];

    const startSlot = getMountPoint('start-level-slot', '.wrapper');
    startSlot.innerHTML = '';
    startSlot.appendChild(buildLevelSelector());

    const storedLevel = readStoredLevel();
    if (typeof Game !== 'undefined') Game.startLevel = storedLevel;
    syncAllSelectors(storedLevel);

    if (typeof Game !== 'undefined') {
      Game.onPauseRequested = open;
    }

    document.addEventListener('keydown', handleMenuKeydown, true);
  }

  function open() {
    if (typeof Game !== 'undefined') Game.inputsBlocked = true;
    const currentLevel = typeof Game !== 'undefined' ? Game.startLevel : readStoredLevel();
    syncAllSelectors(currentLevel);
    controlsPanelEl.classList.add('hidden');
    pauseMenuEl.classList.remove('hidden');
    focusIndex = 0;
    focusButton(0);
  }

  function close() {
    pauseMenuEl.classList.add('hidden');
    if (typeof Game !== 'undefined') {
      Game.inputsBlocked = false;
      Game.resume();
    }
  }

  return { init, open, close };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Menu.init);
} else {
  Menu.init();
}

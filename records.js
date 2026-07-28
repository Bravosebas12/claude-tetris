'use strict';

// Contract consumed by game.js:
//   Records.init()               — called once at startup
//   Records.onGameOver(stats)    — called by endGame() with Game.stats()

const Records = (() => {
  const STORAGE_KEY = 'tetris-records';
  const MAX_ENTRIES = 5;
  const NAME_MAX_LEN = 12;

  let state = { top: [], bestCombo: 0, maxLines: 0 };

  function emptyState() {
    return { top: [], bestCombo: 0, maxLines: 0 };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyState();
      const top = Array.isArray(parsed.top) ? parsed.top : [];
      const cleanTop = top
        .filter(e => e && typeof e === 'object' && typeof e.score === 'number')
        .map(e => ({
          name: typeof e.name === 'string' && e.name ? e.name.slice(0, NAME_MAX_LEN) : 'ANON',
          score: Number(e.score) || 0,
          lines: Number(e.lines) || 0,
          level: Number(e.level) || 1,
          date: typeof e.date === 'string' ? e.date : new Date().toISOString(),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_ENTRIES);
      return {
        top: cleanTop,
        bestCombo: Number(parsed.bestCombo) > 0 ? Number(parsed.bestCombo) : 0,
        maxLines: Number(parsed.maxLines) > 0 ? Number(parsed.maxLines) : 0,
      };
    } catch (e) {
      return emptyState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Storage unavailable (private mode, quota, etc.) — fail silently.
    }
  }

  function qualifies(score) {
    if (state.top.length < MAX_ENTRIES) return true;
    return score > state.top[state.top.length - 1].score;
  }

  function buildStatsLines(container) {
    const stats = document.createElement('div');
    stats.className = 'records-stats';

    const combo = document.createElement('p');
    combo.className = 'records-stat';
    combo.textContent = `Mejor combo: ${state.bestCombo}`;

    const maxLines = document.createElement('p');
    maxLines.className = 'records-stat';
    maxLines.textContent = `Líneas máximas: ${state.maxLines}`;

    stats.appendChild(combo);
    stats.appendChild(maxLines);
    container.appendChild(stats);
  }

  function buildTable(container, highlightEntry) {
    if (!state.top.length) {
      const empty = document.createElement('p');
      empty.className = 'records-empty';
      empty.textContent = 'Sin records todavía';
      container.appendChild(empty);
      return;
    }

    const list = document.createElement('ol');
    list.className = 'records-table';

    state.top.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'records-row';
      if (
        highlightEntry &&
        entry.name === highlightEntry.name &&
        entry.score === highlightEntry.score &&
        entry.date === highlightEntry.date
      ) {
        item.classList.add('record-new');
      }

      const name = document.createElement('span');
      name.className = 'records-name';
      name.textContent = entry.name;

      const score = document.createElement('span');
      score.className = 'records-score';
      score.textContent = entry.score.toLocaleString();

      const meta = document.createElement('span');
      meta.className = 'records-meta';
      meta.textContent = `L${entry.level} · ${entry.lines} líneas`;

      item.appendChild(name);
      item.appendChild(score);
      item.appendChild(meta);
      list.appendChild(item);
    });

    container.appendChild(list);
  }

  function renderInto(containerId, highlightEntry) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    buildTable(container, highlightEntry);
    buildStatsLines(container);
  }

  function renderAll(highlightEntry) {
    renderInto('records-list', highlightEntry);
    renderInto('gameover-records', highlightEntry);
  }

  function renderNameEntry(stats) {
    const container = document.getElementById('gameover-name');
    if (!container) return;
    container.innerHTML = '';

    const form = document.createElement('div');
    form.className = 'records-name-form';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'records-name-input';
    input.placeholder = 'ANON';
    input.maxLength = NAME_MAX_LEN;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'records-save-btn';
    button.textContent = 'Guardar';

    button.addEventListener('click', () => {
      const raw = input.value.trim().slice(0, NAME_MAX_LEN);
      const name = raw || 'ANON';
      const entry = {
        name,
        score: stats.score,
        lines: stats.lines,
        level: stats.level,
        date: new Date().toISOString(),
      };
      state.top.push(entry);
      state.top.sort((a, b) => b.score - a.score);
      state.top = state.top.slice(0, MAX_ENTRIES);
      save();
      container.innerHTML = '';
      renderAll(entry);
    });

    form.appendChild(input);
    form.appendChild(button);
    container.appendChild(form);
  }

  function clearNameEntry() {
    const container = document.getElementById('gameover-name');
    if (container) container.innerHTML = '';
  }

  function onGameOver(stats) {
    state.bestCombo = Math.max(state.bestCombo, stats.maxCombo || 0);
    state.maxLines = Math.max(state.maxLines, stats.lines || 0);
    save();

    if (qualifies(stats.score)) {
      renderNameEntry(stats);
    } else {
      clearNameEntry();
    }
    renderInto('gameover-records', null);
    renderInto('records-list', null);
  }

  function resetRecords() {
    if (!confirm('¿Seguro que quieres borrar todos los records?')) return;
    state = emptyState();
    save();
    clearNameEntry();
    renderAll(null);
  }

  function addResetButton() {
    const startBox = document.getElementById('records-list');
    if (!startBox || !startBox.parentElement) return;
    if (document.getElementById('records-reset-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'records-reset-btn';
    btn.type = 'button';
    btn.className = 'records-reset-btn';
    btn.textContent = 'Resetear records';
    btn.addEventListener('click', resetRecords);
    startBox.parentElement.appendChild(btn);
  }

  function init() {
    state = load();
    renderAll(null);
    addResetButton();
    if (typeof Game !== 'undefined') {
      Game.onGameOver = onGameOver;
    }
  }

  return { init, onGameOver };
})();

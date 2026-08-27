'use strict';

// localStorage keys
const SCORES_KEY = 'tetris-highscores';
const BEST_COMBO_KEY = 'tetris-best-combo';
const MAX_LINES_KEY = 'tetris-max-lines';
const MAX_SCORES = 5;

// DOM elements
let highScorePanelEl = null;
let highScoreSlotEl = null;

// Current score being entered (for highlighting)
let justAddedScore = null;

/**
 * Load high scores from localStorage
 * @returns {Array} Array of {name, score, lines, combo} objects
 */
function loadHighScores() {
  const data = localStorage.getItem(SCORES_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Save a new score to the high scores list
 * @param {string} name - Player name
 * @param {Object} stats - {score, lines, level, maxCombo}
 */
function saveHighScore(name, stats) {
  const scores = loadHighScores();

  // Create new entry
  const newEntry = {
    name: name.trim(),
    score: stats.score,
    lines: stats.lines,
    combo: stats.maxCombo,
  };

  // Add to list and sort by score descending
  scores.push(newEntry);
  scores.sort((a, b) => b.score - a.score);

  // Keep only top 5
  const topScores = scores.slice(0, MAX_SCORES);

  // Save to localStorage
  localStorage.setItem(SCORES_KEY, JSON.stringify(topScores));

  // Update best combo
  const bestCombo = parseInt(localStorage.getItem(BEST_COMBO_KEY)) || 0;
  if (stats.maxCombo > bestCombo) {
    localStorage.setItem(BEST_COMBO_KEY, stats.maxCombo);
  }

  // Update max lines
  const maxLines = parseInt(localStorage.getItem(MAX_LINES_KEY)) || 0;
  if (stats.lines > maxLines) {
    localStorage.setItem(MAX_LINES_KEY, stats.lines);
  }

  // Mark this score for highlighting
  justAddedScore = newEntry.score;

  // Re-render sidebar
  renderHighScores();
}

/**
 * Check if a score qualifies for top 5
 * @param {number} score - Score to check
 * @returns {boolean} True if score qualifies
 */
function isScoreQualifying(score) {
  const scores = loadHighScores();
  if (scores.length < MAX_SCORES) return true;
  return score > scores[scores.length - 1].score;
}

/**
 * Render high scores in the sidebar
 */
function renderHighScores() {
  if (!highScorePanelEl) {
    highScorePanelEl = document.getElementById('high-score-panel');
  }

  if (!highScorePanelEl) return;

  const scores = loadHighScores();
  const bestCombo = localStorage.getItem(BEST_COMBO_KEY);
  const maxLines = localStorage.getItem(MAX_LINES_KEY);

  let html = '';
  html += '<span class="label">TOP 5</span>';

  if (scores.length === 0) {
    html += '<div class="high-score-empty">No hay registros</div>';
  } else {
    html += '<table class="high-score-table">';
    html += '<thead><tr><th>#</th><th>Nombre</th><th>Puntos</th></tr></thead>';
    html += '<tbody>';

    scores.forEach((entry, index) => {
      const isNew = justAddedScore && entry.score === justAddedScore;
      const rowClass = isNew ? ' class="high-score-entry high-score-new"' : ' class="high-score-entry"';
      const scoreStr = entry.score != null ? entry.score.toLocaleString() : '0';
      html += `<tr${rowClass}>`;
      html += `<td class="rank">${index + 1}</td>`;
      html += `<td class="name">${entry.name}</td>`;
      html += `<td class="score">${scoreStr}</td>`;
      html += `</tr>`;
    });

    html += '</tbody>';
    html += '</table>';

    // Stats below table
    html += '<div class="high-score-stats">';
    if (bestCombo) {
      html += `<div class="stat-line">Mejor Combo: ${bestCombo}</div>`;
    }
    if (maxLines) {
      html += `<div class="stat-line">Líneas Máximas: ${maxLines}</div>`;
    }
    html += '</div>';
  }

  // Reset button
  html += '<button class="btn high-score-reset-btn">Resetear records</button>';

  highScorePanelEl.innerHTML = html;

  // Attach reset button handler
  const resetBtn = highScorePanelEl.querySelector('.high-score-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetHighScores);
  }

  // Clear the "just added" marker after rendering
  justAddedScore = null;
}

/**
 * Render high score table in the game-over overlay
 * @param {Array} scores - Array of {name, score, lines, combo}
 */
function renderHighScoreTable(scores) {
  if (!highScoreSlotEl) {
    highScoreSlotEl = document.getElementById('high-score-slot');
  }

  if (!highScoreSlotEl) return;

  if (scores.length === 0) {
    highScoreSlotEl.innerHTML = '';
    return;
  }

  let html = '';
  html += '<div class="high-score-overlay-table">';
  html += '<span class="label">MEJORES PUNTUACIONES</span>';
  html += '<table class="high-score-table">';
  html += '<tbody>';

  scores.forEach((entry, index) => {
    const isNew = justAddedScore && entry.score === justAddedScore;
    const rowClass = isNew ? ' class="high-score-entry high-score-new"' : ' class="high-score-entry"';
    const scoreStr = entry.score != null ? entry.score.toLocaleString() : '0';
    html += `<tr${rowClass}>`;
    html += `<td class="rank">${index + 1}</td>`;
    html += `<td class="name">${entry.name}</td>`;
    html += `<td class="score">${scoreStr}</td>`;
    html += `</tr>`;
  });

  html += '</tbody>';
  html += '</table>';
  html += '</div>';

  highScoreSlotEl.innerHTML = html;
}

/**
 * Render high score form in the game-over overlay
 * @param {Object} stats - {score, lines, level, maxCombo}
 */
function renderHighScoreForm(stats) {
  if (!highScoreSlotEl) {
    highScoreSlotEl = document.getElementById('high-score-slot');
  }

  if (!highScoreSlotEl) return;

  // Show name input form
  let html = '';
  html += '<div class="high-score-form">';
  html += '<label class="high-score-label">Tu nombre</label>';
  html += '<input type="text" class="high-score-input" placeholder="Tu nombre" maxlength="20" />';
  html += '<button class="btn high-score-submit-btn">Guardar</button>';
  html += '</div>';

  highScoreSlotEl.innerHTML = html;

  // Focus input and attach handlers
  const inputEl = highScoreSlotEl.querySelector('.high-score-input');
  const submitBtn = highScoreSlotEl.querySelector('.high-score-submit-btn');

  inputEl.focus();

  const handleSubmit = () => {
    const name = inputEl.value.trim();
    if (!name) {
      alert('Por favor ingresa tu nombre');
      return;
    }

    // Save the score
    saveHighScore(name, stats);

    // Render the table after save
    setTimeout(() => {
      const topScores = loadHighScores();
      renderHighScoreTable(topScores);
    }, 0);
  };

  submitBtn.addEventListener('click', handleSubmit);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });
}

/**
 * Render high score form or table in the game-over overlay
 * @param {Object} stats - {score, lines, level, maxCombo}
 */
function renderHighScoreSlot(stats) {
  if (!highScoreSlotEl) {
    highScoreSlotEl = document.getElementById('high-score-slot');
  }

  if (!isScoreQualifying(stats.score)) {
    highScoreSlotEl.innerHTML = '<p class="high-score-no-qualify">Tu puntuación no está en el top 5</p>';
    return;
  }

  // Show name input form
  renderHighScoreForm(stats);
}

/**
 * Handle game over event (called by game.js)
 * @param {Object} stats - {score, lines, level, maxCombo}
 */
function onGameOver(stats) {
  renderHighScoreSlot(stats);
}

/**
 * Reset all high scores
 */
function resetHighScores() {
  if (!confirm('¿Estás seguro de que quieres resetear todos los registros?')) {
    return;
  }

  localStorage.removeItem(SCORES_KEY);
  localStorage.removeItem(BEST_COMBO_KEY);
  localStorage.removeItem(MAX_LINES_KEY);

  justAddedScore = null;

  // Re-render both displays
  renderHighScores();

  const highScoreSlotEl = document.getElementById('high-score-slot');
  if (highScoreSlotEl) {
    highScoreSlotEl.innerHTML = '';
  }
}

/**
 * Initialize high scores on page load
 */
function initHighScores() {
  highScorePanelEl = document.getElementById('high-score-panel');
  highScoreSlotEl = document.getElementById('high-score-slot');

  renderHighScores();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHighScores);
} else {
  initHighScores();
}

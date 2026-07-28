'use strict';

// Contract consumed by game.js:
//   Menu.init()   — called once at startup
//   Menu.open()   — assign to Game.onPauseRequested to take over the pause UI
//   Menu.close()  — hide the menu and resume the game
//
// When Game.onPauseRequested is left unset (as in this stub), game.js falls
// back to its own minimal pause overlay.

const Menu = (() => {
  function init() {
    // Foundation stub: no pause menu UI yet.
  }

  function open() {}
  function close() {}

  return { init, open, close };
})();

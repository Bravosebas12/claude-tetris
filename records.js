'use strict';

// Contract consumed by game.js:
//   Records.init()               — called once at startup
//   Records.onGameOver(stats)    — called by endGame() with Game.stats()

const Records = (() => {
  function init() {
    // Foundation stub: no persistence or rendering yet.
  }

  function onGameOver() {
    // Foundation stub.
  }

  return { init, onGameOver };
})();

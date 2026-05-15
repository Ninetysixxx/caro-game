// main.js — bootstrap, wire modules, mode toggle, localStorage (Phase 5)

import { createGame, BOARD_SIZE } from './game.js';
import { pickMove } from './ai.js';
import { renderBoard, updateStatus } from './ui.js';

function bootstrap() {
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status-bar');

  const game = createGame();
  renderBoard(boardEl);
  updateStatus(statusEl, `Lượt: ${game.currentPlayer}`);

  // Smoke check that modules wire up without throwing.
  void pickMove(game);
  console.info(`[caro] scaffold ready — board ${BOARD_SIZE}x${BOARD_SIZE}`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

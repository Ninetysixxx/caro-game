// ui.js — DOM rendering + event delegation (implemented in Phase 3)

import { BOARD_SIZE } from './game.js';

export function renderBoard(rootEl) {
  if (!rootEl) return;
  // Stub: real cell rendering arrives in Phase 3.
  rootEl.dataset.size = String(BOARD_SIZE);
}

export function bindBoardEvents(_rootEl, _handler) {
  // Stub
}

export function updateStatus(statusEl, text) {
  if (statusEl) statusEl.textContent = text;
}

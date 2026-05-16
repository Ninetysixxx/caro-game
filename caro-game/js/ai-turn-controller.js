// ai-turn-controller.js — shared AI-move scheduler with a cancel hook
//
// Both regular AI mode and daily-puzzle AI use the same shape: flip a thinking
// flag, disable the board, show a "đang nghĩ..." status, then 200ms later
// pick + place a move and run mode-specific post-move logic. This module
// captures that scheduler so callers only have to provide `pickMove` + `onMove`.

import { makeMove } from './game.js';
import { renderBoard, highlightLastMove, disableBoard, enableBoard, updateStatus } from './ui.js';

const AI_THINK_DELAY_MS = 200;

let _timer = null;
let _thinking = false;

export function isAiThinking() {
  return _thinking;
}

export function cancelAiTurn() {
  if (_timer !== null) {
    clearTimeout(_timer);
    _timer = null;
  }
  _thinking = false;
}

export function scheduleAiMove({ state, statusText, pickMove, onMove }) {
  _thinking = true;
  disableBoard();
  updateStatus(statusText);
  _timer = setTimeout(() => {
    _timer = null;
    const move = pickMove();
    if (!move) {
      _thinking = false;
      enableBoard();
      return;
    }
    makeMove(state, move.row, move.col);
    renderBoard(state);
    highlightLastMove(move.row, move.col);
    _thinking = false;
    onMove(move);
  }, AI_THINK_DELAY_MS);
}

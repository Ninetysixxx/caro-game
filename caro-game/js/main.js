// main.js — bootstrap, event wiring, mode toggle, score tracking (Phase 5)

import { createState, makeMove, undoMove, PLAYER_X, PLAYER_O } from './game.js';
import { getBestMove } from './ai.js';
import {
  initBoard, setCellClickHandler, renderBoard,
  highlightLastMove, clearLastMove, drawWinLine, clearWinLine,
  updateStatus, disableBoard, enableBoard,
} from './ui.js';

// ── Module-scoped state ───────────────────────────────────────────────────────

let state = createState();
let mode = 'hotseat'; // 'hotseat' | 'ai'
let scores = loadScores();
let aiThinking = false;
let aiTimer = null;

function cancelAiTurn() {
  if (aiTimer !== null) { clearTimeout(aiTimer); aiTimer = null; }
  aiThinking = false;
}

// ── localStorage ──────────────────────────────────────────────────────────────

const SCORES_KEY = 'caro-scores-v1';

function defaultScores() {
  return { hotseat: { x: 0, o: 0, draws: 0 }, ai: { player: 0, ai: 0, draws: 0 } };
}

function loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return defaultScores();
    const parsed = JSON.parse(raw);
    if (!parsed.hotseat || !parsed.ai) return defaultScores();
    return parsed;
  } catch { return defaultScores(); }
}

function saveScores() {
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(scores)); } catch { /* quota/private */ }
}

// ── Score display ─────────────────────────────────────────────────────────────

function updateScoreDisplay() {
  const isAi = mode === 'ai';
  document.querySelector('.score-x .score-label').textContent = isAi ? 'Bạn' : 'X';
  document.querySelector('.score-o .score-label').textContent = isAi ? 'AI' : 'O';
  document.getElementById('score-x').textContent = isAi ? scores.ai.player : scores.hotseat.x;
  document.getElementById('score-o').textContent = isAi ? scores.ai.ai : scores.hotseat.o;
  document.getElementById('score-draws').textContent = isAi ? scores.ai.draws : scores.hotseat.draws;
}

function bumpScore(winner) {
  if (winner === null) {
    scores[mode === 'hotseat' ? 'hotseat' : 'ai'].draws += 1;
  } else if (mode === 'hotseat') {
    scores.hotseat[winner === PLAYER_X ? 'x' : 'o'] += 1;
  } else {
    scores.ai[winner === PLAYER_X ? 'player' : 'ai'] += 1;
  }
  saveScores();
  updateScoreDisplay();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function syncUndoBtn() {
  const btn = document.getElementById('btn-undo');
  btn.disabled = state.history.length === 0 || state.status !== 'playing' || aiThinking;
}

function resetBoard() {
  state = createState();
  renderBoard(state);
  clearWinLine();
  clearLastMove();
  enableBoard();
  updateStatus('Lượt: X');
  syncUndoBtn();
}

// ── Post-move logic ───────────────────────────────────────────────────────────

function handlePostMove(fromAi) {
  if (state.status === 'won') {
    drawWinLine(state.winLine);
    updateStatus(`${state.winner} thắng!`);
    bumpScore(state.winner);
    disableBoard();
  } else if (state.status === 'draw') {
    updateStatus('Hòa!');
    bumpScore(null);
    disableBoard();
  } else {
    updateStatus(`Lượt: ${state.currentPlayer}`);
    if (!fromAi && mode === 'ai' && state.currentPlayer === PLAYER_O) {
      triggerAiTurn();
    }
  }
}

// ── AI turn ───────────────────────────────────────────────────────────────────

function triggerAiTurn() {
  aiThinking = true;
  disableBoard();
  updateStatus('AI đang nghĩ...');
  aiTimer = setTimeout(() => {
    aiTimer = null;
    const move = getBestMove(state.board, PLAYER_O);
    if (!move) { aiThinking = false; enableBoard(); return; }
    makeMove(state, move.row, move.col);
    renderBoard(state);
    highlightLastMove(move.row, move.col);
    handlePostMove(true);
    if (state.status === 'playing') enableBoard();
    aiThinking = false;
    syncUndoBtn();
  }, 200);
}

// ── Event handlers ────────────────────────────────────────────────────────────

function onCellClick(row, col) {
  if (state.status !== 'playing') return;
  if (!makeMove(state, row, col)) return;
  renderBoard(state);
  highlightLastMove(row, col);
  handlePostMove(false);
  syncUndoBtn();
}

function onUndoClick() {
  if (aiThinking || state.history.length === 0) return;
  if (state.status !== 'playing') return; // No undo after game ends
  undoMove(state);
  if (mode === 'ai' && state.history.length > 0) undoMove(state);
  renderBoard(state);
  clearWinLine();
  // Re-highlight the new "last move" (if any) so the previous yellow ring clears.
  const last = state.history[state.history.length - 1];
  if (last) highlightLastMove(last.row, last.col);
  else clearLastMove();
  enableBoard();
  updateStatus(`Lượt: ${state.currentPlayer}`);
  syncUndoBtn();
}

function onRestartClick() {
  cancelAiTurn();
  resetBoard();
}

function onModeChange(newMode) {
  if (newMode === mode) return;
  if (state.history.length > 0 || aiThinking) {
    if (!confirm('Đổi chế độ sẽ kết thúc ván hiện tại. Tiếp tục?')) return;
  }
  cancelAiTurn();
  mode = newMode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  updateScoreDisplay();
  resetBoard();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function bootstrap() {
  initBoard(document.getElementById('board'));
  setCellClickHandler(onCellClick);
  renderBoard(state);
  updateStatus('Lượt: X');
  updateScoreDisplay();
  syncUndoBtn();

  document.getElementById('btn-undo').addEventListener('click', onUndoClick);
  document.getElementById('btn-restart').addEventListener('click', onRestartClick);
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => onModeChange(btn.dataset.mode));
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

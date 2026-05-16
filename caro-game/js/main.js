// main.js — bootstrap, event wiring, mode toggle, score tracking, daily puzzle

import { createState, makeMove, undoMove, PLAYER_X, PLAYER_O } from './game.js';
import { getBestMove } from './ai.js';
import {
  initBoard, setCellClickHandler, renderBoard,
  highlightLastMove, clearLastMove, drawWinLine, clearWinLine,
  updateStatus, disableBoard, enableBoard,
} from './ui.js';
import { getTodayPuzzle, getTodayPuzzleNumber, applyInitial, checkGoal, aiResponse, gradeMove, formatGoal } from './puzzle-engine.js';
import { loadStreak, recordResult, hasCompletedToday } from './streak.js';
import {
  initDailyBanner, removeDailyBanner, updateAttempts,
  showResultModal, hideResultModal, updateStreakDisplay, initStreakDisplay
} from './puzzle-ui.js';

// ── Module-scoped state ───────────────────────────────────────────────────────

let state = createState();
let mode = 'hotseat'; // 'hotseat' | 'ai' | 'daily'
let scores = loadScores();
let aiThinking = false;
let aiTimer = null;

// Daily puzzle state
let dailyPuzzle = null;
let dailyUserMoveCount = 0;
let dailyMoveGrades = [];

function cancelAiTurn() {
  if (aiTimer !== null) { clearTimeout(aiTimer); aiTimer = null; }
  aiThinking = false;
}

// ── localStorage ──────────────────────────────────────────────────────────────

const SCORES_KEY = 'caro-scores-v1';

function defaultScores() {
  return {
    hotseat: { x: 0, o: 0, draws: 0 },
    ai: { player: 0, ai: 0, draws: 0 },
    daily: { wins: 0, losses: 0 },
  };
}

function loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return defaultScores();
    const parsed = JSON.parse(raw);
    if (!parsed.hotseat || !parsed.ai || !parsed.daily) return defaultScores();
    return parsed;
  } catch { return defaultScores(); }
}

function saveScores() {
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(scores)); } catch { /* quota/private */ }
}

// ── Score display ─────────────────────────────────────────────────────────────

function updateScoreDisplay() {
  const isAi = mode === 'ai';
  const isDaily = mode === 'daily';
  document.querySelector('.score-x .score-label').textContent = isAi ? 'Bạn' : isDaily ? 'Thắng' : 'X';
  document.querySelector('.score-o .score-label').textContent = isAi ? 'AI' : isDaily ? 'Thua' : 'O';
  document.getElementById('score-x').textContent = isDaily ? scores.daily.wins : isAi ? scores.ai.player : scores.hotseat.x;
  document.getElementById('score-o').textContent = isDaily ? scores.daily.losses : isAi ? scores.ai.ai : scores.hotseat.o;
  document.getElementById('score-draws').textContent = isDaily ? '-' : isAi ? scores.ai.draws : scores.hotseat.draws;
}

function bumpScore(winner) {
  if (mode === 'daily') {
    if (winner === dailyPuzzle?.player) {
      scores.daily.wins += 1;
    } else {
      scores.daily.losses += 1;
    }
  } else if (winner === null) {
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

// ── Daily puzzle ──────────────────────────────────────────────────────────────

function startDailyPuzzle() {
  dailyPuzzle = getTodayPuzzle();
  dailyUserMoveCount = 0;
  dailyMoveGrades = [];

  state = createState();
  applyInitial(state, dailyPuzzle);
  renderBoard(state);
  clearWinLine();
  clearLastMove();
  enableBoard();

  const last = state.history[state.history.length - 1];
  if (last) highlightLastMove(last.row, last.col);

  initDailyBanner(dailyPuzzle);
  updateAttempts(0, dailyPuzzle.maxMoves);
  updateStatus(`${formatGoal(dailyPuzzle)} — Lượt: ${dailyPuzzle.player}`);
  syncUndoBtn();
}

function endDailyPuzzle(result) {
  const won = result.status === 'success';
  if (won && state.winLine) {
    drawWinLine(state.winLine);
  }
  updateStatus(won ? `${dailyPuzzle.player} thắng!` : 'Thua rồi!');
  disableBoard();
  bumpScore(won ? dailyPuzzle.player : null);

  const streak = recordResult(dailyPuzzle.id, won, dailyUserMoveCount);
  updateStreakDisplay(streak.current, streak.max);

  // Pad move grades to maxMoves for display
  const displayGrades = dailyMoveGrades.slice();
  while (displayGrades.length < dailyPuzzle.maxMoves) {
    displayGrades.push('⬛');
  }

  showResultModal(result, dailyPuzzle, streak, displayGrades, dailyUserMoveCount, getTodayPuzzleNumber());
}

function triggerDailyAiTurn() {
  aiThinking = true;
  disableBoard();
  updateStatus('AI đang nghĩ...');
  aiTimer = setTimeout(() => {
    aiTimer = null;
    const move = aiResponse(state, dailyPuzzle, null, dailyUserMoveCount - 1);
    if (!move) { aiThinking = false; enableBoard(); return; }
    makeMove(state, move.row, move.col);
    renderBoard(state);
    highlightLastMove(move.row, move.col);

    const result = checkGoal(state, dailyPuzzle, dailyUserMoveCount, true);
    if (result.status !== 'in-progress') {
      endDailyPuzzle(result);
    } else {
      enableBoard();
      updateStatus(`${formatGoal(dailyPuzzle)} — Lượt: ${dailyPuzzle.player}`);
    }

    aiThinking = false;
    syncUndoBtn();
  }, 200);
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

  if (mode === 'daily') {
    dailyMoveGrades.push(gradeMove({ row, col }, dailyPuzzle, dailyUserMoveCount));
    dailyUserMoveCount += 1;
    updateAttempts(dailyUserMoveCount, dailyPuzzle.maxMoves);

    const result = checkGoal(state, dailyPuzzle, dailyUserMoveCount, false);
    if (result.status === 'success') {
      endDailyPuzzle(result);
      syncUndoBtn();
      return;
    }
    if (result.status === 'fail') {
      endDailyPuzzle(result);
      syncUndoBtn();
      return;
    }

    if (state.status === 'playing' && state.currentPlayer === PLAYER_O) {
      triggerDailyAiTurn();
    }
  } else {
    handlePostMove(false);
  }

  syncUndoBtn();
}

function onUndoClick() {
  if (aiThinking || state.history.length === 0) return;
  if (state.status !== 'playing') return;

  undoMove(state);
  if (mode === 'ai' && state.history.length > 0) undoMove(state);

  renderBoard(state);
  clearWinLine();
  const last = state.history[state.history.length - 1];
  if (last) highlightLastMove(last.row, last.col);
  else clearLastMove();
  enableBoard();
  updateStatus(`Lượt: ${state.currentPlayer}`);
  syncUndoBtn();
}

function onRestartClick() {
  cancelAiTurn();
  if (mode === 'daily') {
    startDailyPuzzle();
  } else {
    resetBoard();
  }
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

  if (mode !== 'daily') {
    removeDailyBanner();
    hideResultModal();
  }

  updateScoreDisplay();

  if (mode === 'daily') {
    startDailyPuzzle();
    if (hasCompletedToday()) {
      updateStatus('Đã hoàn thành hôm nay — chơi lại không tính streak');
    }
  } else {
    resetBoard();
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function bootstrap() {
  initBoard(document.getElementById('board'));
  setCellClickHandler(onCellClick);
  renderBoard(state);
  updateStatus('Lượt: X');
  updateScoreDisplay();
  syncUndoBtn();

  const streak = loadStreak();
  initStreakDisplay();
  updateStreakDisplay(streak.current, streak.max);

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

// main.js — bootstrap, event router, mode toggle. Mode-specific logic lives in the *-controller modules.

import { createState, undoMove, makeMove, PLAYER_O } from './game.js';
import { pickByLevel } from './ai-strategy.js';
import { initBoard, setCellClickHandler, renderBoard, highlightLastMove, clearLastMove,
  drawWinLine, clearWinLine, updateStatus, disableBoard, enableBoard } from './ui.js';
import { loadStreak, hasCompletedToday } from './streak.js';
import { removeDailyBanner, hideResultModal, updateStreakDisplay, initStreakDisplay } from './puzzle-ui.js';
import { shareContent, showToast, showManualCopy } from './share.js';
import { formatInviteText } from './share-formatter.js';
import { toggleStatsModal } from './stats-ui.js';
import { loadScores, updateScoreDisplay, bumpScore as bumpScoreStore } from './score-store.js';
import { showGameOverModal, hideGameOverModal } from './gameover-modal.js';
import { isAiThinking, cancelAiTurn, scheduleAiMove } from './ai-turn-controller.js';
import { startDailyPuzzle, handleDailyCellClick, getDailyPuzzle } from './daily-controller.js';
import { showMultiplayerSetup, disconnectMultiplayer, checkRoomParam, getMultiplayer } from './multiplayer-controller.js';

const DIFF_KEY = 'caro-ai-difficulty-v1';
const LEVEL_LABELS = { easy: 'Dễ', hard: 'Khó', medium: 'Vừa' };

// null = no real Worker URL configured; multiplayer controller then shows the config-missing modal.
const SERVER_URL = (() => {
  const raw = window.CARO_SERVER_URL || '';
  return (!raw || raw.includes('YOUR_USER')) ? null : raw;
})();

let state = createState();
let mode = 'hotseat'; // 'hotseat' | 'ai' | 'daily' | 'multiplayer'
let aiLevel = localStorage.getItem(DIFF_KEY) || 'medium';
const scores = loadScores();

const ctx = {
  get state() { return state; },
  serverUrl: SERVER_URL,
  resetState(s) { state = s; },
  onModeChange,
  syncUndoBtn,
  bumpScore(winner, details) {
    const { newUnlocks } = bumpScoreStore(scores, mode, winner, getDailyPuzzle(), details);
    newUnlocks.forEach((a) => showToast(`🏆 Mở khóa: ${a.title}`));
  },
};

// daily/multiplayer: undo disabled until per-mode policy
function syncUndoBtn() {
  document.getElementById('btn-undo').disabled =
    mode === 'daily' ||
    mode === 'multiplayer' ||
    state.history.length === 0 ||
    state.status !== 'playing' ||
    isAiThinking();
}

function resetBoard() {
  hideGameOverModal();
  state = createState();
  renderBoard(state);
  clearWinLine();
  clearLastMove();
  enableBoard();
  updateStatus('Lượt: X');
  syncUndoBtn();
}

function handlePostMove(fromAi) {
  if (state.status === 'won') {
    drawWinLine(state.winLine);
    updateStatus(`${state.winner} thắng!`);
    ctx.bumpScore(state.winner);
    disableBoard();
    showGameOverModal(state, mode);
  } else if (state.status === 'draw') {
    updateStatus('Hòa!');
    ctx.bumpScore(null);
    disableBoard();
    showGameOverModal(state, mode);
  } else {
    updateStatus(`Lượt: ${state.currentPlayer}`);
    if (!fromAi && mode === 'ai' && state.currentPlayer === PLAYER_O) triggerAiTurn();
  }
}

function triggerAiTurn() {
  scheduleAiMove({
    state,
    statusText: `AI ${LEVEL_LABELS[aiLevel] || 'Vừa'} đang nghĩ...`,
    pickMove: () => pickByLevel(state.board, PLAYER_O, aiLevel, state.size),
    onMove: () => {
      handlePostMove(true);
      if (state.status === 'playing') enableBoard();
      syncUndoBtn();
    },
  });
}

function onCellClick(row, col) {
  if (state.status !== 'playing') return;
  if (mode === 'multiplayer') {
    const mp = getMultiplayer();
    if (mp && mp.color === state.currentPlayer) mp.sendMove(row, col);
    return;
  }
  if (!makeMove(state, row, col)) return;
  renderBoard(state);
  highlightLastMove(row, col);

  if (mode === 'daily') handleDailyCellClick(ctx, row, col);
  else handlePostMove(false);

  syncUndoBtn();
}

function onUndoClick() {
  if (mode === 'multiplayer' || mode === 'daily' || isAiThinking()) return;
  if (state.history.length === 0 || state.status !== 'playing') return;

  undoMove(state);
  if (mode === 'ai' && state.history.length > 0) undoMove(state);

  renderBoard(state);
  clearWinLine();
  const last = state.history[state.history.length - 1];
  if (last) highlightLastMove(last.row, last.col); else clearLastMove();
  enableBoard();
  updateStatus(`Lượt: ${state.currentPlayer}`);
  syncUndoBtn();
}

function onRestartClick() {
  cancelAiTurn();
  if (mode === 'multiplayer') { disconnectMultiplayer(); showMultiplayerSetup(ctx); return; }
  if (mode === 'daily') startDailyPuzzle(ctx); else resetBoard();
}

function syncToggleGroup(selector, key, value) {
  document.querySelectorAll(selector).forEach((btn) => {
    const active = btn.dataset[key] === value;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function onDifficultyChange(newLevel) {
  if (newLevel === aiLevel) return;
  if ((state.history.length > 0 || isAiThinking()) && !confirm('Đổi độ khó sẽ kết thúc ván hiện tại. Tiếp tục?')) return;
  cancelAiTurn();
  aiLevel = newLevel;
  try { localStorage.setItem(DIFF_KEY, aiLevel); } catch { /* quota/private */ }
  syncToggleGroup('.difficulty-btn', 'level', aiLevel);
  onRestartClick();
}

function onModeChange(newMode) {
  if (newMode === mode) return;
  if ((state.history.length > 0 || isAiThinking()) && !confirm('Đổi chế độ sẽ kết thúc ván hiện tại. Tiếp tục?')) return;
  cancelAiTurn();
  hideGameOverModal();
  disconnectMultiplayer();
  mode = newMode;
  syncToggleGroup('.mode-btn', 'mode', mode);
  document.getElementById('difficulty-selector')?.classList.toggle('is-hidden', mode !== 'ai');
  if (mode !== 'daily') { removeDailyBanner(); hideResultModal(); }
  updateScoreDisplay(scores, mode);

  if (mode === 'daily') {
    startDailyPuzzle(ctx);
    if (hasCompletedToday()) updateStatus('Đã hoàn thành hôm nay — chơi lại không tính streak');
  } else if (mode === 'multiplayer') showMultiplayerSetup(ctx);
  else resetBoard();
}

function bootstrap() {
  initBoard(document.getElementById('board'));
  setCellClickHandler(onCellClick);
  renderBoard(state);
  updateStatus('Lượt: X');
  updateScoreDisplay(scores, mode);
  syncUndoBtn();
  syncToggleGroup('.difficulty-btn', 'level', aiLevel);
  document.getElementById('difficulty-selector')?.classList.toggle('is-hidden', mode !== 'ai');

  const streak = loadStreak();
  initStreakDisplay();
  updateStreakDisplay(streak.current, streak.max);

  document.getElementById('btn-undo').addEventListener('click', onUndoClick);
  document.getElementById('btn-restart').addEventListener('click', onRestartClick);
  document.querySelectorAll('.mode-btn').forEach((b) => b.addEventListener('click', () => onModeChange(b.dataset.mode)));
  document.querySelectorAll('.difficulty-btn').forEach((b) => b.addEventListener('click', () => onDifficultyChange(b.dataset.level)));
  document.getElementById('btn-share-header')?.addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?ref=share`;
    const r = await shareContent({ title: 'Cờ Caro VN', text: formatInviteText(), url });
    if (r.ok && r.method === 'clipboard') showToast('Đã copy link!');
    else if (!r.ok && r.method === 'manual') showManualCopy(r.text);
  });
  document.getElementById('btn-stats-header')?.addEventListener('click', toggleStatsModal);

  checkRoomParam(ctx);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
else bootstrap();

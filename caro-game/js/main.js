// main.js — bootstrap, event wiring, mode toggle, score tracking, daily puzzle

import { createState, makeMove, undoMove, PLAYER_X, PLAYER_O } from './game.js';
import { pickByLevel } from './ai-strategy.js';
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
import { shareContent, showToast, showManualCopy } from './share.js';
import { formatWinResult, formatInviteText } from './share-formatter.js';
import { snapshotBoard, downloadBlob } from './board-snapshot.js';
import { recordGame } from './stats.js';
import { toggleStatsModal } from './stats-ui.js';

// ── Module-scoped state ───────────────────────────────────────────────────────

let state = createState();
let mode = 'hotseat'; // 'hotseat' | 'ai' | 'daily'
const DIFF_KEY = 'caro-ai-difficulty-v1';
let aiLevel = localStorage.getItem(DIFF_KEY) || 'medium';
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.hotseat && parsed.ai && parsed.daily) return parsed;
    }
  } catch { /* ignore */ }

  // Fallback to unified stats if old key was migrated
  try {
    const statsRaw = localStorage.getItem('caro-stats-v1');
    if (statsRaw) {
      const s = JSON.parse(statsRaw);
      if (s && s.version === 1) {
        return {
          hotseat: { x: s.hotseat.x || 0, o: s.hotseat.o || 0, draws: s.hotseat.draws || 0 },
          ai: { player: s.ai.wins || 0, ai: s.ai.losses || 0, draws: s.ai.draws || 0 },
          daily: { wins: s.daily.totalWon || 0, losses: (s.daily.totalPlayed || 0) - (s.daily.totalWon || 0) },
        };
      }
    }
  } catch { /* ignore */ }

  return defaultScores();
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

function bumpScore(winner, details = {}) {
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

  // Record in unified stats + achievements
  const actualMode = details.mode || mode;
  let result;
  if (actualMode === 'daily') {
    result = winner === dailyPuzzle?.player ? 'win' : 'loss';
  } else if (actualMode === 'ai') {
    result = winner === null ? 'draw' : winner === PLAYER_X ? 'win' : 'loss';
  } else {
    result = winner === null ? 'draw' : winner === PLAYER_X ? 'x' : 'o';
  }
  const { newUnlocks } = recordGame({
    mode: actualMode,
    result,
    attempts: details.attempts,
    goal: details.goal,
  });
  if (newUnlocks.length > 0) {
    newUnlocks.forEach((a) => showToast(`🏆 Mở khóa: ${a.title}`));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function syncUndoBtn() {
  const btn = document.getElementById('btn-undo');
  btn.disabled = state.history.length === 0 || state.status !== 'playing' || aiThinking;
}



function levelLabel(level) {
  if (level === 'easy') return 'Dễ';
  if (level === 'hard') return 'Khó';
  return 'Vừa';
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
  bumpScore(won ? dailyPuzzle.player : null, {
    mode: 'daily',
    attempts: dailyUserMoveCount,
    goal: dailyPuzzle.goal,
  });

  const streak = recordResult(dailyPuzzle.id, won, dailyUserMoveCount);
  updateStreakDisplay(streak.current, streak.max);

  // Pad move grades to maxMoves for display
  const displayGrades = dailyMoveGrades.slice();
  while (displayGrades.length < dailyPuzzle.maxMoves) {
    displayGrades.push('⬛');
  }

  showResultModal(result, dailyPuzzle, streak, displayGrades, dailyUserMoveCount, getTodayPuzzleNumber(), () => {
    import('./replay-ui.js').then((mod) => mod.showReplayModal(state));
  });
}

let _gameoverModal = null;

function hideGameOverModal() {
  if (_gameoverModal) {
    _gameoverModal.remove();
    _gameoverModal = null;
  }
  document.removeEventListener('keydown', _onEscGameOver);
}

function showGameOverModal() {
  hideGameOverModal();
  const isDraw = state.status === 'draw';
  const title = isDraw ? 'Hòa!' : `${state.winner} thắng!`;
  const moves = state.history.length;
  const shareText = formatWinResult({ mode, winner: state.winner, moves });
  const url = `${location.origin}${location.pathname}?ref=share`;

  _gameoverModal = document.createElement('div');
  _gameoverModal.className = 'puzzle-modal';
  _gameoverModal.setAttribute('role', 'dialog');
  _gameoverModal.setAttribute('aria-modal', 'true');
  _gameoverModal.setAttribute('aria-label', 'Kết thúc ván');
  _gameoverModal.innerHTML = `
    <div class="puzzle-modal-backdrop"></div>
    <div class="puzzle-modal-panel">
      <h2 class="puzzle-modal-title">${title}</h2>
      <p class="puzzle-modal-subtitle">${moves} nước đã đi</p>
      <div class="puzzle-modal-actions">
        <button type="button" class="ctrl-btn" id="go-share-btn" aria-label="Chia sẻ kết quả">Chia sẻ</button>
        <button type="button" class="ctrl-btn" id="go-replay-btn" aria-label="Lưu replay">Lưu replay</button>
        <button type="button" class="ctrl-btn" id="go-save-btn" aria-label="Lưu ảnh ván cờ">Lưu ảnh</button>
        <button type="button" class="ctrl-btn" id="go-close-btn" aria-label="Đóng">Đóng</button>
      </div>
    </div>
  `;
  document.body.appendChild(_gameoverModal);

  const closeBtn = _gameoverModal.querySelector('#go-close-btn');
  const shareBtn = _gameoverModal.querySelector('#go-share-btn');
  const saveBtn = _gameoverModal.querySelector('#go-save-btn');
  const replayBtn = _gameoverModal.querySelector('#go-replay-btn');
  closeBtn.focus();

  closeBtn.addEventListener('click', hideGameOverModal);
  _gameoverModal.querySelector('.puzzle-modal-backdrop').addEventListener('click', hideGameOverModal);

  replayBtn.addEventListener('click', () => {
    hideGameOverModal();
    import('./replay-ui.js').then((mod) => mod.showReplayModal(state));
  });

  shareBtn.addEventListener('click', async () => {
    const result = await shareContent({ title: 'Cờ Caro VN', text: shareText, url });
    if (result.ok && result.method === 'clipboard') {
      showToast('Đã copy link!');
      shareBtn.textContent = 'Đã sao chép!';
      setTimeout(() => { shareBtn.textContent = 'Chia sẻ'; }, 1500);
    } else if (!result.ok && result.method === 'manual') {
      showManualCopy(result.text);
    }
  });

  saveBtn.addEventListener('click', async () => {
    try {
      const blob = await snapshotBoard(state, { cellSize: 24 });
      const filename = `caro-van-${Date.now()}.png`;
      downloadBlob(blob, filename);
      showToast('Đã lưu ảnh!');
    } catch (e) {
      showToast('Lỗi khi lưu ảnh');
    }
  });

  document.addEventListener('keydown', _onEscGameOver);
}

function _onEscGameOver(e) {
  if (e.key === 'Escape') hideGameOverModal();
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
    showGameOverModal();
  } else if (state.status === 'draw') {
    updateStatus('Hòa!');
    bumpScore(null);
    disableBoard();
    showGameOverModal();
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
  updateStatus(`AI ${levelLabel(aiLevel)} đang nghĩ...`);
  aiTimer = setTimeout(() => {
    aiTimer = null;
    const move = pickByLevel(state.board, PLAYER_O, aiLevel, state.size);
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

function syncDifficultyUI() {
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    const active = btn.dataset.level === aiLevel;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function onDifficultyChange(newLevel) {
  if (newLevel === aiLevel) return;
  if (state.history.length > 0 || aiThinking) {
    if (!confirm('Đổi độ khó sẽ kết thúc ván hiện tại. Tiếp tục?')) return;
  }
  cancelAiTurn();
  aiLevel = newLevel;
  try { localStorage.setItem(DIFF_KEY, aiLevel); } catch { /* quota/private */ }
  syncDifficultyUI();
  onRestartClick();
}

function onModeChange(newMode) {
  if (newMode === mode) return;
  if (state.history.length > 0 || aiThinking) {
    if (!confirm('Đổi chế độ sẽ kết thúc ván hiện tại. Tiếp tục?')) return;
  }
  cancelAiTurn();
  hideGameOverModal();
  mode = newMode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  const diffSelector = document.getElementById('difficulty-selector');
  if (diffSelector) {
    diffSelector.classList.toggle('is-hidden', mode !== 'ai');
  }

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
  syncDifficultyUI();

  const diffSelector = document.getElementById('difficulty-selector');
  if (diffSelector) {
    diffSelector.classList.toggle('is-hidden', mode !== 'ai');
  }

  const streak = loadStreak();
  initStreakDisplay();
  updateStreakDisplay(streak.current, streak.max);

  document.getElementById('btn-undo').addEventListener('click', onUndoClick);
  document.getElementById('btn-restart').addEventListener('click', onRestartClick);
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => onModeChange(btn.dataset.mode));
  });

  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => onDifficultyChange(btn.dataset.level));
  });

  const headerShare = document.getElementById('btn-share-header');
  if (headerShare) {
    headerShare.addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}?ref=share`;
      const text = formatInviteText();
      const result = await shareContent({ title: 'Cờ Caro VN', text, url });
      if (result.ok && result.method === 'clipboard') {
        showToast('Đã copy link!');
      } else if (!result.ok && result.method === 'manual') {
        showManualCopy(result.text);
      }
    });
  }

  const headerStats = document.getElementById('btn-stats-header');
  if (headerStats) {
    headerStats.addEventListener('click', toggleStatsModal);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

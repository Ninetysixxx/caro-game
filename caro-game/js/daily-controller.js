// daily-controller.js — daily-puzzle lifecycle (start / end / AI response)
//
// Owns puzzle progress state (puzzle, user move count, move grades). Caller
// passes a ctx with shared game state and behavior hooks (sync UI helpers,
// bump score, restart, etc.). All puzzle-specific UI work happens here so
// main.js only routes events.

import { createState, PLAYER_O } from './game.js';
import { renderBoard, highlightLastMove, clearLastMove, clearWinLine,
  drawWinLine, updateStatus, enableBoard, disableBoard } from './ui.js';
import { applyInitial, checkGoal, aiResponse, gradeMove, formatGoal,
  getTodayPuzzle, getTodayPuzzleNumber } from './puzzle-engine.js';
import { recordResult } from './streak.js';
import { initDailyBanner, updateAttempts, showResultModal, updateStreakDisplay } from './puzzle-ui.js';
import { scheduleAiMove } from './ai-turn-controller.js';

const daily = {
  puzzle: null,
  userMoveCount: 0,
  moveGrades: [],
};

export function getDailyPuzzle() {
  return daily.puzzle;
}

export function startDailyPuzzle(ctx) {
  daily.puzzle = getTodayPuzzle();
  daily.userMoveCount = 0;
  daily.moveGrades = [];

  ctx.resetState(createState());
  applyInitial(ctx.state, daily.puzzle);
  renderBoard(ctx.state);
  clearWinLine();
  clearLastMove();
  enableBoard();

  const last = ctx.state.history[ctx.state.history.length - 1];
  if (last) highlightLastMove(last.row, last.col);

  initDailyBanner(daily.puzzle);
  updateAttempts(0, daily.puzzle.maxMoves);
  updateStatus(`${formatGoal(daily.puzzle)} — Lượt: ${daily.puzzle.player}`);
  ctx.syncUndoBtn();
}

export function endDailyPuzzle(ctx, result) {
  const won = result.status === 'success';
  if (won && ctx.state.winLine) {
    drawWinLine(ctx.state.winLine);
  }
  updateStatus(won ? `${daily.puzzle.player} thắng!` : 'Thua rồi!');
  disableBoard();
  ctx.bumpScore(won ? daily.puzzle.player : null, {
    mode: 'daily',
    attempts: daily.userMoveCount,
    goal: daily.puzzle.goal,
  });

  const streak = recordResult(daily.puzzle.id, won, daily.userMoveCount);
  updateStreakDisplay(streak.current, streak.max);

  // Pad grades to maxMoves so the result modal grid is consistent.
  const displayGrades = daily.moveGrades.slice();
  while (displayGrades.length < daily.puzzle.maxMoves) {
    displayGrades.push('⬛');
  }

  const stateRef = ctx.state;
  showResultModal(result, daily.puzzle, streak, displayGrades, daily.userMoveCount, getTodayPuzzleNumber(), () => {
    import('./replay-ui.js').then((mod) => mod.showReplayModal(stateRef));
  });
}

// Called after the user places a move in daily mode. Returns true if the
// puzzle ended (success/fail), false if play continues; caller may then
// trigger the AI response separately.
export function handleDailyCellClick(ctx, row, col) {
  daily.moveGrades.push(gradeMove({ row, col }, daily.puzzle, daily.userMoveCount));
  daily.userMoveCount += 1;
  updateAttempts(daily.userMoveCount, daily.puzzle.maxMoves);

  const result = checkGoal(ctx.state, daily.puzzle, daily.userMoveCount, false);
  if (result.status === 'success' || result.status === 'fail') {
    endDailyPuzzle(ctx, result);
    return true;
  }
  if (ctx.state.status === 'playing' && ctx.state.currentPlayer === PLAYER_O) {
    triggerDailyAiTurn(ctx);
  }
  return false;
}

export function triggerDailyAiTurn(ctx) {
  scheduleAiMove({
    state: ctx.state,
    statusText: 'AI đang nghĩ...',
    pickMove: () => aiResponse(ctx.state, daily.puzzle, null, daily.userMoveCount - 1),
    onMove: () => {
      const result = checkGoal(ctx.state, daily.puzzle, daily.userMoveCount, true);
      if (result.status !== 'in-progress') {
        endDailyPuzzle(ctx, result);
      } else {
        enableBoard();
        updateStatus(`${formatGoal(daily.puzzle)} — Lượt: ${daily.puzzle.player}`);
      }
      ctx.syncUndoBtn();
    },
  });
}

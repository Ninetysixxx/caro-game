// puzzle-engine.js — daily puzzle selection, state setup, goal validation, AI response

import { PUZZLES } from './puzzle-bank.js';
import { pickMedium } from './ai-medium.js';
import { EMPTY } from './game.js';

function getTodaySeed() {
  const [y, m, d] = new Date().toISOString().slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Deterministic puzzle of the day based on UTC date. */
export function getTodayPuzzle() {
  const seed = getTodaySeed();
  return PUZZLES[seed % PUZZLES.length];
}

/** Monotonic puzzle number for sharing (day-based). */
export function getTodayPuzzleNumber() {
  return getTodaySeed();
}

/** Place pre-set stones from puzzle onto a fresh state. Mutates state. */
export function applyInitial(state, puzzle) {
  for (const stone of puzzle.initial) {
    if (state.board[stone.row][stone.col] === EMPTY) {
      state.board[stone.row][stone.col] = stone.player;
      state.history.push({ row: stone.row, col: stone.col, player: stone.player });
    }
  }
  // User (puzzle.player) always starts first in daily mode.
  state.currentPlayer = puzzle.player;
}

/** Format a human-readable goal text. */
export function formatGoal(puzzle) {
  if (puzzle.goal.startsWith('win-in-')) {
    const n = puzzle.goal.split('-')[2];
    return `Thắng trong ${n} nước`;
  }
  if (puzzle.goal.startsWith('block-in-')) {
    return `Chặn ${puzzle.player === 'X' ? 'O' : 'X'} thắng`;
  }
  return puzzle.goal;
}

/**
 * Check whether the daily puzzle goal is achieved after a move.
 * @param {object} state   game state
 * @param {object} puzzle  current puzzle
 * @param {number} userMoveCount  how many user moves have been made
 * @param {boolean} afterAiMove   true if we're checking after the AI just moved
 * @returns {{status:'in-progress'|'success'|'fail', reason?:string}}
 */
export function checkGoal(state, puzzle, userMoveCount, afterAiMove = false) {
  // User won
  if (state.status === 'won' && state.winner === puzzle.player) {
    return { status: 'success', reason: 'win' };
  }

  // Opponent won
  if (state.status === 'won' && state.winner !== puzzle.player) {
    return { status: 'fail', reason: 'opponent-win' };
  }

  // Draw is always a failure (goal not achieved)
  if (state.status === 'draw') {
    return { status: 'fail', reason: 'draw' };
  }

  const isWinGoal = puzzle.goal.startsWith('win-in-');
  const isBlockGoal = puzzle.goal.startsWith('block-in-');

  if (userMoveCount >= puzzle.maxMoves) {
    if (isWinGoal) {
      // For win goals, if user hasn't won by now, it's an immediate failure.
      return { status: 'fail', reason: 'max-moves' };
    }
    if (!afterAiMove) {
      // After the user's last move we must let the AI respond before final judgement
      return { status: 'in-progress', reason: 'need-ai-response' };
    }
    if (isBlockGoal) {
      return { status: 'success', reason: 'survived' };
    }
  }

  return { status: 'in-progress' };
}

/**
 * Choose the AI's response move.
 * If a scripted response exists for this turn, use it; otherwise fall back to heuristic AI.
 */
export function aiResponse(state, puzzle, lastUserMove, moveIndex) {
  // Scripted responses are keyed sequentially by user move index (0-based).
  if (puzzle.scriptedResponses && moveIndex < puzzle.scriptedResponses.length) {
    const scripted = puzzle.scriptedResponses[moveIndex];
    // Validate cell is still empty before forcing it
    if (state.board[scripted.row][scripted.col] === EMPTY) {
      return scripted;
    }
  }

  const opp = puzzle.player === 'X' ? 'O' : 'X';
  return pickMedium(state.board, opp, state.size);
}

/** Grade a single user move for the emoji grid. */
export function gradeMove(move, puzzle, moveIndex) {
  const sol = puzzle.solution || [];
  if (sol.length === 0) return '\u{1F7E8}'; // 🟨 for block puzzles without explicit solution

  // Exact match at expected position
  if (moveIndex < sol.length && move.row === sol[moveIndex].row && move.col === sol[moveIndex].col) {
    return '\u{1F7E9}'; // 🟩
  }

  // Correct cell but wrong order
  const inSolution = sol.some((s) => s.row === move.row && s.col === move.col);
  if (inSolution) return '\u{1F7E8}'; // 🟨

  // Adjacent (Chebyshev distance ≤ 2) to a solution move
  const adjacent = sol.some(
    (s) => Math.abs(s.row - move.row) <= 2 && Math.abs(s.col - move.col) <= 2
  );
  if (adjacent) return '\u{1F7E8}'; // 🟨

  return '\u{1F7E5}'; // 🟥
}

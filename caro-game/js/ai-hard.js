// ai-hard.js — hard difficulty: minimax depth 2 + alpha-beta + top-K pruning

import { scoreCell, getCandidates } from './ai.js';
import { checkWin, getOpponent } from './game.js';
import { pickMedium } from './ai-medium.js';

function evaluate(board, aiPlayer, size) {
  const opp = getOpponent(aiPlayer);
  let aiMax = 0, oppMax = 0;
  const candidates = getCandidates(board, size);
  for (const m of candidates) {
    const sAi = scoreCell(board, m.row, m.col, aiPlayer, size);
    const sOpp = scoreCell(board, m.row, m.col, opp, size);
    if (sAi > aiMax) aiMax = sAi;
    if (sOpp > oppMax) oppMax = sOpp;
  }
  return aiMax - oppMax * 0.9;
}

function minimax(board, depth, alpha, beta, maximizing, aiPlayer, size) {
  if (depth === 0) {
    return evaluate(board, aiPlayer, size);
  }

  const opp = getOpponent(aiPlayer);
  const player = maximizing ? aiPlayer : opp;
  const candidates = getCandidates(board, size);

  // Move ordering: sort by combined heuristic score descending
  candidates.sort((a, b) => {
    const scoreA = scoreCell(board, a.row, a.col, aiPlayer, size) + scoreCell(board, a.row, a.col, opp, size);
    const scoreB = scoreCell(board, b.row, b.col, aiPlayer, size) + scoreCell(board, b.row, b.col, opp, size);
    return scoreB - scoreA;
  });

  const topCandidates = candidates.slice(0, 10);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const { row, col } of topCandidates) {
      const prev = board[row][col];
      board[row][col] = player;
      const win = checkWin(board, row, col, player, size);
      if (win.win) {
        board[row][col] = prev;
        return 1000000;
      }
      const evalScore = minimax(board, depth - 1, alpha, beta, false, aiPlayer, size);
      board[row][col] = prev;
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const { row, col } of topCandidates) {
      const prev = board[row][col];
      board[row][col] = player;
      const win = checkWin(board, row, col, player, size);
      if (win.win) {
        board[row][col] = prev;
        return -1000000;
      }
      const evalScore = minimax(board, depth - 1, alpha, beta, true, aiPlayer, size);
      board[row][col] = prev;
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function pickHard(board, aiPlayer, size) {
  const start = performance.now();

  const opp = getOpponent(aiPlayer);
  const candidates = getCandidates(board, size);
  if (!candidates.length) return null;

  // Move ordering for root
  candidates.sort((a, b) => {
    const scoreA = scoreCell(board, a.row, a.col, aiPlayer, size) + scoreCell(board, a.row, a.col, opp, size);
    const scoreB = scoreCell(board, b.row, b.col, aiPlayer, size) + scoreCell(board, b.row, b.col, opp, size);
    return scoreB - scoreA;
  });

  const topCandidates = candidates.slice(0, 10);

  let bestScore = -Infinity;
  let bestMove = null;

  for (const { row, col } of topCandidates) {
    const prev = board[row][col];
    board[row][col] = aiPlayer;
    const win = checkWin(board, row, col, aiPlayer, size);
    let score;
    if (win.win) {
      score = 1000000;
    } else {
      score = minimax(board, 1, -Infinity, Infinity, false, aiPlayer, size);
    }
    board[row][col] = prev;

    if (score > bestScore) {
      bestScore = score;
      bestMove = { row, col };
    }
  }

  const elapsed = performance.now() - start;
  if (elapsed > 2000) {
    console.warn(`[AI] Hard mode took ${elapsed.toFixed(0)}ms, falling back to medium`);
    return pickMedium(board, aiPlayer, size);
  }

  return bestMove;
}

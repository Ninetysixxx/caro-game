// ai-medium.js — medium difficulty: 1-ply heuristic (offense + defense)

import { scoreCell, getCandidates } from './ai.js';
import { getOpponent } from './game.js';

export function pickMedium(board, aiPlayer, size) {
  const candidates = getCandidates(board, size);
  if (!candidates.length) return null;

  const opp = getOpponent(aiPlayer);
  let bestScore = -Infinity;
  let bestMove = candidates[0];

  for (const m of candidates) {
    const total = scoreCell(board, m.row, m.col, aiPlayer, size) +
                  scoreCell(board, m.row, m.col, opp, size) * 0.9;
    if (total > bestScore) {
      bestScore = total;
      bestMove = m;
    }
  }
  return bestMove;
}

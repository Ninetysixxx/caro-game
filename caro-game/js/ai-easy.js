// ai-easy.js — easy difficulty: block obvious threats, otherwise random with center bias

import { scoreCell, getCandidates } from './ai.js';
import { getOpponent } from './game.js';

export function pickEasy(board, aiPlayer, size) {
  const candidates = getCandidates(board, size);
  if (!candidates.length) return null;

  const opp = getOpponent(aiPlayer);

  // Immediate win
  for (const m of candidates) {
    if (scoreCell(board, m.row, m.col, aiPlayer, size) >= 100000) {
      return m;
    }
  }

  // Immediate loss (opponent win)
  for (const m of candidates) {
    if (scoreCell(board, m.row, m.col, opp, size) >= 100000) {
      return m;
    }
  }

  // Opponent open-4 threat
  for (const m of candidates) {
    if (scoreCell(board, m.row, m.col, opp, size) >= 10000) {
      return m;
    }
  }

  // Otherwise weighted-random toward center
  const center = Math.floor(size / 2);
  const weights = candidates.map(m => {
    const dist = Math.abs(m.row - center) + Math.abs(m.col - center);
    return Math.max(1, 10 - dist);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rnd = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    rnd -= weights[i];
    if (rnd <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

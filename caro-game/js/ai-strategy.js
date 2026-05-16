// ai-strategy.js — difficulty dispatcher

import { pickEasy } from './ai-easy.js';
import { pickMedium } from './ai-medium.js';
import { pickHard } from './ai-hard.js';

export function pickByLevel(board, player, level, size) {
  switch (level) {
    case 'easy': return pickEasy(board, player, size);
    case 'hard': return pickHard(board, player, size);
    default: return pickMedium(board, player, size);
  }
}

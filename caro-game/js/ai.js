// ai.js — heuristic AI move selection (Phase 4)
//
// Pattern encoding in extractLine output (9-char string):
//   'p' = own piece (the simulated player)
//   'o' = opponent piece
//   '_' = empty cell
//   'b' = out-of-bounds boundary
// Center char (index 4) is always 'p' (we're evaluating placing here).

import { BOARD_SIZE, EMPTY, getOpponent, isInBounds } from './game.js';

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const CENTER = Math.floor(BOARD_SIZE / 2); // 10 for 20x20

// Build 9-char window: 4 before + center(p) + 4 after along (dr,dc).
export function extractLine(board, r, c, dr, dc, player, size = BOARD_SIZE) {
  const opp = getOpponent(player);
  const encode = (row, col) => {
    if (!isInBounds(row, col, size)) return 'b';
    const v = board[row][col];
    if (v === EMPTY) return '_';
    return v === player ? 'p' : 'o';
  };
  let line = '';
  for (let i = -4; i <= 4; i++) {
    line += i === 0 ? 'p' : encode(r + dr * i, c + dc * i);
  }
  return line;
}

// Score a single 9-char line for patterns. Scoring is intentionally additive
// across tiers (e.g. `_pppp_` is open-4 AND substring `_ppp_` open-3 → 11000),
// which biases toward critical cells — accepted per spec risk-list.
export function evaluateLine(line) {
  let score = 0;

  // Win: 5 own in a row
  if (line.includes('ppppp')) return 100000;

  // Open 4: _pppp_
  if (line.includes('_pppp_')) score += 10000;
  // Closed 4: blocked on one side
  else if (
    line.includes('opppp_') || line.includes('bpppp_') ||
    line.includes('_ppppo') || line.includes('_ppppb')
  ) score += 1000;

  // Open 3: _ppp_
  if (line.includes('_ppp_')) score += 1000;
  // Closed 3
  else if (
    line.includes('oppp_') || line.includes('bppp_') ||
    line.includes('_pppo') || line.includes('_pppb')
  ) score += 100;

  // Open 2: _pp_
  if (line.includes('_pp_')) score += 100;
  // Closed 2
  else if (
    line.includes('opp_') || line.includes('bpp_') ||
    line.includes('_ppo') || line.includes('_ppb')
  ) score += 10;

  return score;
}

// Score a cell for a given player across all 4 directions.
// Also adds double-threat bonus when >=2 directions produce open-3.
export function scoreCell(board, row, col, player, size = BOARD_SIZE) {
  let total = 0;
  let open3Count = 0;

  for (const [dr, dc] of DIRECTIONS) {
    const line = extractLine(board, row, col, dr, dc, player, size);

    // Check for win short-circuit
    if (line.includes('ppppp')) return 100000;

    // Track open-3 for double-threat bonus
    if (line.includes('_ppp_')) open3Count++;

    total += evaluateLine(line);
  }

  // Double-3 bonus: two open-3s sharing this cell
  if (open3Count >= 2) total += 5000;

  return total;
}

// Collect empty cells within radius 2 of any placed stone.
// Returns [] when board is full (caller must handle null move).
export function getCandidates(board, size = BOARD_SIZE) {
  const seen = new Set();
  const result = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === EMPTY) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr, nc = c + dc;
          if (!isInBounds(nr, nc, size)) continue;
          if (board[nr][nc] !== EMPTY) continue;
          const key = nr * size + nc;
          if (!seen.has(key)) {
            seen.add(key);
            result.push({ row: nr, col: nc });
          }
        }
      }
    }
  }

  if (result.length > 0) return result;
  // Opening / no neighbors: prefer center; fall back to any empty cell.
  if (board[CENTER][CENTER] === EMPTY) return [{ row: CENTER, col: CENTER }];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === EMPTY) return [{ row: r, col: c }];
    }
  }
  return [];
}



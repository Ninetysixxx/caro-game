// game.js — game state, rules, win detection (implemented in Phase 2)

export const BOARD_SIZE = 20;
export const PLAYER_X = 'X';
export const PLAYER_O = 'O';
export const EMPTY = null;

export function createGame() {
  return {
    board: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY)),
    currentPlayer: PLAYER_X,
    moves: [],
    winner: null,
    winningLine: null,
  };
}

export function isInBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// game.js — game state, rules, win detection (caro VN)
// Rule: 5 in a row wins; if both ends blocked (opponent or board edge), not a win.
// 6+ consecutive same-player stones also wins (long-line).

export const BOARD_SIZE = 20;
export const PLAYER_X = 'X';
export const PLAYER_O = 'O';
export const EMPTY = null;

export const STATUS_PLAYING = 'playing';
export const STATUS_WON = 'won';
export const STATUS_DRAW = 'draw';

// 4 axes: horizontal, vertical, diagonal-down, diagonal-up
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const WIN_LENGTH = 5;

/**
 * Create a fresh game state.
 * @param {number} size board side length (default BOARD_SIZE)
 * @returns {{board:(string|null)[][], currentPlayer:string, history:Array, status:string, winner:string|null, winLine:Array|null, size:number}}
 */
export function createState(size = BOARD_SIZE) {
  return {
    board: Array.from({ length: size }, () => Array(size).fill(EMPTY)),
    currentPlayer: PLAYER_X,
    history: [],
    status: STATUS_PLAYING,
    winner: null,
    winLine: null,
    size,
  };
}

// Back-compat alias for the Phase 1 scaffold (main.js imports `createGame`).
export const createGame = createState;

/** True if (row, col) lies inside the board. */
export function isInBounds(row, col, size = BOARD_SIZE) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

/** Return the other player. */
export function getOpponent(player) {
  return player === PLAYER_X ? PLAYER_O : PLAYER_X;
}

/**
 * Apply a move. Mutates `state` (single-source-of-truth model).
 * @returns {boolean} true if move applied; false if invalid.
 */
export function makeMove(state, row, col) {
  if (state.status !== STATUS_PLAYING) return false;
  if (!isInBounds(row, col, state.size)) return false;
  if (state.board[row][col] !== EMPTY) return false;

  const player = state.currentPlayer;
  state.board[row][col] = player;
  state.history.push({ row, col, player });

  const win = checkWin(state.board, row, col, player, state.size);
  if (win.win) {
    state.status = STATUS_WON;
    state.winner = player;
    state.winLine = win.line;
    return true;
  }

  if (checkDraw(state)) {
    state.status = STATUS_DRAW;
    return true;
  }

  state.currentPlayer = getOpponent(player);
  return true;
}

/**
 * Caro VN win check from the last-placed stone at (row, col) for `player`.
 * Walks 4 axes; for each, extends both directions while same player.
 * If run length ≥ 5: win unless both ends are blocked (opponent or out-of-board).
 * Long-line (6+) is treated as a win per common caro convention.
 *
 * @returns {{win:boolean, line:Array<{row:number,col:number}>|null}}
 */
export function checkWin(board, row, col, player, size = BOARD_SIZE) {
  for (const [dr, dc] of DIRECTIONS) {
    const fwd = walk(board, row, col, dr, dc, player, size);
    const back = walk(board, row, col, -dr, -dc, player, size);
    const count = 1 + fwd.count + back.count;
    if (count < WIN_LENGTH) continue;

    // The two ends of the contiguous run.
    const headR = row + dr * (fwd.count + 1);
    const headC = col + dc * (fwd.count + 1);
    const tailR = row - dr * (back.count + 1);
    const tailC = col - dc * (back.count + 1);

    const headBlocked = isBlocked(board, headR, headC, player, size);
    const tailBlocked = isBlocked(board, tailR, tailC, player, size);

    if (headBlocked && tailBlocked) continue; // Caro VN: chặn 2 đầu → không tính

    const line = buildLine(row, col, dr, dc, back.count, fwd.count);
    return { win: true, line };
  }
  return { win: false, line: null };
}

/** Count consecutive same-player cells from (row+dr, col+dc) outward. */
function walk(board, row, col, dr, dc, player, size) {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (isInBounds(r, c, size) && board[r][c] === player) {
    count += 1;
    r += dr;
    c += dc;
  }
  return { count };
}

/** A run-end is "blocked" if it's off-board OR occupied by the opponent. */
function isBlocked(board, r, c, player, size) {
  if (!isInBounds(r, c, size)) return true;
  const cell = board[r][c];
  return cell !== EMPTY && cell !== player;
}

/** Build the winning cell list from the move outwards (back ... move ... fwd). */
function buildLine(row, col, dr, dc, backCount, fwdCount) {
  const cells = [];
  for (let i = backCount; i >= 1; i -= 1) {
    cells.push({ row: row - dr * i, col: col - dc * i });
  }
  cells.push({ row, col });
  for (let i = 1; i <= fwdCount; i += 1) {
    cells.push({ row: row + dr * i, col: col + dc * i });
  }
  return cells;
}

/** True if board is fully occupied with no winner. */
export function checkDraw(state) {
  if (state.status === STATUS_WON) return false;
  return state.history.length >= state.size * state.size;
}

/**
 * Undo the last move. No-op on empty history.
 * @returns {boolean} true if a move was undone.
 */
export function undoMove(state) {
  const last = state.history.pop();
  if (!last) return false;
  state.board[last.row][last.col] = EMPTY;
  state.status = STATUS_PLAYING;
  state.winner = null;
  state.winLine = null;
  state.currentPlayer = last.player;
  return true;
}

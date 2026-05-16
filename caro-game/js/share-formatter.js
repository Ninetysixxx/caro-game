// share-formatter.js — build emoji grid + share text from game/puzzle results

/**
 * Format daily puzzle result for sharing.
 * @param {Object} opts
 * @param {number|string} opts.puzzleId
 * @param {number} opts.attempts
 * @param {number} opts.maxMoves
 * @param {boolean} opts.won
 * @param {string[]} [opts.moveQuality] — 'best' | 'ok' | 'miss'
 * @returns {string}
 */
export function formatPuzzleResult({ puzzleId, attempts, maxMoves, won, moveQuality = [] } = {}) {
  const score = won ? `${attempts}/${maxMoves}` : 'X/X';
  const emojis = moveQuality
    .map(q => (q === 'best' ? '🟩' : q === 'ok' ? '🟨' : '🟥'))
    .join('');
  return `Cờ Caro #${puzzleId} — ${score}\n${emojis}\n#CaroVN`;
}

/**
 * Format a regular game win/draw result for sharing.
 * @param {Object} opts
 * @param {string} opts.mode — 'ai' | 'hotseat'
 * @param {string|null} opts.winner — 'X' | 'O' | null (draw)
 * @param {number} opts.moves — total moves played
 * @returns {string}
 */
export function formatWinResult({ mode, winner, moves } = {}) {
  if (winner === null) {
    return `Hòa sau ${moves} nước 🤝\nCờ Caro VN`;
  }
  if (mode === 'ai') {
    const tag = winner === 'X' ? 'Đánh bại AI 🤖' : 'AI đã thắng';
    return `${tag}\nVán ${moves} nước • Cờ Caro VN`;
  }
  return `${winner} thắng!\nVán ${moves} nước • Cờ Caro VN`;
}

/**
 * Format generic "share this game" text.
 * @param {string} [url]
 * @returns {string}
 */
export function formatInviteText(url = '') {
  const base = 'Chơi Cờ Caro VN — daily puzzle, vs AI, 2 người 🎮';
  return url ? `${base}\n${url}` : base;
}

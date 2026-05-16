// board-snapshot.js — render final board to canvas, return PNG blob / dataURL

/**
 * Render the current board state to a canvas and return a PNG Blob.
 * Falls back to HTMLCanvasElement (non-OffscreenCanvas) for broader compatibility.
 * @param {Object} state — game state from game.js
 * @param {Object} opts
 * @param {number} [opts.cellSize=24]
 * @param {number} [opts.padding=16]
 * @param {string} [opts.bg='#1e1e2e']
 * @param {string} [opts.boardColor='#f9efd8']
 * @param {string} [opts.lineColor='#8b6f47']
 * @param {string} [opts.xColor='#d63031']
 * @param {string} [opts.oColor='#0984e3']
 * @param {string} [opts.winLineColor='#fdcb6e']
 * @returns {Promise<Blob>}
 */
export async function snapshotBoard(state, opts = {}) {
  const {
    cellSize = 24,
    padding = 16,
    bg = '#1e1e2e',
    boardColor = '#f9efd8',
    lineColor = '#8b6f47',
    xColor = '#d63031',
    oColor = '#0984e3',
    winLineColor = '#fdcb6e',
  } = opts;

  const size = state.size || 20;
  const total = size * cellSize + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, total, total);

  // Board background
  const boardPx = size * cellSize;
  const boardX = padding;
  const boardY = padding;
  ctx.fillStyle = boardColor;
  ctx.fillRect(boardX, boardY, boardPx, boardPx);

  // Grid lines
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= size; i++) {
    const pos = i * cellSize;
    // vertical
    ctx.moveTo(boardX + pos, boardY);
    ctx.lineTo(boardX + pos, boardY + boardPx);
    // horizontal
    ctx.moveTo(boardX, boardY + pos);
    ctx.lineTo(boardX + boardPx, boardY + pos);
  }
  ctx.stroke();

  // Pieces
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = state.board[r][c];
      if (!val) continue;
      const cx = boardX + c * cellSize + cellSize / 2;
      const cy = boardY + r * cellSize + cellSize / 2;
      ctx.fillStyle = val === 'X' ? xColor : oColor;
      ctx.font = `bold ${Math.floor(cellSize * 0.65)}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
      ctx.fillText(val, cx, cy + 1); // +1 optical correction
    }
  }

  // Win line
  if (state.winLine && state.winLine.length >= 2) {
    ctx.strokeStyle = winLineColor;
    ctx.lineWidth = Math.max(3, Math.floor(cellSize * 0.15));
    ctx.lineCap = 'round';
    ctx.beginPath();
    const first = state.winLine[0];
    const last = state.winLine[state.winLine.length - 1];
    ctx.moveTo(
      boardX + first.col * cellSize + cellSize / 2,
      boardY + first.row * cellSize + cellSize / 2
    );
    ctx.lineTo(
      boardX + last.col * cellSize + cellSize / 2,
      boardY + last.row * cellSize + cellSize / 2
    );
    ctx.stroke();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

/**
 * Download a Blob as a file.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

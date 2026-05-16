// board-snapshot.js — render final board to canvas, return PNG blob / dataURL

import { drawBoardBase } from './replay-renderer.js';

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

  const { cellSize: actualCellSize } = drawBoardBase(ctx, size, total, opts);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = state.board[r][c];
      if (!val) continue;
      const cx = padding + c * actualCellSize + actualCellSize / 2;
      const cy = padding + r * actualCellSize + actualCellSize / 2;
      ctx.fillStyle = val === 'X' ? xColor : oColor;
      ctx.font = `bold ${Math.floor(actualCellSize * 0.65)}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
      ctx.fillText(val, cx, cy + 1); // +1 optical correction
    }
  }

  // Win line
  if (state.winLine && state.winLine.length >= 2) {
    ctx.strokeStyle = winLineColor;
    ctx.lineWidth = Math.max(3, Math.floor(actualCellSize * 0.15));
    ctx.lineCap = 'round';
    ctx.beginPath();
    const first = state.winLine[0];
    const last = state.winLine[state.winLine.length - 1];
    ctx.moveTo(
      padding + first.col * actualCellSize + actualCellSize / 2,
      padding + first.row * actualCellSize + actualCellSize / 2
    );
    ctx.lineTo(
      padding + last.col * actualCellSize + actualCellSize / 2,
      padding + last.row * actualCellSize + actualCellSize / 2
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

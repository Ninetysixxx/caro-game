// replay-renderer.js — frame-by-frame board renderer for replay export

export const REPLAY_SIZE = 720;

/**
 * Draw the board background and grid.
 * @returns {{cellSize:number, boardPx:number, padding:number}}
 */
export function drawBoardBase(ctx, size, canvasSize, opts = {}) {
  const {
    padding = 16,
    bg = '#1e1e2e',
    boardColor = '#f9efd8',
    lineColor = '#8b6f47',
  } = opts;

  const boardPx = canvasSize - padding * 2;
  const cellSize = boardPx / size;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Board background
  ctx.fillStyle = boardColor;
  ctx.fillRect(padding, padding, boardPx, boardPx);

  // Grid lines
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= size; i++) {
    const pos = i * cellSize;
    ctx.moveTo(padding + pos, padding);
    ctx.lineTo(padding + pos, padding + boardPx);
    ctx.moveTo(padding, padding + pos);
    ctx.lineTo(padding + boardPx, padding + pos);
  }
  ctx.stroke();

  return { cellSize, boardPx, padding };
}

/**
 * Draw pieces up to a given move index (inclusive).
 */
export function drawPieces(ctx, state, upToMoveIdx, opts = {}) {
  const {
    xColor = '#d63031',
    oColor = '#0984e3',
    padding = 16,
    cellSize,
  } = opts;

  if (!cellSize) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const limit = Math.min(upToMoveIdx, state.history.length - 1);
  for (let i = 0; i <= limit; i++) {
    const move = state.history[i];
    if (!move) continue;
    const { row, col, player } = move;
    const cx = padding + col * cellSize + cellSize / 2;
    const cy = padding + row * cellSize + cellSize / 2;
    ctx.fillStyle = player === 'X' ? xColor : oColor;
    ctx.font = `bold ${Math.floor(cellSize * 0.65)}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
    ctx.fillText(player, cx, cy + 1);
  }
}

/**
 * Draw the full win line.
 */
export function drawWinLine(ctx, winLine, opts = {}) {
  const {
    winLineColor = '#fdcb6e',
    padding = 16,
    cellSize,
  } = opts;
  if (!winLine || winLine.length < 2 || !cellSize) return;

  ctx.strokeStyle = winLineColor;
  ctx.lineWidth = Math.max(3, Math.floor(cellSize * 0.15));
  ctx.lineCap = 'round';
  ctx.beginPath();
  const first = winLine[0];
  const last = winLine[winLine.length - 1];
  ctx.moveTo(
    padding + first.col * cellSize + cellSize / 2,
    padding + first.row * cellSize + cellSize / 2
  );
  ctx.lineTo(
    padding + last.col * cellSize + cellSize / 2,
    padding + last.row * cellSize + cellSize / 2
  );
  ctx.stroke();
}

/**
 * Draw the win line partially based on progress (0..1).
 */
export function drawWinLineAnimated(ctx, winLine, progress, opts = {}) {
  const {
    winLineColor = '#fdcb6e',
    padding = 16,
    cellSize,
  } = opts;
  if (!winLine || winLine.length < 2 || !cellSize || progress <= 0) return;

  const p = Math.min(1, progress);

  const first = winLine[0];
  const last = winLine[winLine.length - 1];
  const x1 = padding + first.col * cellSize + cellSize / 2;
  const y1 = padding + first.row * cellSize + cellSize / 2;
  const x2 = padding + last.col * cellSize + cellSize / 2;
  const y2 = padding + last.row * cellSize + cellSize / 2;

  const curX = x1 + (x2 - x1) * p;
  const curY = y1 + (y2 - y1) * p;

  ctx.save();
  ctx.strokeStyle = winLineColor;
  ctx.lineWidth = Math.max(3, Math.floor(cellSize * 0.15));
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(curX, curY);
  ctx.stroke();
  ctx.restore();
}

/**
 * Render a single replay frame showing state up to `moveIndex`.
 */
export function renderFrame(ctx, state, moveIndex, opts = {}) {
  const { cellSize, padding } = drawBoardBase(ctx, state.size, REPLAY_SIZE, opts);
  drawPieces(ctx, state, moveIndex, { ...opts, cellSize, padding });
  if (moveIndex >= state.history.length - 1 && state.winLine) {
    drawWinLine(ctx, state.winLine, { ...opts, cellSize, padding });
  }
}

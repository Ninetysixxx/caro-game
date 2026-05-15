// ui.js — DOM rendering + event delegation (Phase 3)

import { BOARD_SIZE } from './game.js';

// Module-level refs set by initBoard
let _container = null;
let _size = BOARD_SIZE;
let _clickHandler = null;
let _boardDisabled = false;
let _lastMoveEl = null;
let _svgEl = null;
let _statusEl = null;
let _lastWinLine = null;

// ── Init ──────────────────────────────────────────────────────────────────────

export function initBoard(containerEl, size = BOARD_SIZE) {
  _container = containerEl;
  _size = size;
  _lastMoveEl = null;
  _lastWinLine = null;
  _container.dataset.size = String(size);

  const frag = document.createDocumentFragment();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Hàng ${r + 1}, Cột ${c + 1}, trống`);
      frag.appendChild(cell);
    }
  }
  _container.innerHTML = '';
  _container.appendChild(frag);

  _container.style.gridTemplateColumns = `repeat(${size}, var(--cell-size))`;
  _container.style.gridTemplateRows = `repeat(${size}, var(--cell-size))`;

  _container.addEventListener('click', _onBoardClick);
  _statusEl = document.getElementById('status-bar');

  // SVG overlay lives INSIDE the grid so it scrolls with cells on mobile.
  _svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  _svgEl.classList.add('win-overlay');
  _svgEl.setAttribute('aria-hidden', 'true');
  _container.appendChild(_svgEl);

  // Redraw win line on resize so coords stay aligned.
  window.addEventListener('resize', _onResize);
}

function _onResize() {
  if (_lastWinLine) drawWinLine(_lastWinLine);
}

function _onBoardClick(e) {
  if (_boardDisabled) return;
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);
  if (_clickHandler) _clickHandler(row, col);
}

// ── Render ────────────────────────────────────────────────────────────────────

export function renderBoard(state) {
  // Back-compat: called by Phase 1/2 scaffold with (rootEl) — ignore
  if (!state || typeof state !== 'object' || !state.board) return;
  if (!_container) return;

  const cells = _container.querySelectorAll('.cell');
  const board = state.board;
  cells.forEach(cell => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    const val = board[r][c];
    const isX = val === 'X';
    const isO = val === 'O';
    cell.classList.toggle('x', isX);
    cell.classList.toggle('o', isO);
    const mark = isX ? 'X' : isO ? 'O' : 'trống';
    cell.setAttribute('aria-label', `Hàng ${r + 1}, Cột ${c + 1}, ${mark}`);
  });
}

// ── Highlight last move ───────────────────────────────────────────────────────

export function highlightLastMove(row, col) {
  if (_lastMoveEl) _lastMoveEl.classList.remove('last-move');
  if (!_container) return;
  const cell = _container.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (cell) {
    cell.classList.add('last-move');
    _lastMoveEl = cell;
  }
}

// ── Win line SVG ──────────────────────────────────────────────────────────────

export function drawWinLine(winLine) {
  if (!_svgEl || !winLine || winLine.length < 2) return;
  _svgEl.innerHTML = '';
  _lastWinLine = winLine;

  const first = _getCellCenter(winLine[0].row, winLine[0].col);
  const last = _getCellCenter(winLine[winLine.length - 1].row, winLine[winLine.length - 1].col);
  if (!first || !last) return;

  // Coords are relative to the grid container (SVG is its child).
  const gridRect = _container.getBoundingClientRect();
  const x1 = first.x - gridRect.left;
  const y1 = first.y - gridRect.top;
  const x2 = last.x - gridRect.left;
  const y2 = last.y - gridRect.top;

  _svgEl.setAttribute('width', gridRect.width);
  _svgEl.setAttribute('height', gridRect.height);

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.classList.add('win-line');
  _svgEl.appendChild(line);
  _svgEl.classList.add('is-visible');
}

export function clearWinLine() {
  if (!_svgEl) return;
  _svgEl.innerHTML = '';
  _svgEl.classList.remove('is-visible');
  _lastWinLine = null;
}

function _getCellCenter(row, col) {
  if (!_container) return null;
  const cell = _container.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (!cell) return null;
  const r = cell.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// ── Status ────────────────────────────────────────────────────────────────────

export function updateStatus(elOrText, text) {
  // Support both new signature updateStatus(text) and old updateStatus(el, text)
  if (typeof elOrText === 'string') {
    const el = _statusEl || document.getElementById('status-bar');
    if (el) el.textContent = elOrText;
  } else {
    if (elOrText) elOrText.textContent = text;
  }
}

// ── Board enable/disable ──────────────────────────────────────────────────────

export function disableBoard() {
  _boardDisabled = true;
  if (_container) _container.classList.add('disabled');
}

export function enableBoard() {
  _boardDisabled = false;
  if (_container) _container.classList.remove('disabled');
}

// ── Click handler registration ────────────────────────────────────────────────

export function setCellClickHandler(callback) {
  _clickHandler = callback;
}

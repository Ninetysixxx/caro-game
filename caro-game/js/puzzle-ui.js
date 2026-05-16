// puzzle-ui.js — daily mode UI: goal banner, attempt dots, result modal, streak display

import { formatGoal, gradeMove } from './puzzle-engine.js';

let _bannerEl = null;
let _dotsEl = null;
let _modalEl = null;
let _streakEl = null;

// ── Banner + Attempts ─────────────────────────────────────────────────────────

/** Build and inject the goal banner above the board. */
export function initDailyBanner(puzzle) {
  removeDailyBanner();

  const wrapper = document.querySelector('.board-wrapper');
  if (!wrapper) return;

  _bannerEl = document.createElement('div');
  _bannerEl.className = 'puzzle-banner';
  _bannerEl.innerHTML = `
    <span class="puzzle-goal">${formatGoal(puzzle)} <small class="puzzle-utc">(UTC)</small></span>
    <span class="puzzle-attempts" role="img" aria-label="Số nước còn lại"></span>
  `;
  wrapper.insertBefore(_bannerEl, wrapper.firstChild);
  _dotsEl = _bannerEl.querySelector('.puzzle-attempts');
}

export function removeDailyBanner() {
  if (_bannerEl) {
    _bannerEl.remove();
    _bannerEl = null;
    _dotsEl = null;
  }
}

/** Render attempt dots ● (used) / ○ (remaining). */
export function updateAttempts(used, max) {
  if (!_dotsEl) return;
  const filled = '\u25CF'; // ●
  const empty = '\u25CB';  // ○
  let dots = '';
  for (let i = 0; i < max; i++) dots += i < used ? filled : empty;
  _dotsEl.textContent = dots;
  _dotsEl.setAttribute('aria-label', `Đã dùng ${used}/${max} nước`);
}

// ── Result Modal ───────────────────────────────────────────────────────────────

export function showResultModal(result, puzzle, streak, moveGrades, actualMoveCount, puzzleNumber) {
  hideResultModal();

  const won = result.status === 'success';
  const title = won ? (result.reason === 'survived' ? 'Phòng thủ thành công!' : 'Chiến thắng!') : 'Thua rồi!';
  const scoreLabel = won ? `${actualMoveCount}/${puzzle.maxMoves}` : 'X';
  const subtitle = won
    ? `Puzzle #${puzzleNumber} — ${scoreLabel}`
    : result.reason === 'max-moves'
      ? `Hết ${puzzle.maxMoves} nước`
      : result.reason === 'opponent-win'
        ? 'Đối thủ đã thắng'
        : 'Không hoàn thành mục tiêu';

  const shareText = buildShareText(puzzleNumber, won, moveGrades, scoreLabel);

  _modalEl = document.createElement('div');
  _modalEl.className = 'puzzle-modal';
  _modalEl.setAttribute('role', 'dialog');
  _modalEl.setAttribute('aria-modal', 'true');
  _modalEl.setAttribute('aria-label', 'Kết quả puzzle');
  _modalEl.innerHTML = `
    <div class="puzzle-modal-backdrop"></div>
    <div class="puzzle-modal-panel">
      <h2 class="puzzle-modal-title">${title}</h2>
      <p class="puzzle-modal-subtitle">${subtitle}</p>
      <div class="puzzle-modal-emoji" aria-label="Kết quả theo nước đi">${moveGrades.join('')}</div>
      <div class="puzzle-modal-streak">
        <span class="streak-current">🔥 ${streak.current}</span>
        <span class="streak-max">🏆 ${streak.max}</span>
      </div>
      <div class="puzzle-modal-actions">
        <button type="button" class="ctrl-btn" id="puzzle-share-btn" aria-label="Chia sẻ kết quả">Chia sẻ</button>
        <button type="button" class="ctrl-btn" id="puzzle-close-btn" aria-label="Đóng">Đóng</button>
      </div>
    </div>
  `;
  document.body.appendChild(_modalEl);

  // Focus trap: focus the close button
  const closeBtn = _modalEl.querySelector('#puzzle-close-btn');
  const shareBtn = _modalEl.querySelector('#puzzle-share-btn');
  if (closeBtn) closeBtn.focus();

  closeBtn.addEventListener('click', hideResultModal);
  shareBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareText).catch(() => {});
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    }
    shareBtn.textContent = 'Đã sao chép!';
    setTimeout(() => { shareBtn.textContent = 'Chia sẻ'; }, 1500);
  });

  // Close on backdrop click
  _modalEl.querySelector('.puzzle-modal-backdrop').addEventListener('click', hideResultModal);
  // Close on Escape
  document.addEventListener('keydown', _onEsc);
}

export function hideResultModal() {
  if (_modalEl) {
    _modalEl.remove();
    _modalEl = null;
  }
  document.removeEventListener('keydown', _onEsc);
}

function _onEsc(e) {
  if (e.key === 'Escape') hideResultModal();
}

/** Build the shareable text with emoji grid. */
export function buildShareText(puzzleNumber, won, moveGrades, scoreLabel) {
  return `Cờ Caro #${puzzleNumber} — ${scoreLabel}\n${moveGrades.join('')}\n#CaroVN\ncaro.app`;
}

// ── Streak Display (header) ────────────────────────────────────────────────────

export function initStreakDisplay() {
  const header = document.querySelector('.app-header');
  if (!header || document.querySelector('.streak-display')) return;

  _streakEl = document.createElement('div');
  _streakEl.className = 'streak-display';
  _streakEl.innerHTML = '<span class="streak-icon">🔥</span><span class="streak-value">0</span>';
  header.appendChild(_streakEl);
}

export function updateStreakDisplay(current, max) {
  if (!_streakEl) {
    _streakEl = document.querySelector('.streak-display');
    if (!_streakEl) {
      initStreakDisplay();
      _streakEl = document.querySelector('.streak-display');
    }
  }
  if (!_streakEl) return;
  const val = _streakEl.querySelector('.streak-value');
  if (val) val.textContent = `${current}/${max}`;
}

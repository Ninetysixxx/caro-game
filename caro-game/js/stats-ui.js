// stats-ui.js — stats dashboard modal render + share

import { loadStats, getWinRate } from './stats.js';
import { ACHIEVEMENTS } from './achievements.js';
import { loadStreak } from './streak.js';
import { shareContent, showToast, showManualCopy } from './share.js';

let _modalEl = null;
let _lastFocus = null;
let _origOverflow = '';

export function toggleStatsModal() {
  if (_modalEl) {
    closeStatsModal();
    return;
  }
  openStatsModal();
}

export function openStatsModal() {
  closeStatsModal();
  _lastFocus = document.activeElement;
  _origOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const stats = loadStats();
  const streak = loadStreak();

  const dailyRate = getWinRate('daily', stats);
  const aiRate = getWinRate('ai', stats);
  const hotseatRate = getWinRate('hotseat', stats);
  const dist = stats.daily.distribution;
  const maxDist = Math.max(1, ...dist);

  // Highlight bar for the most recent daily puzzle attempt count
  const latestEntry = streak.history[streak.history.length - 1];
  const latestAttempts = latestEntry && latestEntry.won ? latestEntry.attempts : null;

  const distHtml = dist
    .map((count, idx) => {
      const pct = Math.round((count / maxDist) * 100);
      const label = idx + 1;
      const isHighlight = latestAttempts === label;
      return `
        <div class="dist-row">
          <span class="dist-label">${label}</span>
          <div class="dist-bar-wrap">
            <div class="dist-bar ${isHighlight ? 'is-highlight' : ''}" style="width:${pct}%" role="img" aria-label="${count} lần"></div>
          </div>
          <span class="dist-count">${count}</span>
        </div>
      `;
    })
    .join('');

  const achievementsHtml = ACHIEVEMENTS.map((a) => {
    const unlocked = stats.achievements.includes(a.id);
    return `
      <div class="achieve-card ${unlocked ? '' : 'is-locked'}" title="${a.desc}">
        <span class="achieve-icon">${unlocked ? a.icon : '🔒'}</span>
        <span class="achieve-title">${a.title}</span>
      </div>
    `;
  }).join('');

  _modalEl = document.createElement('div');
  _modalEl.className = 'stats-modal';
  _modalEl.setAttribute('role', 'dialog');
  _modalEl.setAttribute('aria-modal', 'true');
  _modalEl.setAttribute('aria-label', 'Thống kê');

  _modalEl.innerHTML = `
    <div class="stats-modal-backdrop"></div>
    <div class="stats-modal-panel">
      <h2 class="stats-modal-title">📊 Thống kê</h2>

      <div class="stats-section">
        <h3 class="stats-section-title">Daily Puzzle</h3>
        <div class="stats-grid">
          <div class="stats-cell"><span class="stats-val">🔥 ${streak.current}</span><span class="stats-label">Streak</span></div>
          <div class="stats-cell"><span class="stats-val">🏆 ${streak.max}</span><span class="stats-label">Max streak</span></div>
          <div class="stats-cell"><span class="stats-val">${stats.daily.totalPlayed}</span><span class="stats-label">Đã chơi</span></div>
          <div class="stats-cell"><span class="stats-val">${dailyRate}%</span><span class="stats-label">Win rate</span></div>
        </div>
        <div class="stats-dist">
          <p class="stats-dist-title">Phân bố nước đi</p>
          ${distHtml}
        </div>
      </div>

      <div class="stats-section">
        <h3 class="stats-section-title">Vs AI</h3>
        <div class="stats-grid">
          <div class="stats-cell"><span class="stats-val">${stats.ai.wins}</span><span class="stats-label">Thắng</span></div>
          <div class="stats-cell"><span class="stats-val">${stats.ai.losses}</span><span class="stats-label">Thua</span></div>
          <div class="stats-cell"><span class="stats-val">${aiRate}%</span><span class="stats-label">Win rate</span></div>
          <div class="stats-cell"><span class="stats-val">${stats.ai.winStreak.max}</span><span class="stats-label">Win streak max</span></div>
        </div>
      </div>

      <div class="stats-section">
        <h3 class="stats-section-title">Hot-seat</h3>
        <div class="stats-grid">
          <div class="stats-cell"><span class="stats-val">${stats.hotseat.x}</span><span class="stats-label">X thắng</span></div>
          <div class="stats-cell"><span class="stats-val">${stats.hotseat.o}</span><span class="stats-label">O thắng</span></div>
          <div class="stats-cell"><span class="stats-val">${stats.hotseat.draws}</span><span class="stats-label">Hòa</span></div>
          <div class="stats-cell"><span class="stats-val">${hotseatRate}%</span><span class="stats-label">Có thắng</span></div>
        </div>
      </div>

      <div class="stats-section">
        <h3 class="stats-section-title">🏆 Thành tích</h3>
        <div class="achieve-grid">${achievementsHtml}</div>
      </div>

      <div class="stats-modal-actions">
        <button type="button" class="ctrl-btn" id="stats-share-btn" aria-label="Chia sẻ thống kê">Chia sẻ</button>
        <button type="button" class="ctrl-btn" id="stats-close-btn" aria-label="Đóng">Đóng</button>
      </div>
    </div>
  `;

  document.body.appendChild(_modalEl);

  const closeBtn = _modalEl.querySelector('#stats-close-btn');
  const shareBtn = _modalEl.querySelector('#stats-share-btn');
  const backdrop = _modalEl.querySelector('.stats-modal-backdrop');
  const panel = _modalEl.querySelector('.stats-modal-panel');
  closeBtn.focus();

  const onClose = () => closeStatsModal();
  const onShare = async () => {
    try {
      const text = _formatShareText(stats, streak);
      const url = `${location.origin}${location.pathname}`;
      const result = await shareContent({ title: 'Thống kê Cờ Caro VN', text, url });
      if (result.ok && result.method === 'clipboard') {
        showToast('Đã copy thống kê!');
        shareBtn.textContent = 'Đã sao chép!';
        setTimeout(() => { shareBtn.textContent = 'Chia sẻ'; }, 1500);
      } else if (!result.ok && result.method === 'manual') {
        showManualCopy(result.text);
      }
    } catch {
      showToast('Lỗi chia sẻ');
    }
  };

  closeBtn.addEventListener('click', onClose);
  backdrop.addEventListener('click', onClose);
  shareBtn.addEventListener('click', onShare);

  document.addEventListener('keydown', _onKey);

  // Store listeners for cleanup
  _modalEl._listeners = [
    { el: closeBtn, type: 'click', fn: onClose },
    { el: backdrop, type: 'click', fn: onClose },
    { el: shareBtn, type: 'click', fn: onShare },
  ];
  _modalEl._focusables = [closeBtn, shareBtn];
}

export function closeStatsModal() {
  if (_modalEl) {
    if (_modalEl._listeners) {
      _modalEl._listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
    }
    _modalEl.remove();
    _modalEl = null;
  }
  document.removeEventListener('keydown', _onKey);
  document.body.style.overflow = _origOverflow || '';
  if (_lastFocus && _lastFocus.focus) {
    _lastFocus.focus();
    _lastFocus = null;
  }
}

function _onKey(e) {
  if (e.key === 'Escape') {
    closeStatsModal();
    return;
  }
  if (e.key === 'Tab' && _modalEl && _modalEl._focusables) {
    const focusables = _modalEl._focusables.filter((el) => el && !el.disabled);
    const current = document.activeElement;
    const idx = focusables.indexOf(current);
    if (e.shiftKey) {
      const prev = idx <= 0 ? focusables[focusables.length - 1] : focusables[idx - 1];
      if (prev) { e.preventDefault(); prev.focus(); }
    } else {
      const next = idx >= focusables.length - 1 ? focusables[0] : focusables[idx + 1];
      if (next) { e.preventDefault(); next.focus(); }
    }
  }
}

function _formatShareText(stats, streak) {
  const lines = [
    'Thống kê Cờ Caro VN',
    `🔥 Daily streak: ${streak.current} (max ${streak.max})`,
    `🤖 Vs AI: ${stats.ai.wins} thắng / ${stats.ai.losses} thua`,
    `👥 Hot-seat: X ${stats.hotseat.x} — O ${stats.hotseat.o} — Hòa ${stats.hotseat.draws}`,
    `🏆 Thành tích: ${stats.achievements.length}/${ACHIEVEMENTS.length}`,
  ];
  return lines.join('\n');
}

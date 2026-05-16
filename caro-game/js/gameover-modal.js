// gameover-modal.js — end-of-game dialog with share / save / replay actions
//
// Stateless except for a single DOM-attached modal element. Caller passes the
// current state + mode; we wire share/save/replay actions and Escape-to-close.

import { shareContent, showToast, showManualCopy } from './share.js';
import { formatWinResult } from './share-formatter.js';
import { snapshotBoard, downloadBlob } from './board-snapshot.js';

let _modal = null;

export function hideGameOverModal() {
  if (_modal) {
    _modal.remove();
    _modal = null;
  }
  document.removeEventListener('keydown', _onEsc);
}

export function showGameOverModal(state, mode) {
  hideGameOverModal();
  const isDraw = state.status === 'draw';
  const title = isDraw ? 'Hòa!' : `${state.winner} thắng!`;
  const moves = state.history.length;
  const shareText = formatWinResult({ mode, winner: state.winner, moves });
  const url = `${location.origin}${location.pathname}?ref=share`;

  _modal = document.createElement('div');
  _modal.className = 'puzzle-modal';
  _modal.setAttribute('role', 'dialog');
  _modal.setAttribute('aria-modal', 'true');
  _modal.setAttribute('aria-label', 'Kết thúc ván');
  _modal.innerHTML = `
    <div class="puzzle-modal-backdrop"></div>
    <div class="puzzle-modal-panel">
      <h2 class="puzzle-modal-title">${title}</h2>
      <p class="puzzle-modal-subtitle">${moves} nước đã đi</p>
      <div class="puzzle-modal-actions">
        <button type="button" class="ctrl-btn" id="go-share-btn" aria-label="Chia sẻ kết quả">Chia sẻ</button>
        <button type="button" class="ctrl-btn" id="go-replay-btn" aria-label="Lưu replay">Lưu replay</button>
        <button type="button" class="ctrl-btn" id="go-save-btn" aria-label="Lưu ảnh ván cờ">Lưu ảnh</button>
        <button type="button" class="ctrl-btn" id="go-close-btn" aria-label="Đóng">Đóng</button>
      </div>
    </div>
  `;
  document.body.appendChild(_modal);

  const closeBtn = _modal.querySelector('#go-close-btn');
  const shareBtn = _modal.querySelector('#go-share-btn');
  const saveBtn = _modal.querySelector('#go-save-btn');
  const replayBtn = _modal.querySelector('#go-replay-btn');
  closeBtn.focus();

  closeBtn.addEventListener('click', hideGameOverModal);
  _modal.querySelector('.puzzle-modal-backdrop').addEventListener('click', hideGameOverModal);

  replayBtn.addEventListener('click', () => {
    hideGameOverModal();
    import('./replay-ui.js').then((mod) => mod.showReplayModal(state));
  });

  shareBtn.addEventListener('click', async () => {
    const result = await shareContent({ title: 'Cờ Caro VN', text: shareText, url });
    if (result.ok && result.method === 'clipboard') {
      showToast('Đã copy link!');
      shareBtn.textContent = 'Đã sao chép!';
      setTimeout(() => { shareBtn.textContent = 'Chia sẻ'; }, 1500);
    } else if (!result.ok && result.method === 'manual') {
      showManualCopy(result.text);
    }
  });

  saveBtn.addEventListener('click', async () => {
    try {
      const blob = await snapshotBoard(state, { cellSize: 24 });
      const filename = `caro-van-${Date.now()}.png`;
      downloadBlob(blob, filename);
      showToast('Đã lưu ảnh!');
    } catch (e) {
      showToast('Lỗi khi lưu ảnh');
    }
  });

  document.addEventListener('keydown', _onEsc);
}

function _onEsc(e) {
  if (e.key === 'Escape') hideGameOverModal();
}

// replay-ui.js — modal UI for replay export

import { encodeReplay } from './replay-encoder.js';
import { shareContent, showToast } from './share.js';

let _modal = null;
let _abortController = null;
let _currentBlobUrl = null;

export function showReplayModal(state) {
  hideReplayModal();

  _modal = document.createElement('div');
  _modal.className = 'replay-modal';
  _modal.setAttribute('role', 'dialog');
  _modal.setAttribute('aria-modal', 'true');
  _modal.setAttribute('aria-label', 'Lưu replay');
  _modal.innerHTML = `
    <div class="replay-modal-backdrop"></div>
    <div class="replay-modal-panel">
      <h2 class="replay-modal-title">Lưu replay</h2>
      <div class="replay-stage" id="replay-stage">
        <p class="replay-status">Đang tạo replay...</p>
        <div class="replay-progress-wrap">
          <div class="replay-progress-bar" id="replay-progress" style="width:0%"></div>
        </div>
        <div class="replay-modal-actions" style="margin-top:8px">
          <button type="button" class="ctrl-btn" id="replay-cancel-btn">Hủy</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(_modal);

  const cancelBtn = _modal.querySelector('#replay-cancel-btn');
  cancelBtn.addEventListener('click', () => {
    if (_abortController) _abortController.abort();
    hideReplayModal();
  });

  _modal.querySelector('.replay-modal-backdrop').addEventListener('click', () => {
    if (_abortController) _abortController.abort();
    hideReplayModal();
  });

  document.addEventListener('keydown', _onEscReplay);
  startEncoding(state);
}

function hideReplayModal() {
  document.removeEventListener('keydown', _onEscReplay);
  if (_modal) {
    _modal.remove();
    _modal = null;
  }
  if (_currentBlobUrl) {
    URL.revokeObjectURL(_currentBlobUrl);
    _currentBlobUrl = null;
  }
}

function _onEscReplay(e) {
  if (e.key === 'Escape') {
    if (_abortController) _abortController.abort();
    hideReplayModal();
  }
}

function startEncoding(state) {
  _abortController = new AbortController();
  const signal = _abortController.signal;
  const progressBar = document.getElementById('replay-progress');
  const stage = document.getElementById('replay-stage');

  encodeReplay(state, {
    signal,
    onProgress: (p) => {
      if (progressBar) progressBar.style.width = `${Math.round(p * 100)}%`;
    },
  }).then(({ blob, type }) => {
    if (signal.aborted) return;
    const url = URL.createObjectURL(blob);
    _currentBlobUrl = url;
    const isVideo = type.startsWith('video/');

    stage.innerHTML = `
      <div class="replay-preview">
        ${isVideo
          ? `<video src="${url}" autoplay loop muted playsinline controls style="max-width:100%;border-radius:8px;"></video>`
          : `<img src="${url}" alt="Replay GIF" style="max-width:100%;border-radius:8px;">`}
      </div>
      <div class="replay-modal-actions">
        <button type="button" class="ctrl-btn" id="replay-save-btn">Lưu</button>
        <button type="button" class="ctrl-btn" id="replay-share-btn">Chia sẻ</button>
        <button type="button" class="ctrl-btn" id="replay-close-btn">Đóng</button>
      </div>
    `;

    const ext = isVideo ? 'webm' : 'gif';
    const filename = `caro-replay-${Date.now()}.${ext}`;

    document.getElementById('replay-save-btn').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Đã lưu replay!');
    });

    document.getElementById('replay-share-btn').addEventListener('click', async () => {
      const file = new File([blob], filename, { type });
      const result = await shareContent({
        title: 'Cờ Caro VN — Replay',
        text: 'Xem lại ván cờ caro này!',
        file,
      });
      if (result.ok && result.method === 'native') {
        showToast('Đã mở chia sẻ!');
      } else if (result.ok && result.method === 'clipboard') {
        showToast('Đã copy link!');
      } else if (!result.ok && result.method === 'manual') {
        // handled by share.js
      }
    });

    document.getElementById('replay-close-btn').addEventListener('click', () => {
      hideReplayModal();
    });
  }).catch((err) => {
    if (err.message === 'Aborted') return;
    console.error(err);
    if (stage) {
      stage.innerHTML = `
        <p class="replay-status" style="color:#ff7675">Lỗi khi tạo replay.</p>
        <div class="replay-modal-actions">
          <button type="button" class="ctrl-btn" id="replay-close-err">Đóng</button>
        </div>
      `;
      document.getElementById('replay-close-err').addEventListener('click', hideReplayModal);
    }
  });
}

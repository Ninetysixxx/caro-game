let _modal = null;
let _banner = null;
let _latencyEl = null;
let _onCloseCb = null;

export function showCreateRoomModal(roomId, onCopy, onClose) {
  hideRoomModal();
  _onCloseCb = onClose;
  _modal = document.createElement('div');
  _modal.className = 'room-modal';
  _modal.setAttribute('role', 'dialog');
  _modal.setAttribute('aria-modal', 'true');
  _modal.setAttribute('aria-label', 'Phòng chơi');
  const link = `${location.origin}${location.pathname}?room=${roomId}`;
  _modal.innerHTML = `
    <div class="room-modal-backdrop"></div>
    <div class="room-modal-panel">
      <h2 class="room-modal-title">Phòng: ${roomId}</h2>
      <p class="room-modal-subtitle">Gửi link cho bạn bè</p>
      <div class="room-modal-link">
        <input type="text" readonly value="${link}" aria-label="Link phòng" />
        <button type="button" class="ctrl-btn" id="room-copy-btn">Copy</button>
      </div>
      <div class="room-modal-status" id="room-status">Đợi đối thủ...</div>
      <div class="room-modal-actions">
        <button type="button" class="ctrl-btn" id="room-close-btn">Đóng</button>
      </div>
    </div>
  `;
  document.body.appendChild(_modal);

  _modal.querySelector('#room-copy-btn').addEventListener('click', () => {
    onCopy(link);
  });
  _modal.querySelector('#room-close-btn').addEventListener('click', () => {
    hideRoomModal();
  });
  _modal.querySelector('.room-modal-backdrop').addEventListener('click', () => {
    hideRoomModal();
  });
}

export function showJoinRoomModal(onJoin, onCancel) {
  hideRoomModal();
  _onCloseCb = onCancel;
  _modal = document.createElement('div');
  _modal.className = 'room-modal';
  _modal.setAttribute('role', 'dialog');
  _modal.setAttribute('aria-modal', 'true');
  _modal.setAttribute('aria-label', 'Vào phòng');
  _modal.innerHTML = `
    <div class="room-modal-backdrop"></div>
    <div class="room-modal-panel">
      <h2 class="room-modal-title">Vào phòng</h2>
      <p class="room-modal-subtitle">Nhập mã phòng 4 ký tự</p>
      <input type="text" id="room-code-input" maxlength="4" placeholder="AB12" aria-label="Mã phòng" autocomplete="off" style="text-transform:uppercase" />
      <div class="room-modal-actions">
        <button type="button" class="ctrl-btn" id="room-join-btn">Vào</button>
        <button type="button" class="ctrl-btn" id="room-cancel-btn">Hủy</button>
      </div>
    </div>
  `;
  document.body.appendChild(_modal);

  const input = _modal.querySelector('#room-code-input');
  input.focus();

  const doJoin = () => {
    const code = input.value.trim().toUpperCase();
    if (code.length === 4) {
      _onCloseCb = null;
      hideRoomModal();
      onJoin(code);
    } else {
      input.style.outline = '2px solid var(--x)';
      setTimeout(() => { input.style.outline = ''; }, 500);
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doJoin();
  });
  _modal.querySelector('#room-join-btn').addEventListener('click', doJoin);
  _modal.querySelector('#room-cancel-btn').addEventListener('click', () => {
    hideRoomModal();
  });
  _modal.querySelector('.room-modal-backdrop').addEventListener('click', () => {
    hideRoomModal();
  });
}

export function updateRoomStatus(text) {
  const el = document.getElementById('room-status');
  if (el) el.textContent = text;
}

export function hideRoomModal() {
  if (_modal) {
    _modal.remove();
    _modal = null;
  }
  if (_onCloseCb) {
    _onCloseCb();
    _onCloseCb = null;
  }
}

export function showDisconnectBanner() {
  if (_banner) return;
  _banner = document.createElement('div');
  _banner.className = 'disconnect-banner';
  _banner.innerHTML = `<span class="spinner"></span> Mất kết nối — đang kết nối lại...`;
  document.body.appendChild(_banner);
}

export function hideDisconnectBanner() {
  if (_banner) {
    _banner.remove();
    _banner = null;
  }
}

export function showLatency(ms) {
  if (!_latencyEl) {
    _latencyEl = document.createElement('div');
    _latencyEl.className = 'latency-badge';
    const header = document.querySelector('.app-header');
    if (header) header.appendChild(_latencyEl);
  }
  _latencyEl.textContent = `${ms}ms`;
  _latencyEl.classList.toggle('is-high', ms > 500);
}

export function hideLatency() {
  if (_latencyEl) {
    _latencyEl.remove();
    _latencyEl = null;
  }
}

export function showServerNotConfiguredModal(onClose) {
  hideRoomModal();
  _onCloseCb = onClose;
  _modal = document.createElement('div');
  _modal.className = 'room-modal';
  _modal.setAttribute('role', 'dialog');
  _modal.setAttribute('aria-modal', 'true');
  _modal.setAttribute('aria-label', 'Server chưa cấu hình');
  const snippet = `&lt;script&gt;window.CARO_SERVER_URL='https://your-worker.workers.dev'&lt;/script&gt;`;
  _modal.innerHTML = `
    <div class="room-modal-backdrop"></div>
    <div class="room-modal-panel">
      <h2 class="room-modal-title">Online chưa sẵn sàng</h2>
      <p class="room-modal-subtitle">Cần cấu hình URL của Caro server trước khi chơi online.</p>
      <p class="room-modal-subtitle" style="text-align:left;">Thêm vào <code>index.html</code> trước khi nạp <code>main.js</code>:</p>
      <pre style="background:rgba(0,0,0,0.06);padding:8px;border-radius:6px;font-size:12px;overflow:auto;text-align:left;">${snippet}</pre>
      <p class="room-modal-subtitle" style="text-align:left;font-size:12px;">Hoặc deploy server theo hướng dẫn ở <code>caro-server/README.md</code>.</p>
      <div class="room-modal-actions">
        <button type="button" class="ctrl-btn" id="room-close-btn">Đã hiểu</button>
      </div>
    </div>
  `;
  document.body.appendChild(_modal);
  _modal.querySelector('#room-close-btn').addEventListener('click', () => {
    hideRoomModal();
  });
  _modal.querySelector('.room-modal-backdrop').addEventListener('click', () => {
    hideRoomModal();
  });
}

function _onEsc(e) {
  if (e.key === 'Escape') hideRoomModal();
}

document.addEventListener('keydown', _onEsc);

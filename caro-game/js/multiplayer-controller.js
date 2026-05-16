// multiplayer-controller.js — multiplayer setup, connect, and state sync
//
// Owns the multiplayer client instance and translates server messages into
// UI updates. SERVER_URL is passed in (it's null when no real Worker URL
// is configured, in which case the "not configured" modal is shown).

import { MultiplayerClient } from './multiplayer-client.js';
import {
  showCreateRoomModal, showJoinRoomModal, updateRoomStatus,
  showDisconnectBanner, hideDisconnectBanner,
  showLatency, hideLatency, showServerNotConfiguredModal,
} from './room-ui.js';
import { showToast, showManualCopy } from './share.js';
import { renderBoard, highlightLastMove, drawWinLine,
  updateStatus, enableBoard, disableBoard } from './ui.js';

let _multiplayer = null;

export function getMultiplayer() {
  return _multiplayer;
}

export function disconnectMultiplayer() {
  if (_multiplayer) {
    _multiplayer.disconnect();
    _multiplayer = null;
  }
  hideDisconnectBanner();
  hideLatency();
}

export function showMultiplayerSetup(ctx) {
  if (!ctx.serverUrl) {
    showServerNotConfiguredModal(() => ctx.onModeChange('hotseat'));
    return;
  }
  const existing = document.getElementById('mp-setup-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'room-modal';
  modal.id = 'mp-setup-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="room-modal-backdrop"></div>
    <div class="room-modal-panel">
      <h2 class="room-modal-title">Chơi Online</h2>
      <div class="room-modal-actions" style="flex-direction:column;gap:8px;">
        <button type="button" class="ctrl-btn" id="mp-create-btn">Tạo phòng</button>
        <button type="button" class="ctrl-btn" id="mp-join-btn">Vào phòng</button>
        <button type="button" class="ctrl-btn" id="mp-cancel-btn">Hủy</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#mp-create-btn').addEventListener('click', async () => {
    modal.remove();
    await initMultiplayerCreate(ctx);
  });
  modal.querySelector('#mp-join-btn').addEventListener('click', () => {
    modal.remove();
    showJoinRoomModal(
      (code) => initMultiplayerJoin(ctx, code),
      () => ctx.onModeChange('hotseat'),
    );
  });
  modal.querySelector('#mp-cancel-btn').addEventListener('click', () => {
    modal.remove();
    ctx.onModeChange('hotseat');
  });
  modal.querySelector('.room-modal-backdrop').addEventListener('click', () => {
    modal.remove();
    ctx.onModeChange('hotseat');
  });
}

function setupMultiplayerHandlers(ctx) {
  _multiplayer.on('created', (msg) => {
    showCreateRoomModal(msg.room, (link) => {
      navigator.clipboard.writeText(link).then(() => showToast('Đã copy link!')).catch(() => showManualCopy(link));
    }, () => {});
  });

  _multiplayer.on('joined', (msg) => {
    updateRoomStatus(msg.color === 'spectator' ? 'Đang xem' : 'Đối thủ đã vào — bắt đầu!');
    if (msg.state) applyServerState(ctx, msg.state);
  });

  _multiplayer.on('state', (msg) => {
    hideDisconnectBanner();
    applyServerState(ctx, msg.state);
    if (msg.lastMove) highlightLastMove(msg.lastMove.row, msg.lastMove.col);
    if (msg.state.status === 'won' || msg.state.status === 'draw') {
      handleMultiplayerGameOver(ctx);
    }
  });

  _multiplayer.on('opponentLeft', () => {
    updateStatus('Đối thủ đã thoát');
    updateRoomStatus('Đối thủ đã thoát');
  });

  _multiplayer.on('opponentJoined', () => {
    updateRoomStatus('Đối thủ đã vào — bắt đầu!');
  });

  _multiplayer.on('disconnected', () => {
    showDisconnectBanner();
  });

  _multiplayer.on('latency', (ms) => {
    showLatency(ms);
  });

  _multiplayer.on('error', (msg) => {
    showToast(`Lỗi: ${msg.message}`);
  });

  _multiplayer.on('reconnectFailed', () => {
    showToast('Mất kết nối — không thể kết nối lại');
  });
}

export async function initMultiplayerCreate(ctx) {
  _multiplayer = new MultiplayerClient(ctx.serverUrl);
  setupMultiplayerHandlers(ctx);
  try {
    await _multiplayer.create();
  } catch (e) {
    showToast('Không tạo được phòng');
    ctx.onModeChange('hotseat');
  }
}

export async function initMultiplayerJoin(ctx, roomId) {
  _multiplayer = new MultiplayerClient(ctx.serverUrl);
  setupMultiplayerHandlers(ctx);
  try {
    await _multiplayer.join(roomId);
  } catch (e) {
    showToast('Không vào được phòng');
    ctx.onModeChange('hotseat');
  }
}

function applyServerState(ctx, serverState) {
  const s = ctx.state;
  s.board = serverState.board;
  s.currentPlayer = serverState.currentPlayer;
  s.history = serverState.history;
  s.status = serverState.status;
  s.winner = serverState.winner;
  s.winLine = serverState.winLine || null;
  s.size = serverState.size || 20;
  renderBoard(s);
  if (s.winLine) {
    drawWinLine(s.winLine);
    updateStatus(`${s.winner} thắng!`);
    disableBoard();
  } else if (s.status === 'draw') {
    updateStatus('Hòa!');
    disableBoard();
  } else {
    const myTurn = _multiplayer && _multiplayer.color === s.currentPlayer;
    updateStatus(myTurn ? 'Lượt của bạn' : `Lượt: ${s.currentPlayer}`);
    if (_multiplayer && _multiplayer.color !== 'spectator') {
      myTurn ? enableBoard() : disableBoard();
    } else {
      disableBoard();
    }
  }
}

function handleMultiplayerGameOver(ctx) {
  if (ctx.state.winLine) drawWinLine(ctx.state.winLine);
  const myWin = _multiplayer && _multiplayer.color === ctx.state.winner;
  const title = ctx.state.status === 'draw' ? 'Hòa!' : myWin ? 'Bạn thắng!' : 'Bạn thua!';
  updateStatus(title);
  disableBoard();
}

export function checkRoomParam(ctx) {
  const params = new URLSearchParams(location.search);
  const room = params.get('room');
  if (room && /^[A-Z0-9]{4}$/.test(room.toUpperCase())) {
    if (!ctx.serverUrl) {
      showServerNotConfiguredModal(() => {});
      return;
    }
    ctx.onModeChange('multiplayer');
    initMultiplayerJoin(ctx, room.toUpperCase());
  }
}

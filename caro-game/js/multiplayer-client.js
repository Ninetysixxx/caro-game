export class MultiplayerClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.ws = null;
    this.roomId = null;
    this.color = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.latency = null;
    this._pendingMessages = [];
    this._connected = false;
  }

  on(eventType, handler) {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, []);
    this.handlers.get(eventType).push(handler);
    return () => {
      const arr = this.handlers.get(eventType);
      if (arr) {
        const idx = arr.indexOf(handler);
        if (idx !== -1) arr.splice(idx, 1);
      }
    };
  }

  _emit(eventType, data) {
    const arr = this.handlers.get(eventType);
    if (arr) arr.forEach((h) => h(data));
  }

  async create() {
    const res = await fetch(`${this.serverUrl}/create`);
    if (!res.ok) throw new Error('Failed to create room');
    const { room } = await res.json();
    this.roomId = room;
    await this._connect(`/r/${room}`);
    this._send({ type: 'create' });
    return room;
  }

  async join(roomId) {
    this.roomId = roomId;
    await this._connect(`/r/${roomId}`);
    this._send({ type: 'join', room: roomId });
  }

  async _connect(path) {
    const url = `${this.serverUrl.replace(/^http/, 'ws')}${path}`;
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.addEventListener('open', () => {
        this._connected = true;
        this.reconnectAttempts = 0;
        this._flushPending();
        this._startPing();
        resolve();
      });

      this.ws.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch (e) {
          console.error('WS parse error', e);
        }
      });

      this.ws.addEventListener('close', () => {
        this._connected = false;
        this._stopPing();
        this._emit('disconnected');
        this._scheduleReconnect();
      });

      this.ws.addEventListener('error', (err) => {
        this._connected = false;
        reject(err);
      });
    });
  }

  _handleMessage(msg) {
    if (msg.type === 'pong') {
      this.latency = Date.now() - msg.ts;
      this._emit('latency', this.latency);
      return;
    }
    if (msg.type === 'created') {
      this.color = msg.color;
      this._emit('created', msg);
    }
    if (msg.type === 'joined') {
      this.color = msg.color;
      this._emit('joined', msg);
    }
    if (msg.type === 'state') {
      this._emit('state', msg);
    }
    if (msg.type === 'opponent-left') {
      this._emit('opponentLeft', msg);
    }
    if (msg.type === 'opponent-joined') {
      this._emit('opponentJoined', msg);
    }
    if (msg.type === 'error') {
      this._emit('error', msg);
    }
    this._emit('message', msg);
  }

  sendMove(row, col) {
    this._send({ type: 'move', row, col });
  }

  resign() {
    this._send({ type: 'resign' });
  }

  _send(msg) {
    if (this._connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this._pendingMessages.push(msg);
    }
  }

  _flushPending() {
    while (this._pendingMessages.length) {
      const msg = this._pendingMessages.shift();
      this.ws.send(JSON.stringify(msg));
    }
  }

  _startPing() {
    this._stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
      }
    }, 5000);
  }

  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._emit('reconnectFailed');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this._emit('reconnecting', { attempt: this.reconnectAttempts });
      const path = this.roomId ? `/r/${this.roomId}` : null;
      if (!path) return;
      this._connect(path).then(() => {
        if (this.color) {
          this._send({ type: 'join', room: this.roomId });
        }
      }).catch(() => {
        // close event triggers again
      });
    }, delay);
  }

  disconnect() {
    this._stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.maxReconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

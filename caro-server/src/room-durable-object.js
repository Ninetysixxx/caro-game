export class RoomDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    // Identity is anchored to opaque tokens (not clientIds) so a disconnect+reconnect
    // keeps the player on the same color. clientToColor maps the current live
    // socket to a color; playerTokens reserves each seat to the token that claimed it.
    this.playerTokens = { X: null, O: null };
    this.clientToColor = new Map();
    this.clientToToken = new Map();
    this.spectators = [];
    this.gameState = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.roomId = null;
    this.moveTimestamps = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    this.roomId = url.pathname.split('/').pop();

    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    const clientId = crypto.randomUUID();

    this.sessions.set(clientId, server);
    this.lastActivity = Date.now();

    server.accept();

    server.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        this.sendTo(clientId, { type: 'error', code: 'INVALID_JSON', message: 'Invalid JSON' });
        return;
      }
      try {
        this.handleMessage(clientId, server, msg);
      } catch (e) {
        console.error('Server handleMessage error', e);
        this.sendTo(clientId, { type: 'error', code: 'SERVER_ERROR', message: 'Internal server error' });
      }
    });

    server.addEventListener('close', () => {
      this.handleDisconnect(clientId);
    });

    server.addEventListener('error', () => {
      this.handleDisconnect(clientId);
    });

    this.sendTo(clientId, { type: 'connected', clientId });

    await this.state.storage.put('meta', { roomId: this.roomId, createdAt: this.createdAt });

    return new Response(null, { status: 101, webSocket: client });
  }

  handleMessage(clientId, ws, msg) {
    this.lastActivity = Date.now();

    switch (msg.type) {
      case 'create':
        this.handleCreate(clientId, ws, msg.token);
        break;
      case 'join':
        this.handleJoin(clientId, ws, msg.room, msg.token);
        break;
      case 'move':
        this.handleMove(clientId, ws, msg.row, msg.col);
        break;
      case 'resign':
        this.handleResign(clientId, ws);
        break;
      case 'ping':
        this.sendTo(clientId, { type: 'pong', ts: msg.ts });
        break;
      default:
        this.sendTo(clientId, { type: 'error', code: 'UNKNOWN_TYPE', message: 'Unknown message type' });
    }
  }

  _ensureToken(token) {
    // Legacy clients may not send a token — synthesize one so identity logic still works.
    return token || crypto.randomUUID();
  }

  _bindClientToColor(clientId, color, token) {
    this.clientToColor.set(clientId, color);
    this.clientToToken.set(clientId, token);
  }

  handleCreate(clientId, ws, token) {
    token = this._ensureToken(token);

    if (!this.gameState) {
      this.gameState = this.createGameState();
      this.playerTokens.X = token;
    }

    // The X seat is reserved for the first creator's token. Re-creates from the
    // same token are idempotent; from a different token they're an error.
    if (this.playerTokens.X !== token) {
      this.sendTo(clientId, { type: 'error', code: 'ALREADY_CREATED', message: 'Room already created' });
      return;
    }

    this._bindClientToColor(clientId, 'X', token);

    this.sendTo(clientId, {
      type: 'created',
      room: this.roomId,
      color: 'X',
      state: this.gameState,
    });
  }

  handleJoin(clientId, ws, roomId, token) {
    if (roomId && roomId !== this.roomId) {
      this.sendTo(clientId, { type: 'error', code: 'ROOM_MISMATCH', message: 'Room ID mismatch' });
      return;
    }

    token = this._ensureToken(token);

    // Init game state on direct join (e.g. shared room link hit before any create).
    if (!this.gameState) this.gameState = this.createGameState();

    // Token-based seat restore: if this token already owns a color, bind to it.
    let color = null;
    if (this.playerTokens.X === token) color = 'X';
    else if (this.playerTokens.O === token) color = 'O';

    if (color) {
      // Evict any prior live session bound to this color to prevent
      // double-occupancy (one token, two browsers → only the newest wins).
      this._evictColor(color, clientId);
      this._bindClientToColor(clientId, color, token);
      this.sendTo(clientId, { type: 'joined', color, state: this.gameState });
      // Tell peer the seat is reoccupied so any "opponent-left" UI clears.
      this.broadcast({ type: 'opponent-joined' }, clientId);
      this.broadcast({ type: 'state', state: this.gameState, lastMove: null }, clientId);
      return;
    }

    // Fresh token — fill open seats X → O, else spectator.
    if (!this.playerTokens.X) {
      this.playerTokens.X = token;
      this._bindClientToColor(clientId, 'X', token);
      this.sendTo(clientId, { type: 'joined', color: 'X', state: this.gameState });
    } else if (!this.playerTokens.O) {
      this.playerTokens.O = token;
      this._bindClientToColor(clientId, 'O', token);
      this.sendTo(clientId, { type: 'joined', color: 'O', state: this.gameState });
      this.broadcast({ type: 'state', state: this.gameState, lastMove: null });
      this.broadcast({ type: 'opponent-joined' }, clientId);
    } else {
      this.spectators.push(clientId);
      this.sendTo(clientId, { type: 'joined', color: 'spectator', state: this.gameState });
    }
  }

  _evictColor(color, exceptClientId) {
    for (const [otherId, otherColor] of this.clientToColor) {
      if (otherColor === color && otherId !== exceptClientId) {
        // Remove bindings before closing so handleDisconnect doesn't broadcast opponent-left.
        this.clientToColor.delete(otherId);
        this.clientToToken.delete(otherId);
        this.sendTo(otherId, { type: 'error', code: 'SESSION_REPLACED', message: 'Phiên chơi đã bị thay thế' });
        const otherWs = this.sessions.get(otherId);
        if (otherWs) {
          try { otherWs.close(); } catch (e) { /* ignore */ }
        }
      }
    }
  }

  handleMove(clientId, ws, row, col) {
    const now = Date.now();
    const last = this.moveTimestamps.get(clientId) || 0;
    if (now - last < 300) {
      this.sendTo(clientId, { type: 'error', code: 'RATE_LIMIT', message: 'Too fast' });
      return;
    }
    this.moveTimestamps.set(clientId, now);

    if (!this.gameState || this.gameState.status !== 'playing') {
      this.sendTo(clientId, { type: 'error', code: 'NOT_PLAYING', message: 'Game not in progress' });
      return;
    }

    const color = this.clientToColor.get(clientId);
    if (!color || color === 'spectator') {
      this.sendTo(clientId, { type: 'error', code: 'NOT_PLAYER', message: 'You are not a player' });
      return;
    }

    if (this.gameState.currentPlayer !== color) {
      this.sendTo(clientId, { type: 'error', code: 'NOT_YOUR_TURN', message: 'Not your turn' });
      return;
    }

    const size = this.gameState.size || 20;
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= size || col < 0 || col >= size || this.gameState.board[row][col] !== null) {
      this.sendTo(clientId, { type: 'error', code: 'INVALID_MOVE', message: 'Invalid move' });
      return;
    }

    this.gameState.board[row][col] = color;
    this.gameState.history.push({ row, col, player: color });

    const win = this.checkWin(this.gameState.board, row, col, color, size);
    if (win.win) {
      this.gameState.status = 'won';
      this.gameState.winner = color;
      this.gameState.winLine = win.line;
    } else if (this.gameState.history.length >= size * size) {
      this.gameState.status = 'draw';
    } else {
      this.gameState.currentPlayer = color === 'X' ? 'O' : 'X';
    }

    this.broadcast({ type: 'state', state: this.gameState, lastMove: { row, col } });
  }

  handleResign(clientId, ws) {
    const color = this.clientToColor.get(clientId);
    if (!color || color === 'spectator' || !this.gameState) return;
    if (this.gameState.status !== 'playing') return;

    this.gameState.status = 'won';
    this.gameState.winner = color === 'X' ? 'O' : 'X';
    this.broadcast({ type: 'state', state: this.gameState, lastMove: null });
  }

  handleDisconnect(clientId) {
    this.sessions.delete(clientId);
    const color = this.clientToColor.get(clientId);
    this.clientToColor.delete(clientId);
    this.clientToToken.delete(clientId);

    // Tokens persist on disconnect so the same player can rejoin and reclaim their seat.
    // We only broadcast "opponent-left" if no other live session holds that color.
    if (color === 'X' || color === 'O') {
      const stillConnected = Array.from(this.clientToColor.values()).includes(color);
      if (!stillConnected) {
        this.broadcast({ type: 'opponent-left' });
      }
    } else {
      this.spectators = this.spectators.filter((id) => id !== clientId);
    }
  }

  broadcast(msg, excludeClientId = null) {
    const data = JSON.stringify(msg);
    for (const [id, ws] of this.sessions) {
      if (id !== excludeClientId && ws.readyState === 1) {
        try { ws.send(data); } catch (e) { /* ignore */ }
      }
    }
  }

  sendTo(clientId, msg) {
    const ws = this.sessions.get(clientId);
    if (ws && ws.readyState === 1) {
      try { ws.send(JSON.stringify(msg)); } catch (e) { /* ignore */ }
    }
  }

  createGameState() {
    const size = 20;
    return {
      board: Array.from({ length: size }, () => Array(size).fill(null)),
      currentPlayer: 'X',
      history: [],
      status: 'playing',
      winner: null,
      winLine: null,
      size,
    };
  }

  checkWin(board, row, col, player, size) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
      let count = 1;
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === player) {
        count++; r += dr; c += dc;
      }
      const headBlocked = (r < 0 || r >= size || c < 0 || c >= size) || (board[r] && board[r][c] !== null && board[r][c] !== player);
      r = row - dr; c = col - dc;
      while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === player) {
        count++; r -= dr; c -= dc;
      }
      const tailBlocked = (r < 0 || r >= size || c < 0 || c >= size) || (board[r] && board[r][c] !== null && board[r][c] !== player);
      if (count >= 5 && !(headBlocked && tailBlocked)) {
        const line = [];
        let br = row - dr, bc = col - dc;
        while (br >= 0 && br < size && bc >= 0 && bc < size && board[br][bc] === player) {
          line.unshift({ row: br, col: bc });
          br -= dr; bc -= dc;
        }
        line.push({ row, col });
        br = row + dr; bc = col + dc;
        while (br >= 0 && br < size && bc >= 0 && bc < size && board[br][bc] === player) {
          line.push({ row: br, col: bc });
          br += dr; bc += dc;
        }
        return { win: true, line };
      }
    }
    return { win: false, line: null };
  }
}

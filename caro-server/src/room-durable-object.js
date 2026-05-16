export class RoomDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.players = { X: null, O: null };
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
        this.handleCreate(clientId, ws);
        break;
      case 'join':
        this.handleJoin(clientId, ws, msg.room);
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

  handleCreate(clientId, ws) {
    if (!this.gameState) {
      this.gameState = this.createGameState();
      this.players.X = clientId;
    }

    if (this.players.X !== clientId) {
      this.sendTo(clientId, { type: 'error', code: 'ALREADY_CREATED', message: 'Room already created' });
      return;
    }

    this.sendTo(clientId, {
      type: 'created',
      room: this.roomId,
      color: 'X',
      state: this.gameState,
    });
  }

  handleJoin(clientId, ws, roomId) {
    if (roomId && roomId !== this.roomId) {
      this.sendTo(clientId, { type: 'error', code: 'ROOM_MISMATCH', message: 'Room ID mismatch' });
      return;
    }

    if (this.players.X === clientId || this.players.O === clientId) {
      const color = this.players.X === clientId ? 'X' : 'O';
      this.sendTo(clientId, { type: 'joined', color, state: this.gameState });
      return;
    }

    if (!this.players.X) {
      this.players.X = clientId;
      this.sendTo(clientId, { type: 'joined', color: 'X', state: this.gameState });
    } else if (!this.players.O) {
      this.players.O = clientId;
      this.sendTo(clientId, { type: 'joined', color: 'O', state: this.gameState });
      this.broadcast({ type: 'state', state: this.gameState, lastMove: null });
      this.broadcast({ type: 'opponent-joined' }, clientId);
    } else {
      this.spectators.push(clientId);
      this.sendTo(clientId, { type: 'joined', color: 'spectator', state: this.gameState });
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

    const color = this.players.X === clientId ? 'X' : this.players.O === clientId ? 'O' : null;
    if (!color) {
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
    const color = this.players.X === clientId ? 'X' : this.players.O === clientId ? 'O' : null;
    if (!color || !this.gameState) return;
    if (this.gameState.status !== 'playing') return;

    this.gameState.status = 'won';
    this.gameState.winner = color === 'X' ? 'O' : 'X';
    this.broadcast({ type: 'state', state: this.gameState, lastMove: null });
  }

  handleDisconnect(clientId) {
    this.sessions.delete(clientId);
    if (this.players.X === clientId) {
      this.players.X = null;
      this.broadcast({ type: 'opponent-left' });
    } else if (this.players.O === clientId) {
      this.players.O = null;
      this.broadcast({ type: 'opponent-left' });
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

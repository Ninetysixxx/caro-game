---
phase: 7
title: Multiplayer Real-time (Stretch)
tier: Stretch
effort: 12h
status: planned
depends_on: []
---

# Phase 7 — Multiplayer Real-time (Stretch)

## Context Links
- Parent: [plan.md](plan.md)
- Existing game core: `caro-game/js/game.js` (state, makeMove, checkWin)
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
- WebRTC P2P: https://developer.mozilla.org/docs/Web/API/WebRTC_API

## Overview
- **Priority:** P2 (chỉ làm nếu Tier S+A có traction)
- **Status:** planned (gated by metrics)
- **Brief:** Tạo room → share link `caro.app/r/AB12` → friend click → chơi cùng nhau real-time. Multiplayer = mỗi ván tạo 1 link gửi cho người mới = compound viral growth.

## Decision Gate

**Chỉ thực hiện Phase 7 nếu sau Tier A:**
- DAU ≥ 100
- D7 retention ≥ 20%
- Average share clicks/user/week ≥ 1

Nếu không đạt → skip Phase 7, đầu tư polish thêm hoặc pivot.

## Key Insights
- **2 lựa chọn arch:** WebRTC P2P (no backend cost) vs Cloudflare Durable Objects (~free tier).
- **WebRTC P2P** cần signaling server (websocket nhỏ) → vẫn cần backend nhỏ → không đơn giản như tưởng.
- **Cloudflare Durable Objects** = stateful WebSocket server, free tier 1M reqs/day, ~$5/mo nếu vượt. Simpler than WebRTC; broadcast tự nhiên cho spectators.
- **Cần infrastructure** mà các Tier S+A không cần → đó là lý do gate metrics.
- **Connection drop** là edge case lớn nhất → cần state reconcile từ server.

## Requirements

**Functional:**
- "Tạo phòng" button → server tạo room ID 4 ký tự (vd `AB12`) → share link
- Friend click link → join room → assigned color (creator = X, joiner = O)
- Real-time sync moves <300ms WAN
- Reconnect-after-drop: state phục hồi từ server
- Spectator mode: 3rd+ visitor → read-only watch
- Chat (optional, không in scope phase này)
- Timer per turn (optional, sau)

**Non-functional:**
- Latency P50 <200ms, P99 <500ms
- Server cost <$5/mo cho 1000 DAU
- Reconnect <2s

## Architecture

```
caro-game/
├── js/
│   ├── multiplayer-client.js   # NEW — WebSocket client + reconnect
│   ├── room-ui.js              # NEW — create/join room UI, room code copy
│   └── main.js                 # MOD — mode='multiplayer'

caro-server/                    # NEW separate folder
├── wrangler.toml
├── package.json
└── src/
    └── room-durable-object.js  # Cloudflare DO: state + WS handler
```

**Protocol (WebSocket JSON):**
```js
// Client → Server
{ type: 'create' }
{ type: 'join', room: 'AB12' }
{ type: 'move', row, col }
{ type: 'resign' }

// Server → Client
{ type: 'created', room: 'AB12', color: 'X' }
{ type: 'joined', color: 'O', state: {...} }
{ type: 'state', state: {...}, lastMove: {...} }
{ type: 'opponent-left' }
{ type: 'error', code, message }
```

**Server state per room:**
```js
{
  id: 'AB12',
  players: { X: clientId, O: clientId | null },
  spectators: [clientId],
  state: { board, currentPlayer, history, status, ... },
  createdAt: ts,
}
```

**Server auth move:** server validates move legality → reject if illegal → broadcast state to all sockets.

## Related Code Files

**Create — Client:**
- `caro-game/js/multiplayer-client.js` (~150 lines)
- `caro-game/js/room-ui.js` (~120 lines)

**Create — Server:**
- `caro-server/src/room-durable-object.js` (~180 lines)
- `caro-server/wrangler.toml`
- `caro-server/package.json`

**Modify:**
- `caro-game/js/main.js` (+30 lines mode dispatch)
- `caro-game/index.html` (+ mode button "Online", room code input)
- `caro-game/styles.css` (~30 lines room UI)
- `caro-game/sw.js` — KHÔNG cache multiplayer endpoint (network-only)

## Implementation Steps

1. **Set up Cloudflare account + Workers project** — `npx wrangler init caro-server` → choose Durable Objects template.

2. **Write `room-durable-object.js`:**
   - DO class với `fetch(request)` → upgrade WebSocket
   - Maintain in-memory state (durable persist khi reload)
   - Handle messages: validate, mutate, broadcast
   - Room ID gen: 4-char base36, retry collision
   - Cleanup: idle 30 phút → delete state

3. **Worker entry** route `/r/{roomId}` → forward to DO; route `/create` → DO.fetch.

4. **Deploy backend** — `wrangler deploy` → get URL `caro-server.<user>.workers.dev`.

5. **Write `multiplayer-client.js`:**
   ```js
   class MultiplayerClient {
     constructor(url) { this.url = url; this.ws = null; }
     async create() { /* connect + send create */ }
     async join(roomId) { /* connect + send join */ }
     sendMove(row, col) { /* send */ }
     on(eventType, handler) { /* ... */ }
     // Reconnect: exponential backoff, max 5 tries
   }
   ```

6. **Write `room-ui.js`:**
   - Buttons "Tạo phòng" / "Vào phòng" với input room code
   - Modal hiển thị "Phòng: AB12" + button copy link + QR code optional
   - Status "Đợi đối thủ..." → "Đối thủ đã vào" → game start
   - Indicator latency (ping every 5s)
   - Disconnect banner + reconnect spinner

7. **Integrate main.js:**
   - Mode 'multiplayer' → disable AI logic, disable hot-seat
   - `onCellClick` → `multiplayer.sendMove` (không local `makeMove`); server xác thực, broadcast state, render từ server state
   - Authoritative state pattern (no optimistic local)

8. **Test:**
   - 2 browser tabs → create + join → moves sync
   - Drop network 1 tab → reconnect → state preserved
   - 3rd tab → join → spectator mode
   - Multiple rooms concurrent

## Todo List

- [ ] Set up Cloudflare account + Wrangler
- [ ] Scaffold caro-server project
- [ ] Implement room Durable Object (state, WS handler)
- [ ] Implement Worker routes (/create, /r/{id})
- [ ] Deploy to Cloudflare → get production URL
- [ ] Write `multiplayer-client.js` (connect, reconnect, send/recv)
- [ ] Write `room-ui.js` (create/join modals, status banner)
- [ ] Integrate main.js mode dispatch
- [ ] Test 2-player sync (latency)
- [ ] Test reconnect after network drop
- [ ] Test spectator mode
- [ ] Test concurrent rooms (10+)
- [ ] Add QR code button to room modal
- [ ] CORS config on Worker (allow caro-game origin)
- [ ] Document deploy steps in `caro-server/README.md`

## Success Criteria

- 2 players join via room link → moves sync <300ms WAN
- Reconnect-after-drop preserves game state
- Spectator mode read-only works
- Server cost <$5/mo cho 1000 DAU
- No client → server trust violations (all moves validated server-side)

## Risk Assessment

- **WebSocket disconnect on mobile background tab** → server timeout cấu hình; client reconnect aggressive đầu, lazy sau
- **Room collision** — 4-char base36 = 1.6M combinations → đủ ngắn hạn, retry on collide
- **DoS abuse** — rate-limit moves (1/300ms per client), max rooms per IP
- **Cost overrun** — alert Cloudflare khi vượt free tier; auto-disable feature flag nếu >$X/mo
- **Latency spike VN ↔ Cloudflare edge** — VN có CF edge in HCM+HN, OK
- **State desync** — authoritative server pattern eliminates; always re-render từ server state

## Security Considerations

- **Server-side move validation** mandatory (không trust client)
- **CORS** — restrict origin to deploy URL
- **Rate limit** moves: 1 move/300ms/client; auto-disconnect spam
- **No PII** in protocol (chỉ room ID + moves)
- **HTTPS/WSS only**

## Next Steps

- Tier S++: account system (Cloudflare D1 SQL) cho persistent rating, friends list
- Tier S++: matchmaking queue thay random room
- Tier S++: Elo rating leaderboard global

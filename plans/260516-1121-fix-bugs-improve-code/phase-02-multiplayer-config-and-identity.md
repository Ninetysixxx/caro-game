---
phase: 2
title: Multiplayer — server URL config UX + reconnect identity
priority: P0
effort: 2h
status: completed
---

# Phase 2 — Multiplayer Config & Reconnect Identity

## Context

Two related issues from review:

**2A. Placeholder server URL** (`caro-game/js/main.js:39`)
`const SERVER_URL = window.CARO_SERVER_URL || 'https://caro-server.YOUR_USER.workers.dev';`
Literal `YOUR_USER` → online mode silently fails. README mentions config but UX gives no hint.

**2B. Reconnect identity loss** (`caro-server/src/room-durable-object.js`)
Player identity = ephemeral `crypto.randomUUID()` per WS connection. Disconnect + reconnect → new `clientId` → server may assign different color. Phase 7 plan required "state phục hồi từ server" — state restored but identity isn't.

## Files

- Modify: `caro-game/js/main.js` (URL handling) — minimal; will be fully replaced in Phase 3
- Modify: `caro-game/js/multiplayer-client.js` (token persistence)
- Modify: `caro-game/js/room-ui.js` (config-missing banner)
- Modify: `caro-server/src/room-durable-object.js` (identity map by token)
- Modify: `caro-server/src/index.js` (optional: CORS origin from env — split-off to Phase 4)

## Design

### 2A — URL config

1. Default `SERVER_URL` constant becomes `null` when no override and no embedded real URL.
2. If `mode === 'multiplayer'` selected and `SERVER_URL` is `null` / contains `YOUR_USER`: show a config-missing modal explaining how to set `window.CARO_SERVER_URL` (or edit `main.js`), with copy-paste snippet, then revert to hotseat.
3. Keep `window.CARO_SERVER_URL` runtime override as primary mechanism for staging / local dev.

### 2B — Identity restore via opaque token

Client side:
1. On `create()` or `join(roomId)`, generate `playerToken` if not stored: `crypto.randomUUID()`.
2. Persist under `localStorage['caro-mp-token-' + roomId]`.
3. Send `{type: 'create' | 'join', room, token}` to server.

Server side:
1. Add `this.playerTokens = { X: null, O: null }` to room state.
2. `handleCreate(token)`: assign X to `token`, store `playerTokens.X = token`. Map `clientId → 'X'` in a new `this.clientToColor` map.
3. `handleJoin(token)`:
   - If `token === playerTokens.X` → reassign X (slot already theirs); refresh `clientToColor`.
   - Else if `token === playerTokens.O` → reassign O.
   - Else if `playerTokens.X` empty → assign X with this token.
   - Else if `playerTokens.O` empty → assign O with this token.
   - Else → spectator.
4. Replace `players.X / players.O` checks (`handleMove`, `handleResign`, `handleDisconnect`) with `this.clientToColor.get(clientId)`.
5. On disconnect: do NOT null `playerTokens`. Just delete `clientToColor[clientId]`. Token remains reservable. (Optional: stale-token GC after 5 min inactivity — out of scope, YAGNI.)

### Wire-protocol additions

```
Client → Server:
{ type: 'create', token }
{ type: 'join', room, token }

Server → Client (unchanged externally; identity is restored transparently)
```

Backward compatibility: server treats missing `token` as new random token internally (preserves current behavior).

## Steps

### Client

1. In `multiplayer-client.js`, add `_getOrCreateToken(roomId)`:
   ```js
   _getOrCreateToken(roomId) {
     const key = `caro-mp-token-${roomId}`;
     let t = localStorage.getItem(key);
     if (!t) { t = crypto.randomUUID(); try { localStorage.setItem(key, t); } catch {} }
     return t;
   }
   ```
2. In `create()`: after server returns `{room}`, compute token for that room, include in `_send({type:'create', token})`.
3. In `join(roomId)`: compute token before sending `_send({type:'join', room, token})`.
4. In `_scheduleReconnect` → after `_connect`: re-send `{type:'join', room, token}` (token persists). Color is preserved by server.
5. In `main.js`: detect missing/placeholder URL before instantiating `MultiplayerClient`; show config-missing modal via new helper in `room-ui.js`.

### Server

1. In `RoomDurableObject` constructor: add `this.playerTokens = { X: null, O: null }` and `this.clientToColor = new Map()`.
2. `handleCreate(clientId, ws, msg)` becomes token-aware: ensure `gameState`, set `playerTokens.X = msg.token`, `clientToColor.set(clientId, 'X')`, emit `created` as before.
3. `handleJoin(clientId, ws, roomId, token)`:
   - Token match → restore color via `clientToColor.set(clientId, matchedColor)`, emit `joined` with color + `state`, broadcast `state` so peer sees reconnect.
   - Else fill empty token slot (X → O → spectator). Same as today but bound to token instead of clientId.
4. `handleMove`, `handleResign`: replace direct `players.X / players.O` checks with `this.clientToColor.get(clientId)`.
5. `handleDisconnect`: `this.clientToColor.delete(clientId)`; broadcast `opponent-left` only if no active session for that color remains.

### UI

1. In `room-ui.js`, add `showServerNotConfiguredModal(serverUrl)` modal: short copy explaining `window.CARO_SERVER_URL = '...'` + close button → calls `onModeChange('hotseat')`.

## Todo

- [x] Add `_getOrCreateToken` to multiplayer-client
- [x] Wire token into `create` + `join` payloads
- [x] Update server: `playerTokens`, `clientToColor`, refactor handlers
- [x] Add config-missing modal in `room-ui.js`
- [x] Guard `mode === 'multiplayer'` in `main.js` against placeholder URL
- [x] Manual test: open 2 browsers, create+join, refresh one tab → same color restored
- [x] Manual test: missing URL → modal shows + reverts to hotseat
- [x] Run `node js/test-daily.mjs` → still 16/16

## Success Criteria

- After disconnect+reconnect inside same browser tab session: color preserved
- After page refresh: token in localStorage rejoins same color (within same room)
- Without `CARO_SERVER_URL` configured, no broken WebSocket attempt; user sees actionable modal
- Two-client e2e flow on `wrangler dev` works

## Risks

- Token in localStorage is opaque, not auth — anyone with the token can claim the seat. Acceptable for casual game; documented as known limitation.
- Server keeps tokens forever per room (until DO hibernates) — fine, DOs are short-lived for this app.

## Out of Scope

- Don't add display names / chat
- Don't add timer per turn
- Don't add JWT / OAuth
- Don't change wire-protocol message names already used by client

# Caro Server — Cloudflare Workers Backend

Real-time multiplayer backend for the caro-game project. Uses Cloudflare Workers + Durable Objects to manage game rooms and WebSocket connections.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Cloudflare](https://dash.cloudflare.com/sign-up) account (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed globally or use `npx wrangler`

## Setup

```bash
cd caro-server
npm install
```

## Local Development

```bash
npx wrangler dev
```

This starts a local dev server (usually on `http://localhost:8787`).

You can test the API:

```bash
curl http://localhost:8787/create
# → {"room":"AB12"}
```

## Production Deploy

```bash
npx wrangler deploy
```

After deploy, Wrangler prints your Worker URL, e.g.:

```
https://caro-server.<your-subdomain>.workers.dev
```

Note this URL — you'll need it for the client.

## Client Configuration

The caro-game client needs to know where the backend lives.

Open `caro-game/js/main.js` and update the server URL:

```js
const SERVER_URL = window.CARO_SERVER_URL || 'https://caro-server.<your-subdomain>.workers.dev';
```

Or set it at runtime in the browser console before loading:

```js
window.CARO_SERVER_URL = 'https://caro-server.<your-subdomain>.workers.dev';
```

## Production Tips

### Restrict CORS Origins

By default the worker allows all origins (`*`). For production, edit `src/index.js` to restrict CORS to your GitHub Pages domain:

```js
const ALLOWED_ORIGIN = 'https://<your-username>.github.io';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

## Architecture

- `/create` — generates a 4-character room code (e.g. `AB12`)
- `/r/:roomId` — WebSocket endpoint; each room is backed by a `RoomDurableObject` that handles game state and broadcasts moves to both players

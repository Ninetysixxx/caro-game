import { RoomDurableObject } from './room-durable-object.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export { RoomDurableObject };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/create') {
      const roomId = generateRoomId();
      return new Response(JSON.stringify({ room: roomId }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const roomMatch = url.pathname.match(/^\/r\/([A-Z0-9]{4})$/);
    if (roomMatch) {
      const roomId = roomMatch[1];
      const id = env.ROOMS.idFromName(roomId);
      const stub = env.ROOMS.get(id);
      return stub.fetch(request);
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};

function generateRoomId() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

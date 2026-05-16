import { RoomDurableObject } from './room-durable-object.js';

export { RoomDurableObject };

export default {
  async fetch(request, env) {
    // ALLOWED_ORIGIN comes from wrangler vars: set to a specific origin in production
    // (e.g. "https://<user>.github.io") so the Worker only accepts your frontend.
    const allowedOrigin = (env && env.ALLOWED_ORIGIN) || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/create') {
      const roomId = generateRoomId();
      return new Response(JSON.stringify({ room: roomId }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const roomMatch = url.pathname.match(/^\/r\/([A-Z0-9]{4})$/);
    if (roomMatch) {
      const roomId = roomMatch[1];
      const id = env.ROOMS.idFromName(roomId);
      const stub = env.ROOMS.get(id);
      return stub.fetch(request);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
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

const VERSION = 'caro-v5';
const APP_SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.json',
  'js/main.js',
  'js/game.js',
  'js/ai.js',
  'js/ai-easy.js',
  'js/ai-medium.js',
  'js/ai-hard.js',
  'js/ai-strategy.js',
  'js/ai-turn-controller.js',
  'js/ui.js',
  'js/puzzle-bank.js',
  'js/puzzle-engine.js',
  'js/puzzle-ui.js',
  'js/daily-controller.js',
  'js/streak.js',
  'js/stats.js',
  'js/achievements.js',
  'js/stats-ui.js',
  'js/score-store.js',
  'js/gameover-modal.js',
  'js/sw-register.js',
  'js/share.js',
  'js/share-formatter.js',
  'js/board-snapshot.js',
  'js/replay-renderer.js',
  'js/replay-encoder.js',
  'js/replay-ui.js',
  'js/multiplayer-client.js',
  'js/multiplayer-controller.js',
  'js/room-ui.js',
  'vendor/gif.js',
  'vendor/gif.worker.js',
  'og-image.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = req.mode === 'navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('.html');

  if (isHtml) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});

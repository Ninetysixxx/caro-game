---
phase: 1
title: PWA Foundation
tier: S
effort: 3h
status: complete
depends_on: []
---

# Phase 1 — PWA Foundation

## Context Links
- Parent: [plan.md](plan.md)
- Existing entry: `caro-game/index.html`, `caro-game/styles.css`
- Web App Manifest spec: https://developer.mozilla.org/docs/Web/Manifest
- SW best practices: https://web.dev/learn/pwa/service-workers/

## Overview
- **Priority:** P0 (foundation cho retention + install)
- **Status:** planned
- **Brief:** Biến caro-game thành installable PWA — offline play, home screen icon, full-screen mode, update flow.

## Key Insights
- GitHub Pages = HTTPS → PWA requirements satisfied
- Vanilla JS, no build → SW phải plain JS
- iOS Safari hỗ trợ install nhưng không có install prompt → user phải "Add to Home Screen" manual; cần `apple-touch-icon` + `apple-mobile-web-app-capable`
- Cache strategy: **cache-first** cho app shell, **network-first** cho index.html (để update kịp)

## Requirements

**Functional:**
- Installable Chrome/Edge desktop + Android
- "Add to Home Screen" iOS Safari hoạt động đẹp
- Toàn bộ game playable offline sau lần load đầu
- Update flow: bump version → user reload → nhận code mới

**Non-functional:**
- Lighthouse PWA score ≥ 90
- FCP < 1.5s on simulated 3G
- Không phá vỡ accessibility hiện có

## Architecture

```
caro-game/
├── index.html              # MOD: + meta PWA, + link manifest, + register SW
├── manifest.json           # NEW
├── sw.js                   # NEW — service worker (root scope)
├── icons/                  # NEW
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png
└── js/
    └── sw-register.js      # NEW — registration + update detection
```

**SW lifecycle:**
1. `install` → pre-cache app shell, `skipWaiting()`
2. `activate` → delete stale caches by VERSION, `clients.claim()`
3. `fetch` GET → cache-first; index.html → network-first với cache fallback

## Related Code Files

**Create:**
- `caro-game/manifest.json` (~30 lines)
- `caro-game/sw.js` (~60 lines)
- `caro-game/js/sw-register.js` (~40 lines)
- `caro-game/icons/*.png` (4 assets)

**Modify:**
- `caro-game/index.html` (+5 lines: manifest link, apple meta, SW script)

## Implementation Steps

1. **Generate icons** — Render chữ "X" + "O" (màu `--x` `--o`) trên background `--bg` 1024×1024 → downscale 192/512. Maskable cần safe area 10% padding. Tools: `imagemagick` skill hoặc Figma.

2. **Write `manifest.json`:**
```json
{
  "name": "Cờ Caro VN",
  "short_name": "Caro",
  "description": "Cờ caro Việt Nam — chơi đơn, vs AI, daily puzzle",
  "start_url": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1e1e2e",
  "theme_color": "#1e1e2e",
  "icons": [
    {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]
}
```

3. **Write `sw.js`:**
```js
const VERSION = 'caro-v1';
const APP_SHELL = [
  './', 'index.html', 'styles.css', 'manifest.json',
  'js/main.js', 'js/game.js', 'js/ai.js', 'js/ui.js', 'js/sw-register.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Network-first cho HTML (để user nhận update)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Cache-first cho phần còn lại
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
});
```

4. **Write `js/sw-register.js`:**
```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            // Optional: show toast "Có bản cập nhật mới"
          }
        });
      });
    }).catch(err => console.warn('SW register failed', err));
  });
}
```

5. **Update `index.html` `<head>`:**
```html
<link rel="manifest" href="manifest.json" />
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<script src="js/sw-register.js" defer></script>
```

6. **Test** — Chrome DevTools → Application tab → verify manifest + SW. Lighthouse audit (mobile). Network → Offline → reload → game vẫn chạy.

## Todo List

- [x] Generate 4 icon files (192, 512, maskable-512, apple-touch)
- [x] Write `manifest.json`
- [x] Write `sw.js` với network-first cho HTML
- [x] Write `js/sw-register.js`
- [x] Update `index.html` head (5 lines)
- [ ] Lighthouse audit → PWA ≥ 90
- [ ] Test offline play (DevTools offline mode)
- [ ] Test install Chrome desktop
- [ ] Test install Android Chrome
- [ ] Test "Add to Home Screen" iOS Safari
- [ ] Verify maskable icon trên maskable.app

## Success Criteria

- Lighthouse PWA: installable + fast + offline-ready
- Game playable offline 100% sau cold load
- Icon hiển thị đẹp cả maskable lẫn non-maskable
- Bump `VERSION` → reload → user nhận code mới

## Risk Assessment

- **SW cache stale** → strict version bump rule mỗi deploy; document trong commit msg
- **iOS không có install prompt** → thêm UI hint nhỏ "Bấm Share → Thêm vào Màn hình chính" khi detect iOS Safari (Phase 4 enhancement)
- **GH Pages cache headers** → SW cache override; OK

## Security Considerations

- SW chỉ same-origin (default behavior, không cần config)
- HTTPS-only (GH Pages enforce)
- Không cache responses có Authorization header (không có trong project hiện tại)

## Next Steps

- Phase 2 (Daily Puzzle) sẽ thêm puzzle files vào `APP_SHELL` list
- Phase 3 (Share) cần Web Share API → chỉ work trong HTTPS (PWA context OK)

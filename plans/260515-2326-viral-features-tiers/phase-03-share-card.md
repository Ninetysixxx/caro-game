---
phase: 3
title: Share Card + OG Meta
tier: S
effort: 3h
status: complete
depends_on: [2]
---

# Phase 3 — Share Card + OG Meta

## Context Links
- Parent: [plan.md](plan.md)
- Web Share API: https://developer.mozilla.org/docs/Web/API/Web_Share_API
- OG protocol: https://ogp.me/
- Canvas to image: https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/toDataURL

## Overview
- **Priority:** P0 (mỗi share = potential install)
- **Status:** planned
- **Brief:** Thêm share button khắp game (daily result, sau win/lose ván thường). Tạo OG meta để FB/Zalo/Twitter preview đẹp khi paste link. Canvas-based board snapshot làm fallback image.

## Key Insights
- **Web Share API** native trên mobile (iOS Safari + Android Chrome), share text + url + files. Desktop fallback = copy clipboard.
- **OG image trên GH Pages = static** → không thể generate per-game ảnh dynamic. Workaround: 1 default OG image đẹp + share **text + emoji** chính (Wordle pattern, không cần image).
- **Canvas snapshot** dùng để user download/share file PNG ván cờ. ~50KB cho 20×20 board PNG.
- **Vietnamese audience** chủ yếu share Facebook + Zalo → cả 2 đều parse OG meta tốt.

## Requirements

**Functional:**
- Share button trong 3 chỗ: (a) daily result modal, (b) sau game thắng/hòa, (c) header "Share game này"
- Share content:
  - Text: "Cờ Caro #42 — 3/5\n🟩🟨🟥\nChơi: caro.app"
  - URL: deploy URL với query `?ref=share`
- Fallback clipboard nếu không có `navigator.share`
- OG meta: title, description, image (default), twitter:card
- Canvas snapshot: button "Lưu ảnh ván cờ" → download PNG

**Non-functional:**
- Share dialog mở <100ms
- Canvas snapshot generate <500ms cho 20×20

## Architecture

```
caro-game/
├── og-image.png            # NEW — 1200×630 static, branded
├── index.html              # MOD — OG meta tags
└── js/
    ├── share.js            # NEW — Web Share API wrapper + clipboard fallback
    ├── share-formatter.js  # NEW — build emoji grid + text từ game/puzzle result
    └── board-snapshot.js   # NEW — canvas render final board → PNG dataURL
```

**Share flow:**
1. User click share button
2. `share-formatter` build text (puzzle-specific hoặc generic win text)
3. `share` invoke `navigator.share({title, text, url})` hoặc fallback `navigator.clipboard.writeText`
4. Toast "Đã copy!" khi fallback

## Related Code Files

**Create:**
- `caro-game/og-image.png` (1200×630 branded asset)
- `caro-game/js/share.js` (~60 lines)
- `caro-game/js/share-formatter.js` (~80 lines)
- `caro-game/js/board-snapshot.js` (~100 lines)

**Modify:**
- `caro-game/index.html` (+8 lines OG/Twitter meta, +share buttons UI)
- `caro-game/js/main.js` (+15 lines hook share button sau win)
- `caro-game/js/puzzle-ui.js` (Phase 2 modal) hook share button
- `caro-game/styles.css` (~20 lines: share button, toast)
- `caro-game/sw.js` (add new files to APP_SHELL)

## Implementation Steps

1. **Design OG image** (1200×630):
   - Background: `--bg` (#1e1e2e)
   - Center: stylized board 5×5 với pattern thắng đẹp (vd: 5 X chéo + đường thắng vàng)
   - Title: "Cờ Caro VN"
   - Subtitle: "Daily puzzle • vs AI • 2 người"
   - Tool: Figma export hoặc `imagemagick` skill

2. **Add OG meta to `index.html` `<head>`:**
   ```html
   <meta property="og:title" content="Cờ Caro VN" />
   <meta property="og:description" content="Cờ caro Việt Nam — daily puzzle, vs AI, chơi 2 người" />
   <meta property="og:image" content="https://<deploy-url>/og-image.png" />
   <meta property="og:url" content="https://<deploy-url>/" />
   <meta property="og:type" content="website" />
   <meta name="twitter:card" content="summary_large_image" />
   <meta name="twitter:title" content="Cờ Caro VN" />
   <meta name="twitter:image" content="https://<deploy-url>/og-image.png" />
   ```

3. **Write `share.js`:**
   ```js
   export async function shareContent({ title, text, url, file }) {
     const canFiles = file && navigator.canShare?.({ files: [file] });
     try {
       if (navigator.share) {
         await navigator.share(canFiles ? { title, text, url, files: [file] } : { title, text, url });
         return { ok: true, method: 'native' };
       }
     } catch (err) {
       if (err.name === 'AbortError') return { ok: false, aborted: true };
     }
     // Fallback: copy text+url
     await navigator.clipboard.writeText(`${text}\n${url}`);
     return { ok: true, method: 'clipboard' };
   }
   ```

4. **Write `share-formatter.js`:**
   ```js
   export function formatPuzzleResult({ puzzleId, attempts, maxMoves, won, moveQuality }) {
     const score = won ? `${attempts}/${maxMoves}` : 'X/X';
     const emojis = moveQuality.map(q => q === 'best' ? '🟩' : q === 'ok' ? '🟨' : '🟥').join('');
     return `Cờ Caro #${puzzleId} — ${score}\n${emojis}\n#CaroVN`;
   }
   export function formatWinResult({ mode, winner, moves }) {
     const tag = mode === 'ai' ? (winner === 'X' ? 'Đánh bại AI 🤖' : 'AI đã thắng') : `${winner} thắng!`;
     return `${tag}\nVán ${moves} nước • Cờ Caro VN`;
   }
   ```

5. **Write `board-snapshot.js`** — Render final board to canvas, return PNG dataURL or Blob:
   ```js
   export async function snapshotBoard(state, opts = {}) {
     const { cellSize = 24, padding = 16 } = opts;
     const size = state.size;
     const canvas = new OffscreenCanvas(size * cellSize + padding * 2, size * cellSize + padding * 2);
     const ctx = canvas.getContext('2d');
     // Fill board bg, draw grid, draw X/O với colors --x/--o
     // Draw win line nếu state.winLine
     // ... ~80 lines
     return await canvas.convertToBlob({ type: 'image/png' });
   }
   ```

6. **Wire up share buttons:**
   - Daily result modal (Phase 2) → button "Chia sẻ" → `shareContent({ text: formatPuzzleResult(...), url: location.origin })`
   - Win modal (mới) sau game thường → button "Chia sẻ" + "Lưu ảnh ván cờ"
   - Toast "Đã copy link!" khi fallback clipboard

7. **Test:**
   - Chrome desktop: clipboard fallback toast
   - Android Chrome: native share sheet hiện FB/Zalo/Messages
   - iOS Safari: share sheet
   - Paste link vào FB Composer → check preview hiện OG image + title

## Todo List

- [x] Design + export og-image.png (1200×630)
- [x] Add OG/Twitter meta to `index.html`
- [x] Write `share.js` (native + fallback)
- [x] Write `share-formatter.js` (puzzle + game text)
- [x] Write `board-snapshot.js` (canvas → PNG blob)
- [x] Hook share button into daily result modal
- [x] Build win-game modal cho mode thường
- [x] Styling: share button, toast notification
- [x] Update `sw.js` APP_SHELL
- [x] Test FB preview (paste link)
- [x] Test Zalo preview
- [x] Test Twitter card validator (cards-dev.twitter.com)
- [x] Test mobile share sheet iOS + Android

## Success Criteria

- FB / Zalo paste link → preview hiện OG image + title đẹp
- Mobile share button mở native sheet
- Desktop click share → copy clipboard + toast confirm
- Snapshot PNG load đúng colors, win line visible
- Twitter card validator pass

## Risk Assessment

- **OG image static, không personalized** → chấp nhận tradeoff Tier S; nếu cần dynamic, ship Cloudflare Worker sau (Tier B)
- **`navigator.canShare` với files chưa support iOS hoàn toàn** → graceful fallback chỉ share text
- **Clipboard permission denied** (Safari strict) → catch error, show manual "Copy text này" textarea
- **Long URL ngắt khi share Zalo** → dùng URL ngắn `/?d=42` thay vì query dài

## Security Considerations

- Không inline user input vào share text (chỉ puzzle ID + emoji + score — all trusted)
- `og:image` URL phải absolute HTTPS
- Web Share API requires user gesture → button click → OK

## Next Steps

- Phase 4 (Stats): share button stats dashboard "Streak 7 ngày 🔥"
- Phase 6 (Replay GIF): khi có GIF → share file thay vì static PNG

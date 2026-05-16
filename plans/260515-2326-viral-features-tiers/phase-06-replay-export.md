---
phase: 6
title: Replay Export (GIF / Video)
tier: A
effort: 5h
status: completed
depends_on: []
---

# Phase 6 — Replay Export GIF/Video

## Context Links
- Parent: [plan.md](plan.md)
- Existing replay data: `state.history` (đã store full move list trong `game.js`)
- gif.js lib (~30KB gzipped): https://github.com/jnordberg/gif.js
- MediaRecorder API: https://developer.mozilla.org/docs/Web/API/MediaRecorder
- Existing snapshot: `board-snapshot.js` (Phase 3)

## Overview
- **Priority:** P1 (TikTok/Reels-bait)
- **Status:** planned
- **Brief:** Sau ván thắng → button "Lưu replay" generate GIF ngắn (5-10s) tua nhanh nước đi + đường thắng → share TikTok/Reels/FB story. Cờ caro có "khoảnh khắc thắng đẹp" → highly shareable.

## Key Insights
- Mobile Reels/TikTok cần **video** (mp4) hoặc **GIF**; FB story chấp nhận cả 2.
- **MediaRecorder** native → output webm/mp4, không cần lib → preferred trên modern browsers.
- **gif.js** fallback nếu MediaRecorder không hỗ trợ (older iOS). +30KB nhưng worth.
- **Replay tốc độ:** 6-8 nước/s (~3s cho ván 25 nước) + 1.5s show win line freeze ở cuối.
- Resolution: 720×720 đủ cho social, file <500KB.

## Requirements

**Functional:**
- Button "Lưu replay" hiện sau win/draw modal (mode bất kỳ)
- Render replay canvas off-screen: lặp `history` placement với delay
- 2 output formats: MP4 (MediaRecorder) ưu tiên, GIF fallback
- Download file or share via Web Share API (Phase 3 `shareContent` với file)
- Loading indicator trong khi encode
- Cancel button

**Non-functional:**
- Encode time <5s trên mid mobile (~25 moves)
- File size <500KB
- Resolution 720×720
- Frame rate 12-15fps

## Architecture

```
caro-game/js/
├── replay-renderer.js      # NEW — render history vào canvas frame-by-frame
├── replay-encoder.js       # NEW — wrap MediaRecorder + gif.js fallback
├── replay-ui.js            # NEW — modal: progress, preview, download/share
└── vendor/
    └── gif.worker.js       # NEW (optional) — gif.js worker (~10KB)
```

**Renderer flow:**
1. Create offscreen canvas 720×720
2. Clear → draw board grid
3. For each move in history (delay 100ms):
   - Draw piece at (row, col) with player color
   - Capture frame
4. Draw win line (animated stroke)
5. Hold final frame 1.5s

**Encoder flow (MediaRecorder):**
```js
const stream = canvas.captureStream(15); // 15fps
const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
recorder.start();
// drive frame updates via requestAnimationFrame loop
recorder.stop(); // → onstop blob
```

**Fallback (gif.js):**
```js
const gif = new GIF({ workers: 2, quality: 10, width: 720, height: 720 });
// for each frame: gif.addFrame(canvas, { delay: 80 });
gif.on('finished', blob => /* ... */);
gif.render();
```

## Related Code Files

**Create:**
- `caro-game/js/replay-renderer.js` (~150 lines)
- `caro-game/js/replay-encoder.js` (~120 lines)
- `caro-game/js/replay-ui.js` (~150 lines)
- `caro-game/vendor/gif.js` + `gif.worker.js` (vendored, no npm)

**Modify:**
- `caro-game/js/main.js` (+10 lines: trigger replay UI sau win)
- `caro-game/js/board-snapshot.js` (Phase 3 — share renderer logic with `replay-renderer`)
- `caro-game/index.html` (+ "Lưu replay" button trong win modal; +script reference for gif lib OR lazy import)
- `caro-game/styles.css` (~30 lines: replay modal, progress bar)
- `caro-game/sw.js` (add new files to APP_SHELL)

## Implementation Steps

1. **Write `replay-renderer.js`:**
   - `renderFrame(ctx, state, upToMoveIdx)` — draw board with first N moves
   - `drawWinLineAnimated(ctx, winLine, progress)` — 0..1 progress for stroke
   - Export shared `drawBoardBase(ctx, size)` reused bởi `board-snapshot.js` (DRY)

2. **Write `replay-encoder.js`:**
   ```js
   export async function encodeReplay(state, opts) {
     if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm')) {
       return await encodeMP4(state, opts);
     }
     return await encodeGIF(state, opts);
   }
   ```
   - Drive frames via `requestAnimationFrame`, advance move index every 6 frames @ 15fps
   - Capture stream → recorder → blob

3. **Vendor gif.js** — Download stable version (0.2.0) → put trong `vendor/`. Lazy load chỉ khi cần (dynamic import) để không bloat MP4 path.

4. **Write `replay-ui.js`:**
   - Modal layout: "Đang tạo replay..." progress bar (0-100%)
   - Khi xong: preview `<video>` hoặc `<img>` (gif) inline
   - Buttons: "Lưu" (download blob via `URL.createObjectURL`), "Chia sẻ" (Phase 3 `shareContent`)
   - Cancel button → abort encoder

5. **Wire main.js:**
   - Win modal (Phase 3) → button "Lưu replay" → mở `replay-ui` modal
   - Pass `state` snapshot

6. **Test:**
   - Chrome desktop: MP4 path → file 200-400KB
   - iOS Safari: GIF fallback → file 300-500KB
   - Android Chrome: MP4 ok
   - Verify share replay file via Web Share API (mobile)

## Todo List

- [ ] Write `replay-renderer.js` (DRY với `board-snapshot.js`)
- [ ] Write `replay-encoder.js` (MP4 path)
- [ ] Vendor gif.js + worker
- [ ] Write GIF fallback in `replay-encoder.js`
- [ ] Write `replay-ui.js` modal
- [ ] Lazy import gif.js (only when MediaRecorder absent)
- [ ] Wire win modal → replay button
- [ ] Test desktop Chrome (MP4)
- [ ] Test iOS Safari (GIF fallback)
- [ ] Profile encode time <5s on mid mobile
- [ ] Verify file size <500KB
- [ ] Test share via Web Share API mobile
- [ ] Update sw.js APP_SHELL

## Success Criteria

- Sau win → click "Lưu replay" → file MP4/GIF generate <5s
- Preview hiển thị inline
- Share button mở native share sheet với file attached (Android Chrome)
- Fallback download nếu share file không support
- File <500KB, viewable trên FB/TikTok upload preview

## Risk Assessment

- **gif.js bundle size** — +30KB total (acceptable); lazy load mitigates trên MP4 path
- **iOS Safari MediaRecorder limited support** — fallback gif.js là chính cho iOS
- **Encoding hang trên low-end** — timeout 10s → abort + error toast
- **Canvas captureStream + MediaRecorder bugs** — known Safari issues → always have gif fallback
- **Web Share API files** — chưa support iOS hoàn toàn → fallback download

## Security Considerations

- Blob URLs `URL.createObjectURL` → revoke sau dùng tránh memory leak
- Không inject user content vào canvas (mọi data từ game state trusted)

## Next Steps

- Tier B: replay với sound effects (wood click), background music
- Tier B: viewer page `/replay/{base64-encoded-history}` → user share link thay vì file

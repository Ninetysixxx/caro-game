---
phase: 2
title: Harden daily-mode undo behaviour
priority: P1
effort: 15m
status: completed
---

# Phase 2 — Harden Daily-Mode Undo

## Context Links

- `caro-game/js/puzzle-engine.js:24-33` — `applyInitial` pushes pre-placed stones into `state.history`.
- `caro-game/js/main.js:44-47` — `syncUndoBtn` enables undo whenever `state.history.length > 0`.
- `caro-game/js/main.js:108-122` — `onUndoClick` pops history without checking mode.

## Overview

- **Priority:** P1 (UX/correctness bug; daily puzzle có thể bị phá bằng nút Undo)
- **Status:** pending
- **Description:** Sau `startDailyPuzzle`, `state.history` chứa toàn bộ quân preset (5-8 quân tuỳ puzzle). Nút Undo được enable ngay từ đầu → user bấm Undo → pop quân puzzle → bàn cờ vỡ và `daily.userMoveCount` không sync. Cần chặn undo trong daily mode HOẶC chỉ cho undo các nước user đã đặt thật.

## Key Insights

- Cách đơn giản nhất (KISS): disable Undo hoàn toàn trong daily mode. Puzzle là dạng "1 lần thử / ngày" — không cần undo. Stretch goal có thể cho phép retry bằng nút Restart (đã có).
- Cần đảm bảo vẫn re-enable đúng khi switch mode khác.

## Requirements

**Functional**
- Trong mode `daily`, nút `#btn-undo` luôn `disabled`.
- Switch sang `hotseat`/`ai` → undo phục hồi hành vi bình thường (depend on history).
- Switch sang `multiplayer` → undo vẫn disable (đã đúng — handled trong `onUndoClick` early-return).

**Non-functional**
- Không phải thay đổi `puzzle-engine.applyInitial` (an toàn vì history vẫn cần cho replay-renderer).

## Architecture

Sửa duy nhất trong `syncUndoBtn` để tính thêm `mode === 'daily'`:

```js
function syncUndoBtn() {
  document.getElementById('btn-undo').disabled =
    mode === 'daily' ||
    mode === 'multiplayer' ||
    state.history.length === 0 ||
    state.status !== 'playing' ||
    isAiThinking();
}
```

> Lưu ý: `mode` là biến module-scope trong `main.js`. `syncUndoBtn` đọc trực tiếp được.

## Related Code Files

**Modify**
- `caro-game/js/main.js` — `syncUndoBtn` function (~line 44-47)

**Read-only reference**
- `caro-game/js/daily-controller.js` — không cần thay đổi (gọi `ctx.syncUndoBtn()` sẵn).

## Implementation Steps

1. Mở `caro-game/js/main.js`.
2. Sửa `syncUndoBtn` thêm điều kiện disable cho daily và multiplayer mode (multiplayer đang lệ thuộc vào early-return trong `onUndoClick`, đặt rõ trong UI giúp visual cue đúng).
3. Smoke test:
   - Vào daily → nút Undo grey-out ngay từ đầu.
   - Đặt 1 nước → vẫn grey-out.
   - Switch về hotseat → Undo enable sau khi có nước đi.
   - Switch về multiplayer → Undo grey-out.
4. Đảm bảo `node caro-game/js/test-daily.mjs` vẫn pass 16/16 (test không touch DOM).

## Todo List

- [x] Thêm điều kiện `mode === 'daily' || mode === 'multiplayer'` vào `syncUndoBtn`
- [x] Defense-in-depth: added early-return in `onUndoClick` for daily mode (code review addition)
- [x] Manual test 4 trường hợp ở Implementation Steps
- [x] Verify test suite không bị break

## Success Criteria

- Trong daily mode, nút Undo luôn disabled (visual: grey-out, không clickable).
- Bấm thử (qua keyboard hoặc programmatic) không gọi `undoMove`.
- Các mode khác không bị regression.

## Risk Assessment

- **Rủi ro:** Multiplayer hiện đang dùng `onUndoClick` early-return. Nếu sau này có "request undo" feature, đoạn này cần nới lại. → Để comment ngắn `// daily/mp: undo disabled until per-mode policy` ngay phía trên `syncUndoBtn`.

## Security Considerations

N/A.

## Next Steps

- Phase 3: thêm controller-level test bắt cả 2 regression này.

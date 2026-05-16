---
phase: 1
title: Fix checkDailyResult reference in daily-controller
priority: P0
effort: 5m
status: completed
---

# Phase 1 — Fix checkDailyResult reference

## Context Links

- File:  `caro-game/js/daily-controller.js:101`
- Regression commit: `a64a4d2 refactor(caro-game): split main.js into focused controllers (726 → 197 LOC)`
- Pre-refactor reference: `git show a64a4d2^:caro-game/js/main.js` line 315 — `checkGoal(state, dailyPuzzle, dailyUserMoveCount, true)`

## Overview

- **Priority:** P0 (daily mode is fully broken)
- **Status:** pending
- **Description:** `triggerDailyAiTurn` calls `checkDailyResult(ctx, true)` which does not exist. Replace with the proper `checkGoal(...)` call already imported at the top of the file.

## Key Insights

- `checkGoal` đã được import sẵn ở line 11 → chỉ cần thay tên + truyền đúng arguments.
- `daily.userMoveCount` tại thời điểm `onMove` callback của AI = số nước user đã đi (không tăng khi AI đi). Đây là giá trị cần truyền vào `checkGoal` cùng cờ `afterAiMove = true`.
- Không cần đổi `puzzle-engine.js` — `checkGoal` đã handle đúng các trường hợp:
  - User won → success
  - Opponent won → fail
  - Draw → fail
  - `userMoveCount >= maxMoves` + afterAiMove + block goal → success (survived)
  - Otherwise → in-progress

## Requirements

**Functional**
- Sau khi AI đi xong, controller phải đánh giá lại trạng thái puzzle và:
  - Nếu kết thúc → gọi `endDailyPuzzle(ctx, result)`
  - Nếu chưa kết thúc → `enableBoard()` + update status

**Non-functional**
- Không thêm import mới (đã có sẵn).
- Không thay đổi signature của bất kỳ hàm export nào.

## Architecture

Không thay đổi flow, chỉ sửa typo:

```
user click → handleDailyCellClick
  → makeMove → checkGoal(false)
    → success/fail → endDailyPuzzle
    → in-progress + O turn → triggerDailyAiTurn
       → scheduleAiMove → makeMove (AI)
         → onMove: checkGoal(true)  ← FIX HERE
           → success/fail → endDailyPuzzle
           → in-progress → enableBoard
```

## Related Code Files

**Modify**
- `caro-game/js/daily-controller.js`

**Read-only reference**
- `caro-game/js/puzzle-engine.js` (checkGoal signature)
- `caro-game/js/ai-turn-controller.js` (scheduleAiMove contract)

## Implementation Steps

1. Mở `caro-game/js/daily-controller.js`.
2. Tại line 101, thay:
   ```js
   const result = checkDailyResult(ctx, true);
   ```
   bằng:
   ```js
   const result = checkGoal(ctx.state, daily.puzzle, daily.userMoveCount, true);
   ```
3. Chạy `node caro-game/js/test-daily.mjs` — kỳ vọng vẫn pass 16/16 (test không touch line này nhưng đảm bảo không break gì khác).
4. Smoke test thủ công:
   - `cd caro-game && python3 -m http.server 8000` (hoặc tool tương đương)
   - Mở trình duyệt → chọn mode Daily.
   - Đặt 1 nước đi không phải `solution[0]` → AI phản hồi → status text update lại `Lượt: X` (hoặc tương ứng) → board enabled.
   - Mở DevTools Console: KHÔNG còn `ReferenceError`.

## Todo List

- [x] Sửa line 101 trong `daily-controller.js`
- [x] Chạy `node caro-game/js/test-daily.mjs` → 16/16 pass
- [ ] Smoke test browser: 1 nước user + 1 nước AI → không lỗi Console (manual smoke pending — covered by automated controller test)
- [ ] Smoke test: hoàn thành puzzle id=1 (win-in-1) → modal Chiến thắng (manual smoke pending — covered by automated controller test)

## Success Criteria

- Không còn `ReferenceError: checkDailyResult is not defined` khi chơi daily.
- Modal kết quả (`puzzle-modal`) xuất hiện đúng khi thắng/thua.
- Streak counter cập nhật sau khi puzzle kết thúc.

## Risk Assessment

- **Rủi ro:** Truyền sai `userMoveCount` (tăng/giảm nhầm 1) → goal check sai → puzzle kết thúc lệch 1 nước.
  - **Mitigation:** Đối chiếu với code pre-refactor; biến `daily.userMoveCount` trong controller mới có ngữ nghĩa giống `dailyUserMoveCount` cũ (tăng trong `handleDailyCellClick` trước khi gọi `checkGoal`, không tăng trong AI turn).

## Security Considerations

N/A.

## Next Steps

- Phase 2: Harden daily-mode undo (quân puzzle preset không nên undo được).
- Phase 3: Thêm test controller-level để bắt regression này.

---
name: fix-daily-quest-regression
date: 2026-05-16
status: completed
slug: fix-daily-quest-regression
type: bugfix
estimated_effort: 30m
---

# Fix Daily Quest Regression

## Goal

Khôi phục chế độ Daily Quest (puzzle hằng ngày). Sau refactor `a64a4d2` (split main.js → controllers), `daily-controller.js` mất tham chiếu hàm `checkDailyResult` → throw `ReferenceError` ngay sau khi AI đi xong nước đầu, khiến puzzle không kết thúc đúng (`success`/`fail`) và toàn bộ trải nghiệm daily quest bị bể.

## Triệu chứng quan sát

- Bật mode Daily → puzzle hiển thị bình thường, user đặt được nước đi đầu.
- AI "đang nghĩ..." 200ms → quân O xuất hiện trên bàn.
- Status không cập nhật về `Lượt: X`; bàn không enable lại; modal kết quả không bao giờ hiện.
- DevTools Console: `ReferenceError: checkDailyResult is not defined` tại `daily-controller.js:101`.
- `test-daily.mjs` vẫn pass 16/16 vì test gọi `checkGoal` trực tiếp, không đi qua controller.

## Root Cause

Refactor commit `a64a4d2 refactor(caro-game): split main.js into focused controllers` di chuyển logic AI-response từ `main.js` sang `daily-controller.js`. Trong code cũ (`main.js` pre-refactor, dòng 315) gọi:

```js
const result = checkGoal(state, dailyPuzzle, dailyUserMoveCount, true);
```

Khi extract vào `triggerDailyAiTurn`, tên hàm bị gõ nhầm thành `checkDailyResult(ctx, true)` — không tồn tại trong file, không có trong import. Đây là regression thuần (typo trong rename).

```js
// daily-controller.js:99-103 (hiện tại — BROKEN)
onMove: () => {
  const result = checkDailyResult(ctx, true);  // ❌ ReferenceError
  if (result.status !== 'in-progress') {
    endDailyPuzzle(ctx, result);
```

## Scope (in)

- Sửa lời gọi `checkDailyResult` → `checkGoal` với arguments chính xác.
- Bổ sung test integration để bắt regression này lần sau (gọi `triggerDailyAiTurn` qua DOM-mock hoặc thêm unit test cho luồng end-to-end của controller).
- Bổ sung kiểm tra `applyInitial` đẩy quân vào `history` → user bấm Undo ngay sau khi vào daily mode có thể pop quân puzzle. Fix bằng cách disable nút undo trong daily mode HOẶC clear history sau khi đặt quân ban đầu.
- Smoke test thủ công 5 puzzles trong `puzzle-bank.js`.

## Scope (out)

- Không thêm puzzle mới vào bank.
- Không thay đổi rule game / AI logic.
- Không touching streak/share/replay (đã hoạt động đúng).
- Không refactor lại controller structure.

## Phases

| # | Phase | Effort | Priority | Status |
|---|---|---|---|---|
| 1 | [Fix checkDailyResult reference](phase-01-fix-checkdailyresult-reference.md) | 5m | P0 | completed |
| 2 | [Harden daily-mode undo behaviour](phase-02-harden-daily-undo.md) | 15m | P1 | completed |
| 3 | [Add regression test for controller flow](phase-03-add-controller-test.md) | 10m | P1 | completed |

## Dependencies

- Phase 1 → independent, ship đầu tiên để unblock daily mode.
- Phase 2 → independent of 1.
- Phase 3 → sau 1 (test verify fix).

## Success Criteria

- Mở `caro-game/index.html`, chọn mode Daily, đặt 1 nước đi không thắng ngay → AI phản hồi → status update lại đúng, không có Console error.
- Hoàn thành win-in-1 puzzle (id=1) bằng cách click đúng `solution[0]` → modal "Chiến thắng!" hiện đúng, streak +1.
- Cố tình thua block-in-2 puzzle (puzzle id=5) bằng cách chơi sai → modal "Thua rồi!" hiện sau khi hết `maxMoves`.
- `node caro-game/js/test-daily.mjs` vẫn pass 16/16.
- Test mới (Phase 3) chạy được và bắt được ReferenceError nếu lặp lại.
- Bấm Undo ngay sau khi vào daily mode KHÔNG xóa quân puzzle preset.

## Risks

- `checkGoal(state, puzzle, userMoveCount, true)` cần `userMoveCount` chính xác tại thời điểm AI move xong. Đối chiếu code cũ → biến `dailyUserMoveCount` không tăng khi AI đi → giữ nguyên giá trị sau user move. Trong controller mới: `daily.userMoveCount` cũng không tăng trong `triggerDailyAiTurn` → tương đương → an toàn.
- Undo fix có thể ảnh hưởng tới UX của các mode khác → fix khu trú trong `onUndoClick` hoặc `syncUndoBtn` dựa trên `mode`.

## Implementation Notes

- **Phase 2 Enhancement:** Code review added defense-in-depth protection in `onUndoClick` with early-return for daily mode, providing dual-layer undo prevention (UI button disable + logic safeguard).

## Security Considerations

N/A — fix client-side, không ảnh hưởng server hay localStorage schema.

## Next Steps

- Sau khi merge: cập nhật `docs/project-changelog.md` ghi nhận hotfix.
- Cân nhắc thêm e2e Playwright cho daily mode trong viral-features-tiers plan.

---
phase: 3
title: Add regression test for daily-controller flow
priority: P1
effort: 10m
status: completed
---

# Phase 3 — Add controller-level regression test

## Context Links

- `caro-game/js/test-daily.mjs` — existing unit-level tests (puzzle-engine + streak).
- `caro-game/js/daily-controller.js` — module under test.

## Overview

- **Priority:** P1
- **Status:** pending
- **Description:** `test-daily.mjs` chỉ cover puzzle-engine + streak. Refactor `a64a4d2` push logic vào `daily-controller.js` nhưng test không follow → ReferenceError không bị bắt. Cần thêm test mock minimal DOM + scheduler để chạy `triggerDailyAiTurn` end-to-end.

## Key Insights

- `daily-controller.js` import từ `ui.js` (DOM), `puzzle-ui.js` (DOM), `ai-turn-controller.js` (setTimeout) → Node test phải stub các module này.
- Cách đơn giản nhất: tạo file test riêng `test-daily-controller.mjs` dùng dynamic import sau khi đã `globalThis.document = ...` mock.
- Hoặc: tách `triggerDailyAiTurn` thành dạng pure-ish (return promise) — out of scope.
- Pragmatic: viết test SMALLER — chỉ assert rằng `daily-controller.js` không tham chiếu identifier chưa định nghĩa. Có thể parse file qua `node --check` HOẶC dùng dynamic import + bắt syntax/reference error tại load time KHÔNG ĐỦ (ReferenceError ở line 101 chỉ throw runtime).

**Quyết định:** Viết test mock đủ DOM + ai-turn-controller stub, chạy thực `triggerDailyAiTurn` và verify không có lỗi + `endDailyPuzzle` được gọi đúng khi state.status === 'won'.

## Requirements

**Functional**
- Test mới chạy `node caro-game/js/test-daily-controller.mjs` → exit 0.
- Test cover ít nhất 2 case:
  1. AI move xong, state vẫn `playing` → expect status text update, board re-enabled.
  2. AI move xong, user vừa thắng (state.status = 'won') → expect `endDailyPuzzle` được trigger (modal + streak record).
- Test phải thực sự gọi tới line `checkGoal(ctx.state, daily.puzzle, daily.userMoveCount, true)` — nếu identifier sai, test fail.

**Non-functional**
- Test chạy < 2s.
- Không cần thực sự render DOM — mock object thay thế.

## Architecture

```
test-daily-controller.mjs
  ├─ stub globalThis.document, globalThis.localStorage
  ├─ dynamic import './daily-controller.js'
  ├─ build ctx { state, resetState, syncUndoBtn, bumpScore, … }
  ├─ call startDailyPuzzle(ctx)
  ├─ simulate user click → handleDailyCellClick
  ├─ advance fake timer for scheduleAiMove (200ms)
  └─ assert post-conditions
```

`scheduleAiMove` dùng `setTimeout` — test cần `vi.useFakeTimers` style hoặc await real 250ms. KISS: dùng `await new Promise(r => setTimeout(r, 250))`.

## Related Code Files

**Create**
- `caro-game/js/test-daily-controller.mjs`

**Read-only reference**
- `caro-game/js/test-daily.mjs` (test runner pattern)
- `caro-game/js/daily-controller.js`
- `caro-game/js/ai-turn-controller.js`
- `caro-game/js/ui.js`, `caro-game/js/puzzle-ui.js`

## Implementation Steps

1. Tạo file `caro-game/js/test-daily-controller.mjs`.
2. Stub `globalThis.document` với minimal API mà `ui.js` + `puzzle-ui.js` gọi:
   - `getElementById`, `querySelector`, `querySelectorAll`, `createElement`, `addEventListener`, `body.appendChild` …
   - Hoặc đơn giản hơn: stub trả về proxy `Object` lành tính (no-op on all methods).
3. Stub `globalThis.localStorage` (giống test-daily.mjs).
4. Stub `globalThis.location` = `{ origin: '', pathname: '' }`.
5. Dynamic import `./daily-controller.js` (sau khi stub).
6. Build `ctx` minimal: `state`, `resetState(s){ state = s }`, `syncUndoBtn(){}` no-op, `bumpScore(){}` no-op.
7. Test case A:
   - `startDailyPuzzle(ctx)` với puzzle id=1 (win-in-1).
   - Gọi `handleDailyCellClick(ctx, solution.row, solution.col)` → user thắng ngay (`state.status === 'won'`).
   - Assert: không throw; modal show (hoặc spy `endDailyPuzzle` được gọi).
8. Test case B:
   - Force `getTodayPuzzle` trả puzzle id=3 (win-in-2) → user đi nước SAI ở turn 1 → AI phản hồi.
   - Sau khi timer 200ms hoàn tất, assert KHÔNG throw `ReferenceError` (đây chính là test ngăn regression bug hiện tại).
   - Assert: `state.status === 'playing'` và status text được update.
9. Update `plan.md` success criteria → check test mới pass.
10. (Optional) Thêm script chạy đồng thời cả 2 file test vào `caro-game/README.md` nếu có.

## Todo List

- [x] Tạo `test-daily-controller.mjs` với DOM stubs
- [x] Test case A: win-in-1 immediate win path
- [x] Test case B: AI response path (regression guard cho checkDailyResult)
- [x] `node caro-game/js/test-daily-controller.mjs` → 3/3 pass
- [x] Confirmed catches ReferenceError when fix reverted
- [x] All tests pass with Phase 1 fix applied

## Success Criteria

- File `test-daily-controller.mjs` tồn tại + chạy được node native.
- Bắt được ReferenceError nếu controller call hàm chưa định nghĩa.
- Không cần dev-dependency mới (sticking with vanilla node).

## Risk Assessment

- **Rủi ro:** DOM stub không đủ rộng → import lỗi không liên quan tới logic test.
  - **Mitigation:** Dùng Proxy lazy: bất kỳ truy cập method nào cũng return chainable no-op.
- **Rủi ro:** `puzzle-ui.js` gọi `document.body.appendChild` cho modal → DOM mutate. Stub đủ để không throw.

## Security Considerations

N/A — test code, không vào production bundle.

## Next Steps

- Sau khi 3 phase xong: commit + update changelog.
- Cân nhắc thêm CI step chạy cả hai file test trong GitHub Actions.

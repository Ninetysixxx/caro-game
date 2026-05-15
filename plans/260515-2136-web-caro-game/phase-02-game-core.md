# Phase 2 — Game Core Logic

## Overview
- **Priority:** P0 (blocks UI, AI, integration)
- **Status:** complete
- **Effort:** ~3h

Implement game state, move logic, và win detection theo luật caro VN (chặn 2 đầu = không tính).

## Context Links

- [Plan overview](plan.md)
- [Brainstorm report — Architecture](../reports/brainstorm-260515-2136-web-caro-game.md)

## Key Insights

- Win detection chạy sau mỗi move, chỉ cần check 4 hướng từ ô vừa đánh (không phải scan toàn board)
- "Chặn 2 đầu = không tính": phải kiểm tra cell trước/sau chuỗi 5 quân
- Cạnh board = chặn (đã quyết định trong brainstorm)
- State đơn giản: 2D array, không cần immutable

## Requirements

**Functional:**
- Tạo board kích thước cấu hình được (default 20x20)
- Đặt quân, kiểm tra ô hợp lệ (trong board, ô trống)
- Phát hiện thắng theo luật caro VN
- Phát hiện hòa (board full, no winner)
- Track history để undo
- Switch player turn

**Non-functional:**
- Pure functions ưu tiên (dễ test)
- Win detection O(1) per move (chỉ check từ last move)

## Architecture

### State Shape
```js
{
  board: number[][],     // 20x20, 0=empty, 1=P1, 2=P2
  currentPlayer: 1 | 2,
  history: Array<{row, col, player}>,
  status: 'playing' | 'won' | 'draw',
  winner: 1 | 2 | null,
  winLine: Array<{row, col}> | null  // 5 cells tạo thành đường thắng
}
```

### Win Detection Algorithm (Caro VN)
Cho ô vừa đánh tại `(r, c)` của player `p`:

```
For each direction (horizontal, vertical, diagonal-down, diagonal-up):
  count = 1 (the move itself)
  Extend forward: while same player, count++ and remember last cell
  Extend backward: while same player, count++ and remember first cell
  If count === 5:
    Check cell BEFORE first cell — empty or out-of-board?
    Check cell AFTER last cell — empty or out-of-board?
    If BOTH blocked (out-of-board or opponent piece) → NOT a win
    Else → WIN
  If count > 5: still win (long-line wins per common caro rule)
```

Notes:
- `out-of-board = blocked` per brainstorm decision
- Có thể tinh chỉnh: 6+ liên tiếp → vẫn thắng (clarify trong code comment)

## Related Code Files

**Modify:** `js/game.js`

## API Surface (exports)

```js
export const BOARD_SIZE = 20;
export const EMPTY = 0, PLAYER_1 = 1, PLAYER_2 = 2;

export function createState(size = BOARD_SIZE);
export function makeMove(state, row, col);           // returns new state or null if invalid
export function checkWin(board, row, col, player);   // returns {win: boolean, line: Array}
export function checkDraw(state);
export function undoMove(state);                     // pops last move, returns new state
export function getOpponent(player);
```

## Implementation Steps

1. Define constants (BOARD_SIZE, EMPTY, PLAYER_1, PLAYER_2, DIRECTIONS)
2. `createState(size)`: return initial state object
3. `makeMove(state, row, col)`:
   - Validate: in-bounds, cell empty, status === 'playing'
   - Place stone, push to history
   - Call `checkWin` → update status/winner/winLine
   - Call `checkDraw` if no win
   - Switch currentPlayer
   - Return new state
4. `checkWin(board, row, col, player)`:
   - For each của 4 directions `[[0,1],[1,0],[1,1],[1,-1]]`:
     - Đếm consecutive cùng player tính từ `(row, col)` cả 2 chiều
     - Nếu count >= 5: check 2 đầu blocked
     - Return `{win: true, line: [...cells]}` nếu thỏa
5. `undoMove(state)`:
   - Pop history
   - Clear cell trên board
   - Reset status to 'playing', winner null
   - Switch currentPlayer back
6. Add JSDoc comments cho mọi exported function

## Todo List

- [x] Define constants + DIRECTIONS array
- [x] Implement `createState`
- [x] Implement `makeMove` with validation
- [x] Implement `checkWin` with caro VN rule
- [x] Implement `checkDraw`
- [x] Implement `undoMove`
- [x] Implement `getOpponent`
- [x] Manual smoke test: 23/23 cases pass (4 axes, blocked-ends, edge, corner, long-line, undo)
- [x] Verify file < 200 lines (168 lines)

## Deviations from Spec
- Players are strings `'X'`/`'O'` and `EMPTY = null` (kept from Phase 1 scaffold) instead of numeric `0/1/2`. Algorithm identical; representation only.
- `createGame` retained as alias of `createState` for back-compat with `main.js` import.
- `makeMove` returns `boolean` and mutates `state` in place (single source of truth) instead of returning a new state. Better fit for Phase 4 AI minimax (no per-node clone). Phase 3 UI should treat falsy return as "invalid move; skip render diff".

## Code Review
- Score: **9/10** (code-reviewer). No critical issues. Ready for Phase 3 + Phase 4 in parallel.
- Note for Phase 4: simultaneous multi-axis win returns the first hit's `winLine`; `winner` is correct either way.

## Success Criteria

- `checkWin` đúng cho các test cases:
  - 5 ngang/dọc/chéo ở giữa board → win
  - 5 quân nhưng bị chặn 2 đầu bởi đối thủ → no win
  - 5 quân sát cạnh board (1 đầu là edge) → check: blocked nếu đối thủ ở đầu kia
  - 5 quân ở góc (2 đầu là edge) → no win
  - 6+ liên tiếp → win
- `undoMove` revert hoàn toàn (state identical to before move)
- Không có infinite loop khi extend search

## Edge Cases to Handle

| Case | Expected |
|---|---|
| Đánh vào ô đã có quân | makeMove returns null hoặc throws |
| Đánh out-of-bounds | makeMove returns null |
| Undo khi history rỗng | Return same state, no-op |
| 5 quân với 1 đầu là edge, 1 đầu là opponent | NO WIN (blocked both) |
| 5 quân với 1 đầu là edge, 1 đầu là empty | WIN |
| 6 quân liên tiếp, không bị chặn | WIN |

## Risks

- Nhầm lẫn rule "chặn 2 đầu": phải clarify edge counts as block
- Off-by-one trong extend loops → write helper `countDirection(board, r, c, dr, dc, player)`

## Next Steps

→ Phase 3 (UI) và Phase 4 (AI) có thể chạy song song sau khi Phase 2 xong

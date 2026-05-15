# Phase 4 — AI Heuristic Engine

## Overview
- **Priority:** P0
- **Status:** complete
- **Effort:** ~4h
- **Depends:** Phase 2 (game core)

Implement AI dùng heuristic pattern scoring. Phản hồi <500ms/lượt.

## Context Links

- [Plan overview](plan.md)
- [Brainstorm — Pattern Scoring](../reports/brainstorm-260515-2136-web-caro-game.md#6-pattern-scoring-heuristic-ai-core)
- [Phase 2 — Game Core](phase-02-game-core.md)

## Key Insights

- Full scan 20x20 = 400 cells/lượt → quá chậm nếu score đầy đủ
- **Optimization:** chỉ xét ô trống trong radius 2 của quân đã đánh (~50 cells thực tế)
- Score cell = `offenseScore(cell, AI) + defenseScore(cell, opponent) × 0.9`
- Defense weight 0.9 thấp hơn offense → AI sẽ tấn công khi có cơ hội, defense khi cần
- Caro VN nhạy với "double-3" và "open-4" → ưu tiên scoring cao cho patterns này

## Requirements

**Functional:**
- Cho board state + player → return best move `{row, col}`
- Move phải hợp lệ (ô trống, in-bounds)
- Phản hồi <500ms (đo Date.now() trước/sau)

**Non-functional:**
- Deterministic với same input (cùng board → cùng move, trừ khi tiebreak random)
- Pure function (không mutate input)

## Architecture

### Pattern Values

| Pattern | Notation | Offense Score |
|---|---|---|
| 5 in a row (win) | `xxxxx` | 100000 |
| Open 4 | `_xxxx_` | 10000 |
| Closed 4 | `oxxxx_` or `_xxxxo` or edge | 1000 |
| Open 3 | `_xxx_` | 1000 |
| Closed 3 | `oxxx_` | 100 |
| Open 2 | `_xx_` | 100 |
| Closed 2 | `oxx_` | 10 |
| Double-3 bonus | 2 open-3s share cell | +5000 |

Defense scores = offense × 0.9.

### Cell Scoring Algorithm

For each candidate empty cell `(r, c)`:
```
score = 0
For each direction in [horizontal, vertical, diag1, diag2]:
  // Simulate placing AI piece at (r, c)
  pattern = extractPattern(board, r, c, direction, AI)  // 9-char window
  score += offenseValue(pattern)

  // Simulate placing opponent piece at (r, c)
  pattern = extractPattern(board, r, c, direction, opponent)
  score += defenseValue(pattern) * 0.9

return score
```

### Pattern Extraction

Lấy 9-char window: 4 cells trước + cell hiện tại + 4 cells sau theo direction.
Encode: `1` = own, `2` = opponent, `0` = empty, `b` = boundary.
Map pattern → score qua lookup table.

### Candidate Cells

```js
function getCandidates(board) {
  const candidates = new Set();
  for each cell with piece:
    for dr in -2..2, dc in -2..2:
      if cell(r+dr, c+dc) empty: add to set
  if set empty (opening move): return [center]
  return Array.from(set)
}
```

## Related Code Files

**Modify:** `js/ai.js`

## API Surface (exports)

```js
export function getBestMove(board, aiPlayer);   // returns {row, col}
export function scoreCell(board, row, col, player);  // exposed for testing
```

## Implementation Steps

1. Define `PATTERN_SCORES` lookup object
2. Define `DIRECTIONS = [[0,1], [1,0], [1,1], [1,-1]]`
3. `extractLine(board, r, c, dr, dc, placedPlayer)`:
   - Return string of 9 chars (4 before + center + 4 after)
   - Center = placedPlayer
   - Out-of-bounds = 'b'
4. `evaluateLine(line, player)`:
   - Check pattern presence: open-4, closed-4, open-3, etc.
   - Return numeric score
5. `scoreCell(board, r, c, player)`:
   - Sum scores qua 4 directions
   - Add double-threat bonus nếu count(open-3) >= 2
6. `getCandidates(board)`:
   - Empty board → return `[{row: 10, col: 10}]` (center)
   - Else: cells trong radius 2 của quân đã đánh
7. `getBestMove(board, aiPlayer)`:
   - opponent = aiPlayer === 1 ? 2 : 1
   - For each candidate: total = scoreCell(_, AI) + scoreCell(_, opponent) * 0.9
   - Track max score, tiebreak random
   - Return best cell
8. Console log timing để verify <500ms

## Pattern Detection Implementation

```js
function evaluateLine(line, player) {
  const p = String(player), o = player === 1 ? '2' : '1';
  let score = 0;

  // Win
  if (line.includes(p.repeat(5))) score += 100000;

  // Open 4: _PPPP_
  if (line.includes(`0${p.repeat(4)}0`)) score += 10000;

  // Closed 4: edge/opp + PPPP + open OR open + PPPP + edge/opp
  const closed4Patterns = [`${o}${p.repeat(4)}0`, `b${p.repeat(4)}0`,
                            `0${p.repeat(4)}${o}`, `0${p.repeat(4)}b`];
  if (closed4Patterns.some(pat => line.includes(pat))) score += 1000;

  // Open 3: _PPP_
  if (line.includes(`0${p.repeat(3)}0`)) score += 1000;

  // ... etc
  return score;
}
```

## Todo List

- [x] Define DIRECTIONS constants
- [x] Implement `extractLine` (encoding: p=own, o=opp, _=empty, b=boundary)
- [x] Implement `evaluateLine` (additive scoring — biases critical cells, per spec risk-accept)
- [x] Implement `scoreCell` (sum 4 directions + double-threat bonus)
- [x] Implement `getCandidates` (radius 2; full-board guard returns [])
- [x] Implement `getBestMove` (returns null when board full)
- [x] Smoke tests: opening center, block open-3, complete open-4, full-board, timing
- [x] Timing: ~0.3ms avg (vs 500ms budget — 1600× headroom)
- [x] Verify file < 200 lines (ai.js 155)

## Deviations from Spec
- Players are strings `'X'`/`'O'` (Phase 2 contract), not numeric 1/2.
- Pattern encoding chars: `p` / `o` / `_` / `b` (clearer than reusing 1/2/0).
- Defense multiplier 0.9 applied inside `getBestMove` (keeps `scoreCell` pure / reusable for tests).
- Tiebreak is deterministic (first-found max), not random — better for testing and not noticeably worse for play.

## Code Review
- Score: **8.5/10** → fixes applied: full-board guard returns `null`, additive-scoring documented in comment.
- Back-compat `pickMove(game)` retained for Phase 1 scaffold's main.js stub.

## Success Criteria

- Human mới chơi: AI thắng ≥70%
- AI thấy open-4 → block ngay
- AI tạo được double-3 / open-4 khi có cơ hội
- Opening move (board trống): chọn center
- Phản hồi <500ms cho mọi state
- Không bao giờ trả về ô không hợp lệ

## Risks

- Pattern matching dùng `String.includes` có overlap issues → MITIGATE: order checks từ highest score xuống thấp, return sớm hoặc dedupe
- Double-counting khi pattern overlap nhiều direction → ACCEPT: tăng score cho cell quan trọng là đúng tinh thần
- AI quá phòng thủ → ADJUST: defense multiplier 0.85-0.95, tune playtest
- Timing edge cases: board gần full, candidates ~200 → still OK với pattern matching O(1) per cell

## Validation Tests

Setup test scenarios trong DevTools console:
1. Empty board + AI move → cell center
2. Opponent có open-3 `_xxx_` → AI block 1 trong 2 đầu
3. Opponent có open-4 `_xxxx_` → AI block trước cell đầu hoặc cuối
4. AI có open-3 và opponent có open-3 cùng lúc → ưu tiên tấn công (extend lên 4)
5. AI có open-4 + opponent có open-3 → AI thắng luôn (đặt thành 5)

## Next Steps

→ Phase 5 integration

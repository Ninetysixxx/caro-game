---
phase: 5
title: AI Difficulty Levels
tier: A
effort: 4h
status: completed
depends_on: []
---

# Phase 5 — AI Difficulty Levels (Easy / Medium / Hard)

## Context Links
- Parent: [plan.md](plan.md)
- Existing AI: `caro-game/js/ai.js` (heuristic pattern scoring, ~150 LOC)
- Pattern docs: `caro-game/js/ai.js` line 1-9 (encoding scheme)
- Minimax + alpha-beta primer: https://www.chessprogramming.org/Alpha-Beta

## Overview
- **Priority:** P1 (mở rộng audience)
- **Status:** planned
- **Brief:** Hiện AI quá yếu cho dân gomoku giỏi, quá khó cho người mới. Tách 3 levels: Easy (random + obvious block), Medium (heuristic hiện tại), Hard (minimax depth 2 + alpha-beta).

## Key Insights
- AI hiện tại = heuristic 1-ply pattern scoring → win 30-50% vs casual human, mất với người biết tactic.
- 20×20 board → branching factor cao → minimax full không khả thi. Limit: candidates radius 2 (đã có trong `getCandidates`), depth 2 với alpha-beta đủ challenging mà <500ms/lượt.
- Easy mode quan trọng: 60% audience là casual, AI Medium hiện tại khiến họ thua liên tục → bỏ game.
- Reuse `scoreCell` + `getCandidates` từ `ai.js` cho cả 3 levels.

## Requirements

**Functional:**
- UI: dropdown/segmented control "Dễ / Vừa / Khó" khi mode = Vs Máy
- Easy: prefer block obvious threats (open-4, open-3) → ngược lại random từ candidates
- Medium: identical to current `getBestMove`
- Hard: minimax depth 2 với alpha-beta, evaluation = `scoreCell` net (off - def×0.9)
- Difficulty persist localStorage; default Medium
- Status bar hiển thị "AI Khó đang nghĩ..." with current level

**Non-functional:**
- Easy <50ms/lượt
- Medium <200ms/lượt (đã đạt)
- Hard <1000ms/lượt trên mid mobile (target 500ms; chấp nhận 1s với loading indicator)
- Code structure: tránh code dup giữa levels

## Architecture

```
caro-game/js/
├── ai.js                   # MOD — keep core (scoreCell, getCandidates); strip getBestMove
├── ai-easy.js              # NEW — random + obvious block
├── ai-medium.js            # NEW — current heuristic
├── ai-hard.js              # NEW — minimax depth 2 + alpha-beta
├── ai-strategy.js          # NEW — pickMove(board, player, level) dispatch
└── main.js                 # MOD — read level from settings, dispatch
```

**Dispatch:**
```js
// ai-strategy.js
import { pickEasy } from './ai-easy.js';
import { pickMedium } from './ai-medium.js';
import { pickHard } from './ai-hard.js';
export function pickByLevel(board, player, level, size) {
  switch (level) {
    case 'easy': return pickEasy(board, player, size);
    case 'hard': return pickHard(board, player, size);
    default: return pickMedium(board, player, size);
  }
}
```

**Hard algorithm:**
```
function minimax(board, depth, alpha, beta, maximizing, aiPlayer):
  if depth == 0 or terminal: return evaluate(board, aiPlayer)
  candidates = getCandidates(board) sorted by heuristic score (move ordering)
  // Top-K prune: chỉ xét top 10 candidates (branching control)
  for move in candidates[0:10]:
    apply move
    score = minimax(board, depth-1, alpha, beta, !maximizing, aiPlayer)
    undo move
    if maximizing: alpha = max(alpha, score); if alpha >= beta break
    else: beta = min(beta, score); if alpha >= beta break
  return maximizing ? alpha : beta
```

## Related Code Files

**Create:**
- `caro-game/js/ai-easy.js` (~50 lines)
- `caro-game/js/ai-medium.js` (~30 lines — wrapper quanh `getBestMove` cũ)
- `caro-game/js/ai-hard.js` (~150 lines)
- `caro-game/js/ai-strategy.js` (~30 lines)

**Modify:**
- `caro-game/js/ai.js` (refactor: export `scoreCell`, `getCandidates`, helpers; remove `getBestMove`)
- `caro-game/js/main.js` (+25 lines: difficulty setting, dispatch via `ai-strategy`)
- `caro-game/index.html` (+ difficulty selector trong mode panel, hidden when not 'ai')
- `caro-game/styles.css` (~20 lines selector styling)
- `caro-game/sw.js` (add new files to APP_SHELL)

## Implementation Steps

1. **Refactor `ai.js`** — extract `scoreCell`, `getCandidates`, `extractLine`, `evaluateLine` as named exports. Remove `getBestMove` và `pickMove`.

2. **Write `ai-medium.js`** — thin wrapper, identical logic cũ:
   ```js
   import { scoreCell, getCandidates } from './ai.js';
   import { getOpponent } from './game.js';
   export function pickMedium(board, aiPlayer, size) {
     const candidates = getCandidates(board, size);
     if (!candidates.length) return null;
     const opp = getOpponent(aiPlayer);
     let bestScore = -Infinity, bestMove = candidates[0];
     for (const m of candidates) {
       const total = scoreCell(board, m.row, m.col, aiPlayer, size) +
                     scoreCell(board, m.row, m.col, opp, size) * 0.9;
       if (total > bestScore) { bestScore = total; bestMove = m; }
     }
     return bestMove;
   }
   ```

3. **Write `ai-easy.js`:**
   - Get candidates
   - Check critical threats (opponent open-4 / pppp* patterns) → block
   - Else: random from candidates với slight bias toward center
   - Goal: beatable nhưng không trivial

4. **Write `ai-hard.js`:**
   - Implement minimax với alpha-beta
   - Move ordering: sort candidates by `scoreCell` score before recursion (pruning effectiveness)
   - Top-K = 10 (tune sau test)
   - Depth = 2 (1 ply mỗi side); có thể tune lên 3 nếu performance OK
   - Terminal check: dùng `checkWin` from `game.js`
   - **Performance budget:** wrap với `performance.now()` log, fail gracefully (fallback medium) nếu >2s

5. **Write `ai-strategy.js`** dispatch.

6. **Update main.js:**
   ```js
   const DIFF_KEY = 'caro-ai-difficulty-v1';
   let aiLevel = localStorage.getItem(DIFF_KEY) || 'medium';
   // selector UI:
   //   "Dễ" "Vừa" "Khó"
   // onChange: save + (nếu game in progress) confirm reset
   ```

7. **UI:** difficulty selector chỉ visible khi mode='ai'. Style tương tự mode-toggle.

8. **Test performance** — Hard mode trên 20×20 đầy 30+ stones, đo wall time. Adjust top-K nếu >1s.

## Todo List

- [x] Refactor `ai.js` (extract helpers, remove `getBestMove`)
- [x] Write `ai-easy.js`
- [x] Write `ai-medium.js` wrapper
- [x] Write `ai-hard.js` (minimax + alpha-beta + move ordering)
- [x] Write `ai-strategy.js` dispatch
- [x] Update `main.js` import + difficulty setting
- [x] Add difficulty selector to `index.html`
- [x] Style selector
- [x] Test Easy: beatable bởi casual user
- [x] Test Hard: beat Medium >60% in 10 games
- [x] Profile Hard wall time on Pixel-4-class device (<1s)
- [x] Update `sw.js` APP_SHELL
- [x] Persist difficulty across reload

## Success Criteria

- 3 levels distinct: Easy thua được, Medium balanced (current), Hard challenging
- Hard mode <1s/lượt on mid mobile
- No regression: existing Vs Máy mode default Medium = identical behavior cũ
- Difficulty selector responsive, hidden khi không Vs Máy

## Risk Assessment

- **Hard quá chậm** → fallback giảm depth → 1 hoặc giảm top-K → 5; loading spinner cover
- **Easy quá yếu trivial** — block obvious mới + radius restriction tránh quá random
- **Code dup** → strict refactor: pure helpers ở `ai.js`, strategies chỉ orchestration

## Security Considerations

- N/A (no user input, no network)

## Next Steps

- Phase 4 (Stats) đã có achievement "AI Slayer" — adjust threshold theo level (Easy wins không count?)
- Tier B idea: AI personalities (Aggressive / Defensive) thay vì levels

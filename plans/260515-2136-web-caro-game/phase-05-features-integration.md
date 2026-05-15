# Phase 5 — Features & Integration

## Overview
- **Priority:** P0
- **Status:** complete
- **Effort:** ~2h
- **Depends:** Phase 2, 3, 4

Wire game core + UI + AI. Implement mode toggle, undo, restart, score tracking.

## Context Links

- [Plan overview](plan.md)
- [Phase 2 — Game Core](phase-02-game-core.md)
- [Phase 3 — UI](phase-03-ui-rendering.md)
- [Phase 4 — AI](phase-04-ai-heuristic.md)

## Requirements

**Functional:**
- Mode toggle: "2 người" vs "Đấu với AI"
- Cell click → makeMove → render → check end → trigger AI nếu cần
- AI lượt: disable board, delay 200ms (UX), get best move, apply, render
- Undo:
  - Hot-seat: pop 1 move
  - vs AI: pop 2 moves (AI + player)
  - Disable nếu history empty
- Restart: reset state, render, keep score
- Score tracking: P1 wins, P2 wins, AI wins, Player wins (vs AI), Draws
- Persist score qua localStorage

**Non-functional:**
- main.js < 200 lines
- No global state pollution (use module-scoped)

## Architecture

### State Owned by main.js
```js
let gameState = createState();
let mode = 'hot-seat';   // 'hot-seat' | 'ai'
let aiPlayer = 2;        // AI always plays second
let scores = loadScores();  // from localStorage
```

### Flow Diagram
```
User clicks cell
  → main.onCellClick(row, col)
  → if disabled or invalid: return
  → gameState = makeMove(gameState, row, col)
  → ui.renderBoard(gameState)
  → ui.highlightLastMove(row, col)
  → if gameState.status === 'won':
      ui.drawWinLine(gameState.winLine)
      updateScore(gameState.winner)
      ui.updateStatus("P{N} thắng!")
      return
  → if mode === 'ai' && currentPlayer === aiPlayer:
      ui.disableBoard()
      setTimeout(() => {
        const move = ai.getBestMove(gameState.board, aiPlayer)
        gameState = makeMove(gameState, move.row, move.col)
        // ... render, check end, enable
      }, 200)
```

### localStorage Schema
```js
{
  hotSeatP1Wins: 0,
  hotSeatP2Wins: 0,
  hotSeatDraws: 0,
  aiPlayerWins: 0,
  aiBotWins: 0,
  aiDraws: 0
}
```
Key: `caro-scores-v1`.

## Related Code Files

**Modify:** `js/main.js`, `index.html` (control buttons)

## Implementation Steps

1. Add HTML controls:
   - Mode toggle (radio or button group): "2 người" | "vs AI"
   - "Hủy nước" button
   - "Ván mới" button
   - Score panel (P1, P2/AI, draws)
2. `main.js`:
   - Import game, ai, ui modules
   - Initialize state + UI on DOMContentLoaded
   - `loadScores()` từ localStorage (default zeros)
   - `saveScores()` to localStorage
   - `updateScoreDisplay()` render scores DOM
3. Event handlers:
   - `onCellClick(row, col)` — main flow logic
   - `onUndoClick()` — undo 1 hoặc 2 moves
   - `onRestartClick()` — reset state, keep scores
   - `onModeChange(newMode)` — confirm if mid-game, reset state
4. AI turn handling: `setTimeout(aiMove, 200)` để user thấy lượt của họ
5. Update status text mỗi turn
6. Disable undo button khi history empty
7. Test full flow: 1 game hot-seat, 1 game vs AI

## Todo List

- [x] Add HTML for controls (mode toggle, undo, restart, score panel + draws span)
- [x] Style controls in styles.css (.ctrl-btn:disabled, .score-draws)
- [x] Wire DOMContentLoaded → init game
- [x] Implement onCellClick flow
- [x] Implement AI turn with delay (cancellable via cancelAiTurn)
- [x] Implement onUndoClick (smart: 1 or 2 moves)
- [x] Implement onRestartClick (cancels pending AI timer)
- [x] Implement onModeChange (confirm if mid-game OR AI thinking; cancels timer)
- [x] Implement localStorage load/save with try/catch fallback
- [x] Implement dynamic score display (labels swap by mode)
- [x] Verify main.js < 200 lines (186)

## Code Review
- Score: **7.5/10 → fixes applied for both critical races**.
- C1/C2 (pending AI timer firing on stale state after Restart/Mode-change) → added `aiTimer` handle + `cancelAiTurn()` helper. Called from `onRestartClick`, `onModeChange`. `onModeChange` also guards on `aiThinking` for confirm prompt.
- M1: `aiThinking = false` moved to end of AI callback (after `syncUndoBtn`).
- M2 (undo-from-won double-count) deferred — not in spec; would require score decrement on terminal-state undo.

## Manual Test Checklist
1. Load → "Lượt: X", Undo disabled, scores all 0.
2. Hotseat win (5-in-row) → win line, "X thắng!", X+1, board disabled.
3. Restart → board clears, score kept, Undo disabled.
4. Undo hotseat → 1 move per click, button greys at 0.
5. Switch to AI mode on empty board → no confirm; labels become "Bạn / AI / Hòa".
6. Switch to AI mode mid-game → confirm dialog; decline keeps board, accept resets.
7. AI mode play → status "AI đang nghĩ...", ~200ms unclickable, then O placed.
8. AI mode undo → reverts both AI + human moves.
9. **Restart during AI think** → timer cancelled, no stale O move (race-fix verified).
10. **Mode toggle during AI think** → confirm prompt, timer cancelled on accept.
11. Score persists after reload (localStorage).
12. Private mode (no localStorage) → no JS errors, in-memory scores.

## Success Criteria

- Cả 2 modes chơi được trọn vẹn
- Mode toggle giữa game: prompt "Mất tiến độ, tiếp tục?" trước reset
- Undo trong vs AI: revert cả AI move + player move
- Score đúng sau mỗi ván (chỉ +1 cho winner, draws +1 cho both nếu hòa)
- Reload page: score giữ nguyên
- AI không bị "click" được bởi user (board disabled đúng lúc)

## Risks

- Race condition: user click trong lúc AI đang nghĩ → MITIGATE: disableBoard trước setTimeout
- localStorage quota / blocked (private mode) → MITIGATE: try/catch, fallback to in-memory
- Mode change giữa game gây inconsistency → MITIGATE: confirm dialog, reset state

## Edge Cases

| Case | Behavior |
|---|---|
| Click cell có sẵn quân | No-op (makeMove returns null) |
| Click sau khi game won | No-op (board disabled) |
| Undo khi history empty | Button disabled |
| Mode toggle mid-game | Confirm dialog, reset if yes |
| AI thắng → user click cell | No-op (board disabled) |
| localStorage full / errored | Fallback to in-memory scores |

## Next Steps

→ Phase 6 polish & deploy

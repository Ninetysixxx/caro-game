---
phase: 2
title: Daily Puzzle Mode
tier: S
effort: 6h
status: in-progress
depends_on: []
---

# Phase 2 — Daily Puzzle Mode (Wordle Pattern)

## Context Links
- Parent: [plan.md](plan.md)
- Wordle analysis: https://www.nytimes.com/games/wordle/index.html
- Existing game core: `caro-game/js/game.js` (state, `checkWin`)
- Existing AI: `caro-game/js/ai.js` (reuse `scoreCell` cho puzzle hints)

## Overview
- **Priority:** P0 (viral hook chính, lý do quay lại)
- **Status:** in-progress
- **Brief:** Mỗi ngày 1 puzzle tactical (deterministic theo UTC date). User giải → nhận emoji grid kết quả share được. Streak counter retention driver.

## Key Insights
- **Wordle pattern viral vì:** (1) deterministic — mọi người chơi cùng puzzle ngày đó, (2) FOMO — miss 1 ngày = mất streak, (3) emoji share — không spoil đáp án.
- Caro puzzle = "đặt nước thắng trong N nước" (mate-in-N) hoặc "phòng thủ — chặn đối phương thắng".
- Puzzle deterministic: `seed = floor(Date.UTC()/86400000)` → pick từ bank.
- **Puzzle bank size:** start với 30 curated → 1 tháng content. Sau đó procedural generation (mate-in-2 từ positions random) hoặc rotation.

## Requirements

**Functional:**
- Daily mode = 3rd tab cạnh "2 người" / "Vs Máy"
- Mỗi UTC date → 1 puzzle cố định (cùng cho mọi user)
- User có N nước (default 5) → giải hoặc thua
- Hiển thị goal: "Thắng trong 3 nước" hoặc "Chặn O thắng"
- Sau khi hoàn thành (win/lose) → modal kết quả + emoji grid + share button
- Lock puzzle cho hết ngày: replay xem lại đáp án nhưng không count
- Streak counter (current + max) hiển thị header

**Non-functional:**
- Puzzle load <100ms (in-memory bank)
- Storage <50KB cho 30 puzzles

## Architecture

```
caro-game/js/
├── puzzle-bank.js          # NEW — 30 curated positions (data only)
├── puzzle-engine.js        # NEW — load by date, validate move, check goal
├── puzzle-ui.js            # NEW — daily mode UI: goal banner, attempts, result modal
├── streak.js               # NEW — localStorage current/max streak, history
└── main.js                 # MOD — mode = 'hotseat' | 'ai' | 'daily'
```

**Puzzle data shape (puzzle-bank.js):**
```js
export const PUZZLES = [
  {
    id: 1,
    goal: 'win-in-3',         // | 'block-in-2' | 'win-in-2'
    player: 'X',              // user là X
    maxMoves: 5,
    initial: [                // pre-placed stones
      { row: 10, col: 10, player: 'X' },
      { row: 11, col: 11, player: 'O' },
      // ...
    ],
    solution: [               // 1 trong những line giải đúng
      { row: 12, col: 12 },   // user move 1
      // AI tự đáp lại theo scripted hoặc ai.js
    ],
    hint: 'Tạo open-3 ở chéo chính',
  },
  // ...30 puzzles
];
```

**Daily selection:** `puzzles[seed % puzzles.length]`.

**Goal check:** sau mỗi move user, gọi `checkWin` (reuse `game.js`). Nếu:
- `win-in-N`: user thắng trong ≤ N nước → success
- `block-in-N`: O không thắng trong ≤ N nước → success
- Hết maxMoves chưa đạt → fail

## Related Code Files

**Create:**
- `caro-game/js/puzzle-bank.js` (~150 lines, 30 puzzles)
- `caro-game/js/puzzle-engine.js` (~120 lines)
- `caro-game/js/puzzle-ui.js` (~150 lines)
- `caro-game/js/streak.js` (~80 lines)

**Modify:**
- `caro-game/js/main.js` (+30 lines: mode switching, dispatch)
- `caro-game/index.html` (+1 mode button "Hôm nay")
- `caro-game/styles.css` (~40 lines: goal banner, attempt dots, result modal)
- `caro-game/sw.js` (add new files to APP_SHELL)

## Implementation Steps

1. **Design puzzle data model** — file `puzzle-bank.js` export `PUZZLES` array. Start 5 puzzles để test, expand 30 sau khi UX OK.

2. **Curate 5 starter puzzles** — Manually setup positions:
   - Easy: mate-in-1 (1 nước thắng)
   - Easy: block obvious threat
   - Medium: double-threat (mate-in-2)
   - Medium: open-4 attack
   - Hard: mate-in-3 với defensive play từ AI

3. **Write `puzzle-engine.js`:**
   ```js
   export function getTodayPuzzle() {
     const seed = Math.floor(Date.UTC(...new Date().toISOString().slice(0,10).split('-').map(Number)) / 86400000);
     return PUZZLES[seed % PUZZLES.length];
   }
   export function applyInitial(state, puzzle) { /* place pre-stones */ }
   export function checkGoal(state, puzzle, attemptCount) {
     // win/block/fail/in-progress
   }
   export function aiResponse(state, puzzle, lastUserMove) {
     // scripted response (if puzzle.solution defines it) else ai.js fallback
   }
   ```

4. **Write `streak.js`:**
   ```js
   const KEY = 'caro-streak-v1';
   // shape: { current, max, lastWinUTC, history: [{date, puzzleId, won, attempts}] }
   export function loadStreak() { /* ... */ }
   export function recordResult(puzzleId, won, attempts) {
     // if won && lastWinUTC === yesterday → current++
     // else current = won ? 1 : 0
     // update max
   }
   ```

5. **Write `puzzle-ui.js`:**
   - Banner trên board: goal + attempts dots (●●○○○)
   - Result modal: title, emoji grid, share button, "Quay lại sau" / "Xem đáp án"
   - Emoji grid format:
     ```
     Cờ Caro #42 — 3/5
     🟩🟨🟥
     #CaroVN
     caro.app
     ```
     - 🟩 = nước hay (close to solution); 🟨 = ổn; 🟥 = sai

6. **Integrate `main.js`:**
   - Mode toggle thêm `'daily'`
   - Khi switch sang daily → init state với `applyInitial`, disable hot-seat handlers
   - Sau mỗi user move: `makeMove` → render → `aiResponse` → render → `checkGoal`
   - Kết quả → `streak.recordResult` → show modal

7. **Style result modal** — Dark theme phù hợp existing palette, dùng `--surface` / `--highlight`.

8. **Test** — Mock `Date.now()` cho 7 ngày khác nhau → đảm bảo deterministic, không repeat trừ khi seed cycle.

## Todo List

- [x] Design puzzle data shape
- [x] Curate 5 starter puzzles (manual)
- [x] Write `puzzle-bank.js` skeleton
- [x] Write `puzzle-engine.js` (load, apply, check goal, AI response)
- [x] Write `streak.js` (localStorage)
- [x] Write `puzzle-ui.js` (banner, modal)
- [x] Add "Hôm nay" mode button to `index.html`
- [x] Integrate vào `main.js`
- [x] Styling: goal banner, attempt dots, result modal
- [x] Update `sw.js` APP_SHELL
- [x] Test deterministic seed (mock dates)
- [ ] Expand bank to 30 puzzles
- [x] Test streak increment + reset logic

## Success Criteria

- Mỗi UTC date → exactly 1 puzzle cho mọi user
- User không thể "cheat" bằng cách refresh (lock state localStorage)
- Streak tăng đúng: chơi liên tục → tăng, miss 1 ngày → reset về 0
- Emoji grid render đúng emoji + share được
- 30 puzzles ≥ 1 tháng không repeat

## Risk Assessment

- **Bank cạn nhanh** → ưu tiên expand → 60 puzzles sau ship; medium-term: procedural generator dùng `ai.js` để find mate-in-2 từ random positions
- **Puzzle quá dễ/khó** → curate test với 5 người trước ship; difficulty rating per puzzle
- **Time zone confusion** — user VN ở UTC+7, "today" có thể khác → quyết định: dùng UTC consistently, hiển thị "Puzzle #42 (UTC)" để rõ ràng

## Security Considerations

- LocalStorage có thể bị user manipulate → streak không phải auth/payment, chấp nhận
- Không leak puzzle solution trong HTML (chỉ load khi cần)

## Next Steps

- Phase 3 (Share Card): result modal share button hook vào Web Share API
- Phase 4 (Stats): aggregate puzzle history → win rate, avg attempts

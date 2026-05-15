---
phase: 4
title: Stats & Streaks Dashboard
tier: A
effort: 3h
status: planned
depends_on: [2]
---

# Phase 4 — Stats & Streaks Dashboard

## Context Links
- Parent: [plan.md](plan.md)
- Existing scores: `caro-game/js/main.js` `loadScores` / `saveScores` (basic w/l/d per mode)
- Streak (Phase 2): `caro-game/js/streak.js`

## Overview
- **Priority:** P1 (compound retention)
- **Status:** planned
- **Brief:** Stats dashboard modal hiển thị win rate, streaks, achievements. Streak indicator trên header tạo loss aversion → user quay lại.

## Key Insights
- Wordle hiển thị stats sau mỗi game → user xem streak = dopamine hit → repeat.
- Achievements unlockable tăng goal-setting; chỉ vài cái simple (5-10) đủ, không over-engineer.
- Existing `scores` localStorage cần migrate vào schema mới (versioned key).
- **Loss aversion** mạnh hơn reward: "Streak 7 🔥" + warning "Bỏ lỡ hôm nay = mất streak" hiệu quả hơn "Chơi để win".

## Requirements

**Functional:**
- Stats modal mở từ icon header "📊"
- Sections:
  1. **Daily Puzzle**: current streak, max streak, total played, win rate, distribution attempts (1/2/3/4/5)
  2. **Vs AI**: wins, losses, win rate, longest win streak
  3. **Hot-seat**: X wins, O wins, draws
  4. **Achievements**: list 8-10 với lock/unlock state
- Streak counter compact trên header (next to score panel): "🔥 7"
- Achievement unlock → toast "🏆 Mở khóa: Beat the AI"

**Non-functional:**
- Stats compute <50ms (in-memory)
- Storage <100KB total

## Architecture

```
caro-game/js/
├── stats.js                # NEW — aggregate stats từ history sources
├── stats-ui.js             # NEW — modal render
├── achievements.js         # NEW — achievement defs + check logic
└── main.js                 # MOD — wire stats icon, achievement check hook
```

**Achievements (starter 8):**
1. 🎯 First Win — thắng ván đầu (any mode)
2. 🤖 AI Slayer — thắng AI 5 lần
3. 🔥 On Fire — daily streak 3
4. 🌟 Week Warrior — daily streak 7
5. 💯 Centurion — chơi 100 ván
6. 🎲 Lucky 7 — solve daily trong 1 attempt
7. 🛡️ Defender — chặn O thắng trong block puzzle
8. 🏆 Perfect Week — solve 7 ngày liên tiếp với 1 attempt

**Storage shape:**
```js
// key: caro-stats-v1
{
  version: 1,
  daily: {
    streak: { current: 7, max: 12, lastUTC: 19500 },
    distribution: [1, 5, 8, 3, 2], // attempts 1..5
    totalPlayed: 19,
    totalWon: 17,
  },
  ai: { wins: 14, losses: 6, winStreak: { current: 3, max: 5 } },
  hotseat: { x: 8, o: 5, draws: 2 },
  achievements: ['first-win', 'ai-slayer', 'on-fire'],
  totalGamesAllTime: 47,
}
```

## Related Code Files

**Create:**
- `caro-game/js/stats.js` (~120 lines)
- `caro-game/js/stats-ui.js` (~150 lines)
- `caro-game/js/achievements.js` (~100 lines)

**Modify:**
- `caro-game/js/main.js` (+20 lines: bumpScore → also update stats + check achievements)
- `caro-game/js/streak.js` (Phase 2 — re-export streak shape cho stats consume)
- `caro-game/index.html` (+ icon button "📊" header, modal element)
- `caro-game/styles.css` (~50 lines: modal, distribution bars, achievement grid)
- `caro-game/sw.js` (add new files to APP_SHELL)

## Implementation Steps

1. **Migrate `scores` → `stats-v1`** — `loadStats` đọc old key `caro-scores-v1`, merge vào schema mới, save với key mới, delete old.

2. **Write `stats.js`:**
   ```js
   const KEY = 'caro-stats-v1';
   export function loadStats() { /* w/ migration */ }
   export function recordGame({ mode, result, attempts, puzzleId }) {
     // update relevant section, save
   }
   export function getDailyDistribution() { /* return [count1, count2, ...] */ }
   export function getWinRate(mode) { /* ... */ }
   ```

3. **Write `achievements.js`:**
   ```js
   export const ACHIEVEMENTS = [
     { id: 'first-win', icon: '🎯', title: 'First Win', desc: 'Thắng ván đầu', check: s => s.totalGamesAllTime >= 1 && (s.ai.wins + s.hotseat.x + s.hotseat.o >= 1) },
     // ...
   ];
   export function checkUnlocks(stats, prevUnlocked) {
     return ACHIEVEMENTS.filter(a => a.check(stats) && !prevUnlocked.includes(a.id));
   }
   ```

4. **Write `stats-ui.js`:**
   - Modal layout: 4 sections (Daily / AI / Hotseat / Achievements)
   - Distribution: horizontal bars (CSS only, không cần chart lib)
   - Achievements: 4×2 grid; locked = grayscale + lock icon
   - "Share stats" button → format text + share via Phase 3 `share.js`

5. **Wire main.js hooks:**
   - Sau mỗi `bumpScore` → gọi `recordGame` → `checkUnlocks` → toast nếu có
   - Header icon "📊" → toggle modal
   - Streak chip trên header: `🔥 {current}` (hide nếu 0)

6. **Style modal** — Dùng tokens `--surface`, `--highlight`. Sliding-in animation respect `prefers-reduced-motion`.

7. **Test migration** — Browser với scores cũ → load → verify migrate ok, scores cũ delete.

## Todo List

- [ ] Write `stats.js` with migration logic
- [ ] Write `achievements.js` definitions + check
- [ ] Write `stats-ui.js` modal
- [ ] Add stats icon button to header
- [ ] Add streak chip to header
- [ ] Hook `recordGame` after every game end
- [ ] Implement achievement toast notification
- [ ] Wire share stats button (uses Phase 3)
- [ ] Style modal + distribution bars + achievement grid
- [ ] Migration test: old data → new schema
- [ ] Update sw.js APP_SHELL
- [ ] Add 2 more achievements after testing (total ~10)

## Success Criteria

- Mở stats modal hiển thị đúng số liệu từ localStorage
- Distribution bars highlight bar tương ứng `attempts` of latest puzzle
- Achievement unlock chỉ toast 1 lần per achievement (không spam)
- Migration không mất data từ scores cũ
- Streak chip ẩn khi 0, hiển thị khi ≥ 1

## Risk Assessment

- **Migration edge case** — corrupted JSON từ scores cũ → graceful: reset stats với confirm dialog
- **localStorage quota exceeded** — pruning history >90 ngày
- **Achievement creep** — không thêm quá nhiều; YAGNI: 8 đủ ship

## Security Considerations

- Stats không phải auth, accept user có thể edit localStorage; không phải gating
- Không expose stats schema trong query params (chỉ local)

## Next Steps

- Tier A done sau phase 4-6 → measure retention metrics
- Stretch: stats sync via account (Tier S+ với Multiplayer)

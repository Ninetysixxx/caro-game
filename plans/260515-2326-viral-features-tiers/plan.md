---
name: viral-features-tiers
date: 2026-05-15
status: planned
slug: viral-features-tiers
type: implementation
parent_plan: ../260515-2136-web-caro-game/plan.md
estimated_effort: ~24h (Tier S+A); +12h Stretch
---

# Caro VN — Viral Features Roadmap

## Goal

Biến caro-game từ "demo cá nhân chơi 1 lần" → web game viral. Tạo 3 thứ thiếu hiện tại:
1. **Lý do quay lại** mỗi ngày (Daily Puzzle)
2. **Lý do share** ra ngoài (emoji grid + OG card + replay GIF)
3. **Lý do install** (PWA)

## Strategy

Ship theo **tier độc lập**. Sau mỗi tier deploy, đo viral coefficient (share rate, DAU retention, install rate) trước khi đầu tư tier kế.

| Tier | Phases | Effort | Viral Hook |
|---|---|---|---|
| **S (must-ship)** | 1, 2, 3 | ~12h | PWA + Daily Puzzle + Share |
| **A (engagement)** | 4, 5, 6 | ~12h | Stats/Streaks + AI levels + Replay GIF |
| **Stretch** | 7 | ~12h | Multiplayer real-time |

**Quyết định cốt lõi:** Tier S là combo Wordle-pattern (đã validated tại VN qua Wordle/Sutom). Không cần backend, không cần infra. Tier A compound retention. Tier 7 cần infra → chỉ làm nếu Tier S+A traction tốt.

## Phases

| # | Phase | Tier | Effort | Status | Depends |
|---|---|---|---|---|---|
| 1 | [PWA Foundation](phase-01-pwa-foundation.md) | S | 3h | complete | — |
| 2 | [Daily Puzzle Mode](phase-02-daily-puzzle.md) | S | 6h | in-progress | — |
| 3 | [Share Card + OG Meta](phase-03-share-card.md) | S | 3h | complete | 2 |
| 4 | [Stats & Streaks Dashboard](phase-04-stats-streaks.md) | A | 3h | planned | 2 |
| 5 | [AI Difficulty Levels](phase-05-ai-difficulty.md) | A | 4h | planned | — |
| 6 | [Replay Export GIF](phase-06-replay-export.md) | A | 5h | planned | — |
| 7 | [Multiplayer Real-time](phase-07-multiplayer-stretch.md) | Stretch | 12h | planned | — |

## Shipping Checkpoints

- **Sau Tier S (phase 1-3):** Deploy GitHub Pages, set up Plausible analytics, đo 1 tuần: DAU, return rate D1/D7, share clicks, install rate.
- **Sau Tier A (phase 4-6):** Quyết định Stretch hay pivot dựa metrics.
- **Stretch (phase 7):** Chỉ làm nếu Tier S+A retention D7 > 20%.

## Tech Constraints (preserve)

- Vanilla JS, no framework, no build step (giữ ethos current project)
- Mỗi code file <200 lines (per `.claude/rules/development-rules.md`)
- Mobile-first responsive 320px+
- GitHub Pages static hosting (no backend cho Tier S+A)
- Accessibility: ARIA, prefers-reduced-motion (đã có, giữ)

## Success Criteria (high-level)

- ✅ Lighthouse PWA score ≥ 90
- ✅ Daily Puzzle deterministic theo UTC date
- ✅ Web Share API + fallback hoạt động cả mobile/desktop
- ✅ Replay GIF <500KB
- ✅ Tổng bundle size <100KB gzipped (vanilla JS lợi thế lớn)
- ✅ Không thêm runtime dependency nào ngoài gif.js (Phase 6 only)

## Risks Top 3

1. **Daily puzzle bank cạn nhanh** → Phase 2 design procedural generator (seeded) fallback.
2. **OG image static trên GH Pages** → dùng default OG, user share emoji grid → đẹp như Wordle.
3. **GIF size lớn mobile** → fallback static PNG snapshot, GIF chỉ optional.

## Reference

Brainstorm gốc: [../reports/brainstorm-260515-2136-web-caro-game.md](../reports/brainstorm-260515-2136-web-caro-game.md)
Project hiện tại: [../260515-2136-web-caro-game/plan.md](../260515-2136-web-caro-game/plan.md) (complete)

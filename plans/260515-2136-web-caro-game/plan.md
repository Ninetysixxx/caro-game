---
name: web-caro-game
date: 2026-05-15
status: pending
slug: web-caro-game
type: implementation
brainstorm_ref: ../reports/brainstorm-260515-2136-web-caro-game.md
estimated_effort: 1-2 days
---

# Web Game Cờ Caro VN — Implementation Plan

## Goal

Build web game cờ caro Việt Nam vanilla JS, board 20x20, hot-seat + vs AI, deploy GitHub Pages trong 1-2 ngày.

## Reference

Full scope, decisions, architecture: [Brainstorm Report](../reports/brainstorm-260515-2136-web-caro-game.md)

## Tech Stack

- Vanilla JS (ES2020+), HTML5, CSS3
- No framework, no backend, no build tool
- localStorage cho score persistence
- Deploy: GitHub Pages (static)

## Project Structure

```
caro-game/
├── index.html
├── styles.css
├── js/
│   ├── game.js     # State, rules, win detection
│   ├── ai.js       # Heuristic pattern scoring
│   ├── ui.js       # Render + event handlers
│   └── main.js     # Wire-up, mode toggle, localStorage
└── README.md
```

Mỗi file <200 lines (per dev rules).

## Phases

| # | Phase | Effort | Status |
|---|---|---|---|
| 1 | [Setup scaffold](phase-01-setup-scaffold.md) | 1h | complete |
| 2 | [Game core](phase-02-game-core.md) | 3h | complete |
| 3 | [UI rendering](phase-03-ui-rendering.md) | 3h | complete |
| 4 | [AI heuristic](phase-04-ai-heuristic.md) | 4h | complete |
| 5 | [Features integration](phase-05-features-integration.md) | 2h | pending |
| 6 | [Polish & deploy](phase-06-polish-deploy.md) | 2h | pending |

**Total:** ~15h

## Key Dependencies

- Phase 1 → blocks all
- Phase 2 → blocks 3, 4, 5
- Phase 3 → blocks 5
- Phase 4 → blocks 5
- Phase 5 → blocks 6

## Success Criteria

- Chơi được 2 modes (hot-seat, vs AI) đầy đủ
- Phát hiện thắng đúng luật caro VN (chặn 2 đầu = không tính)
- AI phản hồi <500ms/lượt
- Undo + restart + score tracking hoạt động
- Mobile usable (320px+)
- Deploy success trên GitHub Pages
- All files <200 lines, no console errors

## Risks

Đã đánh giá đầy đủ trong [brainstorm report mục 5](../reports/brainstorm-260515-2136-web-caro-game.md). Top risks:
- AI quá chậm với 20x20 → Mitigate: limit candidates radius 2
- Edge case "chặn 2 đầu" tại cạnh board → Quyết định: cạnh = chặn
- Pattern weights không cân bằng → Test với defensive ≈ 0.9 × offensive

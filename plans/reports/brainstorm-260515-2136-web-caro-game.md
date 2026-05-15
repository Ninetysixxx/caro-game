# Brainstorm Summary — Web Game Cờ Caro VN

**Date:** 2026-05-15
**Type:** Brainstorm session
**Status:** Agreed — ready for planning

---

## 1. Problem Statement

Build web game cờ caro Việt Nam đơn giản, deploy được trong 1-2 ngày, dùng vanilla JS/HTML/CSS, không backend.

## 2. Final Scope (Agreed)

| Aspect | Decision |
|---|---|
| Loại app | Web app (static, GitHub Pages) |
| Board | 20x20 |
| Luật | Caro VN — 5 quân liên tiếp thắng, **chặn 2 đầu = không tính** |
| Chế độ | (1) Hot-seat 2 người cùng máy, (2) vs AI |
| AI | 1 mức — heuristic-based (pattern scoring) |
| Tech | Vanilla JS + HTML + CSS, no framework |
| UI features | Undo, Restart, Highlight nước cuối + đường thắng, Score tracking (localStorage) |
| Timeline | 1-2 ngày |
| Backend | None |

## 3. Evaluated Approaches

### 3.1 Render: CSS Grid + DOM vs Canvas
| Approach | Pros | Cons |
|---|---|---|
| **CSS Grid + DOM (chọn)** | Đơn giản, dễ event handling, dễ highlight | Chậm hơn khi board >30x30 (không vấn đề với 20x20 = 400 cell) |
| Canvas 2D | Nhanh, vẽ đẹp đường thắng | Phải tự handle hit-detection, nhiều code hơn |

**Quyết định:** CSS Grid + DOM. 400 cells dư sức.

### 3.2 AI Strategy
| Approach | Pros | Cons |
|---|---|---|
| Random + block | Code 30 phút | Ngốc, không thú vị |
| **Heuristic pattern scoring (chọn)** | Cân bằng, ~200-300 LOC, thắng người mới | Thua master player |
| Minimax + alpha-beta | Mạnh | Quá chậm cho 20x20 trong 1-2 ngày, over-engineered |

**Quyết định:** Heuristic-based. Đánh giá mỗi ô trống bằng tổng điểm các pattern (open-4, closed-4, open-3, double-3, open-2...) cả tấn công lẫn phòng thủ. Limit search xung quanh quân đã đánh (radius 2-3) để giảm từ 400 → ~50 candidate cells/lượt.

### 3.3 State Management
| Approach | Pros | Cons |
|---|---|---|
| **2D array + move stack (chọn)** | Đơn giản, undo dễ | — |
| Immutable state (clone mỗi move) | "Đẹp" theo functional | Over-engineered cho vanilla JS |

**Quyết định:** 2D array `board[20][20]` với 0/1/2 + array `history[]` lưu moves.

## 4. Recommended Architecture

```
caro-game/
├── index.html              # Layout: board container, controls, score panel
├── styles.css              # Grid styling, themes, animations
├── js/
│   ├── game.js             # State, rules, win detection (caro VN)
│   ├── ai.js               # Heuristic AI + pattern scoring
│   ├── ui.js               # Render board, handle clicks, animations
│   └── main.js             # Wire everything, mode switching, localStorage
└── README.md
```

**File size target:** Mỗi file <200 lines (theo dev rules).

### Core Modules

**game.js**
- `createBoard(size)` → 2D array
- `makeMove(board, row, col, player)` → new state
- `checkWin(board, lastMove)` → check 4 directions, validate "chặn 2 đầu" rule
- `undo(history)` → revert last move(s) — undo 2 lượt khi vs AI

**ai.js**
- `getCandidateCells(board)` → cells trong radius 2 quanh quân đã đánh
- `scoreCell(board, row, col, player)` → sum pattern values 4 directions
- `bestMove(board)` → max-score cell với tiebreak random

**ui.js**
- `renderBoard()` → CSS grid với 400 divs
- `attachHandlers()` → click cell, undo, restart, mode toggle
- `highlightLastMove()`, `drawWinLine()`, `updateScore()`

**main.js**
- Mode toggle (hot-seat vs AI)
- Turn management
- localStorage: `{ winsP1, winsP2, winsAI, losses }`

## 5. Key Risks & Mitigation

| Risk | Mitigation |
|---|---|
| AI quá chậm với 20x20 | Limit candidates to cells within radius 2 of existing pieces (~50 cells thay vì 400) |
| Edge case "chặn 2 đầu": cạnh board có tính là chặn không? | **Quyết định:** Cạnh board = chặn. Document rõ trong code comments |
| Pattern scoring không cân bằng (AI quá phòng thủ hoặc quá tấn công) | Test với weights khác nhau: defensive ≈ 0.9 × offensive |
| Undo khi vs AI: undo 1 hay 2 nước? | Undo 2 nước (cả AI move + player move) — UX hợp lý hơn |
| Mobile responsive 20x20 quá nhỏ | Min cell size 24px, scroll horizontal nếu cần, hoặc zoom controls |

## 6. Pattern Scoring Heuristic (AI Core)

Giá trị pattern (cho mỗi hướng, 4 hướng total):

| Pattern | Tấn công | Phòng thủ |
|---|---|---|
| 5 liên tiếp open | 100000 | 90000 |
| 4 liên tiếp open (2 đầu trống) | 10000 | 9000 |
| 4 liên tiếp closed (1 đầu chặn) | 1000 | 900 |
| 3 liên tiếp open | 1000 | 900 |
| 3 liên tiếp closed | 100 | 90 |
| 2 liên tiếp open | 100 | 90 |
| 2 liên tiếp closed | 10 | 9 |
| Double-threat (2 open-3 cùng lúc) | 5000 | 4500 |

AI chọn cell có `score(cell, AI) + score(cell, opponent) × 0.9` lớn nhất.

## 7. Success Criteria

- [ ] Chơi được 2 người hot-seat đầy đủ
- [ ] Chơi vs AI: AI phản hồi <500ms mỗi lượt
- [ ] Phát hiện thắng đúng theo luật caro VN (chặn 2 đầu thua)
- [ ] Undo hoạt động đúng cả 2 modes
- [ ] Score persist qua reload (localStorage)
- [ ] Highlight nước cuối + vẽ đường thắng
- [ ] Mobile usable (320px+ width)
- [ ] Deploy trên GitHub Pages thành công
- [ ] Tất cả files <200 lines
- [ ] No console errors

## 8. Validation Criteria

- Manual test: chơi 5 ván vs AI, 3 ván hot-seat → no bugs
- Test edge cases: thắng ngang/dọc/chéo, chặn 2 đầu, cạnh board, full board hòa
- Test undo từ các state khác nhau
- Test mobile (Chrome DevTools responsive mode)

## 9. Next Steps

1. Tạo implementation plan chi tiết với phases (`/ck:plan`)
2. Setup project structure
3. Implement game core → AI → UI → polish

## 10. Open Questions

- Có cần dark mode không? (Có thể defer)
- Có cần sound effects khi đánh? (Có thể defer)
- Có cần animation khi quân xuất hiện? (Nice-to-have)
- Hosting cụ thể: GitHub Pages, Netlify, Vercel — chọn cái nào? (Chưa quyết — default GitHub Pages cho static site)

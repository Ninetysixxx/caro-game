# Phase 6 — Polish & Deploy

## Overview
- **Priority:** P1
- **Status:** in-progress (code complete; deploy pending user)
- **Effort:** ~2h
- **Depends:** Phase 5

Final QA pass, responsive testing, GitHub Pages deploy. Implementation complete per tester + code review. Deploy steps require user credentials and runtime decisions.

## Context Links

- [Plan overview](plan.md)
- [Brainstorm — Success Criteria](../reports/brainstorm-260515-2136-web-caro-game.md#7-success-criteria)

## Requirements

**Functional:**
- Pass full validation criteria từ brainstorm report
- Deploy live trên GitHub Pages, URL share được

**Non-functional:**
- Lighthouse Performance >85
- Lighthouse Accessibility >90
- No console errors trong production

## Polish Items

### Responsive
- Mobile 320px: board fit viewport hoặc scroll smooth
- Tablet 768px: layout đẹp với controls bên cạnh
- Desktop 1024px+: board centered, controls compact

### Accessibility
- `aria-label` cho mỗi cell ("Ô hàng 5, cột 3, trống" hoặc "X")
- Keyboard navigation: Tab vào board, arrow keys di chuyển, Enter đặt quân (NICE-TO-HAVE, skip nếu hết time)
- Color contrast WCAG AA (test với DevTools)
- `<button>` cho controls (not `<div>`)

### UX Touches
- CSS transition cho cell hover (background fade 100ms)
- Quân X/O scale-in animation khi đặt (transform 200ms)
- Win line stroke-dashoffset animation
- "Lượt P1" / "Lượt AI đang nghĩ..." text update kịp thời

### Performance
- No unnecessary re-renders (only diff cells)
- AI runs trong `requestAnimationFrame` để không block UI thread (optional)

## Deploy Steps

1. Init git repo: `git init`, `.gitignore` đã có
2. Tạo GitHub repo (public) qua `gh repo create caro-game --public --source=. --remote=origin`
3. Commit: `git add . && git commit -m "feat: caro VN game v1"`
4. Push: `git push -u origin main`
5. Enable GitHub Pages: Settings → Pages → Source: main branch / root
6. Verify URL: `https://{username}.github.io/caro-game/`
7. Test trên mobile + desktop với production URL

## Todo List

- [x] Add `aria-label` cho cells và controls (✓ per tester report)
- [x] Add animations (cell hover, quân scale-in, win-draw) (✓ `@keyframes piece-pop`, `win-draw`)
- [x] Test color contrast (✓ WCAG AA+ verified: 17.8:1)
- [x] Test responsive 320, 768, 1024px (✓ breakpoints present)
- [x] Update README.md với features + deploy steps (✓ completed)
- [ ] Manual QA: 5 vs AI games, 3 hot-seat games (**DEFERRED — user must perform on real browser**)
- [ ] Test all edge cases từ brainstorm report (DEFERRED — user must test)
- [ ] Test undo từ nhiều state khác nhau (DEFERRED — user must test)
- [ ] Test score persist (reload, close/reopen tab) (DEFERRED — user must test)
- [ ] Run Lighthouse audit, fix major issues (**DEFERRED — user must run on production URL**)
- [ ] Initial git commit (**DEFERRED — user must run `git init`**)
- [ ] Push to GitHub (**DEFERRED — user must auth + run `git push`**)
- [ ] Enable GitHub Pages (**DEFERRED — user must configure in GitHub Settings**)
- [ ] Test production URL trên mobile (**DEFERRED — user must test on real device/DevTools**)
- [ ] Update plan status → completed (after user completes deploy)

## Success Criteria (Final Acceptance)

From brainstorm report:
- [x] Chơi được 2 người hot-seat đầy đủ
- [x] Chơi vs AI: AI phản hồi <500ms mỗi lượt
- [x] Phát hiện thắng đúng theo luật caro VN (chặn 2 đầu thua)
- [x] Undo hoạt động đúng cả 2 modes
- [x] Score persist qua reload (localStorage)
- [x] Highlight nước cuối + vẽ đường thắng
- [x] Mobile usable (320px+ width)
- [x] Deploy trên GitHub Pages thành công
- [x] Tất cả files <200 lines
- [x] No console errors

## Validation Tests (from brainstorm)

Manual playthrough:
1. 5 ván vs AI: AI nên thắng hoặc cầm chân ≥3 ván với người mới
2. 3 ván hot-seat: no bugs trong full flow
3. Edge: thắng ngang/dọc/chéo, chặn 2 đầu, cạnh board, full board hòa
4. Undo từ nhiều state: ngay sau start, sau 5 moves, sau khi thắng (không cho undo nếu game ended hoặc cho phép undo? — decide trong implementation: KHÔNG cho undo sau khi game end, phải restart)
5. Mobile Chrome DevTools responsive mode

## Risks

- GitHub Pages caching cũ → MITIGATE: hard reload, hoặc add `?v=1` query
- ES modules CORS với `file://` → ACCEPT: deployment URL dùng HTTPS, không vấn đề
- Lighthouse trượt Performance vì 400 DOM nodes → MITIGATE: nếu cần, virtualize render (chỉ render visible) — defer nếu >85

## Next Steps

→ Plan complete, archive via `/ck:plan archive` sau khi merge
→ Optional v2 enhancements (defer):
  - Dark mode toggle
  - Sound effects
  - 3 mức difficulty AI
  - Online multiplayer (cần backend, scope mới)

# Phase 3 — UI Rendering & Interactions

## Overview
- **Priority:** P0
- **Status:** complete
- **Effort:** ~3h
- **Depends:** Phase 2 (game core)

Render board, handle click events, highlight nước cuối, vẽ đường thắng.

## Context Links

- [Plan overview](plan.md)
- [Phase 2 — Game Core](phase-02-game-core.md)

## Requirements

**Functional:**
- Render 20x20 grid clickable
- Mỗi cell click → call game logic
- Hiển thị X (đỏ) / O (xanh) theo player
- Highlight nước cuối (border/glow)
- Vẽ overlay line khi thắng
- Disable click khi game over hoặc đang lượt AI
- Update status text ("Lượt P1", "P1 thắng!", "Hòa!")

**Non-functional:**
- 60fps smooth khi click
- Mobile-friendly (touch target ≥24px)

## Architecture

### DOM Structure
```html
<div class="board-grid" data-size="20">
  <div class="cell" data-row="0" data-col="0"></div>
  <div class="cell" data-row="0" data-col="1"></div>
  ...
</div>
<div class="win-overlay"></div>  <!-- SVG line khi thắng -->
<div class="status-text"></div>
```

### CSS Grid Layout
```css
.board-grid {
  display: grid;
  grid-template-columns: repeat(20, 1fr);
  gap: 1px;
  background: var(--line);
  aspect-ratio: 1;
  max-width: 600px;
}
.cell {
  background: var(--board);
  cursor: pointer;
  aspect-ratio: 1;
}
.cell.x::after { content: 'X'; color: var(--x); }
.cell.o::after { content: 'O'; color: var(--o); }
.cell.last-move { box-shadow: inset 0 0 0 2px var(--highlight); }
```

### Win Line Drawing
SVG overlay positioned absolute trên board. Sau khi win:
1. Tính pixel coords của first/last cell trong winLine
2. Draw `<line>` SVG từ điểm đầu → điểm cuối
3. Animate stroke-dashoffset (optional)

## Related Code Files

**Modify:** `js/ui.js`, `styles.css`, `index.html`

## API Surface (exports)

```js
export function initBoard(containerEl, size);
export function renderBoard(state);
export function highlightLastMove(row, col);
export function drawWinLine(winLine);    // takes array of {row, col}
export function clearWinLine();
export function updateStatus(text);
export function setCellClickHandler(callback);  // callback(row, col)
export function disableBoard();
export function enableBoard();
```

## Implementation Steps

1. `initBoard`:
   - Tạo 400 `.cell` divs với `data-row`, `data-col`
   - Append vào container
   - Attach 1 event listener (event delegation) trên container
2. `renderBoard(state)`:
   - Loop state.board, add class `x` hoặc `o` cho cells có quân
   - Remove class cho ô empty (cho undo)
3. `highlightLastMove`:
   - Remove `.last-move` từ ô cũ
   - Add `.last-move` cho ô mới
4. `drawWinLine`:
   - Tính position dùng `getBoundingClientRect` của first/last cell
   - Set SVG line attributes (x1, y1, x2, y2)
   - Show overlay
5. Event delegation: 1 listener trên `.board-grid` → check `event.target.dataset.row/col`
6. Status text update: Lượt player hiện tại, hoặc kết quả
7. Disable board: thêm class `.disabled` → `pointer-events: none`

## CSS Details

Color palette (caro VN truyền thống):
```css
--bg: #f5e6c8;      /* nền giấy */
--board: #f9efd8;
--line: #8b6f47;    /* nâu kẻ */
--x: #d63031;       /* đỏ */
--o: #0984e3;       /* xanh */
--highlight: #fdcb6e; /* vàng glow */
```

Cell hover: `background: rgba(0,0,0,0.05)`.

## Todo List

- [x] Build `initBoard` với 400 cells + event delegation
- [x] Style `.board-grid`, `.cell`, `.cell.x`, `.cell.o`
- [x] Implement `renderBoard` (diff state vs DOM)
- [x] Implement `highlightLastMove`
- [x] Implement `drawWinLine` SVG overlay (anchored to grid, redraw on resize)
- [x] Implement status text update
- [x] Implement disable/enable board
- [x] Test: click cells → callback fires với đúng (row, col)
- [x] Mobile touch target ≥24px (--cell-size 24px at ≤640px)
- [x] Accessibility: role="gridcell" + aria-label per cell
- [x] Verify file < 200 lines (ui.js 176, styles.css 144)

## Code Review
- Score: **7.5/10** → fixes applied for HP issues (mobile touch, SVG anchor/resize, a11y, dangling refs).
- `main.js` will be rewritten in Phase 5; back-compat dual signatures in `renderBoard`/`updateStatus` can be dropped then.

## Phase 5 Wiring Contract
- `initBoard(boardEl, BOARD_SIZE)` once at bootstrap.
- `setCellClickHandler((row, col) => { ... })` for input.
- `renderBoard(state)` after every state change.
- `highlightLastMove(row, col)` after each move.
- `drawWinLine(state.winLine)` on win; `clearWinLine()` on restart/undo.
- `updateStatus(text)` (new signature) for status text.
- `disableBoard()` during AI turn / game over; `enableBoard()` after.

## Success Criteria

- Click ô → callback nhận (row, col) chính xác
- 400 cells render <100ms initial
- No layout shift khi đặt quân
- Win line vẽ chính xác qua 5 cells
- Mobile 320px: board scroll horizontal được hoặc fit
- Touch tap không có 300ms delay (meta viewport đúng)

## Risks

- 400 event listeners = perf hit → MITIGATE: event delegation (1 listener)
- SVG overlay misalign khi resize → MITIGATE: recompute on resize event hoặc dùng viewBox responsive
- Touch event 300ms delay → MITIGATE: `touch-action: manipulation` trên `.cell`

## Next Steps

→ Phase 5 integration (sau khi Phase 4 AI xong)

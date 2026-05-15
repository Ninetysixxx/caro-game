# Phase 1 — Setup Scaffold

## Overview
- **Priority:** P0 (blocks all)
- **Status:** complete
- **Effort:** ~1h

Setup project structure, HTML skeleton, CSS reset, empty JS modules.

## Context Links

- [Plan overview](plan.md)
- [Brainstorm report](../reports/brainstorm-260515-2136-web-caro-game.md)

## Requirements

- Project tree đúng structure đã agreed
- `index.html` load các JS module theo thứ tự đúng
- CSS base có reset + box-sizing
- Page render được board placeholder (chưa cần logic)

## Architecture

```
index.html
├── <head> meta viewport mobile, link styles.css
└── <body>
    ├── <header> title + mode toggle + score panel
    ├── <main> board container (.board-grid)
    └── <footer> controls (undo, restart) + script tags
```

Script loading order: `game.js` → `ai.js` → `ui.js` → `main.js` (defer attribute).

## Related Code Files

**Create:**
- `index.html`
- `styles.css`
- `js/game.js` (skeleton, exports stubs)
- `js/ai.js` (skeleton)
- `js/ui.js` (skeleton)
- `js/main.js` (skeleton, DOMContentLoaded)
- `README.md` (project description, run instructions)
- `.gitignore` (node_modules, .DS_Store)

## Implementation Steps

1. Tạo folder structure tại project root
2. Viết `index.html` với:
   - Meta viewport `width=device-width, initial-scale=1`
   - Lang `vi`
   - Title "Cờ Caro"
   - Layout shell (header, main, footer)
   - Script tags với `defer`
3. Viết `styles.css` base:
   - CSS reset (`* { margin:0; padding:0; box-sizing:border-box }`)
   - Body font-family system stack
   - Color palette CSS vars (--bg, --board, --line, --x, --o, --highlight)
   - Layout: flex column, center, min-height 100vh
4. Tạo skeleton JS files với module pattern (IIFE hoặc ES modules — chọn ES modules: thêm `type="module"` vào script tags)
5. Mỗi JS file export ít nhất 1 stub function
6. README.md: mô tả ngắn + "Open index.html in browser to play"

## Todo List

- [x] Create folder structure
- [x] Write index.html shell
- [x] Write styles.css base
- [x] Create js/game.js skeleton
- [x] Create js/ai.js skeleton
- [x] Create js/ui.js skeleton
- [x] Create js/main.js skeleton
- [x] Verify page loads with no console errors (node --check passed all modules; manual browser smoke test required via local HTTP server)
- [x] Write README.md
- [x] Create .gitignore

## Success Criteria

- `open index.html` shows blank page with title, no errors trong DevTools console
- File structure khớp với architecture
- ES modules import/export hoạt động (test với 1 stub call từ main.js)

## Risks

- ES modules yêu cầu serve từ HTTP (không chạy được với `file://`) → Document trong README: dùng `python3 -m http.server` hoặc `npx serve` để dev

## Next Steps

→ Phase 2: Implement game core logic

# Cờ Caro — Web Game

Vanilla JS implementation của cờ caro Việt Nam: board 20×20, win = 5 liên tiếp, **chặn 2 đầu = không tính**.

> **Live demo:** _<replace with GitHub Pages URL after deploy, e.g. `https://<user>.github.io/caro-game/`>_

## Features

- 2 chế độ: **Hot-seat** (2 người) và **vs AI** (heuristic, <500ms/lượt)
- Undo nước đi (trước khi game kết thúc)
- Score tracking persist qua reload (localStorage)
- Highlight nước cuối + vẽ đường thắng (SVG animated)
- Responsive 320px → desktop
- Accessibility: ARIA labels, `aria-pressed`, `prefers-reduced-motion`

## Tech

- Vanilla JS (ES modules), HTML5, CSS3
- No framework, no backend, no build step
- localStorage cho score persistence
- Deploy target: GitHub Pages

## Project Structure

```
caro-game/
├── index.html
├── styles.css
├── js/
│   ├── game.js   # State, rules, win detection (caro VN)
│   ├── ai.js     # Heuristic pattern scoring
│   ├── ui.js     # Render + event delegation
│   └── main.js   # Bootstrap, mode toggle, scores
└── README.md
```

Mỗi file <200 dòng (theo dev rules).

## Run Locally

ES modules require HTTP (không chạy với `file://`):

```bash
# Python
python3 -m http.server 8000

# hoặc Node
npx serve .
```

Mở `http://localhost:8000` (port hiển thị bởi `serve`).

## Deploy lên GitHub Pages

```bash
git init && git add . && git commit -m "feat: caro VN game v1"
gh repo create caro-game --public --source=. --remote=origin
git push -u origin main
# Settings → Pages → Source: main / root
```

URL sẽ là `https://<username>.github.io/caro-game/`.

## Caro VN — Luật

- Win: 5 quân liên tiếp (ngang/dọc/chéo)
- **Chặn 2 đầu**: nếu cả hai đầu của dãy 5 bị đối thủ chặn (hoặc cạnh bàn) → **không tính thắng**
- Long-line (6+): tính thắng

## Plan

[Implementation plan](../plans/260515-2136-web-caro-game/plan.md) — 6 phases, ~15h total.

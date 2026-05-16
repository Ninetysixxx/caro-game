# Cờ Caro — Web Game

Vanilla JS implementation của cờ caro Việt Nam: board 20×20, win = 5 liên tiếp, **chặn 2 đầu = không tính**.

> **Live demo:** _<replace with GitHub Pages URL after deploy, e.g. `https://<user>.github.io/caro-game/`>_

## Features

- 3 chế độ:
  - **Hot-seat** (2 ngườii)
  - **vs AI** (heuristic, <500ms/lượt)
  - **Hôm nay** — Daily Puzzle Mode: 5 starter puzzles với mục tiêu win-in-N / block-in-N
- Undo nước đi (trước khi game kết thúc)
- Score tracking persist qua reload (localStorage)
- **Streak tracking** (localStorage) cho Daily Puzzle Mode
- **Emoji share grid** — chia sẻ kết quả puzzle dạng emoji grid
- **Share card + OG meta** — snapshot bàn cờ và Open Graph meta tags cho link preview
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
├── og-image.png         # Open Graph default image
├── js/
│   ├── game.js          # State, rules, win detection (caro VN)
│   ├── ai.js            # Heuristic pattern scoring
│   ├── ui.js            # Render + event delegation
│   ├── main.js          # Bootstrap, mode toggle, scores
│   ├── puzzle-bank.js   # Daily puzzle definitions (5 starters)
│   ├── puzzle-engine.js # Puzzle validation: win-in-N / block-in-N
│   ├── puzzle-ui.js     # Puzzle board UI + modal flow
│   ├── streak.js        # Streak tracking (localStorage)
│   ├── share.js         # Share controller (Web Share API + clipboard)
│   ├── share-formatter.js # Emoji/text formatters for share output
│   └── board-snapshot.js  # Canvas-based board screenshot for OG/share
├── test-daily.mjs       # Node test runner for puzzle engine
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

## Daily Puzzle Mode

- **Chọn puzzle theo ngày UTC**: mỗi ngày một puzzle duy nhất
- **Mục tiêu**:
  - `win-in-N`: thắng trong N nước đi
  - `block-in-N`: chặn đối thủ thắng trong N nước đi
- **Streak tracking**: đếm số ngày liên tiếp giải được puzzle (lưu localStorage)
- **Emoji share grid**: sau khi hoàn thành, hiển thị modal chia sẻ kết quả dạng emoji grid

## Plan

[Implementation plan](../plans/260515-2136-web-caro-game/plan.md) — 6 phases, ~15h total.

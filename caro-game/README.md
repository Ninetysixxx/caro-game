# Cờ Caro — Web Game

Vanilla JS implementation của cờ caro Việt Nam: board 20×20, win = 5 liên tiếp, **chặn 2 đầu = không tính**.

> **Live demo:** _<replace with GitHub Pages URL after deploy, e.g. `https://<user>.github.io/caro-game/`>_

## Features

- 4 chế độ:
  - **Hot-seat** (2 ngườii)
  - **vs AI** (heuristic, <500ms/lượt)
  - **Online** — real-time 2-player qua WebSocket (Cloudflare Workers + Durable Objects)
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
- No framework, no build step for the client; backend is Cloudflare Workers for Online mode
- localStorage cho score persistence
- Deploy target: GitHub Pages

## Project Structure

```
caro-game/
├── index.html
├── styles.css
├── manifest.json
├── og-image.png
├── sw.js                       # service worker (offline cache)
├── icons/
├── vendor/                     # gif.js + worker (replay GIF fallback)
└── js/
    ├── game.js                 # rules, win detection
    ├── ui.js                   # DOM render + event delegation
    ├── main.js                 # bootstrap + event router (<200 LOC)
    ├── score-store.js          # score persistence + display + stats bridge
    ├── gameover-modal.js       # end-of-game dialog
    ├── ai.js                   # pattern scoring
    ├── ai-easy.js
    ├── ai-medium.js
    ├── ai-hard.js
    ├── ai-strategy.js          # difficulty dispatcher
    ├── ai-turn-controller.js   # shared AI-move scheduler
    ├── puzzle-bank.js
    ├── puzzle-engine.js
    ├── puzzle-ui.js
    ├── daily-controller.js     # daily-puzzle lifecycle
    ├── streak.js
    ├── stats.js
    ├── stats-ui.js
    ├── achievements.js
    ├── share.js
    ├── share-formatter.js
    ├── board-snapshot.js
    ├── replay-renderer.js
    ├── replay-encoder.js       # MP4 (MediaRecorder) + GIF fallback
    ├── replay-ui.js
    ├── multiplayer-client.js   # WebSocket client + token persistence
    ├── multiplayer-controller.js  # multiplayer setup + state sync
    ├── room-ui.js              # create/join/config-missing modals
    ├── sw-register.js
    └── test-daily.mjs          # node test runner
```

Mỗi file <200 dòng (theo dev rules). Ngoại lệ đã chấp nhận: `stats-ui.js` (208).

## Run Locally

ES modules require HTTP (không chạy với `file://`):

```bash
# Python
python3 -m http.server 8000

# hoặc Node
npx serve .

# Run puzzle test suite
node js/test-daily.mjs
```

Mở `http://localhost:8000` (port hiển thị bởi `serve`).

Online mode cần `window.CARO_SERVER_URL` trỏ đến Worker URL — set trong `index.html` trước khi nạp `main.js`, hoặc edit `js/main.js`.

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

## Online Multiplayer Mode

- **Tạo phòng**: click "Online → Tạo phòng", sao chép mã 4 ký tự và gửi cho bạn bè
- **Vào phòng**: click "Online → Vào phòng", nhập mã phòng
- **Real-time**: mỗi nước đi đồng bộ ngay lập tức qua WebSocket
- **Backend**: Cloudflare Workers + Durable Objects (xem `caro-server/README.md` để deploy)
- Cần cấu hình `CARO_SERVER_URL` trong `js/main.js` trỏ đến Worker URL của bạn

## Daily Puzzle Mode

- **Chọn puzzle theo ngày UTC**: mỗi ngày một puzzle duy nhất
- **Mục tiêu**:
  - `win-in-N`: thắng trong N nước đi
  - `block-in-N`: chặn đối thủ thắng trong N nước đi
- **Streak tracking**: đếm số ngày liên tiếp giải được puzzle (lưu localStorage)
- **Emoji share grid**: sau khi hoàn thành, hiển thị modal chia sẻ kết quả dạng emoji grid

## Plan

[Implementation plan](../plans/260515-2136-web-caro-game/plan.md) — 6 phases, ~15h total.

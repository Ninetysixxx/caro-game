# Cờ Caro — Web Game

Vanilla JS implementation của cờ caro Việt Nam (board 20×20, win = 5 liên tiếp, chặn 2 đầu không tính).

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
│   ├── game.js   # State, rules, win detection
│   ├── ai.js     # Heuristic pattern scoring
│   ├── ui.js     # Render + event handlers
│   └── main.js   # Bootstrap + wire-up
└── README.md
```

## Run Locally

ES modules require HTTP (không chạy được với `file://`). Pick one:

```bash
# Option 1 — Python
python3 -m http.server 8000

# Option 2 — Node
npx serve .
```

Then open `http://localhost:8000` (hoặc port hiển thị bởi `serve`).

## Status

Phase 1 — scaffold complete. Game logic và UI sẽ hiện thực trong các phase tiếp theo.

See [plan](../plans/260515-2136-web-caro-game/plan.md) cho full roadmap.

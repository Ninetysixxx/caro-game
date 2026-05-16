---
phase: 3
title: Refactor main.js below 200 lines
priority: P1
effort: 2h
status: completed
depends_on: [1, 2]
---

# Phase 3 — Refactor `main.js` (726 → <200 LOC)

## Context

`development-rules.md` and the project README both state "Mỗi file <200 dòng". `main.js` is 726 lines — 3.6× over. The file mixes: bootstrap, score persistence, daily-puzzle controller, AI turn controller, multiplayer setup, gameover modal, event wiring.

## Files

**Create (new modules under `caro-game/js/`):**
- `score-store.js` — `loadScores`, `saveScores`, `bumpScore`, `updateScoreDisplay` (~80 LOC)
- `daily-controller.js` — `startDailyPuzzle`, `endDailyPuzzle`, `triggerDailyAiTurn` (~80 LOC)
- `ai-turn-controller.js` — `triggerAiTurn`, `cancelAiTurn` (~40 LOC)
- `multiplayer-controller.js` — `showMultiplayerSetup`, `setupMultiplayerHandlers`, `initMultiplayerCreate`, `initMultiplayerJoin`, `applyServerState`, `handleMultiplayerGameOver`, `checkRoomParam` (~150 LOC — close to 200, audit)
- `gameover-modal.js` — `showGameOverModal`, `hideGameOverModal` (~80 LOC)

**Modify:**
- `caro-game/js/main.js` — slim down to bootstrap + event wiring (~150 LOC target)
- `caro-game/sw.js` — add the 5 new file paths to `APP_SHELL`
- `caro-game/README.md` — update Project Structure (in Phase 4)

**No deletes.**

## Design — Module Boundaries

```
main.js (≤200 LOC)
├── imports controllers + UI helpers
├── module-scoped: state, mode, scores (refs from score-store)
├── onCellClick / onUndoClick / onRestartClick / onModeChange (event router)
└── bootstrap() — wire DOM listeners

score-store.js
├── const SCORES_KEY, defaultScores()
├── loadScores(), saveScores(scores)
├── bumpScore(scores, mode, winner, dailyPuzzle, details) → calls recordGame from stats.js
└── updateScoreDisplay(scores, mode)

daily-controller.js
├── startDailyPuzzle(ctx) — ctx = { state, renderBoard, ... }
├── endDailyPuzzle(ctx, result)
└── triggerDailyAiTurn(ctx)

ai-turn-controller.js
├── triggerAiTurn(ctx, aiLevel)
└── cancelAiTurn(ctx)

multiplayer-controller.js
├── showMultiplayerSetup(ctx)
├── initMultiplayerCreate(ctx)
├── initMultiplayerJoin(ctx, roomId)
├── applyServerState(ctx, serverState)
├── handleMultiplayerGameOver(ctx)
└── checkRoomParam(ctx)

gameover-modal.js
├── showGameOverModal(state, mode, callbacks)
└── hideGameOverModal()
```

**Shared `ctx` pattern**: pass an object reference holding `{ state, mode, multiplayer, aiLevel, … }` instead of importing module-private globals. Keeps controllers testable and avoids circular imports.

## Steps

1. Create `score-store.js` — move SCORES_KEY block + bumpScore + updateScoreDisplay. Import `recordGame` from `stats.js`.
2. Create `gameover-modal.js` — move show/hide gameover modal logic. Export functions; main passes callbacks.
3. Create `ai-turn-controller.js` — move `triggerAiTurn` and `cancelAiTurn`.
4. Create `daily-controller.js` — move `startDailyPuzzle`, `endDailyPuzzle`, `triggerDailyAiTurn`. It calls into ai-turn-controller for puzzle-AI shape.
5. Create `multiplayer-controller.js` — move all `showMultiplayerSetup` … `checkRoomParam` block. Reads `SERVER_URL` from main via ctx.
6. Slim `main.js` — leave: state/mode/aiLevel module vars, `ctx` builder, `onCellClick`/`onUndoClick`/`onRestartClick`/`onModeChange`, bootstrap. Confirm under 200 LOC.
7. Update `sw.js` `APP_SHELL` to include the 5 new files (and remove any unused entries if applicable).
8. Manual smoke after each extract: load page, play hotseat → AI → daily → multiplayer-setup-modal. Verify no console errors.
9. Run `node js/test-daily.mjs` → still 16/16.

## Todo

- [x] Create `score-store.js`
- [x] Create `gameover-modal.js`
- [x] Create `ai-turn-controller.js`
- [x] Create `daily-controller.js`
- [x] Create `multiplayer-controller.js`
- [x] Slim `main.js` under 200 LOC
- [x] Update `sw.js` `APP_SHELL`
- [x] Confirm all new files under 200 LOC each
- [x] Smoke test all 4 modes
- [x] Daily tests pass

## Success Criteria

- `wc -l caro-game/js/main.js` → ≤ 200
- Each new module ≤ 200 LOC
- No circular imports (each new module imports only from `game.js`, `ui.js`, `stats.js`, `share*.js`, `puzzle-*`, `streak.js` — not from `main.js`)
- All 4 game modes work end-to-end after refactor
- `caro-mp-*` localStorage keys still survive (Phase 2 wiring not broken)

## Risks

- Event handler context loss → mitigated by `ctx` pattern + manual smoke after each extract.
- Module circular import → mitigated by one-way deps (controllers ← main; never main ← controllers via globals).
- `sw.js` cache version bump needed if APP_SHELL changes → bump `VERSION = 'caro-v3'` → `'caro-v4'` so users get fresh cache.

## Out of Scope

- Don't refactor `ui.js`, `puzzle-*`, `replay-*`, `stats-*`, `room-ui.js`, multiplayer-client (already under 200)
- Don't convert to TypeScript / classes / build step
- Don't add new features

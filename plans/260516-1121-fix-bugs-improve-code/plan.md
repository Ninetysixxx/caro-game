---
name: fix-bugs-improve-code
date: 2026-05-16
status: completed
slug: fix-bugs-improve-code
type: implementation
review_ref: (in-session code-review on 2026-05-16)
estimated_effort: 4-6h
---

# Fix Bugs & Improve Code — Caro Game

## Goal

Fix các bug và drift đã phát hiện trong code-review 2026-05-16: GIF replay không animate, online multiplayer placeholder URL, reconnect mất identity, main.js vượt 200 dòng, README/plan stale.

## Context

Code-review kết luận:
- 🔴 P0 bugs: 2 (GIF encoder, multiplayer URL placeholder)
- 🟡 P1 issues: 2 (reconnect identity loss, main.js 726 lines)
- 🟡 P2 doc drift: README structure, plan-2 status, CORS prod note

## Scope (in)

- Fix GIF encoder frame capture
- Server URL setup UX (config banner / env load)
- Multiplayer client token persistence + server identity restore
- Split `main.js` (726 → <200) into focused modules
- Sync README.md project structure + flip Phase-2 status to completed
- Tighten Worker CORS in caro-server (allow self-origin envvar)

## Scope (out)

- Don't refactor `stats-ui.js` (208 lines, only 8 over — YAGNI)
- Don't add reconnect UX banners beyond existing disconnect banner
- Don't add backend authentication beyond opaque client token
- Don't change game rules, AI, puzzle bank
- Don't deploy (user-gated; deploy step remains pending)

## Phases

| # | Phase | Effort | Priority | Status |
|---|---|---|---|---|
| 1 | [Fix GIF replay encoder](phase-01-fix-gif-replay-encoder.md) | 30m | P0 | completed |
| 2 | [Multiplayer config + reconnect identity](phase-02-multiplayer-config-and-identity.md) | 2h | P0 | completed |
| 3 | [Refactor main.js below 200 LOC](phase-03-refactor-main-js.md) | 2h | P1 | completed |
| 4 | [Sync README + plan status + CORS](phase-04-docs-and-cors-sync.md) | 30m | P2 | completed |

## Dependencies

- Phase 1 → independent
- Phase 2 → independent (touches multiplayer-client.js + server)
- Phase 3 → after 2 (so multiplayer extract knows the final API)
- Phase 4 → after 1,2,3 (docs reflect final state)

## Success Criteria

- GIF replay shows progressive moves (not static)
- Online mode connects cleanly when `CARO_SERVER_URL` is set; clear UX when not configured
- Reconnect within session keeps player on same color
- `main.js` < 200 lines; all other JS files unchanged or < 200
- `node js/test-daily.mjs` still passes 16/16
- README structure section matches actual `js/` directory
- Phase-2 viral plan status reflects reality

## Risks

- Refactor of `main.js` may break event wiring → mitigate by writing module-by-module + manual smoke after each extract
- Token persistence may collide with existing localStorage keys → namespace under `caro-mp-*`
- Server identity restore must not let strangers steal a seat → bind token to room+color server-side

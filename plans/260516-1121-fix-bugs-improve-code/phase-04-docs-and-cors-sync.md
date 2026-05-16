---
phase: 4
title: Sync README + plan status + tighten Worker CORS
priority: P2
effort: 30m
status: completed
depends_on: [1, 2, 3]
---

# Phase 4 — Docs & CORS Sync

## Context

Review found:
- README "Project Structure" lists only 11 js files; actual = 25+ (plus 5 from Phase 3 refactor).
- README claims `test-daily.mjs` at top-level; actual = `caro-game/js/test-daily.mjs`.
- `plans/260515-2326-viral-features-tiers/plan.md` line 38: Phase-2 status = `in-progress` while dependent phases marked `completed` and tests pass.
- `caro-server/src/index.js` ships CORS `'*'`; README notes prod should restrict — easy env-var fix.

## Files

- Modify: `caro-game/README.md` — refresh "Project Structure" + "Run Locally" test path
- Modify: `plans/260515-2326-viral-features-tiers/plan.md` — Phase 2 `in-progress` → `completed`
- Modify: `caro-server/src/index.js` — CORS origin from `env.ALLOWED_ORIGIN` with `'*'` fallback
- Modify: `caro-server/wrangler.toml` — example `[vars] ALLOWED_ORIGIN = "*"` (with prod comment)

## Design

### README Project Structure (target)

```
caro-game/
├── index.html
├── styles.css
├── manifest.json
├── og-image.png
├── sw.js
├── icons/
├── vendor/                      # gif.js + worker (Phase 6 fallback)
└── js/
    ├── game.js                  # rules, win detection
    ├── ui.js                    # DOM render + events
    ├── main.js                  # bootstrap + event router (<200 LOC)
    ├── score-store.js           # scores persistence + display
    ├── gameover-modal.js
    ├── ai.js                    # pattern scoring
    ├── ai-easy.js / ai-medium.js / ai-hard.js
    ├── ai-strategy.js           # difficulty dispatcher
    ├── ai-turn-controller.js
    ├── puzzle-bank.js
    ├── puzzle-engine.js
    ├── puzzle-ui.js
    ├── daily-controller.js
    ├── streak.js
    ├── stats.js
    ├── stats-ui.js
    ├── achievements.js
    ├── share.js
    ├── share-formatter.js
    ├── board-snapshot.js
    ├── replay-renderer.js
    ├── replay-encoder.js
    ├── replay-ui.js
    ├── multiplayer-client.js
    ├── multiplayer-controller.js
    ├── room-ui.js
    ├── sw-register.js
    └── test-daily.mjs           # node test runner
```

### CORS

```js
// caro-server/src/index.js
const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || '*';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

In `wrangler.toml`:
```toml
[vars]
ALLOWED_ORIGIN = "*"   # set to "https://<user>.github.io" for production
```

Note: env in DO fetch is accessed via the worker entry; pass it through as a constructor binding if needed. Most cases CORS only matters on the `/create` HTTP route, which is in `index.js` already.

## Steps

1. Update `caro-game/README.md`:
   - Replace Project Structure block with current tree
   - Fix `test-daily.mjs` path under `Run Locally` (`node js/test-daily.mjs`)
   - Add 1-line note: `window.CARO_SERVER_URL` required for online mode
2. Edit `plans/260515-2326-viral-features-tiers/plan.md` line 38: `in-progress` → `completed`
3. Edit `caro-server/src/index.js`: read `env.ALLOWED_ORIGIN`, fallback `'*'`. Build CORS headers inside `fetch` (since `env` only available there).
4. Edit `caro-server/wrangler.toml`: add `[vars] ALLOWED_ORIGIN = "*"` with prod-restrict comment.
5. Verify by re-reading README diff matches actual `ls caro-game/js/`.

## Todo

- [x] Rewrite README "Project Structure" section
- [x] Fix README "Run Locally" test path
- [x] Flip phase-2 status in viral-features plan
- [x] Move CORS_HEADERS into `fetch` reading `env.ALLOWED_ORIGIN`
- [x] Add `[vars] ALLOWED_ORIGIN` to wrangler.toml with comment
- [x] Diff-verify README matches reality after Phase 3 refactor

## Success Criteria

- `caro-game/README.md` "Project Structure" matches `ls caro-game/js/` 1:1
- viral plan Phase-2 status = `completed`
- `npx wrangler dev` reads ALLOWED_ORIGIN var and respects it (default `*` keeps dev working)
- Production deploy with `ALLOWED_ORIGIN="https://<user>.github.io"` rejects other origins via preflight

## Risks

- Forgetting to update README after Phase 3 module names — mitigated by running this phase LAST.
- Setting `ALLOWED_ORIGIN` strict in dev breaks local `wrangler dev` → default stays `'*'`.

## Out of Scope

- Don't refactor any code logic
- Don't add deployment automation / GitHub Pages CI
- Don't write tests for CORS

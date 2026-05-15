# Code Review — Phase 01 PWA Foundation

**Date:** 2026-05-15
**Reviewer:** code-reviewer
**Scope:** caro-game/manifest.json, sw.js, js/sw-register.js, icons/*, index.html

## Score: 9/10

Implementation is clean, complete, and pragmatic. Exceeds the plan in a few places (scope, mode=navigate guard, opaque-response handling, app shell now includes icons).

## Critical Issues
None blocking merge. All acceptance criteria met:
- Manifest has name, short_name, icons 192+512, start_url, display=standalone, scope, theme/background colors → installability satisfied.
- SW: GET-only check (line 37), same-origin guard (line 40), HTML detection via `mode === 'navigate'` + path heuristic (lines 42–44), `cache.put` wrapped in `.catch(() => {})` (lines 51, 63), opaque/cross-origin responses filtered by `res.type === 'basic'` (line 61).
- iOS Safari path complete: apple-touch-icon 180x180 PNG present, apple-mobile-web-app-capable + status-bar-style + title meta present.
- sw-register.js feature-detects `serviceWorker`, registers on `load`, wires updatefound→statechange, catches register errors.
- App shell list in sw.js matches actual files (main.js, game.js, ai.js, ui.js, styles.css, icons). Verified via ls.
- All files well under 200 lines (sw.js=68, sw-register.js=17, manifest.json=19, index.html=44).

## Suggestions (nice-to-have, non-blocking)

1. **Network-first revalidation has no `no-store`/cache-bust** — Browser HTTP cache could still serve stale index.html before SW sees it. Consider `fetch(req, { cache: 'no-store' })` for the HTML branch. Low impact on GH Pages but defensive.
2. **`status === 200` excludes 206 partial responses** — Fine for this app (no range requests) but worth a comment.
3. **Update toast is a TODO comment only** — Plan marks it "Optional"; acceptable. Consider Phase 4 enhancement to surface "Reload for new version".
4. **`apple-touch-icon` size** — Currently 180x180 (correct iOS modern default). Consider adding 152/167 variants only if iPad install UX matters.
5. **Manifest missing `id` field** — Recommended by Chrome to stabilize install identity across start_url changes. Add `"id": "/"` (relative to scope) for forward-compat.
6. **No `screenshots` array** — Optional but improves Android install UI richness. Skip for now (YAGNI).
7. **sw-register `register('./sw.js')` scope** — Defaults to `./` which is correct here. Explicit `{ scope: './' }` would be self-documenting.

## Plan Todo List — Missing/Deferred Items

Code-side todos all done. Verification-side todos require human/runtime action and are NOT covered by this static review:
- [ ] Lighthouse audit ≥ 90 (runtime)
- [ ] Test offline play in DevTools (runtime)
- [ ] Test install Chrome desktop (manual)
- [ ] Test install Android Chrome (manual device)
- [ ] Test iOS Safari Add to Home Screen (manual device)
- [ ] Verify maskable icon on maskable.app (manual upload)

Recommend tester/manual QA pass before marking phase complete.

## Positive Observations
- Defensive `cache.put().catch()` prevents quota-exceeded crashes.
- Same-origin guard before any cache work — security best practice respected.
- Navigation fallback to `./index.html` on offline (line 54) is SPA-friendly.
- `lang: "vi"`, `dir: "ltr"`, `categories` in manifest exceed plan minimum — good for store listings.
- `defer` on sw-register script prevents render-blocking.
- Module script for main.js untouched — no conflict.

## Metrics
- File sizes: all <200 lines ✓
- Linting: no syntax issues (manual scan; no linter configured for vanilla JS)
- Type coverage: N/A (vanilla JS)
- Security: same-origin enforced, HTTPS-only context, no Authorization header caching risk

## Unresolved Questions
- Will GitHub Pages serve `manifest.json` with `application/manifest+json` MIME? If not, `Content-Type: application/json` is accepted by Chrome but may warn in Lighthouse — verify during audit.
- Should `VERSION` constant be auto-bumped via deploy script, or remain manual `caro-v1`→`caro-v2`? Plan says manual; document in commit conventions.

## Recommended Actions
1. (Optional, 1 line) Add `"id": "/"` to manifest.json for install identity stability.
2. (Optional) Add `{ cache: 'no-store' }` to HTML fetch in sw.js for stricter freshness.
3. Run Lighthouse PWA audit before merge; capture score in commit/PR description.
4. Manual smoke test: load → DevTools Application tab → confirm manifest + SW activated → offline reload → game still works.

**Verdict:** Ready to merge after runtime verification. Code is production-quality.

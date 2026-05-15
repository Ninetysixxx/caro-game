# Code Review — Phase 6 Polish & Accessibility

**Date:** 2026-05-15 23:07
**Scope:** Phase 6 polish-only diff (index.html, styles.css, js/ui.js:127–129, js/main.js)
**Reviewer:** code-reviewer

## Score: 8.5 / 10

Solid polish pass. All a11y attributes are correctly applied, animations are CSS-only and reduced-motion-aware, undo-after-game-end is enforced. One small ordering bug in `triggerAiTurn`, otherwise clean.

## File-size rule
All files <200 lines: main.js=190, ui.js=178, styles.css=177, game.js=168, ai.js=155, index.html=38. PASS.

---

## Critical Issues (block merge)
None.

---

## Suggestions (non-blocking)

### S1. `syncUndoBtn()` ordering in `triggerAiTurn` (main.js:120–121)
```
if (state.status === 'playing') enableBoard();
syncUndoBtn();        // reads aiThinking==true here
aiThinking = false;   // flipped AFTER the read
```
`syncUndoBtn` reads `aiThinking` while it is still `true`, so right after AI plays its move the undo button stays disabled even though the game is back in the user's hands. The button only refreshes on the next user interaction. Fix: flip `aiThinking = false` BEFORE `syncUndoBtn()`. One-line reorder.

Impact: minor UX (undo briefly unavailable). Does NOT violate the "no undo after game end" rule.

### S2. Stale `last-move` highlight after undo (main.js:onUndoClick)
`undoMove` empties the cell but ui.js's `_lastMoveEl` reference still has `.last-move` applied. Visually you see a yellow ring on an empty cell until the next move. Either expose `clearLastMove()` from ui.js or call `highlightLastMove` with the new tail of `state.history` (or a sentinel). Pre-existing-ish but the undo-flow polish push made it more visible.

### S3. `aria-live` duplication (index.html:17 + 25)
Both `.score-panel` and `.status-bar` have `aria-live="polite"`. With `role="status"` on the status bar (already implies polite live region), and a live score panel, a screen reader will announce score updates AND status changes on every move. Acceptable but slightly chatty. Consider dropping `aria-live` on `.score-panel` (let users read it on demand) OR keep as-is if intentional.

### S4. `role="status"` + `aria-live="polite"` redundancy (index.html:25)
`role="status"` already implies `aria-live="polite"`. Harmless, but explicit duplication. Drop one if you want it tight.

### S5. `prefers-reduced-motion` covers piece-pop + win-line but not `.cell { transition: background 0.08s }` or `.ctrl-btn:active { transform: translateY(1px) }`
The media query disables `animation`/`transition` on `.mode-btn` and `.ctrl-btn` but leaves the cell hover transition and ctrl-btn active transform alive. Cell hover transition is 80ms (imperceptible — fine), the active translate is instant on press (fine). Not worth fixing, just noting completeness.

### S6. Focus ring contrast on `.cell:focus-visible` (styles.css:108)
Outline is `var(--highlight)` (#fdcb6e) with `outline-offset: -2px` against `var(--board)` (#f9efd8). Contrast is OK but not great (both warm tones). Tab navigation isn't a documented requirement, but if a keyboard user lands on a cell it may be hard to see. Consider `outline: 2px solid var(--line)` (#8b6f47) for cells — they're already inside the board palette and have better contrast.

### S7. `aria-label="Điểm số"` on `.score-panel` (index.html:17)
Good. But the inner `<span>` labels ("X", "O", "Hòa") get dynamically swapped to "Bạn"/"AI" in AI mode (main.js:50–51). The aria-label of the panel itself is fixed Vietnamese ("Điểm số" = "Score") — correct, no issue. Confirming this is intentional.

---

## Phase-6 acceptance checklist

| Item | Status |
|------|--------|
| `aria-pressed` on mode buttons toggled on change | PASS (main.js:163) |
| `aria-label` on Undo/Restart | PASS |
| `role="status"` on status bar | PASS |
| `aria-label` on score-panel | PASS |
| `@keyframes piece-pop` applied to .cell.x::after/.cell.o::after | PASS |
| `@keyframes win-draw` driven by `--win-len` | PASS — ui.js:129 sets it from `Math.hypot` |
| `:focus-visible` outlines on cells + buttons | PASS |
| `prefers-reduced-motion` disables piece-pop + win-line | PASS |
| 360px small-screen breakpoint | PASS (styles.css:22–24) |
| Undo disabled when status≠playing OR aiThinking | PASS in `syncUndoBtn` |
| Undo handler early-returns on status≠playing | PASS (main.js:138) |
| No undo after game-end (plan decision) | ENFORCED in both syncUndoBtn (UI) and onUndoClick (logic) — defense in depth |
| Mode-change resets game cleanly | PASS (`cancelAiTurn` → `resetBoard`) |
| All files <200 lines | PASS |

## Undo-guard path trace
1. Post-human-move (game continues) → status='playing', history>0 → btn ENABLED. ✓
2. Post-human-move (win/draw) → status≠'playing' → btn DISABLED, onUndoClick rejects. ✓
3. Post-AI-move (game continues) → status='playing', history>0 → SHOULD enable but S1 leaves it briefly disabled. ✓ (rule preserved, UX nit)
4. Post-AI-move (AI wins/draw) → status≠'playing' → btn DISABLED. ✓
5. Post-restart → history.length=0 → btn DISABLED. ✓
6. Post-undo → state replayed; syncUndoBtn re-evaluates correctly. ✓
7. Mode-change mid-game → confirm dialog → cancelAiTurn → resetBoard → btn DISABLED. ✓

## YAGNI / KISS / DRY
- No premature abstraction observed.
- `mode === 'hotseat' ? 'hotseat' : 'ai'` in `bumpScore` (main.js:59) is a no-op ternary — `mode` is already one of those. Could be `scores[mode].draws += 1`. Trivial.
- Mode-button update in `onModeChange` is a clean single loop. Good.

## Positive observations
- Defense-in-depth: undo blocked at both the button (disabled) and handler (early return) layers — robust.
- `--win-len` plumbed correctly from JS into CSS animation. Clean separation.
- Reduced-motion query is tight and inline with the keyframes definitions — easy to maintain.
- ARIA group + pressed semantics for the mode toggle are correct.
- Score panel kept its label structure; localization swap (X/O ↔ Bạn/AI) still works.

---

## Verdict: **ACCEPT**

Phase 6 meets the polish + a11y + animation bar. The ordering nit in `triggerAiTurn` (S1) is worth a one-line fix before final deploy but does not block — the "no undo after game end" rule itself is correctly enforced. S2 (stale highlight after undo) is the next-most-visible UX issue and worth a 2-line fix if time permits.

## Unresolved questions
1. Is the dual `aria-live` on score-panel + status-bar intentional, or should score be silent (S3)?
2. Should keyboard navigation (Tab into board, arrow keys, Enter) be added before deploy? Plan flagged it as NICE-TO-HAVE; currently cells are not in the tab order (no `tabindex`), so the `:focus-visible` outline on `.cell` is unreachable via keyboard. Either remove the unreachable rule or add `tabindex="0"` to cells.

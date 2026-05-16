# Project Changelog

All notable changes to this project are documented here, organized by date and version.

---

## 2026-05-16

### Bugfix: Restore Daily Quest Mode After Refactor Regression

**Severity**: High | **Affected Version**: post-a64a4d2

#### Problem
Commit `a64a4d2` (refactor: split main.js into focused controllers) introduced `ReferenceError: checkDailyResult is not defined` in `daily-controller.js` on AI move completion. Modal never displayed, board remained frozen.

#### Solution
Replaced undefined symbol with correct `checkGoal(state, puzzle, userMoveCount, true)` call (already imported).

#### Hardening
- Daily mode disables Undo button (preset stones must not be popped)
- Multiplayer UI cue updated for consistency
- `onUndoClick()` early-returns in daily mode (defense-in-depth)

#### Testing
- New `test-daily-controller.mjs` (3 cases incl. setTimeout-deferred error capture)
- Existing `test-daily.mjs`: 16/16 passing

**Files**: `caro-game/js/daily-controller.js`, `caro-game/js/main.js`, `caro-game/js/test-daily-controller.mjs` (new)

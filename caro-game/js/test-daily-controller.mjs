// test-daily-controller.mjs — regression test for daily-controller flow (Node.js)
// Run: node caro-game/js/test-daily-controller.mjs
//
// Guards the bug fixed by phase-01-fix-checkdailyresult-reference: if the AI
// onMove callback references an undefined symbol, the setTimeout-deferred
// callback throws and `uncaughtException` fires. We force that codepath here.

// ── Minimal DOM / browser stubs ────────────────────────────────────────────

const noop = () => {};

function makeStub() {
  const target = function () { return makeStub(); };
  return new Proxy(target, {
    get(_, prop) {
      if (prop === 'classList') return { add: noop, remove: noop, toggle: noop, contains: () => false };
      if (prop === 'dataset') return new Proxy({}, { get: () => '', set: () => true });
      if (prop === 'style') return new Proxy({}, { get: () => '', set: () => true });
      if (prop === 'firstChild' || prop === 'nextSibling' || prop === 'parentNode') return null;
      if (prop === 'children' || prop === 'childNodes') return [];
      if (prop === 'querySelectorAll') return () => [];
      if (prop === 'innerHTML' || prop === 'textContent' || prop === 'tagName' || prop === 'nodeName') return '';
      if (prop === 'length') return 0;
      if (prop === 'then') return undefined; // not a thenable
      return makeStub();
    },
    apply() { return makeStub(); },
    set() { return true; },
  });
}

const doc = {
  getElementById: () => makeStub(),
  querySelector: () => makeStub(),
  querySelectorAll: () => [],
  createElement: () => makeStub(),
  createElementNS: () => makeStub(),
  createDocumentFragment: () => makeStub(),
  addEventListener: noop,
  removeEventListener: noop,
  body: makeStub(),
  readyState: 'complete',
};

globalThis.document = doc;
globalThis.window = { addEventListener: noop, removeEventListener: noop };
globalThis.location = { origin: '', pathname: '' };

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};

// ── Force a deterministic puzzle by overriding Date ─────────────────────────
// PUZZLES[seed % len]. seed = floor(UTC_ms / 86400000). Pick day index → puzzle.

const RealDate = Date;
function fixToDayIndex(idx) {
  const ms = idx * 86400000;
  const iso = new RealDate(ms).toISOString();
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(iso);
      else super(...args);
    }
    static now() { return new RealDate(iso).getTime(); }
  };
}
function restoreDate() { globalThis.Date = RealDate; }

// ── Dynamic imports (after stubs) ──────────────────────────────────────────

const { startDailyPuzzle, handleDailyCellClick } = await import('./daily-controller.js');
const { createState, makeMove } = await import('./game.js');
const { PUZZLES } = await import('./puzzle-bank.js');

// ── Test harness ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

function makeCtx() {
  const ctx = {
    state: createState(),
    resetState(s) { ctx.state = s; },
    syncUndoBtn: noop,
    bumpScore: noop,
    serverUrl: null,
  };
  return ctx;
}

function findPuzzleIndex(predicate) {
  for (let i = 0; i < PUZZLES.length; i++) if (predicate(PUZZLES[i])) return i;
  throw new Error('No matching puzzle found in bank');
}

async function withUncaughtCapture(fn) {
  let captured = null;
  const handler = (e) => { captured = e; };
  process.on('uncaughtException', handler);
  try {
    return await fn();
  } finally {
    process.removeListener('uncaughtException', handler);
    if (captured) throw captured;
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

console.log('\n--- Daily controller regression ---');

await test('startDailyPuzzle seeds state with initial stones', async () => {
  const winIdx = findPuzzleIndex((p) => p.goal === 'win-in-1');
  fixToDayIndex(winIdx);
  try {
    const ctx = makeCtx();
    startDailyPuzzle(ctx);
    assert(ctx.state.history.length === PUZZLES[winIdx].initial.length,
      `Expected ${PUZZLES[winIdx].initial.length} preset stones, got ${ctx.state.history.length}`);
  } finally { restoreDate(); }
});

await test('win-in-1 solution click → endDailyPuzzle path, no throw', async () => {
  const winIdx = findPuzzleIndex((p) => p.goal === 'win-in-1');
  fixToDayIndex(winIdx);
  try {
    const ctx = makeCtx();
    startDailyPuzzle(ctx);
    const sol = PUZZLES[winIdx].solution[0];
    const ok = makeMove(ctx.state, sol.row, sol.col);
    assert(ok, 'makeMove should succeed on solution cell');
    handleDailyCellClick(ctx, sol.row, sol.col);
    assert(ctx.state.status === 'won', `Expected won, got ${ctx.state.status}`);
  } finally { restoreDate(); }
});

await test('AI response path runs checkGoal — guards against ReferenceError regression', async () => {
  const winInTwoIdx = findPuzzleIndex((p) => p.goal === 'win-in-2');
  fixToDayIndex(winInTwoIdx);
  try {
    await withUncaughtCapture(async () => {
      const ctx = makeCtx();
      startDailyPuzzle(ctx);
      // Pick a non-solution empty cell to keep puzzle in-progress and force AI reply.
      let move = null;
      for (let r = 0; r < ctx.state.size && !move; r++) {
        for (let c = 0; c < ctx.state.size && !move; c++) {
          if (ctx.state.board[r][c] == null) {
            const inSol = (PUZZLES[winInTwoIdx].solution || []).some((s) => s.row === r && s.col === c);
            if (!inSol) move = { row: r, col: c };
          }
        }
      }
      assert(move, 'Expected to find an empty non-solution cell');
      const ok = makeMove(ctx.state, move.row, move.col);
      assert(ok, 'makeMove should succeed');
      handleDailyCellClick(ctx, move.row, move.col);
      // Wait for scheduleAiMove (200ms) to fire its onMove callback.
      await new Promise((r) => setTimeout(r, 350));
      // If the onMove callback referenced an undefined symbol, the
      // setTimeout would have thrown into uncaughtException by now.
      assert(['playing', 'won', 'draw'].includes(ctx.state.status),
        `Unexpected status: ${ctx.state.status}`);
    });
  } finally { restoreDate(); }
});

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\n--- Summary ---`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);

// test-daily.mjs — smoke tests for daily puzzle logic (Node.js)
// Run: node caro-game/js/test-daily.mjs

import { getTodayPuzzle, applyInitial, checkGoal, gradeMove, formatGoal } from './puzzle-engine.js';
import { createState, makeMove, PLAYER_X, PLAYER_O } from './game.js';

// ── Mock localStorage for streak tests ─────────────────────────────────────────

const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};

const { loadStreak, recordResult, hasCompletedToday } = await import('./streak.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

// ── Deterministic selection ───────────────────────────────────────────────────

console.log('\n--- Puzzle Selection ---');

test('Same UTC date → same puzzle', () => {
  const originalDate = Date;
  global.Date = class extends Date {
    constructor(...args) {
      if (args.length === 0) super('2026-05-16T00:00:00Z');
      else super(...args);
    }
  };
  const p1 = getTodayPuzzle();
  const p2 = getTodayPuzzle();
  assert(p1.id === p2.id, `Expected same id, got ${p1.id} vs ${p2.id}`);
  global.Date = originalDate;
});

test('Different UTC date → possibly different puzzle', () => {
  const originalDate = Date;
  global.Date = class extends Date {
    constructor(...args) {
      if (args.length === 0) super('2026-05-16T00:00:00Z');
      else super(...args);
    }
  };
  const p1 = getTodayPuzzle();
  global.Date = class extends Date {
    constructor(...args) {
      if (args.length === 0) super('2026-05-17T00:00:00Z');
      else super(...args);
    }
  };
  const p2 = getTodayPuzzle();
  // 5 puzzles, seed changes by 1 → next puzzle
  assert(p1.id !== p2.id, `Expected different id, got ${p1.id} vs ${p2.id}`);
  global.Date = originalDate;
});

// ── Goal checking ───────────────────────────────────────────────────────────────

console.log('\n--- Goal Checking ---');

test('win-in-1: user wins immediately → success', () => {
  const puzzle = getTodayPuzzle();
  if (puzzle.goal !== 'win-in-1') {
    console.log('  (skip: today puzzle is not win-in-1)');
    return;
  }
  const state = createState();
  applyInitial(state, puzzle);
  // Simulate winning move
  makeMove(state, puzzle.solution[0].row, puzzle.solution[0].col);
  const result = checkGoal(state, puzzle, 1, false);
  assert(result.status === 'success', `Expected success, got ${result.status}`);
});

test('win-in-1: wrong move → in-progress then fail after maxMoves', () => {
  const puzzle = { goal: 'win-in-1', player: 'X', maxMoves: 1, solution: [{ row: 0, col: 0 }] };
  const state = createState();
  // User makes a non-winning move
  makeMove(state, 5, 5);
  const r1 = checkGoal(state, puzzle, 1, false);
  assert(r1.status === 'fail', `Expected fail, got ${r1.status}`);
});

test('block-in-2: survive → success', () => {
  const puzzle = { goal: 'block-in-2', player: 'X', maxMoves: 2 };
  const state = createState();
  makeMove(state, 5, 5);
  // After user move 1, AI hasn't moved yet → in-progress
  const r1 = checkGoal(state, puzzle, 1, false);
  assert(r1.status === 'in-progress', `Expected in-progress, got ${r1.status}`);
  // After AI move 1, still playing
  makeMove(state, 6, 6);
  const r2 = checkGoal(state, puzzle, 1, true);
  assert(r2.status === 'in-progress', `Expected in-progress, got ${r2.status}`);
  // User move 2
  makeMove(state, 7, 7);
  const r3 = checkGoal(state, puzzle, 2, false);
  assert(r3.status === 'in-progress', `Expected in-progress (need AI), got ${r3.status}`);
  // AI move 2, still playing → success for block
  makeMove(state, 8, 8);
  const r4 = checkGoal(state, puzzle, 2, true);
  assert(r4.status === 'success', `Expected success, got ${r4.status}`);
});

test('opponent win → fail', () => {
  const puzzle = { goal: 'win-in-2', player: 'X', maxMoves: 3 };
  const state = createState();
  makeMove(state, 10, 10); // X
  makeMove(state, 10, 11); // O
  makeMove(state, 10, 12); // X
  makeMove(state, 10, 13); // O
  makeMove(state, 10, 14); // X — 5 in a row for X, not O
  // Let's simulate O winning instead by crafting a different state
  state.board[5][5] = 'O';
  state.board[5][6] = 'O';
  state.board[5][7] = 'O';
  state.board[5][8] = 'O';
  state.board[5][9] = 'O';
  state.status = 'won';
  state.winner = 'O';
  const result = checkGoal(state, puzzle, 1, true);
  assert(result.status === 'fail', `Expected fail, got ${result.status}`);
});

// ── Move grading ──────────────────────────────────────────────────────────────

console.log('\n--- Move Grading ---');

test('Exact solution move → 🟩', () => {
  const puzzle = { solution: [{ row: 10, col: 10 }] };
  const g = gradeMove({ row: 10, col: 10 }, puzzle, 0);
  assert(g === '🟩', `Expected 🟩, got ${g}`);
});

test('Wrong order solution move → 🟨', () => {
  const puzzle = { solution: [{ row: 10, col: 10 }, { row: 11, col: 11 }] };
  const g = gradeMove({ row: 11, col: 11 }, puzzle, 0);
  assert(g === '🟨', `Expected 🟨, got ${g}`);
});

test('Adjacent move → 🟨', () => {
  const puzzle = { solution: [{ row: 10, col: 10 }] };
  const g = gradeMove({ row: 11, col: 11 }, puzzle, 0);
  assert(g === '🟨', `Expected 🟨, got ${g}`);
});

test('Far away move → 🟥', () => {
  const puzzle = { solution: [{ row: 10, col: 10 }] };
  const g = gradeMove({ row: 15, col: 15 }, puzzle, 0);
  assert(g === '🟥', `Expected 🟥, got ${g}`);
});

// ── Streak logic ──────────────────────────────────────────────────────────────

console.log('\n--- Streak Logic ---');

test('First win → streak = 1', () => {
  store.clear();
  const s1 = recordResult(1, true, 1);
  assert(s1.current === 1, `Expected current=1, got ${s1.current}`);
  assert(s1.max === 1, `Expected max=1, got ${s1.max}`);
});

test('Duplicate record same day → no change', () => {
  const s2 = recordResult(1, true, 1);
  assert(s2.current === 1, `Expected current=1, got ${s2.current}`);
});

test('Loss resets streak', () => {
  store.clear();
  // Mock Date so today is fixed
  const realDate = Date;
  const mockNow = new realDate('2026-05-16T00:00:00Z');
  global.Date = class extends Date {
    constructor(...args) {
      if (args.length === 0) super(mockNow);
      else super(...args);
    }
    static now() { return mockNow.getTime(); }
  };
  // Pre-populate a win from "yesterday"
  const preData = { current: 1, max: 1, lastWinUTC: '2026-05-15', history: [{ date: '2026-05-15', puzzleId: 1, won: true, attempts: 1 }] };
  store.set('caro-streak-v1', JSON.stringify(preData));

  const s = recordResult(2, false, 3); // today, lose
  assert(s.current === 0, `Expected current=0 after loss, got ${s.current}`);
  assert(hasCompletedToday() === true, 'Expected completed today');
  global.Date = realDate;
});

test('Back-to-back wins increase streak', () => {
  store.clear();
  const realDate = Date;
  const mockNow = new realDate('2026-05-16T00:00:00Z');
  global.Date = class extends Date {
    constructor(...args) {
      if (args.length === 0) super(mockNow);
      else super(...args);
    }
    static now() { return mockNow.getTime(); }
  };
  const preData = { current: 3, max: 3, lastWinUTC: '2026-05-15', history: [{ date: '2026-05-15', puzzleId: 1, won: true, attempts: 2 }] };
  store.set('caro-streak-v1', JSON.stringify(preData));

  const s = recordResult(2, true, 2); // today, win
  assert(s.current === 4, `Expected current=4, got ${s.current}`);
  assert(s.max === 4, `Expected max=4, got ${s.max}`);
  global.Date = realDate;
});

// ── Format goal ───────────────────────────────────────────────────────────────

console.log('\n--- Format Goal ---');

test('win-in-3 formatted correctly', () => {
  const text = formatGoal({ goal: 'win-in-3', player: 'X' });
  assert(text === 'Thắng trong 3 nước', `Got: ${text}`);
});

test('block-in-2 formatted correctly', () => {
  const text = formatGoal({ goal: 'block-in-2', player: 'X' });
  assert(text === 'Chặn O thắng', `Got: ${text}`);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n--- Summary ---`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);

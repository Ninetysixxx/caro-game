// streak.js — localStorage streak tracking + daily history

const STREAK_KEY = 'caro-streak-v1';

export function defaultStreak() {
  return { current: 0, max: 0, lastWinUTC: null, history: [] };
}

/** Load streak object from localStorage. */
export function loadStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return defaultStreak();
    const parsed = JSON.parse(raw);
    if (typeof parsed.current !== 'number' || typeof parsed.max !== 'number') {
      return defaultStreak();
    }
    if (!Array.isArray(parsed.history)) parsed.history = [];
    return parsed;
  } catch {
    return defaultStreak();
  }
}

function saveStreak(data) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(data)); } catch { /* quota / private mode */ }
}

/** Get today's UTC date string YYYY-MM-DD. */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Get yesterday's UTC date string YYYY-MM-DD. */
function yesterdayStr() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Record a puzzle result. Safe to call multiple times; only the first call per day is persisted.
 * @param {number} puzzleId
 * @param {boolean} won
 * @param {number} attempts
 * @returns {{current:number, max:number}} updated streak counters
 */
export function recordResult(puzzleId, won, attempts) {
  const streak = loadStreak();
  const today = todayStr();

  // Already recorded today?
  if (streak.history.some((h) => h.date === today)) {
    return { current: streak.current, max: streak.max };
  }

  streak.history.push({ date: today, puzzleId, won, attempts });
  // Keep history bounded to last 90 entries (~3 months)
  if (streak.history.length > 90) streak.history = streak.history.slice(-90);

  if (won) {
    const yest = yesterdayStr();
    if (streak.lastWinUTC === yest) {
      streak.current += 1;
    } else {
      streak.current = 1;
    }
    streak.lastWinUTC = today;
    if (streak.current > streak.max) streak.max = streak.current;
  } else {
    streak.current = 0;
  }

  saveStreak(streak);
  return { current: streak.current, max: streak.max };
}

/** Whether the user has already completed today's puzzle (win or lose). */
export function hasCompletedToday() {
  const streak = loadStreak();
  const today = todayStr();
  return streak.history.some((h) => h.date === today);
}

/** Get the result entry for today, or null. */
export function getTodayResult() {
  const streak = loadStreak();
  const today = todayStr();
  return streak.history.find((h) => h.date === today) || null;
}

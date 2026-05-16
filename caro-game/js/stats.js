// stats.js — aggregate stats storage with migration from old scores

const KEY = 'caro-stats-v1';
const OLD_KEY = 'caro-scores-v1';

import { checkUnlocks } from './achievements.js';

export function defaultStats() {
  return {
    version: 1,
    daily: {
      distribution: [0, 0, 0, 0, 0],
      totalPlayed: 0,
      totalWon: 0,
      blockWins: 0,
    },
    ai: { wins: 0, losses: 0, draws: 0, winStreak: { current: 0, max: 0 } },
    hotseat: { x: 0, o: 0, draws: 0 },
    achievements: [],
    totalGamesAllTime: 0,
  };
}

function saveStats(stats) {
  try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch { /* quota / private mode */ }
}

/** Load stats from localStorage, migrating from old `caro-scores-v1` if present. */
export function loadStats() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) return parsed;
    }
  } catch { /* ignore */ }

  // Migration from old scores key
  try {
    const oldRaw = localStorage.getItem(OLD_KEY);
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      const stats = defaultStats();
      if (old.hotseat) {
        stats.hotseat.x = old.hotseat.x || 0;
        stats.hotseat.o = old.hotseat.o || 0;
        stats.hotseat.draws = old.hotseat.draws || 0;
      }
      if (old.ai) {
        stats.ai.wins = old.ai.player || 0;
        stats.ai.losses = old.ai.ai || 0;
        stats.ai.draws = old.ai.draws || 0;
      }
      if (old.daily) {
        stats.daily.totalWon = old.daily.wins || 0;
        stats.daily.totalPlayed = (old.daily.wins || 0) + (old.daily.losses || 0);
      }
      stats.totalGamesAllTime =
        stats.hotseat.x + stats.hotseat.o + stats.hotseat.draws +
        stats.ai.wins + stats.ai.losses + stats.ai.draws + stats.daily.totalPlayed;
      saveStats(stats);
      localStorage.removeItem(OLD_KEY);
      return stats;
    }
  } catch { /* ignore */ }

  return defaultStats();
}

/**
 * Record a finished game and persist stats.
 * @param {Object} opts
 * @param {'daily'|'ai'|'hotseat'} opts.mode
 * @param {'win'|'loss'|'draw'|'x'|'o'} opts.result
 * @param {number} [opts.attempts] — user move count (daily only)
 * @param {string} [opts.goal] — daily puzzle goal type (e.g. 'win-in-3')
 * @returns {{stats:Object, newUnlocks:Array}} updated stats + newly unlocked achievements
 */
export function recordGame({ mode, result, attempts, goal } = {}) {
  const stats = loadStats();
  const prevAchievements = [...stats.achievements];

  stats.totalGamesAllTime += 1;

  if (mode === 'daily') {
    stats.daily.totalPlayed += 1;
    if (result === 'win') {
      stats.daily.totalWon += 1;
      const distIndex = Math.min(Math.max((attempts || 1) - 1, 0), 4);
      stats.daily.distribution[distIndex] += 1;
      if (goal && goal.startsWith('block-in-')) {
        stats.daily.blockWins = (stats.daily.blockWins || 0) + 1;
      }
    }
  } else if (mode === 'ai') {
    if (result === 'win') {
      stats.ai.wins += 1;
      stats.ai.winStreak.current += 1;
      if (stats.ai.winStreak.current > stats.ai.winStreak.max) {
        stats.ai.winStreak.max = stats.ai.winStreak.current;
      }
    } else if (result === 'loss') {
      stats.ai.losses += 1;
      stats.ai.winStreak.current = 0;
    } else {
      stats.ai.draws += 1;
      stats.ai.winStreak.current = 0;
    }
  } else if (mode === 'hotseat') {
    if (result === 'x') stats.hotseat.x += 1;
    else if (result === 'o') stats.hotseat.o += 1;
    else if (result === 'draw') stats.hotseat.draws += 1;
  }

  const newUnlocks = checkUnlocks(stats, prevAchievements);
  if (newUnlocks.length > 0) {
    newUnlocks.forEach(a => {
      if (!stats.achievements.includes(a.id)) stats.achievements.push(a.id);
    });
  }

  saveStats(stats);
  return { stats, newUnlocks };
}

export function getWinRate(mode, statsArg) {
  const stats = statsArg || loadStats();
  if (mode === 'daily') {
    const { totalPlayed, totalWon } = stats.daily;
    return totalPlayed > 0 ? Math.round((totalWon / totalPlayed) * 100) : 0;
  }
  if (mode === 'ai') {
    const { wins, losses } = stats.ai;
    const total = wins + losses;
    return total > 0 ? Math.round((wins / total) * 100) : 0;
  }
  if (mode === 'hotseat') {
    const { x, o, draws } = stats.hotseat;
    const total = x + o + draws;
    return total > 0 ? Math.round(((x + o) / total) * 100) : 0;
  }
  return 0;
}

export function getDailyDistribution() {
  return loadStats().daily.distribution;
}

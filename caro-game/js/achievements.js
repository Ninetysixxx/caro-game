// achievements.js — achievement definitions and unlock checking

import { loadStreak } from './streak.js';

export const ACHIEVEMENTS = [
  {
    id: 'first-win',
    icon: '🎯',
    title: 'First Win',
    desc: 'Thắng ván đầu',
    check: (s) =>
      s.totalGamesAllTime >= 1 &&
      (s.ai.wins + s.hotseat.x + s.hotseat.o + s.daily.totalWon >= 1),
  },
  {
    id: 'ai-slayer',
    icon: '🤖',
    title: 'AI Slayer',
    desc: 'Thắng AI 5 lần',
    check: (s) => s.ai.wins >= 5,
  },
  {
    id: 'on-fire',
    icon: '🔥',
    title: 'On Fire',
    desc: 'Daily streak 3',
    check: (s, streak) => streak.current >= 3,
  },
  {
    id: 'week-warrior',
    icon: '🌟',
    title: 'Week Warrior',
    desc: 'Daily streak 7',
    check: (s, streak) => streak.current >= 7,
  },
  {
    id: 'centurion',
    icon: '💯',
    title: 'Centurion',
    desc: 'Chơi 100 ván',
    check: (s) => s.totalGamesAllTime >= 100,
  },
  {
    id: 'lucky-7',
    icon: '🎲',
    title: 'Lucky 7',
    desc: 'Solve daily trong 1 nước',
    check: (s, streak) => streak.history.some((h) => h.won && h.attempts === 1),
  },
  {
    id: 'defender',
    icon: '🛡️',
    title: 'Defender',
    desc: 'Phòng thủ thành công',
    check: (s) => (s.daily.blockWins || 0) >= 1,
  },
  {
    id: 'perfect-week',
    icon: '🏆',
    title: 'Perfect Week',
    desc: '7 ngày liên tiếp 1 nước',
    check: (s, streak) => _hasPerfectWeek(streak),
  },
];

/** Check if there are 7 consecutive won daily puzzles solved in 1 attempt each. */
function _hasPerfectWeek(streak) {
  const wonOne = streak.history
    .filter((h) => h.won && h.attempts === 1)
    .map((h) => h.date)
    .sort();
  if (wonOne.length < 7) return false;
  for (let i = 0; i <= wonOne.length - 7; i++) {
    let ok = true;
    for (let j = 0; j < 6; j++) {
      const d1 = new Date(wonOne[i + j] + 'T00:00:00Z');
      const d2 = new Date(wonOne[i + j + 1] + 'T00:00:00Z');
      if ((d2 - d1) !== 86400000) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/**
 * Return achievements newly unlocked since `prevUnlocked`.
 * @param {Object} stats
 * @param {string[]} prevUnlocked
 * @returns {Array<{id:string, icon:string, title:string, desc:string}>}
 */
export function checkUnlocks(stats, prevUnlocked) {
  const streak = loadStreak();
  return ACHIEVEMENTS.filter(
    (a) => a.check(stats, streak) && !prevUnlocked.includes(a.id)
  );
}

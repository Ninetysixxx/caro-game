// score-store.js — score persistence + display, plus stats/achievements bookkeeping
//
// Score data lives in localStorage under SCORES_KEY. The unified stats module
// (`stats.js`) records each game for achievements and detailed metrics — we
// surface achievement unlocks via the toast callback passed to bumpScore.

import { PLAYER_X } from './game.js';
import { recordGame } from './stats.js';

const SCORES_KEY = 'caro-scores-v1';

export function defaultScores() {
  return {
    hotseat: { x: 0, o: 0, draws: 0 },
    ai: { player: 0, ai: 0, draws: 0 },
    daily: { wins: 0, losses: 0 },
  };
}

export function loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.hotseat && parsed.ai && parsed.daily) return parsed;
    }
  } catch { /* ignore */ }

  // Migration path: derive from unified stats if scores key wasn't written yet.
  try {
    const statsRaw = localStorage.getItem('caro-stats-v1');
    if (statsRaw) {
      const s = JSON.parse(statsRaw);
      if (s && s.version === 1) {
        return {
          hotseat: { x: s.hotseat.x || 0, o: s.hotseat.o || 0, draws: s.hotseat.draws || 0 },
          ai: { player: s.ai.wins || 0, ai: s.ai.losses || 0, draws: s.ai.draws || 0 },
          daily: { wins: s.daily.totalWon || 0, losses: (s.daily.totalPlayed || 0) - (s.daily.totalWon || 0) },
        };
      }
    }
  } catch { /* ignore */ }

  return defaultScores();
}

export function saveScores(scores) {
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(scores)); } catch { /* quota/private */ }
}

export function updateScoreDisplay(scores, mode) {
  const isAi = mode === 'ai';
  const isDaily = mode === 'daily';
  const isMp = mode === 'multiplayer';
  document.querySelector('.score-x .score-label').textContent = isAi ? 'Bạn' : isDaily ? 'Thắng' : isMp ? 'Bạn' : 'X';
  document.querySelector('.score-o .score-label').textContent = isAi ? 'AI' : isDaily ? 'Thua' : isMp ? 'Đối thủ' : 'O';
  document.getElementById('score-x').textContent = isDaily ? scores.daily.wins : isAi ? scores.ai.player : isMp ? '-' : scores.hotseat.x;
  document.getElementById('score-o').textContent = isDaily ? scores.daily.losses : isAi ? scores.ai.ai : isMp ? '-' : scores.hotseat.o;
  document.getElementById('score-draws').textContent = isDaily ? '-' : isAi ? scores.ai.draws : isMp ? '-' : scores.hotseat.draws;
}

export function bumpScore(scores, mode, winner, dailyPuzzle, details = {}) {
  if (mode === 'daily') {
    if (winner === dailyPuzzle?.player) scores.daily.wins += 1;
    else scores.daily.losses += 1;
  } else if (winner === null) {
    scores[mode === 'hotseat' ? 'hotseat' : 'ai'].draws += 1;
  } else if (mode === 'hotseat') {
    scores.hotseat[winner === PLAYER_X ? 'x' : 'o'] += 1;
  } else {
    scores.ai[winner === PLAYER_X ? 'player' : 'ai'] += 1;
  }
  saveScores(scores);
  updateScoreDisplay(scores, mode);

  const actualMode = details.mode || mode;
  let result;
  if (actualMode === 'daily') {
    result = winner === dailyPuzzle?.player ? 'win' : 'loss';
  } else if (actualMode === 'ai') {
    result = winner === null ? 'draw' : winner === PLAYER_X ? 'win' : 'loss';
  } else {
    result = winner === null ? 'draw' : winner === PLAYER_X ? 'x' : 'o';
  }
  return recordGame({
    mode: actualMode,
    result,
    attempts: details.attempts,
    goal: details.goal,
  });
}

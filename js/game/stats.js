// The arcade's trophy room: best scores, medals, and the career ledger —
// pure localStorage, no Phaser, no game modules. Split out of the registry
// so a view can read "3★ on Whale-Fall City" without hauling six game
// engines across the import boundary. The registry re-exports everything
// here, so existing callers never notice the seam.

// ——— bests + medals: local-only, per world ———
// Stored value is { s: bestScore, st: bestStars } — legacy plain numbers
// from earlier builds are read as { s: n, st: 0 }.

const BEST_KEY = 'p3.gameBests';

export function readBests() {
  try {
    const b = JSON.parse(localStorage.getItem(BEST_KEY));
    return b && typeof b === 'object' ? b : {};
  } catch { return {}; }
}

export function bestFor(worldCls) {
  const v = readBests()[worldCls];
  return (typeof v === 'number' ? v : v?.s) ?? 0;
}

export function starsFor(worldCls) {
  const v = readBests()[worldCls];
  return (typeof v === 'object' && v ? v.st : 0) ?? 0;
}

// Persists score and medal highs independently; returns true only when the
// SCORE is a new record (that's the ceremony's score-PR trigger). A new medal
// TIER is not signalled through this return — the caller compares starsFor()
// read BEFORE the save against the run's stars to celebrate a medal upgrade,
// so a mid-score run that unlocks a higher medal still gets its moment.
export function saveBest(worldCls, score, stars = 0) {
  accrue(score); // fold every played run into the lifetime ledger, always
  const bests = readBests();
  const prevS = bestFor(worldCls);
  const prevSt = starsFor(worldCls);
  const record = score > prevS;
  if (!record && stars <= prevSt) return false;
  bests[worldCls] = { s: Math.max(score, prevS), st: Math.max(stars, prevSt) };
  try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch { /* full */ }
  return record;
}

// ——— lifetime ledger + daily streak ———
// An app used every workout, day after day, needs a number that grows. Beside
// the per-world bests we keep one tiny career record plus a consecutive-day
// streak, so repeat sessions visibly accumulate (surfaced on the pill/atlas).
const STATS_KEY = 'p3.gameStats';
const DAY_MS = 86400000;
const EMPTY_STATS = { plays: 0, score: 0, best: 0, day: 0, streak: 0, streakBest: 0 };
// local-midnight day index, so a streak flips over at the player's midnight
const localDay = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAY_MS);

export function readStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY));
    if (s && typeof s === 'object') return { ...EMPTY_STATS, ...s };
  } catch { /* corruption reads as a fresh ledger */ }
  return { ...EMPTY_STATS };
}

// Fold one completed run into the career ledger. Guarded so a bad write can
// never disturb the best-score contract, and gated on score>0 so an untouched
// idle rest changes nothing at all (IDLE LAW). Called once per scored run.
function accrue(score) {
  if (!(score > 0)) return;
  try {
    const s = readStats();
    const day = localDay();
    const gap = day - s.day;
    const streak = !s.day ? 1        // first run ever
      : gap === 0 ? s.streak         // same day: hold the streak
      : gap === 1 ? s.streak + 1     // next day: extend it
      : 1;                           // a day (or more) was missed: reset
    const run = Math.round(score);
    localStorage.setItem(STATS_KEY, JSON.stringify({
      plays: s.plays + 1,
      score: s.score + run,
      best: Math.max(s.best, run),
      day,
      streak,
      streakBest: Math.max(s.streakBest, streak),
    }));
  } catch { /* the ledger is best-effort; never block a save */ }
}

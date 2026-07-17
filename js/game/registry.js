// The arcade's card catalog: world → game module, plus best-score
// persistence. Game modules export data-only WORLDS at the top level and
// only touch Phaser inside create(), so this whole graph stays importable
// under node for the test suite.
import * as dojo from './games/dojo.js';
import * as deep from './games/deep.js';
import * as park from './games/park.js';
import * as wok from './games/wok.js';
import * as atoll from './games/atoll.js';
import * as yeti from './games/yeti.js';

export const GAMES = { dojo, deep, park, wok, atoll, yeti };

// World-first lookup: any world can carry any mechanic (the slingshot lives
// in three different universes). Each world exists in exactly one module —
// the coverage test enforces it.
const WORLD_INDEX = {};
for (const mod of Object.values(GAMES)) {
  for (const w of Object.keys(mod.WORLDS)) WORLD_INDEX[w] = mod;
}

// ——— per-world medal calibration ———
// A single STARS tuple per game was being reused across 8 differently-balanced
// worlds, so a "gold" meant elite play in the hard world and a participation
// trophy in the easy one — the medal certified nothing consistent. We rebuild
// the thresholds PER WORLD from the very difficulty knobs each game already
// encodes in its WORLDS cfg, then mean-normalize within the game so the
// module's overall medal economy is unchanged — only redistributed. An easier
// world earns a HIGHER bar, a harder world a LOWER one, so a gold certifies
// roughly the same skill whichever world the cabinet serves.
const clampMul = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// "Scoring opportunity" of a world relative to its game's average world:
// >1 means more points are reachable here, <1 means fewer. Read straight from
// the knob the game's own designer tuned. Ambiguous knobs stay neutral (1) so
// a wrong guess can never make calibration worse than the old flat tuple.
const OPPORTUNITY = {
  // more targets on screen (pace) lifts the reachable rate; bombs are pure
  // hazard that suppresses safe scoring.
  dojo: (c) => (c.pace ?? 1) * (1 - 1.4 * (c.bombs ?? 0)),
  // density here is OBSTACLE density — thicker water means shallower dives.
  deep: (c) => 1 / (c.density ?? 1),
  // density is OBSTACLE density too — a packed slalom skips far less.
  park: (c) => 1 / (c.density ?? 1),
  // more spawns feed longer chains; faster jammers are harder to catch.
  atoll: (c) => (c.spawn ?? 1) / (c.speed ?? 1),
  // gravity's effect on pachinko yield genuinely cuts both ways — stay neutral.
  wok: () => 1,
  // no per-world difficulty knobs at all — uniform.
  yeti: () => 1,
};

// Precompute the adjusted tuple for every world once (the module graph is
// static). Falls back silently to the base tuple for anything unexpected.
const WORLD_STARS = {};
for (const [game, mod] of Object.entries(GAMES)) {
  const base = Array.isArray(mod.STARS) ? mod.STARS : null;
  if (!base || base.length !== 3) continue; // leave undefined → gameFor falls back
  const opp = OPPORTUNITY[game] || (() => 1);
  const entries = Object.entries(mod.WORLDS);
  const scores = entries.map(([, cfg]) => {
    const o = opp(cfg);
    return Number.isFinite(o) && o > 0 ? o : 1;
  });
  const mean = scores.reduce((a, b) => a + b, 0) / (scores.length || 1) || 1;
  entries.forEach(([w], i) => {
    const mult = clampMul(scores[i] / mean, 0.72, 1.35);
    const t = base.map((b) => Math.max(1, Math.round(b * mult)));
    // keep the ladder strictly ascending after rounding
    for (let k = 1; k < t.length; k++) if (t[k] <= t[k - 1]) t[k] = t[k - 1] + 1;
    WORLD_STARS[w] = t;
  });
}

export function gameFor(universeCls, worldCls) {
  const mod = WORLD_INDEX[worldCls];
  if (!mod) return null;
  return {
    title: mod.TITLE,
    verb: mod.VERB,
    gesture: mod.GESTURE,
    cfg: mod.WORLDS[worldCls],
    create: mod.create,
    // per-world tuned medal ladder (base tuple if calibration was skipped)
    stars: WORLD_STARS[worldCls] ?? mod.STARS,
    help: mod.HELP,
  };
}

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

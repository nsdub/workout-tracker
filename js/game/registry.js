// The arcade's card catalog: world → game module, plus the trophy room
// (re-exported from stats.js). Game modules export data-only WORLDS at the top level and
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
  // throughput is CAP-bound (three airborne cuttables), so pace never lifts
  // the reachable rate — only bombs suppress it, by taxing free swiping.
  dojo: (c) => 1 - 1.4 * (c.bombs ?? 0),
  // obstacles are deep's point SOURCE (smash points + graze chains), so
  // thicker water pays MORE; the snare hazards (kelp, jellies, patrol
  // lights, the dark) tax what a diver can actually collect.
  deep: (c) => (0.6 + 0.4 * (c.density ?? 1)) * ((c.kelp || c.jellies || c.searchlights || c.dark) ? 0.85 : 1),
  // open water: density is obstacle density, a packed slalom skips less.
  // In the bog it counts turtle PADS — the only safe landings — so it ADDS
  // opportunity. Rings and beams add scoring surface; a cliff launch
  // suppresses the reachable rate even with the skim gate scaled for it.
  park: (c) => (c.bog ? (c.density ?? 1) : 1 / (c.density ?? 1)) * (c.rings ? 1.2 : 1) * (c.beams ? 1.15 : 1) * (c.cliff ? 0.7 : 1),
  // more spawns feed longer chains; faster jammers are harder to catch; a
  // hot golden cadence with a jackpot on top is real income the bar must
  // price in (52 is the mean of the standard [34,70] goldEvery band).
  atoll: (c) => ((c.spawn ?? 1) / (c.speed ?? 1)) * (52 / (((c.goldEvery?.[0] ?? 34) + (c.goldEvery?.[1] ?? 70)) / 2)) * (c.jackpot ? 1.25 : 1),
  // low gravity does NOT cut both ways — it stretches every drop cycle, so
  // fewer drops land per rest. Three wide pans make catches near-automatic;
  // bouncy pegs, golden lanterns and crackers all add yield.
  wok: (c) => Math.sqrt(c.gravity ?? 1) * ((c.woks ?? 0) >= 3 ? 1.2 : 1) * (c.bouncy ? 1.15 : 1) * (c.golden ? 1.1 : 1) * (c.crackers ? 1.1 : 1),
  // the boolean flags ARE difficulty knobs: aurora doubles points about a
  // quarter of the time, ice quarters steering, melt sheds mass faster,
  // moguls pay extra air, and a denser village cadence feeds more gates.
  yeti: (c) => (c.aurora ? 1.25 : 1) * (c.ice ? 0.75 : 1) * (c.melt ? 0.9 : 1) * (c.moguls ? 1.1 : 1) * (3 / (c.villageEvery ?? 3)) ** 0.3,
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

// ——— bests + medals + career ledger ———
// The trophy room lives in stats.js (pure localStorage, zero game imports)
// so views can read medals without hauling six game engines across the
// import boundary. Re-exported here so overlay, tests, and older callers
// keep one stable address for the whole arcade.
export { readBests, bestFor, starsFor, saveBest, readStats } from './stats.js';

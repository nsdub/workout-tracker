// The arcade's card catalog: universe → game module, world → config,
// plus best-score persistence. Pure enough to run under node for tests.
import * as dojo from './games/dojo.js';
import * as deep from './games/deep.js';
import * as park from './games/park.js';
import * as wok from './games/wok.js';
import * as atoll from './games/atoll.js';
import * as yeti from './games/yeti.js';
import * as sling from './games/sling.js';

export const GAMES = { dojo, deep, park, wok, atoll, yeti, sling };

// World-first lookup: any world can carry any mechanic (the slingshot lives
// in three different universes). Each world exists in exactly one module —
// the coverage test enforces it.
const WORLD_INDEX = {};
for (const mod of Object.values(GAMES)) {
  for (const w of Object.keys(mod.WORLDS)) WORLD_INDEX[w] = mod;
}

export function gameFor(universeCls, worldCls) {
  const mod = WORLD_INDEX[worldCls];
  if (!mod) return null;
  return { title: mod.TITLE, cfg: mod.WORLDS[worldCls], create: mod.create, load: mod.load };
}

// ——— best scores: local-only, per world ———

const BEST_KEY = 'p3.gameBests';

export function readBests() {
  try {
    const b = JSON.parse(localStorage.getItem(BEST_KEY));
    return b && typeof b === 'object' ? b : {};
  } catch { return {}; }
}

export function bestFor(worldCls) {
  return readBests()[worldCls] ?? 0;
}

// Returns true when this score sets a new record.
export function saveBest(worldCls, score) {
  const bests = readBests();
  if (score <= (bests[worldCls] ?? 0)) return false;
  bests[worldCls] = score;
  try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch { /* full */ }
  return true;
}

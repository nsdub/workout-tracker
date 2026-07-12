// The arcade's card catalog: universe → game module, world → config,
// plus best-score persistence. Pure enough to run under node for tests.
import * as dojo from './games/dojo.js';
import * as deep from './games/deep.js';
import * as park from './games/park.js';
import * as wok from './games/wok.js';
import * as atoll from './games/atoll.js';
import * as yeti from './games/yeti.js';

export const GAMES = { dojo, deep, park, wok, atoll, yeti };

export function gameFor(universeCls, worldCls) {
  const mod = GAMES[universeCls];
  if (!mod) return null;
  const cfg = mod.WORLDS[worldCls];
  if (!cfg) return null;
  return { title: mod.TITLE, cfg, create: mod.create };
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

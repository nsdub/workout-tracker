// The arcade's card catalog: world → game module, plus best-score
// persistence. Game modules export data-only WORLDS at the top level and
// only touch Phaser inside create(), so this whole graph stays importable
// under node for the test suite.
import * as dojo from './games/dojo.js';

// The other five universes' modules land as they're built — the coverage
// test in scripts/test-app.mjs is the gate that says when this is whole.
export const GAMES = { dojo };

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
  return { title: mod.TITLE, cfg: mod.WORLDS[worldCls], create: mod.create };
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

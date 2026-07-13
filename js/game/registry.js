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

export function gameFor(universeCls, worldCls) {
  const mod = WORLD_INDEX[worldCls];
  if (!mod) return null;
  return { title: mod.TITLE, verb: mod.VERB, cfg: mod.WORLDS[worldCls], create: mod.create, stars: mod.STARS, help: mod.HELP };
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

// Persists score and medal highs independently; returns true only when
// the SCORE is a new record (that's what the ceremony celebrates).
export function saveBest(worldCls, score, stars = 0) {
  const bests = readBests();
  const prevS = bestFor(worldCls);
  const prevSt = starsFor(worldCls);
  const record = score > prevS;
  if (!record && stars <= prevSt) return false;
  bests[worldCls] = { s: Math.max(score, prevS), st: Math.max(stars, prevSt) };
  try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch { /* full */ }
  return record;
}

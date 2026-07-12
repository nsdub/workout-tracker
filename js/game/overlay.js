// The arcade cabinet: fullscreen layer that hosts a game for exactly as
// long as the rest timer runs. Rest over = game over. Any crash inside a
// game tears the cabinet down — games can never block training.
import { $, esc, haptic } from '../util.js';
import { sfx } from '../audio.js';
import { toast } from '../components.js';
import { createEngine } from './engine.js';
import { gameFor, bestFor, saveBest } from './registry.js';

// Constant availability check — no game modules needed at boot.
const GAME_UNIVERSES = new Set(['dojo', 'deep', 'park', 'wok', 'atoll', 'yeti']);
export function gameAvailable() {
  return GAME_UNIVERSES.has(document.documentElement.dataset.universe);
}

let active = null; // { el, engine, score, worldCls, popPushed }
let pendingGamePop = false; // our own back() in flight — eat its popstate

export function gamePopHandled() {
  if (pendingGamePop) { pendingGamePop = false; return true; }
  if (!active) return false;
  closeGame(true);
  return true;
}

function hudTime(deadline) {
  const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export async function openGame({ deadline }) {
  if (active && !active.el.isConnected) active = null; // self-heal a stuck ref
  if (active) return;
  const universe = document.documentElement.dataset.universe;
  const worldCls = document.documentElement.dataset.world;
  const spec = gameFor(universe, worldCls);
  if (!spec) return;

  const el = document.createElement('div');
  el.className = 'game-overlay';
  el.innerHTML = `
    <header class="go-hud">
      <span class="go-titles">
        <b>${esc(spec.title)}</b>
        <i>${esc(spec.cfg.name)}</i>
      </span>
      <span class="go-score num" id="go-score">0</span>
      <span class="go-time num" id="go-time">${hudTime(deadline)}</span>
      <button class="go-quit" id="go-quit" aria-label="Quit">✕</button>
    </header>
    <canvas class="go-canvas" id="go-canvas"></canvas>`;
  document.body.appendChild(el);

  const canvas = $('#go-canvas', el);
  const scoreEl = $('#go-score', el);
  const timeEl = $('#go-time', el);

  let score = 0;
  const api = {
    score(delta) {
      score = Math.max(0, score + delta);
      scoreEl.textContent = score;
      return score;
    },
    sfx,
    haptic,
  };

  const engine = createEngine(canvas, {
    deadline,
    onEnd: () => showGameOver(),
  });
  engine.setOnError(() => {
    closeGame();
    toast('The game hit a snag — rest timer is untouched', 'bad', 3000);
  });

  active = { el, engine, get score() { return score; }, worldCls, spec };

  try { history.pushState({ p3: 'game' }, ''); active.popPushed = true; } catch { active.popPushed = false; }

  // HUD clock ticks off the same wall-clock deadline as the rest pill
  active.clock = setInterval(() => { timeEl.textContent = hudTime(deadline); }, 250);

  $('#go-quit', el).addEventListener('click', () => closeGame());

  let inst;
  try {
    if (spec.load) await spec.load(); // e.g. the slingshot pulls in physics
    if (!active) return; // closed while loading
    inst = spec.create(engine, api, spec.cfg);
  } catch (err) {
    console.error('game boot failed', err);
    closeGame();
    toast('The game hit a snag — rest timer is untouched', 'bad', 3000);
    return;
  }
  engine.start(inst);

  function showGameOver() {
    if (!active) return;
    const finalScore = score;
    const prevBest = bestFor(worldCls);
    const isRecord = saveBest(worldCls, finalScore);
    clearInterval(active.clock);
    el.insertAdjacentHTML('beforeend', `
      <div class="go-over">
        <div class="go-over-eyebrow">Rest complete</div>
        <div class="go-over-title">${isRecord ? 'NEW RECORD' : 'Time'}</div>
        <div class="go-over-score num">${finalScore}</div>
        <div class="go-over-best num">${isRecord ? `Old best ${prevBest}` : `Best ${Math.max(prevBest, finalScore)}`} · ${esc(spec.cfg.name)}</div>
        <button class="btn primary go-back" id="go-back">Back to work</button>
      </div>`);
    if (isRecord && finalScore > 0) { sfx('pr'); haptic([15, 40, 25]); }
    else sfx('objDone');
    $('#go-back', el).addEventListener('click', () => closeGame());
  }
}

export function closeGame(fromPop = false) {
  if (!active) return;
  const { el, engine, clock, popPushed } = active;
  active = null;
  clearInterval(clock);
  engine.destroy();
  el.remove();
  if (!fromPop && popPushed && history.state?.p3 === 'game') {
    pendingGamePop = true;
    setTimeout(() => { pendingGamePop = false; }, 600);
    try { history.back(); } catch { pendingGamePop = false; }
  }
}

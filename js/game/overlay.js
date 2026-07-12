// The arcade cabinet: fullscreen layer that hosts a Phaser game for exactly
// as long as the rest timer runs. Rest over = game over. Any crash inside a
// game tears the cabinet down — games can never block training.
//
// The deadline is wall-clock and owned HERE, not by the engine: Phaser
// pauses its loop while the app is backgrounded, but our 250ms HUD clock
// (throttled in background, caught up on return) is what ends the game, so
// "rest over" is always the truth no matter what the render loop did.
import { $, esc, haptic } from '../util.js';
import { sfx } from '../audio.js';
import { toast } from '../components.js';
import { loadPhaser } from './loader.js';
import { gameFor, bestFor, saveBest } from './registry.js';

// Constant availability check — no game modules needed at boot.
const GAME_UNIVERSES = new Set(['dojo', 'deep', 'park', 'wok', 'atoll', 'yeti']);
export function gameAvailable() {
  return GAME_UNIVERSES.has(document.documentElement.dataset.universe);
}

let active = null; // { el, game, clock, score, worldCls, spec, popPushed, errListener }
let pendingGamePop = false; // our own history.back() in flight — eat its popstate

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
    <div class="go-stage" id="go-stage"></div>`;
  document.body.appendChild(el);

  // Claim the cabinet immediately so double-taps and re-entries bounce off,
  // then finish booting asynchronously.
  active = { el, game: null, clock: null, score: 0, worldCls, spec, popPushed: false };
  try { history.pushState({ p3: 'game' }, ''); active.popPushed = true; } catch { /* throttled */ }
  $('#go-quit', el).addEventListener('click', () => closeGame());

  const mine = active;
  const fail = (err) => {
    console.error('game crashed', err);
    if (active === mine) {
      closeGame();
      toast('The game hit a snag — rest timer is untouched', 'bad', 3000);
    }
  };

  let Phaser;
  try {
    Phaser = await loadPhaser();
  } catch (err) { fail(err); return; }
  if (active !== mine) return; // closed while the engine loaded

  const scoreEl = $('#go-score', el);
  const timeEl = $('#go-time', el);
  const api = {
    score(delta) {
      if (active !== mine) return mine.score;
      mine.score = Math.max(0, mine.score + delta);
      scoreEl.textContent = mine.score;
      return mine.score;
    },
    sfx,
    haptic,
  };

  // While a game is live, any uncaught page error is treated as the game's:
  // tear the cabinet down rather than risk a wedged fullscreen layer.
  mine.errListener = (e) => fail(e.error ?? e.message);
  window.addEventListener('error', mine.errListener);

  let sceneCfg;
  try {
    sceneCfg = spec.create(Phaser, { api, cfg: spec.cfg, worldCls });
  } catch (err) { fail(err); return; }
  const userCreate = sceneCfg.create;
  const userUpdate = sceneCfg.update;
  sceneCfg.key = 'play';
  sceneCfg.create = function () { try { userCreate?.call(this); } catch (err) { fail(err); } };
  if (userUpdate) {
    sceneCfg.update = function (t, dt) { try { userUpdate.call(this, t, dt); } catch (err) { fail(err); } };
  }

  const stage = $('#go-stage', el);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  try {
    mine.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: stage,
      width: Math.max(1, Math.round(stage.clientWidth * dpr)),
      height: Math.max(1, Math.round(stage.clientHeight * dpr)),
      scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
      backgroundColor: '#05070f',
      banner: false,
      audio: { noAudio: true }, // the app's own WebAudio does the talking
      input: { activePointers: 2 },
      scene: sceneCfg,
    });
  } catch (err) { fail(err); return; }

  // HUD clock ticks off the same wall-clock deadline as the rest pill.
  mine.clock = setInterval(() => {
    if (active !== mine) return;
    timeEl.textContent = hudTime(deadline);
    if (Date.now() >= deadline) showGameOver();
  }, 250);

  function showGameOver() {
    if (active !== mine) return;
    clearInterval(mine.clock);
    mine.clock = null;
    try { mine.game.scene.pause('play'); } catch { /* already gone */ }
    const finalScore = mine.score;
    const prevBest = bestFor(worldCls);
    const isRecord = saveBest(worldCls, finalScore);
    el.insertAdjacentHTML('beforeend', `
      <div class="go-over">
        <div class="go-over-eyebrow">Rest complete</div>
        <div class="go-over-title">${isRecord ? 'NEW RECORD' : 'Time'}</div>
        <div class="go-over-score num" id="go-final">0</div>
        <div class="go-over-best num">${isRecord ? `Old best ${prevBest}` : `Best ${Math.max(prevBest, finalScore)}`} · ${esc(spec.cfg.name)}</div>
        <button class="btn primary go-back" id="go-back">Back to work</button>
      </div>`);
    // the score counts up — earned, not stated
    const finalEl = $('#go-final', el);
    const t0 = performance.now();
    const tick = () => {
      if (!finalEl.isConnected) return;
      const f = Math.min(1, (performance.now() - t0) / 900);
      finalEl.textContent = Math.round(finalScore * (1 - Math.pow(1 - f, 3)));
      if (f < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    if (isRecord && finalScore > 0) { sfx('pr'); haptic([15, 40, 25]); }
    else sfx('objDone');
    $('#go-back', el).addEventListener('click', () => closeGame());
  }
}

export function closeGame(fromPop = false) {
  if (!active) return;
  const { el, game, clock, popPushed, errListener } = active;
  active = null;
  if (clock) clearInterval(clock);
  if (errListener) window.removeEventListener('error', errListener);
  try { game?.destroy(true); } catch { /* double-destroy race */ }
  el.remove();
  if (!fromPop && popPushed && history.state?.p3 === 'game') {
    pendingGamePop = true;
    setTimeout(() => { pendingGamePop = false; }, 600);
    try { history.back(); } catch { pendingGamePop = false; }
  }
}

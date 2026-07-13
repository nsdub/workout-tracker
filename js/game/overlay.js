// The arcade cabinet: fullscreen layer that hosts a Phaser game for exactly
// as long as the rest timer runs. Rest over = game over. Any crash inside a
// game tears the cabinet down — games can never block training.
//
// The deadline is wall-clock and owned HERE, not by the engine: Phaser
// pauses its loop while the app is backgrounded, but our 250ms HUD clock
// (throttled in background, caught up on return) is what ends the game, so
// "rest over" is always the truth no matter what the render loop did.
import { $, esc, haptic } from '../util.js';
import { sfx, note } from '../audio.js';
import { store } from '../store.js';
import { toast } from '../components.js';
import { loadPhaser } from './loader.js';
import { glyphBanner, goldRush, slowmo, burst, shockRing, flash, zoomPunch, introCard } from './fx.js';
import { gameFor, bestFor, starsFor, saveBest } from './registry.js';

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
  // Back closes the help panel before it closes the game. The pop just
  // consumed our history guard, so put it back — the NEXT back must still
  // reach us instead of navigating the app out from under the cabinet.
  if (active.helpOpen) {
    closeHelp(active);
    if (active.popPushed) {
      try { history.pushState({ p3: 'game' }, ''); } catch { active.popPushed = false; }
    }
    return true;
  }
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
  if (!spec) { toast('No game in this world yet'); return; }

  const el = document.createElement('div');
  el.className = 'game-overlay';
  el.innerHTML = `
    <header class="go-hud">
      <span class="go-titles">
        <b>${esc(spec.title)}</b>
        <i>${esc(spec.cfg.name)}</i>
      </span>
      <span class="go-score num" id="go-score">0</span>
      <span class="go-time-stack">
        <i class="go-time-lbl">Rest</i>
        <span class="go-time num" id="go-time">${hudTime(deadline)}</span>
      </span>
      <span class="go-btns">
        <button class="go-hbtn go-hit" id="go-help-btn" aria-label="How to play">?</button>
        <button class="go-hbtn go-hit" id="go-snd" aria-label="Turn sound off">🔊</button>
        <button class="go-quit go-hit" id="go-quit" aria-label="Quit">✕</button>
      </span>
      <i class="go-tbar" id="go-tbar"></i>
    </header>
    <div class="go-stage" id="go-stage"><div class="go-boot">Loading the game…</div></div>`;
  document.body.appendChild(el);

  // Claim the cabinet immediately so double-taps and re-entries bounce off,
  // then finish booting asynchronously.
  active = { el, game: null, clock: null, score: 0, worldCls, spec, popPushed: false, fever: false, slowed: false, ended: false, helpOpen: false, openedAt: Date.now() };
  try { history.pushState({ p3: 'game' }, ''); active.popPushed = true; } catch { /* throttled */ }
  $('#go-quit', el).addEventListener('click', () => closeGame());

  const mine = active;

  // Sound and help live on the HUD from frame zero — neither needs Phaser.
  // The sound button flips the SAME switch as the Systems console
  // (store.settings.sound); audio.js gates every sfx/note on it.
  const sndBtn = $('#go-snd', el);
  const paintSnd = () => {
    sndBtn.textContent = store.settings.sound ? '🔊' : '🔇';
    sndBtn.setAttribute('aria-label', store.settings.sound ? 'Turn sound off' : 'Turn sound on');
  };
  paintSnd();
  sndBtn.addEventListener('click', () => {
    store.saveSettings({ sound: !store.settings.sound });
    paintSnd();
    haptic(6);
    sfx('tap'); // audible only when the answer was "on"
  });
  $('#go-help-btn', el).addEventListener('click', () => openHelp(mine));
  const fail = (err) => {
    console.error('game crashed', err);
    if (active === mine) {
      closeGame();
      toast('The game hit a snag. Your rest timer is still running.', 'bad', 3000);
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
      // After TIME the score is banked: stray hits during the fireworks
      // can't make the HUD disagree with the panel and the saved best.
      if (active !== mine || mine.ended) return mine.score;
      if (mine.fever && delta > 0) delta *= 2; // GOLD RUSH pays double
      mine.score = Math.max(0, mine.score + delta);
      scoreEl.textContent = mine.score;
      // the HUD reacts: a score that silently mutates feels dead
      scoreEl.classList.remove('bump', 'sting');
      void scoreEl.offsetWidth;
      scoreEl.classList.add(delta < 0 ? 'sting' : 'bump');
      return mine.score;
    },
    sfx,
    note,
    haptic,
    timeLeft: () => Math.max(0, deadline - Date.now()),
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
  sceneCfg.create = function () {
    try {
      $('.go-boot', el)?.remove(); // the world is painting — loading line done
      userCreate?.call(this);
      // the entry ritual: verb card slams in, input unlocks on the beat
      if (spec.verb) {
        this.input.enabled = false;
        introCard(this, spec.verb, () => {
          if (active === mine) { try { this.input.enabled = true; } catch { /* gone */ } }
        });
      }
    } catch (err) { fail(err); }
  };
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
      physics: sceneCfg.physics ?? { default: 'arcade' },
      scene: sceneCfg,
    });
    if (typeof window !== 'undefined') window.__p3Game = mine.game; // QA hook
    // Help opened while Phaser was still booting: honor the pause now.
    if (mine.helpOpen) { try { mine.game.scene.pause('play'); } catch { /* not up yet */ } }
  } catch (err) { fail(err); return; }

  // HUD clock ticks off the same wall-clock deadline as the rest pill.
  // The last 10 seconds are the GOLD RUSH (double points, molten world)
  // and the final beat plays in slow motion — the hard stop is the fever,
  // not the interruption (Peggle's law).
  const tbar = $('#go-tbar', el);
  const totalMs = Math.max(1, deadline - mine.openedAt);
  mine.clock = setInterval(() => {
    if (active !== mine) return;
    timeEl.textContent = hudTime(deadline);
    const left = deadline - Date.now();
    if (tbar) tbar.style.width = `${Math.max(0, Math.min(100, (left / totalMs) * 100))}%`;
    const scene = () => { try { return mine.game.scene.getScene('play'); } catch { return null; } };
    if (!mine.fever && left <= 10000 && left > 2000) {
      mine.fever = true;
      timeEl.classList.add('gold');
      const s = scene();
      if (s) {
        try { glyphBanner(s, 'GOLD RUSH ×2', '#ffd24a', 30); goldRush(s); sceneCfg.fever?.(s); } catch { /* garnish */ }
      }
      sfx('objDone');
      haptic([12, 30, 12]);
    }
    if (!mine.slowed && left <= 1300 && left > 0) {
      mine.slowed = true;
      const s = scene();
      if (s) { try { slowmo(s, 0.3, 1250); } catch { /* garnish */ } }
    }
    if (left <= 0) showGameOver();
  }, 250);

  function showGameOver() {
    if (active !== mine) return;
    clearInterval(mine.clock);
    mine.clock = null;
    mine.ended = true; // freezes api.score — the run is banked as of TIME
    closeHelp(mine);   // rest ran out while reading? The results win.
    const finalScore = mine.score;
    const prevBest = bestFor(worldCls);
    const prevStars = starsFor(worldCls);
    // Medals are rate-based (points per second) so a 60s rest and a 240s
    // rest compete on the same ladder — Angry Birds' three-star law.
    const elapsed = Math.max(12, (Date.now() - mine.openedAt) / 1000);
    const th = spec.stars ?? [5, 10, 16];
    const rate = finalScore / elapsed;
    const stars = rate >= th[2] ? 3 : rate >= th[1] ? 2 : rate >= th[0] ? 1 : 0;
    const isRecord = saveBest(worldCls, finalScore, stars);

    // THE FINALE: before the panel, the canvas detonates — a staggered
    // fireworks volley inside the final slow-mo beat (Peggle's law: the
    // hard stop IS the fever). Wall-clock timers, because scene time is
    // running at 0.3x right now.
    let finaleMs = 0;
    try {
      const scene = mine.game.scene.getScene('play');
      if (scene?.scene.isActive()) {
        finaleMs = 950;
        const W = scene.scale.width, H = scene.scale.height;
        const colors = isRecord ? [0xffd24a, 0xfff0c8, 0x3adcc8, 0xff8ad0] : [0xffd24a, 0xfff0c8, 0x3adcc8];
        for (let i = 0; i < (stars === 3 ? 10 : isRecord ? 8 : 5); i++) {
          setTimeout(() => {
            if (active !== mine) return;
            try {
              const x = W * (0.15 + Math.random() * 0.7);
              const y = H * (0.12 + Math.random() * 0.5);
              const tint = colors[i % colors.length];
              burst(scene, x, y, tint, { n: 26, speed: 460, scale: 0.7, life: 900 });
              shockRing(scene, x, y, tint, 130);
            } catch { /* scene gone */ }
          }, i * 130);
        }
        flash(scene, isRecord ? 0xffd24a : 0xffffff, 200, 0.4);
        zoomPunch(scene, 1.08, 500);
        glyphBanner(scene, isRecord ? 'NEW RECORD' : 'TIME!', '#ffd24a', 38);
        haptic([12, 40, 12, 40, 20]);
      }
    } catch { /* no scene, straight to the panel */ }

    setTimeout(() => {
      if (active !== mine) return;
      // pause AND stop the loop: a hitstop timeout in flight would
      // otherwise resume the scene behind the panel and keep scoring
      try { mine.game.scene.pause('play'); mine.game.loop.stop(); } catch { /* already gone */ }
      const starRow = [1, 2, 3].map((i) =>
        `<span class="${i <= stars ? 'on' : ''}${i <= stars && i > prevStars ? ' fresh' : ''}" style="animation-delay:${0.25 + i * 0.16}s">★</span>`).join('');
      // Words wear the body face; only the numerals are mono (house law).
      const bestShown = isRecord ? prevBest : Math.max(prevBest, finalScore);
      const bestStars = Math.max(stars, prevStars);
      el.insertAdjacentHTML('beforeend', `
        <div class="go-over">
          <div class="go-over-eyebrow">Rest complete</div>
          <div class="go-over-title">${isRecord ? 'NEW RECORD' : 'Time’s up'}</div>
          <div class="go-stars">${starRow}</div>
          <div class="go-over-score num" id="go-final">0</div>
          <div class="go-over-best go-best-line">${isRecord ? 'Old best' : 'Best'} <span class="num">${bestShown}</span>${bestStars ? ` · ${'★'.repeat(bestStars)}` : ''} · ${esc(spec.cfg.name)}</div>
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
      // A thumb still mashing the game must not fire the button the frame
      // it materializes under it — arm it after a beat.
      const armedAt = Date.now() + 450;
      $('#go-back', el).addEventListener('click', () => { if (Date.now() >= armedAt) closeGame(); });
    }, finaleMs);
  }
}

export function closeGame(fromPop = false) {
  if (!active) return;
  const { el, game, clock, popPushed, errListener, ended, score, worldCls, spec, openedAt } = active;
  active = null;
  if (clock) clearInterval(clock);
  if (errListener) window.removeEventListener('error', errListener);
  // Quitting mid-game still banks the run, silently — checking the next
  // exercise never costs the points already earned. Full runs keep the
  // ceremony; this is bookkeeping only (same rate-based medal ladder).
  if (!ended && score > 0) {
    try {
      const elapsed = Math.max(12, (Date.now() - openedAt) / 1000);
      const th = spec.stars ?? [5, 10, 16];
      const rate = score / elapsed;
      saveBest(worldCls, score, rate >= th[2] ? 3 : rate >= th[1] ? 2 : rate >= th[0] ? 1 : 0);
    } catch { /* never block teardown */ }
  }
  try { game?.destroy(true); } catch { /* double-destroy race */ }
  el.classList.add('out');
  setTimeout(() => el.remove(), 190);
  if (!fromPop && popPushed && history.state?.p3 === 'game') {
    pendingGamePop = true;
    setTimeout(() => { pendingGamePop = false; }, 600);
    try { history.back(); } catch { pendingGamePop = false; }
  }
}

// ——— How to play ———
// A frosted card over the canvas: the game's own instructions (each module
// exports HELP = { goal, how, avoid }) plus the three house rules every
// game shares. The scene pauses underneath; the wall-clock rest keeps
// draining — that is the honest deal and the clock in the HUD says so.

function openHelp(inst) {
  if (!inst || active !== inst || inst.helpOpen || inst.ended) return;
  inst.helpOpen = true;
  try { inst.game?.scene.pause('play'); } catch { /* still booting */ }
  const h = inst.spec.help ?? {};
  const lines = [h.goal, h.how, h.avoid].filter((s) => typeof s === 'string' && s);
  const panel = document.createElement('div');
  panel.className = 'go-help';
  panel.innerHTML = `
    <div class="gh-card">
      <div class="gh-world">${esc(inst.spec.cfg.name)}</div>
      <div class="gh-title">${esc(inst.spec.title)}</div>
      ${lines.map((s) => `<p>${esc(s)}</p>`).join('')}
      <div class="gh-rules">
        <p>The last ten seconds are the Gold Rush, when every point counts double.</p>
        <p>The game ends when your rest ends, and your score is saved automatically.</p>
        <p>You earn stars by scoring quickly, not by playing longer.</p>
      </div>
      <button class="btn primary gh-close">Keep playing</button>
    </div>`;
  inst.el.appendChild(panel);
  panel.addEventListener('click', (e) => {
    if (e.target === panel || e.target.closest('.gh-close')) closeHelp(inst);
  });
  sfx('tap');
  haptic(6);
}

function closeHelp(inst) {
  if (!inst?.helpOpen) return;
  inst.helpOpen = false;
  inst.el.querySelector('.go-help')?.remove();
  if (!inst.ended) { try { inst.game?.scene.resume('play'); } catch { /* still booting */ } }
}

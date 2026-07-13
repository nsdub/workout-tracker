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
  active = { el, game: null, clock: null, score: 0, worldCls, spec, popPushed: false, fever: false, slowed: false, ended: false, helpOpen: false, phase: 'playing', openedAt: Date.now() };
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
    // A game calls this when the player runs out of lives — it ends the
    // run early (a real failure state), banks the score, and offers a
    // fresh run if rest remains. `cause` is a short themed word.
    die: (cause) => onDeath(cause),
  };

  // While a game is live, any uncaught page error is treated as the game's:
  // tear the cabinet down rather than risk a wedged fullscreen layer.
  mine.errListener = (e) => fail(e.error ?? e.message);
  window.addEventListener('error', mine.errListener);

  const stage = $('#go-stage', el);
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  // A fresh wrapped scene config each run (Phaser consumes it, and a
  // restart needs a clean one). The intro verb card only unlocks input
  // while the run is actually playing.
  function buildSceneCfg() {
    const cfg2 = spec.create(Phaser, { api, cfg: spec.cfg, worldCls });
    const userCreate = cfg2.create;
    const userUpdate = cfg2.update;
    cfg2.key = 'play';
    cfg2.create = function () {
      try {
        $('.go-boot', el)?.remove(); // the world is painting — loading line done
        userCreate?.call(this);
        if (spec.verb) {
          this.input.enabled = false;
          introCard(this, spec.verb, () => {
            if (active === mine && mine.phase === 'playing') { try { this.input.enabled = true; } catch { /* gone */ } }
          });
        }
      } catch (err) { fail(err); }
    };
    if (userUpdate) {
      cfg2.update = function (t, dt) { try { userUpdate.call(this, t, dt); } catch (err) { fail(err); } };
    }
    return cfg2;
  }

  // Boot (or re-boot) the playfield. Returns false on failure.
  function startRun() {
    let cfg2;
    try { cfg2 = buildSceneCfg(); } catch (err) { fail(err); return false; }
    mine.sceneCfg = cfg2;
    mine.score = 0; scoreEl.textContent = '0';
    mine.ended = false; mine.phase = 'playing'; mine.openedAt = Date.now();
    mine.fever = false; mine.slowed = false; mine.banked = false; mine.result = null;
    timeEl.classList.remove('gold');
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
        physics: cfg2.physics ?? { default: 'arcade' },
        scene: cfg2,
      });
      if (typeof window !== 'undefined') window.__p3Game = mine.game; // QA hook
      if (mine.helpOpen) { try { mine.game.scene.pause('play'); } catch { /* not up yet */ } }
    } catch (err) { fail(err); return false; }
    return true;
  }

  if (!startRun()) return;

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
    if (!mine.fever && left <= 10000 && left > 2000 && mine.phase === 'playing') {
      mine.fever = true;
      timeEl.classList.add('gold');
      const s = scene();
      if (s) {
        try { glyphBanner(s, 'GOLD RUSH ×2', '#ffd24a', 30); goldRush(s); mine.sceneCfg?.fever?.(s); } catch { /* garnish */ }
      }
      sfx('objDone');
      haptic([12, 30, 12]);
    }
    if (!mine.slowed && left <= 1300 && left > 0 && mine.phase === 'playing') {
      mine.slowed = true;
      const s = scene();
      if (s) { try { slowmo(s, 0.3, 1250); } catch { /* garnish */ } }
    }
    // Once rest can't fit another meaningful run, retire a pending "Go again".
    if (left <= 7000) el.querySelector('.go-again')?.remove();
    if (left <= 0 && mine.phase === 'playing') timerOver();
  }, 250);

  // Bank the score+medal the INSTANT a run ends — never wait for the
  // finale/death animation. Otherwise a quit during the ~1s ceremony
  // (ended===true, panel not up yet) would lose the whole run. Idempotent.
  function bankRun() {
    if (mine.banked) return mine.result;
    mine.banked = true;
    const finalScore = mine.score;
    const prevBest = bestFor(worldCls);
    const prevStars = starsFor(worldCls);
    const elapsed = Math.max(12, (Date.now() - mine.openedAt) / 1000);
    const th = spec.stars ?? [5, 10, 16];
    const rate = finalScore / elapsed;
    const stars = rate >= th[2] ? 3 : rate >= th[1] ? 2 : rate >= th[0] ? 1 : 0;
    const isRecord = saveBest(worldCls, finalScore, stars);
    mine.result = { finalScore, prevBest, prevStars, stars, isRecord };
    return mine.result;
  }

  // ——— The two ways a run ends ———
  // TIME: the rest ran out — the celebratory finale (Peggle's law).
  function timerOver() {
    if (active !== mine || mine.phase !== 'playing') return;
    mine.phase = 'over';
    clearInterval(mine.clock);
    mine.clock = null;
    mine.ended = true; // freezes api.score — the run is banked as of TIME
    closeHelp(mine);   // rest ran out while reading? The results win.
    const willRecord = bankRun().isRecord;

    // THE FINALE: before the panel, the canvas detonates — a staggered
    // fireworks volley inside the final slow-mo beat. Wall-clock timers,
    // because scene time is running at 0.3x right now.
    let finaleMs = 0;
    try {
      const scene = mine.game.scene.getScene('play');
      if (scene?.scene.isActive()) {
        finaleMs = 950;
        const W = scene.scale.width, H = scene.scale.height;
        const colors = willRecord ? [0xffd24a, 0xfff0c8, 0x3adcc8, 0xff8ad0] : [0xffd24a, 0xfff0c8, 0x3adcc8];
        for (let i = 0; i < (willRecord ? 9 : 5); i++) {
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
        flash(scene, willRecord ? 0xffd24a : 0xffffff, 200, 0.4);
        zoomPunch(scene, 1.08, 500);
        glyphBanner(scene, willRecord ? 'NEW RECORD' : 'TIME!', '#ffd24a', 38);
        haptic([12, 40, 12, 40, 20]);
      }
    } catch { /* no scene, straight to the panel */ }
    setTimeout(() => presentPanel({ died: false, finaleMs }), finaleMs);
  }

  // DEATH: the player ran out of lives mid-run. The scene reddens and the
  // results come up early — offering a fresh run if the rest still has room.
  function onDeath(cause) {
    if (active !== mine || mine.phase !== 'playing') return;
    mine.phase = 'dead';
    mine.ended = true;
    bankRun(); // bank immediately — a quit during the death beat can't lose it
    closeHelp(mine);
    try {
      const scene = mine.game.scene.getScene('play');
      if (scene?.scene.isActive()) {
        const W = scene.scale.width, H = scene.scale.height;
        flash(scene, 0xff2a1a, 260, 0.55);
        shockRing(scene, W / 2, H / 2, 0xff5d5d, 240);
        zoomPunch(scene, 1.06, 380);
        glyphBanner(scene, cause || 'DOWN', '#ff6a7a', 36);
        haptic([30, 60, 30, 60, 40]);
      }
    } catch { /* no scene */ }
    sfx('log');
    setTimeout(() => presentPanel({ died: true, cause: cause || 'You went down' }), 720);
  }

  function restartRun() {
    el.querySelector('.go-over')?.remove();
    try { mine.game?.destroy(true); } catch { /* race */ }
    mine.game = null;
    // belt-and-suspenders: never leave a stray canvas for the new run to
    // stack behind (a dead canvas on top would eat all the pointer input)
    stage.querySelectorAll('canvas').forEach((c) => c.remove());
    startRun(); // resets score/phase/openedAt and re-boots the scene
    sfx('tap');
    haptic(8);
  }

  // The shared results panel — celebration or defeat, same anatomy.
  function presentPanel({ died = false }) {
    if (active !== mine) return;
    // Pause the scene (freeze) but leave the loop running: Phaser processes
    // game.destroy() ON its loop, so stopping it here would strand the
    // teardown and leak the canvas across a restart. Scoring is already
    // frozen by mine.ended, so a stray hitstop resume can't leak points.
    try { mine.game.scene.pause('play'); } catch { /* already gone */ }
    // the run was already banked at run-end (bankRun) — read, don't re-save,
    // so the medal/record shown matches exactly what was persisted.
    const { finalScore, prevBest, prevStars, stars, isRecord } = bankRun();
    const canRetry = died && (deadline - Date.now()) > 7000;

    const starRow = [1, 2, 3].map((i) =>
      `<span class="${i <= stars ? 'on' : ''}${i <= stars && i > prevStars ? ' fresh' : ''}" style="animation-delay:${0.25 + i * 0.16}s">★</span>`).join('');
    const bestShown = isRecord ? prevBest : Math.max(prevBest, finalScore);
    const bestStars = Math.max(stars, prevStars);
    const eyebrow = died ? 'You went down' : 'Rest complete';
    const title = isRecord ? 'NEW RECORD' : died ? 'Game over' : 'Time’s up';
    el.insertAdjacentHTML('beforeend', `
      <div class="go-over${died ? ' died' : ''}">
        <div class="go-over-eyebrow">${esc(eyebrow)}</div>
        <div class="go-over-title">${title}</div>
        <div class="go-stars">${starRow}</div>
        <div class="go-over-score num" id="go-final">0</div>
        <div class="go-over-best go-best-line">${isRecord ? 'Old best' : 'Best'} <span class="num">${bestShown}</span>${bestStars ? ` · ${'★'.repeat(bestStars)}` : ''} · ${esc(spec.cfg.name)}</div>
        ${canRetry ? '<button class="btn primary go-again" id="go-again">Go again</button>' : ''}
        <button class="btn ${canRetry ? 'quiet' : 'primary'} go-back" id="go-back">Back to work</button>
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
    else if (!died) sfx('objDone');
    // A thumb still mashing must not fire a button the frame it appears.
    const armedAt = Date.now() + 450;
    $('#go-back', el).addEventListener('click', () => { if (Date.now() >= armedAt) closeGame(); });
    $('#go-again', el)?.addEventListener('click', () => { if (Date.now() >= armedAt) restartRun(); });
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

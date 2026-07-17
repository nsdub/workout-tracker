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
import { gameFor, bestFor, starsFor, saveBest, readBests, GAMES } from './registry.js';

// Constant availability check — no game modules needed at boot.
const GAME_UNIVERSES = new Set(['dojo', 'deep', 'park', 'wok', 'atoll', 'yeti']);
export function gameAvailable() {
  return GAME_UNIVERSES.has(document.documentElement.dataset.universe);
}

// A retry (die → "Go again") only makes sense with enough rest left to have
// real pre-finale play. Offer it with a comfortable margin so the button is
// never pulled out from under the thumb the instant it appears.
const RETRY_MIN_MS = 15000;   // below this, a retry is retired
const RETRY_OFFER_MS = 18000; // only offered above this

// Lifetime ledger — the one thing that only ever grows. Every run adds to a
// permanent career total the player watches climb across hundreds of sets.
const LIFE_KEY = 'p3.gameLife';
function readLifetime() {
  try { const v = JSON.parse(localStorage.getItem(LIFE_KEY)); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
function bumpLifetime(scoreAdd) {
  try {
    const v = readLifetime();
    v.runs = (v.runs | 0) + 1;
    v.score = (v.score | 0) + Math.max(0, scoreAdd | 0);
    localStorage.setItem(LIFE_KEY, JSON.stringify(v));
    return v;
  } catch { return {}; }
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

  // QA determinism hook: let a scripted check open a game that times out in a
  // few seconds so the wall-clock cash-out finale is exercisable on demand.
  if (typeof window !== 'undefined' && window.__P3_DEADLINE_MS > 0) {
    deadline = Date.now() + window.__P3_DEADLINE_MS;
  }

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
      <div class="go-badges" id="go-badges" style="position:absolute;left:12px;top:calc(100% + 6px);display:flex;gap:6px;z-index:6;pointer-events:none;font:700 13px/1 var(--mono, 'Geist Mono', monospace)">
        <b id="go-mult" hidden style="padding:2px 9px;border-radius:999px;background:linear-gradient(180deg,#ffd24a,#ff9e2c);color:#3a2400;box-shadow:0 2px 8px rgba(0,0,0,.45)"></b>
        <b id="go-lives" hidden style="padding:2px 9px;border-radius:999px;background:rgba(20,8,12,.72);color:#ff8a9a;letter-spacing:2px;box-shadow:0 2px 8px rgba(0,0,0,.4)"></b>
      </div>
    </header>
    <div class="go-stage" id="go-stage"><div class="go-boot">Loading the game…</div></div>`;
  document.body.appendChild(el);

  // Claim the cabinet immediately so double-taps and re-entries bounce off,
  // then finish booting asynchronously.
  active = { el, game: null, clock: null, score: 0, worldCls, universe, spec, popPushed: false, fever: false, slowed: false, ended: false, helpOpen: false, phase: 'playing', openedAt: Date.now(), totalMs: Math.max(1, deadline - Date.now()), ratePoints: 0, combo: 0, comboAt: 0, livesShown: null, verbSeen: false };
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
  const multEl = $('#go-mult', el);
  const livesEl = $('#go-lives', el);
  const badgesEl = $('#go-badges', el);

  // ——— HUD painting ———
  // Every score delta used to force a synchronous layout (offsetWidth) to
  // restart the bump animation — 20-60 of them in one chain-reaction frame
  // stutters a phone. Coalesce to at most ONE reflow per animation frame.
  let hudRAF = 0, hudNeg = false;
  function currentMult() {
    const cm = mine.combo >= 16 ? 3 : mine.combo >= 6 ? 2 : 1;
    return cm * (mine.fever ? 2 : 1);
  }
  function paintMult() {
    if (!multEl) return;
    const m = currentMult();
    if (m > 1 && mine.phase === 'playing' && !mine.ended) {
      multEl.hidden = false; multEl.textContent = '×' + m;
    } else { multEl.hidden = true; }
  }
  function paintLives() {
    if (!livesEl) return;
    const n = mine.livesShown;
    if (n == null) { livesEl.hidden = true; return; }
    livesEl.hidden = false;
    livesEl.textContent = n > 0 ? '❤'.repeat(Math.min(5, n)) : '💀';
  }
  function hideBadges() { if (badgesEl) badgesEl.style.display = 'none'; }
  function scheduleHudPaint(sign) {
    if (sign < 0) hudNeg = true;
    if (hudRAF) return;
    hudRAF = requestAnimationFrame(() => {
      hudRAF = 0;
      if (active !== mine) { hudNeg = false; return; }
      scoreEl.textContent = mine.score;
      scoreEl.classList.remove('bump', 'sting');
      void scoreEl.offsetWidth; // ONE forced reflow per frame, not per pop
      scoreEl.classList.add(hudNeg ? 'sting' : 'bump');
      hudNeg = false;
      paintMult();
    });
  }

  const api = {
    score(delta) {
      // After a run ends the score is banked: stray hits during the fireworks
      // or death beat can't make the HUD disagree with the panel/saved best.
      if (active !== mine || mine.ended) return mine.score;
      if (delta > 0) {
        // Medals rate on RAW skill points (below): the combo/GOLD RUSH
        // multipliers are a display reward, never a medal shortcut.
        mine.ratePoints = (mine.ratePoints || 0) + delta;
        const now = Date.now();
        if (now - (mine.comboAt || 0) > 1600) mine.combo = 0; // chain decayed
        mine.combo = (mine.combo || 0) + 1;
        mine.comboAt = now;
        const cm = mine.combo >= 16 ? 3 : mine.combo >= 6 ? 2 : 1; // skill combo
        delta *= cm;
        if (mine.fever) delta *= 2; // GOLD RUSH stacks on top of the combo
      } else if (delta < 0) {
        mine.combo = 0; // a miss breaks the chain
      }
      mine.score = Math.max(0, mine.score + delta);
      if (delta !== 0) scheduleHudPaint(delta < 0 ? -1 : 1);
      return mine.score;
    },
    sfx,
    note,
    haptic,
    timeLeft: () => Math.max(0, deadline - Date.now()),
    // 0→1 across THIS run's rest window — a shared, monotonic difficulty
    // signal so a game can ramp itself to the fraction of rest elapsed.
    restProgress: () => Math.max(0, Math.min(1, (Date.now() - mine.openedAt) / (mine.totalMs || 1))),
    // A game reports its remaining lives here; the cabinet paints them in one
    // consistent, always-visible spot instead of each game re-inventing it.
    lives: (n) => {
      mine.livesShown = (typeof n === 'number' && isFinite(n)) ? Math.max(0, Math.floor(n)) : null;
      paintLives();
    },
    // A game calls this when the player runs out of lives — it ends the
    // run early (a real failure state), banks the score, and offers a
    // fresh run if rest remains. `cause` is a short themed word.
    die: (cause) => onDeath(cause),
  };

  // While a game is live, any uncaught page error is treated as the game's:
  // tear the cabinet down rather than risk a wedged fullscreen layer.
  mine.errListener = (e) => fail(e.error ?? e.message);
  window.addEventListener('error', mine.errListener);

  // QA determinism hooks: drive the two run-ending paths on demand without a
  // real death or timeout. Cleared on teardown so a poller can't hit a stale
  // instance. (Mirrors the per-game __P3_GOLD_QA hook.)
  try {
    window.__p3Kill = (cause) => { if (active === mine) onDeath(cause || 'QA KILL'); };
    window.__p3TimeUp = () => { if (active === mine) timerOver(); };
  } catch { /* non-browser */ }

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
        // The verb card teaches the mechanic on the FIRST run only; a "Go
        // again" retry skips it (the player already knows the verb) and plays
        // immediately, so a short retry isn't all teach-card + finale.
        if (spec.verb && !mine.verbSeen) {
          mine.verbSeen = true;
          mine.introLock = true;
          this.input.enabled = false;
          introCard(this, spec.verb, () => {
            mine.introLock = false;
            if (active === mine && mine.phase === 'playing') { try { this.input.enabled = true; } catch { /* gone */ } }
          }, spec.gesture);
        }
      } catch (err) { fail(err); }
    };
    // While the intro card is up, freeze the game's own step so no hazard
    // scrolls in or spawns during the input-locked teach beat (idle law:
    // the player can't lose ground they had no chance to defend).
    cfg2.update = function (t, dt) {
      if (mine.introLock) return;
      try { userUpdate?.call(this, t, dt); } catch (err) { fail(err); }
    };
    return cfg2;
  }

  // Boot (or re-boot) the playfield. Returns false on failure.
  function startRun() {
    let cfg2;
    try { cfg2 = buildSceneCfg(); } catch (err) { fail(err); return false; }
    mine.sceneCfg = cfg2;
    mine.score = 0; scoreEl.textContent = '0';
    mine.ended = false; mine.phase = 'playing'; mine.openedAt = Date.now();
    mine.totalMs = Math.max(1, deadline - mine.openedAt); // this run's rest window
    mine.fever = false; mine.slowed = false; mine.banked = false; mine.result = null;
    mine.ratePoints = 0; mine.combo = 0; mine.comboAt = 0; mine.introLock = false;
    mine.livesShown = null; mine.endSoundPlayed = false;
    timeEl.classList.remove('gold');
    if (badgesEl) badgesEl.style.display = '';
    paintMult(); paintLives();
    // Never hand a poller a stale instance while the new one boots.
    try { if (typeof window !== 'undefined') window.__p3Game = null; } catch { /* ok */ }
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
        input: { activePointers: 1 }, // ONE THUMB — a stray second touch can't hijack
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
  mine.clock = setInterval(() => {
    if (active !== mine) return;
    timeEl.textContent = hudTime(deadline);
    const left = deadline - Date.now();
    const total = mine.totalMs || Math.max(1, deadline - mine.openedAt);
    if (tbar) tbar.style.width = `${Math.max(0, Math.min(100, (left / total) * 100))}%`;
    const scene = () => { try { return mine.game.scene.getScene('play'); } catch { return null; } };
    // combo pill clears once the player stops chaining
    if (mine.combo > 0 && Date.now() - mine.comboAt > 1600) { mine.combo = 0; paintMult(); }
    // opt-in shared difficulty ramp across the whole rest
    if (mine.phase === 'playing' && mine.sceneCfg?.escalate) {
      const s = scene();
      if (s) { try { mine.sceneCfg.escalate(Math.max(0, Math.min(1, (Date.now() - mine.openedAt) / total)), s); } catch { /* opt-in */ } }
    }
    // GOLD RUSH arms on ANY tick inside the final 10s (no lower bound): a
    // coalesced catch-up tick after backgrounding must still trigger the
    // crescendo instead of silently skipping the flagship finale window.
    if (!mine.fever && left <= 10000 && left > 0 && mine.phase === 'playing') {
      mine.fever = true;
      timeEl.classList.add('gold');
      paintMult();
      const s = scene();
      if (s) {
        try {
          const K = Math.min(s.scale.width / 400, s.scale.height / 640) || 1;
          glyphBanner(s, 'GOLD RUSH ×2', '#ffd24a', Math.round(30 * K)); goldRush(s, { duration: left }); mine.sceneCfg?.fever?.(s);
        } catch { /* garnish */ }
      }
      sfx('objDone');
      haptic([12, 30, 12]);
    }
    if (!mine.slowed && left <= 1300 && left > 0 && mine.phase === 'playing') {
      mine.slowed = true;
      const s = scene();
      if (s) { try { slowmo(s, 0.3, 1250); } catch { /* garnish */ } }
    }
    // Once rest can't fit another meaningful retry, retire "Go again" WITHOUT
    // reflowing the panel out from under the thumb: disable it in place and
    // promote "Back to work" to the primary action so there's always a CTA.
    if (left <= RETRY_MIN_MS) {
      const ga = el.querySelector('.go-again');
      if (ga && !ga.dataset.spent) {
        ga.dataset.spent = '1';
        ga.disabled = true;
        ga.textContent = 'Not enough rest left';
        ga.classList.remove('primary'); ga.classList.add('quiet');
        ga.style.opacity = '0.55';
        const gb = el.querySelector('.go-back');
        if (gb) { gb.classList.remove('quiet'); gb.classList.add('primary'); }
      }
    }
    if (left <= 0 && mine.phase === 'playing') timerOver();
  }, 250);

  // Bank the score+medal the INSTANT a run ends — never wait for the
  // finale/death animation. Otherwise a quit during the ~1s ceremony
  // (ended===true, panel not up yet) would lose the whole run. Idempotent.
  function bankRun() {
    if (mine.banked) return mine.result;
    mine.banked = true;
    const finalScore = mine.score;
    const prevStars = starsFor(worldCls); // per-world medal (the collection)
    // Medals rate over THIS run's FULL rest window, not elapsed-since-start:
    // a fast suicidal burst then "Go again", or an early quit right after a
    // lucky spike, can't out-rate a run that sustained skill across the whole
    // rest — and a 60s rest gets no shortcut over a 240s one (same ladder).
    const windowSec = Math.max(12, (mine.totalMs ?? (Date.now() - mine.openedAt)) / 1000);
    const th = spec.stars ?? [5, 10, 16];
    const rate = (mine.ratePoints ?? finalScore) / windowSec;
    const stars = rate >= th[2] ? 3 : rate >= th[1] ? 2 : rate >= th[0] ? 1 : 0;
    // Per-world persistence: this world's own best + medal (the collection
    // ladder the player fills in across all 8 rotating worlds).
    saveBest(worldCls, finalScore, stars);
    // The NEW RECORD ceremony fires against an AGGREGATE per-game ceiling, not
    // the per-world best — otherwise every first visit to a rotating world
    // triggers a hollow "record". Beating this means beating your real high
    // score across every variant of the game.
    const aggKey = 'agg:' + universe;
    const prevBest = bestFor(aggKey);
    const isRecord = saveBest(aggKey, finalScore, stars) && finalScore > 0;
    const lifetime = bumpLifetime(finalScore);
    mine.result = { finalScore, prevBest, prevStars, stars, isRecord, lifetime };
    try { if (typeof window !== 'undefined') window.__p3Result = mine.result; } catch { /* ok */ }
    return mine.result;
  }

  // ——— The two ways a run ends ———
  // TIME: the rest ran out — the celebratory finale (Peggle's law).
  function timerOver() {
    if (active !== mine || mine.phase !== 'playing') return;
    mine.phase = 'over';
    clearInterval(mine.clock);
    mine.clock = null;
    hideBadges();
    // Give a game one last beat to resolve in-flight, travel-to-score payoff
    // (a stone still skipping, a dumpling mid-drop) while scoring is OPEN.
    try {
      const s0 = mine.game.scene.getScene('play');
      if (s0) mine.sceneCfg?.timeUp?.(s0);
    } catch { /* opt-in */ }
    mine.ended = true; // freezes api.score — the run is banked as of TIME
    closeHelp(mine);   // rest ran out while reading? The results win.
    const willRecord = bankRun().isRecord && mine.score > 0;

    // THE FINALE: before the panel, the canvas detonates — a staggered
    // fireworks volley inside the final slow-mo beat. Wall-clock timers,
    // because scene time is running at 0.3x right now.
    let finaleMs = 0;
    try {
      const scene = mine.game.scene.getScene('play');
      if (scene) {
        // The ceremony must play even if a fatal hitstop or the help card
        // left the scene paused — resume it so the finale actually animates
        // (otherwise the flagship moment is a silent no-op).
        try { mine.game.scene.resume('play'); } catch { /* fine */ }
        const W = scene.scale.width, H = scene.scale.height;
        const K = Math.min(W / 400, H / 640) || 1; // match the in-game scale
        const nBursts = willRecord ? 9 : 5;
        // Cover the whole volley so the last (biggest, record-case) bursts
        // are created while the scene is still live, not after it freezes.
        finaleMs = (nBursts - 1) * 130 + 340;
        // Per-world cash-out: each world detonates in its OWN accent colors.
        const acc = spec.cfg.accent ?? 0xffd24a;
        const acc2 = spec.cfg.blade ?? 0xfff0c8;
        const colors = willRecord ? [acc, acc2, 0x3adcc8, 0xff8ad0] : [acc, acc2, 0x3adcc8];
        // The impact SOUND lands with the first flash — not ~1s later behind
        // the results panel.
        sfx(willRecord ? 'pr' : 'objDone');
        mine.endSoundPlayed = true;
        for (let i = 0; i < nBursts; i++) {
          setTimeout(() => {
            if (active !== mine) return;
            try {
              // World-space bursts must land in the VISIBLE band: a scrolling
              // world (park skims sideways) has a nonzero camera scroll, so a
              // fixed screen fraction alone would detonate off-screen. Offset
              // by the live scroll; still-cameras read 0 and are unaffected.
              const cam = scene.cameras.main;
              const x = (cam?.scrollX || 0) + W * (0.15 + Math.random() * 0.7);
              const y = (cam?.scrollY || 0) + H * (0.12 + Math.random() * 0.5);
              const tint = colors[i % colors.length];
              burst(scene, x, y, tint, { n: 26, speed: 460 * K, scale: 0.7 * K, life: 900 });
              shockRing(scene, x, y, tint, 130 * K);
              if (i > 0) sfx('objDone'); // each firework pops
            } catch { /* scene gone */ }
          }, i * 130);
        }
        flash(scene, willRecord ? acc : 0xffffff, 200, 0.4);
        zoomPunch(scene, 1.08, 500);
        glyphBanner(scene, willRecord ? 'NEW RECORD' : 'TIME!', `#${(willRecord ? acc : 0xffd24a).toString(16).padStart(6, '0')}`, Math.round(38 * K));
        // let a world author its own extra finale flourish on top
        try { mine.sceneCfg?.finale?.(scene, { willRecord, K }); } catch { /* garnish */ }
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
    mine.combo = 0;
    hideBadges();
    bankRun(); // bank immediately — a quit during the death beat can't lose it
    closeHelp(mine);
    try {
      const scene = mine.game.scene.getScene('play');
      if (scene) {
        // Resume first: the fatal hit's hitstop() commonly has the scene
        // paused right now, which would silently skip the death ceremony.
        try { mine.game.scene.resume('play'); } catch { /* fine */ }
        const W = scene.scale.width, H = scene.scale.height;
        const K = Math.min(W / 400, H / 640) || 1;
        flash(scene, 0xff2a1a, 260, 0.55);
        shockRing(scene, W / 2, H / 2, 0xff5d5d, 240 * K);
        zoomPunch(scene, 1.06, 380);
        glyphBanner(scene, cause || 'DOWN', '#ff6a7a', Math.round(36 * K));
        haptic([30, 60, 30, 60, 40]);
      }
    } catch { /* no scene */ }
    sfx('log');
    mine.endSoundPlayed = true;
    setTimeout(() => presentPanel({ died: true, cause: cause || 'You went down' }), 720);
  }

  function restartRun() {
    el.querySelector('.go-over')?.remove();
    try { mine.game?.destroy(true); } catch { /* race */ }
    mine.game = null;
    try { if (typeof window !== 'undefined') window.__p3Game = null; } catch { /* ok */ }
    // belt-and-suspenders: never leave a stray canvas for the new run to
    // stack behind (a dead canvas on top would eat all the pointer input and
    // leak a WebGL context per restart)
    stage.querySelectorAll('canvas').forEach((c) => c.remove());
    startRun(); // resets score/phase/openedAt and re-boots the scene
    sfx('tap');
    haptic(8);
  }

  // The shared results panel — celebration or defeat, same anatomy.
  function presentPanel({ died = false, cause = '', finaleMs = 0 }) {
    if (active !== mine) return;
    // Pause the scene (freeze) but leave the loop running: Phaser processes
    // game.destroy() ON its loop, so stopping it here would strand the
    // teardown and leak the canvas across a restart. Scoring is already
    // frozen by mine.ended, so a stray hitstop resume can't leak points.
    try { mine.game.scene.pause('play'); } catch { /* already gone */ }
    // the run was already banked at run-end (bankRun) — read, don't re-save,
    // so the medal/record shown matches exactly what was persisted.
    const { finalScore, prevBest, prevStars, stars, isRecord } = bankRun();
    // A failed run is NOT a personal best ceremony: a death banks its score
    // honestly (arcade high scores stand) but never triggers the NEW RECORD
    // fanfare — failure must not out-trophy a completed, mastered run.
    const celebrate = isRecord && !died && finalScore > 0;
    // Climbing the star ladder is the real mastery milestone — celebrate it
    // in its OWN right, even when the score record wasn't beaten.
    const medalUp = stars > prevStars && stars > 0;
    const canRetry = died && (deadline - Date.now()) > RETRY_OFFER_MS;

    const starRow = [1, 2, 3].map((i) =>
      `<span class="${i <= stars ? 'on' : ''}${i <= stars && i > prevStars ? ' fresh' : ''}" style="animation-delay:${0.25 + i * 0.16}s">★</span>`).join('');
    const bestShown = Math.max(prevBest, finalScore);
    const bestStars = Math.max(stars, prevStars);
    const medalName = stars === 3 ? 'MASTERED' : 'NEW MEDAL';
    const eyebrow = died ? (cause || 'You went down') : celebrate ? 'Personal best' : medalUp ? 'Medal earned' : 'Rest complete';
    const title = died ? 'Game over' : celebrate ? 'NEW RECORD' : medalUp ? medalName : 'Time’s up';

    // Collection pressure: mastering one world visibly advances a set the
    // player wants to complete, instead of being a dead end.
    let collLine = '';
    try {
      const worlds = Object.keys(GAMES[universe]?.WORLDS ?? {});
      if (worlds.length) {
        const bests = readBests();
        const mastered = worlds.filter((w) => (bests[w]?.st ?? 0) >= 3).length;
        collLine = `${mastered}/${worlds.length} worlds mastered`;
      }
    } catch { /* no collection line */ }
    const life = readLifetime();
    const lifeLine = life.runs ? `${life.runs} games played · ${life.score ?? 0} lifetime pts` : '';

    el.insertAdjacentHTML('beforeend', `
      <div class="go-over${died ? ' died' : ''}${medalUp && !died ? ' medal' : ''}">
        <div class="go-over-eyebrow">${esc(eyebrow)}</div>
        <div class="go-over-title">${esc(title)}</div>
        <div class="go-stars">${starRow}</div>
        <div class="go-over-score num" id="go-final" data-final="${finalScore}">0</div>
        <div class="go-over-best go-best-line">${celebrate ? 'Old best' : 'Best'} <span class="num">${celebrate ? prevBest : bestShown}</span>${bestStars ? ` · ${'★'.repeat(bestStars)}` : ''} · ${esc(spec.title)}</div>
        ${collLine ? `<div class="go-over-best go-coll-line">${esc(collLine)}</div>` : ''}
        ${lifeLine ? `<div class="go-over-best go-life-line">${esc(lifeLine)}</div>` : ''}
        ${canRetry ? '<button class="btn primary go-again" id="go-again">Go again</button>' : ''}
        <button class="btn ${canRetry ? 'quiet' : 'primary'} go-back" id="go-back">Back to work</button>
      </div>`);
    // the score counts up — earned, not stated. The TRUE value lives in the
    // data-final attribute so a throttled-RAF QA env has a frame-independent
    // source of truth even before the count-up runs.
    const finalEl = $('#go-final', el);
    const t0 = performance.now();
    const tick = () => {
      if (!finalEl.isConnected) return;
      const f = Math.min(1, (performance.now() - t0) / 900);
      finalEl.textContent = Math.round(finalScore * (1 - Math.pow(1 - f, 3)));
      if (f < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // Sound: the finale/death already made the primary impact sound at the
    // moment it happened. Here we only cover the no-finale fallback (help
    // card open at TIME, or no scene) and the distinct mastery (medal) chime.
    if (!died && !mine.endSoundPlayed) sfx(celebrate ? 'pr' : 'objDone');
    if (medalUp) { sfx('finish'); haptic([15, 50, 25, 50, 30]); }
    else if (celebrate && !mine.endSoundPlayed) haptic([15, 40, 25]);
    // A thumb still mashing must not fire a button the frame it appears.
    const armedAt = Date.now() + 450;
    $('#go-back', el).addEventListener('click', () => { if (Date.now() >= armedAt) closeGame(); });
    $('#go-again', el)?.addEventListener('click', () => { if (Date.now() >= armedAt) restartRun(); });
  }
}

export function closeGame(fromPop = false) {
  if (!active) return;
  const { el, game, clock, popPushed, errListener, ended, score, ratePoints, worldCls, universe, spec, totalMs, openedAt } = active;
  active = null;
  // Clear QA hooks so a poller can't drive/inspect a destroyed instance.
  try {
    if (typeof window !== 'undefined') { window.__p3Game = null; window.__p3Kill = null; window.__p3TimeUp = null; }
  } catch { /* ok */ }
  if (clock) clearInterval(clock);
  if (errListener) window.removeEventListener('error', errListener);
  // Quitting mid-game still banks the run, silently — checking the next
  // exercise never costs the points already earned. Full runs keep the
  // ceremony; this is bookkeeping only (SAME rate-based medal ladder as
  // bankRun: raw points over the full rest window, so a quit can't inflate).
  if (!ended && score > 0) {
    try {
      const windowSec = Math.max(12, (totalMs ?? (Date.now() - openedAt)) / 1000);
      const th = spec.stars ?? [5, 10, 16];
      const rate = (ratePoints ?? score) / windowSec;
      const qStars = rate >= th[2] ? 3 : rate >= th[1] ? 2 : rate >= th[0] ? 1 : 0;
      saveBest(worldCls, score, qStars);
      if (universe) saveBest('agg:' + universe, score, qStars); // keep the game-level ceiling current
      bumpLifetime(score);
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
        <p>Chain scores without missing to build a combo multiplier — your points climb faster.</p>
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

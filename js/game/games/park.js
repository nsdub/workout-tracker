// SKIP LEGEND — The National Park. Drag back, release, and skip a stone
// across a mile of postcard lake (the camera chases it). Entry angle and
// speed honestly decide the skim: come in shallow and fast and the stone
// sings — every skip rings one pentatonic step higher and pays more.
// Near-missing the locals (ducks, buoys, canoes) is worth points; hitting
// them ends the throw with an offended honk. The lake is alive, and on a
// truly legendary throw it plays for your team.
import {
  ensureFx, canvasTex, burst, shockRing, floatScore, banner, glyphBanner,
  shake, flash, slowmo, zoomPunch, collectTo, paintSky, ambientMotes,
  bloomCamera, vignette, squash, unit,
  celestial, driftClouds,
} from '../fx.js';

export const TITLE = 'Skip Legend';
export const VERB = 'SKIP!';
export const GESTURE = 'Pull back, release';
// Per-second rate for the hydroplane-era economy: a skim's hop flattens out
// after a few skips and the stone slides into a distance-only run-out, so no
// single memorized throw can machine-gun the bar. Sloppy lobs bank distance
// (~1 star); three stars is sustained flat clean chains threaded through
// grazes, rings and full crossings, throw after throw.
export const STARS = [6, 14, 22];

export const HELP = {
  goal: 'Skip a stone as far across the lake as you can, throw after throw.',
  how: 'Pull back with your thumb and release to send the stone (a forward swipe is ignored — the stone only listens to a real pull). Fast and shallow skims; a perfectly flat entry is a clean skip that pays half again more — and the lake demands a flatter line the longer you play. When the hops flatten out completely the stone hydroplanes: it slides on, banking distance, but the skipping is done. Passing close to ducks, buoys and canoes earns a graze bonus, and reaching the far shore is the big one. In the bog, open water ALWAYS sinks the stone: land only on the turtle shells (they are pads, never a hit).',
  avoid: 'A sunk stone tells you why — TOO STEEP means flatten your pull, TOO SLOW means pull harder. Diving down into a duck, buoy or canoe scares the local off and costs a life; a low skimming plow or a glancing clip only ends the throw, and an arrow at the screen edge warns you what is floating ahead. Scare off three locals and the day is over.',
};

export const WORLDS = {
  'park-trail': {
    name: 'Trailhead Lake', sky: [[0, '#7ac8ec'], [0.55, '#b8e0f0'], [1, '#ffe9b3']],
    accent: 0x3a8fd9, water: 0x2c6a9c, floats: ['duck', 'buoy'], density: 1,
  },
  'park-marina': {
    name: 'Marina Slalom', sky: [[0, '#5cb8ff'], [0.6, '#a8d8f0'], [1, '#ffd98a']],
    accent: 0xff7a4c, water: 0x24608f, floats: ['canoe', 'buoy', 'duck'], density: 2.2,
  },
  'park-bog': {
    name: 'The Grumbling Bog', sky: [[0, '#3c5c3a'], [0.6, '#6a8a58'], [1, '#c8d49a']],
    accent: 0x7ad48a, water: 0x2c4028, floats: ['turtle'], bog: true, density: 1.4,
  },
  'park-mothman': {
    name: 'Mothman Point', sky: [[0, '#0c1030'], [0.55, '#28204e'], [1, '#5c3a68']],
    accent: 0xffd24a, water: 0x141c3c, floats: ['buoy'], night: true, rings: true, cryptid: true, density: 0.8,
  },
  'park-ufo': {
    name: 'Abduction Shores', sky: [[0, '#101430'], [0.55, '#2c2456'], [1, '#6a4a8c']],
    accent: 0x7dffb3, water: 0x1a2044, floats: ['duck', 'buoy'], night: true, beams: true, density: 1,
  },
  'park-meadow': {
    name: 'Bison Ford', sky: [[0, '#8ac8e8'], [0.6, '#c8e4d8'], [1, '#ffe0a0']],
    accent: 0x8a5c3a, water: 0x3a7a8c, floats: ['bison', 'duck'], bouncepads: true, density: 1.1,
  },
  'park-tower': {
    name: 'Big-Sky Drop', sky: [[0, '#4c8fd9'], [0.6, '#9cc8ec'], [1, '#ffd98a']],
    accent: 0xffb46c, water: 0x2c6a9c, floats: ['buoy', 'canoe'], cliff: true, wind: true, density: 1,
  },
  'park-canyon': {
    name: 'Canyon Ricochet', sky: [[0, '#c2452e'], [0.55, '#e8975c'], [1, '#ffd98a']],
    accent: 0xff9a5c, water: 0x3a5c7c, floats: ['buoy'], walls: true, density: 1,
  },
};

const PAINT = {
  stone(c, w, h) {
    const g = c.createRadialGradient(w * 0.4, h * 0.4, 1, w / 2, h / 2, w * 0.55);
    g.addColorStop(0, '#b8c2cc'); g.addColorStop(1, '#68727e');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.46, h * 0.4, 0, 0, 7); c.fill();
    c.fillStyle = '#2c3238';
    c.beginPath(); c.arc(w * 0.38, h * 0.42, w * 0.05, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.6, h * 0.42, w * 0.05, 0, 7); c.fill();
    c.strokeStyle = '#2c3238'; c.lineWidth = w * 0.04; c.lineCap = 'round';
    c.beginPath(); c.arc(w * 0.49, h * 0.5, w * 0.12, 0.5, 2.6); c.stroke();
  },
  duck(c, w, h) {
    c.fillStyle = '#f2e84c';
    c.beginPath(); c.ellipse(w * 0.45, h * 0.62, w * 0.34, h * 0.26, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.72, h * 0.34, w * 0.16, 0, 7); c.fill();
    c.fillStyle = '#ff8a3c';
    c.beginPath(); c.moveTo(w * 0.86, h * 0.32); c.lineTo(w * 0.99, h * 0.38); c.lineTo(w * 0.86, h * 0.44); c.closePath(); c.fill();
    c.fillStyle = '#1c1208';
    c.beginPath(); c.arc(w * 0.76, h * 0.3, w * 0.035, 0, 7); c.fill();
    c.fillStyle = '#e0d040';
    c.beginPath(); c.ellipse(w * 0.34, h * 0.5, w * 0.14, h * 0.1, -0.5, 0, 7); c.fill();
  },
  buoy(c, w, h) {
    c.fillStyle = '#e8543c';
    c.beginPath(); c.moveTo(w * 0.5, h * 0.04); c.lineTo(w * 0.78, h * 0.8); c.lineTo(w * 0.22, h * 0.8); c.closePath(); c.fill();
    c.fillStyle = '#fff3e0';
    c.fillRect(w * 0.3, h * 0.34, w * 0.4, h * 0.14);
    c.fillStyle = '#ffd24a';
    c.beginPath(); c.arc(w * 0.5, h * 0.08, w * 0.08, 0, 7); c.fill();
  },
  canoe(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#a8542c'); g.addColorStop(1, '#6a3418');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(w * 0.02, h * 0.3); c.quadraticCurveTo(w * 0.5, h * 1.1, w * 0.98, h * 0.3);
    c.quadraticCurveTo(w * 0.5, h * 0.55, w * 0.02, h * 0.3);
    c.fill();
    c.strokeStyle = '#4a2410'; c.lineWidth = h * 0.06;
    c.beginPath(); c.moveTo(w * 0.14, h * 0.38); c.quadraticCurveTo(w * 0.5, h * 0.72, w * 0.86, h * 0.38); c.stroke();
  },
  turtle(c, w, h) {
    // a warm-lit pad glow so the shell reads against dark-green bog water
    c.fillStyle = 'rgba(255,232,140,.16)';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.6, w * 0.46, h * 0.34, 0, 0, 7); c.fill();
    c.fillStyle = '#4a6a2c';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.55, w * 0.36, h * 0.3, 0, 0, 7); c.fill();
    c.fillStyle = '#7aa845';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.5, w * 0.28, h * 0.22, 0, 0, 7); c.fill();
    // amber shell rim — high contrast so the target pops on sight
    c.strokeStyle = '#f0c05a'; c.lineWidth = w * 0.055;
    c.beginPath(); c.ellipse(w * 0.5, h * 0.55, w * 0.36, h * 0.3, 0, 0, 7); c.stroke();
    c.strokeStyle = '#3a5220'; c.lineWidth = w * 0.03;
    c.beginPath(); c.moveTo(w * 0.36, h * 0.36); c.lineTo(w * 0.64, h * 0.64); c.moveTo(w * 0.64, h * 0.36); c.lineTo(w * 0.36, h * 0.64); c.stroke();
    // specular highlight
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.ellipse(w * 0.4, h * 0.44, w * 0.08, h * 0.05, -0.5, 0, 7); c.fill();
    c.fillStyle = '#5c7a34';
    c.beginPath(); c.arc(w * 0.86, h * 0.42, w * 0.1, 0, 7); c.fill();
    c.fillStyle = '#1c1208';
    c.beginPath(); c.arc(w * 0.89, h * 0.4, w * 0.03, 0, 7); c.fill();
  },
  bison(c, w, h) {
    c.fillStyle = '#4a3020';
    c.beginPath(); c.ellipse(w * 0.45, h * 0.5, w * 0.4, h * 0.34, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.82, h * 0.44, w * 0.16, 0, 7); c.fill();
    c.fillStyle = '#32200e';
    c.beginPath(); c.ellipse(w * 0.36, h * 0.32, w * 0.26, h * 0.18, 0, 0, 7); c.fill();
    c.fillStyle = '#e8d5ae';
    c.beginPath(); c.moveTo(w * 0.9, h * 0.3); c.quadraticCurveTo(w * 0.98, h * 0.22, w * 0.94, h * 0.14); c.lineTo(w * 0.9, h * 0.24); c.closePath(); c.fill();
    c.fillStyle = '#1c1208';
    c.beginPath(); c.arc(w * 0.84, h * 0.4, w * 0.035, 0, 7); c.fill();
  },
  ranger(c, w, h) {
    c.fillStyle = '#3a5c40';
    c.fillRect(w * 0.3, h * 0.42, w * 0.4, h * 0.5);
    // legs and a raised throwing arm — he is the player, not a fence post
    c.fillStyle = '#2c4430';
    c.fillRect(w * 0.34, h * 0.78, w * 0.12, h * 0.2);
    c.fillRect(w * 0.54, h * 0.78, w * 0.12, h * 0.2);
    c.strokeStyle = '#e8b088'; c.lineWidth = w * 0.11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.64, h * 0.5); c.quadraticCurveTo(w * 0.86, h * 0.38, w * 0.94, h * 0.22); c.stroke();
    c.beginPath(); c.moveTo(w * 0.36, h * 0.5); c.lineTo(w * 0.24, h * 0.66); c.stroke();
    c.fillStyle = '#e8b088';
    c.beginPath(); c.arc(w * 0.5, h * 0.3, w * 0.2, 0, 7); c.fill();
    c.fillStyle = '#6a4a2a';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.18, w * 0.3, h * 0.07, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.5, h * 0.14, w * 0.16, Math.PI, 0); c.fill();
    c.fillStyle = '#1c1208';
    c.beginPath(); c.arc(w * 0.43, h * 0.28, w * 0.03, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.57, h * 0.28, w * 0.03, 0, 7); c.fill();
  },
  dragonfly(c, w, h) {
    c.fillStyle = 'rgba(255,240,200,.85)';
    for (const [rot, oy] of [[-0.5, -0.14], [0.5, 0.14]]) {
      c.beginPath(); c.ellipse(w * 0.36, h * (0.5 + oy), w * 0.3, h * 0.12, rot, 0, 7); c.fill();
      c.beginPath(); c.ellipse(w * 0.64, h * (0.5 + oy), w * 0.3, h * 0.12, -rot, 0, 7); c.fill();
    }
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#ffe9a0'); g.addColorStop(1, '#c8892c');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(w * 0.5, h * 0.5, w * 0.34, h * 0.08, 0, 0, 7); c.fill();
    c.fillStyle = '#5c3408';
    c.beginPath(); c.arc(w * 0.82, h * 0.5, w * 0.07, 0, 7); c.fill();
  },
  moth(c, w, h) {
    c.fillStyle = 'rgba(30,20,50,.9)';
    c.beginPath(); c.ellipse(w / 2, h * 0.55, w * 0.1, h * 0.3, 0, 0, 7); c.fill();
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(w / 2, h * 0.4);
      c.quadraticCurveTo(w * (0.5 + s * 0.42), h * 0.1, w * (0.5 + s * 0.46), h * 0.5);
      c.quadraticCurveTo(w * (0.5 + s * 0.3), h * 0.6, w / 2, h * 0.55);
      c.fill();
    }
    c.fillStyle = '#ff4a4a';
    c.beginPath(); c.arc(w * 0.44, h * 0.32, w * 0.045, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.56, h * 0.32, w * 0.045, 0, 7); c.fill();
  },
};

const FLOAT_W = { duck: 46, buoy: 36, canoe: 90, turtle: 56, bison: 110 };
const FLOAT_H = { duck: 34, buoy: 52, canoe: 34, turtle: 36, bison: 72 };

export function create(P, ctx) {
  const { api, cfg } = ctx;
  // 3 screens: a max flat skim-run (hops + hydroplane run-out) genuinely
  // reaches the far shore, so ACROSS THE LAKE is a climax a great throw can
  // earn in every world — not a mirage only the gimmick worlds could touch.
  // But only a throw that WORKED the surface may claim it: the crossing gate
  // below requires skips or a hydroplane, so a memorized max lob that clears
  // the line mid-air pays nothing but its distance.
  const WORLD_SCREENS = 3;
  let stone = null;          // { img, vx, vy, skips, dist, dead }
  let aiming = false;
  let aimAt = null;
  let aimGfx, waterGfx;
  let floats = [];           // { img, kind, x, w, grazed, vx }
  let rings = [];            // firefly bonus rings { img, x, y, hit }
  let beams = [];            // ufo beams { x, gfx }
  let throwsLeft = Infinity; // score chase, not ammo
  let fever = false;
  // three throws' worth of goodwill: scaring a local off square-on spends
  // one, at zero the locals have had enough and the day ends. A clean sink
  // never costs a life — only a direct hit does.
  let dead = false;
  let lives = 3;
  let livesGfx;
  let mothAt = -Infinity;    // the cryptid rests 40s between assists
  let noteStep = 0;
  let golden = null; // { img, halo }
  let goldenAt = 0;
  const goldDelay = () => (window.__P3_GOLD_QA ? 2500 : 12000 + Math.random() * 18000);
  let t0 = 0;                 // rest-elapsed clock — drives the difficulty ramp
  let streak = 0;            // cross-throw build: good throws in a row
  let resetTimer = null;     // pending between-throw re-arm (a tap skips the wait)
  let windGfx = null;        // pinned wind indicator (wind worlds only)
  let warnGfx = null;        // pinned edge arrow: a local floats just offscreen
  let livesLabel = null;     // caption under the goodwill hearts
  let livesLostAt = -Infinity, lifeSpentI = -1; // pulse the spent pip on loss
  let hudTotal = 0;          // mirror of the cabinet's displayed score
  // 0 → 1 over the first ~150s of a rest; late throws must be flatter & faster
  const rampNow = (scene) => Math.min(1, Math.max(0, (scene.time.now - t0) / 150000));

  // Every popup prints what the HUD actually gained. api.score applies the
  // cabinet's combo/GOLD RUSH multipliers and returns the new total, so the
  // delta against our mirror IS the applied value — the world and the counter
  // finally tell the same story. After TIME the cabinet freezes the score and
  // applied reads 0: callers skip their popup then, so the finale can't print
  // points the scoreboard never banked (the old raw-gain fallback did).
  function scoreApplied(gain) {
    const total = api.score(gain);
    const applied = total - hudTotal;
    hudTotal = total;
    return applied;
  }

  const waterY = (scene) => scene.scale.height * (cfg.cliff ? 0.72 : 0.62);
  const throwerY = (scene) => cfg.cliff ? scene.scale.height * 0.3 : waterY(scene) - 40 * unit(scene);
  const anchor = (scene) => ({ x: 60 * unit(scene), y: throwerY(scene) });

  function resetStone(scene, K) {
    const a = anchor(scene);
    stone = {
      img: scene.add.image(a.x, a.y, canvasTex(scene, 'pk-stone', 30 * K, 24 * K, PAINT.stone)).setDepth(20),
      vx: 0, vy: 0, skips: 0, flying: false, dead: false, sunkAt: 0,
      banked: 0, chain: 0, lostLife: false, banks: 0,
      hydro: false, warned: false,      // run-out state + one honk per throw
      windDrift: 0, driftV: 0,          // position the WIND owns, not the player
    };
    scene.cameras.main.pan(scene.scale.width / 2, scene.scale.height / 2, 320, 'Sine.easeInOut');
    noteStep = 0;
    // every throw is a fresh slalom: grazes and firefly rings re-arm, so
    // the lake pays for precision on throw twelve like it did on throw one.
    // A rested local also forgets one claim, so grazing stays worth aiming at
    // instead of decaying to pocket change by throw five.
    for (const f of floats) { f.grazed = false; f.grazeClaims = Math.max(0, (f.grazeClaims || 0) - 1); }
    for (const r of rings) {
      if (!r.hit) continue;
      r.hit = false;
      r.img.setTint(0xffd24a);
    }
  }

  // Distance caps at 50 (was a flat ~60 that any full-power throw maxed) and
  // is banked continuously below, so it scales with how far you actually got.
  const distPtsFor = (scene, x) =>
    Math.floor(Math.max(0, Math.min(1, x / (scene.scale.width * WORLD_SCREENS))) * 50);

  // Credit the positive distance delta every frame the stone advances. The
  // rest's hard stop is a cash-out (overlay freezes api.score at TIME), so
  // banking as-we-go means an in-flight throw's distance is already counted.
  function bankDistance(scene) {
    if (!stone || stone.dead) return;
    const dp = distPtsFor(scene, stone.img.x);
    if (dp > stone.banked) { scoreApplied(dp - stone.banked); stone.banked = dp; }
  }

  function endThrow(scene, K, reason) {
    if (!stone || stone.dead) return;
    bankDistance(scene);            // flush the last increment before freezing it
    stone.dead = true;
    const distPts = stone.banked;
    const msg = reason === 'end' ? `SHORE! +${distPts}` : `${distPts} distance`;
    floatScore(scene, stone.img.x, waterY(scene) - 60 * K, msg, '#ffd24a', 18 * K);
    if (stone.skips >= 6) glyphBanner(scene, `${stone.skips} SKIPS`, '#ffd24a', 30 * K);
    // cross-throw arc: a crossing or a real skip run extends the streak; a
    // scared local or an early plunk resets it, so the run has something to
    // protect and chase instead of resetting to identical potential each time.
    const good = !stone.lostLife && (reason === 'end' || stone.skips >= 4);
    if (good) {
      streak++;
      if (streak >= 2) glyphBanner(scene, `${streak} IN A ROW`, '#3adcc8', 22 * K);
    } else {
      streak = 0;
    }
    const dead = stone;
    scene.tweens.add({ targets: dead.img, alpha: 0, y: dead.img.y + 30 * K, duration: 600, onComplete: () => dead.img.destroy() });
    resetTimer = scene.time.delayedCall(360, () => { resetTimer = null; resetStone(scene, K); });
  }

  function skipAt(scene, K, x, clean) {
    const wy = waterY(scene);
    shockRing(scene, x, wy, clean ? 0xfff0c8 : 0xdff6ff, (46 + stone.skips * 7) * K);
    burst(scene, x, wy - 4 * K, 0xbfe8f8, { n: clean ? 16 : 10, speed: 200 * K, scale: 0.4 * K, gravityY: 500 * K });
    api.note(noteStep++);
    stone.skips++;
    // a razor-flat entry is the connoisseur's skip: half again the points.
    // the per-skip climb soft-caps at skip 7 so one endless throw can't farm
    // the medal; a cross-throw streak adds a modest, skill-earned multiplier.
    let gain = 8 + Math.min(stone.skips, 7) * 4;
    if (clean) gain = Math.round(gain * 1.5);
    gain = Math.round(gain * (1 + Math.min(streak, 5) * 0.08));
    const paid = scoreApplied(gain);
    if (paid) floatScore(scene, x, wy - 40 * K, clean ? `CLEAN ×${stone.skips} +${paid}` : `skip ×${stone.skips} +${paid}`,
      clean ? '#fff0c8' : '#dff6ff', (clean ? 17 : 15) * K);
    api.haptic(6);
  }

  // A sunk stone names its killer: TOO STEEP means flatten the pull, TOO SLOW
  // means pull harder, OPEN WATER means you missed the shells. Opposite
  // corrections deserve opposite feedback — 'plunk' taught nothing. Collision
  // ends pass false: their branch already said what happened.
  function plunk(scene, K, reason) {
    const wy = waterY(scene);
    burst(scene, stone.img.x, wy, 0x9cc8ec, { n: 18, speed: 300 * K, scale: 0.55 * K, gravityY: 700 * K });
    if (reason !== false) floatScore(scene, stone.img.x, wy - 30 * K, reason || 'plunk', '#8a9ac8', 15 * K);
    api.sfx('log');
    endThrow(scene, K, 'plunk');
  }

  function loseLife(scene, K, x, cause) {
    if (dead) return;
    lives = Math.max(0, lives - 1);
    lifeSpentI = lives;               // the pip that just went dark
    livesLostAt = scene.time.now;     // pulse it on the HUD so the loss registers
    if (stone) stone.lostLife = true;
    streak = 0;                       // scaring a local breaks the run
    // lift the callout well above the honk/plunk cluster so it isn't buried
    floatScore(scene, x, waterY(scene) - 116 * K, lives > 0 ? `${lives} GOODWILL LEFT` : 'SCARED OFF', '#ff5d7a', 17 * K);
    api.lives(lives); // the cabinet badge stays the canonical count
    api.haptic([18, 40, 18]);
    if (lives <= 0) { dead = true; api.die?.(cause); }
  }

  // three GOODWILL hearts, top-right, pinned to the screen (the lake scrolls;
  // the HUD does not). Hearts — not stones — so they never read as ammo. A
  // spent heart goes dark, and pulses red the instant it is lost.
  function drawLives(scene, K) {
    const W = scene.scale.width;
    livesGfx.clear();
    const gap = 22 * K, r = 8 * K, x0 = W - 16 * K - gap * 2, y = 18 * K;
    const now = scene.time.now;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * gap, full = i < lives;
      if (i === lifeSpentI && now - livesLostAt < 460) {
        const p = 1 - (now - livesLostAt) / 460;
        livesGfx.lineStyle(2.4 * K, 0xff5d7a, p);
        livesGfx.strokeCircle(x, y, r * (1.5 + (1 - p) * 1.3));
      }
      const col = full ? 0xff6a7a : 0x3a2530, a = full ? 0.96 : 0.55;
      const s = r;
      livesGfx.fillStyle(col, a);
      livesGfx.fillCircle(x - s * 0.42, y - s * 0.2, s * 0.52);
      livesGfx.fillCircle(x + s * 0.42, y - s * 0.2, s * 0.52);
      livesGfx.fillTriangle(x - s * 0.9, y + s * 0.02, x + s * 0.9, y + s * 0.02, x, y + s * 1.02);
      livesGfx.lineStyle(1.4 * K, full ? 0xffd0d8 : 0x68727e, full ? 0.9 : 0.4);
      livesGfx.strokeCircle(x - s * 0.42, y - s * 0.2, s * 0.52);
      livesGfx.strokeCircle(x + s * 0.42, y - s * 0.2, s * 0.52);
    }
  }

  return {
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },

    fever() { fever = true; },

    create() {
      const scene = this;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      const WW = W * WORLD_SCREENS;
      ensureFx(scene);
      scene.cameras.main.setBounds(0, 0, WW, H);
      paintSky(scene, cfg.sky).setScrollFactor(0);
      bloomCamera(scene);
      vignette(scene, 0.35, 0.8);

      // painted lakeside panorama, three depths of parallax
      const PW = Math.ceil(W * 1.8);
      const dayR = cfg.night ? null : ['rgba(90,140,120,.55)', 'rgba(58,105,88,.8)', 'rgba(34,70,60,.95)'];
      const nightR = ['rgba(52,42,96,.55)', 'rgba(34,28,70,.8)', 'rgba(18,16,44,.95)'];
      const ridgeCols = dayR ?? nightR;
      canvasTex(scene, 'pk-pano', PW, H, (c) => {
        const jag = [0.5, 0.9, 0.62, 1, 0.45, 0.8, 0.7, 0.95, 0.55, 0.85];
        ridgeCols.forEach((col, ri) => {
          const base = H * (0.42 + ri * 0.05);
          const amp = H * (0.13 - ri * 0.03);
          c.fillStyle = col;
          c.beginPath();
          c.moveTo(0, base);
          const n = 6 + ri * 2;
          for (let i = 0; i <= n; i++) {
            c.lineTo(PW * i / n, base - amp * jag[(i + ri * 2) % jag.length]);
            if (i < n) c.lineTo(PW * (i + 0.5) / n, base - amp * 0.15);
          }
          c.lineTo(PW, H); c.lineTo(0, H);
          c.closePath(); c.fill();
        });
        // treeline on the far shore
        c.fillStyle = cfg.night ? 'rgba(10,10,30,.95)' : 'rgba(22,50,40,.95)';
        for (let x = 0; x < PW; x += PW / 90) {
          const idx = Math.floor(x / (PW / 90));
          if (idx % 7 === 3) continue; // clearings break the sawtooth
          const th = H * (0.02 + 0.014 * jag[idx % jag.length] + 0.012 * jag[(idx * 3 + 1) % jag.length]);
          c.beginPath();
          c.moveTo(x, H * 0.56); c.lineTo(x + PW / 180, H * 0.56 - th); c.lineTo(x + PW / 90, H * 0.56);
          c.closePath(); c.fill();
        }
        c.fillRect(0, H * 0.555, PW, H * 0.015);
      });
      scene.add.image(0, 0, 'pk-pano').setOrigin(0).setDepth(-80).setScrollFactor(0.22);
      celestial(scene, W * 0.72, H * 0.14, 24 * K,
        cfg.night ? 0xe8f2ff : 0xffe9a0, { crescent: cfg.night, depth: -90, scrollFactor: 0.1 });
      driftClouds(scene, {
        n: 3, tint: cfg.night ? 0x5c5480 : 0xffffff, alpha: cfg.night ? 0.35 : 0.6,
        yBand: [0.05, 0.24], depth: -78, scrollFactor: 0.3,
      });
      // glints living on the water
      scene.add.particles(0, 0, 'fx-dot', {
        x: { min: 0, max: WW }, y: { min: waterY(scene) + 8 * K, max: H - 20 * K },
        scale: { start: 0.16 * K, end: 0 }, alpha: { start: 0.55, end: 0 },
        tint: cfg.night ? 0x8ab8dc : 0xfff0c8, blendMode: 'ADD',
        lifespan: 1600, frequency: 90, advance: 1600,
      }).setDepth(7);

      // the lake itself, world-wide
      const wy = waterY(scene);
      waterGfx = scene.add.graphics().setDepth(5);
      // depth-banded water: horizon mixes toward the sky, deepens toward shore
      const wCol = cfg.water;
      const mix = (c1, f) => {
        const r = (c1 >> 16) & 255, g2 = (c1 >> 8) & 255, b = c1 & 255;
        return ((Math.round(r * f) & 255) << 16) | ((Math.round(g2 * f) & 255) << 8) | (Math.round(b * f) & 255);
      };
      const bands = [[1.45, 0.16], [1.18, 0.22], [1, 0.3], [0.78, 0.32]];
      let by = wy;
      for (const [f, hFrac] of bands) {
        waterGfx.fillStyle(mix(wCol, Math.min(f, 1.9)), 1);
        waterGfx.fillRect(0, by, WW, (H - wy) * hFrac + 2);
        by += (H - wy) * hFrac;
      }
      // shimmer lives at the waterline, not scattered at random
      waterGfx.fillStyle(0xffffff, 0.18);
      for (let i = 0; i < 46; i++) {
        waterGfx.fillRect(Math.random() * WW, wy + 2 * K + Math.random() * 26 * K, (18 + Math.random() * 50) * K, 1.6 * K);
      }
      // soft ridge reflections just below the horizon line
      waterGfx.fillStyle(cfg.night ? 0x2a2452 : 0x3a6a58, 0.12);
      for (let i = 0; i < 4; i++) {
        waterGfx.fillEllipse(WW * (0.12 + i * 0.24), wy + (14 + i * 8) * K, WW * 0.14, 10 * K);
      }
      if (cfg.cliff) {
        const cl = scene.add.graphics().setDepth(6);
        cl.fillStyle(0x6a4a2a, 1);
        cl.fillRect(0, throwerY(scene) + 24 * K, W * 0.22, H);
        cl.fillStyle(0x4a3018, 1);
        cl.fillRect(W * 0.18, throwerY(scene) + 24 * K, W * 0.04, H);
      }
      if (cfg.walls) {
        const cw = scene.add.graphics().setDepth(15);
        for (let i = 1; i <= 3; i++) {
          const x = WW * (0.22 + i * 0.19);
          cw.fillStyle(0x8c3a24, 0.95);
          cw.fillRect(x, 0, 26 * K, wy - (60 + i * 30) * K);
          cw.fillStyle(0x5c2416, 0.95);
          cw.fillRect(x + 26 * K, 0, 8 * K, wy - (60 + i * 30) * K);
        }
      }

      ambientMotes(scene, cfg.accent, { alpha: cfg.night ? 0.55 : 0.3 });
      if (cfg.night) {
        const stars = scene.add.graphics().setDepth(-85).setScrollFactor(0.1);
        stars.fillStyle(0xfff4c8, 0.9);
        for (let i = 0; i < 60; i++) stars.fillCircle(Math.random() * WW * 0.5, Math.random() * H * 0.45, (Math.random() * 1.6 + 0.6) * K);
      }

      // the ranger, mid-throw forever
      scene.add.image(anchor(scene).x - 22 * K, throwerY(scene) + 4 * K,
        canvasTex(scene, 'pk-ranger', 44 * K, 78 * K, PAINT.ranger)).setDepth(19);
      // cattail reeds in the near foreground
      canvasTex(scene, 'pk-reeds', 120 * K, 150 * K, (c, w, h) => {
        for (let i = 0; i < 6; i++) {
          const x = w * (0.08 + i * 0.16), sway = (i % 2 ? 1 : -1) * w * 0.05;
          c.strokeStyle = cfg.night ? 'rgba(20,26,50,.9)' : 'rgba(30,60,42,.9)';
          c.lineWidth = w * 0.025; c.lineCap = 'round';
          c.beginPath(); c.moveTo(x, h); c.quadraticCurveTo(x + sway, h * 0.5, x + sway * 1.4, h * (0.12 + (i % 3) * 0.1)); c.stroke();
          c.fillStyle = cfg.night ? 'rgba(40,34,70,.95)' : 'rgba(90,60,30,.95)';
          c.beginPath(); c.ellipse(x + sway * 1.4, h * (0.1 + (i % 3) * 0.1), w * 0.022, h * 0.055, sway > 0 ? 0.2 : -0.2, 0, 7); c.fill();
        }
      });
      const reeds = scene.add.image(6 * K, H, 'pk-reeds').setOrigin(0, 1).setDepth(26);
      scene.tweens.add({ targets: reeds, angle: 1.6, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      // floats across the lake
      const n = Math.round(7 * cfg.density);
      for (let i = 0; i < n; i++) {
        const kind = cfg.floats[Math.floor(Math.random() * cfg.floats.length)];
        const fw = FLOAT_W[kind] * K, fh = FLOAT_H[kind] * K;
        const x = WW * (0.2 + 0.75 * (i / n)) + Math.random() * WW * 0.05;
        const img = scene.add.image(x, wy - fh * 0.3, canvasTex(scene, `pk-${kind}`, fw, fh, PAINT[kind])).setDepth(12);
        scene.tweens.add({ targets: img, y: img.y - 5 * K, duration: 1100 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        // in the bog, turtles are landing pads — ring them so "safe pad" reads
        // at a glance and they can't be mistaken for the obstacles other worlds
        // trained you to dodge.
        if (cfg.bog && kind === 'turtle') {
          const pad = scene.add.image(x, wy, 'fx-ring').setTint(0xffe08a).setBlendMode('ADD').setScale(0.95 * K).setAlpha(0.55).setDepth(10);
          scene.tweens.add({ targets: pad, alpha: 0.3, scaleX: pad.scaleX * 1.14, scaleY: pad.scaleY * 1.14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        floats.push({ img, kind, w: fw, h: fh, grazed: false, grazeClaims: 0, bounced: false, vx: kind === 'bison' ? (Math.random() < 0.5 ? -18 : 18) * K : 0 });
      }
      if (cfg.rings) {
        for (let i = 0; i < 5; i++) {
          const x = WW * (0.25 + i * 0.16);
          const y = wy - (70 + Math.random() * 90) * K;
          const img = scene.add.image(x, y, 'fx-ring').setTint(0xffd24a).setBlendMode('ADD').setScale(0.66 * K).setAlpha(0.8).setDepth(11);
          scene.tweens.add({ targets: img, alpha: 0.4, scale: 0.58 * K, duration: 800, yoyo: true, repeat: -1 });
          rings.push({ img, hit: false, r: 36 * K });
        }
      }
      if (cfg.beams) {
        for (let i = 0; i < 3; i++) {
          const x = WW * (0.3 + i * 0.22);
          const g = scene.add.graphics().setDepth(8);
          g.fillStyle(0x7dffb3, 0.13);
          g.fillTriangle(x - 12 * K, 0, x - 60 * K, wy, x + 60 * K, wy);
          g.fillStyle(0x7dffb3, 0.25);
          g.fillEllipse(x, 16 * K, 70 * K, 22 * K);
          beams.push({ x, halfW: 55 * K });
        }
      }

      aimGfx = scene.add.graphics().setDepth(30);
      livesGfx = scene.add.graphics().setDepth(31).setScrollFactor(0);
      livesLabel = scene.add.text(W - 14 * K, 31 * K, 'GOODWILL', {
        fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: `${9 * K}px`, color: '#c8d2dc',
      }).setOrigin(1, 0).setDepth(31).setScrollFactor(0).setAlpha(0.7);
      if (cfg.wind) windGfx = scene.add.graphics().setDepth(31).setScrollFactor(0);
      warnGfx = scene.add.graphics().setDepth(31).setScrollFactor(0);
      api.lives(lives); // hearts are world-flavor; the cabinet badge is canon
      t0 = scene.time.now; // ramp clock starts with the run
      // goldenAt seeds on the first update — the scene clock reads ~0 here
      resetStone(scene, K);
      glyphBanner(scene, 'PULL BACK. RELEASE.', '#dff6ff', 22 * K);
      // the bog reverses the rule every other world taught — call it out
      if (cfg.bog) scene.time.delayedCall(1500, () => { try { glyphBanner(scene, 'STICK TO THE SHELLS', '#ffe08a', 20 * K); } catch { /* garnish */ } });

      // Angry-Birds grammar: touch ANYWHERE, pull back (down-left), release.
      // The vector is relative to your own finger, not to a corner anchor.
      scene.input.on('pointerdown', (p) => {
        if (stone && stone.flying) return;      // a stone is already airborne
        // between throws: a tap skips the reset wait and re-arms instantly, so
        // the loop never freezes on a short rest.
        if (!stone || stone.dead) {
          if (resetTimer) { resetTimer.remove(false); resetTimer = null; }
          resetStone(scene, unit(scene));
        }
        aiming = true;
        aimAt = { sx: p.x, sy: p.y, x: p.x, y: p.y };
      });
      scene.input.on('pointermove', (p) => {
        if (aiming && aimAt) { aimAt.x = p.x; aimAt.y = p.y; }
      });
      scene.input.on('pointerup', () => {
        if (!aiming || !stone || stone.flying) { aiming = false; return; }
        aiming = false;
        const dx = aimAt.sx - aimAt.x, dy = aimAt.sy - aimAt.y;
        if (Math.hypot(dx, dy) < 15 * K) return; // barely moved — a fidget, not a throw
        // the gesture we teach is the gesture we accept: a forward or upward
        // swipe used to clamp into the PERFECT flat max throw. Now only a real
        // pull-back (into the down-left quadrant, with slack) launches.
        const raw = Math.atan2(dy, dx);
        if (raw < -1.5 || raw > 0.35) return; // a stray swipe, not a pull
        const pow = Math.min(Math.hypot(dx, dy), 180 * K);
        const ang = Math.max(-1.35, Math.min(-0.06, raw));
        const KV = 6.2 * (fever ? 1.06 : 1);
        stone.vx = Math.cos(ang) * pow * KV;
        stone.vy = Math.sin(ang) * pow * KV;
        stone.flying = true;
        api.sfx('tap');
        api.haptic(8);
        zoomPunch(scene, 1.04, 160);
      });
    },

    update(t, dtMs) {
      const scene = this;
      const dt = Math.min(dtMs, 64) / 1000;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      const WW = W * WORLD_SCREENS;
      const wy = waterY(scene);
      const cam = scene.cameras.main;
      const ramp = rampNow(scene); // difficulty term, grows across the rest
      if (!goldenAt) goldenAt = scene.time.now + goldDelay();

      drawLives(scene, K); // pinned HUD — drawn every frame, even at anchor

      // wind worlds: a pinned indicator so the drift is telegraphed, not a
      // silent shove into a float (and wind can never cost a life — below).
      if (cfg.wind && windGfx) {
        const w = Math.sin(scene.time.now / 2600) * (1 + 0.7 * ramp);
        windGfx.clear();
        const cx = W / 2, cy = 22 * K, dir = w >= 0 ? 1 : -1;
        const len = 26 * K * Math.min(1.7, Math.abs(w)) + 6 * K;
        windGfx.lineStyle(3 * K, 0x9fd8ff, 0.7);
        windGfx.lineBetween(cx - dir * len / 2, cy, cx + dir * len / 2, cy);
        const tip = cx + dir * len / 2;
        windGfx.fillStyle(0x9fd8ff, 0.85);
        windGfx.fillTriangle(tip - dir * 6 * K, cy - 5 * K, tip - dir * 6 * K, cy + 5 * K, tip + dir * 6 * K, cy);
      }

      // aim guide: the pull-back band under your finger + trajectory dots
      aimGfx.clear();
      if (aiming && aimAt && stone && !stone.flying) {
        const a = anchor(scene);
        const dx = aimAt.sx - aimAt.x, dy = aimAt.sy - aimAt.y;
        const scroll = cam.scrollX;
        aimGfx.lineStyle(4 * K, 0xffffff, 0.4);
        aimGfx.lineBetween(aimAt.sx + scroll, aimAt.sy, aimAt.x + scroll, aimAt.y);
        const rawAim = Math.atan2(dy, dx);
        // dots only for a drag release would actually accept — a forward swipe
        // previews nothing because it throws nothing
        if (Math.hypot(dx, dy) >= 15 * K && rawAim >= -1.5 && rawAim <= 0.35) {
          const pow = Math.min(Math.hypot(dx, dy), 180 * K);
          const ang = Math.max(-1.35, Math.min(-0.06, rawAim));
          const KV = 6.2 * (fever ? 1.06 : 1); // match the real fever launch
          // the preview flies the same air as the stone: wind included, so the
          // dots draw the path the throw will actually take
          const windAcc = cfg.wind ? Math.sin(scene.time.now / 2600) * 120 * K * (1 + 0.7 * ramp) : 0;
          let px = a.x, py = a.y, pvx = Math.cos(ang) * pow * KV, pvy = Math.sin(ang) * pow * KV;
          aimGfx.fillStyle(0xffffff, 0.85);
          for (let i = 0; i < 14; i++) {
            pvx += windAcc * 0.05; px += pvx * 0.05; pvy += 900 * K * 0.05; py += pvy * 0.05;
            if (py > wy) break;
            aimGfx.fillCircle(px, py, (4 - i * 0.18) * K);
          }
        }
      }

      // the golden dragonfly hovers over the far water
      if (!golden && scene.time.now >= goldenAt) {
        const gx = WW * (0.35 + Math.random() * 0.45);
        const gy = wy - (90 + Math.random() * 90) * K;
        const img = scene.add.image(gx, gy, canvasTex(scene, 'pk-dfly', 52 * K, 30 * K, PAINT.dragonfly)).setDepth(14);
        const halo = scene.add.image(gx, gy, 'fx-dot').setTint(0xffd24a).setBlendMode('ADD').setScale(1.6 * K).setAlpha(0.5).setDepth(13);
        scene.tweens.add({ targets: [img, halo], y: gy - 16 * K, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        scene.tweens.add({ targets: img, scaleY: 0.85, duration: 140, yoyo: true, repeat: -1 });
        golden = { img, halo };
      }

      // bison wander
      for (const f of floats) {
        if (f.vx) {
          f.img.x += f.vx * dt;
          if (f.img.x < WW * 0.18 || f.img.x > WW * 0.96) f.vx *= -1;
        }
      }

      // heads-up arrow: the throw was aimed looking at screen one, so a local
      // waiting three screens downrange gets telegraphed at the screen edge
      // (with one honk) — a hit ahead should never be a spawn-dice ambush.
      warnGfx.clear();
      if (stone && stone.flying && !stone.dead) {
        const edge = cam.scrollX + W;
        const hazard = floats.find((f) =>
          !(cfg.bog && f.kind === 'turtle') && !(cfg.bouncepads && f.kind === 'bison') &&
          f.img.x > edge && f.img.x < stone.img.x + W * 1.2);
        if (hazard) {
          const ay = hazard.img.y;
          warnGfx.fillStyle(0xff5d7a, 0.9);
          warnGfx.fillTriangle(W - 6 * K, ay, W - 24 * K, ay - 9 * K, W - 24 * K, ay + 9 * K);
          if (!stone.warned) { stone.warned = true; api.sfx('log'); }
        }
      }

      if (!stone || !stone.flying || stone.dead) return;

      // ——— ballistics ———
      const wind = cfg.wind ? Math.sin(scene.time.now / 2600) * 120 * K * (1 + 0.7 * ramp) : 0;
      const prevX = stone.img.x; // for the swept wall test below
      if (stone.hydro) {
        // hydroplane run-out: the hops flattened into a slide. The stone hugs
        // the surface bleeding speed, banks distance only, and settles when it
        // drops below skimming pace — no more skips, no more machine-gun tail.
        stone.img.y = wy - 1;
        stone.vy = 0;
        stone.vx *= Math.exp(-1.5 * dt);
        stone.img.x += stone.vx * dt;
        stone.img.rotation += 14 * dt;
        if (Math.random() < 0.5) burst(scene, stone.img.x, wy, 0xbfe8f8, { n: 1, speed: 90 * K, scale: 0.25 * K, gravityY: 500 * K });
        // the bog's law holds even mid-slide: open water swallows the stone
        const overPad = !cfg.bog || floats.some((f) => f.kind === 'turtle' && Math.abs(stone.img.x - f.img.x) < f.w * 0.9);
        if (!overPad) { plunk(scene, K, 'OPEN WATER'); return; }
        if (stone.vx < (300 + 120 * ramp) * K) { endThrow(scene, K, 'washout'); return; }
      } else {
        stone.vx += wind * dt;
        // the wind's share of the drift, tracked so a gust that shoved the
        // stone into a local can be forgiven where a bad aim would not be
        stone.driftV += wind * dt;
        stone.windDrift += stone.driftV * dt;
        stone.vy += 900 * K * dt;
        stone.img.x += stone.vx * dt;
        stone.img.y += stone.vy * dt;
        stone.img.rotation += 9 * dt;
      }

      cam.scrollX += ((stone.img.x - W * 0.4) - cam.scrollX) * Math.min(1, dt * 5);
      bankDistance(scene); // bank the distance gained this frame — cash-out safe

      // canyon walls: banked ricochets. A swept test (did the frame cross the
      // wall plane?) instead of a point-in-band check, so the fast flat throws
      // the canyon rewards can't tunnel straight through the wall on a frame dip.
      if (cfg.walls) {
        for (let i = 1; i <= 3; i++) {
          const wx = WW * (0.22 + i * 0.19) + 17 * K;
          const top = wy - (60 + i * 30) * K;
          if (stone.img.y < top && ((stone.vx > 0 && prevX <= wx && stone.img.x >= wx) || (stone.vx < 0 && prevX >= wx && stone.img.x <= wx))) {
            const rightward = stone.vx > 0;
            stone.img.x = rightward ? wx - 1 : wx + 1; // clamp to the struck face
            stone.vx *= -0.85;
            // a bank throws the stone UP as well as back, so the ricochet
            // extends the flight instead of killing the run for pocket change.
            stone.vy = -Math.abs(stone.vy) * 0.5 - 200 * K;
            burst(scene, stone.img.x, stone.img.y, 0xff9a5c, { n: 10, speed: 220 * K, scale: 0.4 * K });
            if (rightward) {
              // the trick shot pays like one — first bank big, replays small,
              // so wall ping-pong can't farm the canyon
              const bg = stone.banks === 0 ? 40 : 10;
              stone.banks++;
              const paid = scoreApplied(bg);
              if (paid) floatScore(scene, stone.img.x, stone.img.y - 20 * K, `BANK +${paid}`, '#ff9a5c', 15 * K);
            } else {
              floatScore(scene, stone.img.x, stone.img.y - 20 * K, 'CLANG', '#c88a6c', 13 * K);
            }
            shake(scene, 0.006, 90);
            api.sfx('tap');
          }
        }
      }

      // ufo beams: re-loft
      for (const b of beams) {
        if (Math.abs(stone.img.x - b.x) < b.halfW && stone.img.y < wy - 8 * K && stone.vy > 0) {
          stone.vy = -Math.abs(stone.vy) * 0.55 - 240 * K;
          const paid = scoreApplied(10);
          if (paid) floatScore(scene, stone.img.x, stone.img.y, `ABDUCTED +${paid}`, '#7dffb3', 15 * K);
          burst(scene, stone.img.x, stone.img.y, 0x7dffb3, { n: 12, speed: 240 * K, scale: 0.5 * K });
          api.sfx('objDone');
        }
      }

      // golden dragonfly strike
      if (golden && Math.abs(stone.img.x - golden.img.x) < 34 * K && Math.abs(stone.img.y - golden.img.y) < 30 * K) {
        const paid = scoreApplied(75);
        if (paid) glyphBanner(scene, `GOLDEN DRAGONFLY +${paid}`, '#ffe9a0', 26 * K);
        collectTo(scene, golden.img.x, golden.img.y, cam.scrollX + W - 30 * K, 20 * K, 0xffd24a, 16);
        burst(scene, golden.img.x, golden.img.y, 0xffd24a, { n: 22, speed: 340 * K, scale: 0.6 * K });
        flash(scene, 0xffd24a, 120, 0.3);
        slowmo(scene, 0.35, 320);
        api.sfx('pr');
        // kill the infinite hover/pulse tweens before destroying the targets,
        // or they keep writing to detached images for the rest of the session.
        scene.tweens.killTweensOf(golden.img); scene.tweens.killTweensOf(golden.halo);
        golden.img.destroy(); golden.halo.destroy();
        golden = null;
        goldenAt = scene.time.now + goldDelay();
      }

      // firefly rings — part of the same slalom chain as grazes, so threading
      // a run of them escalates and celebrates instead of paying a flat +15.
      for (const r of rings) {
        if (!r.hit && Math.abs(stone.img.x - r.img.x) < r.r && Math.abs(stone.img.y - r.img.y) < r.r) {
          r.hit = true;
          r.img.setTint(0xfff0c8);
          stone.chain += 1;
          const val = Math.round(15 * (1 + Math.min(stone.chain, 6) * 0.25) * (1 + Math.min(streak, 5) * 0.08));
          const paid = scoreApplied(val);
          api.note(noteStep++);
          collectTo(scene, r.img.x, r.img.y, cam.scrollX + W - 30 * K, 20 * K, 0xffd24a, 8);
          burst(scene, r.img.x, r.img.y, 0xffe08a, { n: 8, speed: 160 * K, scale: 0.35 * K });
          if (paid) floatScore(scene, r.img.x, r.img.y - 20 * K, `RING ×${stone.chain} +${paid}`, '#ffd24a', 16 * K);
        }
      }

      // floats: bounce, smash, clip or graze
      for (const f of floats) {
        const dx = Math.abs(stone.img.x - f.img.x), dy = Math.abs(stone.img.y - f.img.y);

        // meadow bison: a trampoline — fired ONCE per landing, not every frame
        // the stone dwells inside (which used to compound vy into a launch off
        // the top of the world). A per-pad flag re-arms when the stone leaves.
        if (cfg.bouncepads && f.kind === 'bison') {
          const inBox = dx < f.w * 0.5 && dy < f.h * 0.55;
          if (inBox && !f.bounced && stone.vy > 0) {
            f.bounced = true;
            stone.img.y = f.img.y - f.h * 0.55;         // lift clear so it can't re-enter
            stone.vy = -Math.abs(stone.vy) * 1.0 - 240 * K; // bounded, not dwell-scaled
            stone.vx *= 1.06;
            squash(scene, f.img, 'y');
            const paid = scoreApplied(12);
            if (paid) floatScore(scene, f.img.x, f.img.y - f.h, `OFF THE BISON +${paid}`, '#e8d5ae', 15 * K);
            shake(scene, 0.008, 110);
            api.sfx('objDone');
            api.haptic(10);
          } else if (!inBox) {
            f.bounced = false;
          }
          continue;
        }

        // bog turtles are landing pads, never a hazard — the water logic below
        // scores a shell landing; hitting one must never cost a life.
        if (cfg.bog && f.kind === 'turtle') continue;

        if (dx < f.w * 0.3 && dy < f.h * 0.38) {
          // dead-centre hit. Only a DESCENDING dive costs a life — that is the
          // aimed mistake the player owns. A skimming stone that plows a local
          // it could never see (aimed on screen one, spawned on screen three)
          // ends the throw like a clip, no goodwill spent. A gust that shoved
          // the stone more than half a float off its line is forgiven too.
          const dove = stone.vy > 140 * K && !stone.hydro;
          const windBlown = Math.abs(stone.windDrift) > f.w * 0.5;
          squash(scene, f.img, 'x');
          shake(scene, 0.01, 130);
          api.sfx('log');
          api.haptic([14, 30, 14]);
          if (dove && !windBlown) {
            floatScore(scene, f.img.x, f.img.y - f.h, f.kind === 'duck' ? 'HONK!' : 'CLONK', '#ff5d7a', 16 * K);
            loseLife(scene, K, f.img.x, 'SCARED OFF');
          } else {
            floatScore(scene, f.img.x, f.img.y - f.h, 'plowed', '#a8b4c0', 14 * K);
          }
          plunk(scene, K, false);
          return;
        } else if (dx < f.w * 0.5 && dy < f.h * 0.5) {
          // a glancing clip — ends the throw but costs no life. A graze-aimed
          // shot that tips slightly too close is forgiven, not fatal.
          squash(scene, f.img, 'x');
          floatScore(scene, f.img.x, f.img.y - f.h, 'clipped', '#a8b4c0', 14 * K);
          api.sfx('log');
          plunk(scene, K, false);
          return;
        } else if (!f.grazed && dx < f.w * 0.9 && dy < f.h * 1.1) {
          // an honest near-miss that PAYS like the skill verb it is: the base
          // starts rich, decays a point per repeat claim (floor 5, and claims
          // ease off between throws), and a slalom chain within a throw
          // escalates the payout and the fanfare. Threading the locals must
          // live in the same league as mindless flat skipping.
          f.grazed = true;
          f.grazeClaims += 1;
          stone.chain += 1;
          const base = Math.max(5, 15 - (f.grazeClaims - 1));
          const val = Math.max(1, Math.round(base * (1 + Math.min(stone.chain, 6) * 0.25) * (1 + Math.min(streak, 5) * 0.08)));
          const paid = scoreApplied(val);
          burst(scene, f.img.x + (stone.img.x > f.img.x ? -1 : 1) * f.w * 0.4, f.img.y, 0x3adcc8, { n: 6, speed: 150 * K, scale: 0.3 * K });
          if (paid) floatScore(scene, f.img.x, f.img.y - f.h * 1.4, `GRAZE ×${stone.chain} +${paid}`, '#3adcc8', 13 * K);
          api.note(noteStep++);
          api.haptic(4);
        }
      }

      // ——— the water: skim or sink ———
      if (!stone.hydro && stone.img.y >= wy && stone.vy > 0) {
        const speed = Math.hypot(stone.vx, stone.vy);
        const angle = Math.atan2(stone.vy, Math.abs(stone.vx)); // radians below horizontal
        // the lake demands a flatter, faster line the longer the rest runs, so
        // a throw at t=200 asks more precision than the same lob at t=5. On
        // the cliff the stone falls half a screen before it ever touches
        // water, so the gate widens to match the drop — the taught rule (fast
        // and flat) must actually work from up there. The cliff's ramp term is
        // FLOORED at 0.68: the drop sets a geometric entry-angle minimum of
        // ~0.63 rad that no skill can flatten (the flattest max-power throw
        // still falls 0.42H), so ramping below that would re-deny every skim
        // late in a long rest — the exact wall this gate exists to remove.
        const shallow = angle < (cfg.cliff ? Math.max(0.68, 0.78 - 0.14 * ramp) : 0.42 - 0.14 * ramp);
        const fast = speed > (300 + 120 * ramp) * K;
        // bog law, now absolute: open water is dead water, every time — the
        // rule the banner teaches is the rule the water enforces.
        const onPad = cfg.bog && floats.some((f) => f.kind === 'turtle' && Math.abs(stone.img.x - f.img.x) < f.w * 0.9);
        if (cfg.bog && !onPad) { plunk(scene, K, 'OPEN WATER'); return; }
        if (shallow && fast) {
          const clean = angle < ((cfg.cliff ? 0.3 : 0.18) - 0.06 * ramp); // the perfect flat entry
          stone.img.y = wy - 1;
          stone.vy = -Math.abs(stone.vy) * (0.62 - angle * 0.35);
          stone.vx *= cfg.bog ? 0.82 : clean ? 0.97 : 0.94;
          // when the next hop would be a sub-200ms stutter (or the ladder is
          // simply spent), the skim becomes a hydroplane run-out instead of a
          // frame-rate-dependent machine-gun of micro-skips.
          if (Math.abs(stone.vy) < 90 * K || stone.skips >= 9) {
            stone.hydro = true;
            stone.vy = 0;
            floatScore(scene, stone.img.x, wy - 40 * K,
              stone.skips >= 9 ? 'MAX SKIPS! HYDROPLANE' : 'HYDROPLANE', '#9fd8ff', 15 * K);
            api.sfx('tap');
          } else {
            skipAt(scene, K, stone.img.x, clean);
          }
          if (onPad) {
            const paid = scoreApplied(10);
            if (paid) floatScore(scene, stone.img.x, wy - 56 * K, `SHELL PAD +${paid}`, '#7ad48a', 14 * K);
          }
        } else {
          plunk(scene, K, shallow ? 'TOO SLOW' : 'TOO STEEP');
          return;
        }
      }

      // mothman tail-bat: the lake plays for your team (he naps between shows)
      if (cfg.cryptid && scene.time.now - mothAt > 40000 && stone.img.x > WW * 0.72 && stone.skips >= 3) {
        mothAt = scene.time.now;
        const moth = scene.add.image(stone.img.x + 60 * K, stone.img.y - 120 * K,
          canvasTex(scene, 'pk-moth', 90 * K, 70 * K, PAINT.moth)).setDepth(25).setScale(0.2);
        scene.tweens.add({ targets: moth, scale: 1, y: stone.img.y - 10 * K, duration: 260, ease: 'Back.easeOut' });
        scene.time.delayedCall(280, () => {
          stone.vx = Math.abs(stone.vx) * 1.7 + 300 * K;
          stone.vy = -420 * K;
          slowmo(scene, 0.3, 500);
          flash(scene, 0xffd24a, 140, 0.4);
          shake(scene, 0.014, 220);
          const mothPaid = scoreApplied(40);
          if (mothPaid) glyphBanner(scene, `MOTHMAN ASSIST +${mothPaid}`, '#ffd24a', 28 * K);
          api.sfx('pr');
          api.haptic([16, 40, 16, 40, 16]);
          scene.tweens.add({ targets: moth, alpha: 0, y: moth.y - 200 * K, duration: 900, onComplete: () => moth.destroy() });
        });
      }

      // off the far end: a legend. The game's named win-state gets the game's
      // biggest aftermath — flash, slow-mo, a shore detonation, shake, punch —
      // so the crossing reads as the climax, not a quiet +50 line. The gate:
      // ACROSS THE LAKE is a skimming feat, not an artillery table. Only a
      // stone that engaged the water (a skip, or a hydroplane run-out) claims
      // the shore; a pure ballistic lob that sails over the line just flies
      // on and splashes TOO STEEP on the far water like any other lob.
      if (stone.img.x > WW - 20 * K && (stone.skips > 0 || stone.hydro)) {
        const cx = stone.img.x, cy = wy;
        const paid = scoreApplied(25); // distance already banked; a lean bonus
        flash(scene, 0xffd24a, 160, 0.4);
        slowmo(scene, 0.3, 500);
        shake(scene, 0.014, 220);
        zoomPunch(scene, 1.07, 360);
        burst(scene, cx, cy, 0xffd24a, { n: 30, speed: 420 * K, scale: 0.7 * K, gravityY: 400 * K });
        shockRing(scene, cx, cy, 0xfff0c8, 120 * K);
        if (paid) glyphBanner(scene, `ACROSS THE LAKE +${paid}`, '#ffd24a', 28 * K);
        api.sfx('pr');
        api.haptic([20, 50, 20, 50, 30]);
        endThrow(scene, K, 'end');
        return;
      }
      if (stone.img.y > H + 60 * K) { endThrow(scene, K, 'sink'); return; }
    },
  };
}

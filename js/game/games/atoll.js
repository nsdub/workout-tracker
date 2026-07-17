// BASS DROP — Pirate Radio Atoll. The navy sends jammers to kill your
// signal; you defend the antenna with the beat. TAP anywhere to drop a
// pulse — the shockwave rings outward and pops every jammer it reaches,
// and each pop fires its own smaller pulse, so one well-placed tap can
// chain across a whole cluster. Land enough ON-BEAT pops and the DROP
// charges: your next tap is a full BASS DROP that clears the screen.
//
// Two real skills, not one mash: AIM (the pulse is small, jammers arrive
// spread and in moving clusters, and popping near your tap's centre pays
// a bonus, so where you tap matters) and TIMING (a tap that lands on the
// beat — watch the ring collapse onto the lamp — fires a bigger pulse and
// charges the DROP; an off-beat tap still fires a small defensive pulse so
// a tired thumb is never ignored, it just earns less). Mashing one spot
// survives but scores near the floor; medals live above it.
//
// This is a rebuild. The old ship-cannon game was deleted at the user's
// order — it stacked boats and played itself. Nothing here is physics-
// stacked: every jammer is a kinematic sprite on a path, and the round
// only comes alive on your first tap, so an untouched screen is silent.
//
// Worlds mutate the beat, never just the wallpaper: the volcano rains
// poppable embers, relay parrots throw fatter chains AND still field the
// fast notes and heavy censor-blimps, the kraken flanks you from two
// sides, the skull cave echoes your pulses off its walls, the hurricane
// blows the jammers crosswind, Message Bay drifts you healing bottles,
// and the treasure antenna spits golden boomboxes worth a real fortune.
import {
  ensureFx, canvasTex, burst, shockRing, floatScore, banner, glyphBanner,
  shake, flash, slowmo, zoomPunch, collectTo, paintSky, ambientMotes,
  bloomCamera, vignette, squash, unit, celestial, driftClouds,
} from '../fx.js';

export const TITLE = 'Bass Drop';
export const VERB = 'DROP!';
export const GESTURE = 'Tap on the beat';
// points per second for 1/2/3 stars — a distracted lifter clears bar 1
// on any competent round; three stars wants sustained on-beat chains,
// centred taps, and cashed drops.
export const STARS = [7, 13, 21];

export const HELP = {
  goal: 'Protect your radio antenna by knocking the navy jammers out of the sky before they reach it.',
  how: 'Tap ON THE BEAT — watch the gold ring collapse onto the antenna lamp — to drop a big shockwave. It rings outward and pops every jammer it touches, and each pop sends out its own wave, so one tap aimed into a cluster chains across the screen. On-beat pops charge the DROP meter; when it is full your next tap is a full bass drop that clears everything. Off-beat taps still fire a small pulse, so panic-tapping always defends — it just scores less.',
  avoid: 'Every jammer that reaches your antenna cuts your SIGNAL bar. Let the signal empty and your station goes OFF AIR and the run ends early — so keep the sky clear.',
};

export const WORLDS = {
  'atoll-wreck': {
    name: 'Cannon Deck', sky: [[0, '#3a8fd9'], [0.55, '#7ac8ec'], [1, '#ffd98a']],
    accent: 0xff7a4c, sea: 0x1c5c8c, speed: 1, spawn: 1, secondary: 1, goldEvery: [34, 70],
  },
  'atoll-light': {
    name: 'Volcano Lighthouse', sky: [[0, '#2c0c20'], [0.55, '#6e1f3a'], [1, '#e85a3c']],
    accent: 0xff9a4c, sea: 0x28184c, speed: 1.12, spawn: 1.1, secondary: 1, embers: true, goldEvery: [34, 70],
  },
  'atoll-parrots': {
    name: 'Parrot Congress', sky: [[0, '#0c6a5c'], [0.55, '#3aa88c'], [1, '#ffe9b3']],
    accent: 0xe83a4e, sea: 0x0c4a44, speed: 1, spawn: 1.05, secondary: 1.5, relay: true, goldEvery: [34, 70],
  },
  'atoll-kraken': {
    name: "Kraken's Turntables", sky: [[0, '#1c0c3c'], [0.55, '#3c2468'], [1, '#8c4a9c']],
    accent: 0x9c6ee8, sea: 0x140a30, speed: 1.05, spawn: 1.15, secondary: 1, dual: true, kraken: true, goldEvery: [36, 74],
  },
  'atoll-bottles': {
    name: 'Message Bay', sky: [[0, '#2c6a9c'], [0.55, '#6ab8d8'], [1, '#ffe0a0']],
    accent: 0x3adcc8, sea: 0x1a4a70, speed: 0.95, spawn: 1, secondary: 1, bottles: true, goldEvery: [30, 64],
  },
  'atoll-skull': {
    name: 'Skull Cave Studio', sky: [[0, '#0c0c14'], [0.55, '#1c1c2c'], [1, '#3a3450']],
    accent: 0xaef0ff, sea: 0x0a0a18, speed: 1, spawn: 1, secondary: 1, echo: true, cave: true, goldEvery: [34, 70],
  },
  'atoll-storm': {
    name: 'Hurricane Dancefloor', sky: [[0, '#141c2c'], [0.55, '#2c3a50'], [1, '#546a84']],
    accent: 0x8ab8dc, sea: 0x0f1c30, speed: 1.15, spawn: 1.12, secondary: 1, wind: true, goldEvery: [34, 70],
  },
  'atoll-antenna': {
    name: 'Treasure Antenna', sky: [[0, '#1c3444'], [0.55, '#3a6a7c'], [1, '#ffc46c']],
    accent: 0xffd24a, sea: 0x143444, speed: 1, spawn: 1, secondary: 1, jackpot: true, goldEvery: [18, 38],
  },
};

// ——— painters: canvas 2D once, WebGL sprite forever. Faces on everything. ———

const PAINT = {
  drone(c, w, h) {
    // navy jammer: dark disc, red signal dish, propeller, a scowl
    const g = c.createRadialGradient(w * 0.4, h * 0.38, 2, w / 2, h * 0.55, w * 0.5);
    g.addColorStop(0, '#5c6b82'); g.addColorStop(1, '#2c3448');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(w / 2, h * 0.56, w * 0.4, h * 0.34, 0, 0, 7); c.fill();
    // a light rim so the silhouette clears dark skies
    c.strokeStyle = 'rgba(190,210,240,.55)'; c.lineWidth = h * 0.03;
    c.beginPath(); c.ellipse(w / 2, h * 0.56, w * 0.4, h * 0.34, 0, 0, 7); c.stroke();
    // propeller
    c.strokeStyle = '#9aa8c0'; c.lineWidth = h * 0.05; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.2, h * 0.16); c.lineTo(w * 0.8, h * 0.16); c.stroke();
    c.fillStyle = '#9aa8c0'; c.fillRect(w * 0.46, h * 0.14, w * 0.08, h * 0.16);
    // red dish
    c.fillStyle = '#e83a4e';
    c.beginPath(); c.moveTo(w * 0.5, h * 0.42); c.lineTo(w * 0.66, h * 0.3); c.lineTo(w * 0.7, h * 0.44); c.closePath(); c.fill();
    // scowl
    c.fillStyle = '#ffd24a';
    c.beginPath(); c.arc(w * 0.4, h * 0.56, w * 0.05, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.6, h * 0.56, w * 0.05, 0, 7); c.fill();
    c.fillStyle = '#14141c';
    c.beginPath(); c.arc(w * 0.4, h * 0.57, w * 0.022, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.6, h * 0.57, w * 0.022, 0, 7); c.fill();
    c.strokeStyle = '#14141c'; c.lineWidth = w * 0.03;
    c.beginPath(); c.arc(w * 0.5, h * 0.78, w * 0.1, 3.6, 5.8); c.stroke();
  },
  blimp(c, w, h) {
    // censor blimp: bigger, takes two hits
    const g = c.createLinearGradient(0, h * 0.2, 0, h * 0.8);
    g.addColorStop(0, '#6e5a34'); g.addColorStop(1, '#3a2c14');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(w / 2, h * 0.44, w * 0.44, h * 0.3, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(230,210,160,.5)'; c.lineWidth = h * 0.028;
    c.beginPath(); c.ellipse(w / 2, h * 0.44, w * 0.44, h * 0.3, 0, 0, 7); c.stroke();
    c.fillStyle = '#8a2c2c';
    c.fillRect(w * 0.28, h * 0.62, w * 0.44, h * 0.16);
    c.fillStyle = '#ffe9b3';
    c.font = `700 ${Math.round(h * 0.12)}px sans-serif`;
    c.textAlign = 'center'; c.fillText('NO', w * 0.5, h * 0.735);
    c.fillStyle = '#14141c';
    c.beginPath(); c.arc(w * 0.42, h * 0.42, w * 0.03, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.58, h * 0.42, w * 0.03, 0, 7); c.fill();
  },
  note(c, w, h) {
    // the navy's counter-broadcast — fast little jammer note
    c.fillStyle = '#c85ad8';
    c.beginPath(); c.ellipse(w * 0.38, h * 0.66, w * 0.22, h * 0.17, -0.4, 0, 7); c.fill();
    c.fillRect(w * 0.54, h * 0.2, w * 0.08, h * 0.46);
    c.beginPath(); c.moveTo(w * 0.54, h * 0.2); c.quadraticCurveTo(w * 0.86, h * 0.24, w * 0.8, h * 0.44);
    c.lineTo(w * 0.62, h * 0.36); c.closePath(); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(w * 0.33, h * 0.62, w * 0.04, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.44, h * 0.62, w * 0.04, 0, 7); c.fill();
  },
  parrot(c, w, h) {
    c.fillStyle = '#e83a4e';
    c.beginPath(); c.ellipse(w * 0.46, h * 0.56, w * 0.28, h * 0.34, 0.15, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.6, h * 0.3, w * 0.17, 0, 7); c.fill();
    c.fillStyle = '#ffd24a';
    c.beginPath(); c.moveTo(w * 0.72, h * 0.28); c.lineTo(w * 0.92, h * 0.34); c.lineTo(w * 0.72, h * 0.4); c.closePath(); c.fill();
    c.fillStyle = '#3a8fd9';
    c.beginPath(); c.ellipse(w * 0.3, h * 0.62, w * 0.17, h * 0.26, 0.6, 0, 7); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(w * 0.62, h * 0.27, w * 0.05, 0, 7); c.fill();
    c.fillStyle = '#14141c';
    c.beginPath(); c.arc(w * 0.63, h * 0.27, w * 0.022, 0, 7); c.fill();
  },
  ember(c, w, h) {
    const g = c.createRadialGradient(w / 2, h * 0.46, 1, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#fff4d0'); g.addColorStop(0.4, '#ff9a3c'); g.addColorStop(1, 'rgba(226,69,46,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // a molten core so it reads as a poppable target, not just a glow dot
    c.fillStyle = '#ffdca0';
    c.beginPath(); c.arc(w / 2, h * 0.5, w * 0.18, 0, 7); c.fill();
    c.fillStyle = '#5c2408';
    c.beginPath(); c.arc(w * 0.42, h * 0.48, w * 0.035, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.58, h * 0.48, w * 0.035, 0, 7); c.fill();
    c.strokeStyle = '#5c2408'; c.lineWidth = w * 0.03;
    c.beginPath(); c.arc(w * 0.5, h * 0.6, w * 0.07, 0.2, 2.9); c.stroke();
  },
  bottle(c, w, h) {
    c.fillStyle = 'rgba(122,216,196,.9)';
    c.beginPath(); c.roundRect(w * 0.32, h * 0.32, w * 0.36, h * 0.58, w * 0.12); c.fill();
    c.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.24);
    c.fillStyle = '#8a5a2a'; c.fillRect(w * 0.42, h * 0.06, w * 0.16, h * 0.1);
    c.fillStyle = '#e8d5ae'; c.fillRect(w * 0.37, h * 0.46, w * 0.26, h * 0.3);
    c.strokeStyle = '#c85a2a'; c.lineWidth = w * 0.02;
    c.beginPath(); c.moveTo(w * 0.4, h * 0.54); c.lineTo(w * 0.6, h * 0.54); c.moveTo(w * 0.4, h * 0.62); c.lineTo(w * 0.6, h * 0.62); c.stroke();
    c.fillStyle = '#3adcc8';
    c.beginPath(); c.arc(w * 0.44, h * 0.78, w * 0.03, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.56, h * 0.78, w * 0.03, 0, 7); c.fill();
  },
  boombox(c, w, h) {
    // the golden jackpot — a treasure boombox on the wind
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffe9a0'); g.addColorStop(1, '#c8892c');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(w * 0.08, h * 0.3, w * 0.84, h * 0.5, w * 0.06); c.fill();
    c.fillStyle = '#5c3408';
    c.beginPath(); c.arc(w * 0.32, h * 0.56, w * 0.15, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.68, h * 0.56, w * 0.15, 0, 7); c.fill();
    c.fillStyle = '#ffe9a0';
    c.beginPath(); c.arc(w * 0.32, h * 0.56, w * 0.06, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.68, h * 0.56, w * 0.06, 0, 7); c.fill();
    c.strokeStyle = '#5c3408'; c.lineWidth = w * 0.05; c.lineCap = 'round';
    c.beginPath(); c.arc(w * 0.5, h * 0.3, w * 0.34, Math.PI, 0); c.stroke();
  },
  antenna(c, w, h) {
    // your radio tower — drawn once, placed at the bottom center
    c.strokeStyle = '#c8b088'; c.lineWidth = w * 0.06; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.5, h); c.lineTo(w * 0.5, h * 0.14); c.stroke();
    c.lineWidth = w * 0.04;
    c.beginPath(); c.moveTo(w * 0.5, h * 0.98); c.lineTo(w * 0.18, h); c.moveTo(w * 0.5, h * 0.98); c.lineTo(w * 0.82, h); c.stroke();
    for (const fy of [0.4, 0.62, 0.82]) {
      c.beginPath(); c.moveTo(w * 0.36, h * (fy + 0.06)); c.lineTo(w * 0.5, h * fy); c.lineTo(w * 0.64, h * (fy + 0.06)); c.stroke();
    }
    // the broadcast lamp on top (glow drawn live in-scene)
    c.fillStyle = '#fff0c8';
    c.beginPath(); c.arc(w * 0.5, h * 0.1, w * 0.08, 0, 7); c.fill();
  },
};

const SIZES = { drone: [48, 48], blimp: [76, 56], note: [38, 44], parrot: [50, 46], ember: [40, 40], bottle: [34, 48], boombox: [60, 44], antenna: [80, 120] };
const HP = { drone: 1, blimp: 2, note: 1, parrot: 1, ember: 1 };
const PTS = { drone: 10, blimp: 18, note: 14, parrot: 12, ember: 8 };

export function create(P, ctx) {
  const { api, cfg } = ctx;
  const enemies = [];
  const pulses = [];      // { x, y, r, maxR, hit:Set, kind, charges, born }
  const bottles = [];     // Message Bay: drifting healing pickups
  let golden = null;      // { spr, halo, vx, r }
  let antennaImg, lamp, seaGfx, pulseGfx, meterGfx;
  let gameScene = null;
  let started = false;
  let signal = 100;
  let dead = false;
  let warnedLow = false;
  let lastTapAt = -1e9;
  let combo = 0;          // DROP meter 0..1
  let chain = 0;          // pops in the current cascade
  let chainResetAt = 0;
  let spawnAt = 0;
  let goldenAt = 0;
  let bottleAt = 0;
  let stormFlashAt = 0;
  let t0 = 0;
  let fever = false;
  let krakenPhase = 0, krakenGfx;

  const antennaPos = (scene) => ({ x: scene.scale.width / 2, y: scene.scale.height * 0.9 });
  // the beat: a shared external metronome, NOT a self-resetting personal
  // cooldown — 'on beat' is something you sync to, so timing is a real skill
  const BEAT_MS = 520;        // ~115 BPM
  const HIT_WINDOW = 125;     // ±ms around a beat that counts as on-beat
  const TAP_DEBOUNCE = 130;   // physical debounce only; never eats a real beat tap
  const MAX_ENEMIES = 22;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function beatInfo(now) {
    const ph = ((now % BEAT_MS) + BEAT_MS) % BEAT_MS;
    const toBeat = Math.min(ph, BEAT_MS - ph);
    return { toBeat, onBeat: toBeat <= HIT_WINDOW, frac: ph / BEAT_MS };
  }

  function tex(scene, kind, K) {
    const [w, h] = SIZES[kind];
    return canvasTex(scene, `at-${kind}`, w * K, h * K, PAINT[kind]);
  }

  function destroyEnemy(e) {
    const i = enemies.indexOf(e);
    if (i >= 0) enemies.splice(i, 1);
    e.spr.destroy();
    if (e.glow) e.glow.destroy();
  }

  function spawnEnemy(scene, K, originX) {
    if (enemies.length >= MAX_ENEMIES) return;
    const W = scene.scale.width, H = scene.scale.height;
    const elapsed = (scene.time.now - t0) / 1000;
    // pick the base threat first, so every world keeps its fast notes and
    // heavy 2-hit blimps — then layer the world flavour on top additively
    let kind = 'drone';
    const roll = Math.random();
    if (roll < 0.2 && elapsed > 12) kind = 'blimp';
    else if (roll < 0.5) kind = 'note';
    // relay parrots and volcano embers convert only base drones, so the
    // rest of the roster (notes, blimps) still shows up
    if (cfg.relay && kind === 'drone' && Math.random() < 0.55) kind = 'parrot';
    if (cfg.embers && kind === 'drone' && Math.random() < 0.55) kind = 'ember';
    const [w, h] = SIZES[kind];
    const fromSide = cfg.dual && Math.random() < 0.5;
    let x, y, vx, vy;
    const ap = antennaPos(scene);
    if (fromSide) {
      const left = Math.random() < 0.5;
      x = left ? -w * K : W + w * K;
      y = H * (0.16 + Math.random() * 0.4);
    } else {
      x = originX != null
        ? clamp(originX + (Math.random() * 2 - 1) * W * 0.06, w * K, W - w * K)
        : W * (0.1 + Math.random() * 0.8);
      y = -h * K;
    }
    // a real advance toward the antenna (so the threat is genuine); speed
    // ramps with elapsed time so late waves genuinely threaten to overrun
    const base = H * 0.088 * cfg.speed * (1 + Math.min(0.9, elapsed / 120)) * (fever ? 1.2 : 1);
    const sp = base * (kind === 'note' ? 1.5 : kind === 'ember' ? 1.6 : kind === 'blimp' ? 0.7 : 1);
    const dx = ap.x - x, dy = ap.y - y, d = Math.hypot(dx, dy) || 1;
    vx = (dx / d) * sp; vy = (dy / d) * sp;
    const spr = scene.add.image(x, y, tex(scene, kind, K)).setDepth(20);
    // dark worlds: a light halo so a low-contrast drone still reads
    let glow = null;
    if ((cfg.cave || cfg.wind) && kind !== 'ember') {
      glow = scene.add.image(x, y, 'fx-dot').setTint(0xbfe0ff).setBlendMode('ADD')
        .setAlpha(0.4).setDepth(19).setScale((w + h) / 2 * K / 42 * 1.7);
    }
    // per-enemy lateral drift keeps a wave spread out during descent, so a
    // single memorised tap point never sweeps the whole field
    const drift = cfg.wind ? 42 : 15;
    enemies.push({ spr, glow, kind, vx, vy, hp: HP[kind], r: (w + h) / 4 * K * 0.9, wob: Math.random() * 7, drift });
  }

  function spawnGolden(scene, K) {
    const W = scene.scale.width, H = scene.scale.height;
    const left = Math.random() < 0.5;
    const spr = scene.add.image(left ? -40 * K : W + 40 * K, H * (0.2 + Math.random() * 0.3),
      tex(scene, 'boombox', K)).setDepth(21);
    const halo = scene.add.image(spr.x, spr.y, 'fx-dot').setTint(0xffd24a).setBlendMode('ADD').setScale(1.8 * K).setAlpha(0.5).setDepth(20);
    golden = { spr, halo, vx: (left ? 1 : -1) * H * 0.06, r: 30 * K };
  }

  function spawnBottle(scene, K) {
    const W = scene.scale.width, H = scene.scale.height;
    const seaY = scene._seaY ?? H * 0.66;
    const left = Math.random() < 0.5;
    const baseY = seaY - (24 + Math.random() * 46) * K;
    const spr = scene.add.image(left ? -30 * K : W + 30 * K, baseY, tex(scene, 'bottle', K)).setDepth(18);
    bottles.push({ spr, vx: (left ? 1 : -1) * H * 0.05, r: 22 * K, baseY });
  }

  function firePulse(scene, K, x, y, kind, opts = {}) {
    const W = scene.scale.width;
    const onBeat = opts.onBeat !== false;
    const maxR = opts.maxR != null ? opts.maxR
      : kind === 'bass' ? W * 1.1
      : kind === 'secondary' ? 82 * K * cfg.secondary
      : 125 * K;
    pulses.push({ x, y, r: 6 * K, maxR, hit: new Set(), kind, charges: !!opts.charges, born: scene.time.now });
    if (kind === 'secondary') return;
    const col = kind === 'bass' ? 0xffd24a : onBeat ? cfg.accent : 0x8a9ac8;
    shockRing(scene, x, y, col, maxR * 0.7);
    api.sfx(kind === 'bass' ? 'pr' : onBeat ? 'log' : 'tap');
    if (kind === 'bass') {
      flash(scene, cfg.accent, 140, 0.4);
      shake(scene, 0.016, 240);
      zoomPunch(scene, 1.08, 300);
    }
    // skull cave: an on-beat pulse echoes off the walls a beat later
    if (cfg.echo && kind === 'beat' && onBeat) {
      scene.time.delayedCall(220, () => {
        if (!scene.scene.isActive()) return;
        for (const ex of [W * 0.06, W * 0.94]) {
          pulses.push({ x: ex, y, r: 6 * K, maxR: 110 * K, hit: new Set(), kind: 'secondary', charges: false, born: scene.time.now });
        }
      });
    }
  }

  function popEnemy(scene, K, e, chainIdx, pl) {
    const ex = e.spr.x, ey = e.spr.y;
    let gain = PTS[e.kind] + Math.min(chainIdx, 12) * 3;
    // placement reward: popping near the pulse's own centre pays a bonus,
    // so aiming into the heart of a cluster beats blanket-tapping one spot
    if (pl) {
      const d = Math.hypot(ex - pl.x, ey - pl.y);
      const near = 1 - Math.min(1, d / (pl.maxR || 1));
      gain += Math.round(PTS[e.kind] * 0.5 * near * near);
    }
    api.score(gain);
    // the note climbs with the LIVE chain and resets when the cascade ends,
    // so each fresh chain sings up the scale again instead of flat-lining
    api.note(Math.min(1 + chainIdx, 14));
    floatScore(scene, ex, ey - 14 * K, `+${gain}`, chainIdx > 2 ? '#fff0c8' : '#ffd24a', (14 + Math.min(10, chainIdx * 2)) * K);
    burst(scene, ex, ey, cfg.accent, { n: 12, speed: 260 * K, scale: 0.5 * K });
    api.haptic(6);
    destroyEnemy(e);
    // the chain: each pop rings its own pulse, inheriting whether the
    // originating tap was earned (on-beat, non-bass) so cascades stay honest
    const earns = pl ? pl.charges : false;
    firePulse(scene, K, ex, ey, 'secondary', { charges: earns });
    chain++;
    chainResetAt = scene.time.now + 260;
    if (chain === 4) banner(scene, 'CHAIN ×4', '#ffd24a', 26 * K);
    if (chain === 8) { banner(scene, `CHAIN ×${chain}`, '#ff9a3c', 30 * K); slowmo(scene, 0.4, 320); }
    if (chain >= 8 && chain % 4 === 0) banner(scene, `CHAIN ×${chain}`, '#ff9a3c', 30 * K);
    // charge the DROP meter — ONLY from earned on-beat offense, never from
    // the bass drop's own kills (so the ultimate can't self-rearm), and
    // faster when the streak is hot so chaining accelerates the next drop
    if (earns && combo < 1) {
      combo = Math.min(1, combo + 0.04 + Math.min(chainIdx, 10) * 0.006);
      if (combo >= 1) { glyphBanner(scene, 'DROP READY', '#ffd24a', 26 * K); api.sfx('objDone'); }
    }
  }

  function hitEnemy(scene, K, e, chainIdx, pl) {
    e.hp--;
    if (e.hp <= 0) { popEnemy(scene, K, e, chainIdx, pl); return; }
    // survived (blimp): flash + shove
    squash(scene, e.spr, 'x');
    burst(scene, e.spr.x, e.spr.y, cfg.accent, { n: 5, speed: 160 * K, scale: 0.35 * K });
    api.sfx('tap');
  }

  function catchGolden(scene, K, pl) {
    const W = scene.scale.width;
    const gx = golden.spr.x, gy = golden.spr.y;
    // variable-ratio tiers so there is a real near-miss/big-hit thrill,
    // scaled by the live chain, and the Treasure world spikes it further
    const tier = Math.random();
    let base = tier < 0.6 ? 60 : tier < 0.9 ? 150 : 320;
    if (cfg.jackpot) base = Math.round(base * (Math.random() < 0.35 ? 3 : 1.7));
    const val = Math.round(base * (1 + Math.min(chain, 12) * 0.12));
    api.score(val);
    const big = val >= 400;
    glyphBanner(scene, `TREASURE +${val}`, big ? '#fff0c8' : '#ffe9a0', (24 + Math.min(14, val / 40)) * K);
    if (big) { flash(scene, 0xffd24a, 170, 0.42); shake(scene, 0.014, 220); slowmo(scene, 0.5, 260); }
    collectTo(scene, gx, gy, W - 30 * K, 20 * K, 0xffd24a, 18);
    burst(scene, gx, gy, 0xffd24a, { n: big ? 34 : 24, speed: 360 * K, scale: 0.6 * K });
    flash(scene, 0xffd24a, 120, 0.3);
    api.sfx('pr'); api.haptic([10, 20, 30]);
    golden.spr.destroy(); golden.halo.destroy(); golden = null;
    goldenAt = scene.time.now + cfg.goldEvery[0] * 1000 + Math.random() * (cfg.goldEvery[1] - cfg.goldEvery[0]) * 1000;
  }

  function catchBottle(scene, K, b) {
    const restored = signal < 100;
    signal = Math.min(100, signal + 12);
    api.score(30);
    floatScore(scene, b.spr.x, b.spr.y - 16 * K, restored ? 'MESSAGE +30 ♥' : 'MESSAGE +30', '#7ad8c4', 16 * K);
    burst(scene, b.spr.x, b.spr.y, 0x7ad8c4, { n: 14, speed: 240 * K, scale: 0.45 * K });
    api.sfx('objDone'); api.haptic(8);
    b.spr.destroy();
    const i = bottles.indexOf(b); if (i >= 0) bottles.splice(i, 1);
  }

  function drop(scene, K, x, y) {
    const now = scene.time.now;
    if (dead) return;
    if (now - lastTapAt < TAP_DEBOUNCE) return;   // debounce only — a deliberate on-beat tap is never eaten
    lastTapAt = now;
    // first tap starts the round AND the difficulty clock, so the gentle
    // opening is measured from first play, not from scene-load / intro dwell
    if (!started) {
      started = true;
      t0 = now;
      spawnAt = now + 700;
      goldenAt = now + cfg.goldEvery[0] * 1000;
      if (cfg.bottles) bottleAt = now + 3500;
      if (cfg.wind) stormFlashAt = now + 4000;
    }
    const { onBeat } = beatInfo(now);
    // charged: unleash the bass drop on ANY tap so a tired thumb never
    // loses a meter it worked for (and the timer auto-cashes it at GOLD RUSH)
    if (combo >= 1) {
      combo = 0;
      glyphBanner(scene, 'BASS DROP', '#ffd24a', 32 * K);
      firePulse(scene, K, x, y, 'bass', { charges: false, onBeat: true });
      api.haptic([14, 40, 14]);
      return;
    }
    if (onBeat) {
      firePulse(scene, K, x, y, 'beat', { maxR: 125 * K, charges: true, onBeat: true });
      floatScore(scene, x, y - 10 * K, 'ON BEAT', '#ffe9a0', 13 * K);
      api.haptic(9);
    } else {
      // off-beat still fires a real (smaller) pulse right under the thumb, so
      // panic-tapping always defends — it just earns no chain-meter, so
      // timing pays without the input ever feeling ignored
      firePulse(scene, K, x, y, 'beat', { maxR: 84 * K, charges: false, onBeat: false });
      floatScore(scene, x, y - 6 * K, '·', '#8a9ac8', 12 * K);
      api.haptic(3);
    }
  }

  // ——— per-world scenery: distinct silhouettes, not just a sky tint ———
  function drawWorldScenery(scene, K, W, H, seaY) {
    canvasTex(scene, 'at-scene', W, H, (c) => {
      if (cfg.cave) {
        // Skull Cave Studio: cave-mouth framing + stalactites + eye sockets
        c.fillStyle = 'rgba(10,10,20,.92)';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(W * 0.16, 0);
        c.quadraticCurveTo(W * 0.05, H * 0.4, W * 0.13, H); c.lineTo(0, H); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(W, 0); c.lineTo(W * 0.84, 0);
        c.quadraticCurveTo(W * 0.95, H * 0.4, W * 0.87, H); c.lineTo(W, H); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, H * 0.05);
        c.quadraticCurveTo(W * 0.5, H * 0.24, 0, H * 0.05); c.closePath(); c.fill();
        c.fillStyle = 'rgba(20,24,40,.95)';
        for (let i = 1; i < 8; i++) {
          const x = W * (i / 8), dep = H * (0.05 + ((i * 37) % 5) / 5 * 0.09);
          c.beginPath(); c.moveTo(x - W * 0.02, H * 0.03); c.lineTo(x + W * 0.02, H * 0.03); c.lineTo(x, dep); c.closePath(); c.fill();
        }
        c.fillStyle = 'rgba(174,240,255,.45)';
        c.beginPath(); c.arc(W * 0.08, H * 0.2, W * 0.022, 0, 7); c.fill();
        c.beginPath(); c.arc(W * 0.92, H * 0.2, W * 0.022, 0, 7); c.fill();
      } else if (cfg.embers) {
        // Volcano Lighthouse: erupting cone with a lava-mouth glow + runs
        const vx = W * 0.78, base = seaY;
        const g = c.createLinearGradient(0, base - H * 0.34, 0, base);
        g.addColorStop(0, '#2a0c10'); g.addColorStop(1, '#5a1c14');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(vx - W * 0.22, base); c.lineTo(vx - W * 0.05, base - H * 0.32);
        c.lineTo(vx + W * 0.05, base - H * 0.32); c.lineTo(vx + W * 0.24, base); c.closePath(); c.fill();
        const lg = c.createRadialGradient(vx, base - H * 0.32, 1, vx, base - H * 0.32, W * 0.16);
        lg.addColorStop(0, 'rgba(255,220,120,.95)'); lg.addColorStop(0.5, 'rgba(255,120,40,.6)'); lg.addColorStop(1, 'rgba(255,60,20,0)');
        c.fillStyle = lg; c.beginPath(); c.arc(vx, base - H * 0.32, W * 0.16, 0, 7); c.fill();
        c.strokeStyle = 'rgba(255,120,40,.7)'; c.lineWidth = W * 0.012; c.lineCap = 'round';
        c.beginPath(); c.moveTo(vx - W * 0.02, base - H * 0.3); c.lineTo(vx - W * 0.08, base - H * 0.06); c.stroke();
        c.beginPath(); c.moveTo(vx + W * 0.03, base - H * 0.3); c.lineTo(vx + W * 0.1, base - H * 0.08); c.stroke();
      } else if (cfg.relay) {
        // Parrot Congress: jungle canopy, hanging vines, a shoreline palm
        c.fillStyle = 'rgba(10,60,40,.85)';
        for (let i = 0; i < 6; i++) {
          const x = W * (0.08 + i * 0.17);
          c.beginPath(); c.arc(x, -H * 0.02, W * (0.1 + ((i * 53) % 4) / 4 * 0.05), 0, 7); c.fill();
        }
        c.strokeStyle = 'rgba(20,80,50,.7)'; c.lineWidth = W * 0.008;
        for (let i = 0; i < 7; i++) {
          const x = W * (0.06 + i * 0.14);
          c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + W * 0.02, H * 0.1, x, H * 0.16); c.stroke();
        }
        const px = W * 0.12, base = seaY;
        c.strokeStyle = 'rgba(40,30,20,.8)'; c.lineWidth = W * 0.02; c.lineCap = 'round';
        c.beginPath(); c.moveTo(px, base); c.quadraticCurveTo(px - W * 0.03, base - H * 0.16, px + W * 0.02, base - H * 0.2); c.stroke();
        c.fillStyle = 'rgba(30,120,60,.8)';
        for (const a of [-0.9, -0.3, 0.3, 0.9]) {
          c.beginPath(); c.moveTo(px + W * 0.02, base - H * 0.2);
          c.quadraticCurveTo(px + Math.cos(a - 1.57) * W * 0.1, base - H * 0.2 + Math.sin(a - 1.57) * H * 0.08,
            px + Math.cos(a - 1.57) * W * 0.16, base - H * 0.18);
          c.closePath(); c.fill();
        }
      } else if (cfg.kraken) {
        // Kraken's Turntables: a giant vinyl-disc moon with grooves
        const dx = W * 0.8, dy = H * 0.16, dr = W * 0.16;
        c.fillStyle = 'rgba(20,10,40,.9)'; c.beginPath(); c.arc(dx, dy, dr, 0, 7); c.fill();
        c.strokeStyle = 'rgba(140,110,232,.5)'; c.lineWidth = W * 0.004;
        for (let i = 1; i < 6; i++) { c.beginPath(); c.arc(dx, dy, dr * i / 6, 0, 7); c.stroke(); }
        c.fillStyle = 'rgba(200,180,255,.8)'; c.beginPath(); c.arc(dx, dy, dr * 0.14, 0, 7); c.fill();
      } else if (cfg.bottles) {
        // Message Bay: a mail buoy + distant bobbing bottles on the water
        c.fillStyle = 'rgba(200,60,60,.7)';
        c.fillRect(W * 0.82, seaY - H * 0.08, W * 0.03, H * 0.08);
        c.beginPath(); c.arc(W * 0.835, seaY - H * 0.09, W * 0.028, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,240,200,.9)';
        c.font = `700 ${Math.round(H * 0.02)}px sans-serif`; c.textAlign = 'center';
        c.fillText('✉', W * 0.835, seaY - H * 0.082);
        c.fillStyle = 'rgba(122,216,196,.55)';
        for (const bx of [0.2, 0.34, 0.6, 0.72]) {
          c.save(); c.translate(W * bx, seaY - H * 0.01); c.rotate(0.5);
          c.beginPath(); c.roundRect(-W * 0.012, -H * 0.02, W * 0.024, H * 0.04, W * 0.008); c.fill(); c.restore();
        }
      } else if (cfg.wind) {
        // Hurricane Dancefloor: tilted stormfront bands sweeping the sky
        c.fillStyle = 'rgba(30,40,60,.5)';
        for (let i = 0; i < 5; i++) {
          c.save(); c.translate(0, H * (0.1 + i * 0.06)); c.rotate(-0.12);
          c.fillRect(-W * 0.2, 0, W * 1.4, H * 0.02); c.restore();
        }
      } else if (cfg.jackpot) {
        // Treasure Antenna: a glowing gold hoard mounded on the far shore
        const gx = W * 0.82, base = seaY;
        const g = c.createRadialGradient(gx, base, 2, gx, base, W * 0.2);
        g.addColorStop(0, 'rgba(255,220,120,.8)'); g.addColorStop(1, 'rgba(255,180,60,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(gx, base, W * 0.2, H * 0.05, 0, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,210,90,.9)';
        for (const [ox, oy] of [[-0.05, 0], [0, -0.02], [0.05, 0], [-0.02, -0.04], [0.03, -0.04]]) {
          c.beginPath(); c.arc(gx + W * ox, base - H * oy, W * 0.02, 0, 7); c.fill();
        }
      } else {
        // Cannon Deck (wreck): a broken galleon hull + leaning mast
        c.fillStyle = 'rgba(30,20,14,.8)';
        const hx = W * 0.76, base = seaY;
        c.beginPath(); c.moveTo(hx - W * 0.18, base - H * 0.02);
        c.quadraticCurveTo(hx, base + H * 0.05, hx + W * 0.18, base - H * 0.02);
        c.lineTo(hx + W * 0.14, base - H * 0.09); c.lineTo(hx - W * 0.14, base - H * 0.09); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(40,28,18,.85)'; c.lineWidth = W * 0.014; c.lineCap = 'round';
        c.beginPath(); c.moveTo(hx, base - H * 0.08); c.lineTo(hx + W * 0.06, base - H * 0.26); c.stroke();
        c.fillStyle = 'rgba(120,90,60,.5)';
        c.beginPath(); c.moveTo(hx + W * 0.02, base - H * 0.12); c.lineTo(hx + W * 0.05, base - H * 0.24);
        c.lineTo(hx - W * 0.03, base - H * 0.16); c.closePath(); c.fill();
      }
    });
    scene.add.image(0, 0, 'at-scene').setOrigin(0).setDepth(-60);
  }

  // ——— backdrop ———
  function drawBackdrop(scene, K) {
    const W = scene.scale.width, H = scene.scale.height;
    paintSky(scene, cfg.sky);
    bloomCamera(scene);
    vignette(scene, 0.4, 0.78);
    // horizon adapts to tall phones so the play space fills the screen
    const seaY = H * (H > W * 1.45 ? 0.6 : 0.68);
    scene._seaY = seaY;
    // a lighthouse island tucked in the far background, out of the lane
    canvasTex(scene, 'at-isle', W, H, (c) => {
      c.fillStyle = 'rgba(30,40,66,.5)';
      c.beginPath(); c.ellipse(W * 0.16, seaY, W * 0.12, H * 0.03, 0, Math.PI, 0); c.fill();
      const vx = W * 0.16, vw = W * 0.07, base = seaY;
      c.fillStyle = 'rgba(26,30,50,.8)';
      c.beginPath();
      c.moveTo(vx - vw, base); c.lineTo(vx - vw * 0.3, base - H * 0.08);
      c.lineTo(vx + vw * 0.3, base - H * 0.08); c.lineTo(vx + vw, base); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,220,150,.5)';
      c.fillRect(vx - W * 0.01, base - H * 0.1, W * 0.02, H * 0.02);
    });
    scene.add.image(0, 0, 'at-isle').setOrigin(0).setDepth(-70);
    drawWorldScenery(scene, K, W, H, seaY);
    celestial(scene, W * 0.8, H * 0.14, 22 * K,
      cfg.cave ? 0xaef0ff : cfg.wind ? 0x9cb0c8 : 0xfff0c8, { crescent: cfg.cave || cfg.kraken, depth: -88 });
    driftClouds(scene, {
      n: cfg.wind ? 4 : 2, tint: cfg.wind ? 0x3c4a5c : 0xffffff,
      alpha: cfg.wind ? 0.7 : 0.45, yBand: [0.04, 0.2], depth: -76, speed: cfg.wind ? 44 : 9,
    });
    ambientMotes(scene, cfg.accent, { alpha: 0.35 });
    if (cfg.embers) {
      scene.add.particles(0, 0, 'fx-dot', {
        x: { min: 0, max: W }, y: -10, speedY: { min: 30 * K, max: 80 * K },
        scale: { start: 0.3 * K, end: 0 }, tint: 0xff7a3c, blendMode: 'ADD',
        lifespan: 4000, frequency: 320, advance: 4000,
      }).setDepth(-30);
    }
    if (cfg.wind) {
      // driving rain — decorative, changes no game state
      scene.add.particles(0, 0, 'fx-dot', {
        x: { min: -W * 0.1, max: W }, y: -10,
        speedY: { min: 320 * K, max: 480 * K }, speedX: { min: 70 * K, max: 130 * K },
        scale: 0.1 * K, tint: 0x9fc0e0, alpha: 0.4,
        lifespan: 1400, frequency: 45, advance: 1400,
      }).setDepth(-20);
    }
    // the sea
    seaGfx = scene.add.graphics().setDepth(5);
    // the radio tower — your ward
    const ap = antennaPos(scene);
    scene.add.rectangle(ap.x, ap.y + H * 0.05, W * 1.2, H * 0.12, 0x0c1420, 0.6).setDepth(6);
    antennaImg = scene.add.image(ap.x, ap.y, tex(scene, 'antenna', K * 1.4)).setOrigin(0.5, 1).setDepth(7);
    scene._lampY = ap.y - SIZES.antenna[1] * 1.4 * K * 0.9;
    lamp = scene.add.image(ap.x, scene._lampY, 'fx-dot').setTint(0xff5d5d).setBlendMode('ADD').setScale(1.2 * K).setDepth(8);
    // bar legends so both meters are self-explaining at a glance
    scene.add.text(W * 0.25, 2 * K, 'SIGNAL', {
      fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: `${Math.round(8 * K)}px`, color: '#cfe6ff',
    }).setDepth(41).setAlpha(0.85);
    scene.add.text(W * 0.2, H - 22 * K, 'DROP', {
      fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: `${Math.round(8 * K)}px`, color: '#ffe9a0',
    }).setDepth(41).setAlpha(0.85);
  }

  return {
    // Arcade physics present but unused for bodies — we move sprites by
    // hand. Declared so the overlay's physics config is satisfied; nothing
    // here can be flung by a solver, so nothing can play itself.
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },

    fever(scene) {
      fever = true;
      // GOLD RUSH cash-out: auto-detonate a charged DROP as a final bass
      // pulse so the hard stop never eats a meter the player earned
      const s = scene || gameScene;
      if (!s || !started || dead || combo < 1) return;
      const K = unit(s);
      const ap = antennaPos(s);
      combo = 0;
      glyphBanner(s, 'GOLD RUSH DROP', '#ffd24a', 30 * K);
      firePulse(s, K, ap.x, s._lampY ?? ap.y - 120 * K, 'bass', { charges: false, onBeat: true });
      api.haptic([14, 40, 14]);
    },

    create() {
      const scene = this;
      gameScene = scene;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      ensureFx(scene);
      drawBackdrop(scene, K);
      pulseGfx = scene.add.graphics().setDepth(30).setBlendMode(P.BlendModes.ADD);
      meterGfx = scene.add.graphics().setDepth(40);
      if (cfg.kraken) krakenGfx = scene.add.graphics().setDepth(9);

      scene.input.on('pointerdown', (p) => drop(scene, K, p.x, p.y));

      // pre-start: a calm sea and a slow "tap to begin" pulse on the lamp.
      // Timers anchor on the first TAP (in drop), and nothing spawns or
      // scores until then, so an untouched screen stays silent.
    },

    update(t, dtMs) {
      const scene = this;
      const dt = Math.min(dtMs, 64) / 1000;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      const now = scene.time.now;
      const seaY = scene._seaY ?? H * 0.66;
      const ap = antennaPos(scene);
      const bi = beatInfo(now);

      // living sea
      seaGfx.clear();
      seaGfx.fillStyle(cfg.sea, 1);
      seaGfx.beginPath(); seaGfx.moveTo(0, seaY);
      for (let x = 0; x <= W; x += W / 16) seaGfx.lineTo(x, seaY + Math.sin(now / 700 + x / (40 * K)) * 4 * K);
      seaGfx.lineTo(W, H); seaGfx.lineTo(0, H); seaGfx.closePath(); seaGfx.fillPath();
      seaGfx.fillStyle(0xffffff, 0.06);
      for (let i = 0; i < 5; i++) seaGfx.fillRect((i * W / 5 + now / 40) % W, seaY + (10 + i * 14) * K, 46 * K, 2 * K);

      // the broadcast lamp: green while signal holds, redder as it drops.
      // Once playing it PULSES ON THE BEAT so the lamp is your metronome.
      const sig = Math.max(0, signal) / 100;
      lamp.setTint(sig > 0.5 ? 0x5fe89a : sig > 0.25 ? 0xffd24a : 0xff5d5d);
      const beatPop = started ? 0.35 * Math.max(0, 1 - bi.toBeat / HIT_WINDOW) : 0.12 * Math.sin(now / 700);
      lamp.setScale((1 + beatPop) * K * 1.3);

      // ——— dead: freeze the sim entirely so nothing runs behind the death
      // screen (the overlay draws the OFF AIR result on top) ———
      if (dead) { drawPulses(scene, K); drawMeter(scene, K); return; }

      // ——— pre-start: dead air, nothing advances ———
      if (!started) { drawPulses(scene, K); drawMeter(scene, K); return; }

      // ——— spawn ———
      if (now >= spawnAt) {
        const elapsed = (now - t0) / 1000;
        // real clusters (so chains have something to cascade through) mixed
        // with spread singles
        const cluster = enemies.length < MAX_ENEMIES - 3 && Math.random() < Math.min(0.55, 0.25 + elapsed / 160);
        if (cluster) {
          const cx = W * (0.18 + Math.random() * 0.64);
          const cn = 2 + (Math.random() < 0.5 ? 1 : 0) + (fever ? 1 : 0);
          for (let i = 0; i < cn; i++) scene.time.delayedCall(i * 90, () => scene.scene.isActive() && !dead && spawnEnemy(scene, K, cx));
        } else {
          let n = 1 + (Math.random() < 0.3 ? 1 : 0) + (elapsed > 60 ? 1 : 0);
          if (fever) n += 1;
          for (let i = 0; i < n; i++) scene.time.delayedCall(i * 120, () => scene.scene.isActive() && !dead && spawnEnemy(scene, K));
        }
        spawnAt = now + Math.max(520, 1400 - elapsed * 5) / (cfg.spawn * (fever ? 1.3 : 1));
      }
      // golden boombox
      if (!golden && now >= goldenAt) spawnGolden(scene, K);
      if (golden) {
        golden.spr.x += golden.vx * dt;
        golden.spr.y += Math.sin(now / 400) * 12 * K * dt;
        golden.halo.setPosition(golden.spr.x, golden.spr.y);
        if (golden.spr.x < -60 * K || golden.spr.x > W + 60 * K) {
          golden.spr.destroy(); golden.halo.destroy(); golden = null;
          goldenAt = now + cfg.goldEvery[0] * 1000 + Math.random() * (cfg.goldEvery[1] - cfg.goldEvery[0]) * 1000;
        }
      }
      // Message Bay healing bottles
      if (cfg.bottles && now >= bottleAt && bottles.length < 3) {
        spawnBottle(scene, K);
        bottleAt = now + 5200 + Math.random() * 4200;
      }
      for (const b of [...bottles]) {
        b.spr.x += b.vx * dt;
        b.spr.y = b.baseY + Math.sin(now / 500 + b.spr.x / (60 * K)) * 5 * K;
        b.spr.setAngle(Math.sin(now / 600 + b.spr.x / 80) * 8);
        if (b.spr.x < -50 * K || b.spr.x > W + 50 * K) { b.spr.destroy(); bottles.splice(bottles.indexOf(b), 1); }
      }
      // hurricane lightning — decorative flash
      if (cfg.wind && now >= stormFlashAt) {
        stormFlashAt = now + 5000 + Math.random() * 6000;
        flash(scene, 0xdfe8ff, 110, 0.22);
      }

      // kraken tentacle sweep
      if (cfg.kraken && krakenGfx) {
        krakenPhase += dt;
        krakenGfx.clear();
        const kx = W / 2 + Math.sin(krakenPhase * 0.6) * W * 0.4;
        const top = seaY - (Math.sin(krakenPhase * 0.9) * 0.5 + 0.5) * H * 0.3;
        krakenGfx.fillStyle(0x6a3a9c, 0.85);
        krakenGfx.beginPath(); krakenGfx.moveTo(kx - 20 * K, seaY);
        krakenGfx.lineTo(kx - 8 * K, top); krakenGfx.lineTo(kx + 8 * K, top); krakenGfx.lineTo(kx + 20 * K, seaY);
        krakenGfx.closePath(); krakenGfx.fillPath();
      }

      // ——— advance enemies ———
      if (now > chainResetAt) chain = 0;
      for (const e of [...enemies]) {
        e.spr.x += e.vx * dt + Math.sin(now / 650 + e.wob) * e.drift * K * dt;
        e.spr.y += e.vy * dt;
        e.spr.setAngle(Math.sin(now / 300 + e.wob) * 6);
        if (e.glow) e.glow.setPosition(e.spr.x, e.spr.y);
        // reached the antenna: cut the signal, cost points. Signal is your
        // life — let too many through and the station goes OFF AIR.
        if (Math.hypot(e.spr.x - ap.x, e.spr.y - ap.y) < 46 * K) {
          signal = Math.max(0, signal - 15);
          api.score(-6);
          floatScore(scene, ap.x, ap.y - 60 * K, 'SIGNAL −15', '#ff5d7a', 15 * K);
          burst(scene, e.spr.x, e.spr.y, 0xff5d5d, { n: 10, speed: 220 * K, scale: 0.45 * K });
          shake(scene, 0.012, 150);
          api.haptic([12, 30, 12]);
          api.sfx('log');
          destroyEnemy(e);
          if (signal <= 0 && !dead) { dead = true; api.die('OFF AIR'); }
          continue;
        }
        if (e.spr.y > H + 60 * K || e.spr.x < -80 * K || e.spr.x > W + 80 * K) destroyEnemy(e);
      }
      // signal recovers gently between hits, but never fast enough to make
      // the threat idle — pressure is real
      signal = Math.min(100, signal + dt * 2.4);
      if (signal <= 25 && !warnedLow) { warnedLow = true; glyphBanner(scene, 'SIGNAL LOW!', '#ff5d7a', 24 * K); api.sfx('log'); }
      if (signal > 40) warnedLow = false;

      // ——— pulses expand and sweep (always — the old jam that disabled
      // offense in the panic window right after a hit is gone) ———
      for (const pl of [...pulses]) {
        pl.r += (pl.kind === 'bass' ? W * 1.6 : 520 * K) * dt;
        for (const e of [...enemies]) {
          if (pl.hit.has(e)) continue;
          const d = Math.hypot(e.spr.x - pl.x, e.spr.y - pl.y);
          if (d <= pl.r && d <= pl.maxR + e.r) {
            pl.hit.add(e);
            hitEnemy(scene, K, e, chain, pl);
          }
        }
        // golden caught by any pulse
        if (golden && !pl.hit.has('gold')) {
          const d = Math.hypot(golden.spr.x - pl.x, golden.spr.y - pl.y);
          if (d <= pl.r && d <= pl.maxR + golden.r) { pl.hit.add('gold'); catchGolden(scene, K, pl); }
        }
        // Message Bay bottles caught by any pulse
        if (bottles.length) {
          for (const b of [...bottles]) {
            if (pl.hit.has(b)) continue;
            const d = Math.hypot(b.spr.x - pl.x, b.spr.y - pl.y);
            if (d <= pl.r && d <= pl.maxR + b.r) { pl.hit.add(b); catchBottle(scene, K, b); }
          }
        }
        if (pl.r >= pl.maxR) pulses.splice(pulses.indexOf(pl), 1);
      }

      drawPulses(scene, K);
      drawMeter(scene, K);
    },
  };

  function drawPulses(scene, K) {
    pulseGfx.clear();
    for (const pl of pulses) {
      const a = Math.max(0, 1 - pl.r / pl.maxR);
      const col = pl.kind === 'bass' ? 0xffd24a : cfg.accent;
      pulseGfx.lineStyle((pl.kind === 'bass' ? 10 : 6) * K * (0.4 + a), col, 0.4 + a * 0.5);
      pulseGfx.strokeCircle(pl.x, pl.y, pl.r);
      if (pl.kind !== 'secondary') {
        pulseGfx.lineStyle(2 * K, 0xffffff, a * 0.5);
        pulseGfx.strokeCircle(pl.x, pl.y, pl.r);
      }
    }
    // the BEAT ring on the antenna lamp: it collapses onto the lamp exactly
    // as each beat lands, so 'tap now' is legible — and it flares gold in
    // the on-beat window so you learn the timing without reading help
    if (started && !dead) {
      const bi = beatInfo(scene.time.now);
      const lampY = scene._lampY ?? antennaPos(scene).y - 150 * K;
      const rr = (16 + (1 - bi.frac) * 42) * K;
      const hot = bi.onBeat;
      pulseGfx.lineStyle((hot ? 3.2 : 1.6) * K, hot ? 0xffe9a0 : cfg.accent, hot ? 0.9 : 0.4);
      pulseGfx.strokeCircle(antennaPos(scene).x, lampY, rr);
    }
  }

  function drawMeter(scene, K) {
    const W = scene.scale.width, H = scene.scale.height;
    meterGfx.clear();
    // SIGNAL bar — your life. Empties as jammers get through; at zero the
    // station goes off air. Green → amber → red as it falls.
    if (started) {
      const sw = W * 0.5, sx = W * 0.25, sy = 12 * K;
      const sig = Math.max(0, signal) / 100;
      meterGfx.fillStyle(0x14202c, 0.75);
      meterGfx.fillRoundedRect(sx, sy, sw, 7 * K, 3.5 * K);
      const col = sig > 0.5 ? 0x5fe89a : sig > 0.25 ? 0xffd24a : 0xff5d5d;
      meterGfx.fillStyle(col, 0.95);
      meterGfx.fillRoundedRect(sx, sy, sw * sig, 7 * K, 3.5 * K);
      if (sig <= 0.25) {
        meterGfx.lineStyle(1.6 * K, 0xff5d5d, 0.4 + 0.4 * Math.sin(scene.time.now / 120));
        meterGfx.strokeRoundedRect(sx - 2 * K, sy - 2 * K, sw + 4 * K, 11 * K, 5 * K);
      }
    }
    // DROP meter along the bottom edge — fills gold, glows when READY
    const y = H - 8 * K, w = W * 0.6, x0 = W * 0.2;
    meterGfx.fillStyle(0x14202c, 0.7);
    meterGfx.fillRoundedRect(x0, y - 3 * K, w, 6 * K, 3 * K);
    const full = combo >= 1;
    meterGfx.fillStyle(full ? 0xffd24a : cfg.accent, full ? 0.95 : 0.8);
    meterGfx.fillRoundedRect(x0, y - 3 * K, w * combo, 6 * K, 3 * K);
    if (full) {
      const pulse = 0.4 + 0.3 * Math.sin(scene.time.now / 160);
      meterGfx.lineStyle(2 * K, 0xfff0c8, pulse);
      meterGfx.strokeRoundedRect(x0 - 2 * K, y - 5 * K, w + 4 * K, 10 * K, 5 * K);
    }
  }
}

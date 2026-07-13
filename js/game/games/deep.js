// TERMINAL VELOCITY — The Abyss. You are a cast-iron dumbbell (the gym
// joke is the hero) falling into the deep. HOLD to vent and plummet —
// your thumb's x steers. RELEASE to drift. Depth is score, and speed is
// a destruction license: above threshold you smash THROUGH what's below;
// under it, obstacles bump you and bleed seconds. Every ten fathoms rings
// one pentatonic step deeper.
//
// Worlds change the physics of the deep: vent columns slam you downward,
// kelp tethers unless torn at speed, jellies steal depth unless pierced
// at terminal velocity, searchlights cap your speed, and the void is lit
// only by the light you carry — some of the lights down there are lying.
import {
  ensureFx, canvasTex, burst, shockRing, floatScore, banner, glyphBanner,
  shake, flash, hitstop, slowmo, collectTo, paintSky, ambientMotes,
  bloomCamera, vignette, darknessCone, pointLight, lit, squash, unit,
  lightShafts,
} from '../fx.js';

export const TITLE = 'Terminal Velocity';
// Measured post-tune in the richest world (reef): blind full-throttle
// ≈21/s, armor-weaving hold ≈28/s; leaner worlds run lower.
export const VERB = 'DIVE!';
export const STARS = [8, 15, 24];

export const HELP = {
  goal: 'Dive as deep as you can, because every fathom down is a point.',
  how: 'Hold to plummet and slide your thumb to steer; release to slow into a drift. At full speed you smash through wooden wreckage for bonus points, and shaving past obstacles without touching them pays a rising near-miss streak.',
  avoid: 'The red flashing slabs never break: hitting one at speed stops you dead and costs ten fathoms, so weave around them.',
};

export const WORLDS = {
  'deep-vents': {
    name: 'Hydrothermal Drop', sky: [[0, '#0c2036'], [0.6, '#0a1428'], [1, '#060a18']],
    accent: 0xff9a5c, obstacles: ['plate', 'chimney'], vents: true, density: 1.0,
  },
  'deep-whalefall': {
    name: 'Whalefall Cathedral', sky: [[0, '#122a40'], [0.6, '#0c1830'], [1, '#070c1c']],
    accent: 0xbfd8e8, obstacles: ['rib', 'plate'], density: 1.05,
  },
  'deep-market': {
    name: 'Sunken Night Market', sky: [[0, '#1c1440'], [0.6, '#120e30'], [1, '#0a081c']],
    accent: 0xffc46c, obstacles: ['canopy', 'plate'], lanterns: true, soft: true, density: 1.0,
  },
  'deep-kelp': {
    name: 'Kelp Cathedral', sky: [[0, '#0c3024'], [0.6, '#082418'], [1, '#04140e']],
    accent: 0x7ad48a, obstacles: ['plate'], kelp: true, density: 0.9,
  },
  'deep-jelly': {
    name: 'Jellyfield', sky: [[0, '#241048'], [0.6, '#180c38'], [1, '#0c0620']],
    accent: 0xff8ad0, obstacles: ['plate'], jellies: true, density: 0.9,
  },
  'deep-subs': {
    name: 'Patrol Graveyard', sky: [[0, '#14202c'], [0.6, '#0e1620'], [1, '#080c14']],
    accent: 0xaac8dc, obstacles: ['hull', 'plate'], searchlights: true, density: 1.0,
  },
  'deep-reef': {
    name: 'Coral Gauntlet', sky: [[0, '#16344c'], [0.6, '#0e2036'], [1, '#081220']],
    accent: 0xff7a8a, obstacles: ['coral', 'coral', 'plate'], density: 1.3,
  },
  'deep-void': {
    name: 'The Void', sky: [[0, '#080a16'], [0.6, '#04060e'], [1, '#020308']],
    accent: 0x8ad0ff, obstacles: ['plate', 'rib'], dark: true, anglers: true, density: 0.95,
  },
};

// ——— painters ———

const PAINT = {
  dumbbell(c, w, h) {
    // plates
    for (const px of [w * 0.14, w * 0.86]) {
      const g = c.createLinearGradient(px - w * 0.12, 0, px + w * 0.12, 0);
      g.addColorStop(0, '#3a4254'); g.addColorStop(0.5, '#6a7690'); g.addColorStop(1, '#2c3242');
      c.fillStyle = g;
      c.beginPath(); c.roundRect(px - w * 0.12, h * 0.06, w * 0.24, h * 0.88, w * 0.05); c.fill();
    }
    // bar
    const bg = c.createLinearGradient(0, h * 0.42, 0, h * 0.58);
    bg.addColorStop(0, '#8a96b0'); bg.addColorStop(0.5, '#c8d2e4'); bg.addColorStop(1, '#6a7690');
    c.fillStyle = bg;
    c.fillRect(w * 0.2, h * 0.42, w * 0.6, h * 0.16);
    // dark outline + cyan rim-light so the hero pops off the deep
    c.strokeStyle = 'rgba(6,10,18,.9)'; c.lineWidth = w * 0.02;
    for (const px of [w * 0.14, w * 0.86]) c.strokeRect(px - w * 0.12, h * 0.06, w * 0.24, h * 0.88);
    c.strokeRect(w * 0.2, h * 0.42, w * 0.6, h * 0.16);
    c.strokeStyle = 'rgba(174,240,255,.5)'; c.lineWidth = w * 0.018;
    for (const px of [w * 0.14, w * 0.86]) {
      c.beginPath(); c.moveTo(px - w * 0.1, h * 0.09); c.lineTo(px + w * 0.1, h * 0.09); c.stroke();
    }
    // determined face, sized to be seen
    c.fillStyle = '#0c1018';
    c.beginPath(); c.arc(w * 0.8, h * 0.32, w * 0.045, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.92, h * 0.32, w * 0.045, 0, 7); c.fill();
    c.strokeStyle = '#0c1018'; c.lineWidth = w * 0.035; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.78, h * 0.52); c.lineTo(w * 0.94, h * 0.49); c.stroke();
  },
  plate(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6a4a2a'); g.addColorStop(0.5, '#4a3018'); g.addColorStop(1, '#32200e');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(0, h * 0.2, w, h * 0.6, h * 0.16); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = h * 0.07;
    c.beginPath(); c.moveTo(w * 0.2, h * 0.2); c.lineTo(w * 0.2, h * 0.8); c.stroke();
    c.beginPath(); c.moveTo(w * 0.55, h * 0.2); c.lineTo(w * 0.55, h * 0.8); c.stroke();
    c.fillStyle = 'rgba(160,200,190,.5)';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(w * (0.22 + i * 0.28), h * 0.5, h * 0.06, 0, 7); c.fill(); }
  },
  rib(c, w, h) {
    c.strokeStyle = '#d8e2e8'; c.lineWidth = h * 0.34; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.04, h * 0.85); c.quadraticCurveTo(w * 0.5, -h * 0.5, w * 0.96, h * 0.85); c.stroke();
    c.strokeStyle = 'rgba(90,110,125,.5)'; c.lineWidth = h * 0.1;
    c.beginPath(); c.moveTo(w * 0.08, h * 0.8); c.quadraticCurveTo(w * 0.5, -h * 0.35, w * 0.92, h * 0.8); c.stroke();
  },
  chimney(c, w, h) {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#2c1a20'); g.addColorStop(0.5, '#4a2c30'); g.addColorStop(1, '#241418');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(w * 0.28, h); c.lineTo(w * 0.36, h * 0.08); c.lineTo(w * 0.64, h * 0.08); c.lineTo(w * 0.72, h);
    c.closePath(); c.fill();
    const v = c.createRadialGradient(w / 2, h * 0.06, 1, w / 2, h * 0.06, w * 0.2);
    v.addColorStop(0, '#ffc46c'); v.addColorStop(1, 'rgba(255,122,60,0)');
    c.fillStyle = v;
    c.beginPath(); c.ellipse(w / 2, h * 0.07, w * 0.16, h * 0.05, 0, 0, 7); c.fill();
  },
  canopy(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#c23b4e'); g.addColorStop(1, '#8c1f38');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h * 0.7);
    c.quadraticCurveTo(w * 0.5, -h * 0.3, w, h * 0.7);
    for (let i = 4; i >= 0; i--) c.arc(w * (i + 0.5) / 5, h * 0.7, w * 0.1, 0, Math.PI);
    c.closePath(); c.fill();
    c.fillStyle = '#ffd24a';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(w * (i + 0.5) / 5, h * 0.72, w * 0.035, 0, 7); c.fill(); }
  },
  hull(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3c4a56'); g.addColorStop(1, '#222c36');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(0, h * 0.16, w, h * 0.68, h * 0.34); c.fill();
    c.fillStyle = 'rgba(255,220,150,.75)';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(w * (0.2 + i * 0.2), h * 0.5, h * 0.1, 0, 7); c.fill(); }
    c.fillStyle = '#222c36';
    c.fillRect(w * 0.42, 0, w * 0.16, h * 0.3);
  },
  coral(c, w, h) {
    const cols = ['#ff7a8a', '#ff9a5c', '#e85a9c'];
    for (let i = 0; i < 5; i++) {
      c.strokeStyle = cols[i % 3]; c.lineWidth = w * 0.07; c.lineCap = 'round';
      const x = w * (0.12 + i * 0.19);
      c.beginPath(); c.moveTo(x, h);
      c.quadraticCurveTo(x + (i % 2 ? 14 : -14), h * 0.5, x + (i % 2 ? 6 : -6), h * 0.14);
      c.stroke();
      c.beginPath(); c.arc(x + (i % 2 ? 6 : -6), h * 0.12, w * 0.045, 0, 7);
      c.fillStyle = '#fff0c8'; c.fill();
    }
  },
  jelly(c, w, h) {
    const g = c.createRadialGradient(w / 2, h * 0.34, 2, w / 2, h * 0.34, w * 0.5);
    g.addColorStop(0, 'rgba(255,190,235,.95)'); g.addColorStop(0.7, 'rgba(255,138,208,.65)'); g.addColorStop(1, 'rgba(255,138,208,.15)');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h * 0.36, w * 0.42, Math.PI, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,190,235,.6)'; c.lineWidth = w * 0.035; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x = w * (0.26 + i * 0.16);
      c.beginPath(); c.moveTo(x, h * 0.38); c.quadraticCurveTo(x + (i % 2 ? 8 : -8), h * 0.66, x, h * 0.92); c.stroke();
    }
    c.fillStyle = '#5c1440';
    c.beginPath(); c.arc(w * 0.4, h * 0.3, w * 0.04, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.6, h * 0.3, w * 0.04, 0, 7); c.fill();
    c.strokeStyle = '#5c1440'; c.lineWidth = w * 0.025;
    c.beginPath(); c.arc(w * 0.5, h * 0.33, w * 0.07, 0.4, 2.7); c.stroke();
  },
  angler(c, w, h) {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#fff8d0'); g.addColorStop(0.4, '#aef0ff'); g.addColorStop(1, 'rgba(138,208,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  },
  goldplate(c, w, h) {
    PAINT.plate(c, w, h);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(255,210,74,.6)';
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  },
  lantern(c, w, h) {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#fff4d0'); g.addColorStop(0.5, '#ffc46c'); g.addColorStop(1, 'rgba(255,180,90,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#a82c20';
    c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.16, h * 0.2, 0, 0, 7); c.fill();
  },
  weed(c, w, h) {
    // canyon-wall tile (tiles vertically): rock shelves at both flanks,
    // kelp with leaves in the middle distance, coral sprigs, plankton
    for (const side of [0, 1]) {
      const jags = [0.1, 0.16, 0.08, 0.19, 0.12, 0.17, 0.09, 0.15];
      c.fillStyle = 'rgba(10,24,30,.85)';
      c.beginPath();
      c.moveTo(side * w, 0);
      for (let i = 0; i <= 8; i++) {
        const y = h * i / 8;
        const x = side ? w - w * jags[i % 8] : w * jags[i % 8];
        c.lineTo(x, y);
      }
      c.lineTo(side * w, h);
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(60,100,110,.25)';
      for (let i = 0; i < 8; i += 2) {
        const y = h * i / 8;
        const x = side ? w - w * jags[i % 8] : w * jags[i % 8];
        c.beginPath(); c.ellipse(x, y + h * 0.04, w * 0.05, h * 0.012, 0, 0, 7); c.fill();
      }
    }
    // kelp forest with leaves
    for (let i = 0; i < 7; i++) {
      const x = w * (0.16 + i * 0.11);
      const sway = (i % 2 ? 1 : -1) * w * 0.03;
      c.strokeStyle = `rgba(52,${110 + i * 8},86,.5)`; c.lineWidth = w * 0.012; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, h);
      for (let y = h; y > -h * 0.05; y -= h / 7) c.quadraticCurveTo(x + sway * ((y / h) * 2 - 1), y - h / 14, x, y - h / 7);
      c.stroke();
      c.fillStyle = `rgba(70,${130 + i * 6},96,.4)`;
      for (let y = h * 0.9; y > 0; y -= h / 6) {
        c.beginPath(); c.ellipse(x + sway, y, w * 0.028, h * 0.012, (i + y) % 2 ? 0.7 : -0.7, 0, 7); c.fill();
      }
    }
    // coral sprigs at the shelf lips
    const corals = [[0.09, 0.22, '#c2454e'], [0.88, 0.55, '#e88a3c'], [0.07, 0.78, '#b03a8c'], [0.91, 0.12, '#3aa88c']];
    for (const [fx, fy, col] of corals) {
      c.strokeStyle = col; c.globalAlpha = 0.5; c.lineWidth = w * 0.012; c.lineCap = 'round';
      for (let b = -1; b <= 1; b++) {
        c.beginPath();
        c.moveTo(w * fx, h * fy);
        c.quadraticCurveTo(w * (fx + b * 0.02), h * (fy - 0.02), w * (fx + b * 0.028), h * (fy - 0.045));
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    // plankton dust
    c.fillStyle = 'rgba(190,232,248,.28)';
    const dots = [0.13, 0.31, 0.47, 0.66, 0.81, 0.24, 0.58, 0.72, 0.39, 0.9];
    dots.forEach((fx, i) => {
      c.beginPath(); c.arc(w * fx, h * ((i * 0.103 + fx * 0.7) % 1), w * 0.004 + (i % 3) * w * 0.002, 0, 7); c.fill();
    });
  },
};

const OB = {
  //           w,   h,  breakable, points
  plate:   { w: 150, h: 34, hp: 1, pts: 15 },
  rib:     { w: 190, h: 64, hp: 1, pts: 20 },
  chimney: { w: 70,  h: 120, hp: 2, pts: 25 },
  canopy:  { w: 150, h: 70, hp: 0, pts: 0 }, // soft — never breaks, always bounces
  hull:    { w: 180, h: 60, hp: 2, pts: 25 },
  coral:   { w: 130, h: 66, hp: 1, pts: 12 },
  jelly:   { w: 92,  h: 92, hp: 0, pts: 30 },
};

export function create(P, ctx) {
  const { api, cfg } = ctx;
  let player, bubbles, speedLines, coneLight, darkMask;
  let holding = false;
  let touched = false;       // idle law: nothing scores before the first touch
  let steerX = null;
  let v = 0;                 // current descent speed, px/s
  let depth = 0;             // fathoms banked
  let depthAcc = 0;
  let noteStep = 0;
  let stun = 0;              // ms of bump-stun left
  let snag = 0;              // kelp snag ms left
  let spotted = 0;           // searchlight cap ms left
  let grazeStreak = 0;       // consecutive near-misses without a hit
  let t0 = 0;
  let fever = false;
  const obstacles = [];      // { img, kind, meta, grazed }
  const kelps = [];          // { gfx, x, phase, torn }
  const vents = [];          // { x, w, nextAt, until, col }
  const lights = [];         // searchlights { sub, angle }
  let nextOb = 0;
  let goldenAt = 0;
  let layerFar, layerNear;
  const goldDelay = () => (window.__P3_GOLD_QA ? 2500 : 30000 + Math.random() * 45000);

  const MAXV = (scene) => scene.scale.height * 1.35 * (fever ? 1.15 : 1);
  const SMASH = (scene) => MAXV(scene) * 0.55;
  const FATHOM = (scene) => scene.scale.height / 10;

  function spawnObstacle(scene, K) {
    const W = scene.scale.width, H = scene.scale.height;
    const kind = cfg.jellies && Math.random() < 0.55 ? 'jelly'
      : cfg.obstacles[Math.floor(Math.random() * cfg.obstacles.length)];
    const meta = OB[kind];
    const w = meta.w * K, h = meta.h * K;
    const x = Math.random() * (W - w) + w / 2;
    const img = scene.add.image(x, H + h, canvasTex(scene, `dp-${kind}`, w, h, PAINT[kind])).setDepth(10);
    lit(img);
    if (kind === 'jelly') {
      scene.tweens.add({
        targets: img, scaleX: 1.06, scaleY: 0.92, duration: 700 + Math.random() * 300,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    // bedrock: past the opening seconds, a growing share of the debris is
    // armored — no speed smashes it, so full throttle stops being free.
    // Armored slabs run wide: they are walls you READ and steer around,
    // not bumps you shrug through
    const elapsed = (scene.time.now - t0) / 1000;
    const armored = kind !== 'jelly' && kind !== 'canopy' && elapsed > 6
      && Math.random() < Math.min(0.45, 0.18 + elapsed / 240);
    let aw = w;
    if (armored) {
      img.setTint(0xff8a8a);
      img.setScale(1.35, 1);
      aw = w * 1.35;
      scene.tweens.add({ targets: img, alpha: 0.72, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    obstacles.push({ img, kind, meta, hp: meta.hp, grazed: false, w: aw, h, armored });
  }

  function spawnAngler(scene, K) {
    const W = scene.scale.width, H = scene.scale.height;
    const x = Math.random() * W * 0.8 + W * 0.1;
    const img = scene.add.image(x, H + 40 * K, canvasTex(scene, 'dp-angler', 56 * K, 56 * K, PAINT.angler))
      .setDepth(9).setBlendMode('ADD');
    scene.tweens.add({ targets: img, alpha: 0.55, duration: 500, yoyo: true, repeat: -1 });
    obstacles.push({ img, kind: 'angler', meta: { pts: 0 }, hp: 1, grazed: false, w: 30 * K, h: 30 * K, lure: true });
  }

  function spawnLantern(scene, K) {
    const W = scene.scale.width, H = scene.scale.height;
    const img = scene.add.image(Math.random() * W * 0.84 + W * 0.08, H + 30 * K,
      canvasTex(scene, 'dp-lant', 48 * K, 48 * K, PAINT.lantern)).setDepth(9).setBlendMode('ADD');
    obstacles.push({ img, kind: 'pickup', meta: { pts: 10 }, hp: 0, grazed: true, w: 34 * K, h: 34 * K, pickup: true });
  }

  function smash(scene, o, K) {
    const { x, y } = o.img;
    burst(scene, x, y, cfg.accent, { n: 22, speed: 420 * K, scale: 0.6 * K, gravityY: -240 * K });
    shockRing(scene, x, y, cfg.accent, 110 * K);
    api.score(o.meta.pts);
    floatScore(scene, x, y - 20 * K, `+${o.meta.pts}`, '#ffd24a', 22 * K);
    shake(scene, 0.012, 140);
    hitstop(scene, 50);
    squash(scene, player, 'y');
    api.haptic(10);
    api.sfx('objDone');
    o.img.destroy();
    obstacles.splice(obstacles.indexOf(o), 1);
    v *= 0.86; // smashing costs a little momentum — honesty
  }

  function bump(scene, o, K) {
    stun = 700;
    v = 0;
    grazeStreak = 0;
    flash(scene, 0x8ab8dc, 100, 0.25);
    shake(scene, 0.008, 120);
    squash(scene, player, 'y');
    scene.tweens.add({ targets: o.img, x: o.img.x + (player.x < o.img.x ? 14 : -14) * K, duration: 90, yoyo: true, ease: 'Sine.easeInOut' });
    floatScore(scene, player.x, player.y - 30 * K, 'thunk', '#8a9ac8', 15 * K);
    api.haptic([14, 30, 14]);
    api.sfx('log');
    noteStep = 0;
  }

  // armored bedrock: reckless speed pays in fathoms, not just seconds —
  // but a slow drift into rock is a scrape, not a catastrophe
  function clang(scene, o, K) {
    stun = 1000;
    const fast = v >= SMASH(scene);
    v = 0;
    grazeStreak = 0;
    const loss = Math.min(depth, fast ? 10 : 3);
    depth -= loss;
    if (loss) api.score(-loss);
    flash(scene, 0xff5d5d, 110, 0.3);
    shake(scene, 0.016, 200);
    hitstop(scene, 60);
    squash(scene, player, 'y');
    burst(scene, player.x, player.y + 16 * K, 0xff8a8a, { n: 12, speed: 260 * K, scale: 0.45 * K });
    floatScore(scene, player.x, player.y - 30 * K, `CLANG −${loss}`, '#ff8a8a', 17 * K);
    api.haptic([18, 40, 18]);
    api.sfx('log');
    noteStep = 0;
    o.img.y = player.y - o.h / 2 - 46 * K;
  }

  return {
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },

    fever() { fever = true; },

    create() {
      const scene = this;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      ensureFx(scene);
      paintSky(scene, cfg.sky);
      bloomCamera(scene);
      vignette(scene, 0.5, 0.7);

      // scrolling parallax walls of the deep
      layerFar = scene.add.tileSprite(0, 0, W, H, canvasTex(scene, 'dp-weed-far', W, H, PAINT.weed))
        .setOrigin(0).setAlpha(0.4).setDepth(-80);
      layerNear = scene.add.tileSprite(0, 0, W, H, canvasTex(scene, 'dp-weed-near', W, H, PAINT.weed))
        .setOrigin(0).setAlpha(0.75).setDepth(-60).setTileScale(1.6);

      ambientMotes(scene, cfg.accent, { alpha: 0.35 });

      // far silhouettes that name the world before a single obstacle spawns
      canvasTex(scene, 'dp-far', W, H, (c) => {
        c.globalAlpha = 0.5;
        if (cfg.obstacles.includes('rib')) {
          c.strokeStyle = '#9cb4c4'; c.lineCap = 'round';
          for (let i = 0; i < 4; i++) {
            c.lineWidth = W * (0.02 - i * 0.003);
            c.globalAlpha = 0.28 - i * 0.05;
            c.beginPath(); c.arc(W * 0.5, H * (0.5 + i * 0.16), W * (0.62 - i * 0.07), Math.PI * 1.15, Math.PI * 1.85); c.stroke();
          }
        } else if (cfg.searchlights || cfg.lanterns) {
          c.globalAlpha = 0.4;
          c.fillStyle = '#0a1620';
          c.beginPath(); c.ellipse(W * 0.28, H * 0.78, W * 0.3, H * 0.06, -0.12, 0, 7); c.fill();
          c.beginPath(); c.ellipse(W * 0.74, H * 0.5, W * 0.22, H * 0.045, 0.1, 0, 7); c.fill();
          c.fillStyle = 'rgba(255,220,150,.5)';
          for (const [fx, fy] of [[0.2, 0.77], [0.3, 0.78], [0.4, 0.79], [0.68, 0.5], [0.78, 0.505]]) {
            c.beginPath(); c.arc(W * fx, H * fy, W * 0.008, 0, 7); c.fill();
          }
        } else if (cfg.vents) {
          c.fillStyle = '#180c12';
          for (const [fx, fw] of [[0.2, 0.1], [0.55, 0.14], [0.85, 0.09]]) {
            c.beginPath();
            c.moveTo(W * (fx - fw), H); c.lineTo(W * (fx - fw * 0.3), H * 0.55);
            c.lineTo(W * (fx + fw * 0.3), H * 0.55); c.lineTo(W * (fx + fw), H);
            c.closePath(); c.fill();
          }
        }
        c.globalAlpha = 1;
      });
      scene.add.image(0, 0, 'dp-far').setOrigin(0).setDepth(-88);
      if (!cfg.dark) lightShafts(scene, cfg.accent, { n: 3, alpha: 0.1, depth: -84 });

      // a school of small fish minding its own business
      if (!cfg.dark) {
        const fishKey = canvasTex(scene, 'dp-fish', 26 * K, 12 * K, (c, w, h) => {
          c.fillStyle = 'rgba(150,190,210,.75)';
          c.beginPath(); c.ellipse(w * 0.42, h / 2, w * 0.3, h * 0.34, 0, 0, 7); c.fill();
          c.beginPath(); c.moveTo(w * 0.66, h / 2); c.lineTo(w * 0.95, h * 0.14); c.lineTo(w * 0.95, h * 0.86); c.closePath(); c.fill();
        });
        for (let i = 0; i < 5; i++) {
          const f = scene.add.image(-40 * K - i * 26 * K, H * 0.5, fishKey).setDepth(-82).setAlpha(0.7);
          const cross = () => {
            const fromLeft = Math.random() < 0.5;
            f.setFlipX(!fromLeft);
            f.x = fromLeft ? -40 * K : W + 40 * K;
            f.y = H * (0.2 + Math.random() * 0.55);
            scene.tweens.add({
              targets: f, x: fromLeft ? W + 40 * K : -40 * K,
              y: f.y + (Math.random() - 0.5) * 60 * K,
              duration: 7000 + Math.random() * 6000, delay: i * 900 + Math.random() * 2000,
              onComplete: () => f.active && cross(),
            });
          };
          cross();
        }
      }

      player = scene.add.image(W / 2, H * 0.3, canvasTex(scene, 'dp-bell', 76 * K, 40 * K, PAINT.dumbbell)).setDepth(20);
      lit(player);

      bubbles = scene.add.particles(0, 0, 'fx-dot', {
        speedY: { min: 60 * K, max: 160 * K }, speedX: { min: -20 * K, max: 20 * K },
        scale: { start: 0.28 * K, end: 0 }, alpha: { start: 0.7, end: 0 },
        tint: 0xbfe8f8, lifespan: 900, frequency: 70,
      }).setDepth(19).startFollow(player, 0, -12 * K);

      speedLines = scene.add.particles(0, 0, 'fx-streak', {
        x: { min: 0, max: W }, y: -20,
        speedY: { min: 500 * K, max: 800 * K },
        scale: { min: 0.5 * K, max: 1.1 * K }, alpha: { start: 0.25, end: 0 },
        tint: 0xbfe8f8, lifespan: 600, frequency: 80, emitting: false,
      }).setDepth(30);

      // the void carries its own light
      if (cfg.dark) {
        coneLight = darknessCone(scene, { ambient: 0x05060c, x: W / 2, y: H * 0.3, radius: H * 0.5, angle: 0.9 });
        if (coneLight) coneLight.setConeRotation?.(Math.PI / 2);
        else {
          // canvas fallback: a punched-hole darkness sheet follows the player
          const holeKey = canvasTex(scene, 'dp-hole', W, H, (c, w2, h2) => {
            c.fillStyle = 'rgba(2,3,8,.88)';
            c.fillRect(0, 0, w2, h2);
            const g = c.createRadialGradient(w2 / 2, h2 * 0.3, 10, w2 / 2, h2 * 0.3, h2 * 0.34);
            g.addColorStop(0, 'rgba(0,0,0,1)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            c.globalCompositeOperation = 'destination-out';
            c.fillStyle = g;
            c.fillRect(0, 0, w2, h2);
          });
          darkMask = scene.add.image(0, 0, holeKey).setOrigin(0).setDepth(35);
        }
      }
      if (cfg.vents) {
        for (const fx of [0.22, 0.55, 0.85]) {
          vents.push({ x: W * fx, w: 60 * K, nextAt: scene.time.now + 2000 + Math.random() * 3000, until: 0, col: null });
        }
      }

      scene.input.on('pointerdown', (p) => { holding = true; touched = true; steerX = p.x; });
      scene.input.on('pointermove', (p) => { if (holding) steerX = p.x; });
      scene.input.on('pointerup', () => { holding = false; });

      // time anchors seed on the first update: the scene clock reads ~0 in
      // create() but jumps to page-uptime on frame one
    },

    update(t, dtMs) {
      const scene = this;
      const dt = Math.min(dtMs, 64) / 1000;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      const now = scene.time.now;
      const maxV = MAXV(scene);
      const smashV = SMASH(scene);
      if (!t0) {
        t0 = now;
        nextOb = now + 900;
        goldenAt = now + goldDelay();
        for (const vent of vents) vent.nextAt = now + 2000 + Math.random() * 3000;
      }

      // ——— speed model ———
      stun = Math.max(0, stun - dtMs);
      snag = Math.max(0, snag - dtMs);
      spotted = Math.max(0, spotted - dtMs);
      const capped = snag > 0 ? maxV * 0.12 : spotted > 0 ? maxV * 0.22 : maxV;
      if (!touched) v = 0; // the dive starts with YOUR thumb, never by itself
      else if (stun > 0) v = Math.max(0, v - maxV * 2.2 * dt);
      else if (holding) v = Math.min(capped, v + maxV * 1.4 * dt);
      else v = Math.max(H * 0.12, v - maxV * 0.9 * dt);

      // vent boost columns
      for (const vent of vents) {
        if (vent.until > now) {
          if (touched && Math.abs(player.x - vent.x) < vent.w) {
            v = Math.min(maxV * 1.3, v + maxV * 3 * dt);
          }
        } else if (now > vent.nextAt) {
          vent.until = now + 1400;
          vent.nextAt = now + 4200 + Math.random() * 2600;
          const col = scene.add.particles(vent.x, H + 10, 'fx-dot', {
            speedY: { min: -H * 0.9, max: -H * 0.6 }, speedX: { min: -22 * K, max: 22 * K },
            scale: { start: 0.55 * K, end: 0 }, tint: [0xff9a5c, 0xffc46c],
            blendMode: 'ADD', lifespan: 1300, frequency: 18,
          }).setDepth(8);
          scene.time.delayedCall(1400, () => col.destroy());
          api.sfx('tap');
        }
      }

      // ——— steering + depth ———
      if (steerX != null) player.x += (steerX - player.x) * Math.min(1, dt * 9);
      player.x = Math.max(30 * K, Math.min(W - 30 * K, player.x));
      player.setAngle((steerX != null ? (steerX - player.x) * 0.08 : 0) + Math.sin(now / 300) * 2);

      depthAcc += (v * dt) / FATHOM(scene);
      while (depthAcc >= 1) {
        depthAcc -= 1;
        depth++;
        api.score(1);
        if (depth % 10 === 0) {
          api.note(noteStep++);
          floatScore(scene, player.x, player.y - 34 * K, `${depth} fathoms`, '#8ad0ff', 15 * K);
        }
        if (depth % 50 === 0) glyphBanner(scene, `${depth} FATHOMS`, '#8ad0ff', 30 * K);
      }

      // ——— visuals track speed ———
      const vf = v / maxV;
      layerFar.tilePositionY += v * 0.25 * dt;
      layerNear.tilePositionY += v * 0.55 * dt;
      bubbles.frequency = 90 - vf * 70;
      speedLines.emitting = vf > 0.7;
      if (coneLight) { coneLight.x = player.x; coneLight.y = player.y; }
      if (darkMask) darkMask.setPosition(player.x - W / 2, player.y - H * 0.3);

      // ——— kelp world: living tethers ———
      if (cfg.kelp && kelps.length < 5 && Math.random() < dt * 0.8) {
        kelps.push({ x: Math.random() * W, y: H + 20, phase: Math.random() * 7, gfx: scene.add.graphics().setDepth(12), torn: false });
      }
      for (const kp of [...kelps]) {
        kp.y -= v * dt;
        kp.gfx.clear();
        if (kp.y < -H * 0.5) { kp.gfx.destroy(); kelps.splice(kelps.indexOf(kp), 1); continue; }
        if (kp.torn) continue;
        kp.gfx.lineStyle(5 * K, 0x3f7a2c, 0.85);
        const sway = Math.sin(now / 600 + kp.phase) * 26 * K;
        kp.gfx.beginPath();
        kp.gfx.moveTo(kp.x, kp.y);
        kp.gfx.lineTo(kp.x + sway * 0.5, kp.y - H * 0.25);
        kp.gfx.lineTo(kp.x + sway, kp.y - H * 0.5);
        kp.gfx.strokePath();
        // collision with the strand's midline
        if (Math.abs(player.y - (kp.y - H * 0.25)) < H * 0.25 && Math.abs(player.x - (kp.x + sway * 0.5)) < 26 * K) {
          if (v >= smashV) {
            kp.torn = true;
            burst(scene, player.x, player.y, 0x7ad48a, { n: 14, speed: 280 * K, scale: 0.5 * K });
            api.score(10);
            floatScore(scene, player.x, player.y - 24 * K, 'TORN +10', '#7ad48a', 16 * K);
            api.sfx('objDone');
          } else if (snag <= 0 && !kp.snagged) {
            kp.snagged = true; // a strand only grabs you once
            snag = 900;
            grazeStreak = 0;
            floatScore(scene, player.x, player.y - 24 * K, 'snagged!', '#7ad48a', 15 * K);
            api.haptic(16);
            api.sfx('log');
            noteStep = 0;
          }
        }
      }

      // ——— the golden plate: touch it at any speed ———
      if (now >= goldenAt && !obstacles.some((o) => o.golden)) {
        goldenAt = now + goldDelay();
        const img = scene.add.image(Math.random() * W * 0.7 + W * 0.15, H + 40 * K,
          canvasTex(scene, 'dp-goldplate', 120 * K, 30 * K, PAINT.goldplate)).setDepth(11);
        const halo = scene.add.image(img.x, img.y, 'fx-dot').setTint(0xffd24a).setBlendMode('ADD').setScale(2.2 * K).setAlpha(0.5).setDepth(10);
        scene.tweens.add({ targets: halo, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
        obstacles.push({ img, halo, kind: 'pickup', meta: { pts: 75 }, hp: 0, grazed: true, w: 100 * K, h: 40 * K, pickup: true, golden: true });
      }

      // ——— obstacles (the deep gets denser the longer you're down) ———
      if (now >= nextOb) {
        spawnObstacle(scene, K);
        if (cfg.anglers && Math.random() < 0.5) spawnAngler(scene, K);
        if (cfg.lanterns && Math.random() < 0.6) spawnLantern(scene, K);
        const elapsed = (now - t0) / 1000;
        nextOb = now + (900 + Math.random() * 500)
          / (cfg.density * (fever ? 1.3 : 1) * (1 + Math.min(0.6, elapsed / 150)));
      }
      for (const o of [...obstacles]) {
        o.img.y -= v * dt;
        if (o.halo) o.halo.setPosition(o.img.x, o.img.y);
        if (o.img.y < -o.h) {
          o.halo?.destroy();
          o.img.destroy();
          obstacles.splice(obstacles.indexOf(o), 1);
          continue;
        }
        const dx = Math.abs(player.x - o.img.x), dy = Math.abs(player.y - o.img.y);
        const hw = o.w / 2 + 26 * K, hh = o.h / 2 + 12 * K;
        if (dx < hw && dy < hh) {
          if (o.pickup) {
            api.score(o.meta.pts);
            collectTo(scene, o.img.x, o.img.y, W - 30 * K, 20 * K, o.golden ? 0xffd24a : 0xffc46c, o.golden ? 18 : 8);
            floatScore(scene, o.img.x, o.img.y, `+${o.meta.pts}`, o.golden ? '#ffe9a0' : '#ffc46c', (o.golden ? 22 : 16) * K);
            if (o.golden) {
              glyphBanner(scene, 'GOLDEN PLATE', '#ffe9a0', 28 * K);
              flash(scene, 0xffd24a, 120, 0.3);
              api.sfx('pr');
            } else api.sfx('tap');
            api.note(noteStep++);
            o.halo?.destroy();
            o.img.destroy();
            obstacles.splice(obstacles.indexOf(o), 1);
          } else if (o.kind === 'jelly') {
            if (v >= maxV * 0.9) {
              slowmo(scene, 0.35, 320);
              api.score(o.meta.pts);
              floatScore(scene, o.img.x, o.img.y, `PIERCED +${o.meta.pts}`, '#ff8ad0', 18 * K);
              burst(scene, o.img.x, o.img.y, 0xff8ad0, { n: 24, speed: 380 * K, scale: 0.6 * K });
              api.sfx('pr');
              o.img.destroy();
              obstacles.splice(obstacles.indexOf(o), 1);
            } else {
              // depth thief: bounced UP — one-shot, then the jelly is
              // flung clear so the overlap can't re-trigger every frame
              depth = Math.max(0, depth - 4);
              api.score(-4);
              v = 0;
              stun = 500;
              squash(scene, o.img, 'y');
              squash(scene, player, 'y');
              floatScore(scene, player.x, player.y - 26 * K, 'boing −4', '#ff8ad0', 16 * K);
              api.haptic([10, 40, 10]);
              api.sfx('log');
              noteStep = 0;
              grazeStreak = 0;
              o.img.y = player.y - o.h - 60 * K;
            }
          } else if (o.lure) {
            bump(scene, o, K);
            floatScore(scene, o.img.x, o.img.y, 'a LIE', '#aef0ff', 15 * K);
            o.img.destroy();
            obstacles.splice(obstacles.indexOf(o), 1);
          } else if (o.armored) {
            clang(scene, o, K);
          } else if (o.hp > 0 && v >= smashV) {
            o.hp--;
            if (o.hp <= 0) smash(scene, o, K);
            else {
              burst(scene, player.x, player.y + 20 * K, cfg.accent, { n: 8, speed: 200 * K, scale: 0.4 * K });
              shake(scene, 0.006, 80);
            }
          } else if (o.meta.hp === 0 && cfg.soft) {
            // market canopies: soft sideways bounce, never a wall
            v *= 0.55;
            player.x += (player.x < o.img.x ? -40 : 40) * K;
            squash(scene, o.img, 'y');
            api.sfx('tap');
          } else {
            bump(scene, o, K);
            // fling it fully clear of the player: with v at zero nothing
            // scrolls, so insufficient separation meant an infinite thunk
            o.img.y = player.y - o.h / 2 - 46 * K;
          }
        } else if (!o.grazed && !o.pickup && dy < hh * 1.6 && dx < hw * 1.7 && v > smashV) {
          // threading the gaps at speed is the real skill economy: each
          // consecutive graze pays more, and armored rock pays a premium
          o.grazed = true;
          grazeStreak++;
          const gain = Math.min(15, 3 + grazeStreak * 2) + (o.armored ? 4 : 0);
          api.score(gain);
          floatScore(scene, player.x + (o.img.x > player.x ? 22 : -22) * K, player.y,
            `${o.armored ? 'THREAD' : 'GRAZE'} +${gain}`, '#3adcc8', 13 * K);
          api.sfx('tap');
        }
      }

      // ——— searchlights ———
      if (cfg.searchlights) {
        if (lights.length < 2 && Math.random() < dt * 0.3) {
          const sub = scene.add.image(Math.random() < 0.5 ? -40 : W + 40, H + 60,
            canvasTex(scene, 'dp-hull', 180 * K, 60 * K, PAINT.hull)).setDepth(11);
          lights.push({ sub, angle: Math.random() * 0.6 - 0.3, dir: sub.x < 0 ? 1 : -1, gfx: scene.add.graphics().setDepth(12) });
        }
        for (const L of [...lights]) {
          L.sub.y -= v * dt;
          L.sub.x += L.dir * 30 * K * dt;
          L.angle = Math.sin(now / 1400 + L.sub.x) * 0.5;
          L.gfx.clear();
          if (L.sub.y < -80) { L.sub.destroy(); L.gfx.destroy(); lights.splice(lights.indexOf(L), 1); continue; }
          const bx = L.sub.x, by = L.sub.y - 20 * K;
          const ex = bx + Math.sin(L.angle) * H * 0.7, ey = by - Math.cos(Math.PI + L.angle) * -H * 0.7;
          L.gfx.fillStyle(0xfff4c8, 0.14);
          L.gfx.fillTriangle(bx, by, ex - 60 * K, ey, ex + 60 * K, ey);
          // beam catch
          if (spotted <= 0 && player.y > ey && player.y < by && Math.abs(player.x - (bx + (ex - bx) * ((player.y - by) / (ey - by || 1)))) < 55 * K) {
            spotted = 900;
            floatScore(scene, player.x, player.y - 26 * K, 'SPOTTED', '#fff4c8', 15 * K);
            api.haptic(12);
            api.sfx('log');
          }
        }
      }
    },
  };
}

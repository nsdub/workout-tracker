// IAIDO — Mount Volcano Dojo. A swipe is a sword stroke: everything it
// crosses splits into two velocity-inheriting halves that keep tumbling
// and pile up on the floor (the wreckage is the trophy). Chain slices in
// one stroke for combos that bend time. Hold your thumb STILL to sheathe:
// the world collapses to slow motion while the stance meter drains, and
// the flick out of stance is a full draw-cut through everything on the
// line. Powder bombs with angry faces punish greed.
//
// Worlds mutate the blade, not the wallpaper: the waterfall hides golden
// koi behind a cuttable ribbon, forge ingots only cut while the bellows
// pulse has them glowing, the sparring hall's candles gutter with every
// stroke you throw, and the dragon's spine launches everything at angles
// no honest mountain would.
import {
  ensureFx, canvasTex, burst, shockRing, floatScore, banner, glyphBanner,
  shake, flash, hitstop, slowmo, zoomPunch, collectTo, paintSky,
  ambientMotes, bloomCamera, vignette, squash, unit,
} from '../fx.js';

export const TITLE = 'Iaido';

export const WORLDS = {
  'dojo-stairs': {
    name: 'Thousand Stairs', sky: [[0, '#241048'], [0.55, '#7c3060'], [1, '#e8975c']],
    accent: 0xffb46c, blade: 0xffe9b3, objects: ['lantern', 'scroll'], bombs: 0.12, pace: 1.0, land: 'stairs',
  },
  'dojo-falls': {
    name: 'Waterfall Slice', sky: [[0, '#0e2c4c'], [0.6, '#1c6a8c'], [1, '#7ac8dc']],
    accent: 0x9adcf0, blade: 0xdff6ff, objects: ['koi', 'gourd'], bombs: 0, drift: 90, pace: 1.05, land: 'falls', ribbon: true,
  },
  'dojo-summit': {
    name: 'Forge Tempering', sky: [[0, '#190a12'], [0.55, '#5c1f28'], [1, '#c2452e']],
    accent: 0xff9a4c, blade: 0xffd0a0, objects: ['ingot', 'coal'], bombs: 0.16, pace: 1.1, land: 'summit', embers: true, forge: true,
  },
  'dojo-bamboo': {
    name: 'Grove Cutter', sky: [[0, '#0f2a0c'], [0.6, '#3f7a2c'], [1, '#a8d46c']],
    accent: 0xc8f09a, blade: 0xeaffd0, objects: ['bamboo', 'melon'], bombs: 0.08, pace: 1.1, land: 'bamboo', vertical: true,
  },
  'dojo-torii': {
    name: 'Spirit Gate Slash', sky: [[0, '#320c28'], [0.55, '#7c2040'], [1, '#ff7a4c']],
    accent: 0xffc46c, blade: 0xffe2c0, objects: ['orb', 'charm'], bombs: 0.1, pace: 1.15, land: 'torii', blink: true,
  },
  'dojo-snow': {
    name: 'Snowbound Kata', sky: [[0, '#141c3c'], [0.6, '#44608f'], [1, '#b8d0ec']],
    accent: 0xffffff, blade: 0xdfefff, objects: ['flake', 'peach'], bombs: 0.06, pace: 1.0, land: 'snow', snow: true, icetime: true,
  },
  'dojo-hall': {
    name: 'Candle Discipline', sky: [[0, '#120b06'], [0.6, '#38220f'], [1, '#6e421a']],
    accent: 0xffc46c, blade: 0xfff0c8, objects: ['candle', 'scroll'], bombs: 0.1, pace: 1.0, land: 'hall', candles: true,
  },
  'dojo-dragon': {
    name: "Dragon's Spine", sky: [[0, '#0c1430'], [0.5, '#28306e'], [1, '#5c4a9c']],
    accent: 0x7ad0ff, blade: 0xd8f0ff, objects: ['orb', 'lantern'], bombs: 0.1, pace: 1.15, land: 'dragon', spine: true,
  },
};

// ——— sprite painters: canvas 2D once, WebGL sprite forever ———
// Faces on everything. The bombs WANT you to make a mistake.

const PAINT = {
  koi(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ff8a3c'); g.addColorStop(1, '#e05a1e');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(w * 0.42, h / 2, w * 0.34, h * 0.36, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(w * 0.68, h / 2); c.quadraticCurveTo(w * 0.95, h * 0.12, w * 0.98, h * 0.3);
    c.quadraticCurveTo(w * 0.86, h * 0.5, w * 0.98, h * 0.7); c.quadraticCurveTo(w * 0.95, h * 0.88, w * 0.68, h / 2);
    c.fill();
    c.fillStyle = '#fff3e0';
    c.beginPath(); c.ellipse(w * 0.4, h * 0.62, w * 0.24, h * 0.16, 0, 0, 7); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(w * 0.2, h * 0.42, w * 0.09, 0, 7); c.fill();
    c.fillStyle = '#1c1208';
    c.beginPath(); c.arc(w * 0.185, h * 0.43, w * 0.05, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = w * 0.02;
    c.beginPath(); c.arc(w * 0.5, h * 0.42, w * 0.1, 0.4, 2.4); c.stroke();
  },
  goldkoi(c, w, h) {
    PAINT.koi(c, w, h);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(255,210,74,.55)';
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  },
  lantern(c, w, h) {
    const g = c.createRadialGradient(w / 2, h * 0.5, 2, w / 2, h * 0.5, w * 0.55);
    g.addColorStop(0, '#ffb05a'); g.addColorStop(0.55, '#e8543c'); g.addColorStop(1, '#a82c20');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(w / 2, h * 0.52, w * 0.42, h * 0.4, 0, 0, 7); c.fill();
    c.fillStyle = '#3a2410';
    c.fillRect(w * 0.3, h * 0.04, w * 0.4, h * 0.1);
    c.fillRect(w * 0.3, h * 0.88, w * 0.4, h * 0.08);
    c.strokeStyle = 'rgba(58,36,16,.55)'; c.lineWidth = Math.max(1, w * 0.02);
    for (let i = 1; i < 5; i++) {
      c.beginPath(); c.ellipse(w / 2, h * 0.52, w * 0.42 * (1 - i * 0.18), h * 0.4, 0, 0, 7); c.stroke();
    }
    c.fillStyle = '#2a1408';
    c.beginPath(); c.arc(w * 0.38, h * 0.44, w * 0.045, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.62, h * 0.44, w * 0.045, 0, 7); c.fill();
    c.strokeStyle = '#2a1408'; c.lineWidth = w * 0.035; c.lineCap = 'round';
    c.beginPath(); c.arc(w * 0.5, h * 0.52, w * 0.13, 0.35, 2.8); c.stroke();
  },
  scroll(c, w, h) {
    c.fillStyle = '#e8d5ae';
    c.beginPath(); c.roundRect(w * 0.1, h * 0.22, w * 0.8, h * 0.56, w * 0.12); c.fill();
    c.fillStyle = '#c8b088';
    c.beginPath(); c.roundRect(w * 0.02, h * 0.12, w * 0.16, h * 0.76, w * 0.08); c.fill();
    c.beginPath(); c.roundRect(w * 0.82, h * 0.12, w * 0.16, h * 0.76, w * 0.08); c.fill();
    c.strokeStyle = '#8a5a2a'; c.lineWidth = Math.max(1, h * 0.03);
    for (let i = 1; i < 4; i++) {
      c.beginPath(); c.moveTo(w * 0.26, h * (0.28 + i * 0.12)); c.lineTo(w * 0.74, h * (0.28 + i * 0.12)); c.stroke();
    }
    c.fillStyle = '#c23b22';
    c.beginPath(); c.arc(w * 0.5, h * 0.5, w * 0.07, 0, 7); c.fill();
  },
  gourd(c, w, h) {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#7ab8ff'); g.addColorStop(1, '#3a6ac2');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h * 0.68, w * 0.32, 0, 7); c.fill();
    c.beginPath(); c.arc(w / 2, h * 0.3, w * 0.2, 0, 7); c.fill();
    c.fillStyle = '#2a4a1c';
    c.fillRect(w * 0.46, 0, w * 0.08, h * 0.14);
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath(); c.ellipse(w * 0.38, h * 0.58, w * 0.08, h * 0.14, -0.5, 0, 7); c.fill();
  },
  ingot(c, w, h) {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#ff6a2c'); g.addColorStop(0.5, '#ffd24a'); g.addColorStop(1, '#ff6a2c');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(w * 0.06, h * 0.28, w * 0.88, h * 0.44, h * 0.1); c.fill();
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.roundRect(w * 0.2, h * 0.38, w * 0.6, h * 0.1, h * 0.05); c.fill();
  },
  coal(c, w, h) {
    c.fillStyle = '#241014';
    c.beginPath();
    c.moveTo(w * 0.18, h * 0.3); c.lineTo(w * 0.55, h * 0.1); c.lineTo(w * 0.9, h * 0.38);
    c.lineTo(w * 0.82, h * 0.82); c.lineTo(w * 0.32, h * 0.9); c.lineTo(w * 0.08, h * 0.6);
    c.closePath(); c.fill();
    c.strokeStyle = '#ff7a3c'; c.lineWidth = w * 0.05; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.3, h * 0.42); c.lineTo(w * 0.52, h * 0.55); c.lineTo(w * 0.45, h * 0.74); c.stroke();
    c.beginPath(); c.moveTo(w * 0.62, h * 0.3); c.lineTo(w * 0.68, h * 0.52); c.stroke();
  },
  bamboo(c, w, h) {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#4f9438'); g.addColorStop(0.5, '#7ec25c'); g.addColorStop(1, '#3f7a2c');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(w * 0.3, h * 0.02, w * 0.4, h * 0.96, w * 0.1); c.fill();
    c.fillStyle = '#2c5c1c';
    c.fillRect(w * 0.28, h * 0.3, w * 0.44, h * 0.05);
    c.fillRect(w * 0.28, h * 0.62, w * 0.44, h * 0.05);
    c.fillStyle = '#5fae3c';
    c.beginPath(); c.ellipse(w * 0.78, h * 0.2, w * 0.2, h * 0.08, -0.6, 0, 7); c.fill();
  },
  melon(c, w, h) {
    const g = c.createRadialGradient(w * 0.38, h * 0.38, 2, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#4fae4c'); g.addColorStop(1, '#1d6e2c');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.46, 0, 7); c.fill();
    c.strokeStyle = '#14501e'; c.lineWidth = w * 0.06;
    for (const dx of [-0.22, 0, 0.22]) {
      c.beginPath(); c.moveTo(w * (0.5 + dx * 0.7), h * 0.08); c.quadraticCurveTo(w * (0.5 + dx * 1.6), h * 0.5, w * (0.5 + dx * 0.7), h * 0.92); c.stroke();
    }
  },
  orb(c, w, h) {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#eafff2'); g.addColorStop(0.4, '#5fe89a'); g.addColorStop(1, 'rgba(63,174,107,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#0c2c18';
    c.beginPath(); c.arc(w * 0.4, h * 0.45, w * 0.05, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.6, h * 0.45, w * 0.05, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.5, h * 0.58, w * 0.04, 0, 7); c.fill();
  },
  charm(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#c23b6e'); g.addColorStop(1, '#8c1f4a');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(w * 0.5, h * 0.04); c.lineTo(w * 0.82, h * 0.2); c.lineTo(w * 0.82, h * 0.9);
    c.lineTo(w * 0.18, h * 0.9); c.lineTo(w * 0.18, h * 0.2); c.closePath(); c.fill();
    c.fillStyle = '#ffd24a';
    c.fillRect(w * 0.3, h * 0.34, w * 0.4, h * 0.3);
    c.fillStyle = '#8c1f4a';
    c.font = `700 ${Math.round(h * 0.2)}px sans-serif`;
    c.textAlign = 'center'; c.fillText('力', w * 0.5, h * 0.56);
    c.strokeStyle = '#ffd24a'; c.lineWidth = w * 0.05;
    c.beginPath(); c.arc(w * 0.5, h * 0.08, w * 0.09, 0, 7); c.stroke();
  },
  flake(c, w, h) {
    c.strokeStyle = '#eaf6ff'; c.lineWidth = w * 0.06; c.lineCap = 'round';
    c.translate(w / 2, h / 2);
    for (let i = 0; i < 6; i++) {
      c.rotate(Math.PI / 3);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -h * 0.42); c.stroke();
      c.beginPath(); c.moveTo(0, -h * 0.26); c.lineTo(w * 0.1, -h * 0.34); c.stroke();
      c.beginPath(); c.moveTo(0, -h * 0.26); c.lineTo(-w * 0.1, -h * 0.34); c.stroke();
    }
  },
  peach(c, w, h) {
    const g = c.createRadialGradient(w * 0.4, h * 0.42, 2, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#ffc2b0'); g.addColorStop(1, '#e86a8a');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h * 0.56, w * 0.4, 0, 7); c.fill();
    c.strokeStyle = 'rgba(140,31,74,.4)'; c.lineWidth = w * 0.03;
    c.beginPath(); c.moveTo(w * 0.5, h * 0.2); c.quadraticCurveTo(w * 0.42, h * 0.5, w * 0.5, h * 0.94); c.stroke();
    c.fillStyle = '#3f7a2c';
    c.beginPath(); c.ellipse(w * 0.62, h * 0.14, w * 0.16, h * 0.07, 0.5, 0, 7); c.fill();
  },
  candle(c, w, h) {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#d8c8a8'); g.addColorStop(0.5, '#fff4dc'); g.addColorStop(1, '#c8b088');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(w * 0.28, h * 0.3, w * 0.44, h * 0.66, w * 0.08); c.fill();
    const f = c.createRadialGradient(w / 2, h * 0.16, 1, w / 2, h * 0.16, h * 0.16);
    f.addColorStop(0, '#fff8d0'); f.addColorStop(0.5, '#ffb43c'); f.addColorStop(1, 'rgba(255,122,60,0)');
    c.fillStyle = f;
    c.beginPath(); c.ellipse(w / 2, h * 0.15, w * 0.2, h * 0.16, 0, 0, 7); c.fill();
    c.fillStyle = '#6a4a2a';
    c.fillRect(w * 0.48, h * 0.22, w * 0.04, h * 0.08);
  },
  itch(c, w, h) {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#fff8d0'); g.addColorStop(0.5, '#ffd24a'); g.addColorStop(1, 'rgba(255,210,74,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#5c3a08';
    c.font = `700 ${Math.round(h * 0.34)}px sans-serif`;
    c.textAlign = 'center'; c.fillText('✳', w / 2, h * 0.62);
  },
  bomb(c, w, h) {
    const g = c.createRadialGradient(w * 0.38, h * 0.42, 2, w / 2, h * 0.56, w * 0.48);
    g.addColorStop(0, '#4a4a5c'); g.addColorStop(1, '#14141e');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h * 0.58, w * 0.38, 0, 7); c.fill();
    c.fillStyle = '#2a2a38';
    c.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.14);
    c.strokeStyle = '#c8b088'; c.lineWidth = w * 0.045; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.5, h * 0.12); c.quadraticCurveTo(w * 0.68, h * 0.02, w * 0.78, h * 0.1); c.stroke();
    c.strokeStyle = '#ff5d5d'; c.lineWidth = w * 0.04;
    c.beginPath(); c.moveTo(w * 0.34, h * 0.46); c.lineTo(w * 0.46, h * 0.52); c.stroke();
    c.beginPath(); c.moveTo(w * 0.66, h * 0.46); c.lineTo(w * 0.54, h * 0.52); c.stroke();
    c.fillStyle = '#ff5d5d';
    c.beginPath(); c.arc(w * 0.41, h * 0.55, w * 0.035, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.59, h * 0.55, w * 0.035, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.5, h * 0.7, w * 0.07, Math.PI, 0); c.fill();
  },
};

// ——— world backdrops: layered silhouettes behind the action ———

function drawLand(scene, cfg, K, world) {
  const W = scene.scale.width, H = scene.scale.height;
  const g = scene.add.graphics().setDepth(-90);
  const silh = (pts, color, alpha) => {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
    g.lineTo(W, H); g.lineTo(0, H);
    g.closePath(); g.fillPath();
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
  switch (cfg.land) {
    case 'stairs': {
      silh([[0, H * 0.55], [W * 0.3, H * 0.38], [W * 0.62, H * 0.52], [W, H * 0.4]], 0x2a1440, 0.7);
      silh([[0, H * 0.68], [W * 0.4, H * 0.5], [W * 0.78, H * 0.62], [W, H * 0.54]], 0x1c0e30, 0.85);
      const steps = [];
      let sx = -W * 0.05, sy = H * 0.86;
      for (let i = 0; i < 9; i++) { steps.push([sx, sy], [sx + W * 0.13, sy]); sx += W * 0.13; sy -= H * 0.045; }
      silh(steps, 0x120822, 1);
      break;
    }
    case 'falls': {
      silh([[0, H * 0.3], [W * 0.16, H * 0.26], [W * 0.2, H], [0, H]], 0x0c2238, 0.9);
      silh([[W, H * 0.24], [W * 0.82, H * 0.3], [W * 0.78, H], [W, H]], 0x0c2238, 0.9);
      for (const [x, w] of [[W * 0.28, W * 0.09], [W * 0.72, W * 0.08]]) {
        g.fillStyle(0xbfe8f8, 0.14); g.fillRect(x, 0, w, H);
        g.fillStyle(0xffffff, 0.08); g.fillRect(x + w * 0.3, 0, w * 0.2, H);
      }
      // the cuttable ribbon itself is a live object, drawn in create()
      break;
    }
    case 'summit': {
      silh([[0, H * 0.62], [W * 0.36, H * 0.24], [W * 0.5, H * 0.3], [W * 0.66, H * 0.2], [W, H * 0.58]], 0x30101a, 0.9);
      const cr = scene.add.image(W * 0.52, H * 0.26, 'fx-dot').setScale(K * 3.2).setTint(0xff6a2c).setBlendMode('ADD').setAlpha(0.7).setDepth(-89);
      scene.tweens.add({ targets: cr, alpha: 0.35, scale: K * 2.6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      world.forgeGlow = cr;
      break;
    }
    case 'bamboo': {
      for (let i = 0; i < 9; i++) {
        const x = rnd(W * 0.02, W * 0.98), bw = rnd(10, 22) * K, back = i < 5;
        g.fillStyle(back ? 0x14350f : 0x1d4a16, back ? 0.55 : 0.8);
        g.fillRect(x, 0, bw, H);
        g.fillStyle(0x0c2408, back ? 0.5 : 0.8);
        for (let y = rnd(0, 60) * K; y < H; y += rnd(70, 130) * K) g.fillRect(x - 1, y, bw + 2, 4 * K);
      }
      break;
    }
    case 'torii': {
      const gate = (cx, s, color, alpha) => {
        g.fillStyle(color, alpha);
        const pw = 14 * K * s, gw = 130 * K * s, gh = 170 * K * s, base = H * 0.9;
        g.fillRect(cx - gw / 2, base - gh, pw, gh);
        g.fillRect(cx + gw / 2 - pw, base - gh, pw, gh);
        g.fillRect(cx - gw / 2 - pw * 1.4, base - gh, gw + pw * 2.8, pw * 1.1);
        g.fillRect(cx - gw / 2 - pw * 0.4, base - gh + pw * 1.8, gw + pw * 0.8, pw * 0.8);
      };
      gate(W * 0.5, 1.25, 0x8c1f2e, 0.95);
      gate(W * 0.18, 0.8, 0x5c1420, 0.7);
      gate(W * 0.84, 0.7, 0x5c1420, 0.6);
      break;
    }
    case 'snow': {
      silh([[0, H * 0.6], [W * 0.3, H * 0.42], [W * 0.6, H * 0.56], [W, H * 0.46]], 0x2a3a64, 0.7);
      g.fillStyle(0x141c3c, 0.95);
      g.beginPath();
      g.moveTo(W * 0.2, H * 0.66); g.quadraticCurveTo(W * 0.5, H * 0.5, W * 0.8, H * 0.66);
      g.lineTo(W * 0.68, H * 0.7); g.lineTo(W * 0.32, H * 0.7);
      g.closePath(); g.fillPath();
      g.fillStyle(0xeaf6ff, 0.9);
      g.beginPath();
      g.moveTo(W * 0.24, H * 0.655); g.quadraticCurveTo(W * 0.5, H * 0.53, W * 0.76, H * 0.655);
      g.lineTo(W * 0.74, H * 0.67); g.quadraticCurveTo(W * 0.5, H * 0.56, W * 0.26, H * 0.67);
      g.closePath(); g.fillPath();
      break;
    }
    case 'hall': {
      for (const x of [W * 0.08, W * 0.36, W * 0.64, W * 0.92]) {
        g.fillStyle(0x241105, 0.9); g.fillRect(x - 14 * K, 0, 28 * K, H);
        g.fillStyle(0x4a2c12, 0.9); g.fillRect(x - 10 * K, 0, 6 * K, H);
      }
      g.fillStyle(0x1c0d04, 1); g.fillRect(0, H * 0.9, W, H * 0.1);
      world.flames = [];
      for (let i = 0; i < 7; i++) {
        const cx = W * (0.08 + i * 0.14);
        const fl = scene.add.image(cx, H * 0.88, 'fx-dot').setScale(K * 0.55).setTint(0xffb43c).setBlendMode('ADD').setDepth(-88);
        scene.tweens.add({ targets: fl, scaleX: K * 0.4, scaleY: K * 0.7, alpha: 0.6, duration: 300 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        world.flames.push(fl);
      }
      break;
    }
    case 'dragon': {
      // distant peaks; the live spine is drawn per-frame in update()
      silh([[0, H * 0.5], [W * 0.3, H * 0.34], [W * 0.6, H * 0.48], [W, H * 0.36]], 0x141c48, 0.7);
      world.spineGfx = scene.add.graphics().setDepth(-70);
      break;
    }
  }
  g.fillStyle(0x000000, 0.35);
  g.fillRect(0, H * 0.94, W, H * 0.06);
}

const SIZES = {
  koi: [72, 44], goldkoi: [72, 44], lantern: [56, 62], scroll: [60, 40], gourd: [44, 58],
  ingot: [64, 34], coal: [52, 48], bamboo: [40, 84], melon: [58, 58], orb: [56, 56],
  charm: [42, 58], flake: [54, 54], peach: [52, 52], candle: [36, 66], itch: [50, 50], bomb: [54, 60],
};

const VALUE = { goldkoi: 30, itch: 40 };

export function create(P, ctx) {
  const { api, cfg } = ctx;
  const objs = [];
  const halves = [];
  const debris = [];
  const trail = [];
  let trailGfx, sliceGlow, stanceGfx, darkVeil, ribbonGfx;
  let strokeSlices = 0;
  let lastPt = null;
  let downAt = 0;
  let nextSpawn = 0;
  let t0 = 0;
  let fever = false;
  // sheathe stance
  const stance = { active: false, meter: 1, lastMoveT: 0 };
  // world-mutation state
  const world = { darkness: 0.34, ribbonOpen: 0, frozen: 0, nextFreeze: 7000, spineT: 0, itchAt: 0 };

  const tex = (scene, kind, K) => {
    const [w, h] = SIZES[kind];
    return canvasTex(scene, `dj-${kind}`, w * K, h * K, PAINT[kind]);
  };

  const forgeHot = (scene) => !cfg.forge || Math.sin(scene.time.now / 1200 * Math.PI) > -0.1;

  function spawnObj(scene, K, kind, x, opts = {}) {
    const W = scene.scale.width, H = scene.scale.height;
    const img = scene.physics.add.image(x, H + 50 * K, tex(scene, kind, K)).setDepth(10);
    img.body.gravity.y = 640 * K;
    const peak = H * (opts.peakLo ?? 0.4) + Math.random() * H * 0.3;
    img.setVelocity(
      (W / 2 - x) * (0.25 + Math.random() * 0.5) + (Math.random() - 0.5) * (opts.vxSpread ?? 60) * K,
      -Math.sqrt(2 * 640 * K * Math.max(H * 0.25, peak)),
    );
    img.setAngularVelocity((Math.random() - 0.5) * 300);
    if (cfg.drift) img.body.velocity.x += (Math.random() - 0.5) * cfg.drift * K;
    const o = {
      img, kind, isBomb: kind === 'bomb',
      r: (SIZES[kind][0] + SIZES[kind][1]) / 4 * K * 1.15,
      born: scene.time.now,
    };
    if (o.isBomb) {
      o.fuse = scene.add.particles(0, 0, 'fx-dot', {
        speed: 40, scale: { start: 0.3 * K, end: 0 }, lifespan: 260,
        tint: 0xffd24a, blendMode: 'ADD', frequency: 40,
      }).setDepth(11).startFollow(img, 14 * K, -26 * K);
    }
    objs.push(o);
    return o;
  }

  function launch(scene, K) {
    const W = scene.scale.width;
    const isBomb = Math.random() < cfg.bombs;
    const kind = isBomb ? 'bomb' : cfg.objects[Math.floor(Math.random() * cfg.objects.length)];
    const x = W * (0.15 + Math.random() * 0.7);
    // the dragon's spine launches from anywhere, at anything
    if (cfg.spine) spawnObj(scene, K, kind, x, { vxSpread: 260, peakLo: 0.3 });
    else spawnObj(scene, K, kind, x);
  }

  function killObj(scene, o) {
    o.fuse?.destroy();
    o.img.destroy();
    const i = objs.indexOf(o);
    if (i >= 0) objs.splice(i, 1);
  }

  function freezeHalf(scene, half) {
    half.body.stop();
    half.body.enable = false;
    debris.push(half);
    const i = halves.indexOf(half);
    if (i >= 0) halves.splice(i, 1);
    if (debris.length > 44) {
      const old = debris.shift();
      scene.tweens.add({ targets: old, alpha: 0, duration: 900, onComplete: () => old.destroy() });
    }
  }

  function sliceObj(scene, o, dirX, dirY, K) {
    const { x, y } = o.img;
    const accent = cfg.accent;
    if (o.isBomb) {
      killObj(scene, o);
      api.score(-30);
      floatScore(scene, x, y, '-30', '#ff5d5d', 26 * K);
      burst(scene, x, y, 0xff5d3c, { n: 30, speed: 480 * K, scale: 0.8 * K });
      shockRing(scene, x, y, 0xff5d3c, 150 * K);
      flash(scene, 0xff2a1a, 160, 0.5);
      hitstop(scene, 130, () => shake(scene, 0.028, 260));
      api.haptic([30, 40, 60]);
      api.sfx('log');
      strokeSlices = 0;
      return;
    }
    // forge law: cold iron does not cut
    if (cfg.forge && o.kind === 'ingot' && !forgeHot(scene)) {
      squash(scene, o.img, Math.abs(dirX) > Math.abs(dirY) ? 'x' : 'y');
      o.img.setTint(0x8890a8);
      scene.time.delayedCall(180, () => o.img.active && o.img.clearTint());
      floatScore(scene, x, y - 20 * K, 'cold!', '#8a9ac8', 15 * K);
      shake(scene, 0.004, 70);
      api.sfx('tap');
      return;
    }
    strokeSlices++;
    let gain = (10 + (strokeSlices - 1) * 5) + (VALUE[o.kind] ?? 0);
    let label = `+${gain}`;
    // grove law: a vertical stroke is the honest cut
    if (cfg.vertical && Math.abs(dirY) > 0.85) {
      gain = Math.round(gain * 1.5);
      label = `KIRI +${gain}`;
    }
    api.score(gain);
    api.haptic(8);
    api.note(strokeSlices - 1);
    if (strokeSlices >= 3) api.sfx('objDone');
    floatScore(scene, x, y - 20 * K, label, VALUE[o.kind] ? '#fff0c8' : '#ffd24a', (20 + Math.min(12, strokeSlices * 3)) * K);
    burst(scene, x, y, accent, { n: 14, speed: 340 * K, scale: 0.55 * K });
    collectTo(scene, x, y, scene.scale.width - 30 * K, 20 * K, 0xffd24a, 5);
    if (strokeSlices >= 2) { shockRing(scene, x, y, accent, 90 * K); hitstop(scene, 40); }
    if (strokeSlices === 3) banner(scene, 'COMBO ×3', '#ffd24a', 30 * K);
    if (strokeSlices >= 4) {
      banner(scene, `COMBO ×${strokeSlices}`, '#ff9a3c', 34 * K);
      flash(scene, 0xfff0c8, 90, 0.3);
      if (!stance.active) slowmo(scene, 0.35, 420);
      zoomPunch(scene, 1.07, 240);
      shake(scene, 0.01, 160);
    }
    // hall law: every stroke gutters the candles
    if (cfg.candles) world.darkness = Math.min(0.6, world.darkness + 0.05);
    // gate law: surviving spirits blink away from a blade that misses them
    if (cfg.blink) {
      for (const s of objs) {
        if (s.kind === 'orb' && s !== o && Math.random() < 0.5) {
          const nx = scene.scale.width * (0.12 + Math.random() * 0.76);
          scene.tweens.add({ targets: s.img, alpha: 0, duration: 90, yoyo: true, onYoyo: () => { s.img.x = nx; } });
        }
      }
    }
    // split into two spinning halves along the stroke
    const key = o.img.texture.key;
    const tw = o.img.width, th = o.img.height;
    const px = -dirY, py = dirX;
    for (const side of [-1, 1]) {
      const half = scene.physics.add.image(x, y, key).setDepth(10);
      half.setCrop(side < 0 ? 0 : tw / 2, 0, tw / 2, th);
      half.body.gravity.y = 640 * K;
      half.setVelocity(
        o.img.body.velocity.x * 0.4 + px * side * 130 * K,
        Math.min(o.img.body.velocity.y * 0.4, 0) + py * side * 130 * K - 60 * K,
      );
      half.setAngularVelocity(side * (200 + Math.random() * 220));
      halves.push(half);
    }
    killObj(scene, o);
  }

  function drawCut(scene, dirX, dirY, K) {
    // the flick out of stance: one cut through everything on the line
    const W = scene.scale.width, H = scene.scale.height;
    const cx = lastPt?.x ?? W / 2, cy = lastPt?.y ?? H / 2;
    const len = Math.hypot(dirX, dirY) || 1;
    const ux = dirX / len, uy = dirY / len;
    const hits = [];
    for (const o of [...objs]) {
      // distance from object to the infinite line through (cx,cy)
      const dx = o.img.x - cx, dy = o.img.y - cy;
      const d = Math.abs(dx * uy - dy * ux);
      if (d <= o.r + 26 * K) hits.push(o);
    }
    // the cut line, drawn as a blade of light
    const lineGfx = scene.add.graphics().setDepth(45).setBlendMode(P.BlendModes.ADD);
    lineGfx.lineStyle(20 * K, cfg.accent, 0.3).lineBetween(cx - ux * W * 2, cy - uy * W * 2, cx + ux * W * 2, cy + uy * W * 2);
    lineGfx.lineStyle(6 * K, cfg.blade, 0.95).lineBetween(cx - ux * W * 2, cy - uy * W * 2, cx + ux * W * 2, cy + uy * W * 2);
    scene.tweens.add({ targets: lineGfx, alpha: 0, duration: 420, onComplete: () => lineGfx.destroy() });
    flash(scene, 0xffffff, 110, 0.45);
    if (hits.length) {
      hitstop(scene, Math.min(220, 90 + hits.length * 20), () => {
        shake(scene, 0.012 + hits.length * 0.003, 240);
        zoomPunch(scene, 1.1, 280);
      });
      for (const o of hits) sliceObj(scene, o, ux, uy, K);
      const gain = hits.length * 15;
      api.score(gain);
      glyphBanner(scene, `${hits.length}-FOLD CUT`, '#fff0c8', 32 * K);
      floatScore(scene, cx, cy - 40 * K, `+${gain}`, '#fff0c8', 30 * K);
      if (hits.length >= 5) api.sfx('pr');
      else api.sfx('objDone');
      api.haptic([12, 30, 12, 30, 12]);
    } else {
      api.sfx('tap');
    }
  }

  function enterStance(scene) {
    stance.active = true;
    scene.time.timeScale = 0.16;
    scene.tweens.timeScale = 0.16;
    if (scene.physics?.world) scene.physics.world.timeScale = 1 / 0.16;
    api.sfx('tap');
    api.haptic(20);
  }

  function exitStance(scene) {
    stance.active = false;
    scene.time.timeScale = 1;
    scene.tweens.timeScale = 1;
    if (scene.physics?.world) scene.physics.world.timeScale = 1;
  }

  function segHit(ax, ay, bx, by, cx, cy, r) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2));
    const px = ax + dx * t - cx, py = ay + dy * t - cy;
    return px * px + py * py <= r * r;
  }

  return {
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },

    fever() { fever = true; },

    create() {
      const scene = this;
      const K = unit(scene);
      ensureFx(scene);
      paintSky(scene, cfg.sky);
      drawLand(scene, cfg, K, world);
      ambientMotes(scene, cfg.accent, { alpha: cfg.candles ? 0.3 : 0.5 });
      bloomCamera(scene);
      vignette(scene, 0.4, 0.75);

      if (cfg.snow) {
        scene.add.particles(0, 0, 'fx-chip', {
          x: { min: 0, max: scene.scale.width }, y: -10,
          speedY: { min: 40 * K, max: 110 * K }, speedX: { min: -30 * K, max: 30 * K },
          scale: { min: 0.14 * K, max: 0.34 * K }, alpha: 0.8,
          lifespan: 12000, frequency: 140, advance: 9000,
        }).setDepth(-30);
      }
      if (cfg.embers) {
        scene.add.particles(0, 0, 'fx-dot', {
          x: { min: 0, max: scene.scale.width }, y: scene.scale.height + 10,
          speedY: { min: -120 * K, max: -50 * K }, speedX: { min: -20 * K, max: 20 * K },
          scale: { start: 0.3 * K, end: 0 }, tint: 0xff7a3c, blendMode: 'ADD',
          lifespan: 5000, frequency: 160, advance: 5000,
        }).setDepth(-30);
      }
      if (cfg.candles) {
        darkVeil = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x08040a, world.darkness)
          .setOrigin(0).setDepth(-20);
      }
      if (cfg.ribbon) ribbonGfx = scene.add.graphics().setDepth(-60);

      trailGfx = scene.add.graphics().setDepth(40).setBlendMode(P.BlendModes.ADD);
      stanceGfx = scene.add.graphics().setDepth(42).setBlendMode(P.BlendModes.ADD);
      sliceGlow = scene.add.particles(0, 0, 'fx-dot', {
        speed: { min: 20, max: 90 }, scale: { start: 0.4 * K, end: 0 },
        lifespan: 220, tint: cfg.blade, blendMode: 'ADD', frequency: -1,
      }).setDepth(41);

      t0 = scene.time.now;
      nextSpawn = scene.time.now + 500;

      scene.input.on('pointerdown', (p) => {
        lastPt = { x: p.x, y: p.y, t: scene.time.now };
        downAt = scene.time.now;
        stance.lastMoveT = scene.time.now;
        strokeSlices = 0;
      });
      scene.input.on('pointerup', () => {
        if (stance.active) exitStance(scene);
        lastPt = null;
        strokeSlices = 0;
      });
      scene.input.on('pointermove', (p) => {
        if (!lastPt) return;
        const now = scene.time.now;
        const dt = Math.max(1, now - lastPt.t);
        const dx = p.x - lastPt.x, dy = p.y - lastPt.y;
        const dist = Math.hypot(dx, dy);
        const speed = dist / dt;
        trail.push({ x: p.x, y: p.y, t: now });
        if (dist > 3) stance.lastMoveT = now;
        if (stance.active && speed > 0.5 && dist > 14) {
          // the draw-cut: flick out of the sheathe
          exitStance(scene);
          stance.meter = 0;
          drawCut(scene, dx, dy, unit(scene));
          lastPt = { x: p.x, y: p.y, t: now };
          return;
        }
        if (speed > 0.45) {
          sliceGlow.emitParticleAt(p.x, p.y, 2);
          const len = dist || 1;
          // waterfall law: the ribbon parts where the blade crosses it
          if (cfg.ribbon && world.ribbonOpen <= 0) {
            const rx = scene.scale.width * 0.5;
            if ((lastPt.x - rx) * (p.x - rx) < 0) {
              world.ribbonOpen = 2000;
              const K2 = unit(scene);
              burst(scene, rx, (lastPt.y + p.y) / 2, 0xbfe8f8, { n: 22, speed: 300 * K2, scale: 0.5 * K2 });
              spawnObj(scene, K2, 'goldkoi', rx, { vxSpread: 200 });
              if (Math.random() < 0.6) spawnObj(scene, K2, 'goldkoi', rx, { vxSpread: 200 });
              api.sfx('objDone');
            }
          }
          for (const o of [...objs]) {
            if (segHit(lastPt.x, lastPt.y, p.x, p.y, o.img.x, o.img.y, o.r)) {
              sliceObj(scene, o, dx / len, dy / len, unit(scene));
            }
          }
        }
        lastPt = { x: p.x, y: p.y, t: now };
      });
    },

    update(t, dtMs) {
      const scene = this;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      const now = scene.time.now;

      // ——— sheathe stance ———
      if (lastPt && !stance.active && stance.meter >= 0.5 && strokeSlices === 0
        && now - downAt > 300 && now - stance.lastMoveT > 300) {
        enterStance(scene);
      }
      if (stance.active) {
        stance.meter -= dtMs / 2200;
        if (stance.meter <= 0) { stance.meter = 0; exitStance(scene); }
      } else {
        stance.meter = Math.min(1, stance.meter + dtMs / 6000);
      }
      stanceGfx.clear();
      // stance meter: a thin blade of light along the top of the canvas
      stanceGfx.fillStyle(cfg.blade, 0.7).fillRect(0, 0, W * stance.meter, 3 * K);
      if (stance.active && lastPt) {
        const pulse = 0.5 + 0.3 * Math.sin(now / 90);
        stanceGfx.lineStyle(2.5 * K, cfg.blade, pulse);
        stanceGfx.strokeCircle(lastPt.x, lastPt.y, 44 * K + 6 * K * Math.sin(now / 140));
        stanceGfx.fillStyle(cfg.accent, 0.06).fillRect(0, 0, W, H);
      }

      // ——— world clocks ———
      if (cfg.ribbon) {
        world.ribbonOpen = Math.max(0, world.ribbonOpen - dtMs);
        ribbonGfx.clear();
        const openF = world.ribbonOpen > 0 ? 0.18 : 1;
        ribbonGfx.fillStyle(0xbfe8f8, 0.2 * openF).fillRect(W * 0.5 - 22 * K, 0, 44 * K, H);
        ribbonGfx.fillStyle(0xffffff, 0.14 * openF).fillRect(W * 0.5 - 8 * K, 0, 16 * K, H);
      }
      if (cfg.candles && darkVeil) {
        world.darkness = Math.max(0.34, world.darkness - dtMs / 24000);
        darkVeil.setAlpha(world.darkness);
      }
      if (cfg.icetime) {
        world.nextFreeze -= dtMs;
        if (world.frozen > 0) {
          world.frozen -= dtMs;
          if (world.frozen <= 0) {
            for (const o of objs) {
              o.img.body.enable = true;
              o.img.clearTint();
            }
          }
        } else if (world.nextFreeze <= 0) {
          world.nextFreeze = 7000;
          world.frozen = 1400;
          for (const o of objs) {
            o.img.body.enable = false;
            o.img.setTint(0xaadcff);
          }
          flash(scene, 0xaadcff, 120, 0.25);
          api.sfx('tap');
        }
      }
      if (cfg.spine && world.spineGfx) {
        world.spineT += dtMs / 1000;
        const g = world.spineGfx;
        g.clear();
        g.fillStyle(0x2c3a7c, 0.9);
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= W; x += W / 24) {
          g.lineTo(x, H * 0.9 + Math.sin(world.spineT * 1.4 + x / (W / 6)) * H * 0.035);
        }
        g.lineTo(W, H);
        g.closePath(); g.fillPath();
        for (let x = W / 24; x < W; x += W / 8) {
          const y = H * 0.9 + Math.sin(world.spineT * 1.4 + x / (W / 6)) * H * 0.035;
          g.fillStyle(0x7ad0ff, 0.8);
          g.fillTriangle(x - 8 * K, y, x, y - 16 * K, x + 8 * K, y);
        }
        // the itch-spot rides the spine
        if (now - world.itchAt > 5000 && !objs.some((o) => o.kind === 'itch')) {
          world.itchAt = now;
          const o = spawnObj(scene, K, 'itch', W * (0.2 + Math.random() * 0.6), { peakLo: 0.35 });
          o.img.setTint(0xffe9a0);
        }
      }

      // ——— spawning, ramping over the rest period ———
      if (now >= nextSpawn) {
        const elapsed = (now - t0) / 1000;
        let volley = 1 + (elapsed > 18 ? 1 : 0) + (elapsed > 45 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
        if (fever) volley += 1;
        for (let i = 0; i < volley; i++) scene.time.delayedCall(i * 130, () => launch(scene, K));
        nextSpawn = now + Math.max(560, 1250 - elapsed * 9) / (cfg.pace * (fever ? 1.35 : 1));
      }

      // ——— housekeeping ———
      for (const o of [...objs]) {
        if ((o.img.y > H + 70 * K && o.img.body.velocity.y > 0) || now - o.born > 9000) killObj(scene, o);
      }
      for (const half of [...halves]) {
        if (!half.active) { halves.splice(halves.indexOf(half), 1); continue; }
        if (half.y > H * 0.92 && half.body.velocity.y > -10) freezeHalf(scene, half);
        else if (half.y > H + 80 * K) { halves.splice(halves.indexOf(half), 1); half.destroy(); }
      }

      // ——— blade trail ———
      while (trail.length && now - trail[0].t > 160) trail.shift();
      trailGfx.clear();
      if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
          const a = i / trail.length;
          trailGfx.lineStyle(14 * K * a, cfg.accent, 0.28 * a);
          trailGfx.lineBetween(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
          trailGfx.lineStyle(5 * K * a, cfg.blade, 0.85 * a);
          trailGfx.lineBetween(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
        }
      }
    },
  };
}

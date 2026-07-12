// IAIDO BLADE — Mount Volcano Dojo. Objects arc up from below; a swipe is
// a sword stroke. Slice everything, chain slices in one stroke for combos,
// never touch the powder kegs. Fruit-ninja mechanics on Arcade physics:
// every target is a physics body, every slice splits it into two spinning
// halves, and big combos bend time.
import { ensureFx, canvasTex, burst, shockRing, floatScore, banner, shake, flash, hitstop, slowmo, paintSky, ambientMotes, unit } from '../fx.js';

export const TITLE = 'Iaido Blade';

export const WORLDS = {
  'dojo-stairs': {
    name: 'Thousand Stairs', sky: [[0, '#241048'], [0.55, '#7c3060'], [1, '#e8975c']],
    accent: 0xffb46c, blade: 0xffe9b3, objects: ['lantern', 'scroll'], bombs: 0.12, pace: 1.0, land: 'stairs',
  },
  'dojo-falls': {
    name: 'Waterfall Slice', sky: [[0, '#0e2c4c'], [0.6, '#1c6a8c'], [1, '#7ac8dc']],
    accent: 0x9adcf0, blade: 0xdff6ff, objects: ['koi', 'gourd'], bombs: 0, drift: 90, pace: 1.05, land: 'falls',
  },
  'dojo-summit': {
    name: 'Forge Tempering', sky: [[0, '#190a12'], [0.55, '#5c1f28'], [1, '#c2452e']],
    accent: 0xff9a4c, blade: 0xffd0a0, objects: ['ingot', 'coal'], bombs: 0.2, pace: 1.15, land: 'summit', embers: true,
  },
  'dojo-bamboo': {
    name: 'Grove Cutter', sky: [[0, '#0f2a0c'], [0.6, '#3f7a2c'], [1, '#a8d46c']],
    accent: 0xc8f09a, blade: 0xeaffd0, objects: ['bamboo', 'melon'], bombs: 0.08, pace: 1.1, land: 'bamboo',
  },
  'dojo-torii': {
    name: 'Spirit Gate Slash', sky: [[0, '#320c28'], [0.55, '#7c2040'], [1, '#ff7a4c']],
    accent: 0xffc46c, blade: 0xffe2c0, objects: ['orb', 'charm'], bombs: 0.1, pace: 1.15, land: 'torii',
  },
  'dojo-snow': {
    name: 'Snowbound Kata', sky: [[0, '#141c3c'], [0.6, '#44608f'], [1, '#b8d0ec']],
    accent: 0xffffff, blade: 0xdfefff, objects: ['flake', 'peach'], bombs: 0.06, pace: 0.95, land: 'snow', snow: true,
  },
  'dojo-hall': {
    name: 'Candle Discipline', sky: [[0, '#120b06'], [0.6, '#38220f'], [1, '#6e421a']],
    accent: 0xffc46c, blade: 0xfff0c8, objects: ['candle', 'scroll'], bombs: 0.1, pace: 1.0, land: 'hall', candles: true,
  },
};

// ——— sprite painters: canvas 2D once, WebGL sprite forever ———
// Every one gets character — this dojo puts faces on its fruit.

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
  bomb(c, w, h) {
    const g = c.createRadialGradient(w * 0.38, h * 0.42, 2, w / 2, h * 0.56, w * 0.48);
    g.addColorStop(0, '#4a4a5c'); g.addColorStop(1, '#14141e');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h * 0.58, w * 0.38, 0, 7); c.fill();
    c.fillStyle = '#2a2a38';
    c.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.14);
    c.strokeStyle = '#c8b088'; c.lineWidth = w * 0.045; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.5, h * 0.12); c.quadraticCurveTo(w * 0.68, h * 0.02, w * 0.78, h * 0.1); c.stroke();
    // angry face — it WANTS you to make a mistake
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

function drawLand(scene, cfg, K) {
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
      // three ridge layers, the front one cut into giant steps
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
      for (const [x, w] of [[W * 0.3, W * 0.1], [W * 0.52, W * 0.14], [W * 0.72, W * 0.08]]) {
        g.fillStyle(0xbfe8f8, 0.16); g.fillRect(x, 0, w, H);
        g.fillStyle(0xffffff, 0.1); g.fillRect(x + w * 0.3, 0, w * 0.2, H);
      }
      break;
    }
    case 'summit': {
      silh([[0, H * 0.62], [W * 0.36, H * 0.24], [W * 0.5, H * 0.3], [W * 0.66, H * 0.2], [W, H * 0.58]], 0x30101a, 0.9);
      const cr = scene.add.image(W * 0.52, H * 0.26, 'fx-dot').setScale(K * 3.2).setTint(0xff6a2c).setBlendMode('ADD').setAlpha(0.7).setDepth(-89);
      scene.tweens.add({ targets: cr, alpha: 0.35, scale: K * 2.6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
      // temple roof
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
      for (let i = 0; i < 7; i++) {
        const cx = W * (0.08 + i * 0.14);
        const fl = scene.add.image(cx, H * 0.88, 'fx-dot').setScale(K * 0.55).setTint(0xffb43c).setBlendMode('ADD').setDepth(-88);
        scene.tweens.add({ targets: fl, scaleX: K * 0.4, scaleY: K * 0.7, alpha: 0.6, duration: 300 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      break;
    }
  }
  // grounding band so objects launch from somewhere real
  g.fillStyle(0x000000, 0.35);
  g.fillRect(0, H * 0.94, W, H * 0.06);
}

const SIZES = { koi: [72, 44], lantern: [56, 62], scroll: [60, 40], gourd: [44, 58], ingot: [64, 34], coal: [52, 48], bamboo: [40, 84], melon: [58, 58], orb: [56, 56], charm: [42, 58], flake: [54, 54], peach: [52, 52], candle: [36, 66], bomb: [54, 60] };

export function create(P, ctx) {
  const { api, cfg } = ctx;
  const objs = [];
  const trail = []; // {x, y, t}
  let trailGfx, sliceGlow;
  let strokeSlices = 0;
  let lastPt = null;
  let nextSpawn = 0;
  let t0 = 0;

  function tex(scene, kind, K) {
    const [w, h] = SIZES[kind];
    return canvasTex(scene, `dj-${kind}`, w * K, h * K, PAINT[kind]);
  }

  function launch(scene, K) {
    const W = scene.scale.width, H = scene.scale.height;
    const isBomb = Math.random() < cfg.bombs;
    const kind = isBomb ? 'bomb' : cfg.objects[Math.floor(Math.random() * cfg.objects.length)];
    const x = W * (0.15 + Math.random() * 0.7);
    const img = scene.physics.add.image(x, H + 50 * K, tex(scene, kind, K)).setDepth(10);
    img.body.gravity.y = 640 * K;
    // rise to a peak between 25% and 60% of the canvas
    const peak = H * (0.4 + Math.random() * 0.35);
    img.setVelocity(
      (W / 2 - x) * (0.25 + Math.random() * 0.5) + (Math.random() - 0.5) * 60 * K,
      -Math.sqrt(2 * 640 * K * peak),
    );
    img.setAngularVelocity((Math.random() - 0.5) * 300);
    if (cfg.drift) img.body.velocity.x += (Math.random() - 0.5) * cfg.drift * K;
    const o = { img, kind, isBomb, r: (SIZES[kind][0] + SIZES[kind][1]) / 4 * K * 1.15, born: scene.time.now };
    if (isBomb) {
      o.fuse = scene.add.particles(0, 0, 'fx-dot', {
        speed: 40, scale: { start: 0.3 * K, end: 0 }, lifespan: 260,
        tint: 0xffd24a, blendMode: 'ADD', frequency: 40,
      }).setDepth(11).startFollow(img, 14 * K, -26 * K);
    }
    objs.push(o);
  }

  function killObj(scene, o) {
    o.fuse?.destroy();
    o.img.destroy();
    objs.splice(objs.indexOf(o), 1);
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
      hitstop(scene, 90, () => shake(scene, 0.028, 260));
      api.haptic([30, 40, 60]);
      api.sfx('log');
      strokeSlices = 0;
      return;
    }
    strokeSlices++;
    const gain = 10 + (strokeSlices - 1) * 5;
    api.score(gain);
    api.haptic(8);
    api.sfx(strokeSlices >= 3 ? 'objDone' : 'tap');
    floatScore(scene, x, y - 20 * K, `+${gain}`, '#ffd24a', (20 + Math.min(12, strokeSlices * 3)) * K);
    burst(scene, x, y, accent, { n: 14, speed: 340 * K, scale: 0.55 * K });
    if (strokeSlices >= 2) shockRing(scene, x, y, accent, 90 * K);
    if (strokeSlices === 3) banner(scene, 'COMBO ×3', '#ffd24a', 30 * K);
    if (strokeSlices >= 4) {
      banner(scene, `COMBO ×${strokeSlices}`, '#ff9a3c', 34 * K);
      flash(scene, 0xfff0c8, 90, 0.3);
      slowmo(scene, 0.35, 420);
      shake(scene, 0.01, 160);
    }
    // split into two spinning halves along the stroke
    const key = o.img.texture.key;
    const tw = o.img.width, th = o.img.height;
    const px = -dirY, py = dirX; // perpendicular to the slash
    for (const side of [-1, 1]) {
      const half = scene.physics.add.image(x, y, key).setDepth(10);
      half.setCrop(side < 0 ? 0 : tw / 2, 0, tw / 2, th);
      half.body.gravity.y = 640 * K;
      half.setVelocity(
        o.img.body.velocity.x * 0.4 + px * side * 130 * K,
        Math.min(o.img.body.velocity.y * 0.4, 0) + py * side * 130 * K - 60 * K,
      );
      half.setAngularVelocity(side * (200 + Math.random() * 220));
      scene.tweens.add({ targets: half, alpha: 0, delay: 350, duration: 500, onComplete: () => half.destroy() });
    }
    killObj(scene, o);
  }

  // distance from circle center to the stroke segment
  function segHit(ax, ay, bx, by, cx, cy, r) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2));
    const px = ax + dx * t - cx, py = ay + dy * t - cy;
    return px * px + py * py <= r * r;
  }

  return {
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },

    create() {
      const scene = this;
      const K = unit(scene);
      ensureFx(scene);
      paintSky(scene, cfg.sky);
      drawLand(scene, cfg, K);
      ambientMotes(scene, cfg.accent, { alpha: cfg.candles ? 0.3 : 0.5 });
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
        scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x08040a, 0.34).setOrigin(0).setDepth(-20);
      }

      trailGfx = scene.add.graphics().setDepth(40).setBlendMode(P.BlendModes.ADD);
      sliceGlow = scene.add.particles(0, 0, 'fx-dot', {
        speed: { min: 20, max: 90 }, scale: { start: 0.4 * K, end: 0 },
        lifespan: 220, tint: cfg.blade, blendMode: 'ADD', frequency: -1,
      }).setDepth(41);

      t0 = scene.time.now;
      nextSpawn = scene.time.now + 500;

      scene.input.on('pointerdown', (p) => { lastPt = { x: p.x, y: p.y, t: scene.time.now }; strokeSlices = 0; });
      scene.input.on('pointerup', () => { lastPt = null; strokeSlices = 0; });
      scene.input.on('pointermove', (p) => {
        if (!lastPt) return;
        const now = scene.time.now;
        const dt = Math.max(1, now - lastPt.t);
        const dx = p.x - lastPt.x, dy = p.y - lastPt.y;
        const speed = Math.hypot(dx, dy) / dt; // px per ms
        trail.push({ x: p.x, y: p.y, t: now });
        if (speed > 0.45) {
          sliceGlow.emitParticleAt(p.x, p.y, 2);
          const len = Math.hypot(dx, dy) || 1;
          for (const o of [...objs]) {
            if (segHit(lastPt.x, lastPt.y, p.x, p.y, o.img.x, o.img.y, o.r)) {
              sliceObj(scene, o, dx / len, dy / len, K);
            }
          }
        }
        lastPt = { x: p.x, y: p.y, t: now };
      });
    },

    update() {
      const scene = this;
      const K = unit(scene);
      const H = scene.scale.height;
      const now = scene.time.now;

      // spawn volleys, ramping up over the rest period
      if (now >= nextSpawn) {
        const elapsed = (now - t0) / 1000;
        const volley = 1 + (elapsed > 18 ? 1 : 0) + (elapsed > 45 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
        for (let i = 0; i < volley; i++) scene.time.delayedCall(i * 130, () => launch(scene, K));
        nextSpawn = now + Math.max(560, 1250 - elapsed * 9) / cfg.pace;
      }

      // cull fallen objects
      for (const o of [...objs]) {
        if ((o.img.y > H + 70 * K && o.img.body.velocity.y > 0) || now - o.born > 9000) killObj(scene, o);
      }

      // blade trail: taper, glow, fade over 160ms
      while (trail.length && now - trail[0].t > 160) trail.shift();
      trailGfx.clear();
      if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
          const a = (i / trail.length);
          trailGfx.lineStyle(14 * K * a, cfg.accent, 0.28 * a);
          trailGfx.lineBetween(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
          trailGfx.lineStyle(5 * K * a, cfg.blade, 0.85 * a);
          trailGfx.lineBetween(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
        }
      }
    },
  };
}

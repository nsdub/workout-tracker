// YETI BOWL — Yeti Mountain. At the summit, HOLD to pack the snowball:
// it grows while the slope-light burns down — release any time, or let
// the fuse launch you. A quick tap is a nimble build, a full hold is mass.
// Rolling, drag steers, and Katamari law governs:
// smaller than you smashes and feeds you, bigger than you bounces you.
// Every stretch of mountain ends in a snowman village arranged, of
// course, as bowling pins. A penguin rides on top, judging silently.
//
// Worlds re-carve the slope: swinging lift chairs, mogul launches with
// air steering, a strobe-lit disco cave, melt pools that shrink you,
// a frictionless ice lake, groomer machines carving boost lanes, and
// aurora pulses that float the world for a double-score breath.
import {
  ensureFx, canvasTex, burst, shockRing, floatScore, banner, glyphBanner,
  shake, flash, hitstop, slowmo, zoomPunch, collectTo, paintSky,
  ambientMotes, bloomCamera, vignette, squash, unit,
  celestial, driftClouds,
} from '../fx.js';

export const TITLE = 'Yeti Bowl';
// Re-anchored after the internal combo multiplier was removed (the cabinet
// chain pill is now the only multiplier): raw points run ~20% leaner, so
// thoughtless sweeping ≈22/s and deliberate strike play pushes past 30/s.
export const VERB = 'ROLL!';
export const GESTURE = 'Hold to grow';
export const STARS = [10, 20, 30];

export const HELP = {
  goal: 'Roll the biggest snowball you can down the mountain and flatten the snowman villages.',
  how: 'Hold to pack the snowball while the fuse burns, then release to roll and drag to steer. Anything smaller than you smashes for points, but the ball sheds snow as it rolls, so keep eating white drifts to stay big. A bigger ball hits harder yet rolls FASTER and steers slower, and a village falls most surely to a fat ball driven through its center.',
  avoid: 'Hitting something bigger than you is a wipeout: it stops you cold and shrinks the ball. Three wipeouts end the run. The dark stone crags are bigger than any snowball ever gets — the snow cracks open in their path a moment before they arrive, so read the crack and steer clear.',
};

export const WORLDS = {
  'yeti-village': {
    name: 'Village Lanes', sky: [[0, '#1a2445'], [0.6, '#44608f'], [1, '#b8d0ec']],
    accent: 0x9cc8ec, villageEvery: 2, obstacles: ['fence', 'pine', 'rock'],
  },
  'yeti-lift': {
    name: 'Chairlift Run', sky: [[0, '#141c3c'], [0.6, '#3a5080'], [1, '#a0c0e0']],
    accent: 0xffc46c, villageEvery: 3, obstacles: ['fence', 'pine'], lift: true,
  },
  'yeti-diamond': {
    name: 'Double Diamond', sky: [[0, '#0c1430'], [0.6, '#2c4060'], [1, '#8cb0d8']],
    accent: 0x7ad0ff, villageEvery: 3, obstacles: ['rock', 'pine'], moguls: true,
  },
  'yeti-disco': {
    name: 'Strobe Grotto', sky: [[0, '#0c0614'], [0.55, '#1c0c2c'], [1, '#38104c']],
    accent: 0xff8ad0, villageEvery: 3, obstacles: ['pillar', 'rock'], strobe: true,
  },
  'yeti-springs': {
    name: 'Melt Springs', sky: [[0, '#1c2c3c'], [0.6, '#3c5c6c'], [1, '#a8d0d8']],
    accent: 0x7ad4c8, villageEvery: 3, obstacles: ['rock', 'fence'], melt: true,
  },
  'yeti-icebar': {
    name: 'Black Ice Lake', sky: [[0, '#101828'], [0.6, '#2c3c58'], [1, '#7c9cc0']],
    accent: 0xaef0ff, villageEvery: 2, obstacles: ['fence', 'rock'], ice: true,
  },
  'yeti-groomer': {
    name: 'Groomer Alley', sky: [[0, '#141c30'], [0.6, '#34486c'], [1, '#94b4d8']],
    accent: 0xffd24a, villageEvery: 3, obstacles: ['fence', 'pine'], groomers: true,
  },
  'yeti-aurora': {
    name: 'Aurora Drift', sky: [[0, '#0a1024'], [0.55, '#16304c'], [1, '#2c6a6c']],
    accent: 0x7dffb3, villageEvery: 3, obstacles: ['pine', 'rock'], aurora: true,
  },
};

const PAINT = {
  ball(c, w, h) {
    const g = c.createRadialGradient(w * 0.4, h * 0.38, 1, w / 2, h / 2, w * 0.52);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#dce8f4'); g.addColorStop(1, '#a8c0d8');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.47, 0, 7); c.fill();
    c.fillStyle = 'rgba(140,170,200,.5)';
    c.beginPath(); c.arc(w * 0.34, h * 0.6, w * 0.07, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.62, h * 0.34, w * 0.05, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.58, h * 0.7, w * 0.06, 0, 7); c.fill();
  },
  penguin(c, w, h) {
    c.fillStyle = '#1c2430';
    c.beginPath(); c.ellipse(w / 2, h * 0.55, w * 0.3, h * 0.4, 0, 0, 7); c.fill();
    c.fillStyle = '#f4fafd';
    c.beginPath(); c.ellipse(w / 2, h * 0.62, w * 0.18, h * 0.28, 0, 0, 7); c.fill();
    c.fillStyle = '#ffb43c';
    c.beginPath(); c.moveTo(w * 0.44, h * 0.34); c.lineTo(w * 0.56, h * 0.34); c.lineTo(w * 0.5, h * 0.46); c.closePath(); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(w * 0.42, h * 0.26, w * 0.07, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.58, h * 0.26, w * 0.07, 0, 7); c.fill();
    c.fillStyle = '#0c1018';
    c.beginPath(); c.arc(w * 0.43, h * 0.27, w * 0.035, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.57, h * 0.27, w * 0.035, 0, 7); c.fill();
    c.fillStyle = '#ffb43c';
    c.beginPath(); c.ellipse(w * 0.4, h * 0.94, w * 0.12, h * 0.05, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(w * 0.6, h * 0.94, w * 0.12, h * 0.05, 0, 0, 7); c.fill();
  },
  snowman(c, w, h) {
    c.fillStyle = '#f4fafd';
    c.beginPath(); c.arc(w / 2, h * 0.72, w * 0.3, 0, 7); c.fill();
    c.beginPath(); c.arc(w / 2, h * 0.4, w * 0.22, 0, 7); c.fill();
    c.fillStyle = '#14141c';
    c.beginPath(); c.arc(w * 0.42, h * 0.36, w * 0.045, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.58, h * 0.36, w * 0.045, 0, 7); c.fill();
    // coal-eyed and up to no good
    c.strokeStyle = '#14141c'; c.lineWidth = w * 0.035;
    c.beginPath(); c.arc(w * 0.5, h * 0.47, w * 0.09, 3.6, 5.8); c.stroke();
    c.fillStyle = '#ff8a3c';
    c.beginPath(); c.moveTo(w * 0.5, h * 0.4); c.lineTo(w * 0.68, h * 0.44); c.lineTo(w * 0.5, h * 0.47); c.closePath(); c.fill();
    c.strokeStyle = '#5c3414'; c.lineWidth = w * 0.04; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.24, h * 0.62); c.lineTo(w * 0.04, h * 0.5); c.stroke();
    c.beginPath(); c.moveTo(w * 0.76, h * 0.62); c.lineTo(w * 0.96, h * 0.5); c.stroke();
  },
  fence(c, w, h) {
    c.fillStyle = '#a8542c';
    for (let i = 0; i < 4; i++) c.fillRect(w * (0.06 + i * 0.26), 0, w * 0.1, h);
    c.fillRect(0, h * 0.2, w, h * 0.16);
    c.fillRect(0, h * 0.6, w, h * 0.16);
  },
  pine(c, w, h) {
    c.fillStyle = '#5c3414';
    c.fillRect(w * 0.44, h * 0.8, w * 0.12, h * 0.2);
    c.fillStyle = '#2f7d54';
    for (let i = 0; i < 3; i++) {
      const y = h * (0.75 - i * 0.24), s = 1 - i * 0.24;
      c.beginPath(); c.moveTo(w * 0.5, y - h * 0.26); c.lineTo(w * (0.5 + 0.42 * s), y); c.lineTo(w * (0.5 - 0.42 * s), y); c.closePath(); c.fill();
      if (i === 0) { c.strokeStyle = 'rgba(210,236,220,.5)'; c.lineWidth = w * 0.02; c.stroke(); } // hold the tree on Aurora / Black Ice ground
    }
    c.fillStyle = 'rgba(244,250,253,.85)';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.28, w * 0.16, h * 0.05, -0.3, 0, 7); c.fill();
    c.beginPath(); c.ellipse(w * 0.36, h * 0.52, w * 0.14, h * 0.05, 0.2, 0, 7); c.fill();
  },
  rock(c, w, h) {
    c.fillStyle = '#5c6a80';
    c.beginPath();
    c.moveTo(w * 0.12, h * 0.85); c.lineTo(w * 0.28, h * 0.3); c.lineTo(w * 0.6, h * 0.12);
    c.lineTo(w * 0.9, h * 0.5); c.lineTo(w * 0.82, h * 0.85);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(244,250,253,.9)';
    c.beginPath(); c.ellipse(w * 0.55, h * 0.22, w * 0.22, h * 0.08, 0.2, 0, 7); c.fill();
  },
  boulder(c, w, h) {
    // a menacing dark crag, snow-capped, clearly too big to plow
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6b7488'); g.addColorStop(1, '#3e4656');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(w * 0.06, h * 0.94); c.lineTo(w * 0.14, h * 0.42); c.lineTo(w * 0.36, h * 0.16);
    c.lineTo(w * 0.6, h * 0.08); c.lineTo(w * 0.86, h * 0.34); c.lineTo(w * 0.96, h * 0.7);
    c.lineTo(w * 0.9, h * 0.94);
    c.closePath(); c.fill();
    // bright rim: the collision box is the whole crag, but only the snow cap was
    // visible on black — trace the true silhouette so the whole hazard reads,
    // and survive the multiplicative threat-tint applied at runtime.
    c.strokeStyle = 'rgba(230,244,255,.92)'; c.lineWidth = Math.max(2.5, w * 0.035); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = w * 0.02;
    c.beginPath(); c.moveTo(w * 0.4, h * 0.2); c.lineTo(w * 0.5, h * 0.6); c.lineTo(w * 0.38, h * 0.9); c.stroke();
    c.beginPath(); c.moveTo(w * 0.7, h * 0.3); c.lineTo(w * 0.62, h * 0.7); c.stroke();
    c.fillStyle = 'rgba(244,250,253,.92)';
    c.beginPath();
    c.moveTo(w * 0.36, h * 0.16); c.lineTo(w * 0.6, h * 0.08); c.lineTo(w * 0.86, h * 0.34);
    c.lineTo(w * 0.66, h * 0.28); c.lineTo(w * 0.5, h * 0.22); c.closePath(); c.fill();
  },
  pillar(c, w, h) {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#8cd0e8'); g.addColorStop(0.5, '#d8f0fc'); g.addColorStop(1, '#6ab0d0');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(w * 0.2, 0, w * 0.6, h, w * 0.16); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.fillRect(w * 0.34, h * 0.1, w * 0.1, h * 0.8);
  },
  chair(c, w, h) {
    c.strokeStyle = '#2c3648'; c.lineWidth = w * 0.08;
    c.beginPath(); c.moveTo(w * 0.5, 0); c.lineTo(w * 0.5, h * 0.4); c.stroke();
    c.fillStyle = '#c2452e';
    c.fillRect(w * 0.14, h * 0.4, w * 0.72, h * 0.16);
    c.fillRect(w * 0.14, h * 0.4, w * 0.14, h * 0.5);
    c.fillStyle = '#8c2c1c';
    c.fillRect(w * 0.14, h * 0.86, w * 0.72, h * 0.12);
  },
  groomer(c, w, h) {
    c.fillStyle = '#c2452e';
    c.beginPath(); c.roundRect(w * 0.1, h * 0.2, w * 0.8, h * 0.5, w * 0.08); c.fill();
    c.fillStyle = '#1c2430';
    c.beginPath(); c.roundRect(0, h * 0.6, w, h * 0.34, w * 0.1); c.fill();
    c.fillStyle = '#3c4a5c';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(w * (0.14 + i * 0.18), h * 0.78, w * 0.07, 0, 7); c.fill(); }
    c.fillStyle = '#ffe9b3';
    c.fillRect(w * 0.62, h * 0.28, w * 0.2, h * 0.2);
    c.fillStyle = '#e8975c';
    c.fillRect(w * 0.86, h * 0.3, w * 0.12, h * 0.36);
  },
  drift(c, w, h) {
    const g = c.createRadialGradient(w / 2, h * 0.8, 1, w / 2, h * 0.8, w * 0.55);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c8dcec');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(w / 2, h * 0.66, w * 0.46, h * 0.32, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)';
    c.beginPath(); c.ellipse(w * 0.36, h * 0.5, w * 0.2, h * 0.16, 0, 0, 7); c.fill();
  },
  pool(c, w, h) {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#7ad4c8'); g.addColorStop(0.8, '#3a8a8c'); g.addColorStop(1, 'rgba(58,138,140,0)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.48, h * 0.42, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath(); c.ellipse(w * 0.4, h * 0.4, w * 0.12, h * 0.06, -0.4, 0, 7); c.fill();
  },
  mogul(c, w, h) {
    // a snow KICKER — a launch ramp, deliberately unlike an edible drift:
    // a hard leading lip and a blue up-chevron say "this throws you"
    c.fillStyle = '#cddcec';
    c.beginPath();
    c.moveTo(0, h); c.lineTo(w * 0.16, h * 0.42);
    c.quadraticCurveTo(w * 0.5, -h * 0.04, w, h * 0.16);
    c.lineTo(w, h); c.closePath(); c.fill();
    // sunlit ramp face
    c.fillStyle = 'rgba(255,255,255,.92)';
    c.beginPath();
    c.moveTo(w * 0.16, h * 0.42); c.quadraticCurveTo(w * 0.5, -h * 0.04, w, h * 0.16);
    c.lineTo(w, h * 0.36); c.quadraticCurveTo(w * 0.5, h * 0.18, w * 0.22, h * 0.56);
    c.closePath(); c.fill();
    // the kicker lip
    c.strokeStyle = '#7ad0ff'; c.lineWidth = Math.max(2, w * 0.03); c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.16, h * 0.42); c.quadraticCurveTo(w * 0.5, -h * 0.04, w, h * 0.16); c.stroke();
    // up-chevron: the "launch" glyph
    c.strokeStyle = '#3aa0e8'; c.lineWidth = Math.max(2.5, w * 0.05); c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(w * 0.34, h * 0.7); c.lineTo(w * 0.5, h * 0.5); c.lineTo(w * 0.66, h * 0.7);
    c.stroke();
  },
  crack(c, w, h) {
    // the mountain groans before the crag: a fissure splits the snow where
    // a boulder is about to surface — the warning you steer away from
    c.strokeStyle = 'rgba(255,150,120,.85)'; c.lineWidth = w * 0.09; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(w * 0.04, h * 0.55); c.lineTo(w * 0.2, h * 0.4); c.lineTo(w * 0.34, h * 0.62);
    c.lineTo(w * 0.5, h * 0.3); c.lineTo(w * 0.66, h * 0.6); c.lineTo(w * 0.8, h * 0.42); c.lineTo(w * 0.96, h * 0.52);
    c.stroke();
    c.strokeStyle = 'rgba(120,80,90,.9)'; c.lineWidth = w * 0.03;
    c.beginPath();
    c.moveTo(w * 0.04, h * 0.55); c.lineTo(w * 0.2, h * 0.4); c.lineTo(w * 0.34, h * 0.62);
    c.lineTo(w * 0.5, h * 0.3); c.lineTo(w * 0.66, h * 0.6); c.lineTo(w * 0.8, h * 0.42); c.lineTo(w * 0.96, h * 0.52);
    c.stroke();
    c.lineWidth = w * 0.018;
    c.beginPath(); c.moveTo(w * 0.34, h * 0.62); c.lineTo(w * 0.28, h * 0.9); c.stroke();
    c.beginPath(); c.moveTo(w * 0.5, h * 0.3); c.lineTo(w * 0.56, h * 0.06); c.stroke();
  },
};

// obstacle metadata: sizeClass is what the Katamari law compares against
const OBS = {
  fence:   { w: 84, h: 40, sizeClass: 0.55, pts: 10 },
  pine:    { w: 60, h: 90, sizeClass: 0.85, pts: 14 },
  rock:    { w: 74, h: 60, sizeClass: 1.15, pts: 18 },
  pillar:  { w: 44, h: 110, sizeClass: 0.9, pts: 14 },
  groomer: { w: 120, h: 70, sizeClass: 1.6, pts: 30 },
  chair:   { w: 60, h: 60, sizeClass: 0.8, pts: 16 },
  // boulder: sizeClass above the ball's hard max (2.0). No matter how fat
  // you pack, a boulder ALWAYS wipes you — it is the hazard you must steer
  // around, so a huge ball is never risk-free. Present in every world.
  boulder: { w: 118, h: 104, sizeClass: 2.4, pts: 0 },
};

// ——— the mountain itself: a painted world, not a gradient ———
function drawWorld(scene, cfg, K) {
  const W = scene.scale.width, H = scene.scale.height;
  if (cfg.strobe) {
    // Strobe Grotto: an ice cave with a mirrorball, not a mountainside
    canvasTex(scene, 'yt-cave', W, H, (c) => {
      c.fillStyle = 'rgba(16,8,28,.92)';
      for (const side of [0, 1]) {
        c.beginPath();
        c.moveTo(side * W, 0);
        const sway = [0.16, 0.22, 0.13, 0.24, 0.18, 0.2];
        for (let i = 0; i <= 5; i++) {
          const x = side ? W - W * sway[i] : W * sway[i];
          c.lineTo(x, H * i / 5);
        }
        c.lineTo(side * W, H);
        c.closePath(); c.fill();
      }
      // stalactites
      c.fillStyle = 'rgba(140,208,232,.28)';
      for (const [fx, fw, fh] of [[0.3, 0.045, 0.12], [0.46, 0.03, 0.08], [0.62, 0.05, 0.15], [0.78, 0.028, 0.07]]) {
        c.beginPath();
        c.moveTo(W * (fx - fw), 0); c.lineTo(W * fx, H * fh); c.lineTo(W * (fx + fw), 0);
        c.closePath(); c.fill();
      }
    });
    scene.add.image(0, 0, 'yt-cave').setOrigin(0).setDepth(-70);
    // the mirrorball
    const ball = scene.add.image(W / 2, H * 0.1, canvasTex(scene, 'yt-disco-ball', 56, 56, (c, w, h) => {
      const g = c.createRadialGradient(w * 0.4, h * 0.4, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#f0faff'); g.addColorStop(1, '#8ca8c8');
      c.fillStyle = g;
      c.beginPath(); c.arc(w / 2, h / 2, w * 0.46, 0, 7); c.fill();
      c.strokeStyle = 'rgba(40,60,90,.5)'; c.lineWidth = 1.4;
      for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(0, h * i / 5); c.lineTo(w, h * i / 5); c.stroke(); }
      for (let i = 1; i < 5; i++) { c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.46 * Math.abs(Math.sin(i / 5 * Math.PI)), h * 0.46, 0, 0, 7); c.stroke(); }
    })).setScale(K).setDepth(-60);
    scene.add.particles(W / 2, H * 0.1, 'fx-star', {
      speed: { min: 30 * K, max: 90 * K }, scale: { start: 0.22 * K, end: 0 },
      tint: [0xff8ad0, 0x7ad0ff, 0xfff0c8], blendMode: 'ADD', lifespan: 900, frequency: 130,
    }).setDepth(-59);
    scene.tweens.add({ targets: ball, angle: 360, duration: 9000, repeat: -1 });
    return;
  }

  // ——— every remaining world is its OWN place, not a recolored sky ———
  const groundGrad = (c, top, bot, y0 = 0.52) => {
    const g = c.createLinearGradient(0, H * y0, 0, H);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    c.fillStyle = g; c.fillRect(0, H * y0, W, H * (1 - y0));
  };

  if (cfg.ice) {
    // BLACK ICE LAKE — a frozen mirror. Flat horizon, moon streak, shards.
    canvasTex(scene, 'yt-ice', W, H, (c) => {
      c.fillStyle = 'rgba(28,44,72,.7)';
      c.beginPath(); c.moveTo(0, H * 0.5);
      const sk = [0.4, 0.52, 0.44, 0.54, 0.46];
      for (let i = 0; i <= 4; i++) c.lineTo(W * i / 4, H * (0.5 - sk[i] * 0.13));
      c.lineTo(W, H * 0.5); c.closePath(); c.fill();
      const g = c.createLinearGradient(0, H * 0.5, 0, H);
      g.addColorStop(0, 'rgba(26,40,60,.92)'); g.addColorStop(0.5, 'rgba(14,22,38,.97)'); g.addColorStop(1, 'rgba(8,12,22,1)');
      c.fillStyle = g; c.fillRect(0, H * 0.5, W, H * 0.5);
      const mg = c.createLinearGradient(0, H * 0.5, 0, H);
      mg.addColorStop(0, 'rgba(174,240,255,.45)'); mg.addColorStop(1, 'rgba(174,240,255,0)');
      c.fillStyle = mg;
      c.beginPath(); c.moveTo(W * 0.46, H * 0.5); c.lineTo(W * 0.54, H * 0.5); c.lineTo(W * 0.63, H); c.lineTo(W * 0.37, H); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(174,240,255,.16)'; c.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        let x = W * (0.1 + i * 0.13), y = H * (0.56 + (i % 3) * 0.12);
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (i % 2 ? 1 : -1) * W * 0.08 * (1 + k * 0.4); y += H * 0.05; c.lineTo(x, y); }
        c.stroke();
      }
      c.fillStyle = 'rgba(140,208,232,.5)';
      for (const [bx, by, bw, bh] of [[0.16, 0.6, 0.05, 0.1], [0.8, 0.66, 0.06, 0.12], [0.5, 0.58, 0.035, 0.07], [0.66, 0.82, 0.05, 0.1]]) {
        c.beginPath(); c.moveTo(W * bx, H * by); c.lineTo(W * (bx - bw), H * (by + bh)); c.lineTo(W * (bx + bw), H * (by + bh)); c.closePath(); c.fill();
        c.fillStyle = 'rgba(230,248,255,.6)';
        c.beginPath(); c.moveTo(W * bx, H * by); c.lineTo(W * (bx + bw * 0.4), H * (by + bh * 0.5)); c.lineTo(W * (bx + bw), H * (by + bh)); c.closePath(); c.fill();
        c.fillStyle = 'rgba(140,208,232,.5)';
      }
    });
    scene.add.image(0, 0, 'yt-ice').setOrigin(0).setDepth(-70);
    celestial(scene, W * 0.5, H * 0.2, 30 * K, 0xd8ecff, { depth: -88 });
    return;
  }

  if (cfg.melt) {
    // MELT SPRINGS — a geothermal basin: mineral terraces, steaming pools.
    canvasTex(scene, 'yt-springs', W, H, (c) => {
      c.fillStyle = 'rgba(58,90,104,.8)';
      c.beginPath(); c.moveTo(0, H * 0.5);
      for (let x = 0; x <= W; x += W / 8) c.lineTo(x, H * (0.34 + 0.055 * Math.sin(x / (W / 8) * 1.3 + 0.6)));
      c.lineTo(W, H * 0.5); c.closePath(); c.fill();
      for (let i = 0; i < 4; i++) {
        c.strokeStyle = `rgba(122,212,200,${0.16 + i * 0.05})`; c.lineWidth = H * 0.018;
        c.beginPath(); c.ellipse(W * 0.5, H * 0.63, W * (0.28 + i * 0.15), H * (0.045 + i * 0.03), 0, Math.PI, 2 * Math.PI); c.stroke();
      }
      groundGrad(c, 'rgba(168,208,216,.16)', 'rgba(120,160,168,.05)', 0.55);
      for (const [px, py, pw] of [[0.28, 0.72, 0.16], [0.66, 0.8, 0.2], [0.5, 0.66, 0.12]]) {
        const pg = c.createRadialGradient(W * px, H * py, 1, W * px, H * py, W * pw);
        pg.addColorStop(0, 'rgba(150,236,220,.65)'); pg.addColorStop(1, 'rgba(58,138,140,0)');
        c.fillStyle = pg; c.beginPath(); c.ellipse(W * px, H * py, W * pw, H * 0.045, 0, 0, 7); c.fill();
      }
    });
    scene.add.image(0, 0, 'yt-springs').setOrigin(0).setDepth(-70);
    for (const fx of [0.28, 0.66, 0.5]) {
      scene.add.particles(W * fx, H * 0.72, 'fx-dot', {
        speedY: { min: -52 * K, max: -20 * K }, speedX: { min: -10 * K, max: 10 * K },
        scale: { start: 0.6 * K, end: 0 }, alpha: { start: 0.28, end: 0 },
        tint: 0xbfe8dc, lifespan: 2800, frequency: 200, advance: 2800,
      }).setDepth(-63);
    }
    return;
  }

  if (cfg.aurora) {
    // AURORA DRIFT — deep night: star field, silhouette peaks, sky ribbons.
    canvasTex(scene, 'yt-aurora-bg', W, H, (c) => {
      for (let i = 0; i < 90; i++) {
        const x = ((i * 97) % 100) / 100 * W, y = ((i * 53) % 60) / 100 * H, r = ((i * 31) % 14) / 10 + 0.3;
        c.fillStyle = `rgba(255,255,255,${0.3 + ((i * 17) % 60) / 100})`;
        c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      }
      c.fillStyle = 'rgba(10,18,32,.92)';
      c.beginPath(); c.moveTo(0, H * 0.52);
      const pk = [0.2, 0.42, 0.28, 0.5, 0.34, 0.46, 0.3];
      for (let i = 0; i <= 6; i++) c.lineTo(W * i / 6, H * (0.52 - pk[i] * 0.2));
      c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
      groundGrad(c, 'rgba(30,80,80,.18)', 'rgba(20,50,50,.04)', 0.52);
    });
    scene.add.image(0, 0, 'yt-aurora-bg').setOrigin(0).setDepth(-72);
    const rib = scene.add.graphics().setDepth(-68).setBlendMode('ADD');
    scene.tweens.addCounter({
      from: 0, to: Math.PI * 2, duration: 13000, repeat: -1,
      onUpdate: (tw) => {
        const ph = tw.getValue();
        rib.clear();
        for (let b = 0; b < 3; b++) {
          rib.fillStyle([0x2c6a6c, 0x2c8a5c, 0x3c6a9c][b], 0.12);
          rib.beginPath(); rib.moveTo(0, H * (0.12 + b * 0.05));
          for (let x = 0; x <= W; x += W / 16) rib.lineTo(x, H * (0.12 + b * 0.05) + Math.sin(ph + x / (48 * K) + b) * 22 * K);
          for (let x = W; x >= 0; x -= W / 16) rib.lineTo(x, H * (0.18 + b * 0.05) + Math.sin(ph + x / (48 * K) + b) * 22 * K);
          rib.closePath(); rib.fillPath();
        }
      },
    });
    return;
  }

  if (cfg.groomers) {
    // GROOMER ALLEY — a machine-carved piste: corduroy lines, a cat depot.
    canvasTex(scene, 'yt-groomer-bg', W, H, (c) => {
      c.fillStyle = 'rgba(30,44,72,.82)';
      c.beginPath(); c.moveTo(0, H * 0.5);
      const rg = [0.3, 0.5, 0.38, 0.46, 0.34];
      for (let i = 0; i <= 4; i++) c.lineTo(W * i / 4, H * (0.5 - rg[i] * 0.16));
      c.lineTo(W, H * 0.5); c.closePath(); c.fill();
      groundGrad(c, 'rgba(200,220,244,.24)', 'rgba(150,180,214,.08)', 0.5);
      c.strokeStyle = 'rgba(120,150,190,.2)'; c.lineWidth = 2;
      for (let i = -6; i < 40; i++) {
        const y = H * 0.5 + i * H * 0.02;
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + H * 0.05); c.stroke();
      }
      c.fillStyle = 'rgba(44,58,84,.92)'; c.fillRect(W * 0.68, H * 0.4, W * 0.18, H * 0.08);
      c.fillStyle = 'rgba(28,36,52,1)'; c.fillRect(W * 0.66, H * 0.46, W * 0.22, H * 0.03);
      c.fillStyle = '#ffd24a'; c.fillRect(W * 0.71, H * 0.42, W * 0.03, H * 0.03); c.fillRect(W * 0.78, H * 0.42, W * 0.03, H * 0.03);
    });
    scene.add.image(0, 0, 'yt-groomer-bg').setOrigin(0).setDepth(-70);
    const fg = scene.add.graphics().setDepth(-64);
    for (const fx of [0.2, 0.5, 0.8]) {
      fg.fillStyle(0xffd24a, 0.85); fg.fillRect(W * fx, H * 0.5, 2 * K, H * 0.06);
      fg.fillStyle(0xff6a4a, 0.9); fg.fillTriangle(W * fx + 2 * K, H * 0.5, W * fx + 15 * K, H * 0.512, W * fx + 2 * K, H * 0.53);
    }
    return;
  }

  if (cfg.moguls) {
    // DOUBLE DIAMOND — sharp black spires and warning signs. Danger reads.
    canvasTex(scene, 'yt-diamond-bg', W, H, (c) => {
      const spires = [[0.1, 0.34], [0.32, 0.44], [0.54, 0.3], [0.74, 0.48], [0.92, 0.34]];
      for (const [sx, ht] of spires) {
        c.fillStyle = 'rgba(18,24,38,.95)';
        c.beginPath(); c.moveTo(W * (sx - 0.09), H * 0.5); c.lineTo(W * sx, H * (0.5 - ht)); c.lineTo(W * (sx + 0.09), H * 0.5); c.closePath(); c.fill();
        c.fillStyle = 'rgba(122,208,255,.28)';
        c.beginPath(); c.moveTo(W * sx, H * (0.5 - ht)); c.lineTo(W * (sx + 0.025), H * (0.5 - ht * 0.4)); c.lineTo(W * (sx + 0.06), H * 0.5); c.lineTo(W * (sx + 0.09), H * 0.5); c.closePath(); c.fill();
      }
      groundGrad(c, 'rgba(24,32,50,.5)', 'rgba(12,18,30,.1)', 0.5);
      const dia = (cx, cy, s) => { c.beginPath(); c.moveTo(cx, cy - s); c.lineTo(cx + s, cy); c.lineTo(cx, cy + s); c.lineTo(cx - s, cy); c.closePath(); c.fill(); };
      for (const dx of [0.14, 0.84]) {
        c.strokeStyle = '#3c4658'; c.lineWidth = Math.max(2, W * 0.006);
        c.beginPath(); c.moveTo(W * dx, H * 0.55); c.lineTo(W * dx, H * 0.62); c.stroke();
        c.fillStyle = '#e8ecf2'; c.fillRect(W * (dx - 0.05), H * 0.5, W * 0.1, H * 0.05);
        const s = W * 0.016;
        c.fillStyle = '#14141c'; dia(W * (dx - 0.022), H * 0.525, s); dia(W * (dx + 0.022), H * 0.525, s);
      }
    });
    scene.add.image(0, 0, 'yt-diamond-bg').setOrigin(0).setDepth(-70);
    celestial(scene, W * 0.2, H * 0.16, 20 * K, 0xbcd0ec, { crescent: true, depth: -88 });
    return;
  }

  if (cfg.lift) {
    // CHAIRLIFT RUN — one great mountain face and the lift line over it.
    canvasTex(scene, 'yt-lift-bg', W, H, (c) => {
      c.fillStyle = 'rgba(36,52,88,.9)';
      c.beginPath(); c.moveTo(0, H * 0.5); c.lineTo(W * 0.55, H * 0.12); c.lineTo(W, H * 0.42); c.lineTo(W, H * 0.5); c.closePath(); c.fill();
      c.fillStyle = 'rgba(230,242,255,.72)';
      c.beginPath(); c.moveTo(W * 0.55, H * 0.12); c.lineTo(W * 0.44, H * 0.24); c.lineTo(W * 0.5, H * 0.26); c.lineTo(W * 0.58, H * 0.22); c.lineTo(W * 0.66, H * 0.26); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(20,30,54,.5)'; c.lineWidth = 2;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(W * (0.22 + i * 0.12), H * 0.5); c.lineTo(W * (0.5 + i * 0.03), H * (0.2 + i * 0.045)); c.stroke(); }
      c.fillStyle = 'rgba(120,72,44,.95)'; c.fillRect(W * 0.06, H * 0.42, W * 0.14, H * 0.09);
      c.fillStyle = 'rgba(90,52,30,1)'; c.beginPath(); c.moveTo(W * 0.05, H * 0.42); c.lineTo(W * 0.13, H * 0.37); c.lineTo(W * 0.21, H * 0.42); c.closePath(); c.fill();
      c.fillStyle = '#ffd88a'; c.fillRect(W * 0.09, H * 0.45, W * 0.03, H * 0.03); c.fillRect(W * 0.14, H * 0.45, W * 0.03, H * 0.03);
      groundGrad(c, 'rgba(214,230,248,.2)', 'rgba(170,195,225,.06)', 0.5);
    });
    scene.add.image(0, 0, 'yt-lift-bg').setOrigin(0).setDepth(-70);
    const g = scene.add.graphics().setDepth(-64);
    g.lineStyle(2 * K, 0x1c2430, 0.85); g.lineBetween(0, H * 0.3, W, H * 0.22);
    for (const fx of [0.12, 0.4, 0.68, 0.92]) { g.fillStyle(0x1c2430, 0.9); g.fillRect(W * fx - 2 * K, H * (0.3 - 0.08 * fx) - 2 * K, 4 * K, H * 0.18); }
    for (const fx of [0.24, 0.52, 0.8]) {
      const cy = H * (0.3 - 0.08 * fx) + H * 0.05;
      g.lineStyle(1.5 * K, 0x1c2430, 0.8); g.lineBetween(W * fx, H * (0.3 - 0.08 * fx), W * fx, cy);
      g.fillStyle(0xc2452e, 0.95); g.fillRect(W * fx - 6 * K, cy, 12 * K, 5 * K);
    }
    celestial(scene, W * 0.8, H * 0.14, 22 * K, 0xe8f2ff, { crescent: true, depth: -88 });
    return;
  }

  // ridge ranges: three depths, jagged, snow-capped — VILLAGE LANES default
  const peaks = [
    { y: 0.32, amp: 0.1, col: 'rgba(70,90,140,.55)', cap: 'rgba(235,245,255,.5)', n: 5 },
    { y: 0.38, amp: 0.085, col: 'rgba(44,60,105,.75)', cap: 'rgba(225,238,252,.65)', n: 6 },
    { y: 0.44, amp: 0.06, col: 'rgba(26,38,74,.9)', cap: 'rgba(214,230,248,.8)', n: 7 },
  ];
  const jag = [0.35, 0.8, 0.5, 1, 0.42, 0.9, 0.6, 0.75, 0.5, 1, 0.65, 0.85];
  canvasTex(scene, 'yt-range', W, H, (c) => {
    peaks.forEach((r, ri) => {
      c.fillStyle = r.col;
      c.beginPath();
      c.moveTo(0, H * r.y);
      const pts = [];
      for (let i = 0; i <= r.n; i++) {
        const x = W * i / r.n;
        const y = H * r.y - H * r.amp * jag[(i + ri * 3) % jag.length];
        pts.push([x, y]);
        c.lineTo(x, y);
        if (i < r.n) c.lineTo(W * (i + 0.5) / r.n, H * r.y + H * 0.01);
      }
      c.lineTo(W, H); c.lineTo(0, H);
      c.closePath(); c.fill();
      // snowcaps on the summits
      c.fillStyle = r.cap;
      for (const [x, y] of pts) {
        c.beginPath();
        c.moveTo(x - W * 0.035, y + H * 0.028);
        c.lineTo(x, y);
        c.lineTo(x + W * 0.035, y + H * 0.028);
        c.quadraticCurveTo(x, y + H * 0.02, x - W * 0.035, y + H * 0.028);
        c.fill();
      }
    });
    // treeline band
    c.fillStyle = 'rgba(14,24,50,.95)';
    for (let x = 0; x < W; x += W / 26) {
      const th = H * (0.028 + 0.016 * jag[Math.floor(x / (W / 26)) % jag.length]);
      c.beginPath();
      c.moveTo(x, H * 0.5); c.lineTo(x + W / 52, H * 0.5 - th); c.lineTo(x + W / 26, H * 0.5);
      c.closePath(); c.fill();
    }
    c.fillRect(0, H * 0.495, W, H * 0.02);
    // village lights along the valley — varied, like real windows
    for (let i = 0; i < 7; i++) {
      const x = W * (0.06 + i * 0.14 + jag[i] * 0.02);
      const y = H * (0.52 + (jag[(i + 3) % jag.length] - 0.7) * 0.012);
      const r = W * (0.012 + jag[(i + 5) % jag.length] * 0.016);
      const a = 0.5 + jag[(i + 2) % jag.length] * 0.4;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,220,140,${a})`); g.addColorStop(1, 'rgba(255,200,100,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    // low haze so the slope reads as ground
    const hz = c.createLinearGradient(0, H * 0.5, 0, H);
    hz.addColorStop(0, 'rgba(200,220,240,.14)'); hz.addColorStop(1, 'rgba(220,235,250,.03)');
    c.fillStyle = hz;
    c.fillRect(0, H * 0.5, W, H * 0.5);
  });
  scene.add.image(0, 0, 'yt-range').setOrigin(0).setDepth(-70);
  // the slope itself: a snowfield, not empty sky
  canvasTex(scene, 'yt-field', W, H, (c) => {
    const g = c.createLinearGradient(0, H * 0.52, 0, H);
    g.addColorStop(0, 'rgba(214,230,248,.2)');
    g.addColorStop(1, 'rgba(170,195,225,.06)');
    c.fillStyle = g;
    c.fillRect(0, H * 0.52, W, H * 0.48);
    c.fillStyle = 'rgba(255,255,255,.06)';
    const drifts = [[0.2, 0.62, 0.5], [0.7, 0.7, 0.38], [0.4, 0.8, 0.6], [0.85, 0.88, 0.42], [0.15, 0.92, 0.5], [0.55, 0.97, 0.55]];
    for (const [fx, fy, fw] of drifts) {
      c.beginPath(); c.ellipse(W * fx, H * fy, W * fw * 0.5, H * 0.02, 0, 0, 7); c.fill();
    }
    // faint tracks converging uphill sell the descent
    c.strokeStyle = 'rgba(140,170,205,.14)'; c.lineWidth = 3;
    for (const fx of [0.42, 0.58]) {
      c.beginPath();
      c.moveTo(W * fx, H * 0.54);
      c.quadraticCurveTo(W * (fx + (fx < 0.5 ? -0.1 : 0.1)), H * 0.78, W * (fx + (fx < 0.5 ? -0.22 : 0.22)), H);
      c.stroke();
    }
  });
  scene.add.image(0, 0, 'yt-field').setOrigin(0).setDepth(-69);
  celestial(scene, W * 0.78, H * 0.14, 26 * K, 0xe8f2ff, { crescent: true, depth: -88 });
  driftClouds(scene, { n: 2, tint: 0xbcd0ec, alpha: 0.4, yBand: [0.06, 0.2], depth: -80 });
  // Village Lanes: alpine chalets tucked in the valley, warm windows lit
  const chg = scene.add.graphics().setDepth(-68);
  for (const [bx, by, s] of [[0.2, 0.5, 22], [0.31, 0.515, 17], [0.72, 0.505, 24], [0.83, 0.52, 17]]) {
    const x = W * bx, y = H * by, ss = s * K;
    chg.fillStyle(0x6a4028, 1); chg.fillRect(x - ss, y - ss, ss * 2, ss * 1.1);
    chg.fillStyle(0xf4fafd, 1);
    chg.fillTriangle(x - ss * 1.25, y - ss, x, y - ss * 2, x + ss * 1.25, y - ss);
    chg.fillStyle(0xffd88a, 0.95);
    chg.fillRect(x - ss * 0.55, y - ss * 0.55, ss * 0.5, ss * 0.5);
    chg.fillRect(x + ss * 0.1, y - ss * 0.55, ss * 0.5, ss * 0.5);
  }
}

export function create(P, ctx) {
  const { api, cfg } = ctx;
  let phase = 'pack';        // pack -> roll
  let ball, penguin, shadow, slopeLight, packGfx, spray, darkVeil, auroraGfx;
  let size = 0.42;           // 0.3 .. 2.0 — mass, reach and menace
  let holdT = 0;
  let armed = false;         // idle law: the fuse waits for your first touch
  const PACK_FUSE = 2800;    // ms of slope-light at the summit — a short
                             // ceremony, not a tax on the medal clock
  let packDeadline = PACK_FUSE;
  let packTaught = false;    // the HOLD TO PACK banner waits for the intro card
  let rollT0 = 0;
  let speed = 0;
  let steer = null;
  let stun = 0;
  let wipeInvuln = 0;        // brief immunity after a wipeout — one cluster
  let airT = 0;              // mogul airtime left
  let dist = 0;
  let bandDist = 0;
  let bandCount = 0;
  let strobeT = 0;
  let auroraPulse = 0;       // >0: floating, double points
  let nextAurora = 6000;
  let fever = false;
  let noteStep = 0;
  let goldenAt = 0;
  let goldenCount = 0;      // first golden comes early, guaranteed in a short rest
  let strikeStreak = 0;     // back-to-back village strikes: DOUBLE / TURKEY
  const villageEscapes = {}; // live pins that scrolled away, per village
  let mileN = 0;            // checkpoint index — payout ramps with depth
  let grabDX = 0;           // grab offset so a re-touch never teleports the ball
  let ballVX = 0, prevBallX = 0, lastMoveAt = -9999; // real-dodge detection
  let wasAir = false;       // mogul landing beat
  let poolSfxAt = 0;        // throttle the melt hiss
  let depthText;
  // three snowballs' worth of runs, shown as the cabinet's hearts. Each
  // wipeout — slamming something bigger than you — spends one; the third
  // ends the descent. The fuse waits for your first touch, so an untouched
  // summit never rolls or dies.
  let dead = false;
  let lives = 3;
  // The golden snowman is the jackpot, so it must actually appear inside a
  // 60s rest (the product minimum): the FIRST one seeds early (~7-15s) and
  // is guaranteed; later ones keep the 12-30s variable-ratio cadence.
  const goldDelay = () => {
    if (window.__P3_GOLD_QA) return 2500;
    return goldenCount === 0 ? 7000 + Math.random() * 8000 : 12000 + Math.random() * 18000;
  };
  const things = [];         // scrolling world objects { img, kind, meta, x, dead }
  const lanes = [];          // groomer boost lanes { x, w, img }

  const BALL_R = (scene) => 26 * unit(scene) * size;

  function addThing(scene, K, kind, x, y, extra = {}) {
    const meta = OBS[kind] ?? { w: 50, h: 50, sizeClass: 0, pts: 0 };
    const w = (extra.w ?? meta.w) * K, h = (extra.h ?? meta.h) * K;
    const img = scene.add.image(x, y, canvasTex(scene, `yt-${kind}`, w, h, PAINT[kind])).setDepth(kind === 'pool' ? 6 : 10);
    const thing = { img, kind, meta, w, h, dead: false, ...extra };
    things.push(thing);
    return thing;
  }

  function spawnBand(scene, K, yOff = 0) {
    const W = scene.scale.width, H = scene.scale.height;
    bandCount++;
    const yBase = H + 60 * K + yOff;
    if (bandCount % cfg.villageEvery === 0) {
      // THE VILLAGE: seven pins, one greeting
      const cx = W * (0.3 + Math.random() * 0.4);
      const rows = [[0], [-1, 1], [-2, 0, 2], [-1.2, 1.2]];
      let n = 0;
      for (let r = 0; r < rows.length && n < 7; r++) {
        for (const off of rows[r]) {
          if (n >= 7) break;
          addThing(scene, K, 'snowman', cx + off * 34 * K, yBase + r * 44 * K, {
            w: 40, h: 54, pin: true, village: bandCount,
          });
          n++;
        }
      }
      return;
    }
    // difficulty rises with how deep the run is: more obstacles, more
    // boulders as the run goes on — the back half of a long rest bites harder.
    const elapsed = (scene.time.now - rollT0) / 1000;
    const ramp = Math.min(1, elapsed / 150);
    const opening = bandCount <= 2; // first drop is gentle: learn the verb first
    const n = opening ? 2 : 3 + Math.floor(Math.random() * 3) + Math.floor(ramp * 2);
    // spread across evenly-spaced lanes so a band never stacks one column
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5) / n + (Math.random() - 0.5) * 0.14;
      const kind = cfg.obstacles[Math.floor(Math.random() * cfg.obstacles.length)];
      addThing(scene, K, kind, W * Math.max(0.06, Math.min(0.94, s)), yBase + Math.random() * H * 0.7);
    }
    // an unpassable boulder most bands (never on the gentle opening) — the
    // wipeout threat even a maxed ball still has to steer around.
    if (!opening && Math.random() < 0.55 + ramp * 0.3) {
      let bx = W * (0.12 + Math.random() * 0.76);
      // fairness corridor: where steering is slow (black ice) or the slope
      // is dense, a crag never surfaces EXACTLY dead-center. The corridor is
      // tight — trigger 0.2W, offset 0.25W — because the ball's collision
      // half-width runs up to ~0.26W at max size: a displaced crag still
      // grazes (or clips) a fat line-holder, so a centered spawn always
      // demands a real, warned swerve, never a free pass. (The old 0.3W/
      // 0.35W corridor out-cleared the hitbox entirely and made a boulder
      // that never touched a stationary ball — the difficulty floor the
      // boulder exists to provide was gone.)
      if ((cfg.ice || ramp > 0.6) && ball && Math.abs(bx - ball.x) < W * 0.2) {
        bx = ball.x + (ball.x < W / 2 ? 1 : -1) * W * 0.25;
      }
      const by = yBase + Math.random() * H * 0.6;
      addThing(scene, K, 'boulder', bx, by);
      // the mountain groans first: a snow-crack opens a fixed scroll-lead
      // ahead of the crag, at its exact line — the warning you steer away
      // from. Far crags' cracks (the 0.68H lead fits) scroll in from below
      // like everything else; near crags' cracks surface at 0.62H (geometry
      // allows nothing earlier) and FADE in, so nothing pops into existence.
      const warn = addThing(scene, K, 'crack', bx, Math.max(H * 0.62, by - H * 0.68), {
        w: 96, h: 40, warning: true, bornAt: scene.time.now,
      });
      warn.img.setDepth(6).setBlendMode('ADD'); // the fissure glows on any dark ground
    }
    // drifts keep the mass economy alive AND give a floored ball a way back up
    if (cfg.melt) {
      addThing(scene, K, 'pool', W * (0.15 + Math.random() * 0.7), yBase + Math.random() * H * 0.5, { w: 110, h: 70, pool: true });
      addThing(scene, K, 'drift', W * (0.15 + Math.random() * 0.7), yBase + Math.random() * H * 0.5, { w: 70, h: 44, drift: true });
    } else {
      addThing(scene, K, 'drift', W * (0.15 + Math.random() * 0.7), yBase + Math.random() * H * 0.5, { w: 64, h: 40, drift: true });
      if (Math.random() < 0.4) addThing(scene, K, 'drift', W * (0.15 + Math.random() * 0.7), yBase + Math.random() * H * 0.5, { w: 60, h: 38, drift: true });
    }
    if (cfg.moguls) {
      for (let i = 0; i < 3; i++) {
        addThing(scene, K, 'mogul', W * (0.12 + Math.random() * 0.76), yBase + Math.random() * H * 0.6, { w: 56, h: 34, mogul: true });
      }
    }
    if (cfg.lift && Math.random() < 0.8) {
      const px = W * (0.2 + Math.random() * 0.6);
      addThing(scene, K, 'pillar', px, yBase + H * 0.3, { w: 30, h: 130 });
      addThing(scene, K, 'chair', px + 50 * K, yBase + H * 0.3 - 40 * K, { chair: true, swingP: Math.random() * 7, anchorX: px + 50 * K });
    }
    if (cfg.groomers && Math.random() < 0.8) {
      addThing(scene, K, 'groomer', Math.random() < 0.5 ? -60 * K : W + 60 * K, yBase + Math.random() * H * 0.5, {
        groomer: true, vx: (Math.random() < 0.5 ? 1 : -1) * (60 + Math.random() * 40) * K,
      });
    }
  }

  // ONE multiplier truth: the cabinet's chain pill. Yeti banks raw points
  // and lets the cabinet's own combo (it counts every scoring hit) do all
  // the multiplying — so the ×2/×3 pill is never contradicted by a label.
  function smashThing(scene, K, th, pts, growBy) {
    th.dead = true;
    const total = Math.max(1, Math.round(pts));
    burst(scene, th.img.x, th.img.y, cfg.accent, { n: 16, speed: 340 * K, scale: 0.55 * K });
    api.score(total);
    api.note(noteStep++);
    floatScore(scene, th.img.x, th.img.y - 20 * K, `+${total}`, '#ffd24a', 15 * K);
    shake(scene, 0.007 + size * 0.004, 110);
    hitstop(scene, 35);
    api.haptic(8);
    api.sfx('tap');
    if (growBy) size = Math.min(2, size + growBy);
    // wreckage permanence: it lies where you crushed it
    th.img.setAlpha(0.5).setAngle((Math.random() - 0.5) * 60).setDepth(7);
    th.crushed = true;
  }

  // Pin topple VISUALS only — the points are banked synchronously at claim
  // time, so a hard-stop landing mid-cascade never eats the payout.
  function toppleVisual(scene, K, q, total) {
    q.dead = true;
    burst(scene, q.img.x, q.img.y, cfg.accent, { n: 12, speed: 300 * K, scale: 0.5 * K });
    floatScore(scene, q.img.x, q.img.y - 18 * K, `+${total}`, '#ffd24a', 14 * K);
    api.sfx('tap');
    api.haptic(6);
    q.img.setAlpha(0.5).setAngle((Math.random() - 0.5) * 70).setDepth(7);
    q.crushed = true;
  }

  function loseLife(scene, cause) {
    if (dead) return;
    lives = Math.max(0, lives - 1);
    api.lives(lives); // the cabinet's hearts are the one true lives display
    const K = unit(scene);
    floatScore(scene, ball.x, ball.y - BALL_R(scene) - 30 * K, lives > 0 ? `${lives} LEFT` : 'WIPED OUT', '#ff8a9a', 16 * K);
    if (lives <= 0) { dead = true; api.die?.(cause); }
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
      vignette(scene, 0.4, 0.78);
      ambientMotes(scene, 0xffffff, { alpha: 0.4 });

      drawWorld(scene, cfg, K);
      scene.add.particles(0, 0, 'fx-chip', {
        x: { min: 0, max: W }, y: -10,
        speedY: { min: 30 * K, max: 80 * K }, speedX: { min: -14 * K, max: 14 * K },
        scale: { min: 0.1 * K, max: 0.26 * K }, alpha: 0.6,
        lifespan: 14000, frequency: 200, advance: 10000,
      }).setDepth(-30);

      shadow = scene.add.image(W / 2, H * 0.36 + 8 * K, 'fx-dot').setTint(0x0c1424).setAlpha(0.35).setDepth(9);
      ball = scene.add.image(W / 2, H * 0.36, canvasTex(scene, 'yt-ball', 120 * K, 120 * K, PAINT.ball)).setDepth(11);
      penguin = scene.add.image(W / 2, H * 0.36, canvasTex(scene, 'yt-peng', 34 * K, 40 * K, PAINT.penguin)).setDepth(12).setVisible(false);
      spray = scene.add.particles(0, 0, 'fx-chip', {
        speedY: { min: 40 * K, max: 140 * K }, speedX: { min: -80 * K, max: 80 * K },
        scale: { min: 0.12 * K, max: 0.3 * K }, alpha: { start: 0.8, end: 0 },
        tint: 0xffffff, lifespan: 500, frequency: 1e9,
      }).setDepth(10);

      if (cfg.strobe) {
        // starts near-clear so PACK-phase greed (watching the ball grow) is
        // never buried; the roll-phase strobe drives the alpha up and down
        darkVeil = scene.add.rectangle(0, 0, W, H, 0x060310, 0.2).setOrigin(0).setDepth(25);
      }
      if (cfg.aurora) auroraGfx = scene.add.graphics().setDepth(-40);

      packGfx = scene.add.graphics().setDepth(30);
      api.lives(3); // hearts in the cabinet HUD from frame one
      // depth read-out: sustained rolling has a number to beat
      depthText = scene.add.text(16 * K, 14 * K, '', {
        fontFamily: 'system-ui, sans-serif', fontStyle: '900',
        fontSize: `${Math.round(15 * K)}px`, color: '#dff6ff',
        stroke: 'rgba(4,6,14,.82)', strokeThickness: Math.max(3, 3 * K), // legible over bright ice and strobes
      }).setDepth(33).setAlpha(0.85).setVisible(false);
      // (the HOLD TO PACK banner fires on the first pack-phase update frame,
      // AFTER the intro card releases input — a teach beat nobody can miss)

      scene.input.on('pointerdown', (p) => {
        // grab the ball WHERE it is: re-touching never teleports it
        grabDX = (phase === 'roll' && ball) ? ball.x - p.x : 0;
        steer = p.x + grabDX;
        armed = true;
      });
      scene.input.on('pointermove', (p) => { steer = p.x + grabDX; });
      scene.input.on('pointerup', () => {
        steer = null; grabDX = 0;
        // ANY release after a real touch launches — a quick tap is a valid
        // (small, nimble) launch, never a silently-swallowed input
        if (phase === 'pack' && armed) startRoll(scene, K);
      });

      function startRoll(sc, K2) {
        phase = 'roll';
        rollT0 = sc.time.now;
        speed = sc.scale.height * (0.5 + size * 0.15);
        flash(sc, 0xffffff, 90, 0.25);
        zoomPunch(sc, 1.06, 220);
        api.sfx('objDone');
        api.haptic(12);
        glyphBanner(sc, 'ROLL', '#ffffff', 34 * K2);
        penguin.setVisible(true);
        prevBallX = ball.x; // seed dodge-tracking so frame one isn't a phantom move
        // two opening bands STAGGERED down the slope — never a stacked wall
        spawnBand(sc, K2, 0);
        spawnBand(sc, K2, sc.scale.height * 0.72);
      }
      this._startRoll = startRoll;
    },

    update(t, dtMs) {
      const scene = this;
      const dt = Math.min(dtMs, 64) / 1000;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      const now = scene.time.now;
      if (!goldenAt) goldenAt = now + goldDelay();

      if (dead) return;    // freeze the sim under the death ceremony
      wipeInvuln = Math.max(0, wipeInvuln - dtMs);

      // ——— PACK phase: choose your build while the slope-light burns ———
      if (phase === 'pack') {
        packGfx.clear();
        // the teach beat fires HERE — the first frame the player can act on
        // it — because the intro card freezes update but not the tweens
        if (!packTaught) {
          packTaught = true;
          glyphBanner(scene, 'HOLD TO PACK', '#dff6ff', 24 * K);
        }
        // keep the strobe grotto legible while the ball grows — the murk
        // only rises once you're rolling
        if (cfg.strobe && darkVeil) darkVeil.setAlpha(0.12 + 0.1 * Math.abs(Math.sin(now / 600)));
        if (steer != null) {
          holdT += dtMs;
          size = Math.min(1.7, 0.42 + holdT / 2100);
        }
        // the fuse only burns once you've touched: an untouched summit
        // waits forever, scores nothing, and rolls nowhere by itself
        if (armed) packDeadline -= dtMs;
        ball.setScale(size);
        shadow.setScale(size * 1.1, size * 0.4);
        shadow.y = ball.y + BALL_R(scene) * 0.9;
        // slope light: a burning fuse across the summit
        const f = Math.max(0, packDeadline / PACK_FUSE);
        packGfx.fillStyle(0xffd24a, 0.8).fillRect(W * 0.1, 40 * K, W * 0.8 * f, 4 * K);
        packGfx.fillStyle(0xffffff, 0.5 + 0.3 * Math.sin(now / 90));
        packGfx.fillCircle(W * 0.1 + W * 0.8 * f, 42 * K, 6 * K);
        if (armed && packDeadline <= 0) this._startRoll(scene, K);
        return;
      }

      // ——— ROLL phase ———
      packGfx.clear();
      stun = Math.max(0, stun - dtMs);
      airT = Math.max(0, airT - dtMs);
      // Katamari's honest bargain: mass smashes more but turns like a
      // planet — a small nimble ball is the slalom build, not a mistake.
      // Both floors are set so a warned boulder is ALWAYS humanly dodgeable,
      // even fat on black ice: slippery must never mean helpless.
      const massDrag = Math.max(0.65, 1.15 - size * 0.35);
      const iceLerp = cfg.ice ? 3.2 : 7;
      if (steer != null && stun <= 0) {
        ball.x += (steer - ball.x) * Math.min(1, dt * (airT > 0 ? 9 : iceLerp * massDrag));
      }
      ball.x = Math.max(BALL_R(scene), Math.min(W - BALL_R(scene), ball.x));
      // track how hard the ball is actually moving — a SWERVE has to be an
      // EARNED dodge (a real sideways move), not just standing near a hazard
      ballVX = dt > 0 ? (ball.x - prevBallX) / dt : 0;
      if (Math.abs(ballVX) > W * 0.35) lastMoveAt = now;
      prevBallX = ball.x;

      // aurora pulse: the world floats, points double
      if (cfg.aurora) {
        nextAurora -= dtMs;
        auroraPulse = Math.max(0, auroraPulse - dtMs);
        if (nextAurora <= 0) {
          nextAurora = 7000 + Math.random() * 3000;
          auroraPulse = 2200;
          glyphBanner(scene, 'AURORA ×2', '#7dffb3', 26 * K);
          api.sfx('objDone');
        }
        auroraGfx.clear();
        if (auroraPulse > 0) {
          const a = Math.min(1, auroraPulse / 800) * 0.3;
          for (let i = 0; i < 3; i++) {
            auroraGfx.fillStyle([0x7dffb3, 0x7ad0ff, 0xc8a0ff][i], a * (1 - i * 0.25));
            auroraGfx.beginPath();
            auroraGfx.moveTo(0, H * 0.1 + i * 30 * K);
            for (let x = 0; x <= W; x += W / 12) {
              auroraGfx.lineTo(x, H * 0.1 + i * 30 * K + Math.sin(now / 500 + x / (60 * K) + i) * 22 * K);
            }
            auroraGfx.lineTo(W, H * 0.04 + i * 30 * K); auroraGfx.lineTo(0, H * 0.04 + i * 30 * K);
            auroraGfx.closePath(); auroraGfx.fillPath();
          }
        }
      }
      const auroraMult = auroraPulse > 0 ? 2 : 1;
      const floaty = auroraPulse > 0 ? 0.55 : 1;

      // strobe grotto: the mountain exists between flashes
      if (cfg.strobe && darkVeil) {
        strobeT -= dtMs;
        if (strobeT <= 0) {
          strobeT = 1100 + Math.random() * 500;
          darkVeil.setAlpha(0);
          darkVeil.fillColor = [0x38104c, 0x0c2c44, 0x441024][Math.floor(Math.random() * 3)];
          scene.tweens.add({ targets: darkVeil, alpha: 0.5, duration: 460, delay: 150 }); // cap the strobe dim so gameplay stays legible
        }
      }

      // the golden snowman waits somewhere downhill
      if (now >= goldenAt && !things.some((th) => th.golden)) {
        goldenCount++;
        goldenAt = now + goldDelay();
        const th = addThing(scene, K, 'snowman', W * (0.15 + Math.random() * 0.7), H + 80 * K, { w: 46, h: 62, golden: true });
        th.img.setTint(0xffd24a);
        th.haloImg = scene.add.image(th.img.x, th.img.y, 'fx-dot').setTint(0xffd24a).setBlendMode('ADD').setScale(2 * K).setAlpha(0.5).setDepth(9);
      }

      // speed follows mass; stun kills it briefly; the slope itself
      // steepens as the run goes on so a long rest keeps escalating
      const rollElapsed = (now - rollT0) / 1000;
      const densityRamp = Math.min(1, rollElapsed / 150);
      const slopeRamp = 1 + Math.min(0.2, (rollElapsed / 240) * 0.2);
      // size still buys speed, but capped: a fat ball must never outrun the
      // one-band boulder warning it depends on
      const target = H * (0.5 + size * 0.15) * (fever ? 1.15 : 1) * floaty * slopeRamp;
      speed += ((stun > 0 ? H * 0.1 : target) - speed) * Math.min(1, dt * 3);
      dist += speed * dt;
      bandDist += speed * dt;
      // bands arrive closer together the deeper you go — the slope tightens
      if (bandDist > H * (1.2 - 0.3 * densityRamp)) { bandDist = 0; spawnBand(scene, K); }

      // ball visuals
      ball.setScale(size * (airT > 0 ? 1.12 : 1));
      ball.rotation += speed * dt / (BALL_R(scene) || 1);
      shadow.setScale(size * (airT > 0 ? 0.7 : 1.1), size * 0.4);
      shadow.setPosition(ball.x, ball.y + BALL_R(scene) * (airT > 0 ? 1.5 : 0.9));
      penguin.setPosition(ball.x + Math.sin(now / 260) * 4 * K, ball.y - BALL_R(scene) - 12 * K);
      penguin.setAngle(Math.sin(now / 260) * 8);
      spray.emitParticleAt(ball.x - BALL_R(scene) * 0.6, ball.y + BALL_R(scene) * 0.7, Math.ceil(speed / (H * 0.3)));
      spray.emitParticleAt(ball.x + BALL_R(scene) * 0.6, ball.y + BALL_R(scene) * 0.7, Math.ceil(speed / (H * 0.3)));

      // mogul landing beat: a jump needs a touchdown to feel complete
      if (wasAir && airT <= 0) {
        burst(scene, ball.x, ball.y + BALL_R(scene), 0xffffff, { n: 12, speed: 220 * K, scale: 0.45 * K });
        shake(scene, 0.01, 120);
        squash(scene, ball, 'y');
        api.sfx('tap');
        api.haptic(10);
      }
      wasAir = airT > 0;

      // running depth read-out: a number to beat over a long rest
      depthText.setVisible(true).setText(`▼ ${Math.floor((dist / H) * 8)} m`);

      // snow sheds for real (the springs shed faster): staying huge is a
      // diet you maintain by eating drifts, not a value you bank at the top —
      // shed is tuned so skipping drifts genuinely slims you within a band
      size = Math.max(0.36, size - dt * (cfg.melt ? 0.08 : 0.05));

      // ——— world scroll + collisions ———
      let villagePins = 0, villageDowned = 0, villageId = 0;
      for (const th of [...things]) {
        th.img.y -= speed * dt;
        if (th.groomer) {
          th.img.x += th.vx * dt;
          if (th.img.x < -80 * K || th.img.x > W + 80 * K) th.vx *= -1;
        }
        if (th.chair) {
          th.img.x = th.anchorX + Math.sin(now / 800 + th.swingP) * 40 * K;
          th.img.setAngle(Math.sin(now / 800 + th.swingP) * 24);
        }
        if (th.haloImg) th.haloImg.setPosition(th.img.x, th.img.y);
        if (th.img.y < -120 * K) {
          // live pins scrolling past un-bowled: one straggler is forgiven,
          // but when MOST of a village escapes, the streak breaks — and it
          // breaks OUT LOUD, never silently
          if (th.pin && !th.dead && !th.claimed && th.village) {
            const esc = (villageEscapes[th.village] = (villageEscapes[th.village] || 0) + 1);
            if (esc >= 4 && strikeStreak > 0) {
              strikeStreak = 0;
              floatScore(scene, W / 2, 70 * K, 'STRIKE STREAK BROKEN', '#ff8a9a', 15 * K);
              api.sfx('log');
            }
          }
          th.haloImg?.destroy();
          th.img.destroy();
          things.splice(things.indexOf(th), 1);
          continue;
        }
        if (th.warning) {
          // the crack surfaces: a low groan and a shudder the moment it
          // enters view — you hear the boulder coming before you see it
          if (!th.rumbled && th.img.y < H) {
            th.rumbled = true;
            api.sfx('log');
            api.haptic(6);
            shake(scene, 0.004, 140);
          }
          // urgent pulse, scaled by a 250ms fade-in so a crack that spawns
          // inside the viewport materializes instead of popping
          th.img.setAlpha(Math.min(1, (now - (th.bornAt ?? now)) / 250) * (0.55 + 0.35 * Math.sin(now / 120)));
          continue;
        }
        if (th.pin) {
          villageId = th.village;
          villagePins++;
          if (th.dead || th.claimed) villageDowned++;
        }
        if (th.dead || th.crushed || th.claimed) continue;

        // colour-code the load-bearing rule: RED = too big to plow (steer!),
        // natural = smaller than you, safe to smash. Hysteresis avoids flicker.
        if (th.meta.sizeClass > 0) {
          const threat = size < th.meta.sizeClass;
          if (threat && th._threat !== true) { th._threat = true; th.img.setTint(0xff7a6a); }
          else if (!threat && size > th.meta.sizeClass + 0.05 && th._threat !== false) { th._threat = false; th.img.clearTint(); }
        }

        const dx = ball.x - th.img.x, dy = ball.y - th.img.y;
        const rx = th.w / 2 + BALL_R(scene) * 0.8, ry = th.h / 2 + BALL_R(scene) * 0.8;
        if (Math.abs(dx) < rx && Math.abs(dy) < ry) {
          if (th.pool) {
            size = Math.max(0.36, size - dt * 0.5);
            if (Math.random() < dt * 8) burst(scene, ball.x, ball.y + BALL_R(scene), 0x7ad4c8, { n: 3, speed: 120 * K, scale: 0.3 * K });
            // your core resource is draining — make it LEGIBLE, not silent
            if (now - poolSfxAt > 620) {
              poolSfxAt = now;
              api.sfx('log');
              api.haptic(6);
              floatScore(scene, ball.x, ball.y - BALL_R(scene) - 10 * K, 'MELTING', '#7ad4c8', 13 * K);
            }
            continue;
          }
          if (th.drift && !th.mogul) {
            th.dead = true;
            size = Math.min(2, size + 0.1);
            burst(scene, th.img.x, th.img.y, 0xffffff, { n: 12, speed: 240 * K, scale: 0.5 * K });
            floatScore(scene, th.img.x, th.img.y - 16 * K, `packed +${6 * auroraMult}`, '#dff6ff', 13 * K);
            api.score(6 * auroraMult);
            squash(scene, ball, 'y');
            th.img.destroy();
            things.splice(things.indexOf(th), 1);
            api.sfx('tap');
            continue;
          }
          if (th.mogul) {
            if (airT <= 0) {
              airT = 620;
              api.score(8 * auroraMult);
              floatScore(scene, ball.x, ball.y - BALL_R(scene) - 14 * K, `AIR +${8 * auroraMult}`, '#7ad0ff', 15 * K);
              api.sfx('tap');
              api.haptic(8);
            }
            continue;
          }
          if (airT > 0) continue; // sailing over it
          if (th.golden) {
            th.haloImg?.destroy();
            // the jackpot honors the aurora too — no payout ignores the pulse
            smashThing(scene, K, th, 75 * auroraMult, 0.06);
            glyphBanner(scene, 'GOLDEN SNOWMAN', '#ffe9a0', 26 * K);
            collectTo(scene, th.img.x, th.img.y, W - 30 * K, 20 * K, 0xffd24a, 16);
            flash(scene, 0xffd24a, 120, 0.3);
            api.sfx('pr');
            continue;
          }
          if (th.pin) {
            // MASS is the whole point of a village: a floored ball can only
            // nudge a single pin (no strike), while a fat ball bowls a wide,
            // reliable cascade. Size is a real decision, not a bypass.
            if (size < 0.7) {
              th.claimed = true;
              const pts = 4 * auroraMult;
              api.score(pts);
              toppleVisual(scene, K, th, pts);
              floatScore(scene, th.img.x, th.img.y - 34 * K, 'need mass!', '#bcd0ec', 12 * K);
              continue;
            }
            // claim + bank a pin's points SYNCHRONOUSLY (hard-stop safe), and
            // ripple only the topple visuals. Reach and odds grow with mass.
            const reach = (46 + size * 26) * K;
            const prob = Math.min(0.92, 0.5 + size * 0.26);
            const claim = (q, depth) => {
              q.claimed = true;
              const base = depth === 0 ? 10 : 6;
              const total = base * auroraMult;
              api.score(total);
              api.note(noteStep++);
              if (depth === 0) toppleVisual(scene, K, q, total);
              else scene.time.delayedCall(80 + depth * 70, () => { if (q.img.active) toppleVisual(scene, K, q, total); });
            };
            claim(th, 0);
            let frontier = [th], depth = 0;
            while (frontier.length && depth < 6) {
              const next = [];
              for (const from of frontier) {
                for (const q of things) {
                  if (q.pin && !q.dead && !q.claimed && Math.random() < prob
                    && Math.hypot(q.img.x - from.img.x, q.img.y - from.img.y) < reach) {
                    claim(q, depth + 1);
                    next.push(q);
                  }
                }
              }
              frontier = next; depth++;
            }
            continue;
          }
          if (size >= th.meta.sizeClass) {
            smashThing(scene, K, th, Math.round(th.meta.pts * (1 + size * 0.25)) * auroraMult, 0.02);
          } else if (wipeInvuln > 0) {
            // still flashing from the last wipeout — plow through, no double hit
            th.crushed = true; th.img.setAlpha(0.9);
          } else {
            // bigger than you: the mountain wins this one — and you get a
            // brief immunity so a cluster can't eat all three lives at once
            wipeInvuln = 950;
            stun = 650;
            size = Math.max(0.36, size - 0.12);
            burst(scene, ball.x, ball.y, 0xffffff, { n: 20, speed: 320 * K, scale: 0.5 * K });
            flash(scene, 0xaec8e0, 110, 0.3);
            shake(scene, 0.016, 200);
            hitstop(scene, 80, () => {});
            squash(scene, ball, 'x');
            floatScore(scene, ball.x, ball.y - BALL_R(scene) - 12 * K, 'TOO BIG!', '#ff8a9a', 17 * K);
            api.haptic([16, 40, 16]);
            api.sfx('log');
            noteStep = 0; strikeStreak = 0; // the streak stings
            th.crushed = true; // it survives; you bounced off it
            th.img.setAlpha(0.9);
            loseLife(scene, 'WIPED OUT');
          }
        } else if (!th.swerved && !th.pin && !th.drift && !th.pool && !th.golden
          && th.meta.sizeClass > 0 && size < th.meta.sizeClass
          && Math.abs(dy) < ry * 0.7 && Math.abs(dx) < rx * 1.5
          && now - lastMoveAt < 420) {
          // an EARNED dodge: you actually STEERED clear of something that
          // would have flattened you — not just idling near it
          th.swerved = true;
          api.score(6 * auroraMult);
          floatScore(scene, th.img.x, th.img.y - 16 * K, `SWERVE +${6 * auroraMult}`, '#3adcc8', 13 * K);
          api.sfx('tap');
        }
      }

      // village strike ceremony — back-to-back strikes ESCALATE (turkey!)
      if (villageId && villagePins === 7 && villageDowned === 7) {
        for (const th of things) if (th.village === villageId) th.village = 0;
        strikeStreak++;
        const bonus = Math.min(250, 50 * strikeStreak) * auroraMult;
        api.score(bonus);
        const tier = strikeStreak >= 4 ? 'TURKEY!' : strikeStreak === 3 ? 'TRIPLE STRIKE'
          : strikeStreak === 2 ? 'DOUBLE STRIKE' : 'VILLAGE STRIKE';
        glyphBanner(scene, `${tier} +${bonus}`, strikeStreak >= 3 ? '#ff8ad0' : '#ffd24a', 30 * K);
        slowmo(scene, 0.35, 450);
        zoomPunch(scene, 1.09 + Math.min(0.06, strikeStreak * 0.02), 300);
        flash(scene, strikeStreak >= 3 ? 0xffd0f0 : 0xffe9b3, 120, 0.35);
        api.sfx('pr');
        api.haptic([16, 40, 16, 40, 16]);
      }

      // checkpoints: the deeper you roll, the more each one is worth
      if (dist > (this._nextMile ?? H * 4)) {
        this._nextMile = (this._nextMile ?? H * 4) + H * 4;
        mileN++;
        const pts = Math.min(60, 10 * mileN) * auroraMult;
        api.score(pts);
        api.note(noteStep++);
        floatScore(scene, ball.x, ball.y - BALL_R(scene) - 20 * K, `checkpoint +${pts}`, '#9cc8ec', 13 * K);
      }
    },
  };
}

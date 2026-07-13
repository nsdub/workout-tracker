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
  celestial, driftClouds,
} from '../fx.js';

export const TITLE = 'Iaido';
// star thresholds: UNDOUBLED points per second for 1/2/3 stars (rate-based
// medals). Runs now end on death (three blades), so a medal reflects
// deliberate survival, not a full-timer scribble: a sharp direction reversal
// inside one drag resets the combo, so frantic back-and-forth breaks its own
// chain and the ladder rewards clean, chained cutting over scribbling.
export const VERB = 'SLICE!';
export const STARS = [5, 10, 16];

export const HELP = {
  goal: 'Slice everything the mountain throws and keep your combos flowing.',
  how: 'Swipe across the screen and your stroke cuts whatever it touches. Cuts that land within a moment of each other build a combo that pays more for every slice. Hold your thumb still — once the charge bar along the top edge is at least half-full — to sheathe the blade and slow time, then flick to draw-cut through everything on that line.',
  avoid: 'Never cut a bomb, and never let an object fall past you uncut. You have three blades: a sliced bomb or a missed object costs one, and losing all three ends the run.',
};

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
    // lanterns EMIT light — under-glow first, body over it
    const ug = c.createRadialGradient(w / 2, h * 0.5, 1, w / 2, h * 0.5, w * 0.62);
    ug.addColorStop(0, 'rgba(255,176,90,.45)'); ug.addColorStop(1, 'rgba(255,176,90,0)');
    c.fillStyle = ug;
    c.fillRect(0, 0, w, h);
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
    // a warm tan calabash, outlined — a blue gourd vanished into the falls' sky
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#e9c56a'); g.addColorStop(1, '#a8641f');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h * 0.68, w * 0.32, 0, 7); c.fill();
    c.beginPath(); c.arc(w / 2, h * 0.3, w * 0.2, 0, 7); c.fill();
    c.strokeStyle = '#5c3410'; c.lineWidth = w * 0.045;
    c.beginPath(); c.arc(w / 2, h * 0.68, w * 0.32, 0, 7); c.stroke();
    c.beginPath(); c.arc(w / 2, h * 0.3, w * 0.2, 0, 7); c.stroke();
    c.fillStyle = '#2a4a1c';
    c.fillRect(w * 0.46, 0, w * 0.08, h * 0.14);
    c.fillStyle = 'rgba(255,255,255,.55)';
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
    // a bright stalk with a hard dark rim so it separates from the dark-green
    // grove silhouette it falls against (green-on-green cost blades before)
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#7ec24c'); g.addColorStop(0.5, '#b6f07a'); g.addColorStop(1, '#5f9a34');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(w * 0.3, h * 0.02, w * 0.4, h * 0.96, w * 0.1); c.fill();
    c.strokeStyle = '#123307'; c.lineWidth = w * 0.05;
    c.beginPath(); c.roundRect(w * 0.3, h * 0.02, w * 0.4, h * 0.96, w * 0.1); c.stroke();
    c.beginPath(); c.moveTo(w * 0.3, h * 0.32); c.lineTo(w * 0.7, h * 0.32); c.stroke();
    c.beginPath(); c.moveTo(w * 0.3, h * 0.64); c.lineTo(w * 0.7, h * 0.64); c.stroke();
    c.fillStyle = '#d8ff9a';
    c.beginPath(); c.ellipse(w * 0.8, h * 0.2, w * 0.2, h * 0.08, -0.6, 0, 7); c.fill();
    c.strokeStyle = '#2c5c1c'; c.lineWidth = w * 0.03;
    c.beginPath(); c.ellipse(w * 0.8, h * 0.2, w * 0.2, h * 0.08, -0.6, 0, 7); c.stroke();
  },
  melon(c, w, h) {
    // a warm cantaloupe, not green: the bamboo world's only counter to a
    // green-on-green field, so it MUST pop off the grove and its backdrop
    const g = c.createRadialGradient(w * 0.38, h * 0.38, 2, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#ffcf7a'); g.addColorStop(1, '#d97524');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.46, 0, 7); c.fill();
    c.strokeStyle = '#7a3b12'; c.lineWidth = w * 0.05;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.46, 0, 7); c.stroke();
    c.strokeStyle = '#b5641f'; c.lineWidth = w * 0.05;
    for (const dx of [-0.28, -0.09, 0.09, 0.28]) {
      c.beginPath(); c.moveTo(w * (0.5 + dx * 0.7), h * 0.09); c.quadraticCurveTo(w * (0.5 + dx * 1.7), h * 0.5, w * (0.5 + dx * 0.7), h * 0.91); c.stroke();
    }
    c.fillStyle = '#3f7a2c';
    c.beginPath(); c.ellipse(w * 0.58, h * 0.12, w * 0.12, h * 0.06, 0.5, 0, 7); c.fill();
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
  daruma(c, w, h) {
    const g = c.createRadialGradient(w * 0.4, h * 0.4, 2, w / 2, h * 0.55, w * 0.52);
    g.addColorStop(0, '#ffe9a0'); g.addColorStop(1, '#c8892c');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h * 0.55, w * 0.42, 0, 7); c.fill();
    c.fillStyle = '#fff3e0';
    c.beginPath(); c.ellipse(w / 2, h * 0.5, w * 0.26, h * 0.28, 0, 0, 7); c.fill();
    c.fillStyle = '#1c1208';
    c.beginPath(); c.arc(w * 0.42, h * 0.44, w * 0.06, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.58, h * 0.44, w * 0.06, 0, 7); c.fill();
    c.strokeStyle = '#c23b22'; c.lineWidth = w * 0.04;
    c.beginPath(); c.arc(w * 0.5, h * 0.52, w * 0.1, 0.5, 2.6); c.stroke();
  },
  flake(c, w, h) {
    // a saturated blue core + dark-rimmed arms so the crystal reads against a
    // pale sky, a white snowcap and falling snow — not a white-on-white ghost
    // you lose a blade to because you literally never saw it
    const core = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.44);
    core.addColorStop(0, '#5aa8e6'); core.addColorStop(0.6, '#1f5c9c'); core.addColorStop(1, 'rgba(18,50,90,0)');
    c.fillStyle = core;
    c.fillRect(0, 0, w, h);
    c.lineCap = 'round';
    c.translate(w / 2, h / 2);
    for (let i = 0; i < 6; i++) {
      c.rotate(Math.PI / 3);
      c.strokeStyle = '#0e3055'; c.lineWidth = w * 0.11;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -h * 0.42); c.stroke();
      c.strokeStyle = '#eaf6ff'; c.lineWidth = w * 0.055;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -h * 0.42); c.stroke();
      c.strokeStyle = '#bfe0ff'; c.lineWidth = w * 0.05;
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
      // tread edges catch the dusk; tiny lanterns climb with the pilgrims
      g.lineStyle(2 * K, cfg.accent, 0.18);
      let tx = -W * 0.05, ty = H * 0.86;
      for (let i = 0; i < 9; i++) {
        g.lineBetween(tx, ty, tx + W * 0.13, ty);
        tx += W * 0.13; ty -= H * 0.045;
      }
      for (const [lfx, lfy] of [[0.24, 0.795], [0.5, 0.705], [0.76, 0.615]]) {
        const lz = scene.add.image(W * lfx, H * lfy, 'fx-dot').setScale(K * 0.4).setTint(0xffb46c).setBlendMode('ADD').setAlpha(0.7).setDepth(-89);
        scene.tweens.add({ targets: lz, alpha: 0.4, duration: 900 + lfx * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
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
      g.fillStyle(0xbcd4ee, 0.78); // muted, not pure white, so the flake pops
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
  daruma: [58, 58], koi: [72, 44], goldkoi: [72, 44], lantern: [56, 62], scroll: [60, 40], gourd: [44, 58],
  ingot: [64, 34], coal: [52, 48], bamboo: [40, 84], melon: [58, 58], orb: [56, 56],
  charm: [42, 58], flake: [54, 54], peach: [52, 52], candle: [36, 66], itch: [50, 50], bomb: [54, 60],
};

const VALUE = { goldkoi: 30, itch: 40, daruma: 75 };

export function create(P, ctx) {
  const { api, cfg } = ctx;
  const objs = [];
  const halves = [];
  const debris = [];
  const trail = [];
  let trailGfx, sliceGlow, stanceGfx, darkVeil, ribbonGfx;
  let strokeSlices = 0;
  let lastSliceAt = 0;       // combos live in the moment, not in the hold
  let lastPt = null;
  let downAt = 0;
  let nextSpawn = 0;
  let goldenAt = 0;
  let t0 = 0;
  let fever = false;
  // failure state: three blades. A missed object or a sliced bomb spends
  // one; at zero the run ends. `started` gates every spawn on the first
  // stroke, so an untouched dojo throws nothing and can never be "missed".
  let dead = false;
  let lives = 3;
  let started = false;
  let livesGfx;
  let invulnUntil = 0;     // brief mercy after a blade is lost (no double-spend)
  let lastInputAt = 0;     // last genuine pointer activity — for walk-away grace
  let lastComboFx = 0;     // throttle heavy combo juice to once per ~180ms
  let lastMoveDir = null;  // scribble detection: reset combo on a sharp reversal
  // __P3_GOLD_QA is a QA-only timing shortcut (first jackpot at 2.5s); the
  // SHIPPED cadence is 12–30s, and the first jackpot is also seeded against
  // the rest remaining (see armFirst) so short rests still get a real chase.
  const goldDelay = () => (window.__P3_GOLD_QA ? 2500 : 12000 + Math.random() * 18000);
  // sheathe stance
  const stance = { active: false, meter: 1, lastMoveT: 0 };
  // world-mutation state
  const world = { darkness: 0.34, ribbonOpen: 0, frozen: 0, nextFreeze: 7000, spineT: 0, itchAt: 0, nextKoi: 0 };

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
    // bombs breed as the rest wears on — greed gets riskier, never safer
    const elapsed = (scene.time.now - t0) / 1000;
    // the opening is a bomb-free grace: teach the SLICE verb before the first
    // life-costing hazard, then ramp the powder in over a few seconds and keep
    // it climbing across a long rest so late play never coasts.
    let bombP = cfg.bombs > 0 ? Math.min(cfg.bombs + 0.12, cfg.bombs + elapsed * 0.0008) : 0;
    if (elapsed < 2.5) bombP = 0;
    else if (elapsed < 5.5) bombP *= (elapsed - 2.5) / 3;
    const isBomb = Math.random() < bombP;
    const kind = isBomb ? 'bomb' : cfg.objects[Math.floor(Math.random() * cfg.objects.length)];
    const x = W * (0.15 + Math.random() * 0.7);
    // the dragon's spine launches from anywhere, at anything
    if (cfg.spine) spawnObj(scene, K, kind, x, { vxSpread: 260, peakLo: 0.3 });
    else spawnObj(scene, K, kind, x);
  }

  function killObj(scene, o) {
    o.fuse?.destroy();
    o.glow?.destroy();
    o.img.destroy();
    const i = objs.indexOf(o);
    if (i >= 0) objs.splice(i, 1);
  }

  function loseLife(scene, x, y, label, cause) {
    if (dead) return;
    // one gesture (a two-bomb flick, a cluster of misses in a single frame)
    // must not spend two blades: a short mercy window after any life lost
    if (scene.time.now < invulnUntil) return;
    invulnUntil = scene.time.now + 950;
    lives = Math.max(0, lives - 1);
    const K = unit(scene);
    floatScore(scene, x, y, label, '#ff5d5d', 20 * K);
    shake(scene, 0.011, 150);
    api.haptic([18, 40, 18]);
    if (lives <= 0) {
      dead = true;
      // dying while sheathed must not leave the death ceremony in slow motion
      exitStance(scene, { quiet: true });
      api.die?.(cause);
    }
  }

  // three blade pips, top-right — spent blades gutter to a dark outline
  function drawLives(scene, K) {
    const W = scene.scale.width;
    livesGfx.clear();
    const gap = 20 * K, r = 7 * K, x0 = W - 18 * K - gap * 2, y = 18 * K;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * gap, full = i < lives;
      livesGfx.fillStyle(full ? cfg.blade : 0x000000, full ? 0.95 : 0.28);
      livesGfx.lineStyle(1.6 * K, cfg.accent, full ? 0.9 : 0.35);
      livesGfx.beginPath();
      livesGfx.moveTo(x, y - r);
      livesGfx.lineTo(x + r * 0.55, y);
      livesGfx.lineTo(x, y + r);
      livesGfx.lineTo(x - r * 0.55, y);
      livesGfx.closePath();
      livesGfx.fillPath();
      livesGfx.strokePath();
    }
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

  function sliceObj(scene, o, dirX, dirY, K, opts = {}) {
    const { x, y } = o.img;
    const accent = cfg.accent;
    if (o.isBomb) {
      killObj(scene, o);
      // Fruit Ninja's law, translated: a bomb must TERRIFY. It takes a cut
      // of everything you've built, so wild flailing stops being profitable
      const cost = Math.min(150, Math.max(30, Math.round(api.score(0) * 0.08)));
      api.score(-cost);
      floatScore(scene, x, y, `−${cost}`, '#ff5d5d', 26 * K);
      burst(scene, x, y, 0xff5d3c, { n: 30, speed: 480 * K, scale: 0.8 * K });
      shockRing(scene, x, y, 0xff5d3c, 150 * K);
      flash(scene, 0xff2a1a, 160, 0.5);
      hitstop(scene, 130, () => shake(scene, 0.028, 260));
      api.haptic([30, 40, 60]);
      api.sfx('log');
      strokeSlices = 0;
      loseLife(scene, x, y - 30 * K, 'BLADE LOST', 'CUT DOWN');
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
    // a combo is one burst of the blade: let 700ms pass since the last cut
    // and the chain is cold, held-down finger or not (anti-scribble law)
    if (scene.time.now - lastSliceAt > 700) strokeSlices = 0;
    lastSliceAt = scene.time.now;
    strokeSlices++;
    // per-cut reward keeps climbing to ×12 (was capped at ×8 while the banner
    // kept escalating); milestone bonuses below reward the longest streaks.
    let gain = (10 + Math.min(11, strokeSlices - 1) * 5) + (VALUE[o.kind] ?? 0);
    let label = `+${gain}`;
    // score sink sits top-LEFT (by the score readout), clear of the top-right
    // blade pips so collect sparks never bury how many lives remain
    const sinkX = 30 * K, sinkY = 20 * K;
    if (o.kind === 'daruma') {
      // the jackpot scales with the run so it never goes trivial late — the
      // bomb penalty already scales, so the greed has to stay worth it
      const boon = Math.min(140, Math.round(api.score(0) * 0.06));
      gain += boon;
      label = `+${gain}`;
      glyphBanner(scene, 'GOLDEN DARUMA', '#ffe9a0', 28 * K);
      collectTo(scene, x, y, sinkX, sinkY, 0xffd24a, 16);
      flash(scene, 0xffd24a, 120, 0.3);
      api.sfx('pr');
    } else if (o.kind === 'goldkoi') {
      // discovery treasure (ribbon world): its own ceremony, below the daruma
      glyphBanner(scene, 'GOLDEN KOI', '#ffe0a0', 24 * K);
      collectTo(scene, x, y, sinkX, sinkY, 0xffd24a, 10);
      flash(scene, 0xffd24a, 90, 0.24);
      api.sfx('objDone');
    } else if (o.kind === 'itch') {
      // spine-spark treasure (dragon world): mid-tier ceremony (koi < itch < daruma)
      glyphBanner(scene, 'SPINE SPARK', '#fff0c8', 26 * K);
      collectTo(scene, x, y, sinkX, sinkY, 0xffd24a, 13);
      flash(scene, 0xfff0c8, 100, 0.28);
      api.sfx('pr');
    }
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
    collectTo(scene, x, y, sinkX, sinkY, 0xffd24a, 5);
    if (strokeSlices >= 2) { shockRing(scene, x, y, accent, 90 * K); hitstop(scene, 40); }
    // milestone bonuses so the strongest streaks keep paying past the ×12 cap
    if (strokeSlices === 8 || strokeSlices === 12 || strokeSlices === 16) {
      const milestone = strokeSlices * 8;
      api.score(milestone);
      floatScore(scene, x, y - 46 * K, `STREAK +${milestone}`, '#ffe9a0', 22 * K);
    }
    // heavy escalation juice fires ONCE per stroke, not once per object: a
    // single-frame draw-cut (fromDraw) brings its own ceremony, and the time
    // gate keeps a fast multi-slice from stacking banners/slowmo into a strobe
    if (!opts.fromDraw) {
      const nowFx = scene.time.now;
      if (strokeSlices === 3 && nowFx - lastComboFx > 180) {
        banner(scene, 'COMBO ×3', '#ffd24a', 30 * K); lastComboFx = nowFx;
      } else if (strokeSlices >= 4 && nowFx - lastComboFx > 180) {
        banner(scene, `COMBO ×${strokeSlices}`, '#ff9a3c', 34 * K);
        flash(scene, 0xfff0c8, 90, 0.3);
        if (!stance.active) slowmo(scene, 0.35, 420);
        zoomPunch(scene, 1.07, 240);
        shake(scene, 0.01, 160);
        lastComboFx = nowFx;
      }
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
    // the flick out of stance: one cut along a FINITE blade-reach around the
    // flick, so you must aim it at the cluster rather than sweep the whole
    // screen blind — and it NEVER catches a bomb (an unavoidable, invisible
    // life lost on the game's signature reward move).
    const W = scene.scale.width, H = scene.scale.height;
    const cx = lastPt?.x ?? W / 2, cy = lastPt?.y ?? H / 2;
    const len = Math.hypot(dirX, dirY) || 1;
    const ux = dirX / len, uy = dirY / len;
    const reach = Math.max(W, H) * 0.62; // how far the cut travels each way
    const hits = [];
    for (const o of [...objs]) {
      if (o.isBomb) continue;
      const dx = o.img.x - cx, dy = o.img.y - cy;
      const perp = Math.abs(dx * uy - dy * ux);   // off the line
      const along = Math.abs(dx * ux + dy * uy);  // along the line
      if (perp <= o.r + 26 * K && along <= reach + o.r) hits.push(o);
    }
    // the cut line, drawn as a blade of light (bounded to its reach)
    const lineGfx = scene.add.graphics().setDepth(45).setBlendMode(P.BlendModes.ADD);
    lineGfx.lineStyle(20 * K, cfg.accent, 0.3).lineBetween(cx - ux * reach, cy - uy * reach, cx + ux * reach, cy + uy * reach);
    lineGfx.lineStyle(6 * K, cfg.blade, 0.95).lineBetween(cx - ux * reach, cy - uy * reach, cx + ux * reach, cy + uy * reach);
    scene.tweens.add({ targets: lineGfx, alpha: 0, duration: 420, onComplete: () => lineGfx.destroy() });
    flash(scene, 0xffffff, 110, 0.45);
    if (hits.length) {
      hitstop(scene, Math.min(220, 90 + hits.length * 20), () => {
        shake(scene, 0.012 + hits.length * 0.003, 240);
        zoomPunch(scene, 1.1, 280);
      });
      // the per-object combo the loop pays IS the multi-hit reward; a modest
      // fold flourish sits on top (no full flat double-count of every object)
      for (const o of hits) sliceObj(scene, o, ux, uy, K, { fromDraw: true });
      const gain = hits.length >= 2 ? hits.length * 8 : 0;
      if (gain) { api.score(gain); floatScore(scene, cx, cy - 40 * K, `+${gain}`, '#fff0c8', 30 * K); }
      if (hits.length >= 2) glyphBanner(scene, `${hits.length}-FOLD CUT`, '#fff0c8', 32 * K);
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

  function exitStance(scene, opts = {}) {
    const wasActive = stance.active;
    stance.active = false;
    scene.time.timeScale = 1;
    scene.tweens.timeScale = 1;
    if (scene.physics?.world) scene.physics.world.timeScale = 1;
    // the sheathe lands: a soft resolve beat so the snap back to full speed
    // reads as a deliberate re-sheathe, not a dropped frame. `toDraw` skips it
    // (the draw-cut brings its own thunder); `quiet` skips it at run-end.
    if (wasActive && !opts.toDraw && !opts.quiet) {
      api.sfx('tap');
      api.haptic(10);
      const K = unit(scene);
      const gx = lastPt?.x ?? scene.scale.width / 2, gy = lastPt?.y ?? scene.scale.height / 2;
      const glint = scene.add.image(gx, gy, 'fx-dot')
        .setBlendMode('ADD').setTint(cfg.blade).setAlpha(0.7).setScale(K * 0.6).setDepth(43);
      scene.tweens.add({
        targets: glint, alpha: 0, scaleX: K * 2.6, scaleY: K * 0.18,
        duration: 260, ease: 'Cubic.easeOut', onComplete: () => glint.destroy(),
      });
    }
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
      // drive the forge crater glow off the same hot/cold clock as the ingots
      // (drawLand set it on an independent tween that told the player nothing)
      if (cfg.forge && world.forgeGlow) scene.tweens.killTweensOf(world.forgeGlow);
      if (!cfg.candles) {
        // sun or moon + weather; the sparring hall keeps its candlelight
        const night = ['dojo-torii', 'dojo-dragon', 'dojo-snow'].includes(ctx.worldCls);
        celestial(scene, scene.scale.width * (night ? 0.8 : 0.24), scene.scale.height * 0.12,
          22 * K, night ? 0xe8f2ff : 0xffd24a, { crescent: night, depth: -95 });
        driftClouds(scene, {
          n: 2, tint: night ? 0x6a6090 : 0xffe0c0, alpha: night ? 0.4 : 0.55,
          yBand: [0.05, 0.2], depth: -87,
        });
        // valley mist hugging the far ground
        canvasTex(scene, 'dj-mist', scene.scale.width, Math.ceil(scene.scale.height * 0.12), (c, w, h) => {
          const g = c.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.55, 'rgba(235,240,250,.16)');
          g.addColorStop(1, 'rgba(235,240,250,0)');
          c.fillStyle = g;
          c.fillRect(0, 0, w, h);
        });
        const mist = scene.add.image(0, scene.scale.height * 0.62, 'dj-mist').setOrigin(0).setDepth(-86);
        scene.tweens.add({ targets: mist, x: -30 * K, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
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
      livesGfx = scene.add.graphics().setDepth(46);
      sliceGlow = scene.add.particles(0, 0, 'fx-dot', {
        speed: { min: 20, max: 90 }, scale: { start: 0.4 * K, end: 0 },
        lifespan: 220, tint: cfg.blade, blendMode: 'ADD', frequency: -1,
      }).setDepth(41);

      // time anchors are seeded on the FIRST UPDATE, not here: the scene
      // clock reads ~0 inside create() but jumps to page-uptime on frame
      // one, which silently expired every timer seeded in create
      // first stroke arms the dojo: the difficulty ramp and every spawn clock
      // start now, so an idle world stays empty and safe. The jackpot is also
      // seeded against the rest remaining so even a short rest gets a chase.
      const armFirst = () => {
        if (started) return;
        started = true;
        t0 = scene.time.now;
        nextSpawn = scene.time.now + 250;
        const cap = (api.timeLeft?.() ?? 999000) * 0.4;
        goldenAt = scene.time.now + Math.min(goldDelay(), Math.max(3000, cap));
      };
      // cleanup shared by every stroke-ending path (clean lift, release
      // outside the canvas, OS touch-cancel, or backgrounding to log a set):
      // never strand the scene time-scaled or mid-stroke. strokeSlices is NOT
      // zeroed here — the 700ms combo clock (in update) governs, so a fresh
      // swipe within the window keeps the chain.
      const endStroke = () => {
        if (stance.active) exitStance(scene);
        lastPt = null;
        lastMoveDir = null;
      };
      scene.input.on('pointerdown', (p) => {
        armFirst();
        lastInputAt = scene.time.now;
        lastPt = { x: p.worldX ?? p.x, y: p.worldY ?? p.y, t: scene.time.now };
        downAt = scene.time.now;
        stance.lastMoveT = scene.time.now;
        lastMoveDir = null;
      });
      scene.input.on('pointerup', endStroke);
      scene.input.on('pointerupoutside', endStroke);
      // logging a set backgrounds this surface — recover time-scale on hide
      const onHide = () => { if (document.hidden) endStroke(); };
      document.addEventListener('visibilitychange', onHide);
      scene.events.once('shutdown', () => document.removeEventListener('visibilitychange', onHide));
      scene.events.once('destroy', () => document.removeEventListener('visibilitychange', onHide));
      scene.input.on('pointermove', (p) => {
        if (!lastPt) return;
        const now = scene.time.now;
        // hit-test in WORLD space so aim stays glued to objects while the
        // camera zoom-punches / shakes (screen coords drift under the punch)
        const px = p.worldX ?? p.x, py = p.worldY ?? p.y;
        const dx = px - lastPt.x, dy = py - lastPt.y;
        const dist = Math.hypot(dx, dy);
        const dt = Math.max(1, now - lastPt.t);
        const speed = dist / dt;
        lastInputAt = now;
        trail.push({ x: px, y: py, t: now });
        // a tremoring / resting post-set thumb (<12px) counts as STILL, so a
        // shaky hand can still HOLD the sheathe and isn't read as a stroke
        if (dist > 12) stance.lastMoveT = now;

        if (stance.active) {
          // any decisive move out of the sheathe releases the draw-cut — keyed
          // on DISPLACEMENT, not a speed derived from a stale hold timestamp,
          // so even a gentle flick can never strand the player in slow-mo
          if (dist > 18) {
            stance.meter = 0;
            exitStance(scene, { toDraw: true });
            drawCut(scene, dx, dy, unit(scene));
          }
          lastPt = { x: px, y: py, t: now };
          return;
        }

        // anti-scribble: a sharp direction reversal inside one drag breaks the
        // chain, so frantic back-and-forth can't hold a permanently-maxed combo
        if (dist > 6) {
          const ndir = { x: dx / dist, y: dy / dist };
          if (lastMoveDir && (ndir.x * lastMoveDir.x + ndir.y * lastMoveDir.y) < -0.35) strokeSlices = 0;
          lastMoveDir = ndir;
        }

        // low speed floor: a slow, deliberate stroke that visibly passes
        // through an object MUST cut it (an uncut miss now costs a blade)
        if (speed > 0.12) {
          sliceGlow.emitParticleAt(px, py, 2);
          const len = dist || 1;
          // waterfall law: the ribbon parts where the blade crosses it — but
          // gated (one koi per 6s) so scribble-crossings can't farm goldkoi
          if (cfg.ribbon && world.ribbonOpen <= 0 && now >= world.nextKoi) {
            const rx = scene.scale.width * 0.5;
            if ((lastPt.x - rx) * (px - rx) < 0) {
              world.ribbonOpen = 2000;
              world.nextKoi = now + 6000;
              const K2 = unit(scene);
              burst(scene, rx, (lastPt.y + py) / 2, 0xbfe8f8, { n: 22, speed: 300 * K2, scale: 0.5 * K2 });
              spawnObj(scene, K2, 'goldkoi', rx, { vxSpread: 200 });
              api.sfx('objDone');
            }
          }
          for (const o of [...objs]) {
            if (segHit(lastPt.x, lastPt.y, px, py, o.img.x, o.img.y, o.r)) {
              sliceObj(scene, o, dx / len, dy / len, unit(scene));
            } else if (o.isBomb && !o.grazed
              && segHit(lastPt.x, lastPt.y, px, py, o.img.x, o.img.y, o.r + 30 * unit(scene))) {
              // the blade passed a whisker from the powder — iron nerves pay
              o.grazed = true;
              api.score(5);
              floatScore(scene, o.img.x, o.img.y - 24 * unit(scene), 'COLD BLOOD +5', '#8ad0ff', 13 * unit(scene));
              api.sfx('tap');
            }
          }
        }
        lastPt = { x: px, y: py, t: now };
      });
    },

    update(t, dtMs) {
      const scene = this;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      const now = scene.time.now;
      if (!t0) { t0 = now; nextSpawn = now + 500; goldenAt = now + goldDelay(); }

      // recover from an interrupted touch that stranded the sheathe slow-mo
      if (stance.active && !lastPt) exitStance(scene, { quiet: true });
      // the combo cools on its OWN 700ms clock (not on lift), so a chain can
      // bridge quick separate swipes but a genuine pause ends it — and a
      // cooled combo lets the sheathe arm again after a burst of cutting
      if (strokeSlices > 0 && now - lastSliceAt > 700) strokeSlices = 0;

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
      // stance charge: a legible bar along the top with a tick at the 0.5
      // sheathe threshold, so the player can SEE when the sheathe is armed
      const barH = 6 * K, ready = stance.meter >= 0.5;
      stanceGfx.fillStyle(0x000000, 0.35).fillRect(0, 0, W, barH);
      stanceGfx.fillStyle(cfg.blade, ready ? 0.92 : 0.5).fillRect(0, 0, W * stance.meter, barH);
      if (ready && !stance.active) {
        stanceGfx.fillStyle(cfg.accent, 0.12 + 0.1 * Math.sin(now / 180)).fillRect(0, 0, W * stance.meter, barH);
      }
      // the half-charge tick: cross it and the sheathe unlocks
      stanceGfx.fillStyle(0xffffff, 0.9).fillRect(W * 0.5 - 1 * K, 0, 2 * K, barH + 3 * K);
      if (stance.active && lastPt) {
        const pulse = 0.5 + 0.3 * Math.sin(now / 90);
        stanceGfx.lineStyle(2.5 * K, cfg.blade, pulse);
        stanceGfx.strokeCircle(lastPt.x, lastPt.y, 44 * K + 6 * K * Math.sin(now / 140));
        stanceGfx.fillStyle(cfg.accent, 0.06).fillRect(0, 0, W, H);
      } else if (lastPt && strokeSlices === 0 && now - stance.lastMoveT > 160) {
        // holding still but not sheathed yet: show WHY — a ring at the thumb
        // that fills toward the threshold (grey = charging, blade = armed) so
        // the blocked slow-mo has a visible reason instead of feeling broken
        const chg = Math.min(1, stance.meter / 0.5), rr = 30 * K;
        stanceGfx.lineStyle(3 * K, ready ? cfg.blade : 0x8890a8, ready ? 0.8 : 0.5);
        stanceGfx.beginPath();
        stanceGfx.arc(lastPt.x, lastPt.y, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chg);
        stanceGfx.strokePath();
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
      // gated on `started`: an untouched snow world must NOT strobe blue and
      // ding every 7s while the phone sits face-up between sets (idle law)
      if (started && cfg.icetime) {
        world.nextFreeze -= dtMs;
        if (world.frozen > 0) {
          world.frozen -= dtMs;
          if (world.frozen <= 0) {
            // the thaw: mirror the freeze so the resumption of motion is FELT
            // (before, several objects silently lurched back into falling)
            for (const o of objs) {
              o.img.body.enable = true;
              o.img.clearTint();
              burst(scene, o.img.x, o.img.y, 0xdff2ff, { n: 8, speed: 160 * K, scale: 0.3 * K });
            }
            flash(scene, 0xfff0e0, 110, 0.18);
            api.sfx('objDone');
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
      // forge law telegraph: an ingot only cuts while the bellows pulse has it
      // glowing. Drive the ingot's OWN look (and the crater glow) off forgeHot
      // in real time so the strike window is readable BEFORE you commit — not
      // a 'cold!' message after a wasted swipe already broke your combo.
      if (cfg.forge) {
        const hot = forgeHot(scene);
        for (const o of objs) {
          if (o.kind === 'ingot') { if (hot) o.img.clearTint(); else o.img.setTint(0x6a7290); }
        }
        if (world.forgeGlow) world.forgeGlow.setAlpha(hot ? 0.8 : 0.22).setScale(K * (hot ? 3.3 : 2.4));
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
        // the itch-spot rides the spine — a haloed 'hit me' treasure so its
        // high value reads on sight (and it announces itself on the cut, below)
        if (started && now - world.itchAt > 5000 && !objs.some((o) => o.kind === 'itch')) {
          world.itchAt = now;
          const o = spawnObj(scene, K, 'itch', W * (0.2 + Math.random() * 0.6), { peakLo: 0.35 });
          o.img.setTint(0xffe9a0);
          o.glow = scene.add.particles(0, 0, 'fx-dot', {
            speed: 26, scale: { start: 0.5 * K, end: 0 }, lifespan: 420,
            tint: 0xffd24a, blendMode: 'ADD', frequency: 60,
          }).setDepth(9).startFollow(o.img);
        }
      }

      // ——— the golden daruma: rare, slow, worth the greed ———
      if (started && now >= goldenAt && !objs.some((o) => o.kind === 'daruma')) {
        goldenAt = now + goldDelay();
        const o = spawnObj(scene, K, 'daruma', W * (0.25 + Math.random() * 0.5), { peakLo: 0.5 });
        o.img.body.gravity.y = 320 * K; // floats up lazily — you have time
        o.img.body.velocity.y *= 0.7;
        o.glow = scene.add.particles(0, 0, 'fx-dot', {
          speed: 30, scale: { start: 0.4 * K, end: 0 }, lifespan: 400,
          tint: 0xffd24a, blendMode: 'ADD', frequency: 50,
        }).setDepth(9).startFollow(o.img);
        api.sfx('tap');
      }

      // ——— spawning: a MISS costs a life, so one thumb must be able to
      // reach everything airborne. Hard-cap concurrent must-slice (non-bomb)
      // objects; the rest wears you down with a faster CADENCE and more
      // bombs, never an uncoverable wall of simultaneous fruit. ———
      if (started && now >= nextSpawn) {
        const elapsed = (now - t0) / 1000;
        // CAP bounds the must-slice objects to what one thumb can clear, so
        // escalation comes from a tighter CADENCE + more bombs, never a wall
        // of simultaneous fruit no single thumb could ever cover.
        const airborne = objs.reduce((n, o) => n + (o.isBomb ? 0 : 1), 0);
        const CAP = 3;
        let volley = Math.min(1 + (Math.random() < 0.4 ? 1 : 0) + (fever ? 1 : 0), Math.max(0, CAP - airborne));
        for (let i = 0; i < volley; i++) scene.time.delayedCall(i * 150, () => launch(scene, K));
        // cadence keeps tightening past the old 90s knee toward a 600ms floor
        // so a long (240s) rest keeps building instead of coasting flat
        nextSpawn = now + Math.max(600, 1180 - elapsed * 4) / (cfg.pace * (fever ? 1.25 : 1));
      }

      // ——— housekeeping ———
      for (const o of [...objs]) {
        const fellPast = o.img.y > H + 70 * K && o.img.body.velocity.y > 0;
        if (fellPast || now - o.born > 9000) {
          // a non-bomb dropped uncut is a miss — but NOT during the GOLD RUSH
          // payoff burst (the player can't slow that torrent and it must never
          // end the run it exists to reward), and NOT once the player has
          // clearly stepped away (no input for 2s — set the phone down to grab
          // water). Bombs are MEANT to fall away, so they never cost a blade.
          const engaged = now - lastInputAt < 2000;
          if (fellPast && !o.isBomb && !fever && engaged) loseLife(scene, o.img.x, H - 40 * K, 'MISS', 'CUT DOWN');
          killObj(scene, o);
        }
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

      drawLives(scene, K);
    },
  };
}

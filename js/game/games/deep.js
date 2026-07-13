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
  how: 'Hold to plummet and slide your thumb to steer; ease off the glass to slow into a safe drift. At full speed you smash through wreckage, but shaving past obstacles without touching them pays a rising thread chain that is worth far more.',
  avoid: 'Slamming into anything solid you cannot smash dents the hull, and the striped armored slabs never break — three dents ends the dive. Some deeps also snag or spotlight you, bleeding your speed. Lift your thumb to drift and you are always safe.',
};

export const WORLDS = {
  'deep-vents': {
    name: 'Hydrothermal Drop', sky: [[0, '#0c2036'], [0.6, '#0a1428'], [1, '#060a18']],
    accent: 0xff9a5c, obstacles: ['plate', 'chimney'], vents: true, density: 1.0,
    wallKind: 'vent',
  },
  'deep-whalefall': {
    name: 'Whalefall Cathedral', sky: [[0, '#122a40'], [0.6, '#0c1830'], [1, '#070c1c']],
    accent: 0xbfd8e8, obstacles: ['rib', 'plate'], density: 1.05,
    wallKind: 'bone',
  },
  'deep-market': {
    name: 'Sunken Night Market', sky: [[0, '#1c1440'], [0.6, '#120e30'], [1, '#0a081c']],
    accent: 0xffc46c, obstacles: ['canopy', 'plate'], lanterns: true, soft: true, density: 1.0,
    wallKind: 'market',
  },
  'deep-kelp': {
    name: 'Kelp Cathedral', sky: [[0, '#0c3024'], [0.6, '#082418'], [1, '#04140e']],
    accent: 0x7ad48a, obstacles: ['plate'], kelp: true, density: 0.9,
    wallKind: 'kelp',
  },
  'deep-jelly': {
    name: 'Jellyfield', sky: [[0, '#241048'], [0.6, '#180c38'], [1, '#0c0620']],
    accent: 0xff8ad0, obstacles: ['plate'], jellies: true, density: 0.9,
    wallKind: 'jelly',
  },
  'deep-subs': {
    name: 'Patrol Graveyard', sky: [[0, '#14202c'], [0.6, '#0e1620'], [1, '#080c14']],
    accent: 0xaac8dc, obstacles: ['hull', 'plate'], searchlights: true, density: 1.0,
    wallKind: 'wreck',
  },
  'deep-reef': {
    name: 'Coral Gauntlet', sky: [[0, '#16344c'], [0.6, '#0e2036'], [1, '#081220']],
    accent: 0xff7a8a, obstacles: ['coral', 'coral', 'plate'], density: 1.3,
    wallKind: 'coral',
  },
  'deep-void': {
    name: 'The Void', sky: [[0, '#080a16'], [0.6, '#04060e'], [1, '#020308']],
    accent: 0x8ad0ff, obstacles: ['plate', 'rib'], dark: true, anglers: true, density: 0.95,
    wallKind: 'void',
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
  weed(c, w, h) { paintWeed(c, w, h, 'kelp'); },
  // color-independent 'do not smash' badge for armored slabs — hazard
  // stripes read in every world, including the red/pink reef where a red
  // tint alone vanishes into the coral
  armormark(c, w, h) {
    c.save();
    c.fillStyle = 'rgba(16,14,8,.9)';
    c.beginPath(); c.roundRect(w * 0.08, h * 0.34, w * 0.84, h * 0.32, h * 0.08); c.fill();
    c.beginPath(); c.rect(w * 0.08, h * 0.34, w * 0.84, h * 0.32); c.clip();
    c.strokeStyle = 'rgba(255,214,70,.95)'; c.lineWidth = w * 0.1; c.lineCap = 'butt';
    for (let i = -2; i < 10; i++) {
      c.beginPath(); c.moveTo(w * 0.12 * i, h * 0.34); c.lineTo(w * 0.12 * i + w * 0.28, h * 0.66); c.stroke();
    }
    c.restore();
    c.strokeStyle = 'rgba(10,8,4,.85)'; c.lineWidth = w * 0.02;
    c.strokeRect(w * 0.08, h * 0.34, w * 0.84, h * 0.32);
  },
};

// ——— per-world canyon walls ———
// The walls scroll past the whole dive, so they are the single most visible
// layer. Each world draws a different place here — not a recolored kelp
// forest. Palette + which flora is drawn is chosen by wallKind.
const WALLPAL = {
  vent:   { rock: 'rgba(38,18,14,.9)',   shelf: 'rgba(120,54,34,.32)',  dust: 'rgba(255,150,90,.32)' },
  bone:   { rock: 'rgba(20,32,46,.85)',  shelf: 'rgba(130,158,182,.28)', dust: 'rgba(222,236,246,.34)' },
  market: { rock: 'rgba(26,16,44,.85)',  shelf: 'rgba(122,82,162,.3)',   dust: 'rgba(255,200,110,.32)' },
  kelp:   { rock: 'rgba(10,24,30,.85)',  shelf: 'rgba(60,100,110,.25)',  dust: 'rgba(190,232,248,.28)' },
  jelly:  { rock: 'rgba(24,10,42,.85)',  shelf: 'rgba(150,70,170,.28)',  dust: 'rgba(255,180,225,.32)' },
  wreck:  { rock: 'rgba(16,24,32,.88)',  shelf: 'rgba(96,124,144,.3)',   dust: 'rgba(170,205,225,.28)' },
  coral:  { rock: 'rgba(18,32,46,.85)',  shelf: 'rgba(96,134,154,.26)',  dust: 'rgba(255,200,180,.32)' },
  void:   { rock: 'rgba(4,6,10,.97)',    shelf: 'rgba(20,28,44,.4)',     dust: 'rgba(120,180,220,.16)' },
};

function paintWeed(c, w, h, kind) {
  const P = WALLPAL[kind] || WALLPAL.kelp;
  const jags = [0.1, 0.16, 0.08, 0.19, 0.12, 0.17, 0.09, 0.15];
  for (const side of [0, 1]) {
    c.fillStyle = P.rock;
    c.beginPath();
    c.moveTo(side * w, 0);
    for (let i = 0; i <= 8; i++) {
      const y = h * i / 8;
      const x = side ? w - w * jags[i % 8] : w * jags[i % 8];
      c.lineTo(x, y);
    }
    c.lineTo(side * w, h);
    c.closePath(); c.fill();
    c.fillStyle = P.shelf;
    for (let i = 0; i < 8; i += 2) {
      const y = h * i / 8;
      const x = side ? w - w * jags[i % 8] : w * jags[i % 8];
      c.beginPath(); c.ellipse(x, y + h * 0.04, w * 0.05, h * 0.012, 0, 0, 7); c.fill();
    }
  }
  (WALL_FLORA[kind] || WALL_FLORA.kelp)(c, w, h, P);
  c.fillStyle = P.dust;
  const dots = [0.13, 0.31, 0.47, 0.66, 0.81, 0.24, 0.58, 0.72, 0.39, 0.9];
  dots.forEach((fx, i) => {
    c.beginPath(); c.arc(w * fx, h * ((i * 0.103 + fx * 0.7) % 1), w * 0.004 + (i % 3) * w * 0.002, 0, 7); c.fill();
  });
}

const WALL_FLORA = {
  kelp(c, w, h) {
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
  },
  // coral: branching fractal trees in reef colors
  coral(c, w, h) {
    const cols = ['rgba(226,74,110,.55)', 'rgba(232,138,60,.55)', 'rgba(58,200,180,.55)', 'rgba(200,90,180,.55)'];
    const branch = (bx, by, len, ang, d) => {
      if (d <= 0 || len < w * 0.02) return;
      const ex = bx + Math.sin(ang) * len, ey = by - Math.cos(ang) * len;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(ex, ey); c.stroke();
      branch(ex, ey, len * 0.68, ang - 0.5, d - 1);
      branch(ex, ey, len * 0.68, ang + 0.5, d - 1);
    };
    for (let i = 0; i < 6; i++) {
      const x = w * (0.12 + i * 0.15);
      c.strokeStyle = cols[i % 4]; c.lineWidth = w * 0.02; c.lineCap = 'round';
      branch(x, h, h * 0.15, (i % 2 ? 1 : -1) * 0.25, 4);
      c.fillStyle = 'rgba(255,240,200,.5)';
      c.beginPath(); c.arc(x, h * (0.5 + (i % 3) * 0.14), w * 0.018, 0, 7); c.fill();
    }
  },
  // whalefall: pale rib arches receding + a vertebral column
  bone(c, w, h) {
    c.strokeStyle = 'rgba(216,226,232,.4)'; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const y = h * (0.12 + i * 0.2);
      c.lineWidth = w * 0.03;
      c.beginPath();
      c.moveTo(w * 0.06, y + h * 0.08);
      c.quadraticCurveTo(w * 0.5, y - h * 0.14, w * 0.94, y + h * 0.08);
      c.stroke();
    }
    c.fillStyle = 'rgba(200,214,222,.32)';
    for (let y = h * 0.05; y < h; y += h * 0.09) {
      c.beginPath(); c.ellipse(w * 0.5, y, w * 0.03, h * 0.02, 0, 0, 7); c.fill();
    }
  },
  // vents: basalt spires with glowing mineral caps + rising heat motes
  vent(c, w, h) {
    for (let i = 0; i < 4; i++) {
      const x = w * (0.2 + i * 0.2), sw = w * (0.05 + (i % 2) * 0.02), top = h * (0.2 + (i % 3) * 0.12);
      c.fillStyle = 'rgba(40,20,16,.85)';
      c.beginPath(); c.moveTo(x - sw, h); c.lineTo(x - sw * 0.4, top); c.lineTo(x + sw * 0.4, top); c.lineTo(x + sw, h); c.closePath(); c.fill();
      const g = c.createRadialGradient(x, top, 1, x, top, sw * 2);
      g.addColorStop(0, 'rgba(255,180,90,.7)'); g.addColorStop(1, 'rgba(255,120,60,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, top, sw * 1.6, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(255,150,80,.35)';
    for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(w * ((i * 0.17) % 1), h * ((i * 0.13) % 1), w * 0.006, 0, 7); c.fill(); }
  },
  // market: strings of paper lanterns hung across the canyon
  market(c, w, h) {
    c.strokeStyle = 'rgba(180,140,80,.4)'; c.lineWidth = w * 0.006;
    for (let s = 0; s < 3; s++) {
      const y0 = h * (0.1 + s * 0.32);
      c.beginPath(); c.moveTo(0, y0); c.quadraticCurveTo(w * 0.5, y0 + h * 0.05, w, y0); c.stroke();
      for (let i = 0; i < 6; i++) {
        const x = w * (0.08 + i * 0.17), y = y0 + h * 0.04 + Math.sin(i) * h * 0.01;
        const g = c.createRadialGradient(x, y, 1, x, y, w * 0.05);
        g.addColorStop(0, 'rgba(255,220,140,.8)'); g.addColorStop(1, 'rgba(255,150,70,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, w * 0.045, 0, 7); c.fill();
        c.fillStyle = 'rgba(200,60,50,.7)'; c.beginPath(); c.ellipse(x, y, w * 0.016, h * 0.012, 0, 0, 7); c.fill();
      }
    }
  },
  // jelly: drifting translucent bells trailing tendrils
  jelly(c, w, h) {
    for (let i = 0; i < 5; i++) {
      const x = w * (0.14 + i * 0.18), y = h * (0.12 + (i % 3) * 0.28), r = w * (0.05 + (i % 2) * 0.02);
      const g = c.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255,190,235,.5)'); g.addColorStop(1, 'rgba(255,138,208,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,160,220,.3)'; c.lineWidth = w * 0.006; c.lineCap = 'round';
      for (let t = -1; t <= 1; t++) {
        c.beginPath(); c.moveTo(x + t * r * 0.4, y);
        c.quadraticCurveTo(x + t * r * 0.6, y + r * 2, x + t * r * 0.3, y + r * 3.4); c.stroke();
      }
    }
  },
  // wreck: broken pipes and riveted hull plates of the patrol graveyard
  wreck(c, w, h) {
    c.strokeStyle = 'rgba(120,140,160,.35)'; c.lineWidth = w * 0.03; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x = w * (0.2 + i * 0.2);
      c.beginPath(); c.moveTo(x, h); c.lineTo(x, h * (0.3 + (i % 3) * 0.15)); c.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = w * (0.15 + (i % 3) * 0.32), y = h * (0.15 + i * 0.17);
      c.fillStyle = 'rgba(70,90,105,.4)';
      c.beginPath(); c.roundRect(x, y, w * 0.18, h * 0.05, w * 0.01); c.fill();
      c.fillStyle = 'rgba(180,200,215,.4)';
      for (let r = 0; r < 3; r++) { c.beginPath(); c.arc(x + w * 0.03 + r * w * 0.06, y + h * 0.025, w * 0.006, 0, 7); c.fill(); }
    }
  },
  // void: near-empty black, only a few faint bioluminescent motes
  void(c, w, h) {
    c.fillStyle = 'rgba(120,190,230,.22)';
    for (let i = 0; i < 8; i++) {
      c.beginPath(); c.arc(w * ((i * 0.19 + 0.07) % 1), h * ((i * 0.27 + 0.05) % 1), w * 0.004 + (i % 2) * w * 0.003, 0, 7); c.fill();
    }
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
  // hull integrity: three plates. Every bump or clang — any collision you
  // could not smash through — spends one; at zero the hull gives and the
  // dive ends. A brief guard keeps a single wall from spending two at once.
  let dead = false;
  let lives = 3;
  let hullInvuln = 0;
  let livesGfx;
  let gaugeGfx, smashGlow, streakTxt, hullTxt;
  let diveT0 = 0, playElapsed = 0;   // difficulty clock keyed to active diving
  let inVentPrev = false, hullFlash = 0;
  const obstacles = [];      // { img, kind, meta, grazed }
  const kelps = [];          // { gfx, x, phase, torn }
  const vents = [];          // { x, w, nextAt, until, col }
  const lights = [];         // searchlights { sub, angle }
  let nextOb = 0;
  let goldenAt = 0;
  let layerFar, layerNear;
  const goldDelay = () => (window.__P3_GOLD_QA ? 2500 : 12000 + Math.random() * 18000);

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
    // not bumps you shrug through. The share EASES in from 0 (no 0→20%
    // step) and is keyed to time actually spent diving, not wall clock.
    const elapsed = playElapsed;
    const armorP = elapsed <= 6 ? 0
      : Math.min(0.45, 0.18 + (elapsed - 6) / 240) * Math.min(1, (elapsed - 6) / 5);
    const armored = kind !== 'jelly' && kind !== 'canopy' && Math.random() < armorP;
    let aw = w, mark = null;
    if (armored) {
      img.setTint(0xff8a8a);
      img.setScale(1.35, 1);
      aw = w * 1.35;
      scene.tweens.add({ targets: img, alpha: 0.72, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // scale-pulse (color-independent) + a striped hazard badge so the
      // 'never smash this' cue survives the red/pink reef world
      scene.tweens.add({ targets: img, scaleX: 1.5, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      mark = scene.add.image(x, H + h, canvasTex(scene, 'dp-armormark', 44, 20, PAINT.armormark))
        .setDepth(12).setDisplaySize(Math.min(aw * 0.8, 70 * K), 22 * K);
    }
    obstacles.push({ img, kind, meta, hp: meta.hp, grazed: false, w: aw, h, armored, mark });
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
    obstacles.push({ img, kind: 'pickup', meta: { pts: 7 }, hp: 0, grazed: true, w: 34 * K, h: 34 * K, pickup: true });
  }

  // one place that tears down an obstacle — kills its infinite tweens FIRST
  // (jelly pulse, armor alpha/scale pulse, halo shimmer) so nothing keeps
  // interpolating on a dead object for the rest of the dive
  function destroyObstacle(scene, o) {
    if (o._gone) return;
    o._gone = true;
    scene.tweens.killTweensOf(o.img);
    o.img.destroy();
    if (o.halo) { scene.tweens.killTweensOf(o.halo); o.halo.destroy(); }
    if (o.mark) { scene.tweens.killTweensOf(o.mark); o.mark.destroy(); }
    const i = obstacles.indexOf(o);
    if (i >= 0) obstacles.splice(i, 1);
  }

  function smash(scene, o, K) {
    const { x, y } = o.img;
    burst(scene, x, y, cfg.accent, { n: 22, speed: 420 * K, scale: 0.6 * K, gravityY: -240 * K });
    shockRing(scene, x, y, cfg.accent, 110 * K);
    // smashing pays flat points but FORFEITS the thread chain — a clean
    // threaded run (never touching) escalates far higher, so precision is
    // the higher-EV line, not mindless plowing. Already-grazed obstacles
    // pay only once (no graze+smash double-count).
    if (!o.grazed) {
      api.score(o.meta.pts);
      floatScore(scene, x, y - 20 * K, `+${o.meta.pts}`, '#ffd24a', 22 * K);
    } else {
      floatScore(scene, x, y - 20 * K, 'SMASH', '#ffd24a', 18 * K);
    }
    grazeStreak = 0;
    shake(scene, 0.012, 140);
    hitstop(scene, 50);
    squash(scene, player, 'y');
    api.haptic(10);
    api.sfx('objDone');
    destroyObstacle(scene, o);
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
    loseLife(scene, 'CRUSHED');
  }

  function loseLife(scene, cause) {
    if (dead) return;
    // IDLE LAW: a hull plate is spent only from an active mistake. If the
    // thumb is off the glass (drifting/distracted/phone-down) the dive is
    // always safe — a fail is never reachable from non-play.
    if (!holding) return;
    const now = scene.time.now;
    if (now < hullInvuln) return; // one plate per impact, never per frame
    hullInvuln = now + 650;
    lives = Math.max(0, lives - 1);
    hullFlash = now + 420;
    const K = unit(scene);
    floatScore(scene, player.x, player.y - 48 * K, lives > 0 ? `HULL ${lives}` : 'HULL BREACH', '#ff8a8a', 16 * K);
    if (lives <= 0) {
      dead = true;
      if (api.die) api.die(cause);
      else console.error('deep: api.die missing — fail-state cannot end the run (stale overlay?)');
    }
  }

  // three hull-plate pips, top-right, with a HULL caption — a spent plate
  // goes dark and hollow, and the just-lost plate flashes red so the pip and
  // the 'HULL N' float visibly connect
  function drawLives(scene, K) {
    const W = scene.scale.width;
    livesGfx.clear();
    const gap = 20 * K, w = 13 * K, h = 8 * K, x0 = W - 16 * K - gap * 2, y = 16 * K;
    const flashing = scene.time.now < hullFlash;
    for (let i = 0; i < 3; i++) {
      const cx = x0 + i * gap, full = i < lives;
      const justLost = flashing && i === lives; // the pip that just went dark
      livesGfx.fillStyle(justLost ? 0xff6a6a : full ? 0x8ab8dc : 0x000000, justLost ? 0.9 : full ? 0.95 : 0.25);
      livesGfx.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 2 * K);
      livesGfx.lineStyle(1.4 * K, justLost ? 0xffcaca : full ? 0xeaf6ff : 0x6a7690, full || justLost ? 0.9 : 0.4);
      livesGfx.strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 2 * K);
      // rivets so a pip reads as a hull plate, not an abstract rectangle
      livesGfx.fillStyle(full ? 0x0a1420 : 0x2a2a2a, 0.5);
      livesGfx.fillCircle(cx - w / 4, y, 1.2 * K);
      livesGfx.fillCircle(cx + w / 4, y, 1.2 * K);
    }
    if (hullTxt) hullTxt.setPosition(x0 - w / 2 - 8 * K, y);
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
    loseLife(scene, 'CRUSHED');
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

      // scrolling parallax walls of the deep — a DIFFERENT place per world
      // (basalt vents, bone cathedral, lantern market, kelp, jelly curtains,
      // wrecked hulls, coral shelves, or the near-black void), not a
      // recolored kelp forest. Keyed per wallKind so worlds don't collide
      // in the texture cache.
      const wk = cfg.wallKind || 'kelp';
      layerFar = scene.add.tileSprite(0, 0, W, H, canvasTex(scene, 'dp-weed-far-' + wk, W, H, (c, cw, ch) => paintWeed(c, cw, ch, wk)))
        .setOrigin(0).setAlpha(cfg.dark ? 0.55 : 0.4).setDepth(-80);
      layerNear = scene.add.tileSprite(0, 0, W, H, canvasTex(scene, 'dp-weed-near-' + wk, W, H, (c, cw, ch) => paintWeed(c, cw, ch, wk)))
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
        } else if (cfg.kelp) {
          // a towering kelp ridge names the Kelp Cathedral
          c.fillStyle = 'rgba(10,34,24,.5)';
          for (const fx of [0.16, 0.38, 0.6, 0.84]) {
            c.beginPath(); c.moveTo(W * fx - W * 0.06, H);
            c.quadraticCurveTo(W * fx + W * 0.05, H * 0.6, W * fx, H * 0.28);
            c.quadraticCurveTo(W * fx - W * 0.05, H * 0.6, W * fx + W * 0.06, H);
            c.closePath(); c.fill();
          }
        } else if (cfg.jellies) {
          // a distant jelly bloom names the Jellyfield
          for (const [fx, fy] of [[0.28, 0.5], [0.68, 0.62], [0.5, 0.34], [0.82, 0.44]]) {
            const g = c.createRadialGradient(W * fx, H * fy, 2, W * fx, H * fy, W * 0.2);
            g.addColorStop(0, 'rgba(150,60,140,.5)'); g.addColorStop(1, 'rgba(150,60,140,0)');
            c.fillStyle = g; c.beginPath(); c.arc(W * fx, H * fy, W * 0.2, Math.PI, 0); c.closePath(); c.fill();
          }
        } else if (cfg.obstacles.includes('coral')) {
          // a jagged coral-shelf skyline names the Coral Gauntlet
          c.fillStyle = 'rgba(10,28,38,.55)';
          c.beginPath(); c.moveTo(0, H);
          for (let i = 0; i <= 12; i++) c.lineTo(W * i / 12, H * (0.72 - (i % 2) * 0.12 - (i % 3) * 0.05));
          c.lineTo(W, H); c.closePath(); c.fill();
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

      livesGfx = scene.add.graphics().setDepth(42);
      hullTxt = scene.add.text(0, 0, 'HULL', {
        fontFamily: 'monospace', fontSize: `${9 * K}px`, color: '#8ab8dc', fontStyle: 'bold',
      }).setOrigin(1, 0.5).setDepth(42).setAlpha(0.85);

      // speed gauge: the smash-vs-dent decision hinges on an otherwise
      // invisible threshold, so mark it. A left-edge bar with a SMASH line
      // (v=0.55·max) and a PIERCE line (0.9·max) tells you when a plate will
      // break vs. dent BEFORE you reach it.
      gaugeGfx = scene.add.graphics().setDepth(42);
      // green halo on the hero the instant it can smash — a second, on-body
      // read of the same 'fast enough' state
      smashGlow = scene.add.image(player.x, player.y, 'fx-dot')
        .setTint(0x8effc0).setBlendMode('ADD').setScale(3 * K).setDepth(19).setAlpha(0);
      // live thread-chain counter — the whole risk/reward loop needs a
      // visible asset to protect; it resets to 0 on any bump/clang/snag/jelly
      streakTxt = scene.add.text(12 * K, H - 12 * K, '', {
        fontFamily: 'monospace', fontSize: `${13 * K}px`, color: '#3adcc8', fontStyle: 'bold',
      }).setOrigin(0, 1).setDepth(42).setAlpha(0);

      // the void carries its own light
      if (cfg.dark) {
        coneLight = darknessCone(scene, { ambient: 0x05060c, x: W / 2, y: H * 0.3, radius: H * 0.5, angle: 0.9 });
        if (coneLight) coneLight.setConeRotation?.(Math.PI / 2);
        else {
          // canvas fallback: a punched-hole darkness sheet centered ON the
          // player. The sheet is 2W×2H so it always covers the screen at any
          // steering offset — no bright strip leaks at the edges — and the
          // near-black void wall palette means what shows through the hole
          // belongs to the void, not a bright kelp forest.
          const holeKey = canvasTex(scene, 'dp-hole', W * 2, H * 2, (c, tw, th) => {
            c.fillStyle = 'rgba(2,3,8,.9)';
            c.fillRect(0, 0, tw, th);
            const g = c.createRadialGradient(tw / 2, th / 2, 10, tw / 2, th / 2, H * 0.34);
            g.addColorStop(0, 'rgba(0,0,0,1)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            c.globalCompositeOperation = 'destination-out';
            c.fillStyle = g;
            c.fillRect(0, 0, tw, th);
          });
          darkMask = scene.add.image(player.x, player.y, holeKey).setOrigin(0.5).setDepth(35);
        }
      }
      if (cfg.vents) {
        for (const fx of [0.22, 0.55, 0.85]) {
          vents.push({ x: W * fx, w: 60 * K, nextAt: scene.time.now + 2000 + Math.random() * 3000, until: 0, col: null });
        }
      }

      scene.input.on('pointerdown', (p) => { holding = true; touched = true; steerX = p.x; });
      scene.input.on('pointermove', (p) => { if (holding) steerX = p.x; });
      // release on ANY end — a touch that lifts off-canvas or is OS-cancelled
      // must not latch you into an endless forced dive
      const release = () => { holding = false; };
      scene.input.on('pointerup', release);
      scene.input.on('pointerupoutside', release);
      scene.input.on('gameout', release);

      // difficulty/spawn anchors seed on the FIRST DIVE (first touch), not
      // the first frame — see update()
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
        for (const vent of vents) vent.nextAt = now + 2000 + Math.random() * 3000;
      }
      // once the dive is over, freeze the sim — no scoring, no penalties,
      // no life-draining collisions running under the death ceremony
      if (dead) return;

      // belt-and-suspenders release: if the OS stole the touch (notification
      // shade, palm contact, touchcancel) without emitting a pointerup, this
      // resync stops 'hold to plummet' from latching on at full throttle
      if (holding && scene.input.activePointer && !scene.input.activePointer.isDown) holding = false;

      // difficulty + spawns anchor to the FIRST DIVE, not the first frame:
      // lingering on the verb card no longer front-loads armored walls, and
      // nothing spawns or accumulates until the thumb actually goes down
      if (touched && !diveT0) {
        diveT0 = now;
        nextOb = now + 700;
        goldenAt = now + goldDelay();
        for (const vent of vents) vent.nextAt = now + 1500 + Math.random() * 2500;
      }
      if (touched) playElapsed += dt; // difficulty clock = time actually diving

      // ——— speed model ———
      stun = Math.max(0, stun - dtMs);
      snag = Math.max(0, snag - dtMs);
      spotted = Math.max(0, spotted - dtMs);
      const capped = snag > 0 ? maxV * 0.12 : spotted > 0 ? maxV * 0.22 : maxV;
      if (!touched) v = 0; // the dive starts with YOUR thumb, never by itself
      else if (stun > 0) v = Math.max(0, v - maxV * 2.2 * dt);
      else if (holding) v = Math.min(capped, v + maxV * 1.4 * dt);
      else v = Math.max(H * 0.12, v - maxV * 0.9 * dt);

      // vent boost columns — eruptions gated on `touched` so an untouched
      // dive never dings or erupts on its own (idle law)
      let inVentNow = false;
      for (const vent of vents) {
        if (vent.until > now) {
          if (touched && Math.abs(player.x - vent.x) < vent.w) {
            inVentNow = true;
            v = Math.min(maxV * 1.3, v + maxV * 3 * dt);
          }
        } else if (touched && now > vent.nextAt) {
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
      // one-shot rocket-kick the instant you catch a vent — the deep-vents
      // centerpiece should feel like a launch, not just faster scrolling
      if (inVentNow && !inVentPrev) {
        burst(scene, player.x, player.y + 16 * K, 0xffc46c, { n: 14, speed: 340 * K, scale: 0.5 * K, gravityY: -220 * K });
        speedLines.emitting = true;
        shake(scene, 0.008, 120);
        api.haptic([8, 20]);
        api.sfx('pr');
      }
      inVentPrev = inVentNow;

      // ——— steering + depth ———
      // steering only engages while the thumb is down — lift to coast
      // straight down from the current column instead of chasing a stale x
      if (holding && steerX != null) player.x += (steerX - player.x) * Math.min(1, dt * 9);
      player.x = Math.max(30 * K, Math.min(W - 30 * K, player.x));
      player.setAngle((holding && steerX != null ? (steerX - player.x) * 0.08 : 0) + Math.sin(now / 300) * 2);

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
      // clamp: at vent-boosted speed vf exceeds 1, which would drive the
      // bubble interval negative (trail dies exactly when it should be wildest)
      bubbles.frequency = Math.max(20, 90 - Math.min(1, vf) * 70);
      // speed lines light at the SMASH threshold, not above it, so the visible
      // cue coincides with the mechanic that decides smash-vs-dent
      speedLines.emitting = v >= smashV;
      if (coneLight) { coneLight.x = player.x; coneLight.y = player.y; }
      // fallback sheet is 2W×2H, origin-centered ON the player, so it always
      // covers the viewport at any steering offset
      if (darkMask) darkMask.setPosition(player.x, player.y);

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
            // the tear-through is a skill flex — give it a tactile beat, not
            // less feedback than a mistake
            shake(scene, 0.006, 90);
            squash(scene, player, 'x');
            api.haptic(10);
            api.sfx('objDone');
          } else if (snag <= 0 && !kp.snagged) {
            kp.snagged = true; // a strand only grabs you once
            snag = 900;
            grazeStreak = 0;
            // the near-stop is the signature deep-kelp hazard — register it
            // with the same impact vocabulary as a bump, or it reads as a bug
            flash(scene, 0x7ad48a, 100, 0.25);
            shake(scene, 0.008, 120);
            squash(scene, player, 'y');
            floatScore(scene, player.x, player.y - 24 * K, 'snagged!', '#7ad48a', 15 * K);
            api.haptic(16);
            api.sfx('log');
            noteStep = 0;
          }
        }
      }

      // ——— the golden plate: touch it at any speed ———
      // gated on `touched` so nothing spawns before the dive; the tier is a
      // variable-ratio jackpot (mostly 150, sometimes 50, rarely 400) and the
      // final payout ALSO scales with your live thread chain, so cashing one
      // mid-streak is worth chasing
      if (touched && now >= goldenAt && !obstacles.some((o) => o.golden)) {
        goldenAt = now + goldDelay();
        const r = Math.random();
        const tier = r < 0.15 ? 400 : r < 0.75 ? 150 : 50;
        const img = scene.add.image(Math.random() * W * 0.7 + W * 0.15, H + 40 * K,
          canvasTex(scene, 'dp-goldplate', 120 * K, 30 * K, PAINT.goldplate)).setDepth(11);
        const halo = scene.add.image(img.x, img.y, 'fx-dot').setTint(0xffd24a).setBlendMode('ADD').setScale(2.2 * K).setAlpha(0.5).setDepth(10);
        scene.tweens.add({ targets: halo, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
        obstacles.push({ img, halo, kind: 'pickup', meta: { pts: tier }, hp: 0, grazed: true, w: 100 * K, h: 40 * K, pickup: true, golden: true, tier });
      }

      // ——— obstacles (the deep gets denser the longer you're down) ———
      // gated on the first dive: an untouched dumbbell hangs still, so
      // obstacles can't pile up off-screen and release as a wall on contact
      if (touched && now >= nextOb) {
        spawnObstacle(scene, K);
        if (cfg.anglers && Math.random() < 0.5) spawnAngler(scene, K);
        // lanterns garnish, they don't dominate — a lighter flood so the
        // market's medal isn't just 'vacuum every free point'
        if (cfg.lanterns && Math.random() < 0.35) spawnLantern(scene, K);
        // density ramp keyed to active diving (playElapsed), not wall clock,
        // so a backgrounded stretch can't teleport the deep to max difficulty
        nextOb = now + (900 + Math.random() * 500)
          / (cfg.density * (fever ? 1.3 : 1) * (1 + Math.min(0.6, playElapsed / 150)));
      }
      for (const o of [...obstacles]) {
        const prevY = o.img.y;            // swept test anchor (see below)
        o.img.y -= v * dt;
        if (o.halo) o.halo.setPosition(o.img.x, o.img.y);
        if (o.mark) o.mark.setPosition(o.img.x, o.img.y);
        if (o.img.y < -o.h) {
          destroyObstacle(scene, o);
          continue;
        }
        const dx = Math.abs(player.x - o.img.x), dy = Math.abs(player.y - o.img.y);
        const hw = o.w / 2 + 26 * K, hh = o.h / 2 + 12 * K;
        // SWEPT vertical test: at vent-boosted speed a thin slab can jump the
        // player band in one hitchy frame, so treat a hit as 'the band was
        // crossed between last frame and this one', not just 'inside now'
        const crossed = player.y <= prevY + hh && player.y >= o.img.y - hh;
        if (dx < hw && crossed) {
          if (o.pickup) {
            const pts = o.golden ? (o.tier + grazeStreak * 10) : o.meta.pts;
            api.score(pts);
            collectTo(scene, o.img.x, o.img.y, W - 30 * K, 20 * K, o.golden ? 0xffd24a : 0xffc46c, o.golden ? 18 : 8);
            floatScore(scene, o.img.x, o.img.y, `+${pts}`, o.golden ? '#ffe9a0' : '#ffc46c', (o.golden ? 22 : 16) * K);
            if (o.golden) {
              glyphBanner(scene, `GOLDEN PLATE +${pts}`, '#ffe9a0', 28 * K);
              flash(scene, 0xffd24a, 120, 0.3);
              api.haptic([8, 16, 24]);
              api.sfx('pr');
            } else api.sfx('tap');
            api.note(noteStep++);
            destroyObstacle(scene, o);
          } else if (o.kind === 'jelly') {
            if (v >= maxV * 0.9) {
              slowmo(scene, 0.35, 320);
              api.score(o.meta.pts);
              floatScore(scene, o.img.x, o.img.y, `PIERCED +${o.meta.pts}`, '#ff8ad0', 18 * K);
              burst(scene, o.img.x, o.img.y, 0xff8ad0, { n: 24, speed: 380 * K, scale: 0.6 * K });
              // the pierce is the skill flex — give it a tactile beat too
              shake(scene, 0.01, 120);
              squash(scene, player, 'y');
              api.haptic(12);
              api.sfx('pr');
              destroyObstacle(scene, o);
            } else {
              // depth thief: bounced UP — one-shot, then the jelly is
              // flung clear so the overlap can't re-trigger every frame. A
              // LAZY bonk (below smash speed, thumb down) also dents the hull
              // so the jellyfield has a real, reachable fail-state — but the
              // idle-safe guard in loseLife keeps a drifting player safe.
              const lazy = v < smashV;
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
              if (lazy) loseLife(scene, 'CRUSHED');
            }
          } else if (o.lure) {
            bump(scene, o, K);
            floatScore(scene, o.img.x, o.img.y, 'a LIE', '#aef0ff', 15 * K);
            destroyObstacle(scene, o);
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
            // market canopies: ONE soft sideways bounce, never a per-frame
            // re-trigger that pins you to the wall (the old 'infinite thunk')
            if (!o.bounced) {
              o.bounced = true;
              v *= 0.55;
              player.x = Math.max(30 * K, Math.min(W - 30 * K, player.x + (player.x < o.img.x ? -1 : 1) * (o.w / 2 + 40 * K)));
              squash(scene, o.img, 'y');
              api.sfx('tap');
            }
          } else {
            bump(scene, o, K);
            // fling it fully clear of the player: with v at zero nothing
            // scrolls, so insufficient separation meant an infinite thunk
            o.img.y = player.y - o.h / 2 - 46 * K;
          }
        } else if (!o.grazed && !o.pickup && dy < hh * 1.6 && dx < hw * 1.7 && v > smashV) {
          // threading the gaps at speed is the real skill economy: each
          // consecutive graze pays more (escalating to +30), armored rock
          // pays a premium, and every tenth thread banks a chain bonus. This
          // is why a clean threaded run beats a smash-everything run.
          o.grazed = true;
          grazeStreak++;
          const gain = Math.min(30, 3 + grazeStreak * 2) + (o.armored ? 4 : 0);
          api.score(gain);
          floatScore(scene, player.x + (o.img.x > player.x ? 22 : -22) * K, player.y,
            `${o.armored ? 'THREAD' : 'GRAZE'} +${gain}`, '#3adcc8', 13 * K);
          api.sfx('tap');
          if (grazeStreak % 10 === 0) {
            api.score(25);
            glyphBanner(scene, `${grazeStreak} THREAD CHAIN`, '#3adcc8', 26 * K);
            api.haptic([6, 16, 6]);
            api.sfx('pr');
          }
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
          // beam catch — the 'you've been seen' beat deserves impact, not
          // just a label, or the near-halt reads as a frozen thumb
          if (spotted <= 0 && player.y > ey && player.y < by && Math.abs(player.x - (bx + (ex - bx) * ((player.y - by) / (ey - by || 1)))) < 55 * K) {
            spotted = 900;
            flash(scene, 0xfff4c8, 120, 0.3);
            shake(scene, 0.01, 140);
            L.gfx.fillStyle(0xfff4c8, 0.32);
            L.gfx.fillTriangle(bx, by, ex - 60 * K, ey, ex + 60 * K, ey);
            floatScore(scene, player.x, player.y - 26 * K, 'SPOTTED', '#fff4c8', 15 * K);
            api.haptic(12);
            api.sfx('log');
          }
        }
      }

      drawLives(scene, K);

      // speed gauge with the SMASH and PIERCE thresholds marked, so the
      // smash-vs-dent decision is readable BEFORE contact
      gaugeGfx.clear();
      {
        const bx = 10 * K, by = H * 0.32, bw = 6 * K, bh = H * 0.36;
        gaugeGfx.fillStyle(0x0a1420, 0.5);
        gaugeGfx.fillRoundedRect(bx, by, bw, bh, 3 * K);
        const f = Math.min(1, v / maxV);
        const col = v >= maxV * 0.9 ? 0xff8ad0 : v >= smashV ? 0x8effc0 : 0x8ab8dc;
        gaugeGfx.fillStyle(col, 0.92);
        gaugeGfx.fillRoundedRect(bx, by + bh * (1 - f), bw, bh * f, 3 * K);
        gaugeGfx.lineStyle(1.6 * K, 0x8effc0, 0.9);
        const smy = by + bh * (1 - 0.55);
        gaugeGfx.lineBetween(bx - 3 * K, smy, bx + bw + 3 * K, smy);
        gaugeGfx.lineStyle(1.6 * K, 0xff8ad0, 0.9);
        const py = by + bh * (1 - 0.9);
        gaugeGfx.lineBetween(bx - 3 * K, py, bx + bw + 3 * K, py);
      }
      // green halo the instant the hero can smash — same threshold as the gauge
      smashGlow.setPosition(player.x, player.y);
      smashGlow.setAlpha(v >= smashV ? 0.35 + 0.12 * Math.sin(now / 70) : 0);
      // live thread-chain counter
      if (grazeStreak > 1) streakTxt.setText(`THREAD ×${grazeStreak}`).setAlpha(1);
      else streakTxt.setAlpha(0);
    },
  };
}

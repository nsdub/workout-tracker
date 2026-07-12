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
    c.fillStyle = '#4a6a2c';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.55, w * 0.36, h * 0.3, 0, 0, 7); c.fill();
    c.fillStyle = '#6a8a3c';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.5, w * 0.28, h * 0.22, 0, 0, 7); c.fill();
    c.strokeStyle = '#3a5220'; c.lineWidth = w * 0.03;
    c.beginPath(); c.moveTo(w * 0.36, h * 0.36); c.lineTo(w * 0.64, h * 0.64); c.moveTo(w * 0.64, h * 0.36); c.lineTo(w * 0.36, h * 0.64); c.stroke();
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
    c.fillStyle = '#e8b088';
    c.beginPath(); c.arc(w * 0.5, h * 0.3, w * 0.2, 0, 7); c.fill();
    c.fillStyle = '#6a4a2a';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.18, w * 0.3, h * 0.07, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.5, h * 0.14, w * 0.16, Math.PI, 0); c.fill();
    c.fillStyle = '#1c1208';
    c.beginPath(); c.arc(w * 0.43, h * 0.28, w * 0.03, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.57, h * 0.28, w * 0.03, 0, 7); c.fill();
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
  const WORLD_SCREENS = 4;
  let stone = null;          // { img, vx, vy, skips, dist, dead }
  let aiming = false;
  let aimAt = null;
  let aimGfx, waterGfx;
  let floats = [];           // { img, kind, x, w, grazed, vx }
  let rings = [];            // firefly bonus rings { img, x, y, hit }
  let beams = [];            // ufo beams { x, gfx }
  let throwsLeft = Infinity; // score chase, not ammo
  let fever = false;
  let mothUsed = false;
  let noteStep = 0;

  const waterY = (scene) => scene.scale.height * (cfg.cliff ? 0.72 : 0.62);
  const throwerY = (scene) => cfg.cliff ? scene.scale.height * 0.3 : waterY(scene) - 40 * unit(scene);
  const anchor = (scene) => ({ x: 60 * unit(scene), y: throwerY(scene) });

  function resetStone(scene, K) {
    const a = anchor(scene);
    stone = {
      img: scene.add.image(a.x, a.y, canvasTex(scene, 'pk-stone', 30 * K, 24 * K, PAINT.stone)).setDepth(20),
      vx: 0, vy: 0, skips: 0, flying: false, dead: false, sunkAt: 0,
    };
    scene.cameras.main.pan(scene.scale.width / 2, scene.scale.height / 2, 500, 'Sine.easeInOut');
    noteStep = 0;
  }

  function endThrow(scene, K, reason) {
    if (!stone || stone.dead) return;
    stone.dead = true;
    const distPts = Math.floor((stone.img.x / (scene.scale.width * WORLD_SCREENS)) * 60);
    api.score(distPts);
    const msg = reason === 'end' ? `SHORE! +${distPts}` : `+${distPts} distance`;
    floatScore(scene, stone.img.x, waterY(scene) - 60 * K, msg, '#ffd24a', 18 * K);
    if (stone.skips >= 6) glyphBanner(scene, `${stone.skips} SKIPS`, '#ffd24a', 30 * K);
    const dead = stone;
    scene.tweens.add({ targets: dead.img, alpha: 0, y: dead.img.y + 30 * K, duration: 600, onComplete: () => dead.img.destroy() });
    scene.time.delayedCall(750, () => resetStone(scene, K));
  }

  function skipAt(scene, K, x) {
    const wy = waterY(scene);
    shockRing(scene, x, wy, 0xdff6ff, (46 + stone.skips * 7) * K);
    burst(scene, x, wy - 4 * K, 0xbfe8f8, { n: 10, speed: 200 * K, scale: 0.4 * K, gravityY: 500 * K });
    api.note(noteStep++);
    stone.skips++;
    const gain = 8 + stone.skips * 4;
    api.score(gain);
    floatScore(scene, x, wy - 40 * K, `skip ×${stone.skips} +${gain}`, '#dff6ff', 15 * K);
    api.haptic(6);
  }

  function plunk(scene, K) {
    const wy = waterY(scene);
    burst(scene, stone.img.x, wy, 0x9cc8ec, { n: 18, speed: 300 * K, scale: 0.55 * K, gravityY: 700 * K });
    floatScore(scene, stone.img.x, wy - 30 * K, 'plunk', '#8a9ac8', 15 * K);
    api.sfx('log');
    endThrow(scene, K, 'plunk');
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
          const th = H * (0.024 + 0.014 * jag[Math.floor(x / (PW / 90)) % jag.length]);
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
      waterGfx.fillStyle(cfg.water, 1).fillRect(0, wy, WW, H - wy);
      waterGfx.fillStyle(0xffffff, 0.08);
      for (let i = 0; i < 40; i++) {
        waterGfx.fillRect(Math.random() * WW, wy + Math.random() * (H - wy) * 0.7, (30 + Math.random() * 60) * K, 2 * K);
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
        floats.push({ img, kind, w: fw, h: fh, grazed: false, vx: kind === 'bison' ? (Math.random() < 0.5 ? -18 : 18) * K : 0 });
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
      resetStone(scene, K);
      glyphBanner(scene, 'PULL BACK. RELEASE.', '#dff6ff', 22 * K);

      // Angry-Birds grammar: touch ANYWHERE, pull back (down-left), release.
      // The vector is relative to your own finger, not to a corner anchor.
      scene.input.on('pointerdown', (p) => {
        if (!stone || stone.flying || stone.dead) return;
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
        if (dx < 15 * K) return; // no pull-back — a fidget, not a throw
        const pow = Math.min(Math.hypot(dx, dy), 180 * K);
        const ang = Math.max(-1.35, Math.min(-0.06, Math.atan2(dy, dx)));
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

      // aim guide: the pull-back band under your finger + trajectory dots
      aimGfx.clear();
      if (aiming && aimAt && stone && !stone.flying) {
        const a = anchor(scene);
        const dx = aimAt.sx - aimAt.x, dy = aimAt.sy - aimAt.y;
        const scroll = cam.scrollX;
        aimGfx.lineStyle(4 * K, 0xffffff, 0.4);
        aimGfx.lineBetween(aimAt.sx + scroll, aimAt.sy, aimAt.x + scroll, aimAt.y);
        if (dx >= 15 * K) {
          const pow = Math.min(Math.hypot(dx, dy), 180 * K);
          const ang = Math.max(-1.35, Math.min(-0.06, Math.atan2(dy, dx)));
          const KV = 6.2;
          let px = a.x, py = a.y, pvx = Math.cos(ang) * pow * KV, pvy = Math.sin(ang) * pow * KV;
          aimGfx.fillStyle(0xffffff, 0.85);
          for (let i = 0; i < 14; i++) {
            px += pvx * 0.05; pvy += 900 * K * 0.05; py += pvy * 0.05;
            if (py > wy) break;
            aimGfx.fillCircle(px, py, (4 - i * 0.18) * K);
          }
        }
      }

      // bison wander
      for (const f of floats) {
        if (f.vx) {
          f.img.x += f.vx * dt;
          if (f.img.x < WW * 0.18 || f.img.x > WW * 0.96) f.vx *= -1;
        }
      }

      if (!stone || !stone.flying || stone.dead) return;

      // ——— ballistics ———
      const wind = cfg.wind ? Math.sin(scene.time.now / 2600) * 120 * K : 0;
      stone.vx += wind * dt;
      stone.vy += 900 * K * dt;
      stone.img.x += stone.vx * dt;
      stone.img.y += stone.vy * dt;
      stone.img.rotation += 9 * dt;

      cam.scrollX += ((stone.img.x - W * 0.4) - cam.scrollX) * Math.min(1, dt * 5);

      // canyon walls: banked ricochets
      if (cfg.walls) {
        for (let i = 1; i <= 3; i++) {
          const x = WW * (0.22 + i * 0.19);
          const top = wy - (60 + i * 30) * K;
          if (stone.img.y < top && Math.abs(stone.img.x - (x + 17 * K)) < 20 * K && stone.vx > 0) {
            stone.vx *= -0.85;
            burst(scene, stone.img.x, stone.img.y, 0xff9a5c, { n: 10, speed: 220 * K, scale: 0.4 * K });
            floatScore(scene, stone.img.x, stone.img.y - 20 * K, 'BANK!', '#ff9a5c', 15 * K);
            shake(scene, 0.006, 90);
            api.sfx('tap');
          }
        }
      }

      // ufo beams: re-loft
      for (const b of beams) {
        if (Math.abs(stone.img.x - b.x) < b.halfW && stone.img.y < wy - 8 * K && stone.vy > 0) {
          stone.vy = -Math.abs(stone.vy) * 0.55 - 240 * K;
          api.score(10);
          floatScore(scene, stone.img.x, stone.img.y, 'ABDUCTED +10', '#7dffb3', 15 * K);
          burst(scene, stone.img.x, stone.img.y, 0x7dffb3, { n: 12, speed: 240 * K, scale: 0.5 * K });
          api.sfx('objDone');
        }
      }

      // firefly rings
      for (const r of rings) {
        if (!r.hit && Math.abs(stone.img.x - r.img.x) < r.r && Math.abs(stone.img.y - r.img.y) < r.r) {
          r.hit = true;
          r.img.setTint(0xfff0c8);
          api.score(15);
          api.note(noteStep++);
          collectTo(scene, r.img.x, r.img.y, cam.scrollX + W - 30 * K, 20 * K, 0xffd24a, 8);
          floatScore(scene, r.img.x, r.img.y - 20 * K, 'RING +15', '#ffd24a', 16 * K);
        }
      }

      // floats: graze or honk
      for (const f of floats) {
        const dx = Math.abs(stone.img.x - f.img.x), dy = Math.abs(stone.img.y - f.img.y);
        if (dx < f.w * 0.5 && dy < f.h * 0.55) {
          if (cfg.bouncepads && f.kind === 'bison') {
            stone.vy = -Math.abs(stone.vy) * 1.05 - 140 * K;
            stone.vx *= 1.06;
            squash(scene, f.img, 'y');
            api.score(12);
            floatScore(scene, f.img.x, f.img.y - f.h, 'OFF THE BISON +12', '#e8d5ae', 15 * K);
            shake(scene, 0.008, 110);
            api.sfx('objDone');
            api.haptic(10);
          } else {
            squash(scene, f.img, 'x');
            floatScore(scene, f.img.x, f.img.y - f.h, f.kind === 'duck' ? 'HONK!' : f.kind === 'turtle' ? 'hmph.' : 'CLONK', '#ff5d7a', 16 * K);
            shake(scene, 0.01, 130);
            api.sfx('log');
            api.haptic([14, 30, 14]);
            plunk(scene, K);
            return;
          }
        } else if (!f.grazed && dx < f.w * 1.1 && dy < f.h * 1.6) {
          f.grazed = true;
          api.score(5);
          floatScore(scene, f.img.x, f.img.y - f.h * 1.4, 'GRAZE +5', '#3adcc8', 13 * K);
          api.sfx('tap');
        }
      }

      // ——— the water: skim or sink ———
      if (stone.img.y >= wy && stone.vy > 0) {
        const speed = Math.hypot(stone.vx, stone.vy);
        const angle = Math.atan2(stone.vy, Math.abs(stone.vx)); // radians below horizontal
        const shallow = angle < 0.42; // ~24°
        const fast = speed > 300 * K;
        // bog law: open water is dead water
        const onPad = cfg.bog && floats.some((f) => f.kind === 'turtle' && Math.abs(stone.img.x - f.img.x) < f.w * 0.9);
        if (cfg.bog && !onPad) {
          stone.vx *= 0.55;
          if (stone.vx < 120 * K || !shallow) { plunk(scene, K); return; }
        }
        if (shallow && fast) {
          stone.img.y = wy - 1;
          stone.vy = -Math.abs(stone.vy) * (0.62 - angle * 0.35);
          stone.vx *= cfg.bog ? 0.82 : 0.94;
          skipAt(scene, K, stone.img.x);
          if (onPad) {
            api.score(10);
            floatScore(scene, stone.img.x, wy - 56 * K, 'SHELL PAD +10', '#7ad48a', 14 * K);
          }
        } else {
          plunk(scene, K);
          return;
        }
      }

      // mothman tail-bat: the lake plays for your team
      if (cfg.cryptid && !mothUsed && stone.img.x > WW * 0.72 && stone.skips >= 3) {
        mothUsed = true;
        const moth = scene.add.image(stone.img.x + 60 * K, stone.img.y - 120 * K,
          canvasTex(scene, 'pk-moth', 90 * K, 70 * K, PAINT.moth)).setDepth(25).setScale(0.2);
        scene.tweens.add({ targets: moth, scale: 1, y: stone.img.y - 10 * K, duration: 260, ease: 'Back.easeOut' });
        scene.time.delayedCall(280, () => {
          stone.vx = Math.abs(stone.vx) * 1.7 + 300 * K;
          stone.vy = -420 * K;
          slowmo(scene, 0.3, 500);
          flash(scene, 0xffd24a, 140, 0.4);
          shake(scene, 0.014, 220);
          glyphBanner(scene, 'MOTHMAN ASSIST', '#ffd24a', 28 * K);
          api.score(40);
          api.sfx('pr');
          api.haptic([16, 40, 16, 40, 16]);
          scene.tweens.add({ targets: moth, alpha: 0, y: moth.y - 200 * K, duration: 900, onComplete: () => moth.destroy() });
        });
      }

      // off the far end: a legend
      if (stone.img.x > WW - 20 * K) {
        api.score(50);
        glyphBanner(scene, 'ACROSS THE LAKE +50', '#ffd24a', 26 * K);
        api.sfx('pr');
        endThrow(scene, K, 'end');
      }
      if (stone.img.y > H + 60 * K) endThrow(scene, K, 'sink');
    },
  };
}

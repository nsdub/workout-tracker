// YETI BOWL — Yeti Mountain. At the summit, HOLD to pack the snowball:
// it grows while the slope-light burns down (greed against time).
// Release and you're rolling — drag steers, and Katamari law governs:
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
} from '../fx.js';

export const TITLE = 'Yeti Bowl';

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
    c.fillStyle = '#1d5038';
    for (let i = 0; i < 3; i++) {
      const y = h * (0.75 - i * 0.24), s = 1 - i * 0.24;
      c.beginPath(); c.moveTo(w * 0.5, y - h * 0.26); c.lineTo(w * (0.5 + 0.42 * s), y); c.lineTo(w * (0.5 - 0.42 * s), y); c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(244,250,253,.85)';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.28, w * 0.16, h * 0.05, -0.3, 0, 7); c.fill();
    c.beginPath(); c.ellipse(w * 0.36, h * 0.52, w * 0.14, h * 0.05, 0.2, 0, 7); c.fill();
  },
  rock(c, w, h) {
    c.fillStyle = '#4a5668';
    c.beginPath();
    c.moveTo(w * 0.12, h * 0.85); c.lineTo(w * 0.28, h * 0.3); c.lineTo(w * 0.6, h * 0.12);
    c.lineTo(w * 0.9, h * 0.5); c.lineTo(w * 0.82, h * 0.85);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(244,250,253,.9)';
    c.beginPath(); c.ellipse(w * 0.55, h * 0.22, w * 0.22, h * 0.08, 0.2, 0, 7); c.fill();
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
};

// obstacle metadata: sizeClass is what the Katamari law compares against
const OBS = {
  fence:   { w: 84, h: 40, sizeClass: 0.55, pts: 10 },
  pine:    { w: 60, h: 90, sizeClass: 0.85, pts: 14 },
  rock:    { w: 74, h: 60, sizeClass: 1.15, pts: 18 },
  pillar:  { w: 44, h: 110, sizeClass: 0.9, pts: 14 },
  groomer: { w: 120, h: 70, sizeClass: 1.6, pts: 30 },
  chair:   { w: 60, h: 60, sizeClass: 0.8, pts: 16 },
};

export function create(P, ctx) {
  const { api, cfg } = ctx;
  let phase = 'pack';        // pack -> roll
  let ball, penguin, shadow, slopeLight, packGfx, spray, darkVeil, auroraGfx;
  let size = 0.42;           // 0.3 .. 2.0 — mass, reach and menace
  let holdT = 0;
  let packDeadline = 3400;   // ms of slope-light at the summit
  let speed = 0;
  let steer = null;
  let stun = 0;
  let airT = 0;              // mogul airtime left
  let dist = 0;
  let bandDist = 0;
  let bandCount = 0;
  let strobeT = 0;
  let auroraPulse = 0;       // >0: floating, double points
  let nextAurora = 6000;
  let fever = false;
  let noteStep = 0;
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

  function spawnBand(scene, K) {
    const W = scene.scale.width, H = scene.scale.height;
    bandCount++;
    const yBase = H + 60 * K;
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
    } else {
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const kind = cfg.obstacles[Math.floor(Math.random() * cfg.obstacles.length)];
        addThing(scene, K, kind, W * (0.08 + Math.random() * 0.84), yBase + Math.random() * H * 0.7);
      }
      if (cfg.melt) {
        addThing(scene, K, 'pool', W * (0.15 + Math.random() * 0.7), yBase + Math.random() * H * 0.5, { w: 110, h: 70, pool: true });
        addThing(scene, K, 'drift', W * (0.15 + Math.random() * 0.7), yBase + Math.random() * H * 0.5, { w: 70, h: 44, drift: true });
      } else if (Math.random() < 0.4) {
        addThing(scene, K, 'drift', W * (0.15 + Math.random() * 0.7), yBase + Math.random() * H * 0.5, { w: 64, h: 40, drift: true });
      }
      if (cfg.moguls) {
        for (let i = 0; i < 3; i++) {
          addThing(scene, K, 'drift', W * (0.12 + Math.random() * 0.76), yBase + Math.random() * H * 0.6, { w: 56, h: 30, mogul: true });
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
  }

  function smashThing(scene, K, th, pts, growBy) {
    th.dead = true;
    burst(scene, th.img.x, th.img.y, cfg.accent, { n: 16, speed: 340 * K, scale: 0.55 * K });
    api.score(pts);
    api.note(noteStep++);
    floatScore(scene, th.img.x, th.img.y - 20 * K, `+${pts}`, '#ffd24a', 15 * K);
    shake(scene, 0.007 + size * 0.004, 110);
    hitstop(scene, 35);
    api.haptic(8);
    api.sfx('tap');
    if (growBy) size = Math.min(2, size + growBy);
    // wreckage permanence: it lies where you crushed it
    th.img.setAlpha(0.5).setAngle((Math.random() - 0.5) * 60).setDepth(7);
    th.crushed = true;
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

      // the slope: a subtle sparkle field that scrolls to sell motion
      const slope = scene.add.graphics().setDepth(-70);
      slope.fillStyle(0xffffff, 0.05);
      slope.fillRect(0, 0, W, H);
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
        darkVeil = scene.add.rectangle(0, 0, W, H, 0x060310, 0.72).setOrigin(0).setDepth(25);
      }
      if (cfg.aurora) auroraGfx = scene.add.graphics().setDepth(-40);

      packGfx = scene.add.graphics().setDepth(30);
      glyphBanner(scene, 'HOLD TO PACK', '#dff6ff', 24 * K);

      scene.input.on('pointerdown', (p) => { steer = p.x; });
      scene.input.on('pointermove', (p) => { steer = p.x; });
      scene.input.on('pointerup', () => {
        steer = null;
        if (phase === 'pack' && holdT > 120) startRoll(scene, K);
      });

      function startRoll(sc, K2) {
        phase = 'roll';
        speed = sc.scale.height * (0.5 + size * 0.22);
        flash(sc, 0xffffff, 90, 0.25);
        zoomPunch(sc, 1.06, 220);
        api.sfx('objDone');
        api.haptic(12);
        glyphBanner(sc, 'ROLL', '#ffffff', 34 * K2);
        penguin.setVisible(true);
        spawnBand(sc, K2);
        spawnBand(sc, K2);
      }
      this._startRoll = startRoll;
    },

    update(t, dtMs) {
      const scene = this;
      const dt = Math.min(dtMs, 64) / 1000;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      const now = scene.time.now;

      // ——— PACK phase: greed against the burning slope-light ———
      if (phase === 'pack') {
        packGfx.clear();
        if (steer != null) {
          holdT += dtMs;
          size = Math.min(1.7, 0.42 + holdT / 2600);
        }
        packDeadline -= dtMs;
        ball.setScale(size);
        shadow.setScale(size * 1.1, size * 0.4);
        shadow.y = ball.y + BALL_R(scene) * 0.9;
        // slope light: a burning fuse across the summit
        const f = Math.max(0, packDeadline / 3400);
        packGfx.fillStyle(0xffd24a, 0.8).fillRect(W * 0.1, 40 * K, W * 0.8 * f, 4 * K);
        packGfx.fillStyle(0xffffff, 0.5 + 0.3 * Math.sin(now / 90));
        packGfx.fillCircle(W * 0.1 + W * 0.8 * f, 42 * K, 6 * K);
        if (packDeadline <= 0) this._startRoll(scene, K);
        return;
      }

      // ——— ROLL phase ———
      packGfx.clear();
      stun = Math.max(0, stun - dtMs);
      airT = Math.max(0, airT - dtMs);
      const iceLerp = cfg.ice ? 1.6 : 7;
      if (steer != null && stun <= 0) {
        ball.x += (steer - ball.x) * Math.min(1, dt * (airT > 0 ? 9 : iceLerp));
      }
      ball.x = Math.max(BALL_R(scene), Math.min(W - BALL_R(scene), ball.x));

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
          scene.tweens.add({ targets: darkVeil, alpha: 0.72, duration: 460, delay: 150 });
        }
      }

      // speed follows mass; stun kills it briefly
      const target = H * (0.5 + size * 0.22) * (fever ? 1.15 : 1) * floaty;
      speed += ((stun > 0 ? H * 0.1 : target) - speed) * Math.min(1, dt * 3);
      dist += speed * dt;
      bandDist += speed * dt;
      if (bandDist > H * 0.9) { bandDist = 0; spawnBand(scene, K); }

      // ball visuals
      ball.setScale(size * (airT > 0 ? 1.12 : 1));
      ball.rotation += speed * dt / (BALL_R(scene) || 1);
      shadow.setScale(size * (airT > 0 ? 0.7 : 1.1), size * 0.4);
      shadow.setPosition(ball.x, ball.y + BALL_R(scene) * (airT > 0 ? 1.5 : 0.9));
      penguin.setPosition(ball.x + Math.sin(now / 260) * 4 * K, ball.y - BALL_R(scene) - 12 * K);
      penguin.setAngle(Math.sin(now / 260) * 8);
      spray.emitParticleAt(ball.x - BALL_R(scene) * 0.6, ball.y + BALL_R(scene) * 0.7, Math.ceil(speed / (H * 0.3)));
      spray.emitParticleAt(ball.x + BALL_R(scene) * 0.6, ball.y + BALL_R(scene) * 0.7, Math.ceil(speed / (H * 0.3)));

      // melt: the springs taketh
      if (cfg.melt) size = Math.max(0.36, size - dt * 0.02);

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
        if (th.img.y < -120 * K) {
          th.img.destroy();
          things.splice(things.indexOf(th), 1);
          continue;
        }
        if (th.pin) {
          villageId = th.village;
          villagePins++;
          if (th.dead) villageDowned++;
        }
        if (th.dead || th.crushed) continue;

        const dx = ball.x - th.img.x, dy = ball.y - th.img.y;
        const rx = th.w / 2 + BALL_R(scene) * 0.8, ry = th.h / 2 + BALL_R(scene) * 0.8;
        if (Math.abs(dx) < rx && Math.abs(dy) < ry) {
          if (th.pool) {
            size = Math.max(0.36, size - dt * 0.5);
            if (Math.random() < dt * 8) burst(scene, ball.x, ball.y + BALL_R(scene), 0x7ad4c8, { n: 3, speed: 120 * K, scale: 0.3 * K });
            continue;
          }
          if (th.drift && !th.mogul) {
            th.dead = true;
            size = Math.min(2, size + 0.1);
            burst(scene, th.img.x, th.img.y, 0xffffff, { n: 12, speed: 240 * K, scale: 0.5 * K });
            floatScore(scene, th.img.x, th.img.y - 16 * K, 'packed +6', '#dff6ff', 13 * K);
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
              floatScore(scene, ball.x, ball.y - BALL_R(scene) - 14 * K, 'AIR +8', '#7ad0ff', 15 * K);
              api.sfx('tap');
              api.haptic(8);
            }
            continue;
          }
          if (airT > 0) continue; // sailing over it
          if (th.pin) {
            smashThing(scene, K, th, 12 * auroraMult, 0.02);
            continue;
          }
          if (size >= th.meta.sizeClass) {
            smashThing(scene, K, th, Math.round(th.meta.pts * (1 + size * 0.4)) * auroraMult, 0.04);
          } else {
            // bigger than you: the mountain wins this one
            stun = 650;
            size = Math.max(0.36, size - 0.12);
            burst(scene, ball.x, ball.y, 0xffffff, { n: 20, speed: 320 * K, scale: 0.5 * K });
            flash(scene, 0xaec8e0, 110, 0.3);
            shake(scene, 0.016, 200);
            hitstop(scene, 80, () => {});
            squash(scene, ball, 'x');
            floatScore(scene, ball.x, ball.y - BALL_R(scene) - 12 * K, 'OOF', '#ff8a9a', 17 * K);
            api.haptic([16, 40, 16]);
            api.sfx('log');
            noteStep = 0;
            th.crushed = true; // it survives; you bounced off it
            th.img.setAlpha(0.9);
          }
        }
      }

      // village strike ceremony
      if (villageId && villagePins === 7 && villageDowned === 7) {
        for (const th of things) if (th.village === villageId) th.village = 0;
        api.score(50 * auroraMult);
        glyphBanner(scene, 'VILLAGE STRIKE +50', '#ffd24a', 30 * K);
        slowmo(scene, 0.35, 450);
        zoomPunch(scene, 1.09, 300);
        flash(scene, 0xffe9b3, 120, 0.35);
        api.sfx('pr');
        api.haptic([16, 40, 16, 40, 16]);
      }

      // milestone dings
      if (dist > (this._nextMile ?? H * 4)) {
        this._nextMile = (this._nextMile ?? H * 4) + H * 4;
        api.score(10 * auroraMult);
        api.note(noteStep++);
        floatScore(scene, ball.x, ball.y - BALL_R(scene) - 20 * K, 'checkpoint +10', '#9cc8ec', 13 * K);
      }
    },
  };
}

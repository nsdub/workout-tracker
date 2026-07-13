// DIM SUM DROP — The Night-Market Wok. Peggle reborn as cosmic street
// food: drag to aim, release, and the dumpling falls through a field of
// glowing lantern pegs into woks sliding along the bottom. Every peg hit
// chimes one pentatonic step higher and lights the lantern's face; when
// the drop resolves, everything you lit pops in a stagger ceremony, and
// a wok catch multiplies the lot. One decision, eight seconds of fortune
// — the lowest motor demand in the arcade, by design.
//
// Real Matter physics under every bounce. Worlds rewrite the field:
// firecracker pegs chain-detonate, steam vents shove the drop mid-air,
// the boba pearls are criminally bouncy, and a noodle dragon coils
// through the pegs relighting what you already spent.
import {
  ensureFx, canvasTex, burst, shockRing, floatScore, banner, glyphBanner,
  shake, flash, slowmo, zoomPunch, collectTo, paintSky, ambientMotes,
  bloomCamera, vignette, squash, unit,
  celestial, driftClouds,
} from '../fx.js';

export const TITLE = 'Dim Sum Drop';
// Measured post-tune: random drops ≈10.6/s; cluster-hunting drops with
// wok catches and SPOTLESS clears reach well past 17/s.
export const VERB = 'DROP!';
export const STARS = [5, 11, 17];

export const HELP = {
  goal: 'Light as many lantern pegs as you can with every dumpling you drop.',
  how: 'Drag to pick your spot and release to drop the dumpling through the peg field. Each lit peg pays more than the last, and a dumpling caught by a sliding wok multiplies everything you lit that drop, with the small wok paying triple. Clearing every last peg earns a bonus.',
  avoid: 'A dumpling that lands in no wok is a plate on the floor and a customer losing patience. You have three customers, and the third walkout closes the kitchen.',
};

export const WORLDS = {
  'wok-alley': {
    name: 'Steam Alley', sky: [[0, '#1c1030'], [0.55, '#3c1c4e'], [1, '#8c3a5c']],
    accent: 0xffc46c, pegs: 30, woks: 2, gravity: 1,
  },
  'wok-inferno': {
    name: 'Firecracker Row', sky: [[0, '#240c14'], [0.55, '#5c1c20'], [1, '#c2452e']],
    accent: 0xff7a3c, pegs: 28, woks: 2, gravity: 1, crackers: 5,
  },
  'wok-steam': {
    name: 'Vent Kitchen', sky: [[0, '#122430'], [0.55, '#2c4a56'], [1, '#7a9c8c']],
    accent: 0xbfe8dc, pegs: 28, woks: 2, gravity: 1, vents: true,
  },
  'wok-asteroids': {
    name: 'Asteroid Wok Belt', sky: [[0, '#0c0c20'], [0.55, '#241c44'], [1, '#4c3a6c']],
    accent: 0xc8b8ff, pegs: 26, woks: 2, gravity: 0.45, drift: true,
  },
  'wok-nebula': {
    name: 'Noodle Nebula', sky: [[0, '#180c2c'], [0.55, '#3c1c5c'], [1, '#7a3a8c']],
    accent: 0xff8ad0, pegs: 28, woks: 2, gravity: 0.8, field: true,
  },
  'wok-dragon': {
    name: "Dragon's Coil", sky: [[0, '#0c1c2c'], [0.55, '#1c3c54'], [1, '#3a7a8c']],
    accent: 0x7ad0ff, pegs: 24, woks: 2, gravity: 1, dragon: true,
  },
  'wok-shrine': {
    name: 'Golden Shrine', sky: [[0, '#2c1408'], [0.55, '#5c3410'], [1, '#a8742c']],
    accent: 0xffd24a, pegs: 26, woks: 2, gravity: 1, golden: 6, bells: true,
  },
  'wok-boba': {
    name: 'Boba Bounce', sky: [[0, '#1c0c1c'], [0.55, '#44204a'], [1, '#8c4a7c']],
    accent: 0xd8a0ff, pegs: 22, woks: 3, gravity: 1, bouncy: true,
  },
};

const PAINT = {
  dumpling(c, w, h) {
    const g = c.createRadialGradient(w * 0.42, h * 0.4, 1, w / 2, h / 2, w * 0.52);
    g.addColorStop(0, '#fff4dc'); g.addColorStop(1, '#e0c49a');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h * 0.55, w * 0.4, 0, 7); c.fill();
    // pleats
    c.strokeStyle = 'rgba(160,120,70,.6)'; c.lineWidth = w * 0.03; c.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(w * (0.5 + i * 0.09), h * 0.18);
      c.quadraticCurveTo(w * (0.5 + i * 0.13), h * 0.32, w * (0.5 + i * 0.16), h * 0.42);
      c.stroke();
    }
    c.fillStyle = '#3a2410';
    c.beginPath(); c.arc(w * 0.4, h * 0.58, w * 0.04, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.6, h * 0.58, w * 0.04, 0, 7); c.fill();
    c.strokeStyle = '#3a2410'; c.lineWidth = w * 0.03;
    c.beginPath(); c.arc(w * 0.5, h * 0.62, w * 0.09, 0.4, 2.7); c.stroke();
  },
  peg(c, w, h) {
    const g = c.createRadialGradient(w / 2, h * 0.46, 1, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#c2452e'); g.addColorStop(1, '#7c2020');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.44, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,220,150,.4)'; c.lineWidth = w * 0.05;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, 7); c.stroke();
    c.fillStyle = 'rgba(20,8,4,.7)';
    c.beginPath(); c.arc(w * 0.4, h * 0.44, w * 0.05, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.6, h * 0.44, w * 0.05, 0, 7); c.fill();
    c.strokeStyle = 'rgba(20,8,4,.7)'; c.lineWidth = w * 0.035; c.lineCap = 'round';
    c.beginPath(); c.arc(w * 0.5, h * 0.52, w * 0.09, 0.4, 2.7); c.stroke();
  },
  pegLit(c, w, h) {
    const halo = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.5);
    halo.addColorStop(0, 'rgba(255,244,200,.9)'); halo.addColorStop(0.55, 'rgba(255,196,108,.5)'); halo.addColorStop(1, 'rgba(255,196,108,0)');
    c.fillStyle = halo;
    c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h * 0.46, 1, w / 2, h / 2, w * 0.34);
    g.addColorStop(0, '#ffe9b3'); g.addColorStop(1, '#ff9a3c');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.32, 0, 7); c.fill();
    c.fillStyle = '#5c2408';
    c.beginPath(); c.arc(w * 0.43, h * 0.46, w * 0.035, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.57, h * 0.46, w * 0.035, 0, 7); c.fill();
    c.strokeStyle = '#5c2408'; c.lineWidth = w * 0.025;
    c.beginPath(); c.arc(w * 0.5, h * 0.5, w * 0.07, 0.4, 2.7); c.stroke();
  },
  cracker(c, w, h) {
    c.fillStyle = '#e8302c';
    c.beginPath(); c.roundRect(w * 0.24, h * 0.1, w * 0.52, h * 0.8, w * 0.12); c.fill();
    c.fillStyle = '#ffd24a';
    c.fillRect(w * 0.24, h * 0.3, w * 0.52, h * 0.08);
    c.fillRect(w * 0.24, h * 0.62, w * 0.52, h * 0.08);
    c.strokeStyle = '#ffd24a'; c.lineWidth = w * 0.05; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.5, h * 0.1); c.quadraticCurveTo(w * 0.6, h * 0.02, w * 0.68, h * 0.06); c.stroke();
    c.fillStyle = '#2c0808';
    c.beginPath(); c.arc(w * 0.42, h * 0.44, w * 0.04, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.58, h * 0.44, w * 0.04, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.5, h * 0.52, w * 0.05, 0, Math.PI); c.fill();
  },
  goldpeg(c, w, h) {
    const g = c.createRadialGradient(w / 2, h * 0.46, 1, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#ffe9b3'); g.addColorStop(1, '#c8892c');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.44, 0, 7); c.fill();
    c.strokeStyle = 'rgba(120,70,10,.5)'; c.lineWidth = w * 0.05;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, 7); c.stroke();
    c.fillStyle = '#5c3408';
    c.font = `700 ${Math.round(h * 0.34)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('福', w / 2, h * 0.62);
  },
  wokpan(c, w, h) {
    // the catch target must be the warmest thing on screen (Peggle's bucket law)
    const glow = c.createRadialGradient(w * 0.5, h * 0.3, 1, w * 0.5, h * 0.3, w * 0.5);
    glow.addColorStop(0, 'rgba(255,196,108,.55)'); glow.addColorStop(1, 'rgba(255,196,108,0)');
    c.fillStyle = glow;
    c.beginPath(); c.ellipse(w * 0.5, h * 0.3, w * 0.48, h * 0.42, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3c424e'); g.addColorStop(1, '#1c2028');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h * 0.1);
    c.quadraticCurveTo(w * 0.5, h * 1.15, w, h * 0.1);
    c.lineTo(w * 0.88, h * 0.08);
    c.quadraticCurveTo(w * 0.5, h * 0.85, w * 0.12, h * 0.08);
    c.closePath(); c.fill();
    c.strokeStyle = '#ffc46c'; c.lineWidth = h * 0.08; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, h * 0.1); c.quadraticCurveTo(w * 0.5, h * 1.15, w, h * 0.1); c.stroke();
    // steam wisps rising off the hot lip
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = h * 0.04;
    c.beginPath(); c.moveTo(w * 0.34, h * 0.06); c.quadraticCurveTo(w * 0.3, -h * 0.1, w * 0.36, -h * 0.22); c.stroke();
    c.beginPath(); c.moveTo(w * 0.66, h * 0.06); c.quadraticCurveTo(w * 0.7, -h * 0.08, w * 0.64, -h * 0.2); c.stroke();
  },
  bell(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e8c46c'); g.addColorStop(1, '#a8742c');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(w * 0.5, h * 0.04);
    c.quadraticCurveTo(w * 0.94, h * 0.3, w * 0.9, h * 0.86);
    c.lineTo(w * 0.1, h * 0.86);
    c.quadraticCurveTo(w * 0.06, h * 0.3, w * 0.5, h * 0.04);
    c.fill();
    c.fillStyle = '#6a4210';
    c.fillRect(w * 0.08, h * 0.84, w * 0.84, h * 0.1);
    c.beginPath(); c.arc(w * 0.5, h * 0.97, w * 0.07, 0, 7); c.fill();
  },
  dragonhead(c, w, h) {
    const g = c.createRadialGradient(w * 0.4, h * 0.4, 1, w / 2, h / 2, w * 0.55);
    g.addColorStop(0, '#7ad0ff'); g.addColorStop(1, '#2c6a9c');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.4, 0, 7); c.fill();
    c.fillStyle = '#ffd24a';
    c.beginPath(); c.moveTo(w * 0.3, h * 0.16); c.lineTo(w * 0.4, h * 0.34); c.lineTo(w * 0.22, h * 0.34); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(w * 0.7, h * 0.16); c.lineTo(w * 0.78, h * 0.34); c.lineTo(w * 0.6, h * 0.34); c.closePath(); c.fill();
    c.fillStyle = '#0c2438';
    c.beginPath(); c.arc(w * 0.4, h * 0.48, w * 0.06, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.6, h * 0.48, w * 0.06, 0, 7); c.fill();
    c.strokeStyle = '#0c2438'; c.lineWidth = w * 0.04;
    c.beginPath(); c.arc(w * 0.5, h * 0.56, w * 0.12, 0.4, 2.7); c.stroke();
  },
  basket(c, w, h) {
    c.fillStyle = '#c8a86a';
    c.beginPath(); c.ellipse(w / 2, h * 0.6, w * 0.44, h * 0.3, 0, 0, 7); c.fill();
    c.fillStyle = '#a8854a';
    c.beginPath(); c.ellipse(w / 2, h * 0.48, w * 0.44, h * 0.22, 0, 0, 7); c.fill();
    c.fillStyle = '#e0c49a';
    c.beginPath(); c.ellipse(w / 2, h * 0.46, w * 0.36, h * 0.16, 0, 0, 7); c.fill();
    c.strokeStyle = '#6a4a2a'; c.lineWidth = w * 0.02;
    for (let i = 0; i < 5; i++) {
      c.beginPath(); c.moveTo(w * (0.14 + i * 0.18), h * 0.52); c.lineTo(w * (0.16 + i * 0.18), h * 0.82); c.stroke();
    }
  },
};

export function create(P, ctx) {
  const { api, cfg } = ctx;
  let pegs = [];             // { img, body, kind, lit, spent, x0 }
  let woks = [];             // { img, body?, dir, speed, mult }
  let ball = null;           // { img, resolveAt }
  let launcher, aimGfx;
  let aiming = false;
  let aimX = null;
  let litThisDrop = [];
  let noteStep = 0;
  let dropCount = 0;
  let fieldRefills = 0;
  let dragon = null;         // { segs: [imgs], t }
  let fever = false;
  let goldenPending = false; // the NEXT drop is golden
  let goldenDrop = false;    // the CURRENT drop is golden (pegs pay double)
  let goldenAt = 0;
  let t0 = 0;
  let lastBellAt = 0;
  // customer patience: three of them. A drop that lands in no wok is a
  // wasted plate and one lost customer; the third walkout ends the shift.
  // A wok catch never costs patience.
  let dead = false;
  let lives = 3;
  let livesGfx;
  const goldDelay = () => (window.__P3_GOLD_QA ? 2500 : 12000 + Math.random() * 18000);

  const PR = 13;             // peg radius in K units

  function buildField(scene, K) {
    const W = scene.scale.width, H = scene.scale.height;
    // the dragon survives every refill — it IS the world
    for (const p of pegs) {
      if (p.dragonHead) continue;
      p.img.destroy();
      if (p.body) scene.matter.world.remove(p.body);
    }
    pegs = pegs.filter((p) => p.dragonHead);
    const cols = 6, rows = Math.ceil(cfg.pegs / cols);
    const x0 = W * 0.12, x1 = W * 0.88;
    const y0 = H * 0.2, y1 = H * 0.66;
    let placed = 0;
    const goldensAt = new Set();
    while (cfg.golden && goldensAt.size < cfg.golden) goldensAt.add(Math.floor(Math.random() * cfg.pegs));
    const crackersAt = new Set();
    while (cfg.crackers && crackersAt.size < cfg.crackers) crackersAt.add(Math.floor(Math.random() * cfg.pegs));
    for (let r = 0; r < rows && placed < cfg.pegs; r++) {
      for (let ci = 0; ci < cols && placed < cfg.pegs; ci++) {
        const x = x0 + (ci + (r % 2 ? 0.5 : 0)) / (cols - 0.5) * (x1 - x0) + (Math.random() - 0.5) * 14 * K;
        const y = y0 + r / (rows - 1 || 1) * (y1 - y0) + (Math.random() - 0.5) * 10 * K;
        const kind = crackersAt.has(placed) ? 'cracker' : goldensAt.has(placed) ? 'gold' : 'peg';
        const tex = kind === 'cracker' ? canvasTex(scene, 'wk-cracker', 26 * K, 34 * K, PAINT.cracker)
          : kind === 'gold' ? canvasTex(scene, 'wk-gold', PR * 2.6 * K, PR * 2.6 * K, PAINT.goldpeg)
            : canvasTex(scene, 'wk-peg', PR * 2.6 * K, PR * 2.6 * K, PAINT.peg);
        const img = scene.add.image(x, y, tex).setDepth(10);
        const body = scene.matter.add.circle(x, y, PR * K, { isStatic: true, restitution: cfg.bouncy ? 1.05 : 0.55, label: 'peg' });
        const peg = { img, body, kind, lit: false, x0: x, y0: y };
        body.pegRef = peg;
        if (kind === 'cracker') {
          scene.tweens.add({ targets: img, alpha: 0.65, duration: 420, yoyo: true, repeat: -1 });
        }
        if (cfg.drift) {
          scene.tweens.add({
            targets: img, x: x + (Math.random() < 0.5 ? -1 : 1) * 20 * K,
            duration: 2200 + Math.random() * 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            onUpdate: () => { try { scene.matter.body.setPosition(body, { x: img.x, y: img.y }); } catch { /* removed */ } },
          });
        }
        pegs.push(peg);
        placed++;
      }
    }
    if (fieldRefills > 0) glyphBanner(scene, 'FRESH STEAMER', '#ffc46c', 26 * K);
    fieldRefills++;
  }

  function lightPeg(scene, K, peg, viaCracker = false) {
    if (peg.lit || !peg.img.active) return;
    peg.lit = true;
    litThisDrop.push(peg);
    const litKey = canvasTex(scene, 'wk-peglit', PR * 3.4 * K, PR * 3.4 * K, PAINT.pegLit);
    if (peg.kind !== 'cracker') peg.img.setTexture(litKey);
    squash(scene, peg.img, 'y', 140);
    const n = litThisDrop.length;
    const gain = (10 + n * 2) * (peg.kind === 'gold' ? 2 : 1) * (goldenDrop ? 2 : 1);
    peg.gain = gain;
    api.score(gain);
    api.note(noteStep++);
    api.haptic(4);
    floatScore(scene, peg.img.x, peg.img.y - 20 * K, `+${gain}`, peg.kind === 'gold' ? '#ffe9b3' : '#ffc46c', 13 * K);
    if (peg.kind === 'cracker') {
      // BANG: light the neighborhood, kick the dumpling
      peg.img.setTint(0xff5d3c);
      burst(scene, peg.img.x, peg.img.y, 0xff5d3c, { n: 26, speed: 420 * K, scale: 0.6 * K });
      shockRing(scene, peg.img.x, peg.img.y, 0xff7a3c, 120 * K);
      shake(scene, 0.014, 160);
      flash(scene, 0xff7a3c, 90, 0.3);
      api.sfx('objDone');
      const R = 95 * K;
      for (const q of pegs) {
        if (!q.lit && Math.hypot(q.img.x - peg.img.x, q.img.y - peg.img.y) < R) {
          scene.time.delayedCall(70 + Math.random() * 120, () => lightPeg(scene, K, q, true));
        }
      }
      if (ball) {
        const dx = ball.img.x - peg.img.x, dy = ball.img.y - peg.img.y;
        const d = Math.hypot(dx, dy) || 1;
        try { scene.matter.body.applyForce(ball.img.body, ball.img.body.position, { x: dx / d * 0.02, y: dy / d * 0.02 - 0.01 }); } catch { /* gone */ }
      }
    } else if (!viaCracker && n > 0 && n % 6 === 0) {
      banner(scene, `${n} LANTERNS`, '#ffc46c', 26 * K);
      api.sfx('objDone');
    }
    // dragon head: relights spent pegs
    if (peg.dragonHead && dragon) {
      const spent = pegs.filter((q) => q.spent);
      for (const q of spent.slice(0, 3)) {
        q.spent = false;
        q.lit = false;
        q.img.setAlpha(1);
        try { q.body.isSensor = false; } catch { /* gone */ }
      }
      floatScore(scene, peg.img.x, peg.img.y - 30 * K, 'THE DRAGON PROVIDES', '#7ad0ff', 14 * K);
    }
  }

  function loseLife(scene, x, cause) {
    if (dead) return;
    lives = Math.max(0, lives - 1);
    const K = unit(scene);
    floatScore(scene, x, scene.scale.height * 0.8, lives > 0 ? 'MISSED THE WOK' : 'WALKED OUT', '#ff5d7a', 16 * K);
    shake(scene, 0.008, 120);
    api.sfx('log'); // the one negative beat was silent — it needs a thud
    api.haptic([18, 40, 18]);
    if (lives <= 0) { dead = true; api.die?.(cause); }
  }

  // three dumpling pips, top-right — a lost customer's pip goes dark
  function drawLives(scene, K) {
    const W = scene.scale.width;
    livesGfx.clear();
    const gap = 20 * K, r = 7 * K, x0 = W - 16 * K - gap * 2, y = 16 * K;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * gap, full = i < lives;
      livesGfx.fillStyle(full ? 0xffe9b3 : 0x000000, full ? 0.95 : 0.25);
      livesGfx.fillCircle(x, y, r);
      livesGfx.lineStyle(1.4 * K, full ? 0xffc46c : 0x6a4a2a, full ? 0.9 : 0.4);
      livesGfx.strokeCircle(x, y, r);
      if (full) { livesGfx.lineStyle(1.2 * K, 0xa8783c, 0.6); livesGfx.lineBetween(x - r * 0.4, y - r * 0.3, x + r * 0.4, y - r * 0.3); }
    }
  }

  function resolveDrop(scene, K, wokMult, wokX, missed = false) {
    if (!ball) return;
    const b = ball;
    ball = null;
    // only a dumpling that falls clean off the bottom past every wok is a
    // plate on the floor — one customer's patience spent. A wok catch never
    // costs patience, and a dumpling that merely settles in the pegs (the
    // resting/wedged mercy rules) is banked, not blamed on the player.
    // the first drop is a free teach — you learn the catch verb before the
    // stakes bite, so the fail-state is never front-loaded on a cold thumb
    if (missed && wokMult <= 1 && dropCount >= 1) loseLife(scene, wokX, 'WALKED OUT');
    // kill the golden trail BEFORE the dumpling dies: an emitter following
    // a destroyed Matter image crashes the whole cabinet on its next frame
    try { b.trail?.stopFollow(); b.trail?.destroy(); } catch { /* gone */ }
    scene.tweens.add({ targets: b.img, alpha: 0, duration: 250, onComplete: () => { try { b.img.destroy(); } catch { /* gone */ } } });
    const total = litThisDrop.reduce((a, p) => a + (p.gain ?? 10), 0);
    if (wokMult > 1 && litThisDrop.length) {
      const bonus = total * (wokMult - 1);
      api.score(bonus);
      glyphBanner(scene, `WOK CATCH ×${wokMult}`, '#ffd24a', 30 * K);
      floatScore(scene, wokX, scene.scale.height * 0.82, `+${bonus}`, '#ffd24a', 24 * K);
      zoomPunch(scene, 1.08, 260);
      slowmo(scene, 0.4, 350);
      api.sfx('pr');
      api.haptic([12, 30, 12, 30, 12]);
    } else if (wokMult > 1) {
      floatScore(scene, wokX, scene.scale.height * 0.82, 'caught!', '#ffd24a', 16 * K);
      api.sfx('objDone');
    }
    // the lit lanterns pop, one by one, rising
    const popped = litThisDrop;
    popped.forEach((p, i) => {
      scene.time.delayedCall(i * 70, () => {
        if (!p.img.active) return;
        if (p.dragonHead) { p.lit = false; return; } // the dragon only lends its head
        p.spent = true;
        burst(scene, p.img.x, p.img.y, p.kind === 'gold' ? 0xffe9b3 : 0xffc46c, { n: 10, speed: 260 * K, scale: 0.45 * K });
        collectTo(scene, p.img.x, p.img.y, scene.scale.width - 30 * K, 20 * K, 0xffc46c, 4);
        p.img.setAlpha(0.16);
        try { p.body.isSensor = true; } catch { /* gone */ }
        api.note(Math.min(14, i));
      });
    });
    litThisDrop = [];
    noteStep = 0;
    dropCount++;
    if (goldenDrop) { goldenDrop = false; goldenAt = scene.time.now + goldDelay(); }
    // a thinning field refills fresh, after the pop ceremony finishes —
    // and sweeping the steamer completely clean is worth a ceremony of its own
    scene.time.delayedCall(popped.length * 70 + 600, () => {
      const remaining = pegs.filter((p) => !p.spent && !p.dragonHead).length;
      if (remaining === 0) {
        api.score(75);
        glyphBanner(scene, 'SPOTLESS +75', '#ffe9a0', 26 * K);
        flash(scene, 0xffd24a, 110, 0.25);
        api.sfx('pr');
      }
      if (remaining < 8) buildField(scene, K);
    });
  }

  return {
    physics: { default: 'matter', matter: { gravity: { x: 0, y: 1 } } },

    fever() { fever = true; },

    create() {
      const scene = this;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      ensureFx(scene);
      paintSky(scene, cfg.sky);
      bloomCamera(scene);
      vignette(scene, 0.4, 0.75);
      ambientMotes(scene, cfg.accent, { alpha: 0.4 });
      scene.matter.world.engine.gravity.y = cfg.gravity;

      const spaceWorld = cfg.gravity < 1 || cfg.bouncy;
      if (spaceWorld) {
        // deep space kitchen: starfield, ringed planet, nebula wisps
        canvasTex(scene, 'wk-space', W, H, (c) => {
          const st = [0.05, 0.18, 0.31, 0.44, 0.57, 0.66, 0.79, 0.88, 0.12, 0.5, 0.72, 0.95, 0.26, 0.38, 0.61, 0.84];
          c.fillStyle = 'rgba(255,244,220,.9)';
          st.forEach((fx, i) => {
            c.globalAlpha = 0.25 + (i % 4) * 0.2;
            c.beginPath(); c.arc(W * fx, H * ((fx * 3.7 + i * 0.13) % 0.95), (0.6 + (i % 3) * 0.6) * 2, 0, 7); c.fill();
          });
          c.globalAlpha = 1;
          // nebula wisps
          for (const [fx, fy, r, col] of [[0.2, 0.3, 0.3, 'rgba(255,138,208,.1)'], [0.75, 0.6, 0.34, 'rgba(122,208,255,.09)'], [0.5, 0.85, 0.4, 'rgba(200,184,255,.08)']]) {
            const gr = c.createRadialGradient(W * fx, H * fy, 1, W * fx, H * fy, W * r);
            gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = gr;
            c.fillRect(0, 0, W, H);
          }
          // the ringed planet the market orbits
          const px = W * 0.82, py = H * 0.2, pr = W * 0.1;
          const pg = c.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 1, px, py, pr);
          pg.addColorStop(0, '#e8c8a0'); pg.addColorStop(1, '#a8742c');
          c.fillStyle = pg;
          c.beginPath(); c.arc(px, py, pr, 0, 7); c.fill();
          c.strokeStyle = 'rgba(232,213,174,.7)'; c.lineWidth = pr * 0.14;
          c.beginPath(); c.ellipse(px, py, pr * 1.7, pr * 0.4, -0.3, 0, 7); c.stroke();
        });
        scene.add.image(0, 0, 'wk-space').setOrigin(0).setDepth(-80);
      } else {
        // the night market itself: stalls, awnings, signs, steam, moon
        canvasTex(scene, 'wk-market', W, H, (c) => {
          for (let i = 0; i < 5; i++) {
            const x = W * (i / 5), sw = W / 5;
            const top = H * 0.75 - (30 + (i % 3) * 26) * K;
            c.fillStyle = 'rgba(16,8,22,.9)';
            c.fillRect(x + sw * 0.08, top, sw * 0.84, H - top);
            // striped awning
            const aw = top - 16 * K;
            for (let sIdx = 0; sIdx < 6; sIdx++) {
              c.fillStyle = sIdx % 2 ? 'rgba(194,59,78,.95)' : 'rgba(232,213,174,.95)';
              c.beginPath();
              c.moveTo(x + sw * (0.04 + sIdx * 0.153), aw);
              c.lineTo(x + sw * (0.04 + (sIdx + 1) * 0.153), aw);
              c.lineTo(x + sw * (0.04 + (sIdx + 1) * 0.153), aw + 12 * K);
              c.arc(x + sw * (0.04 + (sIdx + 0.5) * 0.153), aw + 12 * K, sw * 0.076, 0, Math.PI);
              c.closePath(); c.fill();
            }
            // glowing sign
            const gg = c.createRadialGradient(x + sw * 0.5, top + 22 * K, 1, x + sw * 0.5, top + 22 * K, sw * 0.3);
            gg.addColorStop(0, 'rgba(255,196,108,.7)'); gg.addColorStop(1, 'rgba(255,180,90,0)');
            c.fillStyle = gg;
            c.fillRect(x, top, sw, 60 * K);
            c.fillStyle = i % 2 ? '#ffc46c' : '#ff8ad0';
            c.font = `700 ${Math.round(13 * K)}px sans-serif`;
            c.textAlign = 'center';
            c.fillText(['麵', '湯', '包', '茶', '火'][i], x + sw * 0.5, top + 26 * K);
          }
        });
        scene.add.image(0, 0, 'wk-market').setOrigin(0).setDepth(-80);
        celestial(scene, W * 0.14, H * 0.1, 26 * K, 0xfff0c8, { depth: -88 });
        // strings of lanterns swaying above the pegs
        const lantKey = canvasTex(scene, 'wk-strlant', 22 * K, 28 * K, (c, w, h) => {
          const g2 = c.createRadialGradient(w / 2, h * 0.5, 1, w / 2, h * 0.5, w * 0.6);
          g2.addColorStop(0, '#ffd88a'); g2.addColorStop(0.6, '#e8543c'); g2.addColorStop(1, '#a82c20');
          c.fillStyle = g2;
          c.beginPath(); c.ellipse(w / 2, h * 0.5, w * 0.42, h * 0.4, 0, 0, 7); c.fill();
          c.fillStyle = '#3a2410';
          c.fillRect(w * 0.34, h * 0.02, w * 0.32, h * 0.1);
          c.fillRect(w * 0.34, h * 0.86, w * 0.32, h * 0.08);
        });
        const sg = scene.add.graphics().setDepth(-72);
        for (const [y0, y1] of [[H * 0.1, H * 0.14], [H * 0.15, H * 0.12]]) {
          sg.lineStyle(1.5 * K, 0x2c1408, 0.8);
          sg.beginPath();
          sg.moveTo(0, y0);
          sg.lineTo(W * 0.5, Math.max(y0, y1) + 14 * K);
          sg.lineTo(W, y1);
          sg.strokePath();
          for (let i = 1; i < 5; i++) {
            const lx = W * i / 5;
            const ly = (lx < W / 2 ? y0 + (Math.max(y0, y1) + 14 * K - y0) * (lx / (W / 2)) : Math.max(y0, y1) + 14 * K + (y1 - Math.max(y0, y1) - 14 * K) * ((lx - W / 2) / (W / 2)));
            const l = scene.add.image(lx, ly + 14 * K, lantKey).setDepth(-71).setOrigin(0.5, 0.1);
            scene.tweens.add({ targets: l, angle: (i % 2 ? 5 : -5), duration: 1400 + i * 240, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          }
        }
        // steam rising behind the field
        for (const fx of [0.22, 0.74]) {
          scene.add.particles(W * fx, H * 0.76, 'fx-dot', {
            speedY: { min: -50 * K, max: -20 * K }, speedX: { min: -6 * K, max: 6 * K },
            scale: { start: 0.7 * K, end: 1.3 * K }, alpha: { start: 0.14, end: 0 },
            tint: 0xd8c8e8, lifespan: 3200, frequency: 220, advance: 3200,
          }).setDepth(-70);
        }
      }

      // walls keep the fortune on stage
      scene.matter.add.rectangle(-10 * K, H / 2, 20 * K, H * 2, { isStatic: true });
      scene.matter.add.rectangle(W + 10 * K, H / 2, 20 * K, H * 2, { isStatic: true });
      // counter aprons: angled ledges in the lower corners that funnel a
      // wall-hugging dumpling back toward the woks instead of letting it die
      // in a corner the pans can never reach — the catch has to be earnable
      const apron = (cx, cy, ang) => {
        scene.matter.add.rectangle(cx, cy, W * 0.2, 12 * K, { isStatic: true, angle: ang, restitution: 0.2, friction: 0.02, label: 'apron' });
        const g = scene.add.graphics().setDepth(11);
        g.save(); g.translateCanvas(cx, cy); g.rotateCanvas(ang);
        g.fillStyle(0x2a1e26, 0.92);
        g.fillRoundedRect(-W * 0.1, -6 * K, W * 0.2, 12 * K, 5 * K);
        g.fillStyle(0xffc46c, 0.5);
        g.fillRoundedRect(-W * 0.1, -6 * K, W * 0.2, 2.5 * K, 2 * K);
        g.restore();
      };
      apron(W * 0.08, H * 0.8, 0.72);
      apron(W * 0.92, H * 0.8, -0.72);

      if (cfg.bells) {
        for (const [bx, by, rot] of [[W * 0.3, H * 0.56, -0.5], [W * 0.7, H * 0.56, 0.5]]) {
          const img = scene.add.image(bx, by, canvasTex(scene, 'wk-bell', 54 * K, 54 * K, PAINT.bell)).setDepth(11).setRotation(rot);
          scene.matter.add.rectangle(bx, by, 46 * K, 46 * K, { isStatic: true, angle: rot, restitution: 0.9, label: 'bell' });
          scene.tweens.add({ targets: img, angle: img.angle + 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      }

      buildField(scene, K);

      // sliding woks — wide and unhurried so a well-aimed drop actually
      // lands (a life rides on the catch); the small wok stays the leaner,
      // faster, triple-paying gamble. Each pan patrols its OWN lane so the
      // pair can never crowd onto one side and leave the other half of the
      // counter uncatchable.
      for (let i = 0; i < cfg.woks; i++) {
        const small = i === cfg.woks - 1;
        const ww = (small ? 90 : 132) * K;
        const laneW = W / cfg.woks;
        const lo = Math.max(ww / 2 + 4 * K, i * laneW);
        const hi = Math.min(W - ww / 2 - 4 * K, (i + 1) * laneW);
        const img = scene.add.image((lo + hi) / 2, H * 0.9, canvasTex(scene, `wk-pan${small ? 's' : ''}`, ww, 34 * K, PAINT.wokpan)).setDepth(12);
        woks.push({ img, w: ww, dir: i % 2 ? -1 : 1, speed: (small ? 58 : 40) * K, mult: small ? 3 : 2, lo, hi });
      }

      // the dragon coils through the field
      if (cfg.dragon) {
        const segs = [];
        const head = scene.add.image(0, 0, canvasTex(scene, 'wk-dhead', 40 * K, 40 * K, PAINT.dragonhead)).setDepth(13);
        segs.push(head);
        for (let i = 0; i < 5; i++) {
          const s = scene.add.image(0, 0, 'fx-dot').setTint(0x7ad0ff).setScale(0.5 * K).setBlendMode('ADD').setDepth(12);
          segs.push(s);
        }
        const body = scene.matter.add.circle(0, 0, 16 * K, { isStatic: true, label: 'peg', restitution: 0.6 });
        const peg = { img: head, body, kind: 'peg', lit: false, dragonHead: true };
        body.pegRef = peg;
        dragon = { segs, body, peg, t: 0 };
        pegs.push(peg);
      }

      if (cfg.vents) {
        for (const vx of [W * 0.06, W * 0.94]) {
          scene.add.particles(vx, H * 0.45, 'fx-dot', {
            speedX: { min: (vx < W / 2 ? 60 : -140) * K, max: (vx < W / 2 ? 140 : -60) * K },
            speedY: { min: -20 * K, max: 20 * K },
            scale: { start: 0.5 * K, end: 0 }, alpha: { start: 0.4, end: 0 },
            tint: 0xbfe8dc, lifespan: 1400, frequency: 60,
          }).setDepth(8);
        }
      }

      launcher = scene.add.image(W / 2, 26 * K, canvasTex(scene, 'wk-basket', 60 * K, 40 * K, PAINT.basket)).setDepth(20);
      // t0/goldenAt seed on the first update — the scene clock reads ~0 here
      aimGfx = scene.add.graphics().setDepth(19);
      livesGfx = scene.add.graphics().setDepth(21);

      // collisions: dumpling meets lantern
      scene.matter.world.on('collisionstart', (ev) => {
        for (const pair of ev.pairs) {
          const pegBody = pair.bodyA.pegRef ? pair.bodyA : pair.bodyB.pegRef ? pair.bodyB : null;
          if (pegBody && ball) {
            const peg = pegBody.pegRef;
            if (!peg.spent) lightPeg(scene, K, peg);
          }
          const isBell = pair.bodyA.label === 'bell' || pair.bodyB.label === 'bell';
          if (isBell && ball && scene.time.now - lastBellAt > 350) {
            // the bells deflect, but a rung bell still pays its respects
            lastBellAt = scene.time.now;
            api.score(3);
            floatScore(scene, ball.img.x, ball.img.y - 18 * K, 'BONG +3', '#e8c46c', 12 * K);
            api.sfx('tap');
            shake(scene, 0.005, 70);
          }
        }
      });

      scene.input.on('pointerdown', (p) => { if (!ball) { aiming = true; aimX = p.x; } });
      scene.input.on('pointermove', (p) => { if (aiming) aimX = p.x; });
      scene.input.on('pointerup', () => {
        if (!aiming) return;
        aiming = false;
        if (ball) return;
        const x = Math.max(30 * K, Math.min(W - 30 * K, aimX ?? W / 2));
        const img = scene.matter.add.image(x, 44 * K, canvasTex(scene, 'wk-dump', 34 * K, 32 * K, PAINT.dumpling), null, {
          shape: 'circle', restitution: cfg.bouncy ? 0.75 : 0.55, friction: 0.002, frictionAir: 0.008, density: 0.0022, label: 'ball',
        }).setDepth(15);
        ball = { img, born: scene.time.now, lastMove: scene.time.now, prevY: img.y };
        if (goldenPending) {
          goldenPending = false;
          goldenDrop = true;
          img.setTint(0xffd24a);
          ball.trail = scene.add.particles(0, 0, 'fx-dot', {
            speed: 26, scale: { start: 0.36 * K, end: 0 }, lifespan: 380,
            tint: 0xffd24a, blendMode: 'ADD', frequency: 40,
          }).setDepth(14).startFollow(img);
        }
        api.sfx('tap');
        api.haptic(6);
        squash(scene, launcher, 'y');
      });
    },

    update(t, dtMs) {
      const scene = this;
      const dt = Math.min(dtMs, 64) / 1000;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      if (!t0) { t0 = scene.time.now; goldenAt = scene.time.now + goldDelay(); }

      // the golden dumpling announces itself before the next drop
      if (!goldenPending && !goldenDrop && scene.time.now >= goldenAt && goldenAt > 0 && !ball) {
        goldenPending = true;
        glyphBanner(scene, 'GOLDEN DUMPLING — 2×', '#ffe9a0', 24 * K);
        squash(scene, launcher, 'y');
        api.sfx('objDone');
      }

      // launcher tracks the aim
      if (aiming && aimX != null) launcher.x += (aimX - launcher.x) * Math.min(1, dt * 12);
      aimGfx.clear();
      if (aiming) {
        aimGfx.lineStyle(2.5 * K, 0xffe9b3, 0.6);
        aimGfx.lineBetween(launcher.x, 40 * K, launcher.x, H * 0.2);
        aimGfx.fillStyle(0xffe9b3, 0.7).fillCircle(launcher.x, H * 0.2, 4 * K);
      }

      // woks slide — and pick up pace as the rest wears on, so the catch
      // stays a read-and-time decision instead of a solved constant
      const wokRamp = 1 + Math.min(0.5, ((scene.time.now - t0) / 1000 / 240) * 0.5);
      for (const wk of woks) {
        wk.img.x += wk.dir * wk.speed * wokRamp * (fever ? 1.3 : 1) * dt;
        if (wk.img.x < wk.lo || wk.img.x > wk.hi) { wk.dir *= -1; wk.img.x = Math.max(wk.lo, Math.min(wk.hi, wk.img.x)); }
        // pans lean into their travel and breathe — nothing sits dead still
        wk.img.setAngle(wk.dir * 2.2 + Math.sin(scene.time.now / 320 + wk.w) * 1.4);
      }

      // the dragon coils
      if (dragon) {
        dragon.t += dt;
        const path = (tt) => ({
          x: W / 2 + Math.sin(tt * 0.7) * W * 0.32,
          y: H * 0.42 + Math.sin(tt * 1.13 + 1.7) * H * 0.16,
        });
        const hp = path(dragon.t);
        dragon.segs[0].setPosition(hp.x, hp.y);
        try { scene.matter.body.setPosition(dragon.body, hp); } catch { /* gone */ }
        for (let i = 1; i < dragon.segs.length; i++) {
          const sp = path(dragon.t - i * 0.24);
          dragon.segs[i].setPosition(sp.x, sp.y);
        }
      }

      // nebula field curves the fall
      if (cfg.field && ball) {
        try {
          scene.matter.body.applyForce(ball.img.body, ball.img.body.position, {
            x: Math.sin(scene.time.now / 900 + ball.img.y / 80) * 0.0006, y: 0,
          });
        } catch { /* gone */ }
      }
      // vents shove
      if (cfg.vents && ball && ball.img.y > H * 0.34 && ball.img.y < H * 0.58) {
        const dir = ball.img.x < W / 2 ? 1 : -1;
        try { scene.matter.body.applyForce(ball.img.body, ball.img.body.position, { x: dir * 0.0009, y: 0 }); } catch { /* gone */ }
      }

      // drop resolution
      if (ball) {
        const bx = ball.img.x, by = ball.img.y;
        const bv = ball.img.body ? Math.hypot(ball.img.body.velocity.x, ball.img.body.velocity.y) : 0;
        // possession guard: a drifting peg or the dragon's head teleports
        // INTO a resting dumpling and Matter answers with infinite violence
        // — clamp any impossible exit speed back to honest physics
        if (bv > 24 && ball.img.body) {
          const f = 24 / bv;
          try { scene.matter.body.setVelocity(ball.img.body, { x: ball.img.body.velocity.x * f, y: ball.img.body.velocity.y * f }); } catch { /* gone */ }
        }
        if (bv > 0.6) ball.lastMove = scene.time.now;
        for (const wk of woks) {
          // band + crossing test so a fast fall can't tunnel past the pan.
          // The mouth reads generously (a life rides on the catch) so a drop
          // aimed near a wok lands in it; a real miss falls clear between them
          const inX = Math.abs(bx - wk.img.x) < wk.w * 0.52;
          const inBand = Math.abs(by - wk.img.y) < 30 * K;
          const crossed = ball.prevY <= wk.img.y - 4 * K && by > wk.img.y - 4 * K;
          if (inX && (inBand || crossed)) {
            burst(scene, bx, by, 0xffd24a, { n: 14, speed: 260 * K, scale: 0.5 * K });
            squash(scene, wk.img, 'y');
            resolveDrop(scene, K, wk.mult, wk.img.x);
            return;
          }
        }
        ball.prevY = by;
        if (by > H + 30 * K) resolveDrop(scene, K, 1, bx, true); // fell clean off the bottom — a real miss
        else if (scene.time.now - ball.lastMove > 1400) resolveDrop(scene, K, 1, bx); // resting — bank it, no blame
        else if (scene.time.now - ball.born > 6000) resolveDrop(scene, K, 1, bx); // wedged — mercy rule, no blame
      }

      drawLives(scene, K);
    },
  };
}

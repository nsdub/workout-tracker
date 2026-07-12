// BROADSIDE FM — Pirate Radio Atoll. The censor-navy sails in to kill
// the signal; you are the shipwreck cannon deck. Drag to aim (trajectory
// dots remember your last shot's lesson), release to fire. Enemy ships
// are real Matter assemblies — hull, crates, mast, powder keg, captain —
// and everything you knock into the sea FLOATS THERE, bobbing, for the
// rest of the session. Kegs chain-detonate. Masts topple onto their own
// crews. The DJ approves.
//
// Worlds re-arm the deck: lava rounds from the volcano lighthouse, a
// kraken that bats your ball into a double-damage bank shot, cave
// ceilings for ricochets, storm winds that curve every ballistic, and a
// flagship hiding a golden treasure antenna behind armor.
import {
  ensureFx, canvasTex, burst, shockRing, floatScore, banner, glyphBanner,
  shake, flash, hitstop, slowmo, zoomPunch, collectTo, paintSky,
  ambientMotes, bloomCamera, vignette, squash, unit,
  celestial, driftClouds,
} from '../fx.js';

export const TITLE = 'Broadside FM';

export const WORLDS = {
  'atoll-wreck': {
    name: 'Cannon Deck', sky: [[0, '#3a8fd9'], [0.55, '#7ac8ec'], [1, '#ffd98a']],
    accent: 0xff7a4c, sea: 0x1c5c8c,
  },
  'atoll-light': {
    name: 'Volcano Lighthouse', sky: [[0, '#2c0c20'], [0.55, '#6e1f3a'], [1, '#e85a3c']],
    accent: 0xff9a4c, sea: 0x28184c, lava: true,
  },
  'atoll-parrots': {
    name: 'Parrot Congress', sky: [[0, '#0c6a5c'], [0.55, '#3aa88c'], [1, '#ffe9b3']],
    accent: 0xe83a4e, sea: 0x0c4a44, parrots: true,
  },
  'atoll-kraken': {
    name: "Kraken's Reach", sky: [[0, '#1c0c3c'], [0.55, '#3c2468'], [1, '#8c4a9c']],
    accent: 0x9c6ee8, sea: 0x140a30, kraken: true,
  },
  'atoll-bottles': {
    name: 'Message Bay', sky: [[0, '#2c6a9c'], [0.55, '#6ab8d8'], [1, '#ffe0a0']],
    accent: 0x3adcc8, sea: 0x1a4a70, bottles: true,
  },
  'atoll-skull': {
    name: 'Skull Cave Studio', sky: [[0, '#0c0c14'], [0.55, '#1c1c2c'], [1, '#3a3450']],
    accent: 0xaef0ff, sea: 0x0a0a18, cave: true,
  },
  'atoll-storm': {
    name: 'Hurricane Broadside', sky: [[0, '#141c2c'], [0.55, '#2c3a50'], [1, '#546a84']],
    accent: 0x8ab8dc, sea: 0x0f1c30, storm: true,
  },
  'atoll-antenna': {
    name: 'Treasure Antenna', sky: [[0, '#1c3444'], [0.55, '#3a6a7c'], [1, '#ffc46c']],
    accent: 0xffd24a, sea: 0x143444, antenna: true,
  },
};

const PAINT = {
  cannon(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3c3c48'); g.addColorStop(1, '#181820');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(w * 0.06, h * 0.3, w * 0.88, h * 0.4, h * 0.2); c.fill();
    c.fillStyle = '#101018';
    c.beginPath(); c.arc(w * 0.92, h * 0.5, h * 0.22, 0, 7); c.fill();
    c.strokeStyle = '#5c5c6c'; c.lineWidth = h * 0.06;
    c.beginPath(); c.moveTo(w * 0.2, h * 0.32); c.lineTo(w * 0.2, h * 0.68); c.stroke();
  },
  carriage(c, w, h) {
    c.fillStyle = '#6a3a1c';
    c.beginPath(); c.moveTo(w * 0.1, h); c.lineTo(w * 0.26, h * 0.1); c.lineTo(w * 0.74, h * 0.1); c.lineTo(w * 0.9, h); c.closePath(); c.fill();
    c.fillStyle = '#4a2410';
    c.beginPath(); c.arc(w * 0.5, h * 0.78, w * 0.16, 0, 7); c.fill();
    c.fillStyle = '#8a5a2a';
    c.beginPath(); c.arc(w * 0.5, h * 0.78, w * 0.08, 0, 7); c.fill();
  },
  ball(c, w, h) {
    const g = c.createRadialGradient(w * 0.38, h * 0.38, 1, w / 2, h / 2, w * 0.52);
    g.addColorStop(0, '#4a4a58'); g.addColorStop(1, '#14141c');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.44, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)';
    c.beginPath(); c.arc(w * 0.36, h * 0.34, w * 0.1, 0, 7); c.fill();
  },
  lavaball(c, w, h) {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#fff0c8'); g.addColorStop(0.4, '#ff9a3c'); g.addColorStop(1, '#c2452e');
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.44, 0, 7); c.fill();
    c.strokeStyle = 'rgba(60,10,5,.6)'; c.lineWidth = w * 0.05;
    c.beginPath(); c.moveTo(w * 0.3, h * 0.4); c.lineTo(w * 0.5, h * 0.55); c.lineTo(w * 0.44, h * 0.72); c.stroke();
  },
  hull(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6a3a1c'); g.addColorStop(1, '#3c2010');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h * 0.1); c.lineTo(w, h * 0.1); c.lineTo(w * 0.86, h * 0.95); c.lineTo(w * 0.14, h * 0.95);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = h * 0.08;
    c.beginPath(); c.moveTo(w * 0.05, h * 0.36); c.lineTo(w * 0.95, h * 0.36); c.stroke();
    c.beginPath(); c.moveTo(w * 0.1, h * 0.62); c.lineTo(w * 0.9, h * 0.62); c.stroke();
    c.fillStyle = '#ffd24a';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(w * (0.28 + i * 0.22), h * 0.5, h * 0.07, 0, 7); c.fill(); }
  },
  crate(c, w, h) {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#8a5a2a'); g.addColorStop(1, '#5c3414');
    c.fillStyle = g;
    c.fillRect(w * 0.04, h * 0.04, w * 0.92, h * 0.92);
    c.strokeStyle = 'rgba(30,14,4,.6)'; c.lineWidth = w * 0.07;
    c.strokeRect(w * 0.04, h * 0.04, w * 0.92, h * 0.92);
    c.beginPath(); c.moveTo(w * 0.04, h * 0.04); c.lineTo(w * 0.96, h * 0.96); c.stroke();
    c.beginPath(); c.moveTo(w * 0.96, h * 0.04); c.lineTo(w * 0.04, h * 0.96); c.stroke();
  },
  mast(c, w, h) {
    c.fillStyle = '#5c3414';
    c.fillRect(w * 0.4, 0, w * 0.2, h);
    c.fillStyle = '#e8d5ae';
    c.beginPath(); c.moveTo(w * 0.5, h * 0.06); c.quadraticCurveTo(w * 1.5, h * 0.22, w * 0.5, h * 0.44); c.closePath(); c.fill();
    c.fillStyle = '#14141c';
    c.beginPath(); c.moveTo(w * 0.5, h * 0.02); c.lineTo(w * 0.98, h * 0.09); c.lineTo(w * 0.5, h * 0.16); c.closePath(); c.fill();
  },
  keg(c, w, h) {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#4a2410'); g.addColorStop(0.5, '#7c4a20'); g.addColorStop(1, '#4a2410');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.42, h * 0.46, 0, 0, 7); c.fill();
    c.strokeStyle = '#2c1408'; c.lineWidth = h * 0.07;
    c.beginPath(); c.moveTo(w * 0.1, h * 0.3); c.lineTo(w * 0.9, h * 0.3); c.stroke();
    c.beginPath(); c.moveTo(w * 0.1, h * 0.7); c.lineTo(w * 0.9, h * 0.7); c.stroke();
    c.fillStyle = '#ff5d5d';
    c.font = `700 ${Math.round(h * 0.3)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('!!', w / 2, h * 0.58);
  },
  captain(c, w, h) {
    c.fillStyle = '#2c3a56';
    c.beginPath(); c.roundRect(w * 0.28, h * 0.4, w * 0.44, h * 0.52, w * 0.1); c.fill();
    c.fillStyle = '#e8b088';
    c.beginPath(); c.arc(w * 0.5, h * 0.28, w * 0.2, 0, 7); c.fill();
    c.fillStyle = '#14141c';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.12, w * 0.3, h * 0.08, 0, 0, 7); c.fill();
    c.fillRect(w * 0.34, h * 0.02, w * 0.32, h * 0.1);
    c.fillStyle = '#1c1208';
    c.beginPath(); c.arc(w * 0.43, h * 0.26, w * 0.035, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.57, h * 0.26, w * 0.035, 0, 7); c.fill();
    c.strokeStyle = '#1c1208'; c.lineWidth = w * 0.03;
    c.beginPath(); c.arc(w * 0.5, h * 0.36, w * 0.07, 3.5, 5.9); c.stroke(); // permanent scowl
  },
  parrot(c, w, h) {
    c.fillStyle = '#e83a4e';
    c.beginPath(); c.ellipse(w * 0.45, h * 0.55, w * 0.26, h * 0.34, 0.2, 0, 7); c.fill();
    c.beginPath(); c.arc(w * 0.62, h * 0.26, w * 0.16, 0, 7); c.fill();
    c.fillStyle = '#ffd24a';
    c.beginPath(); c.moveTo(w * 0.74, h * 0.24); c.lineTo(w * 0.92, h * 0.3); c.lineTo(w * 0.72, h * 0.38); c.closePath(); c.fill();
    c.fillStyle = '#3a8fd9';
    c.beginPath(); c.ellipse(w * 0.3, h * 0.62, w * 0.16, h * 0.26, 0.6, 0, 7); c.fill();
    c.fillStyle = '#1c1208';
    c.beginPath(); c.arc(w * 0.66, h * 0.22, w * 0.04, 0, 7); c.fill();
  },
  bottle(c, w, h) {
    c.fillStyle = 'rgba(122,216,196,.85)';
    c.beginPath(); c.roundRect(w * 0.3, h * 0.3, w * 0.4, h * 0.62, w * 0.14); c.fill();
    c.fillRect(w * 0.42, h * 0.1, w * 0.16, h * 0.26);
    c.fillStyle = '#8a5a2a';
    c.fillRect(w * 0.42, h * 0.04, w * 0.16, h * 0.1);
    c.fillStyle = '#e8d5ae';
    c.fillRect(w * 0.36, h * 0.46, w * 0.28, h * 0.3);
  },
  antenna(c, w, h) {
    c.strokeStyle = '#ffd24a'; c.lineWidth = w * 0.16; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.5, h * 0.98); c.lineTo(w * 0.5, h * 0.1); c.stroke();
    c.lineWidth = w * 0.1;
    c.beginPath(); c.moveTo(w * 0.14, h * 0.3); c.lineTo(w * 0.86, h * 0.3); c.stroke();
    c.beginPath(); c.moveTo(w * 0.22, h * 0.16); c.lineTo(w * 0.78, h * 0.16); c.stroke();
    const g = c.createRadialGradient(w * 0.5, h * 0.08, 1, w * 0.5, h * 0.08, w * 0.3);
    g.addColorStop(0, '#fff8d0'); g.addColorStop(1, 'rgba(255,210,74,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(w * 0.5, h * 0.08, w * 0.3, 0, 7); c.fill();
  },
  tentacle(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6a3a9c'); g.addColorStop(1, '#3c1c68');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(w * 0.2, h);
    c.quadraticCurveTo(w * 0.05, h * 0.5, w * 0.34, h * 0.18);
    c.quadraticCurveTo(w * 0.52, 0, w * 0.66, h * 0.14);
    c.quadraticCurveTo(w * 0.5, h * 0.2, w * 0.56, h * 0.4);
    c.quadraticCurveTo(w * 0.66, h * 0.75, w * 0.8, h);
    c.closePath(); c.fill();
    c.fillStyle = '#c8a0e8';
    for (let i = 0; i < 4; i++) {
      c.beginPath(); c.arc(w * (0.36 + i * 0.05), h * (0.3 + i * 0.17), w * 0.045, 0, 7); c.fill();
    }
  },
};

export function create(P, ctx) {
  const { api, cfg } = ctx;
  let cannon, carriage, aimGfx, seaGfx;
  let aiming = false;
  let aimAt = null;
  let ball = null;           // { img, batted, lava }
  let reloadAt = 0;
  let shotCount = 0;
  let ships = [];            // { pieces: [{img, kind, scored}], alive, x }
  let floaters = [];         // wreckage bobbing forever
  let bottles = [];
  let kraken = null;         // { img, phase }
  let wind = 0;
  let fever = false;
  let noteStep = 0;

  const seaY = (scene) => scene.scale.height * 0.74;
  const CANNON = (scene) => ({ x: 56 * unit(scene), y: seaY(scene) - 36 * unit(scene) });

  function pieceKindPts(kind) {
    return { crate: 8, mast: 20, keg: 25, captain: 30, antenna: 100 }[kind] ?? 5;
  }

  function buildShip(scene, K, x, isFlag) {
    const W = scene.scale.width;
    const sy = seaY(scene);
    const pieces = [];
    const hullW = 130 * K, hullH = 34 * K;
    const add = (kind, px, py, w, h, opts = {}) => {
      const img = scene.matter.add.image(px, py, canvasTex(scene, `at-${kind}`, w, h, PAINT[kind]), null, {
        friction: 0.6, restitution: 0.1, density: kind === 'mast' ? 0.0012 : 0.002, ...opts,
      }).setDepth(12);
      const piece = { img, kind, scored: false, ship: null };
      img.body.pieceRef = piece;
      pieces.push(piece);
      return img;
    };
    // the deck the stack stands on (static shelf just under the hull art)
    const shelf = scene.matter.add.rectangle(x, sy + 6 * K, hullW * 1.05, 12 * K, { isStatic: true, label: 'shelf' });
    add('hull', x, sy - hullH / 2, hullW, hullH);
    const deckY = sy - hullH - 1;
    add('crate', x - 34 * K, deckY - 14 * K, 30 * K, 30 * K);
    add('crate', x + 34 * K, deckY - 14 * K, 30 * K, 30 * K);
    add('crate', x - 34 * K, deckY - 45 * K, 30 * K, 30 * K);
    add('keg', x + 34 * K, deckY - 44 * K, 28 * K, 32 * K);
    add('mast', x, deckY - 62 * K, 34 * K, 120 * K);
    const capImg = add('captain', x + 4 * K, deckY - 100 * K, 26 * K, 40 * K);
    if (isFlag && cfg.antenna) {
      // armor wall in front, golden antenna behind
      add('crate', x - 62 * K, deckY - 20 * K, 26 * K, 44 * K, { density: 0.004 });
      add('crate', x - 62 * K, deckY - 62 * K, 26 * K, 40 * K, { density: 0.004 });
      add('antenna', x + 52 * K, deckY - 70 * K, 22 * K, 90 * K, { density: 0.001 });
    }
    const ship = { pieces, shelf, alive: true, x, captain: capImg.body.pieceRef };
    for (const p of pieces) p.ship = ship;
    ships.push(ship);
    // wreckage permanence has a budget: past four ships, the oldest dead
    // one sinks below the waves so Matter never chugs on a long rest
    if (ships.length > 4) {
      const old = ships.find((s) => !s.alive);
      if (old) {
        ships.splice(ships.indexOf(old), 1);
        try { scene.matter.world.remove(old.shelf); } catch { /* gone */ }
        for (const p of old.pieces) {
          if (!p.img.active) continue;
          scene.tweens.add({ targets: p.img, y: p.img.y + 120 * K, alpha: 0, duration: 1600, onComplete: () => { try { p.img.destroy(); } catch { /* gone */ } } });
        }
      }
    }
    banner(scene, 'SAILS ON THE HORIZON', '#8ab8dc', 20 * K);
    return ship;
  }

  function explodeKeg(scene, K, piece) {
    if (piece.exploded) return;
    piece.exploded = true;
    const { x, y } = piece.img;
    piece.scored = true;
    api.score(25);
    floatScore(scene, x, y - 20 * K, 'KEG +25', '#ff9a3c', 20 * K);
    burst(scene, x, y, 0xff9a3c, { n: 34, speed: 520 * K, scale: 0.75 * K });
    shockRing(scene, x, y, 0xff7a3c, 160 * K);
    flash(scene, 0xff9a3c, 130, 0.4);
    hitstop(scene, 90, () => shake(scene, 0.022, 260));
    api.sfx('objDone');
    api.haptic([20, 40, 20]);
    // radial shove on everything nearby — the chain currency
    const R = 150 * K;
    for (const ship of ships) {
      for (const q of ship.pieces) {
        if (q === piece || !q.img.body) continue;
        const dx = q.img.x - x, dy = q.img.y - y;
        const d = Math.hypot(dx, dy);
        if (d < R) {
          const f = 0.05 * (1 - d / R);
          try { scene.matter.body.applyForce(q.img.body, q.img.body.position, { x: (dx / (d || 1)) * f, y: (dy / (d || 1)) * f - f * 0.5 }); } catch { /* gone */ }
          if (q.kind === 'keg' && d < R * 0.7) scene.time.delayedCall(140, () => explodeKeg(scene, K, q));
        }
      }
    }
    scene.tweens.add({ targets: piece.img, alpha: 0, duration: 160, onComplete: () => { try { piece.img.destroy(); } catch { /* gone */ } } });
  }

  function launchParrot(scene, K, fromX, fromY) {
    const targets = ships.flatMap((s) => s.pieces).filter((p) => !p.scored && p.img.active && p.kind !== 'hull');
    if (!targets.length) return;
    const target = targets[Math.floor(Math.random() * targets.length)];
    const parrot = scene.add.image(fromX, fromY, canvasTex(scene, 'at-parrot', 44 * K, 36 * K, PAINT.parrot)).setDepth(25);
    floatScore(scene, fromX, fromY - 24 * K, 'SQUAWK!', '#e83a4e', 15 * K);
    scene.tweens.add({
      targets: parrot, x: target.img.x, y: target.img.y, duration: 480, ease: 'Cubic.easeIn',
      onComplete: () => {
        try {
          scene.matter.body.applyForce(target.img.body, target.img.body.position, { x: 0.02, y: -0.03 });
        } catch { /* gone */ }
        api.score(15);
        floatScore(scene, target.img.x, target.img.y - 20 * K, 'PARROT STRIKE +15', '#e83a4e', 15 * K);
        burst(scene, target.img.x, target.img.y, 0xe83a4e, { n: 12, speed: 280 * K, scale: 0.5 * K });
        api.sfx('objDone');
        parrot.destroy();
      },
    });
  }

  function fire(scene, K) {
    // a follow-up shot retires the previous ball — no orphan bodies
    if (ball?.img.active) { try { ball.img.destroy(); } catch { /* gone */ } }
    ball = null;
    const c = CANNON(scene);
    const dx = aimAt.x - c.x, dy = aimAt.y - c.y;
    const ang = Math.atan2(dy, dx);
    const pow = Math.min(Math.hypot(dx, dy), 210 * K) / (210 * K);
    const speed = (14 + pow * 15) * K;
    shotCount++;
    const isLava = cfg.lava && shotCount % 3 === 0;
    const img = scene.matter.add.image(c.x + Math.cos(ang) * 40 * K, c.y + Math.sin(ang) * 40 * K,
      canvasTex(scene, isLava ? 'at-lavaball' : 'at-ball', 24 * K, 24 * K, isLava ? PAINT.lavaball : PAINT.ball), null, {
        shape: 'circle', density: 0.006, restitution: 0.25, friction: 0.4, frictionAir: 0.004, label: 'ball',
      }).setDepth(20);
    try { scene.matter.body.setVelocity(img.body, { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed }); } catch { /* boom */ }
    ball = { img, lava: isLava, batted: false };
    if (isLava) {
      const trail = scene.add.particles(0, 0, 'fx-dot', {
        speed: 20, scale: { start: 0.4 * K, end: 0 }, tint: 0xff9a3c, blendMode: 'ADD', lifespan: 320, frequency: 24,
      }).setDepth(19).startFollow(img);
      scene.time.delayedCall(4000, () => trail.destroy());
    }
    // muzzle ceremony: flash, kick, recoil
    burst(scene, c.x + Math.cos(ang) * 52 * K, c.y + Math.sin(ang) * 52 * K, 0xffe9b3, { n: 14, speed: 300 * K, scale: 0.5 * K });
    shake(scene, 0.01, 120);
    zoomPunch(scene, 1.05, 180);
    scene.tweens.add({ targets: [cannon, carriage], x: `-=${10 * K}`, duration: 70, yoyo: true, ease: 'Sine.easeInOut' });
    api.sfx('log');
    api.haptic(12);
    reloadAt = scene.time.now + 850;
  }

  return {
    physics: { default: 'matter', matter: { gravity: { x: 0, y: 1 } } },

    fever() { fever = true; },

    create() {
      const scene = this;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      const sy = seaY(scene);
      ensureFx(scene);
      paintSky(scene, cfg.sky);
      bloomCamera(scene);
      vignette(scene, 0.4, 0.75);
      ambientMotes(scene, cfg.accent, { alpha: 0.35 });

      // the atoll on the horizon: islands, the volcano lighthouse, palms
      canvasTex(scene, 'at-isle', W, H, (c) => {
        // distant island chain
        c.fillStyle = 'rgba(16,32,48,.55)';
        for (const [fx, fw, fh] of [[0.16, 0.13, 0.045], [0.42, 0.09, 0.03], [0.9, 0.11, 0.04]]) {
          c.beginPath();
          c.ellipse(W * fx, sy - H * fh * 0.4, W * fw, H * fh, 0, Math.PI, 0);
          c.fill();
        }
        // the volcano lighthouse island
        const vx = W * 0.66, vw = W * 0.17, base = sy - 2;
        c.fillStyle = 'rgba(22,26,44,.85)';
        c.beginPath();
        c.moveTo(vx - vw, base);
        c.lineTo(vx - vw * 0.24, base - H * 0.13);
        c.lineTo(vx + vw * 0.24, base - H * 0.13);
        c.lineTo(vx + vw, base);
        c.closePath(); c.fill();
        // tower on the crater rim
        c.fillStyle = 'rgba(40,32,56,.95)';
        c.fillRect(vx - W * 0.016, base - H * 0.185, W * 0.032, H * 0.06);
        c.fillStyle = 'rgba(255,220,140,.95)';
        c.fillRect(vx - W * 0.02, base - H * 0.198, W * 0.04, H * 0.016);
        const lg = c.createRadialGradient(vx, base - H * 0.19, 1, vx, base - H * 0.19, W * 0.05);
        lg.addColorStop(0, 'rgba(255,230,160,.9)'); lg.addColorStop(1, 'rgba(255,210,120,0)');
        c.fillStyle = lg;
        c.beginPath(); c.arc(vx, base - H * 0.19, W * 0.05, 0, 7); c.fill();
        // crater glow
        const cg = c.createRadialGradient(vx, base - H * 0.13, 1, vx, base - H * 0.13, W * 0.06);
        cg.addColorStop(0, 'rgba(255,122,60,.6)'); cg.addColorStop(1, 'rgba(255,90,40,0)');
        c.fillStyle = cg;
        c.beginPath(); c.arc(vx, base - H * 0.132, W * 0.06, 0, 7); c.fill();
      });
      scene.add.image(0, 0, 'at-isle').setOrigin(0).setDepth(-70);
      // the lighthouse beam, sweeping forever
      const beamKey = canvasTex(scene, 'at-beam', 220 * K, 26 * K, (c, w, h) => {
        const g2 = c.createLinearGradient(0, 0, w, 0);
        g2.addColorStop(0, 'rgba(255,236,180,.85)'); g2.addColorStop(1, 'rgba(255,236,180,0)');
        c.fillStyle = g2;
        c.beginPath(); c.moveTo(0, h * 0.4); c.lineTo(w, 0); c.lineTo(w, h); c.lineTo(0, h * 0.6); c.closePath(); c.fill();
      });
      const beam = scene.add.image(W * 0.66, sy - H * 0.19, beamKey)
        .setOrigin(0, 0.5).setBlendMode('ADD').setAlpha(cfg.lava ? 0.8 : 0.45).setDepth(-69);
      scene.tweens.add({ targets: beam, angle: { from: 150, to: 390 }, duration: 6000, repeat: -1 });
      celestial(scene, W * 0.2, H * 0.12, 24 * K, cfg.cave ? 0xaef0ff : cfg.storm ? 0x9cb0c8 : 0xfff0c8,
        { crescent: cfg.cave || cfg.kraken, depth: -88 });
      driftClouds(scene, {
        n: cfg.storm ? 4 : 2, tint: cfg.storm ? 0x3c4a5c : 0xffffff,
        alpha: cfg.storm ? 0.8 : 0.5, yBand: [0.04, 0.22], depth: -76,
        speed: cfg.storm ? 46 : 9,
      });
      // gulls working the wind (they stay home in a hurricane)
      if (!cfg.storm && !cfg.cave) {
        const gullKey = canvasTex(scene, 'at-gull', 30 * K, 12 * K, (c, w, h) => {
          c.strokeStyle = 'rgba(240,248,255,.9)'; c.lineWidth = h * 0.2; c.lineCap = 'round';
          c.beginPath(); c.moveTo(0, h * 0.7); c.quadraticCurveTo(w * 0.25, 0, w * 0.5, h * 0.6); c.stroke();
          c.beginPath(); c.moveTo(w * 0.5, h * 0.6); c.quadraticCurveTo(w * 0.75, 0, w, h * 0.7); c.stroke();
        });
        for (let i = 0; i < 2; i++) {
          const gull = scene.add.image(W * (0.3 + i * 0.3), H * (0.16 + i * 0.08), gullKey).setDepth(-68).setAlpha(0.85);
          scene.tweens.add({ targets: gull, x: gull.x + 60 * K, y: gull.y - 20 * K, duration: 3600 + i * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          scene.tweens.add({ targets: gull, scaleY: 0.6, duration: 260, yoyo: true, repeat: -1 });
        }
      }
      // palms leaning over the cannon deck
      canvasTex(scene, 'at-palm', 110 * K, 150 * K, (c, w, h) => {
        c.strokeStyle = '#4a3018'; c.lineWidth = w * 0.07; c.lineCap = 'round';
        c.beginPath(); c.moveTo(w * 0.12, h); c.quadraticCurveTo(w * 0.2, h * 0.4, w * 0.46, h * 0.16); c.stroke();
        c.fillStyle = '#2c6a3c';
        for (let i = 0; i < 6; i++) {
          const a = -0.4 + i * 0.5;
          c.beginPath();
          c.ellipse(w * 0.46 + Math.cos(a) * w * 0.2, h * 0.16 + Math.sin(a) * h * 0.1, w * 0.22, h * 0.035, a, 0, 7);
          c.fill();
        }
        c.fillStyle = '#8a5a2a';
        c.beginPath(); c.arc(w * 0.46, h * 0.19, w * 0.04, 0, 7); c.fill();
        c.beginPath(); c.arc(w * 0.52, h * 0.22, w * 0.04, 0, 7); c.fill();
      });
      const palm = scene.add.image(-6 * K, sy - 12 * K, 'at-palm').setOrigin(0, 1).setDepth(15);
      scene.tweens.add({ targets: palm, angle: cfg.storm ? 6 : 2.4, duration: cfg.storm ? 900 : 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      // the sea
      seaGfx = scene.add.graphics().setDepth(8);
      // cave ceiling
      if (cfg.cave) {
        const ceil = scene.add.graphics().setDepth(6);
        ceil.fillStyle(0x1c1c2c, 1);
        ceil.beginPath();
        ceil.moveTo(0, 0);
        for (let x = 0; x <= W; x += W / 10) ceil.lineTo(x, H * 0.1 + Math.sin(x / 40) * 12 * K + (x % (W / 5) === 0 ? 30 * K : 0));
        ceil.lineTo(W, 0);
        ceil.closePath(); ceil.fillPath();
        scene.matter.add.rectangle(W / 2, H * 0.07, W, H * 0.16, { isStatic: true, restitution: 0.8, label: 'ceiling' });
      }
      if (cfg.storm) {
        scene.add.particles(0, 0, 'fx-streak', {
          x: { min: 0, max: W }, y: -20,
          speedY: { min: 500 * K, max: 700 * K }, speedX: { min: -160 * K, max: -80 * K },
          scale: { min: 0.4 * K, max: 0.8 * K }, alpha: 0.3, tint: 0x8ab8dc,
          lifespan: 900, frequency: 40, advance: 900,
        }).setDepth(30).setAngle(10);
      }

      // deck + cannon
      const deck = scene.add.graphics().setDepth(11);
      deck.fillStyle(0x3c2010, 1);
      deck.fillRect(0, sy - 16 * K, 120 * K, H - sy + 16 * K);
      deck.fillStyle(0x5c3414, 1);
      for (let i = 0; i < 4; i++) deck.fillRect(0, sy - 12 * K + i * 14 * K, 120 * K, 4 * K);
      carriage = scene.add.image(CANNON(scene).x, CANNON(scene).y + 14 * K, canvasTex(scene, 'at-carriage', 54 * K, 34 * K, PAINT.carriage)).setDepth(13);
      cannon = scene.add.image(CANNON(scene).x, CANNON(scene).y, canvasTex(scene, 'at-cannon', 74 * K, 34 * K, PAINT.cannon)).setDepth(14).setOrigin(0.3, 0.5);

      // floor under the whole sea so wreckage never falls out of the world
      scene.matter.add.rectangle(W / 2, H + 30 * K, W * 2, 60 * K, { isStatic: true });

      buildShip(scene, K, W * 0.62, false);
      buildShip(scene, K, W * 0.88, cfg.antenna);

      if (cfg.bottles) {
        for (let i = 0; i < 3; i++) {
          const img = scene.add.image(W * (0.4 + i * 0.16), sy + 10 * K, canvasTex(scene, 'at-bottle', 26 * K, 40 * K, PAINT.bottle)).setDepth(10);
          scene.tweens.add({ targets: img, y: img.y - 6 * K, angle: 8, duration: 1200 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          bottles.push({ img, hit: false });
        }
      }
      if (cfg.kraken) {
        kraken = { img: scene.add.image(W * 0.42, sy + 90 * K, canvasTex(scene, 'at-tent', 90 * K, 190 * K, PAINT.tentacle)).setDepth(9), phase: 0 };
      }

      aimGfx = scene.add.graphics().setDepth(18);

      scene.matter.world.on('collisionstart', (ev) => {
        for (const pair of ev.pairs) {
          const a = pair.bodyA, b = pair.bodyB;
          const pieceBody = a.pieceRef ? a : b.pieceRef ? b : null;
          const other = pieceBody === a ? b : a;
          if (pieceBody && other.label === 'ball') {
            const piece = pieceBody.pieceRef;
            if (piece.kind === 'keg') explodeKeg(scene, K, piece);
            else if (ball?.lava) explodeKeg(scene, K, { img: piece.img, exploded: false, scored: piece.scored, kind: 'keg' });
            if (piece.kind === 'antenna' && !piece.scored) {
              piece.scored = true;
              api.score(100);
              glyphBanner(scene, 'TREASURE SIGNAL +100', '#ffd24a', 26 * K);
              slowmo(scene, 0.3, 500);
              flash(scene, 0xffd24a, 150, 0.5);
              collectTo(scene, piece.img.x, piece.img.y, W - 30 * K, 20 * K, 0xffd24a, 16);
              api.sfx('pr');
            }
            if (cfg.parrots && piece.kind === 'mast' && Math.random() < 0.7) {
              launchParrot(scene, K, piece.img.x, piece.img.y - 40 * K);
            }
            burst(scene, other.position.x, other.position.y, cfg.accent, { n: 8, speed: 240 * K, scale: 0.4 * K });
            shake(scene, 0.006, 90);
          }
        }
      });

      scene.input.on('pointerdown', (p) => { aiming = true; aimAt = { x: p.x, y: p.y }; });
      scene.input.on('pointermove', (p) => { if (aiming) aimAt = { x: p.x, y: p.y }; });
      scene.input.on('pointerup', () => {
        if (!aiming) return;
        aiming = false;
        if (scene.time.now < reloadAt || !aimAt) return;
        fire(scene, K);
      });
    },

    update(t, dtMs) {
      const scene = this;
      const dt = Math.min(dtMs, 64) / 1000;
      const K = unit(scene);
      const W = scene.scale.width, H = scene.scale.height;
      const sy = seaY(scene);
      const now = scene.time.now;

      // living sea
      seaGfx.clear();
      seaGfx.fillStyle(cfg.sea, 1);
      seaGfx.beginPath();
      seaGfx.moveTo(0, sy);
      for (let x = 0; x <= W; x += W / 16) {
        seaGfx.lineTo(x, sy + Math.sin(now / 700 + x / (40 * K)) * 4 * K);
      }
      seaGfx.lineTo(W, H); seaGfx.lineTo(0, H);
      seaGfx.closePath(); seaGfx.fillPath();
      seaGfx.fillStyle(0xffffff, 0.06);
      for (let i = 0; i < 5; i++) {
        seaGfx.fillRect((i * W / 5 + now / 40) % W, sy + (10 + i * 14) * K, 46 * K, 2 * K);
      }

      // aim guide with trajectory memory
      aimGfx.clear();
      if (aiming && aimAt && now >= reloadAt) {
        const c = CANNON(scene);
        const dx = aimAt.x - c.x, dy = aimAt.y - c.y;
        const ang = Math.atan2(dy, dx);
        cannon.setRotation(ang);
        const pow = Math.min(Math.hypot(dx, dy), 210 * K) / (210 * K);
        const speed = (14 + pow * 15) * K;
        let px = c.x + Math.cos(ang) * 42 * K, py = c.y + Math.sin(ang) * 42 * K;
        let vx = Math.cos(ang) * speed, vy = Math.sin(ang) * speed;
        aimGfx.fillStyle(0xffffff, 0.85);
        for (let i = 0; i < 16; i++) {
          // matter velocity is px/tick at 60fps; integrate the same way
          for (let s = 0; s < 3; s++) { vy += 1 * K * 0.55; px += vx; py += vy; }
          if (py > sy) break;
          aimGfx.fillCircle(px, py, (4.5 - i * 0.2) * K);
        }
      }

      // wind (storm world) rides the ball
      if (cfg.storm && ball?.img.body) {
        wind = Math.sin(now / 3100) * 0.0016;
        try { scene.matter.body.applyForce(ball.img.body, ball.img.body.position, { x: wind, y: 0 }); } catch { /* gone */ }
      }

      // kraken sweep: bat the ball for double
      if (kraken) {
        kraken.phase += dt;
        const up = (Math.sin(kraken.phase * 0.9) + 1) / 2; // 0..1
        kraken.img.y = sy + 150 * K - up * 210 * K;
        kraken.img.setAngle(Math.sin(kraken.phase * 2.2) * 6);
        if (ball?.img.body && !ball.batted && up > 0.55
          && Math.abs(ball.img.x - kraken.img.x) < 40 * K && ball.img.y > kraken.img.y - 90 * K && ball.img.y < kraken.img.y + 90 * K) {
          ball.batted = true;
          try {
            scene.matter.body.setVelocity(ball.img.body, { x: Math.abs(ball.img.body.velocity.x) * 1.5 + 6 * K, y: -Math.abs(ball.img.body.velocity.y) * 0.6 - 4 * K });
          } catch { /* gone */ }
          glyphBanner(scene, 'KRAKEN BAT ×2', '#9c6ee8', 26 * K);
          slowmo(scene, 0.35, 380);
          shake(scene, 0.012, 180);
          squash(scene, kraken.img, 'x');
          api.sfx('pr');
          api.haptic([14, 40, 14]);
        }
      }

      // bottles
      for (const bt of bottles) {
        if (!bt.hit && ball?.img.active && Math.abs(ball.img.x - bt.img.x) < 22 * K && Math.abs(ball.img.y - bt.img.y) < 30 * K) {
          bt.hit = true;
          api.score(15);
          floatScore(scene, bt.img.x, bt.img.y - 30 * K, 'MESSAGE +15', '#3adcc8', 15 * K);
          collectTo(scene, bt.img.x, bt.img.y, W - 30 * K, 20 * K, 0x3adcc8, 8);
          burst(scene, bt.img.x, bt.img.y, 0x3adcc8, { n: 12, speed: 260 * K, scale: 0.5 * K });
          api.note(noteStep++);
          bt.img.destroy();
        }
      }

      // pieces knocked into the sea: score once, then float forever
      const mult = ball?.batted ? 2 : 1;
      for (const ship of ships) {
        let downed = 0;
        for (const piece of ship.pieces) {
          if (!piece.img.active || !piece.img.body) { downed++; continue; }
          if (!piece.scored && piece.kind !== 'hull' && piece.img.y > sy - 6 * K) {
            piece.scored = true;
            const pts = pieceKindPts(piece.kind) * mult;
            api.score(pts);
            api.note(noteStep++);
            floatScore(scene, piece.img.x, piece.img.y - 24 * K, `${piece.kind === 'captain' ? 'CAPTAIN OVERBOARD ' : ''}+${pts}`, '#ffd24a', piece.kind === 'captain' ? 17 * K : 14 * K, );
            burst(scene, piece.img.x, sy, 0x9cc8ec, { n: 12, speed: 240 * K, scale: 0.5 * K, gravityY: 500 * K });
            if (piece.kind === 'captain') api.sfx('objDone');
          }
          if (piece.scored) downed++;
          // buoyancy: what falls in the water stays in the water
          if (piece.img.y > sy + 12 * K) {
            try {
              scene.matter.body.applyForce(piece.img.body, piece.img.body.position, { x: 0, y: -0.0075 * piece.img.body.mass });
              scene.matter.body.setVelocity(piece.img.body, {
                x: piece.img.body.velocity.x * 0.96,
                y: piece.img.body.velocity.y * 0.9,
              });
            } catch { /* gone */ }
          }
        }
        // the objective is legible and always reachable: dunk the captain
        if (ship.alive && (ship.captain.scored || !ship.captain.img.active)) {
          ship.alive = false;
          api.score(50);
          glyphBanner(scene, 'SHIP SILENCED +50', '#ffd24a', 28 * K);
          zoomPunch(scene, 1.09, 300);
          api.sfx('pr');
          api.haptic([16, 40, 16, 40, 16]);
          scene.time.delayedCall(1400, () => {
            if (ships.filter((s) => s.alive).length < 2) buildShip(scene, K, W * (0.6 + Math.random() * 0.28), cfg.antenna && Math.random() < 0.5);
          });
        }
      }

      // spent cannonball cleanup
      if (ball?.img.active) {
        const b = ball.img.body;
        if (ball.img.y > sy + 40 * K || ball.img.x > W + 60 * K || ball.img.x < -60 * K
          || (b && Math.hypot(b.velocity.x, b.velocity.y) < 0.4 && ball.img.y > sy - 20 * K)) {
          if (ball.img.y > sy - 4 * K && ball.img.y < sy + 44 * K) {
            burst(scene, ball.img.x, sy, 0x9cc8ec, { n: 14, speed: 280 * K, scale: 0.55 * K, gravityY: 600 * K });
          }
          const dead = ball;
          ball = null;
          scene.tweens.add({ targets: dead.img, alpha: 0, duration: 300, onComplete: () => { try { dead.img.destroy(); } catch { /* gone */ } } });
        }
      }
    },
  };
}

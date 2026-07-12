// SLINGSHOT — real physics (Matter.js). Drag back, aim, let fly. Knock the
// targets off their perches; the wreckage is the reward. Worlds re-theme the
// ammo, the blocks and the targets.
import { TAU, rand, clamp, glow, burst, stepParts, drawParts, popText, stepPops, drawPops } from '../engine.js';

export const TITLE = 'Slingshot';

export const WORLDS = {
  'atoll-wreck': {
    name: 'Cannon Deck', ammo: 'cannonball', ammoColor: '#2a2a34', block: 'crate', blockColor: '#6a3a1c',
    target: 'parrot', targetColors: ['#e83a4e', '#2fb56b', '#3a8fd9'], sky: ['#7ac8ec', '#ffd98a'],
  },
  'yeti-village': {
    name: 'Snowball Siege', ammo: 'snowball', ammoColor: '#eef4f8', block: 'ice', blockColor: '#8fd0e8',
    target: 'snowman', targetColors: ['#f4fafd'], sky: ['#c890d8', '#5c4a8c'],
  },
  'dojo-dragon': {
    name: 'Pearl Sling', ammo: 'pearl', ammoColor: '#ffd24a', block: 'scroll', blockColor: '#e8d5ae',
    target: 'spirit', targetColors: ['#3fae6b', '#7ab8ff'], sky: ['#6a3a9c', '#2c1c5c'],
  },
};

let matterReady = null;
export function load() {
  matterReady ??= new Promise((resolve, reject) => {
    if (window.Matter) return resolve();
    const s = document.createElement('script');
    s.src = 'vendor/matter.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('physics failed to load'));
    document.head.appendChild(s);
  });
  return matterReady;
}

export function create(eng, api, cfg) {
  const M = window.Matter;
  const { Engine, Bodies, Body, Composite, Events } = M;
  const parts = [];
  const pops = [];
  const world = Engine.create({ gravity: { x: 0, y: 1 } });
  const W = () => eng.W, H = () => eng.H;

  const groundY = eng.H - 46;
  const ground = Bodies.rectangle(eng.W / 2, groundY + 20, eng.W * 2, 40, { isStatic: true, friction: 0.9 });
  Composite.add(world.world, ground);

  const ANCHOR = { x: eng.W * 0.24, y: groundY - 110 };
  let ammo = null;         // current projectile body (waiting or flying)
  let aiming = false;
  let aim = { x: ANCHOR.x, y: ANCHOR.y };
  let reloadIn = 0;
  let targets = [];        // {body, popped, color}
  let blocks = [];
  let wave = 0;
  let shake = 0;

  function newAmmo() {
    ammo = Bodies.circle(ANCHOR.x, ANCHOR.y, 13, { density: 0.004, restitution: 0.4, friction: 0.6 });
    Body.setStatic(ammo, true);
    Composite.add(world.world, ammo);
  }

  function buildWave() {
    wave++;
    for (const b of [...blocks, ...targets.map((t) => t.body)]) Composite.remove(world.world, b);
    blocks = [];
    targets = [];
    const baseX = eng.W * 0.72;
    const bw = 34, bh = 26;
    const layers = Math.min(4, 2 + Math.floor(wave / 2));
    for (let row = 0; row < layers; row++) {
      const count = layers - row;
      for (let i = 0; i < count; i++) {
        const x = baseX + (i - (count - 1) / 2) * (bw + 4) + rand(-2, 2);
        const y = groundY - bh / 2 - row * (bh + 3);
        const b = Bodies.rectangle(x, y, bw, bh, { friction: 0.8, restitution: 0.05, density: 0.002 });
        blocks.push(b);
        Composite.add(world.world, b);
      }
    }
    const nT = Math.min(3, 1 + Math.floor(wave / 2));
    for (let i = 0; i < nT; i++) {
      const x = baseX + (i - (nT - 1) / 2) * (bw + 6) * 1.6;
      const y = groundY - layers * (bh + 3) - 20;
      const t = Bodies.circle(x, y, 15, { friction: 0.6, restitution: 0.2, density: 0.0018 });
      targets.push({ body: t, popped: false, color: cfg.targetColors[i % cfg.targetColors.length], wob: rand(0, TAU) });
      Composite.add(world.world, t);
    }
  }

  newAmmo();
  buildWave();

  Events.on(world, 'collisionStart', (ev) => {
    for (const pair of ev.pairs) {
      for (const t of targets) {
        if (t.popped) continue;
        if (pair.bodyA === t.body || pair.bodyB === t.body) {
          const other = pair.bodyA === t.body ? pair.bodyB : pair.bodyA;
          const impulse = Math.hypot(t.body.velocity.x - (other.velocity?.x ?? 0), t.body.velocity.y - (other.velocity?.y ?? 0));
          if (impulse > 4 || other === ammo) popTarget(t);
        }
      }
    }
  });

  function popTarget(t) {
    if (t.popped) return;
    t.popped = true;
    Composite.remove(world.world, t.body);
    const gain = 25;
    api.score(gain);
    shake = 1;
    popText(pops, t.body.position.x, t.body.position.y - 20, `+${gain}`, '#ffd24a');
    burst(parts, t.body.position.x, t.body.position.y, t.color, 16, 260);
    api.haptic([12, 30, 12]);
    api.sfx('objDone');
    if (targets.every((q) => q.popped)) {
      api.score(50);
      popText(pops, eng.W / 2, eng.H * 0.3, 'WAVE CLEAR +50', '#3adcc8');
      api.sfx('pr');
      setTimeout(() => buildWave(), 900);
    }
  }

  function drawBody(ctx, b, kind, color) {
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    switch (kind) {
      case 'crate':
        ctx.fillStyle = color;
        ctx.fillRect(-17, -13, 34, 26);
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
        ctx.strokeRect(-17, -13, 34, 26);
        ctx.beginPath(); ctx.moveTo(-17, -13); ctx.lineTo(17, 13); ctx.moveTo(17, -13); ctx.lineTo(-17, 13); ctx.stroke();
        break;
      case 'ice':
        ctx.fillStyle = 'rgba(143,208,232,.85)';
        ctx.fillRect(-17, -13, 34, 26);
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
        ctx.strokeRect(-17, -13, 34, 26);
        ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-2, 0); ctx.stroke();
        break;
      case 'scroll':
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(-17, -13, 34, 26, 8); ctx.fill();
        ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(17, 0); ctx.stroke();
        break;
    }
    ctx.restore();
  }

  function drawTarget(ctx, t, time) {
    const b = t.body;
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    switch (cfg.target) {
      case 'parrot':
        ctx.fillStyle = t.color;
        ctx.beginPath(); ctx.ellipse(0, 2, 10, 13, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -13, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath(); ctx.moveTo(6, -13); ctx.lineTo(13, -10); ctx.lineTo(6, -8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1c1208';
        ctx.beginPath(); ctx.arc(2.4, -14, 1.6, 0, TAU); ctx.fill();
        break;
      case 'snowman':
        ctx.fillStyle = '#f4fafd';
        ctx.beginPath(); ctx.arc(0, 5, 11, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -9, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1c3348';
        ctx.beginPath(); ctx.arc(-2.6, -10, 1.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2.6, -10, 1.3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff8a3c';
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, -6.5); ctx.lineTo(0, -5.4); ctx.closePath(); ctx.fill();
        break;
      case 'spirit':
        glow(ctx, 0, 0, 24, t.color, 0.6);
        ctx.fillStyle = t.color;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0c0814';
        ctx.beginPath(); ctx.arc(-3.4, -2, 1.8, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(3.4, -2, 1.8, 0, TAU); ctx.fill();
        break;
    }
    ctx.restore();
  }

  return {
    onDown(p) {
      if (ammo && ammo.isStatic && Math.hypot(p.x - ANCHOR.x, p.y - ANCHOR.y) < 90) {
        aiming = true;
        aim = { x: p.x, y: p.y };
      }
    },
    onMove(p) {
      if (!aiming) return;
      const dx = p.x - ANCHOR.x, dy = p.y - ANCHOR.y;
      const d = Math.min(95, Math.hypot(dx, dy));
      const a = Math.atan2(dy, dx);
      aim = { x: ANCHOR.x + Math.cos(a) * d, y: ANCHOR.y + Math.sin(a) * d };
    },
    onUp() {
      if (!aiming || !ammo) return;
      aiming = false;
      const dx = ANCHOR.x - aim.x, dy = ANCHOR.y - aim.y;
      const power = Math.hypot(dx, dy);
      if (power < 12) { Body.setPosition(ammo, ANCHOR); return; } // too soft, reset
      Body.setPosition(ammo, aim);
      Body.setStatic(ammo, false);
      Body.setVelocity(ammo, { x: dx * 0.19, y: dy * 0.19 });
      api.sfx('tap');
      api.haptic(10);
      reloadIn = 1.4;
      const flying = ammo;
      ammo = null;
      setTimeout(() => { try { Composite.remove(world.world, flying); } catch { /* gone */ } }, 6000);
    },
    update(dt) {
      shake = Math.max(0, shake - dt * 4);
      M.Engine.update(world, Math.min(dt * 1000, 33));
      if (!ammo && !aiming) {
        reloadIn -= dt;
        if (reloadIn <= 0) newAmmo();
      }
      // blocks knocked off the platform edge score small points
      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        if (b.position.y > eng.H + 60 || b.position.x < -60 || b.position.x > eng.W + 60) {
          Composite.remove(world.world, b);
          blocks.splice(i, 1);
          api.score(3);
        }
      }
      stepParts(parts, dt, 200);
      stepPops(pops, dt);
    },
    render(ctx, w, h) {
      ctx.save();
      if (shake > 0) ctx.translate(rand(-1, 1) * shake * 6, rand(-1, 1) * shake * 6);
      // ground
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
      // sling posts
      ctx.strokeStyle = '#8a5a2a';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ANCHOR.x - 16, groundY); ctx.lineTo(ANCHOR.x - 10, ANCHOR.y + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ANCHOR.x + 16, groundY); ctx.lineTo(ANCHOR.x + 10, ANCHOR.y + 6); ctx.stroke();
      // bands + trajectory hint while aiming
      const ap = aiming ? aim : (ammo?.isStatic ? ANCHOR : null);
      if (ap) {
        ctx.strokeStyle = '#c9884a';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(ANCHOR.x - 10, ANCHOR.y); ctx.lineTo(ap.x, ap.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ANCHOR.x + 10, ANCHOR.y); ctx.lineTo(ap.x, ap.y); ctx.stroke();
      }
      if (aiming) {
        const dx = (ANCHOR.x - aim.x) * 0.19, dy = (ANCHOR.y - aim.y) * 0.19;
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        let sx = aim.x, sy = aim.y, vx = dx * 60, vy = dy * 60;
        for (let i = 0; i < 9; i++) {
          sx += vx * 0.05; sy += vy * 0.05; vy += 980 * 0.05;
          ctx.beginPath(); ctx.arc(sx, sy, 3 - i * 0.2, 0, TAU); ctx.fill();
        }
      }
      // bodies
      for (const b of blocks) drawBody(ctx, b, cfg.block, cfg.blockColor);
      for (const t of targets) if (!t.popped) drawTarget(ctx, t);
      // ammo
      const drawAmmoAt = (x, y) => {
        if (cfg.ammo === 'snowball') { ctx.fillStyle = '#f4fafd'; ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.fill(); }
        else if (cfg.ammo === 'pearl') { glow(ctx, x, y, 24, '#ffd24a', 0.5); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill(); }
        else { ctx.fillStyle = '#2a2a34'; ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x - 4, y - 4, 4, 0, TAU); ctx.fill(); }
      };
      if (ammo) drawAmmoAt(aiming ? aim.x : ammo.position.x, aiming ? aim.y : ammo.position.y);
      for (const b of Composite.allBodies(world.world)) {
        if (b === ground || b === ammo || blocks.includes(b) || targets.some((t) => t.body === b)) continue;
        // in-flight projectiles
        if (b.circleRadius) drawAmmoAt(b.position.x, b.position.y);
      }
      ctx.restore();
      drawParts(ctx, parts);
      drawPops(ctx, pops);
      if (!aiming && ammo?.isStatic) {
        ctx.textAlign = 'center';
        ctx.font = '700 12px "Geist Mono", monospace';
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.fillText('Drag the sling back, then let go', w / 2, 26);
      }
    },
  };
}

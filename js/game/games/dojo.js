// IAIDO SLASH — Mount Volcano Dojo. Objects arc across the screen; one tap
// draws the blade. Slash the sacred, spare the dangerous.
import { TAU, rand, pick, circleHit, glow, burst, stepParts, drawParts, popText, stepPops, drawPops } from '../engine.js';

export const TITLE = 'Iaido Slash';

export const WORLDS = {
  'dojo-stairs': { name: 'Petals on the Stairs', spawnMs: 700, gravity: 320, speed: 1, objs: [{ kind: 'petal', color: '#e8a0b4', r: 15, pts: 8, w: 5 }, { kind: 'pearl', color: '#ffd24a', r: 11, pts: 16, w: 1 }] },
  'dojo-falls': { name: 'Koi Leap', spawnMs: 860, gravity: 420, speed: 1.05, fromBottom: true, objs: [{ kind: 'koi', color: '#e8843c', r: 20, pts: 12, w: 4 }, { kind: 'drop', color: '#8fc8e8', r: 10, pts: 6, w: 3 }] },
  'dojo-summit': { name: 'Ember Storm', spawnMs: 640, gravity: 300, speed: 1.1, objs: [{ kind: 'ember', color: '#ff8a3c', r: 14, pts: 8, w: 5 }], hazard: { kind: 'bomb', color: '#241014', r: 17, rate: 0.26 } },
  'dojo-bamboo': { name: 'Grove Cutter', spawnMs: 680, gravity: 280, speed: 1, objs: [{ kind: 'leaf', color: '#7ab868', r: 15, pts: 8, w: 5 }, { kind: 'firefly', color: '#ffe08a', r: 8, pts: 15, w: 2 }] },
  'dojo-torii': { name: 'Wisp Cutter', spawnMs: 740, gravity: 220, speed: 0.95, objs: [{ kind: 'wisp', color: '#7ab8ff', r: 14, pts: 10, w: 4 }, { kind: 'petal', color: '#d97a94', r: 14, pts: 6, w: 3 }] },
  'dojo-snow': { name: 'Falling Winter', spawnMs: 620, gravity: 150, speed: 0.9, objs: [{ kind: 'flake', color: '#eef4fa', r: 13, pts: 8, w: 5 }, { kind: 'icicle', color: '#bfe0f2', r: 12, pts: 14, w: 2, fast: true }] },
  'dojo-hall': { name: 'Snuff the Candles', spawnMs: 760, gravity: 0, speed: 1, floaty: true, objs: [{ kind: 'flame', color: '#ffb84d', r: 14, pts: 10, w: 5 }], hazard: { kind: 'lantern', color: '#e05a5a', r: 16, rate: 0.2 } },
};

export function create(eng, api, cfg) {
  const objs = [];
  const parts = [];
  const pops = [];
  const slashes = []; // {x1,y1,x2,y2,t}
  let spawnIn = 0.4;
  let combo = 0;
  let elapsed = 0;
  let flash = 0;

  const weighted = [];
  for (const o of cfg.objs) for (let i = 0; i < (o.w ?? 1); i++) weighted.push(o);

  function spawn() {
    const isHazard = cfg.hazard && Math.random() < cfg.hazard.rate;
    const proto = isHazard ? cfg.hazard : pick(weighted);
    const fromLeft = Math.random() < 0.5;
    const W = eng.W, H = eng.H;
    let o;
    if (cfg.floaty) {
      o = { x: rand(W * 0.12, W * 0.88), y: H + 20, vx: rand(-14, 14), vy: -rand(48, 84), rot: 0 };
    } else if (cfg.fromBottom) {
      o = { x: rand(W * 0.15, W * 0.85), y: H + 24, vx: rand(-40, 40), vy: -rand(H * 0.95, H * 1.25), rot: rand(0, TAU) };
    } else {
      o = {
        x: fromLeft ? -24 : W + 24,
        y: rand(H * 0.45, H * 0.8),
        vx: (fromLeft ? 1 : -1) * rand(W * 0.28, W * 0.42) * cfg.speed,
        vy: -rand(H * 0.55, H * 0.8) * (proto.fast ? 1.2 : 1),
        rot: rand(0, TAU),
      };
    }
    objs.push({ ...o, kind: proto.kind, color: proto.color, r: proto.r, pts: proto.pts ?? 0, hazard: isHazard, spin: rand(-3, 3) });
  }

  function drawObj(ctx, o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.fillStyle = o.color;
    switch (o.kind) {
      case 'petal':
        ctx.beginPath(); ctx.ellipse(0, 0, o.r, o.r * 0.62, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.ellipse(-o.r * 0.3, -o.r * 0.2, o.r * 0.3, o.r * 0.18, 0, 0, TAU); ctx.fill();
        break;
      case 'koi':
        ctx.beginPath(); ctx.ellipse(0, 0, o.r, o.r * 0.55, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(o.r, 0); ctx.lineTo(o.r + 12, -8); ctx.lineTo(o.r + 12, 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1c2c36'; ctx.beginPath(); ctx.arc(-o.r * 0.45, -3, 2.4, 0, TAU); ctx.fill();
        break;
      case 'ember': case 'firefly': case 'wisp':
        glow(ctx, 0, 0, o.r * 2.4, o.color, 0.6);
        ctx.beginPath(); ctx.arc(0, 0, o.r * 0.62, 0, TAU); ctx.fill();
        break;
      case 'drop':
        ctx.beginPath(); ctx.arc(0, 0, o.r * 0.8, 0, TAU); ctx.fill();
        break;
      case 'leaf':
        ctx.beginPath(); ctx.ellipse(0, 0, o.r, o.r * 0.44, 0.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(20,40,16,.5)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-o.r * 0.8, 0.5); ctx.lineTo(o.r * 0.8, -0.5); ctx.stroke();
        break;
      case 'flake': {
        ctx.strokeStyle = o.color; ctx.lineWidth = 2.4;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * o.r, Math.sin(a) * o.r); ctx.stroke();
        }
        break;
      }
      case 'icicle':
        ctx.beginPath(); ctx.moveTo(-o.r * 0.5, -o.r); ctx.lineTo(o.r * 0.5, -o.r); ctx.lineTo(0, o.r * 1.3); ctx.closePath(); ctx.fill();
        break;
      case 'flame':
        glow(ctx, 0, 0, o.r * 2.2, o.color, 0.55);
        ctx.beginPath();
        ctx.moveTo(0, -o.r * 1.35);
        ctx.quadraticCurveTo(o.r, -o.r * 0.1, 0, o.r);
        ctx.quadraticCurveTo(-o.r, -o.r * 0.1, 0, -o.r * 1.35);
        ctx.fill();
        break;
      case 'pearl':
        glow(ctx, 0, 0, o.r * 2, o.color, 0.5);
        ctx.beginPath(); ctx.arc(0, 0, o.r * 0.75, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-o.r * 0.25, -o.r * 0.25, o.r * 0.2, 0, TAU); ctx.fill();
        break;
      case 'bomb':
        ctx.beginPath(); ctx.arc(0, 0, o.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(o.r * 0.4, -o.r * 0.8); ctx.quadraticCurveTo(o.r, -o.r * 1.5, o.r * 0.4, -o.r * 1.8); ctx.stroke();
        glow(ctx, o.r * 0.4, -o.r * 1.8, 7, '#ffd24a', 0.9);
        break;
      case 'lantern':
        ctx.beginPath(); ctx.ellipse(0, 0, o.r * 0.8, o.r, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(122,31,18,.8)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-o.r * 0.7, 0); ctx.lineTo(o.r * 0.7, 0); ctx.stroke();
        break;
    }
    ctx.restore();
  }

  return {
    update(dt) {
      elapsed += dt;
      flash = Math.max(0, flash - dt * 3);
      spawnIn -= dt;
      const rate = cfg.spawnMs / 1000 * Math.max(0.55, 1 - elapsed / 180);
      if (spawnIn <= 0) { spawn(); spawnIn = rate * rand(0.75, 1.25); }
      for (let i = objs.length - 1; i >= 0; i--) {
        const o = objs[i];
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.vy += cfg.gravity * dt;
        o.rot += o.spin * dt;
        const gone = cfg.floaty ? o.y < -30 : o.y > eng.H + 50;
        if (gone) {
          if (!o.hazard && !cfg.floaty && combo > 0) { combo = 0; }
          if (cfg.floaty && !o.hazard) { combo = 0; popText(pops, o.x, 30, 'Escaped!', '#e8a0b4'); }
          objs.splice(i, 1);
        }
      }
      // taps = blade draws
      for (const t of eng.input.taps) {
        let hit = null;
        for (const o of objs) if (circleHit(t.x, t.y, 34, o.x, o.y, o.r)) { hit = o; break; }
        slashes.push({ x1: t.x - 34, y1: t.y + 22, x2: t.x + 34, y2: t.y - 22, t: 0 });
        if (!hit) continue;
        objs.splice(objs.indexOf(hit), 1);
        if (hit.hazard) {
          combo = 0;
          api.score(-20);
          flash = 1;
          popText(pops, hit.x, hit.y, '-20', '#ff5d7a');
          burst(parts, hit.x, hit.y, '#ff5d7a', 14, 220);
          api.haptic([20, 30, 20]);
          api.sfx('tap');
        } else {
          combo++;
          const gain = hit.pts + Math.min(10, combo);
          api.score(gain);
          popText(pops, hit.x, hit.y, `+${gain}`, hit.color);
          burst(parts, hit.x, hit.y, hit.color, 10);
          api.haptic(8);
          api.sfx(combo % 8 === 0 ? 'objDone' : 'tap');
        }
      }
      for (let i = slashes.length - 1; i >= 0; i--) {
        slashes[i].t += dt;
        if (slashes[i].t > 0.18) slashes.splice(i, 1);
      }
      stepParts(parts, dt);
      stepPops(pops, dt);
    },
    render(ctx, W, H) {
      if (flash > 0) { ctx.fillStyle = `rgba(255,60,80,${flash * 0.16})`; ctx.fillRect(0, 0, W, H); }
      for (const o of objs) drawObj(ctx, o);
      ctx.lineCap = 'round';
      for (const s of slashes) {
        ctx.globalAlpha = 1 - s.t / 0.18;
        ctx.strokeStyle = '#f2e6d0';
        ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      drawParts(ctx, parts);
      drawPops(ctx, pops);
      if (combo >= 3) {
        ctx.textAlign = 'center';
        ctx.font = '700 13px "Geist Mono", monospace';
        ctx.fillStyle = '#ffd24a';
        ctx.fillText(`combo ×${combo}`, W / 2, 26);
      }
    },
  };
}

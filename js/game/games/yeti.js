// SLALOM — Yeti Ski Resort. Hold to carve left, release to carve right.
// The mountain scrolls forever; the gates do not move for anyone.
import { TAU, rand, clamp, circleHit, glow, burst, stepParts, drawParts, popText, stepPops, drawPops } from '../engine.js';

export const TITLE = 'Slalom';

export const WORLDS = {
  'yeti-lift': { name: 'Under the Chairs', speed: 210, turn: 340, gateGap: 130, obstacle: { kind: 'pylon', rate: 0.3 } },
  'yeti-diamond': { name: 'Double Diamond', speed: 285, turn: 380, gateGap: 112, obstacle: { kind: 'rock', rate: 0.4 } },
  'yeti-disco': { name: 'Strobe Run', speed: 225, turn: 340, gateGap: 126, obstacle: { kind: 'speaker', rate: 0.3 }, strobe: true },
  'yeti-springs': { name: 'Steam Weave', speed: 215, turn: 340, gateGap: 126, obstacle: { kind: 'rock', rate: 0.25 }, steam: true },
  'yeti-icebar': { name: 'Black Ice', speed: 230, turn: 210, gateGap: 134, obstacle: { kind: 'bottle', rate: 0.3 }, slippery: true },
  'yeti-groomer': { name: 'Corduroy Lines', speed: 235, turn: 350, gateGap: 124, obstacle: { kind: 'pylon', rate: 0.25 }, night: true },
  'yeti-aurora': { name: 'Northern Run', speed: 220, turn: 340, gateGap: 126, obstacle: { kind: 'tree', rate: 0.3 }, aurora: true },
};

export function create(eng, api, cfg) {
  const parts = [];
  const pops = [];
  const gates = [];   // {y, cx, scored}
  const obs = [];     // {x, y, kind, vx}
  const trail = [];   // {x, y, t}
  let px = eng.W / 2;
  let vx = 0;
  let held = false;
  let combo = 0;
  let stun = 0;
  let t = 0;
  let nextGateY = eng.H + 60;
  let gateCx = eng.W / 2;

  function spawnRow() {
    gateCx = clamp(gateCx + rand(-eng.W * 0.3, eng.W * 0.3), eng.W * 0.2, eng.W * 0.8);
    gates.push({ y: nextGateY, cx: gateCx, scored: false, i: gates.length });
    if (Math.random() < cfg.obstacle.rate) {
      let ox = rand(30, eng.W - 30);
      if (Math.abs(ox - gateCx) < cfg.gateGap) ox = clamp(gateCx + Math.sign(ox - gateCx || 1) * (cfg.gateGap + 40), 26, eng.W - 26);
      obs.push({ x: ox, y: nextGateY + rand(60, 130), kind: cfg.obstacle.kind, vx: cfg.sled && Math.random() < 0.5 ? rand(-70, 70) : 0 });
    }
    nextGateY += rand(190, 240);
  }
  while (nextGateY < eng.H * 2.5) spawnRow();

  function drawObstacle(ctx, o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    switch (o.kind) {
      case 'tree':
        ctx.fillStyle = '#1c2a4c';
        ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-14, 8); ctx.lineTo(14, 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#eef4f8';
        ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-7, -10); ctx.lineTo(7, -10); ctx.closePath(); ctx.fill();
        break;
      case 'rock':
        ctx.fillStyle = '#5c7a92';
        ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(-8, -10); ctx.lineTo(6, -12); ctx.lineTo(14, 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#eef4f8';
        ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(6, -12); ctx.lineTo(2, -4); ctx.closePath(); ctx.fill();
        break;
      case 'pylon':
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(-5, -26, 10, 34);
        ctx.fillStyle = '#c23b52';
        ctx.fillRect(-7, -26, 14, 8);
        break;
      case 'speaker':
        ctx.fillStyle = '#241640';
        ctx.fillRect(-12, -18, 24, 30);
        ctx.fillStyle = '#8f6fdc';
        ctx.beginPath(); ctx.arc(0, -6, 6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 7, 3.4, 0, TAU); ctx.fill();
        break;
      case 'bottle':
        ctx.fillStyle = '#7ac8b8';
        ctx.beginPath(); ctx.roundRect(-7, -14, 14, 26, 5); ctx.fill();
        ctx.fillRect(-3, -22, 6, 9);
        break;
      case 'sled':
        ctx.fillStyle = '#c23b52';
        ctx.beginPath(); ctx.roundRect(-16, -6, 32, 10, 5); ctx.fill();
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-16, 8); ctx.quadraticCurveTo(-22, 8, -22, 0); ctx.stroke();
        break;
    }
    ctx.restore();
  }

  return {
    onDown() { held = true; },
    onUp() { held = false; },
    update(dt) {
      t += dt;
      stun = Math.max(0, stun - dt);
      const drag = cfg.slippery ? 0.4 : 2.4;
      vx += (held ? -cfg.turn : cfg.turn) * dt;
      vx -= vx * drag * dt;
      vx = clamp(vx, -300, 300);
      px = clamp(px + vx * dt, 18, eng.W - 18);
      const scroll = cfg.speed * dt;

      trail.push({ x: px, y: eng.H * 0.28, t: 0 });
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].y -= scroll;
        trail[i].t += dt;
        if (trail[i].t > 1.4) trail.splice(i, 1);
      }

      for (let i = gates.length - 1; i >= 0; i--) {
        const g = gates[i];
        g.y -= scroll;
        if (!g.scored && g.y < eng.H * 0.28) {
          g.scored = true;
          if (Math.abs(px - g.cx) <= cfg.gateGap / 2) {
            combo++;
            const gain = 10 + Math.min(12, combo);
            api.score(gain);
            popText(pops, g.cx, g.y - 16, `+${gain}`, '#3adcc8');
            api.haptic(7);
            api.sfx(combo % 6 === 0 ? 'objDone' : 'tap');
          } else {
            combo = 0;
            popText(pops, g.cx, g.y - 16, 'Missed gate', '#8a9ac8');
          }
        }
        if (g.y < -60) gates.splice(i, 1);
      }
      for (let i = obs.length - 1; i >= 0; i--) {
        const o = obs[i];
        o.y -= scroll;
        o.x += (o.vx ?? 0) * dt;
        if (o.x < 20 || o.x > eng.W - 20) o.vx *= -1;
        if (stun <= 0 && circleHit(px, eng.H * 0.28, 13, o.x, o.y, 15)) {
          stun = 1;
          combo = 0;
          api.score(-15);
          popText(pops, px, eng.H * 0.28 - 24, '-15', '#ff5d7a');
          burst(parts, px, eng.H * 0.28, '#eef4f8', 14, 220);
          api.haptic([24, 30, 24]);
          api.sfx('tap');
        }
        if (o.y < -60) obs.splice(i, 1);
      }
      nextGateY -= scroll;
      while (nextGateY < eng.H * 2.2) spawnRow();
      stepParts(parts, dt, 30);
      stepPops(pops, dt);
    },
    render(ctx, W, H) {
      // corduroy / piste texture scrolls
      ctx.strokeStyle = cfg.night ? 'rgba(138,154,200,.16)' : 'rgba(120,160,200,.14)';
      ctx.lineWidth = 3;
      const off = (t * cfg.speed) % 26;
      for (let y = -off; y < H; y += 26) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + 8); ctx.stroke();
      }
      // ski trail
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        if (i === 0) ctx.moveTo(p.x - 5, p.y); else ctx.lineTo(p.x - 5, p.y);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        if (i === 0) ctx.moveTo(p.x + 5, p.y); else ctx.lineTo(p.x + 5, p.y);
      }
      ctx.stroke();
      // gates
      for (const g of gates) {
        const half = cfg.gateGap / 2;
        for (const side of [-1, 1]) {
          const x = g.cx + side * half;
          ctx.strokeStyle = '#e8f0f6';
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(x, g.y - 22); ctx.lineTo(x, g.y + 4); ctx.stroke();
          ctx.fillStyle = side < 0 ? '#e0447a' : '#3a8fd9';
          ctx.beginPath();
          ctx.moveTo(x, g.y - 22);
          ctx.lineTo(x + side * 16, g.y - 16);
          ctx.lineTo(x, g.y - 9);
          ctx.closePath();
          ctx.fill();
        }
      }
      for (const o of obs) drawObstacle(ctx, o);
      // the yeti
      ctx.save();
      if (stun > 0 && Math.floor(stun * 10) % 2 === 0) ctx.globalAlpha = 0.4;
      ctx.translate(px, H * 0.28);
      ctx.rotate(clamp(vx / 500, -0.5, 0.5));
      ctx.fillStyle = '#eef4f8';
      ctx.beginPath(); ctx.ellipse(0, 4, 12, 13, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -12, 8.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1c3348';
      ctx.beginPath(); ctx.arc(-2.6, -13, 1.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(2.6, -13, 1.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e0447a';
      ctx.fillRect(-8, -22, 16, 5.4);
      ctx.strokeStyle = '#3a8fd9';
      ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(-8, 30); ctx.moveTo(6, 16); ctx.lineTo(8, 30); ctx.stroke();
      ctx.restore();
      drawParts(ctx, parts);
      drawPops(ctx, pops);
      // world twists on top
      if (cfg.strobe) {
        const phase = Math.sin(t * 4.4);
        if (phase > 0.55) { ctx.fillStyle = 'rgba(16,10,40,.5)'; ctx.fillRect(0, 0, W, H); }
        else if (phase < -0.8) { ctx.fillStyle = 'rgba(255,79,158,.1)'; ctx.fillRect(0, 0, W, H); }
      }
      if (cfg.steam) {
        for (let i = 0; i < 3; i++) {
          const sy = (H * 0.3 + i * H * 0.3 + t * 40) % (H + 120) - 60;
          glow(ctx, W * (0.25 + i * 0.25), sy, 70, 'rgba(238,244,248,.5)', 0.5);
        }
      }
      if (cfg.aurora) {
        ctx.fillStyle = 'rgba(10,16,40,.35)';
        ctx.fillRect(0, 0, W, H);
        glow(ctx, px, H * 0.28, 150, 'rgba(58,220,200,.2)', 0.7);
        ctx.globalAlpha = 0.25;
        const g = ctx.createLinearGradient(0, 0, W, H * 0.3);
        g.addColorStop(0, '#3adca0');
        g.addColorStop(0.5, 'transparent');
        g.addColorStop(1, '#e844b4');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H * 0.3);
        ctx.globalAlpha = 1;
      }
      if (combo >= 3) {
        ctx.textAlign = 'center';
        ctx.font = '700 13px "Geist Mono", monospace';
        ctx.fillStyle = '#3adcc8';
        ctx.fillText(`clean line ×${combo}`, W / 2, 26);
      }
    },
  };
}

// DESCENT — The Deep. Hold to sink, release to rise. Thread the gaps;
// the trench does not forgive, but it does not kill either.
import { TAU, rand, clamp, circleHit, glow, burst, stepParts, drawParts, popText, stepPops, drawPops } from '../engine.js';

export const TITLE = 'Descent';

export const WORLDS = {
  'deep-vents': { name: 'Plume Weaver', speed: 150, gapH: 190, spawnDist: 240, style: 'plume', color: '#ff8f5c', wall: '#0c1e2a' },
  'deep-whalefall': { name: 'Rib Runner', speed: 160, gapH: 180, spawnDist: 230, style: 'rib', color: '#c8d8d4', wall: '#0e2430' },
  'deep-market': { name: 'Lantern Alley', speed: 185, gapH: 165, spawnDist: 210, style: 'lantern', color: '#ff9ad4', wall: '#142e3c' },
  'deep-kelp': { name: 'Kelp Threading', speed: 165, gapH: 175, spawnDist: 225, style: 'kelp', color: '#1c7048', wall: '#0a2a1e' },
  'deep-jelly': { name: 'Jelly Waltz', speed: 150, gapH: 200, spawnDist: 240, style: 'jelly', color: '#ff9ad4', wall: '#141040', pulse: true },
  'deep-subs': { name: 'Minefield', speed: 160, gapH: 195, spawnDist: 250, style: 'hull', color: '#8ff2e0', wall: '#12303c', mine: true },
  'deep-reef': { name: 'Coral Slalom', speed: 190, gapH: 170, spawnDist: 215, style: 'coral', color: '#e0447a', wall: '#0e2a34' },
  'deep-void': { name: 'Blind Descent', speed: 145, gapH: 200, spawnDist: 245, style: 'rock', color: '#38dcc8', wall: '#060d14', dark: true },
};

export function create(eng, api, cfg) {
  const parts = [];
  const pops = [];
  const cols = []; // {x, gapY, gapH, scored, phase, mineY, mineDir}
  let py = eng.H * 0.45;
  let vy = 0;
  let held = false;
  let invuln = 0;
  let combo = 0;
  let dist = 0;
  let t = 0;
  const PX = () => eng.W * 0.3;

  function spawnCol(x) {
    cols.push({
      x,
      gapY: rand(eng.H * 0.22, eng.H * 0.72),
      gapH: cfg.gapH,
      scored: false,
      phase: rand(0, TAU),
      mineY: 0,
      mineDir: Math.random() < 0.5 ? 1 : -1,
    });
  }
  spawnCol(eng.W + 80);
  spawnCol(eng.W + 80 + cfg.spawnDist);

  function drawWall(ctx, x, topH, botY, W, H, col) {
    ctx.fillStyle = cfg.wall;
    const w = 46;
    switch (cfg.style) {
      case 'rib':
        ctx.strokeStyle = cfg.color; ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 18, topH * 0.6, x, topH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, botY); ctx.quadraticCurveTo(x - 18, botY + (H - botY) * 0.4, x, H); ctx.stroke();
        break;
      case 'kelp':
        ctx.strokeStyle = cfg.color; ctx.lineWidth = 14; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, 0);
        for (let y = 0; y < topH; y += 24) ctx.lineTo(x + Math.sin(y * 0.06 + t * 2) * 7, y);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, H);
        for (let y = H; y > botY; y -= 24) ctx.lineTo(x + Math.sin(y * 0.06 + t * 2) * 7, y);
        ctx.stroke();
        break;
      case 'plume':
        glow(ctx, x, botY + 30, 60, cfg.color, 0.5);
        ctx.fillRect(x - w / 2, botY, w, H - botY);
        ctx.fillRect(x - w / 2, 0, w, topH);
        break;
      case 'jelly': {
        ctx.fillStyle = cfg.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(x, topH - 16, 30, 24, 0, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x, botY + 16, 30, 24, 0, 0, Math.PI); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = cfg.color; ctx.lineWidth = 2;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath(); ctx.moveTo(x + i * 9, topH - 12); ctx.lineTo(x + i * 9 + Math.sin(t * 3 + i) * 5, 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + i * 9, botY + 12); ctx.lineTo(x + i * 9 + Math.sin(t * 3 + i) * 5, H); ctx.stroke();
        }
        break;
      }
      default:
        ctx.fillRect(x - w / 2, 0, w, topH);
        ctx.fillRect(x - w / 2, botY, w, H - botY);
        ctx.fillStyle = col;
        ctx.fillRect(x - w / 2, topH - 6, w, 6);
        ctx.fillRect(x - w / 2, botY, w, 6);
    }
  }

  return {
    onDown() { held = true; },
    onUp() { held = false; },
    update(dt) {
      t += dt;
      invuln = Math.max(0, invuln - dt);
      vy += (held ? 620 : -520) * dt;
      vy = clamp(vy, -340, 380);
      py = clamp(py + vy * dt, 26, eng.H - 26);
      if (py <= 26 || py >= eng.H - 26) vy *= 0.4;
      dist += cfg.speed * dt;

      for (let i = cols.length - 1; i >= 0; i--) {
        const c = cols[i];
        c.x -= cfg.speed * dt;
        const gapH = cfg.pulse ? c.gapH + Math.sin(t * 2.4 + c.phase) * 26 : c.gapH;
        const topH = c.gapY - gapH / 2;
        const botY = c.gapY + gapH / 2;
        if (cfg.mine) {
          c.mineY = Math.sin(t * 1.8 + c.phase) * (gapH / 2 - 24);
        }
        if (!c.scored && c.x < PX() - 20) {
          c.scored = true;
          combo++;
          const gain = 5 + Math.min(10, combo);
          api.score(gain);
          popText(pops, PX(), py - 30, `+${gain}`, cfg.color);
          api.sfx(combo % 6 === 0 ? 'objDone' : 'tap');
          api.haptic(6);
        }
        if (invuln <= 0 && Math.abs(c.x - PX()) < 34) {
          const hitWall = py - 15 < topH || py + 15 > botY;
          const hitMine = cfg.mine && circleHit(PX(), py, 15, c.x, c.gapY + c.mineY, 13);
          if (hitWall || hitMine) {
            invuln = 1;
            combo = 0;
            api.score(-12);
            popText(pops, PX(), py, '-12', '#ff5d7a');
            burst(parts, PX(), py, '#ff5d7a', 12, 200);
            api.haptic([20, 30, 20]);
            api.sfx('tap');
          }
        }
        if (c.x < -80) {
          cols.splice(i, 1);
          spawnCol(Math.max(eng.W + 60, (cols[cols.length - 1]?.x ?? eng.W) + cfg.spawnDist));
        }
      }
      stepParts(parts, dt, 20);
      stepPops(pops, dt);
    },
    render(ctx, W, H) {
      for (const c of cols) {
        const gapH = cfg.pulse ? c.gapH + Math.sin(t * 2.4 + c.phase) * 26 : c.gapH;
        drawWall(ctx, c.x, c.gapY - gapH / 2, c.gapY + gapH / 2, W, H, cfg.color);
        if (cfg.mine) {
          const my = c.gapY + c.mineY;
          ctx.fillStyle = '#0c1e28';
          ctx.beginPath(); ctx.arc(c.x, my, 11, 0, TAU); ctx.fill();
          for (let a = 0; a < TAU; a += TAU / 6) {
            ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * 11, my + Math.sin(a) * 11);
            ctx.lineTo(c.x + Math.cos(a) * 17, my + Math.sin(a) * 17);
            ctx.lineWidth = 3; ctx.strokeStyle = '#0c1e28'; ctx.stroke();
          }
          glow(ctx, c.x, my, 8, '#ff5d5d', 0.8);
        }
      }
      // the diver
      const px = PX();
      ctx.save();
      if (invuln > 0 && Math.floor(invuln * 10) % 2 === 0) ctx.globalAlpha = 0.35;
      ctx.translate(px, py);
      ctx.rotate(clamp(vy / 600, -0.5, 0.5));
      glow(ctx, 0, 0, 34, cfg.color, 0.35);
      ctx.fillStyle = '#e8d5ae';
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c9884a';
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-24, -8); ctx.lineTo(-24, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0e2028';
      ctx.beginPath(); ctx.arc(7, -2, 3.4, 0, TAU); ctx.fill();
      ctx.restore();
      // bubbles trail
      if (Math.random() < 0.3) burst(parts, px - 18, py, 'rgba(200,245,255,.7)', 1, 30);
      drawParts(ctx, parts);
      drawPops(ctx, pops);
      if (cfg.dark) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        const g = ctx.createRadialGradient(px, py, 30, px, py, 130);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        glow(ctx, px, py, 130, 'rgba(56,220,200,.16)', 0.5);
      }
      if (combo >= 3) {
        ctx.textAlign = 'center';
        ctx.font = '700 13px "Geist Mono", monospace';
        ctx.fillStyle = cfg.color;
        ctx.fillText(`depth chain ×${combo}`, W / 2, 26);
      }
    },
  };
}

// SNAPSHOT — Cryptid National Park. Creatures peek out of the dark;
// photograph them before they vanish. Do not photograph the locals.
import { TAU, rand, pick, circleHit, glow, burst, stepParts, drawParts, popText, stepPops, drawPops } from '../engine.js';

export const TITLE = 'Snapshot';

// spots are [x%, y%] of the canvas
const SPREAD = [[0.2, 0.3], [0.75, 0.24], [0.5, 0.46], [0.22, 0.66], [0.78, 0.62], [0.5, 0.82]];
const HIGH = [[0.25, 0.2], [0.72, 0.16], [0.5, 0.34], [0.3, 0.55], [0.7, 0.52], [0.5, 0.74]];

export const WORLDS = {
  'park-trail': { name: 'Sasquatch Watch', spots: SPREAD, upMs: 1150, spawnMs: 900, target: { kind: 'squatch', pts: 15, color: '#6a5230' }, decoy: { kind: 'owl', rate: 0.22, color: '#c9a86a' } },
  'park-mothman': { name: 'Moth Lens', spots: HIGH, upMs: 1000, spawnMs: 850, target: { kind: 'mothman', pts: 16, color: '#3c3050' }, decoy: { kind: 'owl', rate: 0.24, color: '#c9a86a' } },
  'park-marina': { name: 'Surface Shots', spots: [[0.2, 0.62], [0.4, 0.72], [0.6, 0.64], [0.8, 0.72], [0.3, 0.84], [0.7, 0.85]], upMs: 1100, spawnMs: 880, target: { kind: 'nessie', pts: 15, color: '#2a7a5c' }, decoy: { kind: 'buoy', rate: 0.24, color: '#d94f3c' } },
  'park-ufo': { name: "Don't Shoot the Cow", spots: SPREAD, upMs: 950, spawnMs: 800, target: { kind: 'alien', pts: 16, color: '#7ad48a' }, decoy: { kind: 'cow', rate: 0.3, color: '#e8dcc0' } },
  'park-meadow': { name: 'Jackalope Reflex', spots: SPREAD, upMs: 720, spawnMs: 660, target: { kind: 'jackalope', pts: 14, color: '#8a6a3a' }, decoy: { kind: 'gnome', rate: 0.2, color: '#d94f3c' } },
  'park-tower': { name: 'Lamp Moths', spots: HIGH, upMs: 900, spawnMs: 780, target: { kind: 'moth', pts: 13, color: '#e8dfc0' }, decoy: { kind: 'owl', rate: 0.24, color: '#c9a86a' } },
  'park-canyon': { name: 'Eyes in the Rocks', spots: SPREAD, upMs: 880, spawnMs: 800, target: { kind: 'chupacabra', pts: 16, color: '#8a3c2c' }, decoy: { kind: 'tumbleweed', rate: 0.26, color: '#c9a86a' } },
  'park-bog': { name: 'Frogs, Not Wisps', spots: SPREAD, upMs: 1000, spawnMs: 820, target: { kind: 'frog', pts: 14, color: '#7ad48a' }, decoy: { kind: 'wisp', rate: 0.42, color: '#7ae0d0' } },
};

export function create(eng, api, cfg) {
  const parts = [];
  const pops = [];
  const crits = []; // {spot, x, y, kind, decoy, t, phase:'up'|'stay'|'down', pts, color}
  let spawnIn = 0.5;
  let flashT = 0;
  let combo = 0;
  const busy = new Set();

  function spawn() {
    const free = cfg.spots.map((_, i) => i).filter((i) => !busy.has(i));
    if (!free.length) return;
    const si = pick(free);
    busy.add(si);
    const decoy = Math.random() < cfg.decoy.rate;
    const proto = decoy ? cfg.decoy : cfg.target;
    crits.push({
      si,
      x: cfg.spots[si][0] * eng.W,
      y: cfg.spots[si][1] * eng.H,
      kind: proto.kind,
      color: proto.color,
      pts: cfg.target.pts,
      decoy,
      t: 0,
      up: 0.22,
      stay: cfg.upMs / 1000 * rand(0.85, 1.2),
      down: 0.2,
    });
  }

  function drawCritter(ctx, c, vis) {
    const r = 30;
    ctx.save();
    ctx.translate(c.x, c.y + (1 - vis) * 34);
    ctx.globalAlpha = Math.min(1, vis * 1.4);
    const col = c.color;
    switch (c.kind) {
      case 'squatch':
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(0, 6, r * 0.8, r, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -r * 0.7, r * 0.55, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd98a';
        ctx.beginPath(); ctx.arc(-6, -r * 0.75, 2.6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(6, -r * 0.75, 2.6, 0, TAU); ctx.fill();
        break;
      case 'mothman':
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(0, 4, r * 0.4, r * 0.75, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(-r * 1.4, -r, -r * 1.2, 8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(6, -4); ctx.quadraticCurveTo(r * 1.4, -r, r * 1.2, 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff2f2f';
        ctx.beginPath(); ctx.arc(-5, -14, 3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -14, 3, 0, TAU); ctx.fill();
        break;
      case 'nessie':
        ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-4, 22); ctx.quadraticCurveTo(-2, -18, 12, -22); ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(14, -24, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#dff2ec';
        ctx.beginPath(); ctx.arc(12, -26, 2, 0, TAU); ctx.fill();
        break;
      case 'alien':
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(0, -6, r * 0.55, r * 0.7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#10180f';
        ctx.beginPath(); ctx.ellipse(-8, -10, 5, 8, 0.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(8, -10, 5, 8, -0.4, 0, TAU); ctx.fill();
        break;
      case 'cow':
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(0, 2, r * 0.85, r * 0.6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3a2a1c';
        ctx.beginPath(); ctx.ellipse(-8, -2, 7, 5, 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8a0b4';
        ctx.beginPath(); ctx.ellipse(10, 8, 8, 6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#10180f';
        ctx.beginPath(); ctx.arc(-2, -8, 2.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -8, 2.2, 0, TAU); ctx.fill();
        break;
      case 'jackalope':
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-8, -20, 4, 12, -0.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(8, -20, 4, 12, 0.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#4a3820'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-12, -22); ctx.lineTo(-18, -32); ctx.moveTo(-12, -26); ctx.lineTo(-20, -26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12, -22); ctx.lineTo(18, -32); ctx.moveTo(12, -26); ctx.lineTo(20, -26); ctx.stroke();
        ctx.fillStyle = '#1c1208';
        ctx.beginPath(); ctx.arc(-5, -2, 2.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -2, 2.2, 0, TAU); ctx.fill();
        break;
      case 'moth':
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-r * 0.8, -r * 0.6); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(r * 0.8, -r * 0.6); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
        break;
      case 'chupacabra': {
        ctx.fillStyle = '#1c0e0a';
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.55, 0, 0, TAU); ctx.fill();
        glow(ctx, -7, -4, 8, '#ff2f2f', 0.9);
        glow(ctx, 7, -4, 8, '#ff2f2f', 0.9);
        ctx.fillStyle = '#ff2f2f';
        ctx.beginPath(); ctx.arc(-7, -4, 2.6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -4, 2.6, 0, TAU); ctx.fill();
        break;
      }
      case 'frog':
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(0, 4, r * 0.65, r * 0.45, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(-9, -8, 6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(9, -8, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#04120a';
        ctx.beginPath(); ctx.arc(-9, -9, 2.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(9, -9, 2.2, 0, TAU); ctx.fill();
        break;
      case 'owl':
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(0, 2, r * 0.5, r * 0.65, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-7, -8, 6.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -8, 6.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#10180f';
        ctx.beginPath(); ctx.arc(-7, -8, 2.6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -8, 2.6, 0, TAU); ctx.fill();
        break;
      case 'buoy':
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 0.6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f2e8d0';
        ctx.fillRect(-r * 0.45, -4, r * 0.9, 8);
        break;
      case 'gnome':
        ctx.fillStyle = '#3a6ba8';
        ctx.beginPath(); ctx.ellipse(0, 8, r * 0.5, r * 0.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(10, -6); ctx.lineTo(0, -30); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e8dcc0';
        ctx.beginPath(); ctx.ellipse(0, 2, 8, 6, 0, 0, TAU); ctx.fill();
        break;
      case 'tumbleweed':
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU + c.t;
          ctx.beginPath(); ctx.arc(0, 0, r * 0.55, a, a + 2); ctx.stroke();
        }
        break;
      case 'wisp':
        glow(ctx, 0, 0, r * 1.4, col, 0.8);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, TAU); ctx.fill();
        break;
    }
    ctx.restore();
  }

  return {
    update(dt) {
      flashT = Math.max(0, flashT - dt * 4);
      spawnIn -= dt;
      if (spawnIn <= 0) { spawn(); spawnIn = (cfg.spawnMs / 1000) * rand(0.7, 1.2); }
      for (let i = crits.length - 1; i >= 0; i--) {
        const c = crits[i];
        c.t += dt;
        if (c.t >= c.up + c.stay + c.down) {
          busy.delete(c.si);
          crits.splice(i, 1);
          if (!c.decoy) { combo = 0; popText(pops, c.x, c.y - 20, 'Gone…', '#8a9ac8'); }
        }
      }
      for (const tap of eng.input.taps) {
        let shot = null;
        for (const c of crits) if (circleHit(tap.x, tap.y, 36, c.x, c.y, 32)) { shot = c; break; }
        if (!shot) continue;
        busy.delete(shot.si);
        crits.splice(crits.indexOf(shot), 1);
        flashT = 1;
        if (shot.decoy) {
          combo = 0;
          api.score(-20);
          popText(pops, shot.x, shot.y, '-20', '#ff5d7a');
          burst(parts, shot.x, shot.y, '#ff5d7a', 12, 200);
          api.haptic([20, 30, 20]);
          api.sfx('tap');
        } else {
          combo++;
          const gain = shot.pts + Math.min(12, combo * 2);
          api.score(gain);
          popText(pops, shot.x, shot.y, `+${gain}`, '#ffd24a');
          burst(parts, shot.x, shot.y, '#ffd24a', 10);
          api.haptic(8);
          api.sfx(combo % 5 === 0 ? 'objDone' : 'tap');
        }
      }
      stepParts(parts, dt);
      stepPops(pops, dt);
    },
    render(ctx, W, H) {
      // hide spots
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      for (const [sx, sy] of cfg.spots) {
        ctx.beginPath(); ctx.ellipse(sx * W, sy * H + 26, 40, 12, 0, 0, TAU); ctx.fill();
      }
      for (const c of crits) {
        const vis = c.t < c.up ? c.t / c.up
          : c.t < c.up + c.stay ? 1
          : 1 - (c.t - c.up - c.stay) / c.down;
        drawCritter(ctx, c, vis);
      }
      drawParts(ctx, parts);
      drawPops(ctx, pops);
      if (flashT > 0.6) { ctx.fillStyle = `rgba(255,255,255,${(flashT - 0.6) * 0.9})`; ctx.fillRect(0, 0, W, H); }
      if (combo >= 3) {
        ctx.textAlign = 'center';
        ctx.font = '700 13px "Geist Mono", monospace';
        ctx.fillStyle = '#ffd24a';
        ctx.fillText(`film streak ×${combo}`, W / 2, 26);
      }
    },
  };
}

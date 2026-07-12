// WOK CATCH — The Noodle Cosmos. Slide the wok, catch what's good,
// let the junk clatter to the floor of the kitchen at the end of space.
import { TAU, rand, pick, clamp, glow, burst, stepParts, drawParts, popText, stepPops, drawPops } from '../engine.js';

export const TITLE = 'Wok Catch';

export const WORLDS = {
  'wok-inferno': { name: 'Line Rush', gravity: 300, spawnMs: 700, wokW: 96, goods: [{ kind: 'dumpling', pts: 8, w: 4 }, { kind: 'veg', pts: 8, w: 3 }], junks: [{ kind: 'coal', w: 3 }] },
  'wok-steam': { name: 'Dumpling Rain', gravity: 220, spawnMs: 760, wokW: 104, goods: [{ kind: 'dumpling', pts: 8, w: 6 }], junks: [{ kind: 'bone', w: 2 }] },
  'wok-alley': { name: 'Midnight Orders', gravity: 320, spawnMs: 650, wokW: 92, goods: [{ kind: 'noodle', pts: 9, w: 4 }, { kind: 'veg', pts: 7, w: 2 }], junks: [{ kind: 'bolt', w: 3 }] },
  'wok-asteroids': { name: 'Zero-G Catch', gravity: 110, spawnMs: 780, wokW: 96, drift: 60, goods: [{ kind: 'dumpling', pts: 9, w: 4 }, { kind: 'star', pts: 14, w: 1 }], junks: [{ kind: 'bolt', w: 3 }] },
  'wok-nebula': { name: 'Curveball Broth', gravity: 240, spawnMs: 720, wokW: 96, curve: 90, goods: [{ kind: 'egg', pts: 9, w: 4 }, { kind: 'scallion', pts: 7, w: 3 }], junks: [{ kind: 'coal', w: 3 }] },
  'wok-dragon': { name: "The Dragon's Order", gravity: 340, spawnMs: 620, wokW: 92, goods: [{ kind: 'pearl', pts: 10, w: 4 }, { kind: 'dumpling', pts: 8, w: 3 }], junks: [{ kind: 'coal', w: 3 }] },
  'wok-shrine': { name: 'Fortune Harvest', gravity: 260, spawnMs: 740, wokW: 100, goods: [{ kind: 'fortune', pts: 24, w: 2 }, { kind: 'dumpling', pts: 8, w: 4 }], junks: [{ kind: 'bone', w: 2 }] },
  'wok-boba': { name: 'Pearl Bounce', gravity: 300, spawnMs: 700, wokW: 100, bounce: true, goods: [{ kind: 'boba', pts: 9, w: 5 }], junks: [{ kind: 'bolt', w: 2 }] },
};

export function create(eng, api, cfg) {
  const items = [];
  const parts = [];
  const pops = [];
  let wokX = eng.W / 2;
  let spawnIn = 0.4;
  let combo = 0;
  let flash = 0;
  let t = 0;

  const goodBag = [];
  for (const g of cfg.goods) for (let i = 0; i < g.w; i++) goodBag.push(g);
  const junkBag = [];
  for (const j of cfg.junks) for (let i = 0; i < (j.w ?? 1); i++) junkBag.push(j);

  function spawn() {
    const junk = Math.random() < 0.28;
    const proto = junk ? pick(junkBag) : pick(goodBag);
    items.push({
      kind: proto.kind,
      pts: proto.pts ?? 0,
      junk,
      x: rand(24, eng.W - 24),
      y: -20,
      vx: cfg.drift ? rand(-cfg.drift, cfg.drift) : 0,
      vy: rand(10, 50),
      phase: rand(0, TAU),
      rot: rand(0, TAU),
      spin: rand(-2.5, 2.5),
      bounced: false,
    });
  }

  function drawItem(ctx, it) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot);
    switch (it.kind) {
      case 'dumpling':
        ctx.fillStyle = '#f6ead0';
        ctx.beginPath(); ctx.moveTo(-13, 7); ctx.quadraticCurveTo(-13, -9, 0, -9); ctx.quadraticCurveTo(13, -9, 13, 7); ctx.quadraticCurveTo(0, 12, -13, 7); ctx.fill();
        ctx.strokeStyle = '#d9b88a'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-6, -7); ctx.quadraticCurveTo(-4, -11, -2, -8); ctx.moveTo(1, -8); ctx.quadraticCurveTo(3, -12, 5, -8); ctx.stroke();
        ctx.fillStyle = '#4a3218';
        ctx.beginPath(); ctx.arc(-4, 0, 1.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(4, 0, 1.3, 0, TAU); ctx.fill();
        break;
      case 'noodle':
        ctx.strokeStyle = '#f2dfb8'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-12, -8);
        ctx.quadraticCurveTo(0, 2, -2, -2);
        ctx.quadraticCurveTo(8, -10, 12, 8);
        ctx.stroke();
        break;
      case 'veg':
        ctx.fillStyle = '#7ad48a';
        ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0.4, 0, TAU); ctx.fill();
        break;
      case 'scallion':
        ctx.strokeStyle = '#7ad48a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(10, -6); ctx.stroke();
        ctx.strokeStyle = '#e8f4d8';
        ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(-3, 2); ctx.stroke();
        break;
      case 'egg':
        ctx.fillStyle = '#f6ead0';
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 9, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
        break;
      case 'pearl':
        glow(ctx, 0, 0, 18, '#ffd24a', 0.5);
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
        break;
      case 'boba':
        ctx.fillStyle = '#2c1408';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(-3, -3, 2.6, 0, TAU); ctx.fill();
        break;
      case 'fortune':
        ctx.fillStyle = '#fff8ec';
        ctx.fillRect(-13, -5, 26, 10);
        ctx.fillStyle = '#d93a20';
        ctx.fillRect(-13, -5, 4, 10);
        break;
      case 'star':
        glow(ctx, 0, 0, 16, '#ffd24a', 0.6);
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i / 5) * TAU;
          ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
          const b = a + TAU / 10;
          ctx.lineTo(Math.cos(b) * 4.4, Math.sin(b) * 4.4);
        }
        ctx.closePath(); ctx.fill();
        break;
      case 'coal':
        glow(ctx, 0, 0, 14, '#ff6a2c', 0.5);
        ctx.fillStyle = '#241014';
        ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(-4, -8); ctx.lineTo(6, -6); ctx.lineTo(9, 5); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill();
        break;
      case 'bolt':
        ctx.fillStyle = '#8a94a8';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5a6478';
        ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill();
        break;
      case 'bone':
        ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-9, 3); ctx.lineTo(9, -3); ctx.stroke();
        ctx.fillStyle = '#e8dcc0';
        for (const [bx, by] of [[-9, 1], [-11, 5], [9, -5], [11, -1]]) { ctx.beginPath(); ctx.arc(bx, by, 3.2, 0, TAU); ctx.fill(); }
        break;
    }
    ctx.restore();
  }

  return {
    onDown(p) { wokX = p.x; },
    onMove(p) { wokX = p.x; },
    update(dt) {
      t += dt;
      flash = Math.max(0, flash - dt * 3);
      spawnIn -= dt;
      if (spawnIn <= 0) { spawn(); spawnIn = (cfg.spawnMs / 1000) * rand(0.7, 1.15) * Math.max(0.55, 1 - t / 200); }
      wokX = clamp(wokX, cfg.wokW / 2, eng.W - cfg.wokW / 2);
      const wokY = eng.H - 74;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.vy += cfg.gravity * dt;
        if (cfg.curve) it.vx = Math.sin(t * 2 + it.phase) * cfg.curve;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.rot += it.spin * dt;
        if (it.x < 12 || it.x > eng.W - 12) it.vx *= -1;
        // catch test: inside the wok's mouth band
        if (it.y > wokY - 10 && it.y < wokY + 18 && Math.abs(it.x - wokX) < cfg.wokW / 2) {
          items.splice(i, 1);
          if (it.junk) {
            combo = 0;
            api.score(-15);
            flash = 1;
            popText(pops, it.x, wokY - 22, '-15', '#ff5d7a');
            burst(parts, it.x, wokY, '#ff5d7a', 12, 200);
            api.haptic([20, 30, 20]);
            api.sfx('tap');
          } else {
            combo++;
            const gain = it.pts + Math.min(10, combo);
            api.score(gain);
            popText(pops, it.x, wokY - 22, `+${gain}`, '#ffd24a');
            burst(parts, it.x, wokY - 6, '#ffb84d', 8);
            api.haptic(8);
            api.sfx(combo % 7 === 0 ? 'objDone' : 'tap');
          }
          continue;
        }
        if (it.y > eng.H - 26) {
          if (cfg.bounce && !it.junk && !it.bounced) {
            it.bounced = true;
            it.vy = -Math.abs(it.vy) * 0.72;
            continue;
          }
          items.splice(i, 1);
          if (!it.junk) combo = 0;
        }
      }
      stepParts(parts, dt);
      stepPops(pops, dt);
    },
    render(ctx, W, H) {
      if (flash > 0) { ctx.fillStyle = `rgba(255,60,80,${flash * 0.15})`; ctx.fillRect(0, 0, W, H); }
      for (const it of items) drawItem(ctx, it);
      // the wok
      const wokY = H - 74;
      ctx.strokeStyle = '#2a160a';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(wokX, wokY - 4, cfg.wokW / 2, 0.08 * Math.PI, 0.92 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#3a2010';
      ctx.beginPath();
      ctx.arc(wokX, wokY - 4, cfg.wokW / 2 - 4, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#5a3418';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(wokX + cfg.wokW / 2 + 2, wokY - 2);
      ctx.lineTo(wokX + cfg.wokW / 2 + 30, wokY - 14);
      ctx.stroke();
      glow(ctx, wokX, wokY + 10, cfg.wokW * 0.5, '#ff6a2c', 0.18);
      drawParts(ctx, parts);
      drawPops(ctx, pops);
      if (combo >= 3) {
        ctx.textAlign = 'center';
        ctx.font = '700 13px "Geist Mono", monospace';
        ctx.fillStyle = '#ffd24a';
        ctx.fillText(`order streak ×${combo}`, W / 2, 26);
      }
    },
  };
}

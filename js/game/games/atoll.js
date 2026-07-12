// ON AIR — Pirate Radio Atoll. The needle sweeps the dial; tap inside the
// glowing band to lock the signal. Every lock builds the broadcast chain.
import { TAU, rand, clamp, glow, burst, stepParts, drawParts, popText, stepPops, drawPops } from '../engine.js';

export const TITLE = 'On Air';

export const WORLDS = {
  'atoll-wreck': { name: 'First Broadcast', speed: 1.4, bandW: 0.16, minW: 0.07 },
  'atoll-light': { name: 'Beam Keeper', speed: 1.1, bandW: 0.15, minW: 0.065, circular: true },
  'atoll-parrots': { name: 'Squawk Signal', speed: 1.5, bandW: 0.16, minW: 0.075, hop: 2.4 },
  'atoll-kraken': { name: 'Dual Decks', speed: 1.35, bandW: 0.17, minW: 0.08, dual: true },
  'atoll-bottles': { name: 'Slow Waves', speed: 0.95, bandW: 0.2, minW: 0.09 },
  'atoll-skull': { name: 'Cave Frequency', speed: 1.85, bandW: 0.15, minW: 0.06 },
  'atoll-storm': { name: 'Static Storm', speed: 1.45, bandW: 0.17, minW: 0.08, jitter: 0.02 },
  'atoll-antenna': { name: 'Signal Climb', speed: 1.2, bandW: 0.16, minW: 0.06, ramp: 0.09 },
};

export function create(eng, api, cfg) {
  const parts = [];
  const pops = [];
  let t = 0;
  let chain = 0;
  let bandPos = rand(0.2, 0.8);
  let bandW = cfg.bandW;
  let hopIn = cfg.hop ?? 0;
  let staticT = 0;
  let lockFlash = 0;
  let activeNeedle = 0; // kraken alternates
  let speed = cfg.speed;

  const needlePos = (which = 0) => {
    const phase = t * speed + which * Math.PI;
    return (Math.sin(phase) + 1) / 2; // 0..1
  };

  function relocate() {
    let next = rand(0.12, 0.88);
    if (Math.abs(next - bandPos) < 0.18) next = clamp(1 - next, 0.12, 0.88);
    bandPos = next;
  }

  return {
    update(dt) {
      t += dt;
      staticT = Math.max(0, staticT - dt * 3);
      lockFlash = Math.max(0, lockFlash - dt * 3);
      if (cfg.hop) {
        hopIn -= dt;
        if (hopIn <= 0) { relocate(); hopIn = cfg.hop; }
      }
      let jitteredPos = bandPos;
      if (cfg.jitter) jitteredPos = clamp(bandPos + Math.sin(t * 13.7) * cfg.jitter + Math.sin(t * 7.3) * cfg.jitter, 0.06, 0.94);
      this._pos = jitteredPos;

      for (const _tap of eng.input.taps) {
        const n = needlePos(activeNeedle);
        const inBand = Math.abs(n - jitteredPos) <= bandW / 2;
        if (inBand) {
          chain++;
          const gain = 10 + chain * 2;
          api.score(gain);
          lockFlash = 1;
          popText(pops, eng.W / 2, eng.H * 0.32, `+${gain}`, '#ffd24a');
          burst(parts, eng.W * (cfg.circular ? 0.5 : jitteredPos), eng.H / 2, '#ffd24a', 12, 220);
          api.haptic(10);
          api.sfx(chain % 5 === 0 ? 'objDone' : 'tap');
          relocate();
          bandW = Math.max(cfg.minW, bandW * 0.93);
          if (cfg.ramp) speed = cfg.speed + chain * cfg.ramp;
          if (cfg.dual) activeNeedle = 1 - activeNeedle;
        } else {
          chain = 0;
          bandW = cfg.bandW;
          speed = cfg.speed;
          api.score(-5);
          staticT = 1;
          popText(pops, eng.W / 2, eng.H * 0.32, 'static!', '#ff5d7a');
          api.haptic([16, 24, 16]);
        }
      }
      stepParts(parts, dt, 30);
      stepPops(pops, dt);
    },
    render(ctx, W, H) {
      const pos = this._pos ?? bandPos;
      const cy = H * 0.5;
      if (cfg.circular) {
        const cx = W / 2, R = Math.min(W, H) * 0.3;
        ctx.strokeStyle = 'rgba(255,232,196,.25)';
        ctx.lineWidth = 16;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        // band arc
        const a0 = pos * TAU - (bandW * TAU) / 2;
        const a1 = pos * TAU + (bandW * TAU) / 2;
        ctx.strokeStyle = lockFlash > 0 ? '#ffd24a' : 'rgba(255,210,74,.75)';
        ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
        // needle = lighthouse beam
        const na = needlePos() * TAU;
        ctx.strokeStyle = '#ff5d3c';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * (R + 22), cy + Math.sin(na) * (R + 22)); ctx.stroke();
        glow(ctx, cx + Math.cos(na) * R, cy + Math.sin(na) * R, 14, '#ff5d3c', 0.8);
        ctx.fillStyle = '#3a1430';
        ctx.beginPath(); ctx.arc(cx, cy, 26, 0, TAU); ctx.fill();
        glow(ctx, cx, cy, 18, '#ffe9b3', 0.8);
      } else {
        const x0 = W * 0.08, x1 = W * 0.92, span = x1 - x0;
        // rail
        ctx.strokeStyle = 'rgba(255,232,196,.3)';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke();
        // ticks
        ctx.strokeStyle = 'rgba(255,232,196,.35)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 20; i++) {
          const x = x0 + (i / 20) * span;
          ctx.beginPath(); ctx.moveTo(x, cy - 14); ctx.lineTo(x, cy - 22); ctx.stroke();
        }
        // band
        const bx = x0 + pos * span;
        const bw = bandW * span;
        glow(ctx, bx, cy, bw, '#ffd24a', lockFlash > 0 ? 0.7 : 0.4);
        ctx.fillStyle = lockFlash > 0 ? '#ffd24a' : 'rgba(255,210,74,.8)';
        ctx.beginPath();
        ctx.roundRect(bx - bw / 2, cy - 9, bw, 18, 9);
        ctx.fill();
        // needles
        const draw = (which, active) => {
          const nx = x0 + needlePos(which) * span;
          ctx.strokeStyle = active ? '#ff5d3c' : 'rgba(255,93,60,.35)';
          ctx.lineWidth = active ? 5 : 3;
          ctx.beginPath(); ctx.moveTo(nx, cy - 34); ctx.lineTo(nx, cy + 34); ctx.stroke();
          if (active) glow(ctx, nx, cy, 16, '#ff5d3c', 0.7);
        };
        if (cfg.dual) { draw(0, activeNeedle === 0); draw(1, activeNeedle === 1); }
        else draw(0, true);
      }
      if (staticT > 0) {
        ctx.globalAlpha = staticT * 0.25;
        for (let i = 0; i < 60; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#8a9ac8';
          ctx.fillRect(rand(0, W), rand(0, H), 2.4, 2.4);
        }
        ctx.globalAlpha = 1;
      }
      drawParts(ctx, parts);
      drawPops(ctx, pops);
      ctx.textAlign = 'center';
      ctx.font = '700 13px "Geist Mono", monospace';
      ctx.fillStyle = chain >= 1 ? '#ffd24a' : 'rgba(255,232,196,.5)';
      ctx.fillText(chain >= 1 ? `broadcast chain ×${chain}` : 'Tap when the needle crosses the gold band', W / 2, H * 0.5 + 74);
    },
  };
}

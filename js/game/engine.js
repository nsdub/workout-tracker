// The arcade's chassis: a dependency-free canvas 2D micro-engine.
// Fixed-step simulation bound to a WALL-CLOCK deadline (the rest timer) —
// backgrounding pauses the simulation but never the clock, so "rest over"
// is always the truth. Pure math helpers are exported for node tests.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const circleHit = (ax, ay, ar, bx, by, br) => {
  const dx = ax - bx, dy = ay - by, r = ar + br;
  return dx * dx + dy * dy <= r * r;
};
export const rectHit = (ax, ay, aw, ah, bx, by, bw, bh) =>
  ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

const STEP = 1000 / 60;

export function createEngine(canvas, { deadline, onEnd }) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0;

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  // One-thumb input model: a queue of taps (drained each frame by the
  // game), plus live held/drag state.
  const input = { down: false, x: 0, y: 0, taps: [] };
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e) => {
    const p = pos(e);
    input.down = true; input.x = p.x; input.y = p.y;
    input.taps.push(p);
    game?.onDown?.(p);
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!input.down) return;
    const p = pos(e);
    input.x = p.x; input.y = p.y;
    game?.onMove?.(p);
  };
  const onUp = () => { input.down = false; game?.onUp?.(); };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  let game = null;
  let raf = null;
  let last = 0;
  let acc = 0;
  let running = false;
  let ended = false;

  function frame(t) {
    if (!running) return;
    if (Date.now() >= deadline) { end(); return; }
    acc = Math.min(acc + (t - last), 250); // cap: no spiral after jank
    last = t;
    try {
      while (acc >= STEP) { game.update(STEP / 1000); acc -= STEP; }
      ctx.clearRect(0, 0, W, H);
      game.render(ctx, W, H);
    } catch (err) {
      fail(err);
      return;
    }
    input.taps.length = 0;
    raf = requestAnimationFrame(frame);
  }

  function end() {
    if (ended) return;
    ended = true;
    running = false;
    if (raf) cancelAnimationFrame(raf);
    onEnd?.();
  }

  let onError = null;
  function fail(err) {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    console.error('game crashed', err);
    onError?.(err);
  }

  const onVis = () => {
    if (document.visibilityState === 'visible' && running) {
      last = performance.now();
      acc = 0; // paused, not fast-forwarded — the deadline kept draining
      raf = requestAnimationFrame(frame);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };
  document.addEventListener('visibilitychange', onVis);

  return {
    input,
    get W() { return W; },
    get H() { return H; },
    timeLeft: () => Math.max(0, deadline - Date.now()),
    start(g) {
      game = g;
      running = true;
      ended = false;
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    },
    setOnError(fn) { onError = fn; },
    destroy() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    },
  };
}

// ——— shared drawing bits (every game leans on these) ———

export function glow(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function burst(parts, x, y, color, n = 10, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    parts.push({ x, y, vx: Math.cos(a) * rand(40, speed), vy: Math.sin(a) * rand(40, speed), life: rand(0.3, 0.7), t: 0, color, r: rand(1.5, 4) });
  }
}

export function stepParts(parts, dt, gravity = 60) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    if (p.t >= p.life) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += gravity * dt;
  }
}

export function drawParts(ctx, parts) {
  for (const p of parts) {
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// floating score text ("+15") that drifts up and fades
export function popText(pops, x, y, text, color) {
  pops.push({ x, y, text, color, t: 0, life: 0.8 });
}

export function stepPops(pops, dt) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.t += dt;
    p.y -= 42 * dt;
    if (p.t >= p.life) pops.splice(i, 1);
  }
}

export function drawPops(ctx, pops) {
  ctx.textAlign = 'center';
  ctx.font = '700 16px "Geist Mono", monospace';
  for (const p of pops) {
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

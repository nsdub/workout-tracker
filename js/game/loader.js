// Loads the real engine — Phaser 3 (WebGL renderer, Arcade + Matter
// physics, particles, tweens, cameras) — exactly once, on the first Play
// tap. 1.2 MB, vendored and served by our own service worker, so after the
// first session it comes from cache even offline.
//
// iOS can stall a fetch forever without ever firing an error event, which
// used to leave a dead promise cached here — one bad signal poisoned every
// later rest that workout. A watchdog now races the script load: on timeout
// or error the cached promise is un-poisoned, so the next tap starts fresh.
let loading = null;
const BOOT_MS = 12000; // generous for gym cell; a true stall feels infinite anyway

// Phaser's Graphics has no quadraticCurveTo — that's a Canvas2D method. The
// game art calls g.quadraticCurveTo(...) on Graphics objects in dozens of
// places (with Canvas2D order: control point, then end point), which throws
// inside a scene's create() and crashes the whole game for that world. Add the
// method once, sampling the quadratic Bézier into line segments, so every one
// of those calls renders. Canvas2D contexts (fx.js texture drawing) already
// have the native method and are untouched. Idempotent.
function patchGraphics(P) {
  const G = P?.GameObjects?.Graphics?.prototype;
  if (!G || G.quadraticCurveTo) return P;
  const _moveTo = G.moveTo, _lineTo = G.lineTo;
  G.moveTo = function (x, y) { this._qcx = x; this._qcy = y; return _moveTo.call(this, x, y); };
  G.lineTo = function (x, y) { this._qcx = x; this._qcy = y; return _lineTo.call(this, x, y); };
  G.quadraticCurveTo = function (cx, cy, x, y) {
    const x0 = this._qcx ?? cx, y0 = this._qcy ?? cy;
    const N = 18; // smooth enough at game scale, cheap enough for per-frame redraws
    for (let i = 1; i <= N; i++) {
      const t = i / N, u = 1 - t;
      _lineTo.call(this, u * u * x0 + 2 * u * t * cx + t * t * x, u * u * y0 + 2 * u * t * cy + t * t * y);
    }
    this._qcx = x; this._qcy = y;
    return this;
  };
  return P;
}

export function loadPhaser() {
  loading ??= new Promise((resolve, reject) => {
    if (window.Phaser) return resolve(patchGraphics(window.Phaser));
    const s = document.createElement('script');
    let settled = false;
    const giveUp = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(dog);
      loading = null; // a flaky network shouldn't poison every later rest
      s.remove();
      reject(err);
    };
    const dog = setTimeout(() => {
      const err = new Error('game engine stalled loading');
      err.name = 'PhaserTimeout';
      giveUp(err);
    }, BOOT_MS);
    s.src = 'vendor/phaser.min.js';
    s.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(dog);
      if (window.Phaser) resolve(patchGraphics(window.Phaser));
      else { loading = null; s.remove(); reject(new Error('engine loaded but Phaser missing')); }
    };
    s.onerror = () => giveUp(new Error('game engine failed to load'));
    document.head.appendChild(s);
  });
  return loading;
}

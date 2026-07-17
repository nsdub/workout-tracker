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

export function loadPhaser() {
  loading ??= new Promise((resolve, reject) => {
    if (window.Phaser) return resolve(window.Phaser);
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
      if (window.Phaser) resolve(window.Phaser);
      else { loading = null; s.remove(); reject(new Error('engine loaded but Phaser missing')); }
    };
    s.onerror = () => giveUp(new Error('game engine failed to load'));
    document.head.appendChild(s);
  });
  return loading;
}

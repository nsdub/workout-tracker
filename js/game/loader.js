// Loads the real engine — Phaser 3 (WebGL renderer, Arcade + Matter
// physics, particles, tweens, cameras) — exactly once, on the first Play
// tap. 1.2 MB, vendored and served by our own service worker, so after the
// first session it comes from cache even offline.
let loading = null;

export function loadPhaser() {
  loading ??= new Promise((resolve, reject) => {
    if (window.Phaser) return resolve(window.Phaser);
    const s = document.createElement('script');
    s.src = 'vendor/phaser.min.js';
    s.onload = () => (window.Phaser ? resolve(window.Phaser) : reject(new Error('engine loaded but Phaser missing')));
    s.onerror = () => {
      loading = null; // a flaky network shouldn't poison every later rest
      s.remove();
      reject(new Error('game engine failed to load'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

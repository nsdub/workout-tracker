// Offline-first service worker. Shell is cache-first; installs bypass the
// HTTP cache; data/ and the GitHub API are never cached here.
// build: v45 — MUST match js/version.js (tested); a byte-change here is
// what makes every browser notice a new release.
importScripts('js/version.js');
const VERSION = `protocol-${self.PROTOCOL_VERSION}`;

const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'fonts/Rye-latin.woff2',
  'fonts/Cinzel-latin.woff2',
  'fonts/Chewy-latin.woff2',
  'fonts/VT323-latin.woff2',
  'fonts/Shrikhand-latin.woff2',
  'fonts/Shojumaru-latin.woff2',
  'fonts/SpecialElite-latin.woff2',
  'fonts/GeistMono-latin.woff2',
  'fonts/Nunito-latin.woff2',
  'icons/icon.svg',
  'icons/maskable.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/maskable-512.png',
  'js/app.js',
  'js/version.js',
  'js/util.js',
  'js/store.js',
  'js/github.js',
  'js/engine.js',
  'js/components.js',
  'js/worlds.js',
  'js/audio.js',
  'js/game/loader.js',
  'js/game/fx.js',
  'js/game/registry.js',
  'js/game/overlay.js',
  'js/game/games/dojo.js',
  'js/game/games/deep.js',
  'js/game/games/park.js',
  'js/game/games/wok.js',
  'js/game/games/atoll.js',
  'js/game/games/yeti.js',
  'vendor/phaser.min.js',
  'js/views/session.js',
  'js/views/log.js',
  'js/views/plan.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname === 'api.github.com') return;
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/data/')) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('index.html');
        throw new Error('offline');
      });
    })
  );
});

// Tapping the rest-done alert brings the app forward (or opens it) instead of a
// dead notification. Focus an existing window if one is open; else launch.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) return w.focus();
    }
    return self.clients.openWindow?.('./');
  })());
});

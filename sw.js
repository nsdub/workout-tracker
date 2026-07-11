// Offline-first service worker. App shell is cache-first (bump VERSION on
// deploy); the GitHub API is never cached — sync logic owns that traffic.
const VERSION = 'protocol-v5';

const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'fonts/InstrumentSans-latin.woff2',
  'fonts/GeistMono-latin.woff2',
  'icons/icon.svg',
  'icons/maskable.svg',
  'js/app.js',
  'js/util.js',
  'js/store.js',
  'js/github.js',
  'js/engine.js',
  'js/components.js',
  'js/theme.js',
  'js/views/today.js',
  'js/views/history.js',
  'js/views/plan.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
  // Training data is never cached here — localStorage is the offline copy,
  // and a cache-first hit would pin a stale plan forever.
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

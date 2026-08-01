// Service worker for /museum/ — scoped to this directory only, so it never
// touches the training app's own worker at the root.
// build: m3 — bump on every change, or installed copies never notice.
const VERSION = 'museum-m3';
const SHELL = [
  './',
  'index.html',
  'reaction.html',
  'museum.css',
  'museum.js',
  'reaction.css',
  'reaction.js',
  'exhibits.json',
  'reactions.json',
  'manifest.webmanifest',
  'icon.svg',
  'icon-maskable.svg',
];

// Bypass the HTTP cache on install, exactly like the app's worker — a stale
// 200 from the browser cache would install the previous museum over the new one.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // a missing optional file must not block install
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('museum-') && k !== VERSION)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (!url.pathname.includes('/museum/')) return; // never answer for the app

  // Network-first for the record itself, so a redeployed collection is seen
  // immediately; cache-first for the shell, so the building opens offline.
  const isData = url.pathname.endsWith('.json');
  if (isData) {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => (e.request.mode === 'navigate' ? caches.match('index.html') : Promise.reject(new Error('offline')))))
  );
});

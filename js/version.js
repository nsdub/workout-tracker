// Single source of the app build version. Bump on every deploy.
// Classic script on purpose: index.html loads it for the UI and sw.js
// imports it for the cache name, so the two can never drift.
self.PROTOCOL_VERSION = 'v8';

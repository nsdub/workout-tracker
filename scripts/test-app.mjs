#!/usr/bin/env node
// Tests for the code most able to lose data: util, store, and sync.
// Runs in node with localStorage/fetch/navigator stubs. The two invariants
// that matter most: (1) a re-save during an in-flight upload is never lost,
// (2) queued local work is never overwritten by remote state.
import assert from 'node:assert/strict';

// ——— stubs (before any app import) ———
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
let fetchImpl = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
globalThis.fetch = (...args) => fetchImpl(...args);

// Seed a settings blob that PREDATES the cardio field (defaults-merge test)
localStorage.setItem('p3.settings', JSON.stringify({ owner: 'nsdub', repo: 'workout-tracker', branch: 'main', token: '' }));

const { fmtW, weekKey, daysBetween, sessionMins } = await import('../js/util.js');
const { store } = await import('../js/store.js');
const { flushQueue, pullRemote, importSeedBundle } = await import('../js/github.js');

let n = 0;
const ok = (name, fn) => Promise.resolve().then(fn).then(() => { n++; console.log(`  ✓ ${name}`); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');
const resJson = (obj, status = 200) => ({ ok: status < 400, status, json: async () => obj, text: async () => JSON.stringify(obj) });

// ——— util ———
await ok('weekKey crosses year boundaries per ISO', () => {
  assert.equal(weekKey('2025-12-29'), '2026-W01');
  assert.equal(weekKey('2026-01-04'), '2026-W01');
  assert.equal(weekKey('2027-01-01'), '2026-W53');
  assert.equal(weekKey('2026-07-11'), '2026-W28');
});
await ok('fmtW keeps stack fractions, trims integers, dashes null', () => {
  assert.equal(fmtW(172.5), '172.5');
  assert.equal(fmtW(185), '185');
  assert.equal(fmtW(null), '—');
});
await ok('daysBetween', () => {
  assert.equal(daysBetween('2026-07-11', '2027-03-01'), 233);
});
await ok('sessionMins: wall clock, span fallback, and the resumed-draft guard', () => {
  const t0 = 1_000_000_000_000;
  // (a) startedAt-based rounding with the 1-minute floor
  assert.equal(sessionMins(t0, [], t0 + 10_000), 1);
  assert.equal(sessionMins(t0, [t0 + 5000], t0 + 62 * 60000), 62);
  // (b) no startedAt + ≥2 set timestamps → span between first and last set
  assert.equal(sessionMins(null, [t0, t0 + 45 * 60000]), 45);
  assert.equal(sessionMins(null, [t0, t0 + 20_000]), 1); // short span floors to 1
  // (c) no startedAt + <2 timestamps → unknowable
  assert.equal(sessionMins(null, []), null);
  assert.equal(sessionMins(null, [t0]), null);
  // (d) >6h elapsed WITH a valid span → the stale resumed draft defers to the span
  assert.equal(sessionMins(t0, [t0 + 60000, t0 + 50 * 60000], t0 + 26 * 3600000), 49);
  // (e) >6h elapsed with no span → the elapsed value stands
  assert.equal(sessionMins(t0, [t0], t0 + 7 * 3600000), 420);
});

// ——— store ———
await ok('settings defaults merge over pre-existing blobs (no crash on new fields)', () => {
  assert.deepEqual(store.settings.cardio, {});
  assert.equal(store.settings.haptics, true);
  assert.equal(store.settings.owner, 'nsdub');
});
await ok('emit isolates throwing listeners', () => {
  let reached = false;
  const un1 = store.sub(() => { throw new Error('boom'); });
  const un2 = store.sub(() => { reached = true; });
  store.emit();
  un1(); un2();
  assert.equal(reached, true);
});
await ok('enqueue replaces by path, keeping one item per file', () => {
  store.queue = [];
  store.enqueue('data/history/x.json', { v: 1 });
  store.enqueue('data/history/x.json', { v: 2 });
  assert.equal(store.queue.length, 1);
  assert.equal(store.queue[0].content.v, 2);
});
await ok('upsertEntry inserts sorted and replaces same date+type', () => {
  store.history = [];
  store.queue = [];
  store.upsertEntry({ date: '2026-07-11', session_type: 'LegsA', exercises: [] });
  store.upsertEntry({ date: '2026-07-01', session_type: 'PushA', exercises: [] });
  store.upsertEntry({ date: '2026-07-11', session_type: 'LegsA', exercises: [{ id: 'x', name: 'x', sets: [] }] });
  assert.equal(store.history.length, 2);
  assert.equal(store.history[0].date, '2026-07-01');
  assert.equal(store.history[1].exercises.length, 1);
  assert.equal(store.entryPath(store.history[1]), 'data/history/2026-07-11-legsa.json');
});
await ok('pruneDraft drops stale clean drafts, keeps dirty ones', () => {
  store.draft = { date: '2020-01-01', exercises: [{ sets: [{ done: false }] }] };
  store.pruneDraft();
  assert.equal(store.draft, null);
  store.draft = { date: '2020-01-01', exercises: [{ sets: [{ done: true }] }] };
  store.pruneDraft();
  assert.notEqual(store.draft, null);
  store.clearDraft();
});
await ok('syncStatus reflects token/queue/attempts', () => {
  store.settings.token = '';
  assert.equal(store.syncStatus(), 'off');
  store.settings.token = 't';
  store.queue = [];
  assert.equal(store.syncStatus(), 'synced');
  store.queue = [{ path: 'p', content: {}, attempts: 0, queuedAt: 1 }];
  assert.equal(store.syncStatus(), 'pending');
  store.queue[0].attempts = 3;
  assert.equal(store.syncStatus(), 'failed');
  store.queue = [];
});
await ok('quiet upsert refreshes the sync dot only; default upsert full-renders', () => {
  store.history = []; store.queue = [];
  const events = [];
  const un = store.sub((quiet) => events.push(quiet ? 'quiet' : 'full'));
  store.upsertEntry({ date: '2026-07-08', session_type: 'LegsB', exercises: [] }, { quiet: true });
  assert.deepEqual(events, ['quiet'], 'quiet upsert: sync-dot refresh only, no full re-render');
  events.length = 0;
  store.upsertEntry({ date: '2026-07-08', session_type: 'LegsB', exercises: [] });
  assert.deepEqual(events, ['quiet', 'full'], 'default upsert keeps the full-render emit');
  un();
  store.history = []; store.queue = [];
});
await ok('upsertEntry preserves additive mins/startedAt; pruneDraft tolerates them', () => {
  store.history = []; store.queue = [];
  store.upsertEntry({ date: '2026-07-10', session_type: 'PushB', exercises: [], mins: 52, startedAt: 1234567890 });
  const kept = store.history.find((e) => e.date === '2026-07-10');
  assert.equal(kept.mins, 52);
  assert.equal(kept.startedAt, 1234567890);
  assert.equal(store.entryPath(kept), 'data/history/2026-07-10-pushb.json');
  assert.equal(store.queue[0].content.mins, 52, 'the queued upload carries the new fields');
  // a startedAt-bearing dirty draft still survives the prune
  store.draft = { date: '2020-01-01', startedAt: 123, exercises: [{ sets: [{ done: true }] }] };
  assert.equal(store.pruneDraft(), null);
  assert.notEqual(store.draft, null);
  // ...and a clean stale one is handed back for the world-pool refund
  store.draft = { date: '2020-01-01', session_type: 'PushA', world: 'w1', exercises: [{ sets: [{ done: false }] }] };
  const dropped = store.pruneDraft();
  assert.equal(dropped.world, 'w1');
  assert.equal(store.draft, null);
  store.history = []; store.queue = [];
});
await ok('saving a NEW token resets attempts/errors; unrelated saves do not', () => {
  store.queue = [{ path: 'p', content: {}, attempts: 3, lastAttemptAt: 123, lastError: 'GitHub 401: bad', queuedAt: 1 }];
  store.meta.lastError = 'GitHub 401: bad';
  store.meta.lastErrorAt = 123;
  store.settings.token = 'old';
  store.saveSettings({ haptics: false }); // unrelated toggle
  assert.equal(store.queue[0].attempts, 3);
  store.saveSettings({ token: 'old' }); // same value re-saved
  assert.equal(store.queue[0].attempts, 3);
  store.saveSettings({ token: 'fresh' }); // a real change
  assert.equal(store.queue[0].attempts, 0);
  assert.equal(store.queue[0].lastError, null);
  assert.equal(store.meta.lastError, null);
  assert.equal(store.meta.lastErrorAt, null);
  store.saveSettings({ haptics: true });
  store.queue = [];
});
await ok('corrupt localStorage shapes boot to fallbacks instead of crashing', async () => {
  localStorage.setItem('p3.history', JSON.stringify({ not: 'an array' }));
  localStorage.setItem('p3.queue', JSON.stringify('garbage'));
  localStorage.setItem('p3.settings', JSON.stringify([1, 2, 3]));
  localStorage.setItem('p3.meta', JSON.stringify(42));
  localStorage.setItem('p3.remoteIndex', JSON.stringify(null));
  localStorage.setItem('p3.draft', JSON.stringify('nope'));
  const { store: fresh } = await import('../js/store.js?shape=corrupt');
  assert.deepEqual(fresh.history, []);
  assert.deepEqual(fresh.queue, []);
  assert.equal(fresh.settings.owner, 'nsdub', 'defaults survive an array settings blob');
  assert.equal(fresh.draft, null);
  assert.equal(fresh.meta.lastSync, null);
  assert.ok(!Array.isArray(fresh.remoteIndex) && typeof fresh.remoteIndex === 'object');
  // a legitimate stored draft must NEVER be coerced away by the shape guard
  localStorage.setItem('p3.draft', JSON.stringify({ date: '2026-07-17', exercises: [] }));
  const { store: fresh2 } = await import('../js/store.js?shape=valid-draft');
  assert.equal(fresh2.draft.date, '2026-07-17');
  for (const k of ['p3.history', 'p3.queue', 'p3.settings', 'p3.meta', 'p3.remoteIndex', 'p3.draft']) localStorage.removeItem(k);
});
await ok('a failing localStorage write goes red, and the entry still makes the queue', () => {
  store.queue = [];
  store.settings.token = 't';
  store.meta.lastError = null; store.meta.lastErrorAt = null;
  store.meta.lastSync = Date.now() - 1000;
  const realSet = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  try {
    store.upsertEntry({ date: '2026-07-09', session_type: 'PullB', exercises: [] });
  } finally {
    localStorage.setItem = realSet;
  }
  assert.ok(store.meta.lastError?.includes('QuotaExceeded'), 'the failure is recorded, not swallowed');
  assert.equal(store.syncStatus(), 'failed');
  assert.ok(store.queue.some((q) => q.path === 'data/history/2026-07-09-pullb.json'),
    'enqueue-before-write: the night is still bound for GitHub');
  store.queue = []; store.history = [];
  store.meta.lastError = null; store.meta.lastErrorAt = null;
});

// ——— sync: flushQueue ———
await ok('flushQueue uploads and dequeues on success', async () => {
  store.settings.token = 't';
  store.queue = [];
  store.remoteIndex = {};
  store.enqueue('data/history/a.json', { v: 1 });
  fetchImpl = async (url, opts = {}) => {
    if ((opts.method || 'GET') === 'GET') return resJson({}, 404); // no existing sha
    return resJson({ content: { sha: 'newsha' } });
  };
  await flushQueue();
  assert.equal(store.queue.length, 0);
  assert.equal(store.remoteIndex['data/history/a.json'], 'newsha');
});
await ok('flushQueue keeps and marks failed items', async () => {
  store.queue = [];
  store.enqueue('data/history/b.json', { v: 1 });
  fetchImpl = async (url, opts = {}) => {
    if ((opts.method || 'GET') === 'GET') return resJson({}, 404);
    return resJson({ message: 'boom' }, 500);
  };
  await flushQueue();
  assert.equal(store.queue.length, 1);
  assert.equal(store.queue[0].attempts, 1);
  store.queue = [];
});
await ok('INVARIANT: re-save during in-flight upload is never lost', async () => {
  store.queue = [];
  store.enqueue('data/history/c.json', { v: 1 });
  let releasePut;
  const gate = new Promise((r) => { releasePut = r; });
  fetchImpl = async (url, opts = {}) => {
    if ((opts.method || 'GET') === 'GET') return resJson({}, 404);
    await gate; // PUT hangs until released
    return resJson({ content: { sha: 's-old' } });
  };
  const flight = flushQueue();
  await sleep(5);
  store.enqueue('data/history/c.json', { v: 2 }); // user re-saves mid-upload
  await sleep(5);
  releasePut();
  await flight;
  assert.equal(store.queue.length, 1, 'newer write must survive the old upload completing');
  assert.equal(store.queue[0].content.v, 2);
  store.queue = [];
});
await ok("every API request bypasses the HTTP cache (cache: 'no-store')", async () => {
  store.settings.token = 't';
  store.queue = [];
  store.enqueue('data/history/nc.json', { v: 1 });
  const caches = [];
  fetchImpl = async (url, opts = {}) => {
    caches.push(opts.cache);
    if ((opts.method || 'GET') === 'GET') return resJson({}, 404);
    return resJson({ content: { sha: 's' } });
  };
  await flushQueue();
  assert.ok(caches.length >= 2, 'expected the sha GET and the PUT');
  assert.ok(caches.every((c) => c === 'no-store'),
    "GitHub's 60s HTTP cache must never serve a stale sha or file body");
});
await ok('force flush ignores the backoff window (user-initiated sync)', async () => {
  store.queue = [];
  store.enqueue('data/history/f.json', { v: 1 });
  store.queue[0].attempts = 2;
  store.queue[0].lastAttemptAt = Date.now(); // deep inside the backoff window
  let puts = 0;
  fetchImpl = async (url, opts = {}) => {
    if ((opts.method || 'GET') === 'GET') return resJson({}, 404);
    puts += 1;
    return resJson({ content: { sha: 's' } });
  };
  await flushQueue(); // unforced: the window holds
  assert.equal(puts, 0);
  await flushQueue({ force: true }); // a deliberate tap punches through
  assert.equal(puts, 1);
  assert.equal(store.queue.length, 0);
});
await ok('a queued delete lands via the DELETE endpoint with a fresh sha', async () => {
  store.settings.token = 't';
  store.queue = []; store.history = [];
  store.upsertEntry({ date: '2026-07-05', session_type: 'PushA', exercises: [] }, { enqueue: false });
  const entry = store.history[0];
  store.remoteIndex = { 'data/history/2026-07-05-pusha.json': 'sha-stale' };
  store.deleteEntry(entry);
  assert.equal(store.history.length, 0, 'the night leaves local history immediately');
  assert.equal(store.queue.length, 1);
  assert.equal(store.queue[0].op, 'delete');
  assert.equal(store.syncStatus(), 'pending', 'a queued delete shows as pending sync');
  const calls = [];
  fetchImpl = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    if ((opts.method || 'GET') === 'GET') return resJson({ sha: 'sha-live', content: b64({}) });
    return resJson({ content: null, commit: { sha: 'c1' } });
  };
  await flushQueue();
  assert.equal(store.queue.length, 0, 'the delete left the queue after landing');
  const del = calls.find((c) => c.method === 'DELETE');
  assert.ok(del, 'a DELETE request was made');
  assert.equal(del.body.sha, 'sha-live', 'the delete refreshed and sent the LIVE sha, not the stale index one');
  assert.ok(!('data/history/2026-07-05-pusha.json' in store.remoteIndex), 'the remote index forgets the file');
  // deleting a file the remote never had (or already lost) is a success, not an error
  store.deleteEntry({ date: '2026-07-06', session_type: 'PullA', exercises: [] });
  fetchImpl = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET' });
    if ((opts.method || 'GET') === 'GET') return resJson({}, 404);
    throw new Error('DELETE must not fire when the file is already gone');
  };
  await flushQueue();
  assert.equal(store.queue.length, 0, 'an already-gone file dequeues cleanly');
  store.queue = []; store.history = [];
});
await ok('a flush where nothing uploads does not advance lastSync', async () => {
  store.queue = [];
  store.enqueue('data/history/g.json', { v: 1 });
  store.meta.lastSync = 111;
  fetchImpl = async (url, opts = {}) => {
    if ((opts.method || 'GET') === 'GET') return resJson({}, 404);
    return resJson({ message: 'nope' }, 500);
  };
  await flushQueue();
  assert.equal(store.meta.lastSync, 111, 'an all-fail flush must not mask an older error in syncStatus');
  store.queue = [];
});

// ——— sync: pullRemote ———
await ok('INVARIANT: queued paths are never overwritten by remote; new files merge', async () => {
  store.settings.token = 't';
  store.history = [];
  store.queue = [];
  store.remoteIndex = {};
  const localEntry = { date: '2026-07-01', session_type: 'PushA', exercises: [{ id: 'local', name: 'local', sets: [] }] };
  store.upsertEntry(localEntry); // enqueues data/history/2026-07-01-pusha.json
  const remotePlan = { version: 3, marker: 'remote-plan' };
  const remoteEntry = { date: '2026-07-02', session_type: 'PullA', exercises: [] };
  const fetched = [];
  fetchImpl = async (url) => {
    fetched.push(url);
    if (url.includes('data/plan.json')) return resJson({ content: b64(remotePlan), sha: 'plan2' });
    if (url.endsWith('/contents/data/history?ref=main')) {
      return resJson([
        { name: '2026-07-01-pusha.json', sha: 'REMOTE-A' },
        { name: '2026-07-02-pulla.json', sha: 'REMOTE-B' },
      ]);
    }
    if (url.includes('2026-07-02-pulla.json')) return resJson({ content: b64(remoteEntry), sha: 'REMOTE-B' });
    if (url.includes('2026-07-01-pusha.json')) throw new Error('MUST NOT fetch a queued path');
    return resJson({}, 404);
  };
  await pullRemote();
  assert.deepEqual(store.plan, remotePlan);
  assert.equal(store.history.length, 2);
  assert.equal(store.history[0].exercises[0].id, 'local', 'queued local entry untouched');
  assert.equal(fetched.some((u) => u.includes('2026-07-01-pusha.json')), false);
  assert.equal(store.queue.length, 1, 'queue untouched by pull');
  store.queue = [];
});
await ok('INVARIANT: an entry enqueued MID-pull is never overwritten by remote', async () => {
  store.settings.token = 't';
  store.history = [];
  store.queue = [];
  store.remoteIndex = {};
  const remoteEntry = { date: '2026-07-03', session_type: 'LegsA', exercises: [{ id: 'stale-remote', name: 'x', sets: [] }] };
  fetchImpl = async (url) => {
    if (url.includes('data/plan.json')) return resJson({}, 404);
    if (url.endsWith('/contents/data/history?ref=main')) {
      return resJson([{ name: '2026-07-03-legsa.json', sha: 'R-1' }]);
    }
    if (url.includes('2026-07-03-legsa.json')) {
      // the user finishes and saves this very entry while its download is in flight
      store.upsertEntry({ date: '2026-07-03', session_type: 'LegsA', exercises: [{ id: 'fresher-local', name: 'x', sets: [] }] });
      return resJson({ content: b64(remoteEntry), sha: 'R-1' });
    }
    return resJson({}, 404);
  };
  await pullRemote();
  assert.equal(store.history.length, 1);
  assert.equal(store.history[0].exercises[0].id, 'fresher-local', 'the mid-pull local save must win');
  assert.equal(store.queue.length, 1, 'the fresh entry stays queued for upload');
  store.queue = [];
  store.history = [];
});

// ——— importer ———
await ok('importSeedBundle validates and enqueues everything', () => {
  assert.throws(() => importSeedBundle({ kind: 'nope' }));
  store.history = [];
  store.queue = [];
  const count = importSeedBundle({
    kind: 'protocol-seed', version: 3,
    plan: { version: 3 },
    history: [{ date: '2026-01-01', session_type: 'PushA', exercises: [] }],
  });
  assert.equal(count, 1);
  assert.equal(store.queue.length, 2); // plan + 1 entry
  assert.equal(store.queue[0].path, 'data/plan.json');
});

// ——— universes: the world pool ———
const { UNIVERSES, pickWorld, worldDef } = await import('../js/worlds.js');

await ok('every session type has a universe with 8+ worlds and full copy', () => {
  const types = ['PushA', 'PullA', 'LegsA', 'PushB', 'PullB', 'LegsB'];
  assert.deepEqual(Object.keys(UNIVERSES).sort(), [...types].sort());
  const allCls = new Set();
  for (const t of types) {
    const U = UNIVERSES[t];
    assert.ok(U.worlds.length >= 8, `${t} needs 8+ worlds, has ${U.worlds.length}`);
    assert.equal(new Set(U.worlds.map((w) => w.id)).size, U.worlds.length, `${t} world ids must be unique`);
    for (const k of ['log', 'rest', 'results', 'objDone', 'pr', 'finish', 'trophyNote']) {
      assert.ok(U.copy[k], `${t} copy.${k} missing`);
    }
    for (const w of U.worlds) {
      assert.ok(typeof w.scene === 'function' && w.scene().length > 200, `${t}/${w.id} scene builds`);
      assert.ok(!allCls.has(w.cls), `world cls ${w.cls} reused`);
      allCls.add(w.cls);
    }
  }
});
await ok('INVARIANT: no world repeats until the universe pool is exhausted', () => {
  localStorage.removeItem('p3.worldPools');
  for (const t of Object.keys(UNIVERSES)) {
    const n = UNIVERSES[t].worlds.length;
    const first = Array.from({ length: n }, () => pickWorld(t));
    assert.equal(new Set(first).size, n, `${t} first cycle repeated a world: ${first}`);
    const second = Array.from({ length: n }, () => pickWorld(t));
    assert.equal(new Set(second).size, n, `${t} reshuffled cycle repeated a world`);
  }
});
await ok('INVARIANT: a fresh shuffle never opens with the world just served', () => {
  for (let trial = 0; trial < 40; trial++) {
    localStorage.removeItem('p3.worldPools');
    const t = ['PushA', 'PullA', 'LegsA', 'PushB', 'PullB', 'LegsB'][trial % 6];
    const n = UNIVERSES[t].worlds.length;
    let last = null;
    for (let i = 0; i < n * 2 + 1; i++) {
      const id = pickWorld(t);
      assert.notEqual(id, last, `${t} served ${id} twice in a row (draw ${i})`);
      last = id;
    }
  }
});
await ok('pickWorld survives a corrupted pool and unknown ids', () => {
  localStorage.setItem('p3.worldPools', JSON.stringify({ PushA: ['deleted-world'], PullA: 'garbage' }));
  const a = pickWorld('PushA');
  assert.ok(UNIVERSES.PushA.worlds.some((w) => w.id === a));
  const b = pickWorld('PullA');
  assert.ok(UNIVERSES.PullA.worlds.some((w) => w.id === b));
  localStorage.setItem('p3.worldPools', '{not json');
  assert.ok(pickWorld('LegsB'));
  assert.equal(pickWorld('NotASession'), null);
});
await ok('worldDef resolves saved ids and falls back for unknown/legacy entries', () => {
  assert.equal(worldDef('PullA', 'whalefall').name, 'Whale-Fall City');
  assert.equal(worldDef('PullA', 'no-such-world').id, UNIVERSES.PullA.worlds[0].id);
  assert.equal(worldDef('PullA', null).id, UNIVERSES.PullA.worlds[0].id);
});

// ——— the arcade ———
// Importing the registry under node is itself a test: game modules must be
// data-clean at import time (Phaser only ever touched inside create()).
const { GAMES, gameFor, saveBest, bestFor } = await import('../js/game/registry.js');

await ok('every one of the 48 worlds has a mini-game config', () => {
  for (const [type, U] of Object.entries(UNIVERSES)) {
    assert.ok(GAMES[U.cls], `${U.cls} universe has no game module`);
    for (const w of U.worlds) {
      const spec = gameFor(U.cls, w.cls);
      assert.ok(spec, `${w.cls} has no game config`);
      assert.ok(spec.cfg.name, `${w.cls} game config missing a name`);
      assert.ok(typeof spec.create === 'function', `${U.cls} game missing create()`);
      assert.ok(spec.title, `${U.cls} game missing TITLE`);
    }
  }
});
await ok('every world lives in exactly one game module', () => {
  const seen = new Map();
  for (const [key, mod] of Object.entries(GAMES)) {
    for (const w of Object.keys(mod.WORLDS)) {
      assert.ok(!seen.has(w), `${w} defined in both ${seen.get(w)} and ${key}`);
      seen.set(w, key);
    }
  }
  const all = Object.values(UNIVERSES).flatMap((U) => U.worlds.map((w) => w.cls));
  assert.equal(seen.size, all.length, 'orphan game configs exist');
  for (const cls of all) assert.ok(seen.has(cls), `${cls} uncovered`);
});
await ok('the six mechanics are distinct and every world config can paint its sky', () => {
  const titles = new Set();
  for (const [key, mod] of Object.entries(GAMES)) {
    assert.ok(mod.TITLE, `${key} missing TITLE`);
    assert.ok(!titles.has(mod.TITLE), `${mod.TITLE} used by two universes`);
    titles.add(mod.TITLE);
    assert.equal(typeof mod.create, 'function', `${key} missing create()`);
    assert.ok(Array.isArray(mod.STARS) && mod.STARS.length === 3, `${key} missing STARS thresholds`);
    assert.ok(typeof mod.VERB === 'string' && mod.VERB.length, `${key} missing its VERB card`);
    assert.ok(mod.HELP && typeof mod.HELP.goal === 'string' && typeof mod.HELP.how === 'string',
      `${key} missing HELP instructions (goal/how)`);
    for (const [w, cfg] of Object.entries(mod.WORLDS)) {
      assert.ok(Array.isArray(cfg.sky) && cfg.sky.length >= 2, `${w} has no sky gradient`);
      assert.ok(cfg.name, `${w} has no display name`);
    }
  }
  assert.equal(titles.size, 6, 'expected exactly six game mechanics');
});
await ok('the playable-universe sets in components.js and overlay.js match the registry', async () => {
  const { readFileSync } = await import('node:fs');
  for (const file of ['../js/components.js', '../js/game/overlay.js']) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8');
    const m = src.match(/GAME_UNIVERSES = new Set\(\[([^\]]*)\]\)/);
    assert.ok(m, `${file} lost its GAME_UNIVERSES set`);
    const set = new Set([...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]));
    for (const g of Object.keys(GAMES)) assert.ok(set.has(g), `${file} missing universe ${g} — Play button would never appear`);
    for (const s of set) assert.ok(GAMES[s], `${file} lists ${s} but no game module exists — Play would silently no-op`);
  }
});
await ok('sw shell carries the whole arcade (engine vendor + every module)', async () => {
  const { readFileSync } = await import('node:fs');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of [
    'vendor/phaser.min.js', 'js/game/loader.js', 'js/game/fx.js',
    'js/game/registry.js', 'js/game/overlay.js',
    ...Object.keys(GAMES).map((g) => `js/game/games/${g}.js`),
  ]) {
    assert.ok(sw.includes(`'${f}'`), `sw.js SHELL is missing ${f} — offline arcade would 404`);
  }
  assert.ok(!sw.includes('matter.min.js'), 'stale matter vendor still in the shell');
  assert.ok(!sw.includes("'js/game/engine.js'"), 'deleted engine still in the shell');
});
await ok('best scores persist per world and only improve', () => {
  localStorage.removeItem('p3.gameBests');
  assert.equal(bestFor('dojo-stairs'), 0);
  assert.equal(saveBest('dojo-stairs', 120), true);
  assert.equal(saveBest('dojo-stairs', 90), false);
  assert.equal(bestFor('dojo-stairs'), 120);
  assert.equal(saveBest('dojo-stairs', 150), true);
  assert.equal(bestFor('dojo-stairs'), 150);
  localStorage.setItem('p3.gameBests', '{corrupt');
  assert.equal(bestFor('dojo-stairs'), 0); // corruption never throws
});
await ok('star medals persist independently of score records (legacy-safe)', async () => {
  const { starsFor } = await import('../js/game/registry.js');
  localStorage.setItem('p3.gameBests', JSON.stringify({ 'deep-void': 200 })); // legacy number
  assert.equal(bestFor('deep-void'), 200);
  assert.equal(starsFor('deep-void'), 0);
  assert.equal(saveBest('deep-void', 150, 2), false); // stars improve, score doesn't -> not a record
  assert.equal(starsFor('deep-void'), 2);
  assert.equal(bestFor('deep-void'), 200); // score high water kept
  assert.equal(saveBest('deep-void', 260, 1), true); // record, stars keep their high
  assert.equal(bestFor('deep-void'), 260);
  assert.equal(starsFor('deep-void'), 2);
});

// ——— release integrity ———
await ok('sw.js build line matches js/version.js (update-detection guard)', async () => {
  const { readFileSync } = await import('node:fs');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const ver = readFileSync(new URL('../js/version.js', import.meta.url), 'utf8');
  const build = sw.match(/\/\/ build: (v\d+)/)?.[1];
  const version = ver.match(/PROTOCOL_VERSION = '(v\d+)'/)?.[1];
  assert.ok(build, 'sw.js is missing its "// build: vN" line — without a byte change, browsers may not fetch the new release');
  assert.equal(build, version, `sw.js says ${build} but js/version.js says ${version} — bump BOTH on every release`);
});

console.log(`\n${n} app tests passed`);

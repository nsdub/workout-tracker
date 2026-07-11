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

const { fmtW, weekKey, daysBetween } = await import('../js/util.js');
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

await ok('every session type has a universe with 3 worlds and full copy', () => {
  const types = ['PushA', 'PullA', 'LegsA', 'PushB', 'PullB', 'LegsB'];
  assert.deepEqual(Object.keys(UNIVERSES).sort(), [...types].sort());
  const allCls = new Set();
  for (const t of types) {
    const U = UNIVERSES[t];
    assert.equal(U.worlds.length, 3, `${t} needs 3 worlds`);
    assert.equal(new Set(U.worlds.map((w) => w.id)).size, 3, `${t} world ids must be unique`);
    for (const k of ['log', 'rest', 'results', 'objDone', 'pr', 'finish', 'trophyNote']) {
      assert.ok(U.copy[k], `${t} copy.${k} missing`);
    }
    for (const w of U.worlds) {
      assert.ok(typeof w.scene === 'function' && w.scene().length > 0, `${t}/${w.id} scene builds`);
      assert.ok(!allCls.has(w.cls), `world cls ${w.cls} reused`);
      allCls.add(w.cls);
    }
  }
});
await ok('INVARIANT: no world repeats until the universe pool is exhausted', () => {
  localStorage.removeItem('p3.worldPools');
  for (const t of Object.keys(UNIVERSES)) {
    const first = [pickWorld(t), pickWorld(t), pickWorld(t)];
    assert.equal(new Set(first).size, 3, `${t} first cycle repeated a world: ${first}`);
    const second = [pickWorld(t), pickWorld(t), pickWorld(t)];
    assert.equal(new Set(second).size, 3, `${t} reshuffled cycle repeated a world`);
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

console.log(`\n${n} app tests passed`);

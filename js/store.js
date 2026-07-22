// Offline-first store. localStorage is the write buffer and always wins locally;
// GitHub is the durable source of truth, fed by the sync queue.
import { todayStr } from './util.js';
// engine is pure logic with no imports of its own — no cycle.
import { effectivePlan as engineEffectivePlan } from './engine.js';

const KEYS = {
  settings: 'p3.settings',
  plan: 'p3.plan',
  history: 'p3.history',
  queue: 'p3.queue',
  draft: 'p3.draft',
  remoteIndex: 'p3.remoteIndex',
  meta: 'p3.meta',
  coach: 'p3.coach',
  decisions: 'p3.decisions',
};

// Reads are shape-checked against the fallback: a corrupt blob (extension,
// half-write, hostile paste into devtools) must degrade to the fallback,
// never crash boot. Arrays stay arrays, objects stay objects, and the
// null-fallback keys (draft, plan) accept null-or-plain-object only.
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null) return fallback;
    if (fallback === null) return (typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : fallback;
    if (Array.isArray(fallback) !== Array.isArray(parsed)) return fallback;
    if (typeof parsed !== typeof fallback) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Quota / private-mode failure: the local copy is gone, so the sync dot
    // must go red — a silent localStorage loss is the one lie we never tell.
    try {
      store.meta.lastError = `Local save failed: ${err?.message || err}`;
      store.meta.lastErrorAt = Date.now();
      localStorage.setItem(KEYS.meta, JSON.stringify(store.meta));
    } catch { /* device is beyond full; in-memory state still carries the day */ }
  }
}

const listeners = new Set();

// Monotonic identity for queue items. queuedAt (Date.now()) can collide when
// two saves land in the same millisecond, and "same path + same timestamp"
// must never mistake an unsent replacement for the item that just uploaded.
// Seeded past any persisted items below so a reload can't reuse a live seq.
let seq = 0;

// Defaults are MERGED over stored settings so adding a field can never
// crash an install whose persisted blob predates it.
const SETTINGS_DEFAULTS = {
  owner: 'nsdub', repo: 'workout-tracker', branch: 'main', token: '',
  phaseOverride: null, haptics: true, restTimer: true, sound: true, cardio: {},
  pushUrl: '', // Cloudflare rest-alarm worker; empty = push disabled entirely
};

export const store = {
  settings: { ...SETTINGS_DEFAULTS, ...read(KEYS.settings, {}) },
  plan: read(KEYS.plan, null),
  history: read(KEYS.history, []),
  queue: read(KEYS.queue, []),
  draft: read(KEYS.draft, null),
  remoteIndex: read(KEYS.remoteIndex, {}),
  meta: { lastSync: null, lastError: null, ...read(KEYS.meta, {}) },
  coach: read(KEYS.coach, null),
  // the athlete's yes/no on structural proposals — his program, his call
  decisions: read(KEYS.decisions, []),
  syncing: false,

  sub(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit(quiet = false) {
    for (const fn of listeners) {
      try { fn(quiet); } catch (err) { console.error('listener failed', err); }
    }
  },

  saveSettings(patch = {}) {
    // A NEW token is a fresh start: wipe the old token's failure history so
    // the next flush fires immediately instead of serving out a stale
    // backoff sentence. Keyed on the value actually changing — haptics and
    // sound toggles pass through here constantly.
    const tokenChanged = 'token' in patch && patch.token !== this.settings.token;
    Object.assign(this.settings, patch);
    globalThis.__p3Haptics = this.settings.haptics;
    write(KEYS.settings, this.settings);
    if (tokenChanged) this.resetAttempts();
    this.emit();
  },

  // Zero every queue item's failure state and clear the pull error — the
  // slate a new token (or a deliberate retry) deserves.
  resetAttempts() {
    for (const item of this.queue) {
      item.attempts = 0;
      item.lastAttemptAt = null;
      item.lastError = null;
    }
    write(KEYS.queue, this.queue);
    this.setMeta({ lastError: null, lastErrorAt: null });
    this.emit(true);
  },

  setPlan(plan) {
    this.plan = plan;
    write(KEYS.plan, plan);
    this.emit();
  },

  // The daily trainer review packet (data/coach/latest.json). Null when the
  // repo has none; staleness is judged at prescription time, never here.
  // Accept or decline a trainer's structural proposal. Written locally at
  // once (it changes tonight immediately) and queued to the repo like any
  // other record, so the decision survives the phone and is auditable.
  decide(proposal, decision) {
    const id = `${proposal.date ?? ''}:${proposal.kind}:${proposal.exercise}:${proposal.scope ?? 'all'}`;
    const rest = this.decisions.filter((d) => `${d.proposal?.date ?? ''}:${d.proposal?.kind}:${d.proposal?.exercise}:${d.proposal?.scope ?? 'all'}` !== id);
    this.decisions = [...rest, { proposal, decision, decided_at: new Date().toISOString() }];
    write(KEYS.decisions, this.decisions);
    this.enqueue('data/coach/decisions.json', this.decisions);
    this.emit();
  },

  setDecisions(list) {
    if (JSON.stringify(list ?? []) === JSON.stringify(this.decisions ?? [])) return;
    this.decisions = list ?? [];
    write(KEYS.decisions, this.decisions);
    this.emit();
  },

  // The plan the app actually runs: the signed program plus every structural
  // change the athlete has accepted. plan.json is never rewritten.
  livePlan() {
    return this.plan ? engineEffectivePlan(this.plan, this.decisions) : this.plan;
  },

  setCoach(coach) {
    if (JSON.stringify(coach ?? null) === JSON.stringify(this.coach ?? null)) return;
    this.coach = coach ?? null;
    write(KEYS.coach, this.coach);
    this.emit();
  },

  setMeta(patch) {
    Object.assign(this.meta, patch);
    write(KEYS.meta, this.meta);
  },

  setRemoteIndex(index) {
    this.remoteIndex = index;
    write(KEYS.remoteIndex, index);
  },

  // Data lives beside the app in this same repo, under data/
  entryPath(entry) {
    return `data/history/${entry.date}-${entry.session_type.toLowerCase()}.json`;
  },

  // Insert or replace (same date + session type re-log replaces).
  // Enqueue FIRST: if the history write below dies on quota, the entry is
  // already bound for GitHub and the night is not silently lost.
  upsertEntry(entry, { enqueue = true, quiet = false } = {}) {
    const path = this.entryPath(entry);
    if (enqueue) this.enqueue(path, entry);
    this.history = this.history.filter((e) => this.entryPath(e) !== path);
    this.history.push(entry);
    this.history.sort((a, b) => a.date.localeCompare(b.date));
    write(KEYS.history, this.history);
    if (!quiet) this.emit();
  },

  replaceHistory(entries) {
    this.history = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    write(KEYS.history, this.history);
    this.emit();
  },

  enqueue(path, content) {
    this.queue = this.queue.filter((q) => q.path !== path);
    this.queue.push({ path, content, attempts: 0, queuedAt: Date.now(), seq: ++seq });
    write(KEYS.queue, this.queue);
    this.emit(true);
  },

  dequeue(path) {
    this.queue = this.queue.filter((q) => q.path !== path);
    write(KEYS.queue, this.queue);
    this.emit(true);
  },

  // Queue a remote deletion (op:'delete'): flushQueue turns it into a
  // Contents API DELETE with a fresh sha. Replaces any queued write for the
  // same path — and a later re-save replaces the delete, in queue order.
  enqueueDelete(path) {
    this.queue = this.queue.filter((q) => q.path !== path);
    this.queue.push({ path, op: 'delete', attempts: 0, queuedAt: Date.now(), seq: ++seq });
    write(KEYS.queue, this.queue);
    this.emit(true);
  },

  // Remove a banked night everywhere: local history now, the repo via the
  // sync queue. Same enqueue-first discipline as upsertEntry.
  deleteEntry(entry) {
    const path = this.entryPath(entry);
    this.enqueueDelete(path);
    this.history = this.history.filter((e) => this.entryPath(e) !== path);
    write(KEYS.history, this.history);
    this.emit();
  },

  // Record a failed upload against the EXACT item that was attempted — never
  // by path alone. If a re-save replaced the item mid-flight, the old op's
  // failure belongs to nobody: the replacement was never sent and must not
  // inherit attempts, backoff, or a red dot it didn't earn.
  markAttempt(attempted, error) {
    const item = this.queue.find((q) => q.path === attempted.path
      && q.queuedAt === attempted.queuedAt && q.seq === attempted.seq);
    if (item) { item.attempts += 1; item.lastError = String(error); item.lastAttemptAt = Date.now(); }
    write(KEYS.queue, this.queue);
    this.emit(true);
  },

  saveDraft(draft) {
    this.draft = draft;
    write(KEYS.draft, draft);
  },

  clearDraft() {
    this.draft = null;
    localStorage.removeItem(KEYS.draft);
  },

  // A draft from a previous day with nothing logged is stale — drop it.
  // The dropped draft is handed back so the caller can refund its world
  // draw: a night that never happened shouldn't burn a world from the pool.
  pruneDraft() {
    if (!this.draft) return null;
    // A reopened night is a deliberate act on a REAL past entry — it is
    // never stale, and its world came from the entry, not a fresh draw.
    if (this.draft.reopened) return null;
    const dirty = this.draft.exercises?.some((x) => x.sets.some((s) => s.done));
    if (this.draft.date !== todayStr() && !dirty) {
      const dropped = this.draft;
      this.clearDraft();
      return dropped;
    }
    return null;
  },

  syncStatus() {
    // A failed LOCAL write outranks the token gate: on a token-less install
    // the entry may exist only in memory, and that dot must still go red —
    // 'off' here would be exactly the silent loss write() promises never to tell.
    if (this.meta.lastErrorAt && this.meta.lastErrorAt > (this.meta.lastSync || 0)
      && String(this.meta.lastError).startsWith('Local save failed')) return 'failed';
    if (!this.settings.token) return 'off';
    // an expired token must never show a green dot: pull failures count
    if (this.meta.lastErrorAt && this.meta.lastErrorAt > (this.meta.lastSync || 0)) return 'failed';
    if (this.queue.some((q) => q.attempts >= 3)) return 'failed';
    if (this.queue.length) return 'pending';
    return 'synced';
  },

  // The raw blocker behind a failed dot: a queue item's error first (it names
  // the file that can't land), the pull error second. One source of truth for
  // the Systems console drawer and the sync-tag toast alike.
  syncError() {
    if (this.syncStatus() !== 'failed') return null;
    return this.queue.find((q) => q.lastError)?.lastError || this.meta.lastError;
  },

  resetLocal() {
    // Sweep EVERY p3.* key — world pools, game bests, tip flags, whatever a
    // future build invents — not just the keys this file happens to know.
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('p3.')) localStorage.removeItem(key);
    }
    location.reload();
  },
};

globalThis.__p3Haptics = store.settings.haptics;

// Seed the seq counter past everything the persisted queue already holds.
seq = store.queue.reduce((m, q) => Math.max(m, q.seq || 0), seq);

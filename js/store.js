// Offline-first store. localStorage is the write buffer and always wins locally;
// GitHub is the durable source of truth, fed by the sync queue.
import { todayStr } from './util.js';

const KEYS = {
  settings: 'p3.settings',
  plan: 'p3.plan',
  history: 'p3.history',
  queue: 'p3.queue',
  draft: 'p3.draft',
  remoteIndex: 'p3.remoteIndex',
  meta: 'p3.meta',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const listeners = new Set();

// Defaults are MERGED over stored settings so adding a field can never
// crash an install whose persisted blob predates it.
const SETTINGS_DEFAULTS = {
  owner: 'nsdub', repo: 'workout-tracker', branch: 'main', token: '',
  phaseOverride: null, haptics: true, restTimer: true, cardio: {},
};

export const store = {
  settings: { ...SETTINGS_DEFAULTS, ...read(KEYS.settings, {}) },
  plan: read(KEYS.plan, null),
  history: read(KEYS.history, []),
  queue: read(KEYS.queue, []),
  draft: read(KEYS.draft, null),
  remoteIndex: read(KEYS.remoteIndex, {}),
  meta: { lastSync: null, lastError: null, ...read(KEYS.meta, {}) },
  syncing: false,

  sub(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit(quiet = false) {
    for (const fn of listeners) {
      try { fn(quiet); } catch (err) { console.error('listener failed', err); }
    }
  },

  saveSettings(patch = {}) {
    Object.assign(this.settings, patch);
    globalThis.__p3Haptics = this.settings.haptics;
    write(KEYS.settings, this.settings);
    this.emit();
  },

  setPlan(plan) {
    this.plan = plan;
    write(KEYS.plan, plan);
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
  upsertEntry(entry, { enqueue = true, quiet = false } = {}) {
    const path = this.entryPath(entry);
    this.history = this.history.filter((e) => this.entryPath(e) !== path);
    this.history.push(entry);
    this.history.sort((a, b) => a.date.localeCompare(b.date));
    write(KEYS.history, this.history);
    if (enqueue) this.enqueue(path, entry);
    if (!quiet) this.emit();
  },

  replaceHistory(entries) {
    this.history = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    write(KEYS.history, this.history);
    this.emit();
  },

  enqueue(path, content) {
    this.queue = this.queue.filter((q) => q.path !== path);
    this.queue.push({ path, content, attempts: 0, queuedAt: Date.now() });
    write(KEYS.queue, this.queue);
    this.emit(true);
  },

  dequeue(path) {
    this.queue = this.queue.filter((q) => q.path !== path);
    write(KEYS.queue, this.queue);
    this.emit(true);
  },

  markAttempt(path, error) {
    const item = this.queue.find((q) => q.path === path);
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
  pruneDraft() {
    if (!this.draft) return;
    const dirty = this.draft.exercises?.some((x) => x.sets.some((s) => s.done));
    if (this.draft.date !== todayStr() && !dirty) this.clearDraft();
  },

  syncStatus() {
    if (!this.settings.token) return 'off';
    // an expired token must never show a green dot: pull failures count
    if (this.meta.lastErrorAt && this.meta.lastErrorAt > (this.meta.lastSync || 0)) return 'failed';
    if (this.queue.some((q) => q.attempts >= 3)) return 'failed';
    if (this.queue.length) return 'pending';
    return 'synced';
  },

  resetLocal() {
    for (const key of Object.values(KEYS)) localStorage.removeItem(key);
    location.reload();
  },
};

globalThis.__p3Haptics = store.settings.haptics;

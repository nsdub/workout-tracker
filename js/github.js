// GitHub Contents API client + sync orchestration for the private data repo.
import { store } from './store.js';

const API = 'https://api.github.com';

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decode(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function gh(path, opts = {}) {
  const { token } = store.settings;
  const res = await fetch(`${API}${path}`, {
    // GitHub caches authenticated GETs for 60s. A cached response here is
    // poison: a stale sha throws putFile into 409 loops, and a stale file
    // body can re-download a just-uploaded entry over fresher local data.
    cache: 'no-store',
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 140)}`);
  }
  return res.json();
}

function repoPath(filePath) {
  const { owner, repo } = store.settings;
  return `/repos/${owner}/${repo}/contents/${filePath}`;
}

export async function getFile(filePath) {
  const { branch } = store.settings;
  const data = await gh(`${repoPath(filePath)}?ref=${branch}`);
  if (!data) return null;
  return { content: JSON.parse(b64decode(data.content)), sha: data.sha };
}

export async function putFile(filePath, content, message) {
  const { branch } = store.settings;
  const existing = await gh(`${repoPath(filePath)}?ref=${branch}`);
  const body = {
    message,
    branch,
    content: b64encode(JSON.stringify(content, null, 2) + '\n'),
    ...(existing ? { sha: existing.sha } : {}),
  };
  const res = await gh(repoPath(filePath), { method: 'PUT', body: JSON.stringify(body) });
  return res.content.sha;
}

export async function listDir(dirPath) {
  const { branch } = store.settings;
  const data = await gh(`${repoPath(dirPath)}?ref=${branch}`);
  return Array.isArray(data) ? data : [];
}

export async function checkConnection() {
  const { owner, repo } = store.settings;
  const data = await gh(`/repos/${owner}/${repo}`);
  if (!data) throw new Error('Repo not found — check the name and token scope');
  return data;
}

// ——— Sync orchestration ———

// Flush the local write queue to GitHub. Sequential on purpose: the Contents
// API needs the latest sha per file and the queue is small. `force` is the
// user tapping Sync: it skips ONLY the backoff window — the reentrancy
// guard and the token/online checks always hold, or a double-tap would race
// two PUT loops against the same sha.
export async function flushQueue({ force = false } = {}) {
  if (store.syncing || !store.settings.token || !navigator.onLine) return;
  if (!store.queue.length) return;
  store.syncing = true;
  store.emit(true);
  let uploaded = 0;
  try {
    for (const item of [...store.queue]) {
      // exponential backoff: a failing item must not spam the API forever
      if (!force && item.attempts > 0 && Date.now() - (item.lastAttemptAt || 0) < Math.min(2 ** item.attempts * 30000, 3600000)) continue;
      try {
        const sha = await putFile(item.path, item.content, `log: ${item.path.replace(/^data\/(history\/)?/, '').replace(/\.json$/, '')}`);
        store.remoteIndex[item.path] = sha;
        store.setRemoteIndex(store.remoteIndex);
        // Only dequeue what we actually uploaded — a re-save during the PUT
        // replaces the queue item, and that newer write must survive.
        const current = store.queue.find((q) => q.path === item.path);
        if (current && current.queuedAt === item.queuedAt) store.dequeue(item.path);
        uploaded += 1;
      } catch (err) {
        store.markAttempt(item.path, err.message || err);
      }
    }
    // lastSync only moves on real progress: an all-fail flush must never
    // mask an older pull error in syncStatus.
    if (uploaded) store.setMeta({ lastSync: Date.now() });
  } finally {
    store.syncing = false;
    store.emit();
  }
}

// Pull plan + any history files we don't have locally. Local queue always wins:
// paths still queued are never overwritten by remote state.
export async function pullRemote() {
  if (!store.settings.token || !navigator.onLine) return;
  try {
    // The queue is consulted LIVE, per file, twice — never a start-of-pull
    // snapshot. An entry the user logs while this pull is in flight must
    // still win over whatever the remote is about to hand us.
    const queuedNow = (path) => store.queue.some((q) => q.path === path);
    const plan = await getFile('data/plan.json');
    if (plan && !queuedNow('data/plan.json')) {
      store.remoteIndex['data/plan.json'] = plan.sha;
      if (JSON.stringify(plan.content) !== JSON.stringify(store.plan)) store.setPlan(plan.content);
    }
    const files = await listDir('data/history');
    const index = { ...store.remoteIndex };
    let changed = false;
    for (const f of files) {
      if (!f.name.endsWith('.json')) continue;
      const path = `data/history/${f.name}`;
      if (queuedNow(path) || index[path] === f.sha) { index[path] = f.sha; continue; }
      const file = await getFile(path);
      // re-check after the fetch: the entry may have been queued mid-flight
      if (queuedNow(path)) { index[path] = f.sha; continue; }
      if (file) {
        // quiet per-file merge; one emit below (first sync is ~50 files)
        store.upsertEntry(file.content, { enqueue: false, quiet: true });
        index[path] = f.sha;
        changed = true;
      }
    }
    store.setRemoteIndex(index);
    store.setMeta({ lastSync: Date.now(), lastError: null, lastErrorAt: null });
    if (changed) store.emit();
    else store.emit(true);
  } catch (err) {
    store.setMeta({ lastError: err.message || String(err), lastErrorAt: Date.now() });
    store.emit(true);
  }
}

// No token yet? The plan also ships as a static file in this repo, so a
// fresh install can read it straight off Pages before any setup.
export async function bootstrapStaticPlan() {
  if (store.plan) return;
  try {
    const res = await fetch('data/plan.json', { cache: 'no-cache' });
    if (res.ok) store.setPlan(await res.json());
  } catch { /* offline first run: setup screen handles it */ }
}

// One-time seed import: plan + full history → local store + sync queue.
export function importSeedBundle(bundle) {
  if (bundle.kind !== 'protocol-seed' || !bundle.plan || !Array.isArray(bundle.history)) {
    throw new Error('Not a protocol seed bundle');
  }
  store.setPlan(bundle.plan);
  store.enqueue('data/plan.json', bundle.plan);
  for (const entry of bundle.history) {
    store.upsertEntry(entry, { enqueue: true });
  }
  return bundle.history.length;
}

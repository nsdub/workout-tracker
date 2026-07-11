// Plan — phase status, rotation, stall flags, session templates, rules,
// and the sync/data controls (PAT, import, export).
import { $, esc, fmtW, todayStr, fmtDate, daysBetween, weekKey, haptic, ICONS } from '../util.js';
import { store } from '../store.js';
import * as engine from '../engine.js';
import { flushQueue, pullRemote } from '../github.js';
import { optionSheet, confirmSheet, toast } from '../components.js';
import { connectSheet, handleSeedFile, howtoSheet } from './today.js';
import { setAccent, setMode } from '../theme.js';

let root = null;
const acc = new Set(); // open accordions

export function render(el) {
  root = el;
  setAccent(null);
  const plan = store.plan;
  if (!plan) {
    root.innerHTML = `
      <div class="empty">
        <div class="glyph"><svg viewBox="0 0 24 24"><rect x="4.5" y="5.5" width="15" height="14" rx="2.5"/><path d="M4.5 10h15M9 3.5v3.5M15 3.5v3.5" stroke-linecap="round"/></svg></div>
        <h3>No plan loaded</h3>
        <p>Connect the data repo or import the seed bundle to load Protocol v3.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;padding:0 6px">
        <button class="btn primary" id="p-connect">Connect GitHub</button>
        <button class="btn quiet" id="p-import">Import seed bundle</button>
        <input type="file" id="p-file" accept=".json" hidden>
      </div>`;
    $('#p-connect', root).addEventListener('click', connectSheet);
    $('#p-import', root).addEventListener('click', () => $('#p-file', root).click());
    $('#p-file', root).addEventListener('change', handleSeedFile);
    return;
  }

  const today = todayStr();
  const info = engine.phaseForDate(plan, today, store.settings.phaseOverride);
  const stalls = engine.stalledLifts(plan, store.history);
  const next = engine.rotationNext(plan, store.history);
  const showDays = Math.max(0, daysBetween(today, '2027-03-01'));
  const last7 = store.history.filter((e) => daysBetween(e.date, today) < 7).length;
  const wk = weekKey(today);
  const cardio = store.settings.cardio[wk] || [false, false, false];

  root.innerHTML = `
    <div class="section-label">Phase</div>
    <div class="card">
      ${plan.phases.map((p) => phaseRow(p, info, today)).join('')}
    </div>
    ${info.override ? `<button class="btn quiet small" id="clear-override" style="margin:-4px 0 12px">Clear manual override</button>` : ''}

    <div class="stat-grid">
      <div class="stat"><div class="v num">${showDays}<span class="u"> d</span></div><div class="k">to March ’27 show</div></div>
      <div class="stat"><div class="v num">${last7}<span class="u"> / 6</span></div><div class="k">sessions this week</div></div>
    </div>

    <div class="section-label">Rotation · 6 on / 1 off</div>
    <div class="card">
      <div class="rot-strip">
        ${plan.rotation.map((t) => `<span class="rot-cell ${t === next ? 'next' : ''}" style="--cell-acc:var(--acc-${t.toLowerCase()})">${t.replace(/([AB])$/, ' $1')}</span>`).join('')}
      </div>
      <div class="kv"><span class="k">Cardio this week</span>
        <span class="cardio-dots" id="cardio-dots">
          ${cardio.map((on, i) => `<button class="cardio-dot ${on ? 'on' : ''}" data-ci="${i}"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.6 4.5L19 7.5"/></svg></button>`).join('')}
        </span>
      </div>
    </div>

    ${stalls.length ? `
    <div class="section-label">Stalled lifts</div>
    <div class="card">
      ${stalls.map((s) => `<div class="kv"><span class="flag stall">stall</span><span class="k" style="color:var(--text)">${esc(s.name)}</span><span class="v">${esc(s.sessionType)}</span></div>`).join('')}
    </div>` : ''}

    <div class="section-label">Sessions</div>
    ${Object.entries(plan.sessions).map(([type, s]) => `
      <div class="card acc ${acc.has(type) ? 'open' : ''}" data-acc="${type}">
        <button class="acc-head">${esc(s.name)}
          <span class="hint">${s.exercises.length} exercises</span>
          <span class="chev">${ICONS.chev}</span>
        </button>
        <div class="acc-body">
          ${s.exercises.map((slot) => `
            <button class="t-row" data-ex="${esc(slot.id)}">
              <span>${esc(engine.exMeta(plan, slot.id).name)}</span>
              <span class="s">${slot.sets}×${slot.repMin === slot.repMax ? slot.repMin : `${slot.repMin}–${slot.repMax}`}${slot.repUnit === 'sec' ? 's' : ''}</span>
              <span class="w num">${slot.seed == null ? (engine.exMeta(plan, slot.id).bodyweight ? 'BW' : '?') : fmtW(slot.seed)}</span>
            </button>`).join('')}
        </div>
      </div>`).join('')}

    <div class="section-label">Rules</div>
    <div class="card"><ul class="rule-list">
      <li><b>Progression</b> all sets at top of range → +${plan.rules.progression.upperIncrement} upper / +${plan.rules.progression.lowerIncrement} lower</li>
      <li><b>RIR</b> compounds ${esc(plan.rules.rir.compound)} · isolation ${esc(plan.rules.rir.isolation)}</li>
      <li><b>Deload</b> −20% load · ~60% sets · ${esc(plan.rules.rir.deload)}</li>
      <li><b>Stalls</b> ${plan.rules.stall.sessions} flat sessions → flag · swap at deload boundaries</li>
      <li><b>Cardio</b> ${plan.rules.cardio.sessionsPerWeek.join('–')}× ${plan.rules.cardio.minutes.join('–')} min low intensity</li>
    </ul></div>

    <div class="section-label">Appearance &amp; behavior</div>
    <div class="card">
      <div class="kv"><span class="k">Theme</span><button class="v" id="sd-theme">${esc(store.settings.theme || 'system')}</button></div>
      <div class="kv"><span class="k">Rest timer</span><button class="v" id="sd-rest">${store.settings.restTimer ? 'on' : 'off'}</button></div>
      <div class="kv"><span class="k">Haptics</span><button class="v" id="sd-haptics">${store.settings.haptics ? 'on' : 'off'}</button></div>
    </div>

    <div class="section-label">Sync &amp; data</div>
    <div class="card">
      <div class="kv"><span class="k">Repo</span><span class="v">${esc(store.settings.owner)}/${esc(store.settings.repo)}</span></div>
      <div class="kv"><span class="k">Token</span><button class="v" id="sd-token">${store.settings.token ? 'update' : 'add token'}</button></div>
      <div class="kv"><span class="k">Status</span><span class="v ${statusClass()}">${statusLabel()}</span></div>
      ${syncError() ? `<div class="kv"><span class="k" style="color:var(--bad)">Last error</span><span class="v" style="max-width:60%;white-space:normal">${esc(syncError())}</span></div>` : ''}
      <div class="kv"><span class="k">Queue</span><span class="v num">${store.queue.length} pending</span></div>
      <div class="kv"><span class="k">Last sync</span><span class="v">${store.meta.lastSync ? new Date(store.meta.lastSync).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never'}</span></div>
      <div class="kv"><span class="k">Sync now</span><button class="v" id="sd-sync">run</button></div>
      <div class="kv"><span class="k">Phase override</span><button class="v" id="sd-phase">${info.override ? esc(info.phase.name) : 'automatic'}</button></div>
      <div class="kv"><span class="k">Import seed bundle</span><button class="v" id="sd-import">choose file</button><input type="file" id="sd-file" accept=".json" hidden></div>
      <div class="kv"><span class="k">Export local data</span><button class="v" id="sd-export">download</button></div>
      <div class="kv"><span class="k">Reset local data</span><button class="v" id="sd-reset" style="color:var(--bad)">reset</button></div>
    </div>
    <p style="font-family:var(--mono);font-size:10.5px;color:var(--text3);text-align:center;padding:6px 0 12px">protocol v${plan.version} · plan updated ${esc(plan.updated)}</p>`;

  wire(info);
}

function phaseRow(p, info, today) {
  const isNow = info.phase?.id === p.id;
  const cls = isNow ? 'now' : p.end < today ? 'past' : '';
  let prog = '';
  if (isNow) {
    const total = daysBetween(p.start, p.end) + 1;
    const done = Math.min(total, Math.max(0, daysBetween(p.start, today) + 1));
    prog = `<div class="phase-prog"><i style="width:${Math.round((done / total) * 100)}%"></i></div>`;
  }
  return `
    <div class="phase-row ${cls}">
      <span class="rail"><i></i></span>
      <span class="info">
        <div class="n">${esc(p.name)} ${isNow ? `<span class="tag">· week ${info.week}/${info.weeks}${info.override ? ' · manual' : ''}</span>` : ''}</div>
        <div class="dates">${fmtDate(p.start)} – ${fmtDate(p.end, { year: true })}${p.note ? ` · ${esc(p.note)}` : ''}</div>
        ${prog}
      </span>
    </div>`;
}

function statusClass() {
  const s = store.syncStatus();
  return s === 'synced' ? 'ok' : s === 'failed' ? 'bad' : '';
}

function syncError() {
  if (store.syncStatus() !== 'failed') return null;
  return store.queue.find((q) => q.lastError)?.lastError || store.meta.lastError;
}

function statusLabel() {
  const s = store.syncStatus();
  return { synced: 'synced', pending: 'pending', failed: 'failed — retrying', off: 'not connected' }[s];
}

function wire(info) {
  root.querySelectorAll('.acc-head').forEach((h) => h.addEventListener('click', () => {
    const key = h.closest('.acc').dataset.acc;
    acc.has(key) ? acc.delete(key) : acc.add(key);
    h.closest('.acc').classList.toggle('open');
  }));

  $('#cardio-dots', root)?.addEventListener('click', (e) => {
    const dot = e.target.closest('.cardio-dot');
    if (!dot) return;
    const wk = weekKey(todayStr());
    const arr = store.settings.cardio[wk] || [false, false, false];
    arr[Number(dot.dataset.ci)] = !arr[Number(dot.dataset.ci)];
    store.settings.cardio[wk] = arr;
    haptic(8);
    store.saveSettings();
  });

  root.querySelectorAll('.t-row[data-ex]').forEach((r) => r.addEventListener('click', () => howtoSheet(r.dataset.ex)));

  $('#sd-theme', root).addEventListener('click', () => {
    optionSheet({
      title: 'Theme',
      options: ['system', 'dark', 'light'].map((m) => ({
        label: m[0].toUpperCase() + m.slice(1),
        selected: (store.settings.theme || 'system') === m,
        value: m,
      })),
      onPick(opt) {
        setMode(opt.value);
        store.saveSettings({ theme: opt.value });
      },
    });
  });

  $('#sd-rest', root).addEventListener('click', () => store.saveSettings({ restTimer: !store.settings.restTimer }));
  $('#sd-haptics', root).addEventListener('click', () => store.saveSettings({ haptics: !store.settings.haptics }));

  $('#sd-token', root).addEventListener('click', connectSheet);
  $('#sd-sync', root).addEventListener('click', async () => {
    toast('Syncing…');
    await flushQueue();
    await pullRemote();
    toast(store.syncStatus() === 'synced' ? 'Up to date' : 'Some items still pending', store.syncStatus() === 'synced' ? 'ok' : 'warn');
  });
  $('#clear-override', root)?.addEventListener('click', () => store.saveSettings({ phaseOverride: null }));
  $('#sd-phase', root).addEventListener('click', () => phaseOverrideSheet(info));
  $('#sd-import', root).addEventListener('click', () => $('#sd-file', root).click());
  $('#sd-file', root).addEventListener('change', handleSeedFile);
  $('#sd-export', root).addEventListener('click', exportData);
  $('#sd-reset', root).addEventListener('click', () => {
    confirmSheet({
      title: 'Reset local data?',
      body: 'Clears everything on this device. Data already synced to GitHub is untouched.',
      confirmLabel: 'Reset',
      danger: true,
      onConfirm: () => store.resetLocal(),
    });
  });
}

export function phaseOverrideSheet(info) {
  optionSheet({
    title: 'Phase override',
    sub: 'phases normally advance by calendar',
    options: [
      { label: 'Automatic (by date)', selected: !store.settings.phaseOverride, value: null },
      ...store.plan.phases.map((p) => ({
        label: p.name,
        hint: `${fmtDate(p.start)} – ${fmtDate(p.end)}`,
        selected: store.settings.phaseOverride === p.id,
        value: p.id,
      })),
    ],
    onPick(opt) {
      store.clearDraft(); // prescriptions change with the phase — rebuild before the emit re-renders
      store.saveSettings({ phaseOverride: opt.value });
      toast(opt.value ? `Phase set to ${opt.label}` : 'Back to automatic');
    },
  });
}

function exportData() {
  const blob = new Blob(
    [JSON.stringify({ kind: 'protocol-export', exported: new Date().toISOString(), plan: store.plan, history: store.history }, null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `protocol-export-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

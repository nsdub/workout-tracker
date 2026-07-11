// THE BOARD — a corkboard of pinned cards and red yarn. Where am I now,
// what changes next, what's stalling, and the junk drawer of settings.
import { $, esc, fmtW, todayStr, fmtDate, daysBetween, weekKey, haptic } from '../util.js';
import { store } from '../store.js';
import * as engine from '../engine.js';
import { flushQueue, pullRemote } from '../github.js';
import { optionSheet, confirmSheet, openSheet, toast } from '../components.js';
import { connectSheet, handleSeedFile, howtoSheet } from './session.js';
import { applyWorld, WORLDS } from '../worlds.js';

let root = null;

export function render(el) {
  root = el;
  applyWorld('cb');
  const plan = store.plan;
  if (!plan) {
    root.onclick = null;
    root.innerHTML = `
      <div class="space-title">The Board</div>
      <div class="empty"><div class="card-e">
        <h3>Nothing pinned yet</h3><p>Connect the repo or import the seed bundle and the whole campaign goes up on the board.</p>
        <div style="display:flex;flex-direction:column;gap:9px;margin-top:14px">
          <button class="btn primary" id="p-connect">Connect GitHub</button>
          <button class="btn quiet" id="p-import">Import seed bundle</button>
          <input type="file" id="p-file" accept=".json" hidden>
        </div>
      </div></div>`;
    $('#p-connect', root).addEventListener('click', connectSheet);
    $('#p-import', root).addEventListener('click', () => $('#p-file', root).click());
    $('#p-file', root).addEventListener('change', handleSeedFile);
    return;
  }

  const today = todayStr();
  const info = engine.phaseForDate(plan, today, store.settings.phaseOverride);
  const stalls = engine.stalledLifts(plan, store.history);
  const next = engine.rotationNext(plan, store.history);
  const show = plan.show || { date: '2027-03-01', label: 'the show' };
  const showDays = Math.max(0, daysBetween(today, show.date));
  const last7 = store.history.filter((e) => daysBetween(e.date, today) < 7).length;
  const wk = weekKey(today);
  const cardio = store.settings.cardio[wk] || [false, false, false];

  root.innerHTML = `
    <div class="space-title">The Board</div>

    <div class="pin-card">
      <h3>${nowTitle(plan, info)}</h3>
      ${nowBody(plan, info, today)}
    </div>

    <div class="stat-pair">
      <div class="stat-note"><b class="num">${showDays}</b><i>days to ${esc(show.label)}</i></div>
      <div class="stat-note"><b class="num">${last7}/${plan.rotation.length}</b><i>nights this week</i></div>
    </div>

    <div class="pin-card">
      <h3>Up next</h3>
      <div class="rot-strip">
        ${plan.rotation.map((t) => `<span class="rot-cell ${t === next ? 'next' : ''}">${t.replace(/([AB])$/, ' $1')}</span>`).join('')}
      </div>
      <div class="np-line" style="margin-top:8px">${esc(WORLDS[next].world)} — sessions never get skipped, only pushed</div>
    </div>

    ${info.phase?.type !== 'prep' ? `
    <div class="pin-card">
      <h3>Cardio punch card</h3>
      <div class="np-line" style="margin-bottom:8px">${plan.rules.cardio.sessionsPerWeek.join('–')}× this week / ${plan.rules.cardio.minutes.join('–')} min / low intensity — punch one per session done</div>
      <div class="punchcard" id="cardio-dots">
        ${cardio.map((on, i) => `<button class="punch ${on ? 'on' : ''}" data-ci="${i}"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.6 4.5L19 7.5"/></svg></button>`).join('')}
      </div>
    </div>` : ''}

    ${stalls.length ? `
    <div class="sticky">
      <b>STUCK ⚠</b><br>
      ${stalls.map((s) => `${esc(s.name)} (${esc(s.sessionType)})`).join('<br>')}
      <br><span style="font-size:10px">swap variations at the next deload</span>
    </div>` : ''}

    <div class="yarn-map">${yarnMap(plan, info, today)}</div>

    <div class="pin-card">
      <h3>The arsenal</h3>
      <div class="np-line" style="margin-bottom:8px">tap a day to see its lifts and field guides</div>
      <div class="rot-strip" id="arsenal">
        ${plan.rotation.map((t) => `<button class="rot-cell" data-t="${t}">${t.replace(/([AB])$/, ' $1')}</button>`).join('')}
      </div>
    </div>

    <div class="sticky" id="rules-note">
      <b>HOUSE RULES</b><br>
      top of range every set → +${plan.rules.progression.upperIncrement} up / +${plan.rules.progression.lowerIncrement} low<br>
      compounds ${esc(plan.rules.rir.compound)} / deload ${esc(plan.rules.rir.deload)}<br>
      ${plan.rules.stall.sessions} flat nights → stuck note goes up
    </div>

    ${info.override ? `<button class="btn quiet" id="clear-override" style="margin:0 2px 14px;background:rgba(255,249,238,.8)">Un-pin the manual phase</button>` : ''}
    <button class="btn" id="open-drawer" style="margin:0 2px 8px">The junk drawer — sync ${statusLabel()} / ${store.queue.length} queued</button>
    <p style="position:relative;z-index:2;font-family:var(--mono);font-size:10px;color:#ffedc9;text-align:center;padding:10px 0;letter-spacing:.12em">APP ${esc(self.PROTOCOL_VERSION || 'dev')} / PLAN V${plan.version} / ${esc(plan.updated)}</p>`;

  wire(info);
}

function nowTitle(plan, info) {
  if (!info.phase) return 'Standby';
  return `${info.phase.name} — week ${info.week}/${info.weeks}${info.override ? ' (pinned by hand)' : ''}`;
}

function nowBody(plan, info, today) {
  if (!info.phase) {
    const first = plan.phases[0];
    const days = daysBetween(today, first.start);
    return `<div class="np-line">${esc(first.name)} starts ${fmtDate(first.start)} — <b class="num">${days}</b> day${days === 1 ? '' : 's'} out</div>`;
  }
  const p = info.phase;
  const total = daysBetween(p.start, p.end) + 1;
  const done = Math.min(total, Math.max(0, daysBetween(p.start, today) + 1));
  const left = Math.max(0, daysBetween(today, p.end));
  const upcoming = plan.phases.find((q) => q.start > p.start);
  return `
    ${p.note ? `<div class="np-note">${esc(p.note)}</div>` : ''}
    <div class="phase-prog"><i style="width:${Math.round((done / total) * 100)}%"></i></div>
    <div class="np-line"><b class="num">${left}</b> day${left === 1 ? '' : 's'} left${upcoming ? ` — then ${esc(upcoming.name)} (${fmtDate(upcoming.start)})` : ''}</div>`;
}

// The campaign as pinned polaroids joined by red yarn.
function yarnMap(plan, info, today) {
  const phases = plan.phases;
  const stepY = 84;
  const H = 60 + (phases.length - 1) * stepY + 50;
  const X = (i) => (i % 2 === 0 ? 96 : 288);
  const Y = (i) => 56 + i * stepY;
  let yarn = '';
  for (let i = 0; i < phases.length - 1; i++) {
    const x1 = X(i), y1 = Y(i), x2 = X(i + 1), y2 = Y(i + 1);
    yarn += `<path d="M${x1} ${y1} C ${x1 + (x2 > x1 ? 60 : -60)} ${y1 + 30}, ${x2 + (x2 > x1 ? -60 : 60)} ${y2 - 30}, ${x2} ${y2}" fill="none" stroke="#c0392b" stroke-width="2.5" opacity="${phases[i].end < today ? 1 : 0.45}" ${phases[i].end < today ? '' : 'stroke-dasharray="5 7"'}/>`;
  }
  const nodes = phases.map((p, i) => {
    const x = X(i), y = Y(i);
    const isNow = info.phase?.id === p.id;
    const past = !isNow && p.end < today;
    const rot = (i % 3) - 1;
    const w = 128, h = 44;
    return `
      <g transform="rotate(${rot * 2.4} ${x} ${y})">
        <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="3"
          fill="${isNow ? '#fff3a3' : '#fff9ee'}" stroke="${isNow ? '#c0392b' : '#c9b98f'}" stroke-width="${isNow ? 3 : 1.5}" opacity="${past ? 0.75 : 1}"/>
        <circle cx="${x}" cy="${y - h / 2 + 2}" r="5.5" fill="${isNow ? '#c0392b' : past ? '#7a8a4a' : '#3a7ca5'}" stroke="#5a2a1c" stroke-width="1"/>
        <text x="${x}" y="${y - 1}" text-anchor="middle" class="map-pin" font-size="14" fill="#3a2c1c">${esc(p.name.toUpperCase())}${past ? ' ✔' : ''}</text>
        <text x="${x}" y="${y + 14}" text-anchor="middle" font-family="monospace" font-size="8.5" fill="#7d6a4d">${fmtDate(p.start).toUpperCase()}–${fmtDate(p.end, { year: true }).toUpperCase()}</text>
        ${isNow ? `<text x="${x}" y="${y - h / 2 - 8}" text-anchor="middle" class="map-pin" font-size="10" fill="#c0392b">YOU ARE HERE</text>` : ''}
      </g>`;
  }).join('');
  return `<svg viewBox="0 0 384 ${H}" xmlns="http://www.w3.org/2000/svg">${yarn}${nodes}</svg>`;
}

function statusLabel() {
  const s = store.syncStatus();
  return { synced: 'ok', pending: 'pending', failed: 'FAILED', off: 'off' }[s];
}

function wire(info) {
  root.onclick = null;
  $('#cardio-dots', root)?.addEventListener('click', (e) => {
    const dot = e.target.closest('.punch');
    if (!dot) return;
    const wk = weekKey(todayStr());
    const arr = store.settings.cardio[wk] || [false, false, false];
    arr[Number(dot.dataset.ci)] = !arr[Number(dot.dataset.ci)];
    store.settings.cardio[wk] = arr;
    // prune punch cards older than ~6 weeks (unbounded growth otherwise)
    const cutoff = weekKey(new Date(Date.now() - 42 * 86400000).toISOString().slice(0, 10));
    for (const k of Object.keys(store.settings.cardio)) if (k < cutoff) delete store.settings.cardio[k];
    haptic(8);
    store.saveSettings();
  });
  $('#arsenal', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (b) arsenalSheet(b.dataset.t);
  });
  $('#clear-override', root)?.addEventListener('click', () => store.saveSettings({ phaseOverride: null }));
  $('#open-drawer', root).addEventListener('click', () => drawerSheet(info));
}

function arsenalSheet(type) {
  const plan = store.plan;
  const s = plan.sessions[type];
  openSheet(`
    <h2>${esc(s.name)} — ${esc(WORLDS[type].world)}</h2>
    <div class="sub">tap a lift for the field guide</div>
    <div class="opt-list">
      ${s.exercises.map((slot) => `
        <button class="opt" data-ex="${esc(slot.id)}">
          ${esc(engine.exMeta(plan, slot.id).name)}
          <span class="hint num">${slot.sets}×${slot.repMin === slot.repMax ? slot.repMin : `${slot.repMin}–${slot.repMax}`}${slot.repUnit === 'sec' ? 's' : ''} @ ${slot.seed == null ? (engine.exMeta(plan, slot.id).bodyweight ? 'BW' : '?') : fmtW(slot.seed)}</span>
        </button>`).join('')}
    </div>`, {
    onOpen(sheet, close) {
      sheet.addEventListener('click', (e) => {
        const b = e.target.closest('.opt');
        if (b) { close(); setTimeout(() => howtoSheet(b.dataset.ex), 120); }
      });
    },
  });
}

function drawerSheet(info) {
  openSheet(`
    <h2>The junk drawer</h2>
    <div class="sub">uplink / device / data</div>
    <div class="card">
      <div class="kv"><span class="k">Repo</span><span class="v">${esc(store.settings.owner)}/${esc(store.settings.repo)}</span></div>
      <div class="kv"><span class="k">Token</span><button class="v" id="sd-token">${store.settings.token ? 'update' : 'add'}</button></div>
      <div class="kv"><span class="k">Sync status</span><span class="v ${store.syncStatus() === 'synced' ? 'ok' : store.syncStatus() === 'failed' ? 'bad' : ''}">${statusLabel()}</span></div>
      ${syncError() ? `<div class="kv"><span class="k" style="color:#b3492f">Error</span><span class="v" style="max-width:58%;white-space:normal">${esc(syncError())}</span></div>` : ''}
      <div class="kv"><span class="k">Queue</span><span class="v num">${store.queue.length}</span></div>
      <div class="kv"><span class="k">Sync now</span><button class="v" id="sd-sync">run</button></div>
    </div>
    <div class="card">
      <div class="kv"><span class="k">Rest timer</span><button class="v" id="sd-rest">${store.settings.restTimer ? 'on' : 'off'}</button></div>
      <div class="kv"><span class="k">Haptics</span><button class="v" id="sd-haptics">${store.settings.haptics ? 'on' : 'off'}</button></div>
      <div class="kv"><span class="k">Phase override</span><button class="v" id="sd-phase">${info.override ? esc(info.phase.name) : 'auto'}</button></div>
      <div class="kv"><span class="k">Import seed</span><button class="v" id="sd-import">file</button><input type="file" id="sd-file" accept=".json" hidden></div>
      <div class="kv"><span class="k">Export data</span><button class="v" id="sd-export">download</button></div>
      <div class="kv"><span class="k">Reset device</span><button class="v" id="sd-reset" style="color:#b3492f">reset</button></div>
    </div>`, {
    onOpen(sheet, close) {
      $('#sd-token', sheet).addEventListener('click', () => { close(); connectSheet(); });
      $('#sd-sync', sheet).addEventListener('click', async () => {
        close(); toast('Syncing…');
        await flushQueue(); await pullRemote();
        toast(store.syncStatus() === 'synced' ? 'All caught up' : 'Still some pending', store.syncStatus() === 'synced' ? 'ok' : 'bad');
      });
      $('#sd-rest', sheet).addEventListener('click', () => { store.saveSettings({ restTimer: !store.settings.restTimer }); close(); });
      $('#sd-haptics', sheet).addEventListener('click', () => { store.saveSettings({ haptics: !store.settings.haptics }); close(); });
      $('#sd-phase', sheet).addEventListener('click', () => { close(); phaseOverrideSheet(info); });
      $('#sd-import', sheet).addEventListener('click', () => $('#sd-file', sheet).click());
      $('#sd-file', sheet).addEventListener('change', (e) => { handleSeedFile(e); close(); });
      $('#sd-export', sheet).addEventListener('click', exportData);
      $('#sd-reset', sheet).addEventListener('click', () => {
        close();
        confirmSheet({
          title: 'Reset this device?',
          body: store.queue.length
            ? `<b>${store.queue.length} item(s) are NOT on GitHub yet and will be lost forever.</b> Export first. Data already synced is untouched.`
            : 'Clears everything local. Data already on GitHub is untouched.',
          confirmLabel: 'Reset', danger: true,
          onConfirm: () => store.resetLocal(),
        });
      });
    },
  });
}

export function phaseOverrideSheet(info) {
  optionSheet({
    title: 'Pin a phase by hand',
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
      if (opt.value === (store.settings.phaseOverride ?? null)) return;
      const apply = () => {
        store.clearDraft();
        store.saveSettings({ phaseOverride: opt.value });
        toast(opt.value ? `Pinned: ${opt.label}` : 'Back to automatic');
      };
      const dirty = store.draft?.exercises.some((x) => x.sets.some((s) => s.done));
      if (dirty) {
        confirmSheet({
          title: 'Drop tonight’s logged sets?',
          body: 'Changing phase rebuilds tonight from scratch.',
          confirmLabel: 'Change phase', danger: true,
          onConfirm: apply,
        });
      } else apply();
    },
  });
}

function syncError() {
  if (store.syncStatus() !== 'failed') return null;
  return store.queue.find((q) => q.lastError)?.lastError || store.meta.lastError;
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
  setTimeout(() => URL.revokeObjectURL(a.href), 2000); // sync revoke aborts the download on some engines
}

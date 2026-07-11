// MISSION CONTROL — the observatory deck above the universes. The road to
// the show is an orbit trail of planets; cardio is fuel; stalled lifts are
// distress beacons; the settings live in the systems console.
import { $, esc, fmtW, todayStr, fmtDate, daysBetween, weekKey, haptic } from '../util.js';
import { store } from '../store.js';
import * as engine from '../engine.js';
import { flushQueue, pullRemote } from '../github.js';
import { optionSheet, confirmSheet, openSheet, toast } from '../components.js';
import { connectSheet, handleSeedFile, howtoSheet } from './session.js';
import { applyWorld, UNIVERSES } from '../worlds.js';
import { sfx } from '../audio.js';

let root = null;

const PHASE_HUE = { calibration: '#3adcc8', build: '#ffd24a', deload: '#8f6fdc', assessment: '#ff5d7a', prep: '#ff9a5c' };

export function render(el) {
  root = el;
  applyWorld('cb');
  const plan = store.plan;
  if (!plan) {
    root.onclick = null;
    root.innerHTML = `
      <div class="space-title">Mission Control</div>
      <div class="empty"><div class="card-e">
        <h3>No mission loaded</h3><p>Connect the repo or import the seed bundle and the whole campaign lights up.</p>
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
  const weekPct = Math.min(1, last7 / plan.rotation.length);

  root.innerHTML = `
    <div class="space-title">Mission Control</div>

    <div class="hud-pair">
      <div class="gauge">
        ${gaugeRing(1 - Math.min(1, showDays / 233), '#ff5d7a')}
        <b class="num">${showDays}</b><i>days to ${esc(show.label)}</i>
      </div>
      <div class="gauge">
        ${gaugeRing(weekPct, '#3adcc8')}
        <b class="num">${last7}<u>/${plan.rotation.length}</u></b><i>nights this week</i>
      </div>
    </div>

    <div class="console-card now">
      <h3>${nowTitle(plan, info)}</h3>
      ${nowBody(plan, info, today)}
    </div>

    <div class="console-card">
      <h3>Up next</h3>
      <div class="rot-strip">
        ${plan.rotation.map((t) => `<span class="rot-cell ${t === next ? 'next' : ''}">${t.replace(/([AB])$/, ' $1')}</span>`).join('')}
      </div>
      <div class="cc-line" style="margin-top:9px">${esc(UNIVERSES[next].name)} — nights never get skipped, only pushed</div>
    </div>

    ${info.phase?.type !== 'prep' ? `
    <div class="console-card">
      <h3>Fuel cells</h3>
      <div class="cc-line" style="margin-bottom:9px">cardio — ${plan.rules.cardio.sessionsPerWeek.join('–')}× this week, ${plan.rules.cardio.minutes.join('–')} min low intensity</div>
      <div class="punchcard" id="cardio-dots">
        ${cardio.map((on, i) => `<button class="punch ${on ? 'on' : ''}" data-ci="${i}"><svg viewBox="0 0 24 24"><path d="M13 2 L5 14 h5 l-1 8 L18 9 h-6 Z"/></svg></button>`).join('')}
      </div>
    </div>` : ''}

    ${stalls.length ? `
    <div class="beacon">
      <b>⚠ DISTRESS BEACONS</b>
      ${stalls.map((s) => `<span>${esc(s.name)} <i>(${esc(s.sessionType)})</i></span>`).join('')}
      <span class="dim">swap variations at the next deload</span>
    </div>` : ''}

    <div class="orbit-map">${orbitMap(plan, info, today, show)}</div>

    <div class="console-card">
      <h3>The loadout</h3>
      <div class="cc-line" style="margin-bottom:9px">tap a day for its lifts and field guides</div>
      <div class="rot-strip" id="arsenal">
        ${plan.rotation.map((t) => `<button class="rot-cell" data-t="${t}" style="--c:${UNIVERSES[t].swatch}">${t.replace(/([AB])$/, ' $1')}</button>`).join('')}
      </div>
    </div>

    <div class="console-card manual">
      <h3>Flight manual</h3>
      <div class="cc-line">top of range every set → +${plan.rules.progression.upperIncrement} up / +${plan.rules.progression.lowerIncrement} low</div>
      <div class="cc-line">compounds ${esc(plan.rules.rir.compound)} · deload ${esc(plan.rules.rir.deload)}</div>
      <div class="cc-line">${plan.rules.stall.sessions} flat nights → a beacon goes up</div>
    </div>

    ${info.override ? `<button class="btn quiet" id="clear-override" style="margin:0 2px 14px">Release manual phase lock</button>` : ''}
    <button class="btn console-btn" id="open-drawer"><i class="cb-dot ${store.syncStatus()}"></i>Systems console — sync ${statusLabel()} / ${store.queue.length} queued</button>
    <p class="mission-foot">APP ${esc(self.PROTOCOL_VERSION || 'dev')} · PLAN V${plan.version} · ${esc(plan.updated)}</p>`;

  wire(info);
}

function gaugeRing(pct, color) {
  const R = 26, C = 2 * Math.PI * R;
  return `<svg class="g-ring" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="${R}" fill="none" stroke="rgba(138,154,200,.2)" stroke-width="5"/>
    <circle cx="32" cy="32" r="${R}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${(pct * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/>
  </svg>`;
}

function nowTitle(plan, info) {
  if (!info.phase) return 'Standby';
  return `${info.phase.name} — week ${info.week}/${info.weeks}${info.override ? ' (manual lock)' : ''}`;
}

function nowBody(plan, info, today) {
  if (!info.phase) {
    const first = plan.phases[0];
    const days = daysBetween(today, first.start);
    return `<div class="cc-line">${esc(first.name)} ignition ${fmtDate(first.start)} — <b class="num">${days}</b> day${days === 1 ? '' : 's'} out</div>`;
  }
  const p = info.phase;
  const total = daysBetween(p.start, p.end) + 1;
  const done = Math.min(total, Math.max(0, daysBetween(p.start, today) + 1));
  const left = Math.max(0, daysBetween(today, p.end));
  const upcoming = plan.phases.find((q) => q.start > p.start);
  return `
    ${p.note ? `<div class="cc-note">${esc(p.note)}</div>` : ''}
    <div class="phase-prog"><i style="width:${Math.round((done / total) * 100)}%"></i></div>
    <div class="cc-line"><b class="num">${left}</b> day${left === 1 ? '' : 's'} left${upcoming ? ` — then ${esc(upcoming.name)} (${fmtDate(upcoming.start)})` : ''}</div>`;
}

// The campaign as an orbit trail: every phase a planet, the show a ringed
// giant at the end of the line.
function orbitMap(plan, info, today, show) {
  const phases = plan.phases;
  const stepY = 86;
  const n = phases.length + 1; // +1 for the show itself
  const H = 70 + (n - 1) * stepY + 70;
  const X = (i) => (i % 2 === 0 ? 110 : 274);
  const Y = (i) => 64 + i * stepY;
  let trail = '';
  for (let i = 0; i < n - 1; i++) {
    const x1 = X(i), y1 = Y(i), x2 = X(i + 1), y2 = Y(i + 1);
    const past = phases[i].end < today;
    trail += `<path d="M${x1} ${y1} C ${x1 + (x2 > x1 ? 70 : -70)} ${y1 + 34}, ${x2 + (x2 > x1 ? -70 : 70)} ${y2 - 34}, ${x2} ${y2}" fill="none" stroke="${past ? '#ffd24a' : 'rgba(138,154,200,.4)'}" stroke-width="2.6" ${past ? '' : 'stroke-dasharray="4 8"'}/>`;
  }
  const nodes = phases.map((p, i) => {
    const x = X(i), y = Y(i);
    const isNow = info.phase?.id === p.id;
    const past = !isNow && p.end < today;
    const hue = PHASE_HUE[p.type] ?? '#8a9ac8';
    return `
      <g opacity="${past ? 0.65 : 1}">
        ${isNow ? `<circle cx="${x}" cy="${y}" r="24" fill="none" stroke="${hue}" stroke-width="2"><animate attributeName="r" values="22;30;22" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;.15;.9" dur="2.6s" repeatCount="indefinite"/></circle>` : ''}
        <circle cx="${x}" cy="${y}" r="17" fill="${hue}"/>
        <circle cx="${x - 5}" cy="${y - 5}" r="4.4" fill="rgba(255,255,255,.4)"/>
        ${past ? `<path d="M${x - 6} ${y} l4.4 4.4 l8 -9" stroke="#101a36" stroke-width="3.4" fill="none" stroke-linecap="round"/>` : ''}
        <text x="${x + (i % 2 === 0 ? 30 : -30)}" y="${y - 2}" text-anchor="${i % 2 === 0 ? 'start' : 'end'}" class="om-name">${esc(p.name.toUpperCase())}</text>
        <text x="${x + (i % 2 === 0 ? 30 : -30)}" y="${y + 13}" text-anchor="${i % 2 === 0 ? 'start' : 'end'}" class="om-date">${fmtDate(p.start).toUpperCase()} – ${fmtDate(p.end).toUpperCase()}</text>
        ${isNow ? `<text x="${x}" y="${y - 32}" text-anchor="middle" class="om-here">YOU ARE HERE</text>` : ''}
      </g>`;
  }).join('');
  const sx = X(n - 1), sy = Y(n - 1);
  const showNode = `
    <g>
      <circle cx="${sx}" cy="${sy}" r="26" fill="#ff5d7a"/>
      <circle cx="${sx - 8}" cy="${sy - 8}" r="6" fill="rgba(255,255,255,.4)"/>
      <ellipse cx="${sx}" cy="${sy}" rx="42" ry="11" fill="none" stroke="#ffd24a" stroke-width="3.4" transform="rotate(-14 ${sx} ${sy})"/>
      <path d="M${sx - 12} ${sy - 30} l5 -9 l7 6 l7 -6 l5 9 Z" fill="#ffd24a" stroke="#c2822c" stroke-width="1.6"/>
      <text x="${sx + (n % 2 ? 52 : -52)}" y="${sy - 2}" text-anchor="${(n - 1) % 2 === 0 ? 'start' : 'end'}" class="om-name big">${esc((show.label || 'THE SHOW').toUpperCase())}</text>
      <text x="${sx + ((n - 1) % 2 === 0 ? 52 : -52)}" y="${sy + 14}" text-anchor="${(n - 1) % 2 === 0 ? 'start' : 'end'}" class="om-date">${fmtDate(show.date, { year: true }).toUpperCase()}</text>
    </g>`;
  return `<svg viewBox="0 0 384 ${H}" xmlns="http://www.w3.org/2000/svg">
    ${Array.from({ length: 22 }, () => `<circle cx="${(Math.random() * 384).toFixed(0)}" cy="${(Math.random() * H).toFixed(0)}" r="${(Math.random() * 1.3 + 0.5).toFixed(1)}" fill="rgba(223,232,255,.5)"/>`).join('')}
    ${trail}${nodes}${showNode}
  </svg>`;
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
    sfx('tap');
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
    <h2>${esc(s.name)} — ${esc(UNIVERSES[type].name)}</h2>
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
    <h2>Systems console</h2>
    <div class="sub">uplink / device / data</div>
    <div class="card">
      <div class="kv"><span class="k">Repo</span><span class="v">${esc(store.settings.owner)}/${esc(store.settings.repo)}</span></div>
      <div class="kv"><span class="k">Token</span><button class="v" id="sd-token">${store.settings.token ? 'update' : 'add'}</button></div>
      <div class="kv"><span class="k">Sync status</span><span class="v ${store.syncStatus() === 'synced' ? 'ok' : store.syncStatus() === 'failed' ? 'bad' : ''}">${statusLabel()}</span></div>
      ${syncError() ? `<div class="kv"><span class="k" style="color:#ff5d7a">Error</span><span class="v" style="max-width:58%;white-space:normal">${esc(syncError())}</span></div>` : ''}
      <div class="kv"><span class="k">Queue</span><span class="v num">${store.queue.length}</span></div>
      <div class="kv"><span class="k">Sync now</span><button class="v" id="sd-sync">run</button></div>
    </div>
    <div class="card">
      <div class="kv"><span class="k">Rest timer</span><button class="v" id="sd-rest">${store.settings.restTimer ? 'on' : 'off'}</button></div>
      <div class="kv"><span class="k">Sound</span><button class="v" id="sd-sound">${store.settings.sound ? 'on' : 'off'}</button></div>
      <div class="kv"><span class="k">Haptics</span><button class="v" id="sd-haptics">${store.settings.haptics ? 'on' : 'off'}</button></div>
      <div class="kv"><span class="k">Phase override</span><button class="v" id="sd-phase">${info.override ? esc(info.phase.name) : 'auto'}</button></div>
      <div class="kv"><span class="k">Import seed</span><button class="v" id="sd-import">file</button><input type="file" id="sd-file" accept=".json" hidden></div>
      <div class="kv"><span class="k">Export data</span><button class="v" id="sd-export">download</button></div>
      <div class="kv"><span class="k">Reset device</span><button class="v" id="sd-reset" style="color:#ff5d7a">reset</button></div>
    </div>`, {
    onOpen(sheet, close) {
      $('#sd-token', sheet).addEventListener('click', () => { close(); connectSheet(); });
      $('#sd-sync', sheet).addEventListener('click', async () => {
        close(); toast('Syncing…');
        await flushQueue(); await pullRemote();
        toast(store.syncStatus() === 'synced' ? 'All caught up' : 'Still some pending', store.syncStatus() === 'synced' ? 'ok' : 'bad');
      });
      $('#sd-rest', sheet).addEventListener('click', () => { store.saveSettings({ restTimer: !store.settings.restTimer }); close(); });
      $('#sd-sound', sheet).addEventListener('click', () => { store.saveSettings({ sound: !store.settings.sound }); sfx('tap'); close(); });
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
    title: 'Lock a phase by hand',
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
        toast(opt.value ? `Locked: ${opt.label}` : 'Back to automatic');
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

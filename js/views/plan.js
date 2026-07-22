// MISSION CONTROL — the observatory deck above the universes. The road to
// the show is an orbit trail of planets; cardio is fuel; stalled lifts are
// distress beacons; the settings live in the systems console.
import { $, esc, fmtW, todayStr, fmtDate, daysBetween, weekKey, haptic, syncErrorHint } from '../util.js';
import { store } from '../store.js';
import * as engine from '../engine.js';
import { flushQueue, pullRemote } from '../github.js';
import { optionSheet, confirmSheet, openSheet, toast, ICONS } from '../components.js';
import { connectSheet, handleSeedFile, howtoSheet } from './session.js';
import { applyWorld, UNIVERSES } from '../worlds.js';
import { sfx } from '../audio.js';
import { pushStatus, enablePush, disablePush } from '../push.js';
import { previewSheet } from './preview.js';

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
        <div class="su-stars"><svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 1 L18.7 10.4 L28.5 11 L20.9 17.4 L23.4 27 L15 21.6 L6.6 27 L9.1 17.4 L1.5 11 L11.3 10.4 Z" fill="#ffd24a" stroke="#c2822c" stroke-width="1.4"/><circle cx="12" cy="13.4" r="1.5" fill="#2a1a08"/><circle cx="18" cy="13.4" r="1.5" fill="#2a1a08"/><path d="M12.6 17 q2.4 1.8 4.8 0" stroke="#2a1a08" stroke-width="1.2" fill="none"/></svg></div>
        <div class="su-poster" style="font-size:22px">No mission loaded</div>
        <p>Connect the repo or import the seed bundle and the whole campaign lights up.</p>
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
      <h3>The week ahead</h3>
      <div class="week-rows">${weekAhead(plan, next, today)}</div>
      <div class="cc-line" style="margin-top:9px">Train daily and this is the order. Rest any day — the order pauses, nothing is skipped.</div>
      <div class="cc-line dim">Cardio fits anywhere: 2–3 easy sessions a week, after lifting or on the rest day.</div>
    </div>

    ${info.phase?.type !== 'prep' ? `
    <div class="console-card">
      <h3>Fuel cells</h3>
      <div class="cc-line"><b class="num">${plan.rules.cardio.sessionsPerWeek.join('–')}×</b> a week · <b class="num">${plan.rules.cardio.minutes.join('–')}</b> min · easy pace</div>
      <div class="cc-line">After lifting or on a rest day. Never before lifting.</div>
      <div class="cc-line dim" style="margin-bottom:9px">Tap a cell when one's done — saves instantly, resets Monday.</div>
      <div class="punchcard" id="cardio-dots">
        ${cardio.map((on, i) => `<button class="punch ${on ? 'on' : ''}" data-ci="${i}"><svg viewBox="0 0 24 24"><path d="M13 2 L5 14 h5 l-1 8 L18 9 h-6 Z"/></svg></button>`).join('')}
      </div>
      <button class="btn quiet" id="cardio-log" style="margin-top:10px">＋ Log a session</button>
    </div>` : ''}

    ${stalls.length ? `
    <div class="beacon">
      <b>⚠ DISTRESS BEACONS</b>
      ${stalls.map((s) => `<span>${esc(s.name)} <i>(${esc(s.sessionType)})</i></span>`).join('')}
      <span class="dim">Swap variations at the next deload.</span>
    </div>` : ''}

    <div class="orbit-map">${orbitMap(plan, info, today, show)}</div>

    <div class="console-card">
      <h3>The six workouts</h3>
      <div class="cc-line" style="margin-bottom:9px">Every workout's exercise list, sets and weights — tap one.</div>
      <div class="rot-strip" id="arsenal">
        ${plan.rotation.map((t) => `<button class="rot-cell" data-t="${t}" style="--c:${UNIVERSES[t].swatch}">${t.replace(/([AB])$/, ' $1')}</button>`).join('')}
      </div>
    </div>

    <div class="console-card manual">
      <h3>How the weights go up</h3>
      <div class="cc-line">Hit the TOP of the rep range on every set of a lift → next session the app raises that lift. Miss it → same weights again. Progress on one day carries to the same lift on every other day it appears.</div>
      <div class="cc-line" style="margin-top:6px">${incrementSentence(plan)}</div>
      <div class="cc-line" style="margin-top:6px">Every morning at 6 a trainer agent reads your full log — every set, every note — and commits its review to the repo: a plain-English brief plus any lifts it's adjusting, with reasons. The app applies those adjustments to tonight's numbers (each one says so on its card) and tells you in the briefing exactly which review tonight is running on. If a review hasn't seen your latest session, the app says that too and falls back to the rules above — it never pretends.</div>
      <div class="cc-line" style="margin-top:6px">Every prefill explains itself on its card, and you can always override it: what you actually log outranks everything and is what the next review reads.</div>
      <div class="cc-line" style="margin-top:6px">Effort: on big lifts stop with 1–2 reps left in the tank; the final set of small lifts can go to failure. On deload weeks stay 4+ reps away from failure.</div>
      <div class="cc-line" style="margin-top:6px">Same weight ${plan.rules.stall.sessions} sessions in a row → a red beacon lights up here, and the lift gets a variation swap at the next deload.</div>
    </div>

    ${info.override ? `<button class="btn quiet" id="clear-override" style="margin:0 2px 14px">Release manual phase lock</button>` : ''}
    <button class="btn console-btn" id="open-drawer"><i class="cb-dot ${store.syncStatus()}"></i>Systems console — sync ${statusLabel()} / ${store.queue.length} queued</button>
    <p class="mission-foot">APP ${esc(self.PROTOCOL_VERSION || 'dev')} · PLAN V${plan.version} · ${esc(plan.updated)}</p>`;

  wire(info);
}

// How much each lift goes up by — READ OFF THE PLAN, never hand-written.
// A hand-written version of this sentence has been wrong twice: it claimed
// pin-true stepping for cable lifts that were still on a fictional 2.5 grid,
// then, once those were fixed, silently omitted the 7.5 lb machines.
function incrementSentence(plan) {
  const groups = new Map(); // label → Set(exercise names)
  for (const session of Object.values(plan.sessions)) {
    for (const slot of session.exercises) {
      const meta = engine.exMeta(plan, slot.id);
      if (meta.bodyweight) continue;
      const label = meta.gear
        ? `to the next real pin on your ${plan.gear?.[meta.gear]?.label ?? 'cable stack'} (+1.5 or +2 lb)`
        : `by ${engine.increment(plan, slot.id)} lb`;
      if (!groups.has(label)) groups.set(label, new Set());
      groups.get(label).add(meta.name);
    }
  }
  // biggest group first — it reads as the rule, the rest as its exceptions
  const parts = [...groups.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .map(([label, names], i) => {
      if (i === 0) return `Most lifts go up <b>${esc(label)}</b>.`;
      const cap = label.charAt(0).toUpperCase() + label.slice(1);
      return `<b>${esc(cap)}</b> — ${esc([...names].sort().join(', '))}.`;
    });
  return parts.join(' ');
}

// The next seven days spelled out: tonight's session, then the rest of the
// loop, a rest day after Legs B, then the loop starts over.
function weekAhead(plan, next, today) {
  const rows = [];
  let idx = plan.rotation.indexOf(next);
  let d = 0;
  const dayLabel = (offset) => {
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Tomorrow';
    const dt = new Date(today + 'T12:00:00');
    dt.setDate(dt.getDate() + offset);
    return dt.toLocaleDateString('en-US', { weekday: 'long' });
  };
  // Honest "Today": once tonight is banked, rotationNext has already advanced
  // past it — so say what was DONE today, dimmed, and start the rotation rows
  // at Tomorrow instead of relabeling tomorrow's session "Today".
  const doneToday = [...store.history].reverse().find((e) => e.date === today);
  if (doneToday) {
    const t = doneToday.session_type;
    rows.push(`<div class="wk-row done" style="--c:${UNIVERSES[t]?.swatch ?? '#8a9ac8'}"><span class="wk-day">Today</span><span class="wk-sess">${esc(plan.sessions[t]?.name ?? t)}</span><span class="wk-done">✓ done</span></div>`);
    d = 1;
  }
  while (rows.length < 7) {
    const t = plan.rotation[idx];
    // Every scheduled day opens its card — "what am I lifting Thursday?" is
    // one tap, not a guess.
    rows.push(`<div class="wk-row tappable" role="button" tabindex="0" data-t="${t}" data-when="${esc(dayLabel(d))}" style="--c:${UNIVERSES[t].swatch}"><span class="wk-day">${dayLabel(d)}</span><span class="wk-sess">${esc(plan.sessions[t]?.name ?? t)}</span><span class="wk-go">${ICONS.chevR}</span></div>`);
    if (idx === plan.rotation.length - 1 && rows.length < 7) {
      d++;
      rows.push(`<div class="wk-row rest"><span class="wk-day">${dayLabel(d)}</span><span class="wk-sess">${ICONS.moon} rest day</span></div>`);
    }
    idx = (idx + 1) % plan.rotation.length;
    d++;
  }
  return rows.slice(0, 7).join('');
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
  return { synced: 'OK', pending: 'pending', failed: 'FAILED', off: 'off' }[s];
}

function wire(info) {
  root.onclick = null;
  $('#cardio-log', root)?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('p3:log-cardio')));
  $('#cardio-dots', root)?.addEventListener('click', (e) => {
    const dot = e.target.closest('.punch');
    if (!dot) return;
    const wk = weekKey(todayStr());
    const arr = store.settings.cardio[wk] || [false, false, false];
    const i = Number(dot.dataset.ci);
    arr[i] = !arr[i];
    store.settings.cardio[wk] = arr;
    // prune punch cards older than ~6 weeks (unbounded growth otherwise)
    // todayStr, not toISOString: the cutoff must walk the LOCAL calendar or
    // an evening tap lands a UTC day ahead and prunes a week early
    const cutoff = weekKey(todayStr(new Date(Date.now() - 42 * 86400000)));
    for (const k of Object.keys(store.settings.cardio)) if (k < cutoff) delete store.settings.cardio[k];
    haptic(8);
    sfx(arr[i] ? 'objDone' : 'tap');
    store.saveSettings();
    const done = arr.filter(Boolean).length;
    toast(arr[i] ? `Fuel cell charged — cardio ${done}/${arr.length} this week · saved` : `Fuel cell drained — ${done}/${arr.length} this week`, 'ok', 2600);
  });
  $('#arsenal', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (b) arsenalSheet(b.dataset.t);
  });
  root.querySelector('.week-rows')?.addEventListener('click', (e) => {
    const row = e.target.closest('.wk-row.tappable');
    if (row) { haptic(4); arsenalSheet(row.dataset.t, row.dataset.when); }
  });
  // Releasing the lock rebuilds tonight from the calendar phase — it must
  // ride the same dirty-draft confirm as picking a phase, or the old
  // override's weights survive into the new night.
  $('#clear-override', root)?.addEventListener('click', () => applyPhaseOverride(null));
  $('#open-drawer', root).addEventListener('click', () => drawerSheet(info));
}

// The six-workouts strip and the week-ahead rows both open the real card —
// live prescriptions, not the program's static seed weights (which is what
// this sheet used to show, and why the numbers here never matched the ones
// the session screen actually prefilled).
function arsenalSheet(type, when = null) {
  previewSheet(type, { when });
}

function drawerSheet(info) {
  openSheet(`
    <h2>Systems console</h2>
    <div class="sub">Uplink / device / data</div>
    <div class="card">
      <div class="kv"><span class="k">Repo</span><span class="v">${esc(store.settings.owner)}/${esc(store.settings.repo)}</span></div>
      <div class="kv"><span class="k">Token</span><button class="v" id="sd-token">${store.settings.token ? 'Update' : 'Add'}</button></div>
      <div class="kv"><span class="k">Sync status</span><span class="v ${store.syncStatus() === 'synced' ? 'ok' : store.syncStatus() === 'failed' ? 'bad' : ''}">${statusLabel()}</span></div>
      ${store.syncError() ? `<div class="kv"><span class="k" style="color:#ff5d7a">Error</span><span class="v" style="max-width:58%;white-space:normal">${esc(store.syncError())}</span></div>` : ''}
      <div class="kv"><span class="k">Queue</span><span class="v num">${store.queue.length}</span></div>
      <div class="kv"><span class="k">Sync now</span><button class="v" id="sd-sync">Run</button></div>
      <div class="kv"><span class="k">App update</span><button class="v" id="sd-update">Check now</button></div>
    </div>
    <div class="card">
      <div class="kv"><span class="k">Rest timer</span><button class="v" id="sd-rest">${store.settings.restTimer ? 'On' : 'Off'}</button></div>
      <div class="kv"><span class="k">Rest alerts</span><button class="v" id="sd-push">…</button></div>
      <div class="kv"><span class="k">Sound</span><button class="v" id="sd-sound">${store.settings.sound ? 'On' : 'Off'}</button></div>
      <div class="kv"><span class="k">Haptics</span><button class="v" id="sd-haptics">${store.settings.haptics ? 'On' : 'Off'}</button></div>
      <div class="kv"><span class="k">Phase override</span><button class="v" id="sd-phase">${info.override ? esc(info.phase.name) : 'Auto'}</button></div>
      <div class="kv"><span class="k">Import seed</span><button class="v" id="sd-import">File</button><input type="file" id="sd-file" accept=".json" hidden></div>
      <div class="kv"><span class="k">Export data</span><button class="v" id="sd-export">Download</button></div>
      <div class="kv"><span class="k">Reset device</span><button class="v" id="sd-reset" style="color:#ff5d7a">Reset</button></div>
    </div>`, {
    onOpen(sheet, close) {
      $('#sd-token', sheet).addEventListener('click', () => { close(); connectSheet(); });
      $('#sd-sync', sheet).addEventListener('click', async () => {
        close(); toast('Syncing…');
        await flushQueue({ force: true }); await pullRemote();
        if (store.syncStatus() === 'synced') return toast('All caught up', 'ok');
        toast(syncErrorHint(store.syncError()) ?? 'Still some pending', 'bad');
      });
      $('#sd-update', sheet).addEventListener('click', async () => {
        close();
        toast('Checking for a new version…');
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (!reg) return toast(`No offline worker — running ${self.PROTOCOL_VERSION} straight from the network`, 'ok', 3400);
          await reg.update();
          if (reg.installing || reg.waiting) toast('Update found — installing now, it applies in a moment', 'ok', 3600);
          else toast(`You're on the latest (${self.PROTOCOL_VERSION})`, 'ok', 3000);
        } catch { toast('Could not check — are you online?', 'bad', 3000); }
      });
      $('#sd-rest', sheet).addEventListener('click', () => { store.saveSettings({ restTimer: !store.settings.restTimer }); close(); });
      // Live status, resolved after the sheet paints (it asks the SW).
      pushStatus().then((s) => { const b = $('#sd-push', sheet); if (b) b.textContent = { on: 'On', off: 'Set up', blocked: 'Blocked', unsupported: 'N/A' }[s.state]; });
      $('#sd-push', sheet).addEventListener('click', () => { close(); pushSheet(); });
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

// Rest alerts: paste the worker URL once, tap on, done. Every claim here is
// checked against the live state — the switch only says "On" when a real
// subscription exists and the worker answered.
function pushSheet() {
  const url = store.settings.pushUrl ?? '';
  openSheet(`
    <h2>Rest alerts</h2>
    <div class="sub">A buzz when the rest is up — even locked, even in your pocket</div>
    <div class="card">
      <div class="cc-line" id="ps-state">Checking…</div>
    </div>
    <div class="card">
      <div class="field"><label>Alarm worker URL</label>
        <input id="ps-url" value="${esc(url)}" placeholder="https://protocol-rest-push.…workers.dev" autocapitalize="off" autocorrect="off" spellcheck="false"></div>
      <div class="cc-line" style="margin-top:2px">Deploy it once from <span class="num">push-worker/</span> in the repo: <span class="num">./scripts/deploy.sh</span>. It prints this URL.</div>
    </div>
    <div class="row-btns">
      <button class="btn quiet" id="ps-off">Turn off</button>
      <button class="btn primary" id="ps-on">Save &amp; turn on</button>
    </div>`, {
    onOpen(sheet, close) {
      const state = $('#ps-state', sheet);
      const paint = () => pushStatus().then((s) => { state.textContent = s.txt; });
      paint();
      $('#ps-on', sheet).addEventListener('click', async () => {
        const v = $('#ps-url', sheet).value.trim().replace(/\/$/, '');
        if (!/^https:\/\/\S+$/.test(v)) return toast('That needs to be an https:// URL', 'bad');
        store.saveSettings({ pushUrl: v });
        state.textContent = 'Subscribing…';
        try {
          await enablePush();
          toast('Rest alerts on — locked-phone bells from here on', 'ok', 3600);
          close();
        } catch (err) {
          state.textContent = err.message || 'Could not turn on';
          toast(err.message || 'Could not turn on', 'bad', 4000);
        }
      });
      $('#ps-off', sheet).addEventListener('click', async () => {
        await disablePush();
        store.saveSettings({ pushUrl: '' });
        toast('Rest alerts off — the in-app bell still rings', 'ok', 3000);
        close();
      });
    },
  });
}

export function phaseOverrideSheet(info) {
  optionSheet({
    title: 'Lock a phase by hand',
    sub: 'Phases normally advance by calendar',
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
      applyPhaseOverride(opt.value, opt.label);
    },
  });
}

// EVERY phase change — locking one, or releasing the lock back to the
// calendar — rebuilds tonight's draft, so every path clears it behind the
// same dirty-draft confirm. A draft built under the old phase would keep
// prescribing the old phase's weights.
function applyPhaseOverride(value, label = '') {
  const apply = () => {
    store.clearDraft();
    store.saveSettings({ phaseOverride: value });
    toast(value ? `Locked: ${label}` : 'Back to automatic');
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

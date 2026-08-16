// MISSION CONTROL — rebuilt from empty 2026-08-16 at the athlete's order.
// The old deck stacked eleven cards with no ranking; this one has five
// zones, ordered by what he needs while standing in a gym:
//   1 COMMAND DECK   where am I in the campaign (phase, week, show, nights)
//   2 WAITING ON YOU decisions the trainers are blocked on (only when real)
//   3 FLIGHT PLAN    the next seven days + fuel cells (cardio) in one place
//   4 THE HANGAR     the six workouts, one tap to any card
//   5 THE CAMPAIGN   the star map, folded behind a tap instead of mid-page
// Everything else — the rulebook, sync, device switches — is two buttons at
// the bottom. Nothing on this page scrolls past a decision to reach a fact.
import { $, esc, fmtW, todayStr, fmtDate, daysBetween, weekKey, haptic, syncErrorHint } from '../util.js';
import { store } from '../store.js';
import * as engine from '../engine.js';
import { flushQueue, pullRemote } from '../github.js';
import { optionSheet, confirmSheet, openSheet, toast, ICONS } from '../components.js';
import { connectSheet, handleSeedFile } from './session.js';
import { applyWorld, UNIVERSES, returnWorld } from '../worlds.js';
import { sfx } from '../audio.js';
import { pushStatus, enablePush, disablePush } from '../push.js';
import { previewSheet } from './preview.js';
import { propId, allProposals, undecidedProposals, proposalLine } from '../proposals.js';

let root = null;

const PHASE_HUE = { calibration: '#3adcc8', build: '#ffd24a', deload: '#8f6fdc', assessment: '#ff5d7a', prep: '#ff9a5c' };

export function render(el) {
  root = el;
  applyWorld('cb');
  const plan = store.plan;
  if (!plan) return renderEmpty();

  const today = todayStr();
  const info = engine.phaseForDate(plan, today, store.settings.phaseOverride);
  const stalls = engine.stalledLifts(plan, store.history);

  root.innerHTML = `
    <div class="space-title">Mission Control</div>
    ${commandDeck(plan, info, today)}
    ${waitingCard()}
    ${beaconCard(plan, stalls)}
    ${flightPlan(plan, today)}
    ${hangar(plan)}
    ${campaignCard(plan, info, today)}
    <div class="mc-foot">
      <button class="mc-foot-btn" id="mc-rules">${ICONS.gauge} The rulebook</button>
      <button class="mc-foot-btn" id="mc-console"><i class="mc-dot ${store.syncStatus()}"></i>Console · ${statusLabel()}${store.queue.length ? ` / ${store.queue.length} queued` : ''}</button>
    </div>
    <p class="mc-version">APP ${esc(self.PROTOCOL_VERSION || 'dev')} · PLAN V${plan.version} · ${esc(plan.updated)}</p>`;

  wire(plan, info);
}

function renderEmpty() {
  root.onclick = null;
  root.innerHTML = `
    <div class="space-title">Mission Control</div>
    <div class="mc-deck" style="text-align:center">
      <div class="mc-phase-name" style="margin-bottom:6px">No mission loaded</div>
      <div class="mc-line">Connect the repo or import the seed bundle and the whole campaign lights up.</div>
      <div style="display:flex;flex-direction:column;gap:9px;margin-top:14px">
        <button class="btn primary" id="mc-connect">Connect GitHub</button>
        <button class="btn quiet" id="mc-import">Import seed bundle</button>
        <input type="file" id="mc-file" accept=".json" hidden>
      </div>
    </div>`;
  $('#mc-connect', root).addEventListener('click', connectSheet);
  $('#mc-import', root).addEventListener('click', () => $('#mc-file', root).click());
  $('#mc-file', root).addEventListener('change', handleSeedFile);
}

// ——— 1 · THE COMMAND DECK ———
// One panel answers "where am I": the phase as a living star, the week bar,
// and two dials — days to the show, lifting nights this week. The dials
// count LIFTING nights only (engine.sortedHistory fences out conditioning;
// counting cardio once made this read an impossible 7/6).
function commandDeck(plan, info, today) {
  const show = plan.show || { date: '2027-03-01', label: 'the show' };
  const showDays = Math.max(0, daysBetween(today, show.date));
  const last7 = engine.sortedHistory(store.history).filter((e) => daysBetween(e.date, today) < 7).length;
  const dials = `
    <div class="mc-dials">
      <div class="mc-dial"><b class="num">${showDays}</b><i>days to ${esc(show.label)}</i></div>
      <div class="mc-dial"><b class="num">${last7}<u>/${plan.rotation.length}</u></b><i>nights this week</i></div>
    </div>`;

  if (!info.phase) {
    const first = plan.phases[0];
    const days = daysBetween(today, first.start);
    return `<div class="mc-deck">
      <div class="mc-phase-name">Standby</div>
      <div class="mc-line">${esc(first.name)} ignition ${fmtDate(first.start)} — <b class="num">${days}</b> day${days === 1 ? '' : 's'} out</div>
      ${dials}
    </div>`;
  }

  const p = info.phase;
  const hue = PHASE_HUE[p.type] ?? '#8a9ac8';
  const total = daysBetween(p.start, p.end) + 1;
  const done = Math.min(total, Math.max(0, daysBetween(p.start, today) + 1));
  const left = Math.max(0, daysBetween(today, p.end));
  const upcoming = plan.phases.find((q) => q.start > p.start);
  return `<div class="mc-deck">
    <div class="mc-phase">
      <span class="mc-orb" style="--c:${hue}"></span>
      <div class="mc-phase-t">
        <span class="mc-phase-name">${esc(p.name)}</span>
        <span class="mc-phase-sub">week ${info.week} of ${info.weeks}${info.override ? ' · manual lock' : ''}</span>
      </div>
      ${info.override ? '<button class="mc-unlock" id="mc-unlock">release</button>' : ''}
    </div>
    ${p.note ? `<div class="mc-line" style="margin-top:7px">${esc(p.note)}</div>` : ''}
    <div class="mc-track" style="--c:${hue}"><i style="width:${Math.round((done / total) * 100)}%"></i></div>
    <div class="mc-line"><b class="num">${left}</b> day${left === 1 ? '' : 's'} left${upcoming ? ` — then ${esc(upcoming.name)}, ${fmtDate(upcoming.start)}` : ''}</div>
    ${dials}
  </div>`;
}

// ——— 2 · WAITING ON YOU ———
// Rendered only when the trainers actually have something on the table —
// with the changes NAMED (shared renderer with the session briefing and the
// decision sheet, so all three screens tell the same story), never just a
// count. All-decided collapses to one review line.
function waitingCard() {
  const props = allProposals();
  if (!props.length) return '';
  const open = undecidedProposals();
  if (!open.length) {
    return `<div class="mc-card">
      <div class="mc-line">All ${props.length} program change${props.length === 1 ? '' : 's'} decided.
      <button class="mc-inline" id="mc-decide">Review or undo</button></div>
    </div>`;
  }
  return `<div class="mc-wait">
    <h3>Waiting on you</h3>
    <div class="mc-line" style="margin-bottom:4px">Your trainers want ${open.length === 1 ? 'one change' : `${open.length} changes`}. Nothing moves until you answer.</div>
    ${open.map((q) => `<div class="mc-wait-line">${proposalLine(q)}</div>`).join('')}
    <button class="btn primary" id="mc-decide" style="margin-top:10px">Answer yes or no</button>
  </div>`;
}

// ——— 3 · DISTRESS BEACONS ———
// A stall is the TRAINERS' problem: the athlete has no control that changes
// the program, so the beacon names who owns the lift and what they last
// called, and never issues an instruction he cannot execute.
function beaconCard(plan, stalls) {
  if (!stalls.length) return '';
  return `<div class="mc-beacon">
    <b>⚠ Distress beacons</b>
    ${stalls.map((s) => {
      const d = engine.stallDetail(plan, store.history, s.sessionType, s.id);
      return `<span>${esc(s.name)} <i>(${esc(s.sessionType)})</i>${d ? ` — top set stuck at <span class="num">${fmtW(d.weight)}</span> for ${d.sessions} session${d.sessions === 1 ? '' : 's'}` : ''}</span>
      <span class="mc-beacon-sub">${stallOwner(s)}</span>`;
    }).join('')}
  </div>`;
}

function stallOwner(s) {
  const coach = store.coach;
  const fresh = !!coach && engine.coachFresh(store.history, coach, todayStr());
  const o = fresh
    ? (coach.overrides ?? []).find((x) => x.exercise === s.id && (!x.session || x.session === s.sessionType))
    : null;
  const day = s.sessionType.replace(/([AB])$/, ' $1');
  if (o?.sets?.length) {
    return `Your trainers set ${esc(o.sets.map((q) => `${fmtW(q.weight)}×${q.reps}`).join(', '))} for your next ${esc(day)}.`;
  }
  return `Your trainers see this every morning — they set this lift on ${esc(day)} days.`;
}

// ——— 4 · THE FLIGHT PLAN ———
// The next seven days and the cardio punchcard in ONE card — both are
// scheduling. Honest "Today": once tonight is banked, rotationNext has
// already advanced, so the banked night shows dimmed-and-checked and the
// live rows start at Tomorrow (never relabeling tomorrow's session "Today").
function flightPlan(plan, today) {
  const next = engine.rotationNext(plan, store.history, store.settings.dayOverride);
  const rows = [];
  const label = (off) => {
    if (off === 0) return 'Today';
    if (off === 1) return 'Tomorrow';
    const dt = new Date(today + 'T12:00:00');
    dt.setDate(dt.getDate() + off);
    return dt.toLocaleDateString('en-US', { weekday: 'long' });
  };
  // each row carries its REAL date so the preview resolves that night's
  // phase (a deload-week night previewed "for today" showed build weights)
  const dateOf = (off) => {
    const dt = new Date(today + 'T12:00:00');
    dt.setDate(dt.getDate() + off);
    return dt.toLocaleDateString('sv-SE');
  };
  let d = 0;
  const banked = [...store.history].reverse().find((e) => e.date === today && !e.supplemental);
  if (banked) {
    const t = banked.session_type;
    rows.push(`<div class="mc-day done" style="--c:${UNIVERSES[t]?.swatch ?? '#8a9ac8'}"><span class="mc-day-l">Today</span><span class="mc-day-s">${esc(plan.sessions[t]?.name ?? t)}</span><span class="mc-day-ok">✓ banked</span></div>`);
    d = 1;
  }
  let idx = plan.rotation.indexOf(next);
  while (rows.length < 7) {
    const t = plan.rotation[idx];
    rows.push(`<div class="mc-day tappable" role="button" tabindex="0" data-t="${t}" data-when="${esc(label(d))}" data-date="${dateOf(d)}" style="--c:${UNIVERSES[t].swatch}"><span class="mc-day-l">${label(d)}</span><span class="mc-day-s">${esc(plan.sessions[t]?.name ?? t)}</span><span class="mc-day-go">${ICONS.chevR}</span></div>`);
    if (idx === plan.rotation.length - 1 && rows.length < 7) {
      d++;
      rows.push(`<div class="mc-day rest"><span class="mc-day-l">${label(d)}</span><span class="mc-day-s dim">${ICONS.moon} rest day</span></div>`);
    }
    idx = (idx + 1) % plan.rotation.length;
    d++;
  }

  const wk = weekKey(today);
  const cardio = store.settings.cardio[wk] || [false, false, false];
  const showFuel = engine.phaseForDate(plan, today, store.settings.phaseOverride).phase?.type !== 'prep';
  return `<div class="mc-card">
    <h3>The flight plan</h3>
    <div class="mc-days" id="mc-days">${rows.slice(0, 7).join('')}</div>
    ${store.settings.dayOverride ? `<div class="mc-line" style="margin-top:8px"><b>Set by hand:</b> tonight is ${esc(plan.sessions[store.settings.dayOverride]?.name ?? store.settings.dayOverride)}. Log it and the order continues from there.</div>` : ''}
    <div class="mc-line dim" style="margin-top:8px">Train daily and this is the order. Rest any day — it pauses, nothing is skipped.</div>
    <button class="btn quiet" id="mc-day-set" style="margin-top:10px">Set tonight’s workout</button>
    ${showFuel ? `
    <div class="mc-fuel">
      <div class="mc-fuel-t">Fuel cells — ${plan.rules.cardio.sessionsPerWeek.join('–')}× easy cardio a week, ${plan.rules.cardio.minutes.join('–')} min, never before lifting</div>
      <div class="mc-fuel-row">
        <span id="mc-fuel-cells">${cardio.map((on, i) => `<button class="mc-cell ${on ? 'on' : ''}" data-ci="${i}" aria-label="cardio session ${i + 1}"><svg viewBox="0 0 24 24"><path d="M13 2 L5 14 h5 l-1 8 L18 9 h-6 Z"/></svg></button>`).join('')}</span>
        <button class="mc-inline" id="mc-cardio-log">＋ log a session</button>
      </div>
    </div>` : ''}
  </div>`;
}

// ——— 5 · THE HANGAR ———
// Six chunky tiles, each glowing its universe's color — not six slivers of
// mono text. Tap one, get the whole card: live prescriptions, not seeds.
function hangar(plan) {
  return `<div class="mc-card">
    <h3>The hangar</h3>
    <div class="mc-tiles" id="mc-tiles">
      ${plan.rotation.map((t) => `
      <button class="mc-tile" data-t="${t}" style="--c:${UNIVERSES[t].swatch}">
        <b>${esc(plan.sessions[t]?.name ?? t)}</b>
        <i>${esc(UNIVERSES[t].name)}</i>
      </button>`).join('')}
    </div>
  </div>`;
}

// ——— 6 · THE CAMPAIGN ———
// A one-glance strip of the whole road (every phase a dot, the show a
// ringed giant), with the full star map one tap away instead of a
// screen-tall SVG parked in the middle of the deck.
function campaignCard(plan, info, today) {
  const n = plan.phases.length;
  const W = 384, y = 30, x0 = 26, x1 = 322;
  const X = (i) => x0 + (i * (x1 - x0)) / n;
  const dots = plan.phases.map((p, i) => {
    const hue = PHASE_HUE[p.type] ?? '#8a9ac8';
    const isNow = info.phase?.id === p.id;
    const past = !isNow && p.end < today;
    return `
      ${isNow ? `<circle cx="${X(i)}" cy="${y}" r="12" fill="none" stroke="${hue}" stroke-width="1.6"><animate attributeName="r" values="10;15;10" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;.2;.9" dur="2.6s" repeatCount="indefinite"/></circle>` : ''}
      <circle cx="${X(i)}" cy="${y}" r="7.5" fill="${hue}" opacity="${past ? 0.55 : 1}"/>
      ${past ? `<path d="M${X(i) - 3.4} ${y} l2.4 2.6 l4.6 -5.4" stroke="#101a36" stroke-width="2.2" fill="none" stroke-linecap="round"/>` : ''}`;
  }).join('');
  const show = plan.show || { date: '2027-03-01', label: 'the show' };
  return `<div class="mc-card">
    <h3>The campaign</h3>
    <svg class="mc-trail" viewBox="0 0 ${W} 60" aria-hidden="true">
      <line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="rgba(138,154,200,.35)" stroke-width="2" stroke-dasharray="3 6"/>
      ${dots}
      <circle cx="${x1 + 22}" cy="${y}" r="11" fill="#ff5d7a"/>
      <ellipse cx="${x1 + 22}" cy="${y}" rx="18" ry="5" fill="none" stroke="#ffd24a" stroke-width="2" transform="rotate(-14 ${x1 + 22} ${y})"/>
    </svg>
    <div class="mc-line">${info.phase ? `${esc(info.phase.name)} now — ` : ''}${esc(show.label)} lands ${fmtDate(show.date, { year: true })}.</div>
    <button class="btn quiet" id="mc-map" style="margin-top:10px">Open the star map</button>
  </div>`;
}

// The full map, in a sheet: the campaign as a winding orbit trail, every
// phase a planet, the show a ringed giant at the end of the line.
function starMapSheet() {
  const plan = store.plan;
  const today = todayStr();
  const info = engine.phaseForDate(plan, today, store.settings.phaseOverride);
  const show = plan.show || { date: '2027-03-01', label: 'the show' };
  const stepY = 88;
  const n = plan.phases.length + 1;
  const H = 60 + (n - 1) * stepY + 66;
  const X = (i) => (i % 2 === 0 ? 108 : 276);
  const Y = (i) => 56 + i * stepY;
  let trail = '';
  for (let i = 0; i < n - 1; i++) {
    const x1 = X(i), y1 = Y(i), x2 = X(i + 1), y2 = Y(i + 1);
    const past = plan.phases[i].end < today;
    trail += `<path d="M${x1} ${y1} C ${x1 + (x2 > x1 ? 70 : -70)} ${y1 + 36}, ${x2 + (x2 > x1 ? -70 : 70)} ${y2 - 36}, ${x2} ${y2}" fill="none" stroke="${past ? '#ffd24a' : 'rgba(138,154,200,.4)'}" stroke-width="2.6" ${past ? '' : 'stroke-dasharray="4 8"'}/>`;
  }
  const nodes = plan.phases.map((p, i) => {
    const x = X(i), y = Y(i);
    const isNow = info.phase?.id === p.id;
    const past = !isNow && p.end < today;
    const hue = PHASE_HUE[p.type] ?? '#8a9ac8';
    return `<g opacity="${past ? 0.65 : 1}">
      ${isNow ? `<circle cx="${x}" cy="${y}" r="24" fill="none" stroke="${hue}" stroke-width="2"><animate attributeName="r" values="22;30;22" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;.15;.9" dur="2.6s" repeatCount="indefinite"/></circle>` : ''}
      <circle cx="${x}" cy="${y}" r="17" fill="${hue}"/>
      <circle cx="${x - 5}" cy="${y - 5}" r="4.4" fill="rgba(255,255,255,.4)"/>
      ${past ? `<path d="M${x - 6} ${y} l4.4 4.4 l8 -9" stroke="#101a36" stroke-width="3.4" fill="none" stroke-linecap="round"/>` : ''}
      <text x="${x + (i % 2 === 0 ? 30 : -30)}" y="${y - 2}" text-anchor="${i % 2 === 0 ? 'start' : 'end'}" class="mc-map-name">${esc(p.name.toUpperCase())}</text>
      <text x="${x + (i % 2 === 0 ? 30 : -30)}" y="${y + 13}" text-anchor="${i % 2 === 0 ? 'start' : 'end'}" class="mc-map-date">${fmtDate(p.start).toUpperCase()} – ${fmtDate(p.end).toUpperCase()}</text>
      ${isNow ? `<text x="${x}" y="${y - 32}" text-anchor="middle" class="mc-map-here">YOU ARE HERE</text>` : ''}
    </g>`;
  }).join('');
  const sx = X(n - 1), sy = Y(n - 1);
  openSheet(`
    <h2>The star map</h2>
    <div class="sub">The whole campaign, ${esc(show.label)} at the end of the line</div>
    <svg class="mc-map" viewBox="0 0 384 ${H}" xmlns="http://www.w3.org/2000/svg">
      ${Array.from({ length: 24 }, () => `<circle cx="${(Math.random() * 384).toFixed(0)}" cy="${(Math.random() * H).toFixed(0)}" r="${(Math.random() * 1.3 + 0.5).toFixed(1)}" fill="rgba(223,232,255,.5)"/>`).join('')}
      ${trail}${nodes}
      <g>
        <circle cx="${sx}" cy="${sy}" r="26" fill="#ff5d7a"/>
        <circle cx="${sx - 8}" cy="${sy - 8}" r="6" fill="rgba(255,255,255,.4)"/>
        <ellipse cx="${sx}" cy="${sy}" rx="42" ry="11" fill="none" stroke="#ffd24a" stroke-width="3.4" transform="rotate(-14 ${sx} ${sy})"/>
        <text x="${sx + ((n - 1) % 2 === 0 ? 52 : -52)}" y="${sy - 2}" text-anchor="${(n - 1) % 2 === 0 ? 'start' : 'end'}" class="mc-map-name big">${esc((show.label || 'THE SHOW').toUpperCase())}</text>
        <text x="${sx + ((n - 1) % 2 === 0 ? 52 : -52)}" y="${sy + 14}" text-anchor="${(n - 1) % 2 === 0 ? 'start' : 'end'}" class="mc-map-date">${fmtDate(show.date, { year: true }).toUpperCase()}</text>
      </g>
    </svg>
    <button class="btn quiet" id="mm-close" style="margin-top:10px">Close</button>`, {
    onOpen(sheet, close) { $('#mm-close', sheet).addEventListener('click', close); },
  });
}

// ——— wiring ———

function wire(plan, info) {
  root.onclick = null;
  $('#mc-decide', root)?.addEventListener('click', openProposals);
  $('#mc-unlock', root)?.addEventListener('click', () => applyPhaseOverride(null));
  $('#mc-day-set', root)?.addEventListener('click', dayOverrideSheet);
  $('#mc-map', root)?.addEventListener('click', starMapSheet);
  $('#mc-rules', root).addEventListener('click', rulebookSheet);
  $('#mc-console', root).addEventListener('click', () => consoleSheet(info));
  $('#mc-tiles', root)?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (b) previewSheet(b.dataset.t, {});
  });
  $('#mc-days', root)?.addEventListener('click', (e) => {
    const row = e.target.closest('.mc-day.tappable');
    if (row) { haptic(4); previewSheet(row.dataset.t, { when: row.dataset.when, dateStr: row.dataset.date }); }
  });
  $('#mc-cardio-log', root)?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('p3:log-cardio')));
  $('#mc-fuel-cells', root)?.addEventListener('click', (e) => {
    const cell = e.target.closest('.mc-cell');
    if (!cell) return;
    const wk = weekKey(todayStr());
    const arr = store.settings.cardio[wk] || [false, false, false];
    const i = Number(cell.dataset.ci);
    arr[i] = !arr[i];
    store.settings.cardio[wk] = arr;
    // prune punch cards older than ~6 weeks — walked on the LOCAL calendar
    // (an evening tap through toISOString lands a UTC day ahead and pruned
    // a week early once)
    const cutoff = weekKey(todayStr(new Date(Date.now() - 42 * 86400000)));
    for (const k of Object.keys(store.settings.cardio)) if (k < cutoff) delete store.settings.cardio[k];
    haptic(8);
    sfx(arr[i] ? 'objDone' : 'tap');
    store.saveSettings();
    const done = arr.filter(Boolean).length;
    toast(arr[i] ? `Fuel cell charged — cardio ${done}/${arr.length} this week · saved` : `Fuel cell drained — ${done}/${arr.length} this week`, 'ok', 2600);
  });
}

// ——— the decision sheet ———
// YOUR PROGRAM, YOUR CALL. Trainers argue for structural changes; only the
// athlete accepts one, and accepting changes tonight immediately. plan.json
// is never rewritten — a decision is one line in data/coach/decisions.json.
// Marks are held locally and applied together on Save, so he can work the
// list and change his mind before anything commits.

export function openProposalsSheet() { openProposals(); }

function openProposals() {
  const plan = store.plan;
  const raw = allProposals();
  const decidedBy = new Map(store.decisions.map((d) => [propId(d.proposal), d]));
  const APPLIES = { remove: true, add: true, swap: true, reorder: true, volume: true, reprange: true, keep: true };
  const marks = new Map();
  const paintSave = (sheet) => {
    const btn = $('#mc-save', sheet);
    if (!btn) return;
    btn.disabled = marks.size === 0;
    btn.textContent = marks.size ? `Save ${marks.size} decision${marks.size === 1 ? '' : 's'}` : 'Nothing marked yet';
  };
  openSheet(`
    <h2>Your trainers want to change the program</h2>
    <div class="sub">${raw.length} proposal${raw.length === 1 ? '' : 's'} — mark them, then save. Nothing changes until you do.</div>
    <div class="pv-list">
      ${raw.map((p) => {
        const id = propId(p);
        const d = decidedBy.get(id);
        const applies = APPLIES[p.kind] && (p.kind !== 'swap' || plan.exercises[p.replacement]) && (p.kind !== 'volume' || p.sets > 0) && (p.kind !== 'reprange' || p.repMin > 0);
        const why = String(p.why ?? '');
        const gist = why.length > 150 ? why.slice(0, why.slice(0, 130).lastIndexOf(' ')).trim() : null;
        return `
        <div class="pv-row prop" data-id="${esc(id)}">
          <div class="pv-head">
            <span class="pv-name">${proposalLine(p, plan)}</span>
            <span class="pv-tag ${d?.decision === 'accepted' ? 'up' : ''}">${d ? esc(d.decision) : esc(p.from ?? 'trainer')}</span>
          </div>
          ${gist ? `<details class="why"><summary>${esc(gist)}…</summary><div class="pv-why">${esc(why)}</div></details>` : `<div class="pv-why">${esc(why)}</div>`}
          ${applies
            ? `<div class="row-btns" style="margin-top:8px">
                 <button class="btn quiet pr-btn" data-act="declined">No</button>
                 <button class="btn primary pr-btn" data-act="accepted">Accept</button>
               </div>`
            : '<div class="pv-last">The app can’t apply this one as written, so there’s nothing for you to answer. Your trainers will re-send it in a form that applies.</div>'}
        </div>`;
      }).join('') || '<div class="pv-foot">No open proposals. The panel raises these when your log gives it a reason to.</div>'}
    </div>
    <div class="pv-foot">Saving applies your accepted changes to tonight and records them in <span class="num">data/coach/decisions.json</span>. Your plan file is never rewritten, so anything here can be changed back.</div>
    ${raw.length ? '<button class="btn primary" id="mc-save" style="margin-top:12px" disabled>Nothing marked yet</button>' : ''}`, {
    onOpen(sheet, close) {
      // a re-open shows the answers already given
      for (const p of raw) {
        const prior = decidedBy.get(propId(p))?.decision;
        if (prior) marks.set(propId(p), prior);
      }
      const paint = () => {
        for (const row of sheet.querySelectorAll('.prop')) {
          const m = marks.get(row.dataset.id);
          for (const b of row.querySelectorAll('.pr-btn')) b.classList.toggle('marked', b.dataset.act === m);
          const tag = row.querySelector('.pv-tag');
          if (tag && m) { tag.textContent = m === 'accepted' ? 'accepting' : 'declining'; tag.className = `pv-tag ${m === 'accepted' ? 'up' : ''}`; }
        }
        paintSave(sheet);
      };
      paint();
      sheet.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-act]');
        if (btn) {
          const id = btn.closest('.prop').dataset.id;
          haptic(6);
          // the same answer twice un-marks it
          if (marks.get(id) === btn.dataset.act) marks.delete(id);
          else marks.set(id, btn.dataset.act);
          paint();
          return;
        }
        if (e.target.closest('#mc-save')) {
          const n = marks.size;
          for (const [id, decision] of marks) {
            const p = raw.find((q) => propId(q) === id);
            if (p) store.decide(p, decision);
          }
          const accepted = [...marks.values()].filter((v) => v === 'accepted').length;
          haptic([12, 40, 12]);
          close();
          store.clearDraft(); // tonight rebuilds under the new program
          toast(accepted
            ? `Saved — ${accepted} change${accepted === 1 ? '' : 's'} applied to tonight`
            : `Saved — ${n} declined, nothing changed`, 'ok', 3200);
          setTimeout(() => render(root), 200);
        }
      });
    },
  });
}

// ——— the rulebook ———
// Everything the deck used to say in prose, one tap away: who sets a
// weight, in order, and how far each machine steps. The increments are READ
// OFF THE PLAN — a hand-written version of that sentence has been wrong
// twice (fictional 2.5 lb cable grid; silently omitted 7.5 lb machines).
function rulebookSheet() {
  const plan = store.plan;
  const stall = plan.rules.stall.sessions;
  openSheet(`
    <h2>The rulebook</h2>
    <div class="sub">What decides a weight, in order</div>
    <div class="pv-list">
      <div class="pv-row"><div class="pv-head"><span class="pv-name">1 · Your trainers</span></div>
        <div class="pv-why">Every morning three specialists read your log separately — one on load, one on recovery and your notes, one on the program's shape. A head coach settles any disagreement and must pick a side, never split the difference. Whatever they decide becomes tonight's numbers, with the reason quoted on the card. Their raw arguments are committed to <span class="num">data/coach/panel/</span> before the head coach touches them.</div></div>
      <div class="pv-row"><div class="pv-head"><span class="pv-name">2 · The standing rules</span></div>
        <div class="pv-why">Used for any lift the trainers didn't set, or whenever a review is stale. Hit the top of the rep range on every set → the lift goes up next visit. Miss it → same weight. Progress on one day carries to the same lift on every other day it appears. Same weight ${stall} sessions running lights a red beacon on the deck.</div></div>
      <div class="pv-row"><div class="pv-head"><span class="pv-name">3 · Your machines</span></div>
        <div class="pv-why">${incrementList(plan)}</div></div>
      <div class="pv-row"><div class="pv-head"><span class="pv-name">4 · You</span></div>
        <div class="pv-why">Tap any number to change it. What you actually log outranks every rule above and is what tomorrow's review reads. Structural changes — dropping a lift, swapping one, changing a rep range — never happen without you accepting them on this deck.</div></div>
      <div class="pv-row"><div class="pv-head"><span class="pv-name">Effort</span></div>
        <div class="pv-why">Big lifts: stop 1–2 reps short of failure. The last set of small lifts can go to failure. Deloads: stay 4+ short.</div></div>
    </div>
    <button class="btn quiet" id="rb-close" style="margin-top:12px">Close</button>`, {
    onOpen(sheet, close) { $('#rb-close', sheet).addEventListener('click', close); },
  });
}

function incrementList(plan) {
  const groups = new Map(); // step label → Set(exercise names)
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
  // biggest group first, ties broken by label so the listing is stable;
  // every group is listed — nothing hides behind a "most lifts" summary
  return [...groups.entries()]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .map(([label, names]) => {
      const cap = label.charAt(0).toUpperCase() + label.slice(1);
      return `<b>${esc(cap)}</b><br><span style="opacity:.75">${esc([...names].sort().join(', '))}</span>`;
    })
    .join('<br><br>');
}

// ——— the systems console ———

function statusLabel() {
  return { synced: 'OK', pending: 'pending', failed: 'FAILED', off: 'off' }[store.syncStatus()];
}

function consoleSheet(info) {
  openSheet(`
    <h2>Systems console</h2>
    <div class="sub">Uplink / device / data</div>
    <div class="card">
      <div class="kv"><span class="k">Repo</span><span class="v">${esc(store.settings.owner)}/${esc(store.settings.repo)}</span></div>
      <div class="kv"><span class="k">Token</span><button class="v" id="sc-token">${store.settings.token ? 'Update' : 'Add'}</button></div>
      <div class="kv"><span class="k">Sync status</span><span class="v ${store.syncStatus() === 'synced' ? 'ok' : store.syncStatus() === 'failed' ? 'bad' : ''}">${statusLabel()}</span></div>
      ${store.syncError() ? `<div class="kv"><span class="k" style="color:#ff5d7a">Error</span><span class="v" style="max-width:58%;white-space:normal">${esc(store.syncError())}</span></div>` : ''}
      <div class="kv"><span class="k">Queue</span><span class="v num">${store.queue.length}</span></div>
      <div class="kv"><span class="k">Sync now</span><button class="v" id="sc-sync">Run</button></div>
      <div class="kv"><span class="k">App update</span><button class="v" id="sc-update">Check now</button></div>
    </div>
    <div class="card">
      <div class="kv"><span class="k">Rest timer</span><button class="v" id="sc-rest">${store.settings.restTimer ? 'On' : 'Off'}</button></div>
      <div class="kv"><span class="k">Rest alerts</span><button class="v" id="sc-push">…</button></div>
      <div class="kv"><span class="k">Sound</span><button class="v" id="sc-sound">${store.settings.sound ? 'On' : 'Off'}</button></div>
      <div class="kv"><span class="k">Haptics</span><button class="v" id="sc-haptics">${store.settings.haptics ? 'On' : 'Off'}</button></div>
      <div class="kv"><span class="k">Phase override</span><button class="v" id="sc-phase">${info.override ? esc(info.phase.name) : 'Auto'}</button></div>
      <div class="kv"><span class="k">Import seed</span><button class="v" id="sc-import">File</button><input type="file" id="sc-file" accept=".json" hidden></div>
      <div class="kv"><span class="k">Export data</span><button class="v" id="sc-export">Download</button></div>
      <div class="kv"><span class="k">Reset device</span><button class="v" id="sc-reset" style="color:#ff5d7a">Reset</button></div>
    </div>`, {
    onOpen(sheet, close) {
      $('#sc-token', sheet).addEventListener('click', () => { close(); connectSheet(); });
      $('#sc-sync', sheet).addEventListener('click', async () => {
        close(); toast('Syncing…');
        await flushQueue({ force: true }); await pullRemote();
        if (store.syncStatus() === 'synced') return toast('All caught up', 'ok');
        toast(syncErrorHint(store.syncError()) ?? 'Still some pending', 'bad');
      });
      $('#sc-update', sheet).addEventListener('click', async () => {
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
      $('#sc-rest', sheet).addEventListener('click', () => { store.saveSettings({ restTimer: !store.settings.restTimer }); close(); });
      // live status, resolved after the sheet paints (it asks the SW)
      pushStatus().then((s) => { const b = $('#sc-push', sheet); if (b) b.textContent = { on: 'On', off: 'Set up', blocked: 'Blocked', unsupported: 'N/A' }[s.state]; });
      $('#sc-push', sheet).addEventListener('click', () => { close(); pushSheet(); });
      $('#sc-sound', sheet).addEventListener('click', () => { store.saveSettings({ sound: !store.settings.sound }); sfx('tap'); close(); });
      $('#sc-haptics', sheet).addEventListener('click', () => { store.saveSettings({ haptics: !store.settings.haptics }); close(); });
      $('#sc-phase', sheet).addEventListener('click', () => { close(); phaseOverrideSheet(info); });
      $('#sc-import', sheet).addEventListener('click', () => $('#sc-file', sheet).click());
      $('#sc-file', sheet).addEventListener('change', (e) => { handleSeedFile(e); close(); });
      $('#sc-export', sheet).addEventListener('click', exportData);
      $('#sc-reset', sheet).addEventListener('click', () => {
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
// checked against live state — the switch only says On when a real
// subscription exists and the worker answered.
function pushSheet() {
  const url = store.settings.pushUrl ?? '';
  openSheet(`
    <h2>Rest alerts</h2>
    <div class="sub">A buzz when the rest is up — even locked, even in your pocket</div>
    <div class="card"><div class="mc-line" id="pa-state">Checking…</div></div>
    <div class="card">
      <div class="field"><label>Alarm worker URL</label>
        <input id="pa-url" value="${esc(url)}" placeholder="https://protocol-rest-push.…workers.dev" autocapitalize="off" autocorrect="off" spellcheck="false"></div>
      <div class="mc-line" style="margin-top:2px">Deploy it once from <span class="num">push-worker/</span> in the repo: <span class="num">./scripts/deploy.sh</span>. It prints this URL.</div>
    </div>
    <div class="row-btns">
      <button class="btn quiet" id="pa-off">Turn off</button>
      <button class="btn primary" id="pa-on">Save &amp; turn on</button>
    </div>`, {
    onOpen(sheet, close) {
      const state = $('#pa-state', sheet);
      pushStatus().then((s) => { state.textContent = s.txt; });
      $('#pa-on', sheet).addEventListener('click', async () => {
        const v = $('#pa-url', sheet).value.trim().replace(/\/$/, '');
        if (!/^https:\/\/\S+$/.test(v)) return toast('That needs to be an https:// URL', 'bad');
        const prevUrl = store.settings.pushUrl;
        store.saveSettings({ pushUrl: v });
        state.textContent = 'Subscribing…';
        try {
          await enablePush();
          toast('Rest alerts on — locked-phone bells from here on', 'ok', 3600);
          close();
        } catch (err) {
          // a URL that doesn't work is not saved — keeping it would leave
          // the console reading "Set up" while every future rest armed
          // nothing
          store.saveSettings({ pushUrl: prevUrl });
          $('#pa-url', sheet).value = v; // keep what they typed, for fixing
          state.textContent = err.message || 'Could not turn on';
          toast(err.message || 'Could not turn on', 'bad', 4000);
        }
      });
      $('#pa-off', sheet).addEventListener('click', async () => {
        await disablePush();
        store.saveSettings({ pushUrl: '' });
        toast('Rest alerts off — the in-app bell still rings', 'ok', 3000);
        close();
      });
    },
  });
}

// ——— overrides ———
// Both override paths rebuild tonight's draft behind the same dirty-draft
// confirm (a draft built under the old phase/day keeps the old weights),
// and both refund a clean unseen world draw to the universe pool first —
// without the refund a phase or day change quietly burned a draw and
// worlds repeated early. A dirty or reopened draft's world is never
// refunded (seen / already dealt).

function rebuildTonight() {
  const d = store.draft;
  const dirty = d?.exercises?.some((x) => x.sets.some((s) => s.done));
  if (d?.world && !dirty && !d.reopened) returnWorld(d.session_type, d.world);
  store.clearDraft();
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

function applyPhaseOverride(value, label = '') {
  const apply = () => {
    rebuildTonight();
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

// The manual day pin: where the six-day order resumes after a break. The
// athlete owns scheduling; the trainers own the numbers — picking a day
// never changes a weight, and the pin is consumed the moment a night banks
// (store.upsertEntry), so the order continues from what was actually done.
export function dayOverrideSheet() {
  const plan = store.plan;
  const auto = engine.rotationNext(plan, store.history); // what Automatic picks
  const lastByType = {};
  for (const e of engine.sortedHistory(store.history)) lastByType[e.session_type] = e.date;
  optionSheet({
    title: 'Set tonight’s workout',
    sub: 'The order continues from whatever you log',
    options: [
      { label: `Automatic — next is ${plan.sessions[auto]?.name ?? auto}`, selected: !store.settings.dayOverride, value: null },
      ...plan.rotation.map((t) => ({
        label: plan.sessions[t]?.name ?? t,
        hint: t === auto ? 'Next up' : lastByType[t] ? `Last ${fmtDate(lastByType[t])}` : 'Never logged',
        selected: store.settings.dayOverride === t,
        value: t,
      })),
    ],
    onPick(opt) {
      if (opt.value === (store.settings.dayOverride ?? null)) return;
      applyDayOverride(opt.value, opt.value ? (plan.sessions[opt.value]?.name ?? opt.value) : '');
    },
  });
}

function applyDayOverride(value, label = '') {
  const apply = () => {
    rebuildTonight();
    store.saveSettings({ dayOverride: value });
    toast(value ? `Tonight: ${label}. Once it’s logged the order continues from there.` : 'Back to the automatic order');
  };
  const dirty = store.draft?.exercises.some((x) => x.sets.some((s) => s.done));
  if (dirty) {
    confirmSheet({
      title: 'Drop tonight’s logged sets?',
      body: 'Changing the workout rebuilds tonight from scratch.',
      confirmLabel: 'Change workout', danger: true,
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

// THE SCRAPBOOK — every finished night taped in as a polaroid.
import { $, esc, fmtW, fmtDate, monthLabel, dayParts } from '../util.js';
import { store } from '../store.js';
import { topSet } from '../engine.js';
import { applyWorld, UNIVERSES, worldDef } from '../worlds.js';

let root = null;
const state = { tab: 'sessions', entryPath: null, exId: null };

// universe hues, mixed down to read on scrapbook paper with white type
const SWATCH = { PushA: '#c23b22', PullA: '#0f6b5e', LegsA: '#3e6b32', PushB: '#d95427', PullB: '#a86a1e', LegsB: '#2f6fa8' };

export function popBack() {
  if (state.entryPath || state.exId) {
    state.entryPath = null; state.exId = null;
    if (root) { render(root); root.scrollTop = 0; }
    return true;
  }
  return false;
}

function drillIn(patch) {
  Object.assign(state, patch);
  try { window.history.pushState({ p3: 'drill' }, ''); } catch { /* throttled */ }
  render(root);
  root.scrollTop = 0;
}

function backOut() {
  try { window.history.back(); } catch { popBack(); }
  setTimeout(() => { if (state.entryPath || state.exId) popBack(); }, 250);
}

export function render(el) {
  root = el;
  applyWorld('sb');
  if (!store.history.length) return renderEmpty();
  if (state.entryPath) return renderDetail();
  if (state.exId) return renderChart();
  renderList();
}

function renderEmpty() {
  root.onclick = null;
  root.innerHTML = `
    <div class="space-title">The Scrapbook</div>
    <div class="empty"><div class="card-e"><h3>Empty album</h3><p>Finish a night in any world and it gets taped in here.</p></div></div>`;
}

function segHtml() {
  return `
    <div class="space-title">The Scrapbook</div>
    <div class="seg">
      <button data-t="sessions" class="${state.tab === 'sessions' ? 'active' : ''}">Nights</button>
      <button data-t="exercises" class="${state.tab === 'exercises' ? 'active' : ''}">Lifts</button>
    </div>`;
}

function wireSeg() {
  root.querySelector('.seg').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-t]');
    if (!btn) return;
    state.tab = btn.dataset.t;
    state.entryPath = null; state.exId = null;
    render(root);
  });
}

function renderList() {
  if (state.tab === 'exercises') return renderLiftList();
  const entries = [...store.history].sort((a, b) => b.date.localeCompare(a.date));
  const queued = new Set(store.queue.map((q) => q.path));
  let lastMonth = '';
  const rows = entries.map((e) => {
    const path = store.entryPath(e);
    const sets = e.exercises.reduce((n, x) => n + x.sets.length, 0);
    const tonnage = Math.round(e.exercises.reduce((n, x) => n + x.sets.reduce((m, s) => m + (s.weight || 0) * s.reps, 0), 0));
    const { mon, day } = dayParts(e.date);
    const month = monthLabel(e.date);
    const label = month !== lastMonth ? `<div class="month-label">${month}</div>` : '';
    lastMonth = month;
    const name = store.plan?.sessions[e.session_type]?.name ?? e.session_type;
    // entries remember the exact world they were logged in; older ones only know the universe
    const world = (e.world && worldDef(e.session_type, e.world)?.name) || UNIVERSES[e.session_type]?.name || '';
    return `${label}
      <button class="polaroid" data-path="${esc(path)}">
        <span class="swatch" style="background:${SWATCH[e.session_type] ?? '#777'}">${mon} ${day}</span>
        <span><span class="p-name">${esc(name)}</span>
          <span class="p-meta">${esc(world)}<br>${sets} sets / ${tonnage >= 1000 ? `${(tonnage / 1000).toFixed(1)}k` : tonnage} lb${e.bodyweight ? ` / bw ${fmtW(e.bodyweight)}` : ''}${queued.has(path) ? ' / ✈ syncing' : ''}</span>
        </span>
        <span class="p-end">›</span>
      </button>`;
  }).join('');
  root.innerHTML = segHtml() + rows;
  wireSeg();
  root.onclick = (e) => {
    const row = e.target.closest('.polaroid');
    if (!row) return;
    drillIn({ entryPath: row.dataset.path });
  };
}

function renderDetail() {
  root.onclick = null;
  const entry = store.history.find((e) => store.entryPath(e) === state.entryPath);
  if (!entry) { state.entryPath = null; return renderList(); }
  const name = store.plan?.sessions[entry.session_type]?.name ?? entry.session_type;
  const phase = entry.phase === 'legacy' ? 'imported' : (store.plan?.phases.find((p) => p.id === entry.phase)?.name ?? entry.phase ?? '');
  root.innerHTML = `
    <div class="space-title">The Scrapbook</div>
    <div class="detail-sheet">
      <button class="back" id="back">← back to the album</button>
      <h1>${esc(name)}</h1>
      <div class="m">${fmtDate(entry.date, { year: true })}${entry.bodyweight ? ` / bw ${fmtW(entry.bodyweight)} lb` : ''}${phase ? ` / ${esc(phase)}` : ''}</div>
      ${entry.exercises.map((x) => {
        const top = topSet(x.sets);
        return `<div class="d-ex"><div class="n">${esc(x.name)}</div>
          <div class="d-sets">${x.sets.map((s) => `<span class="d-set ${top && s === top ? 'top' : ''}"><b class="num">${fmtW(s.weight)}</b>×${s.reps}</span>`).join('')}</div>
        </div>`;
      }).join('')}
      ${entry.notes ? `<div class="d-ex"><div class="n">Notes</div><div style="font-family:var(--mono);font-size:12px">${esc(entry.notes)}</div></div>` : ''}
    </div>`;
  $('#back', root).addEventListener('click', backOut);
}

function renderLiftList() {
  const map = new Map();
  for (const e of store.history) {
    for (const x of e.exercises) {
      const rec = map.get(x.id) || { id: x.id, name: x.name, count: 0, last: '' };
      rec.count += 1;
      if (e.date > rec.last) rec.last = e.date;
      map.set(x.id, rec);
    }
  }
  const items = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  root.innerHTML = segHtml() + items.map((x) => `
    <button class="polaroid" data-ex="${esc(x.id)}">
      <span><span class="p-name">${esc(x.name)}</span>
        <span class="p-meta">${x.count} sessions / last ${fmtDate(x.last)}</span></span>
      <span class="p-end">›</span>
    </button>`).join('');
  wireSeg();
  root.onclick = (e) => {
    const row = e.target.closest('.polaroid[data-ex]');
    if (!row) return;
    drillIn({ exId: row.dataset.ex });
  };
}

function renderChart() {
  root.onclick = null;
  const points = [];
  let name = state.exId;
  for (const e of [...store.history].sort((a, b) => a.date.localeCompare(b.date))) {
    const x = e.exercises.find((q) => q.id === state.exId);
    if (!x) continue;
    name = x.name;
    const top = topSet(x.sets);
    if (top) points.push({ date: e.date, w: top.weight, reps: top.reps });
  }
  const useReps = points.length > 0 && points.every((p) => !p.w);
  const series = useReps ? points.map((p) => ({ ...p, w: p.reps })) : points;
  const last = series[series.length - 1];
  const best = series.reduce((m, p) => (p.w > m.w ? p : m), series[0] ?? { w: 0 });
  root.innerHTML = `
    <div class="space-title">The Scrapbook</div>
    <div class="detail-sheet" style="padding-bottom:6px">
      <button class="back" id="back">← back to the lifts</button>
      <h1>${esc(name)}</h1>
      <div class="m">${useReps ? 'top-set reps' : 'top set'} per session</div>
    </div>
    <div class="chart-box">
      ${chartSvg(series)}
      <div class="chart-meta">
        <span>last <b class="num">${last ? fmtW(last.w) : '—'}</b></span>
        <span>best <b class="num">${best ? fmtW(best.w) : '—'}</b></span>
        <span><b class="num">${series.length}</b> sessions</span>
      </div>
    </div>`;
  $('#back', root).addEventListener('click', backOut);
}

function chartSvg(points) {
  const W = 340, H = 150, P = { t: 14, r: 14, b: 24, l: 38 };
  if (points.length < 2) return `<svg viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" fill="#7d6a4d" font-size="12" text-anchor="middle" font-family="monospace">not enough data yet</text></svg>`;
  const ws = points.map((p) => p.w);
  let lo = Math.min(...ws), hi = Math.max(...ws);
  if (lo === hi) { lo -= 10; hi += 10; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const X = (i) => P.l + (i / (points.length - 1)) * (W - P.l - P.r);
  const Y = (w) => P.t + (1 - (w - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.w).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${H}">
    <path d="${path}" fill="none" stroke="#c0392b" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="1 0"/>
    ${points.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.w).toFixed(1)}" r="${i === points.length - 1 ? 4 : 2.4}" fill="#c0392b"/>`).join('')}
    <text x="${P.l - 6}" y="${Y(hi - pad) + 4}" fill="#7d6a4d" font-size="10" text-anchor="end" font-family="monospace">${fmtW(Math.round(hi - pad))}</text>
    <text x="${P.l - 6}" y="${Y(lo + pad) + 4}" fill="#7d6a4d" font-size="10" text-anchor="end" font-family="monospace">${fmtW(Math.round(lo + pad))}</text>
    <text x="${P.l}" y="${H - 7}" fill="#7d6a4d" font-size="10" font-family="monospace">${fmtDate(points[0].date, { year: true })}</text>
    <text x="${W - P.r}" y="${H - 7}" fill="#7d6a4d" font-size="10" text-anchor="end" font-family="monospace">${fmtDate(points[points.length - 1].date, { year: true })}</text>
  </svg>`;
}

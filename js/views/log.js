// THE ATLAS — zoom out of the worlds and into the cosmos they float in.
// Every finished night is a planet on a winding star-path; months are
// sectors; PR nights wear a crown. Lifts are charted as constellations.
import { $, esc, fmtW, fmtDate, monthLabel, dayParts } from '../util.js';
import { store } from '../store.js';
import { topSet } from '../engine.js';
import { applyWorld, UNIVERSES, worldDef } from '../worlds.js';

let root = null;
const state = { tab: 'sessions', entryPath: null, exId: null };

// universe hues, neon-tuned to glow against the void
const SWATCH = { PushA: '#ff6a4c', PullA: '#3adcc8', LegsA: '#7ad48a', PushB: '#ff9a5c', PullB: '#ffd24a', LegsB: '#5cb8ff' };

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
    <div class="space-title">The Atlas</div>
    <div class="empty"><div class="card-e"><h3>Uncharted space</h3><p>Finish a night in any world and its star gets charted here.</p></div></div>`;
}

function segHtml() {
  return `
    <div class="space-title">The Atlas</div>
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
    const hasPr = false; // records live on the star itself below when known
    const { mon, day } = dayParts(e.date);
    const month = monthLabel(e.date);
    const sector = month !== lastMonth ? `<div class="sector"><i></i><span>${esc(month)} sector</span><i></i></div>` : '';
    lastMonth = month;
    const name = store.plan?.sessions[e.session_type]?.name ?? e.session_type;
    const world = (e.world && worldDef(e.session_type, e.world)?.name) || UNIVERSES[e.session_type]?.name || '';
    return `${sector}
      <button class="star-node" data-path="${esc(path)}" style="--c:${SWATCH[e.session_type] ?? '#8a9ac8'}">
        <span class="planet"><b class="num">${mon}<u>${day}</u></b></span>
        <span class="sn-info">
          <span class="sn-name">${esc(name)}</span>
          <span class="sn-world">${esc(world)}</span>
          <span class="sn-meta num">${sets} sets · ${tonnage >= 1000 ? `${(tonnage / 1000).toFixed(1)}k` : tonnage} lb${e.bodyweight ? ` · bw ${fmtW(e.bodyweight)}` : ''}${queued.has(path) ? ' · ⇡ Beaming up' : ''}</span>
        </span>
      </button>`;
  }).join('');
  root.innerHTML = segHtml() + `<div class="starpath">${rows}<div class="path-end"><i></i>The beginning</div></div>`;
  wireSeg();
  root.onclick = (e) => {
    const row = e.target.closest('.star-node');
    if (!row) return;
    drillIn({ entryPath: row.dataset.path });
  };
}

function renderDetail() {
  root.onclick = null;
  const entry = store.history.find((e) => store.entryPath(e) === state.entryPath);
  if (!entry) { state.entryPath = null; return renderList(); }
  const name = store.plan?.sessions[entry.session_type]?.name ?? entry.session_type;
  const world = (entry.world && worldDef(entry.session_type, entry.world)?.name) || UNIVERSES[entry.session_type]?.name || '';
  const phase = entry.phase === 'legacy' ? 'imported' : (store.plan?.phases.find((p) => p.id === entry.phase)?.name ?? entry.phase ?? '');
  root.innerHTML = `
    <div class="space-title">The Atlas</div>
    <div class="debrief" style="--c:${SWATCH[entry.session_type] ?? '#8a9ac8'}">
      <button class="back" id="back">← Back to the chart</button>
      <div class="db-head">
        <span class="planet big"></span>
        <span>
          <h1>${esc(name)}</h1>
          <div class="m">${esc(world)}</div>
          <div class="m dim">${fmtDate(entry.date, { year: true })}${entry.bodyweight ? ` · bw ${fmtW(entry.bodyweight)} lb` : ''}${phase ? ` · ${esc(phase)}` : ''}</div>
        </span>
      </div>
      ${entry.exercises.map((x) => {
        const top = topSet(x.sets);
        return `<div class="d-ex"><div class="n">${esc(x.name)}</div>
          <div class="d-sets">${x.sets.map((s) => `<span class="d-set ${top && s === top ? 'top' : ''}"><b class="num">${fmtW(s.weight)}</b>×${s.reps}</span>`).join('')}</div>
        </div>`;
      }).join('')}
      ${entry.notes ? `<div class="d-ex"><div class="n">Field notes</div><div style="font-family:var(--mono);font-size:12px;color:var(--ink)">${esc(entry.notes)}</div></div>` : ''}
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
  root.innerHTML = segHtml() + `<div class="lift-grid">` + items.map((x, i) => `
    <button class="lift-card" data-ex="${esc(x.id)}" style="--c:${['#ffd24a', '#3adcc8', '#ff6a4c', '#5cb8ff', '#8f6fdc', '#7ad48a'][i % 6]}">
      <span class="lc-orbit"><i></i></span>
      <span><span class="lc-name">${esc(x.name)}</span>
        <span class="lc-meta num">${x.count} nights · Last ${fmtDate(x.last)}</span></span>
      <span class="lc-end">›</span>
    </button>`).join('') + `</div>`;
  wireSeg();
  root.onclick = (e) => {
    const row = e.target.closest('.lift-card[data-ex]');
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
    <div class="space-title">The Atlas</div>
    <div class="debrief" style="padding-bottom:8px;--c:#ffd24a">
      <button class="back" id="back">← Back to the lifts</button>
      <h1>${esc(name)}</h1>
      <div class="m dim">${useReps ? 'Top-set reps' : 'Top set'} per night — the trajectory</div>
    </div>
    <div class="chart-box">
      ${chartSvg(series)}
      <div class="chart-meta">
        <span>last <b class="num">${last ? fmtW(last.w) : '—'}</b></span>
        <span>best <b class="num">${best ? fmtW(best.w) : '—'}</b></span>
        <span><b class="num">${series.length}</b> nights</span>
      </div>
    </div>`;
  $('#back', root).addEventListener('click', backOut);
}

function chartSvg(points) {
  const W = 340, H = 156, P = { t: 16, r: 16, b: 24, l: 38 };
  if (points.length < 2) return `<svg viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" fill="#8a9ac8" font-size="12" text-anchor="middle" font-family="monospace">Not enough data yet</text></svg>`;
  const ws = points.map((p) => p.w);
  let lo = Math.min(...ws), hi = Math.max(...ws);
  if (lo === hi) { lo -= 10; hi += 10; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const X = (i) => P.l + (i / (points.length - 1)) * (W - P.l - P.r);
  const Y = (w) => P.t + (1 - (w - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.w).toFixed(1)}`).join('');
  const bi = points.reduce((m, p, i) => (p.w > points[m].w ? i : m), 0);
  return `<svg viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="tj" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3adcc8"/><stop offset="1" stop-color="#ffd24a"/></linearGradient>
      <linearGradient id="tjf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,210,74,.22)"/><stop offset="1" stop-color="rgba(255,210,74,0)"/></linearGradient>
    </defs>
    ${[0.25, 0.5, 0.75].map((f) => `<line x1="${P.l}" y1="${P.t + f * (H - P.t - P.b)}" x2="${W - P.r}" y2="${P.t + f * (H - P.t - P.b)}" stroke="rgba(138,154,200,.16)" stroke-width="1" stroke-dasharray="3 5"/>`).join('')}
    <path d="${path} L${X(points.length - 1).toFixed(1)},${H - P.b} L${P.l},${H - P.b} Z" fill="url(#tjf)"/>
    <path d="${path}" fill="none" stroke="url(#tj)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.w).toFixed(1)}" r="${i === points.length - 1 ? 4.4 : 2.6}" fill="${i === points.length - 1 ? '#ffd24a' : '#3adcc8'}"/>`).join('')}
    <circle cx="${X(bi).toFixed(1)}" cy="${Y(points[bi].w).toFixed(1)}" r="7" fill="none" stroke="#ffd24a" stroke-width="1.6"><animate attributeName="r" values="7;10;7" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.3;1" dur="2.4s" repeatCount="indefinite"/></circle>
    <text x="${P.l - 6}" y="${Y(hi - pad) + 4}" fill="#8a9ac8" font-size="10" text-anchor="end" font-family="monospace">${fmtW(Math.round(hi - pad))}</text>
    <text x="${P.l - 6}" y="${Y(lo + pad) + 4}" fill="#8a9ac8" font-size="10" text-anchor="end" font-family="monospace">${fmtW(Math.round(lo + pad))}</text>
    <text x="${P.l}" y="${H - 7}" fill="#8a9ac8" font-size="10" font-family="monospace">${fmtDate(points[0].date, { year: true })}</text>
    <text x="${W - P.r}" y="${H - 7}" fill="#8a9ac8" font-size="10" text-anchor="end" font-family="monospace">${fmtDate(points[points.length - 1].date, { year: true })}</text>
  </svg>`;
}

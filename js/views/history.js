// History — sessions list with detail drill-in, plus a per-exercise
// weight-over-time chart (top set per session).
import { $, esc, fmtW, fmtDate, monthLabel, dayParts, ICONS } from '../util.js';
import { store } from '../store.js';
import { topSet } from '../engine.js';
import { setAccent } from '../theme.js';

let root = null;
const state = { tab: 'sessions', entryPath: null, exId: null };

const accVar = (type) => `var(--acc-${type.toLowerCase()})`;

function phaseLabel(phase) {
  if (!phase) return '';
  if (phase === 'legacy') return ' · imported';
  const name = store.plan?.phases.find((p) => p.id === phase)?.name ?? phase;
  return ` · ${esc(name)}`;
}

export function render(el) {
  root = el;
  if (!store.plan && !store.history.length) { setAccent(null); return renderEmpty(); }
  if (state.entryPath) return renderDetail();
  setAccent(null);
  if (state.exId) return renderChart();
  renderList();
}

function renderEmpty() {
  root.innerHTML = `
    <div class="empty">
      <div class="glyph"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4.2l2.8 1.6" stroke-linecap="round"/></svg></div>
      <h3>No history yet</h3>
      <p>Finished sessions land here.</p>
    </div>`;
}

function segHtml() {
  return `
    <div class="seg">
      <button data-t="sessions" class="${state.tab === 'sessions' ? 'active' : ''}">Sessions</button>
      <button data-t="exercises" class="${state.tab === 'exercises' ? 'active' : ''}">Exercises</button>
    </div>`;
}

function wireSeg() {
  root.querySelector('.seg').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-t]');
    if (!btn) return;
    state.tab = btn.dataset.t;
    state.entryPath = null;
    state.exId = null;
    render(root);
  });
}

// ——— Sessions list ———

function renderList() {
  if (state.tab === 'exercises') return renderExerciseList();
  const entries = [...store.history].sort((a, b) => b.date.localeCompare(a.date));
  const queued = new Set(store.queue.map((q) => q.path));

  if (!entries.length) return renderEmpty();

  let lastMonth = '';
  const rows = entries.map((e) => {
    const path = store.entryPath(e);
    const sets = e.exercises.reduce((n, x) => n + x.sets.length, 0);
    const { mon, day } = dayParts(e.date);
    const month = monthLabel(e.date);
    const label = month !== lastMonth ? `<div class="section-label">${month}</div>` : '';
    lastMonth = month;
    const name = store.plan?.sessions[e.session_type]?.name ?? e.session_type;
    return `${label}
      <div class="card" style="margin-bottom:8px">
        <button class="h-row" data-path="${esc(path)}">
          <span class="d">${mon}<b class="num">${day}</b></span>
          <span class="s-dot" style="background:${accVar(e.session_type)}"></span>
          <span><span class="t">${esc(name)}</span>
            <div class="m">${e.exercises.length} exercise${e.exercises.length === 1 ? '' : 's'} · ${sets} sets${e.bodyweight ? ` · bw ${fmtW(e.bodyweight)}` : ''}</div>
          </span>
          <span class="end">${queued.has(path) ? '<span class="q" title="pending sync"></span>' : ''}<span class="chev">${ICONS.chev}</span></span>
        </button>
      </div>`;
  }).join('');

  root.innerHTML = segHtml() + rows;
  wireSeg();
  root.onclick = (e) => {
    const row = e.target.closest('.h-row');
    if (!row) return;
    state.entryPath = row.dataset.path;
    render(root);
    root.scrollTop = 0;
  };
}

function renderDetail() {
  root.onclick = null;
  const entry = store.history.find((e) => store.entryPath(e) === state.entryPath);
  if (!entry) { state.entryPath = null; return renderList(); }
  setAccent(entry.session_type);
  const name = store.plan?.sessions[entry.session_type]?.name ?? entry.session_type;

  root.innerHTML = `
    <div class="detail-head">
      <button class="back" id="back">${ICONS.back} History</button>
      <h1>${esc(name)}</h1>
      <div class="m">${fmtDate(entry.date, { year: true })}${entry.bodyweight ? ` · bw ${fmtW(entry.bodyweight)} lb` : ''}${phaseLabel(entry.phase)}</div>
    </div>
    <div class="card">
      ${entry.exercises.map((x) => {
        const top = topSet(x.sets);
        return `
        <div class="d-ex">
          <div class="n">${esc(x.name)}</div>
          <div class="d-sets">
            ${x.sets.map((s) => `<span class="d-set ${top && s === top ? 'top' : ''}"><b>${fmtW(s.weight)}</b>×${s.reps}</span>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
    ${entry.notes ? `<div class="card"><div class="d-ex"><div class="n">Notes</div><div style="font-size:13.5px;color:var(--text2)">${esc(entry.notes)}</div></div></div>` : ''}`;

  $('#back', root).addEventListener('click', () => {
    state.entryPath = null;
    render(root);
  });
}

// ——— Exercises tab ———

function exerciseIndex() {
  const map = new Map();
  for (const e of store.history) {
    for (const x of e.exercises) {
      const rec = map.get(x.id) || { id: x.id, name: x.name, count: 0, last: '' };
      rec.count += 1;
      if (e.date > rec.last) rec.last = e.date;
      map.set(x.id, rec);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function renderExerciseList() {
  const items = exerciseIndex();
  root.innerHTML = segHtml() + (items.length ? `
    <div class="card">
      ${items.map((x) => `
        <button class="h-row" data-ex="${esc(x.id)}">
          <span><span class="t">${esc(x.name)}</span><div class="m">${x.count} sessions · last ${fmtDate(x.last)}</div></span>
          <span class="end"><span class="chev">${ICONS.chev}</span></span>
        </button>`).join('')}
    </div>` : `<div class="empty"><h3>No exercises yet</h3><p>Each lift gets a weight trend once it has logged sessions.</p></div>`);
  wireSeg();
  root.onclick = (e) => {
    const row = e.target.closest('.h-row[data-ex]');
    if (!row) return;
    state.exId = row.dataset.ex;
    render(root);
    root.scrollTop = 0;
  };
}

// Simple top-set weight over time. Deliberately the only chart in the app.
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

  const last = points[points.length - 1];
  const best = points.reduce((m, p) => (p.w > m.w ? p : m), points[0] ?? { w: 0 });

  root.innerHTML = `
    <div class="detail-head">
      <button class="back" id="back">${ICONS.back} Exercises</button>
      <h1>${esc(name)}</h1>
      <div class="m">top set per session</div>
    </div>
    <div class="card">
      <div class="chart-wrap">${chartSvg(points)}</div>
      <div class="chart-meta">
        <span>last <b class="num">${last ? fmtW(last.w) : '—'}</b></span>
        <span>best <b class="num">${best ? fmtW(best.w) : '—'}</b></span>
        <span><b class="num">${points.length}</b> sessions</span>
      </div>
    </div>`;

  $('#back', root).addEventListener('click', () => {
    state.exId = null;
    render(root);
  });
}

function chartSvg(points) {
  const W = 340, H = 150, P = { t: 14, r: 14, b: 24, l: 38 };
  if (points.length < 2) {
    return `<svg viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" fill="var(--text3)" font-size="12" text-anchor="middle" font-family="var(--mono)">not enough data yet</text></svg>`;
  }
  const ws = points.map((p) => p.w);
  let lo = Math.min(...ws), hi = Math.max(...ws);
  if (lo === hi) { lo -= 10; hi += 10; }
  const pad = (hi - lo) * 0.12;
  lo -= pad; hi += pad;
  const X = (i) => P.l + (i / (points.length - 1)) * (W - P.l - P.r);
  const Y = (w) => P.t + (1 - (w - lo) / (hi - lo)) * (H - P.t - P.b);

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.w).toFixed(1)}`).join('');
  const grid = [0.25, 0.5, 0.75].map((f) => {
    const y = P.t + f * (H - P.t - P.b);
    return `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
  }).join('');
  const dots = points.map((p, i) => {
    const isLast = i === points.length - 1;
    return `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.w).toFixed(1)}" r="${isLast ? 3.5 : 2}" fill="${isLast ? 'var(--accent-strong)' : 'var(--accent)'}" ${isLast ? '' : 'opacity="0.55"'}/>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}">
    ${grid}
    <text x="${P.l - 7}" y="${Y(hi - pad) + 4}" fill="var(--text3)" font-size="9.5" text-anchor="end" font-family="ui-monospace,monospace">${fmtW(Math.round(hi - pad))}</text>
    <text x="${P.l - 7}" y="${Y(lo + pad) + 4}" fill="var(--text3)" font-size="9.5" text-anchor="end" font-family="ui-monospace,monospace">${fmtW(Math.round(lo + pad))}</text>
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <text x="${P.l}" y="${H - 7}" fill="var(--text3)" font-size="9.5" font-family="ui-monospace,monospace">${fmtDate(points[0].date, { year: true })}</text>
    <text x="${W - P.r}" y="${H - 7}" fill="var(--text3)" font-size="9.5" text-anchor="end" font-family="ui-monospace,monospace">${fmtDate(points[points.length - 1].date, { year: true })}</text>
  </svg>`;
}

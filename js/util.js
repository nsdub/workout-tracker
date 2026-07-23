export const $ = (sel, root = document) => root.querySelector(sel);

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Weights render without trailing .0 and with .5/.25 kept (stack pins like 172.5)
export function fmtW(w) {
  if (w == null || Number.isNaN(w)) return '—';
  return Number.isInteger(w) ? String(w) : String(Math.round(w * 100) / 100);
}

export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(iso, { year = false } = {}) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}${year ? ` ’${String(y).slice(2)}` : ''}`;
}

export function monthLabel(iso) {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function dayParts(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return { mon: MONTHS[m - 1].toUpperCase(), day: d };
}

export function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
}

// ISO week key for the cardio checkboxes, e.g. "2026-W29"
export function weekKey(iso) {
  const d = new Date(iso + 'T12:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const firstThu = new Date(d.getFullYear(), 0, 4);
  const fday = (firstThu.getDay() + 6) % 7;
  firstThu.setDate(firstThu.getDate() - fday + 3);
  const week = 1 + Math.round((d - firstThu) / (7 * 86400000));
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// How long a night ran. Prefer the wall clock from the draft's birth; fall
// back to the span between the first and last logged set. A draft resumed
// days later (>6h) would lie about the night, so it defers to the set span
// when one exists. Never returns 0 — a logged night took at least a minute.
export function sessionMins(startedAt, ats, end = Date.now()) {
  const raw = ats.length > 1 ? Math.max(1, Math.round((Math.max(...ats) - Math.min(...ats)) / 60000)) : null;
  // The span fallback needs the SAME 6-hour ceiling the elapsed value has:
  // resuming a two-day-old draft made the set timestamps span the gap, and
  // the results card proudly reported "1505 minutes in the world".
  const span = raw && raw <= 360 ? raw : null;
  if (!startedAt) return span;
  const m = Math.max(1, Math.round((end - startedAt) / 60000));
  return m > 360 ? span : m;
}

// Map a raw GitHub error onto a sentence a human can act on — the toast must
// name the real blocker, never shrug. Null in, null out.
export function syncErrorHint(raw) {
  if (!raw) return null;
  const s = String(raw);
  if (/\b40[13]\b/.test(s)) return 'GitHub token expired or rejected — update it in the Systems console';
  if (/\b404\b/.test(s) || /repo not found/i.test(s)) return 'Repo not found — check the name and token scope';
  return s.slice(0, 120);
}

// iOS Safari/PWA has no navigator.vibrate — but since 17.4, toggling a
// switch-style checkbox fires the system haptic. A hidden label+input pair,
// created once on first use, is the whole trick.
let hapticSwitch = null;
function makeHapticSwitch() {
  if (typeof document === 'undefined' || !document.body) return null;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;top:-99px;left:-99px;width:1px;height:1px;opacity:0;pointer-events:none;';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  hapticSwitch = label;
  return label;
}

export function haptic(pattern = 10) {
  if (globalThis.__p3Haptics === false) return;
  try {
    // Android / anything with the real API: unchanged.
    if (navigator.vibrate) { navigator.vibrate(pattern); return; }
    // iOS fallback — only inside a real user gesture (background timer ticks
    // must never throw or fire ghost haptics), capped at 3 pulses so a long
    // celebration pattern doesn't machine-gun the Taptic engine.
    if (!navigator.userActivation?.isActive) return;
    const el = hapticSwitch ?? makeHapticSwitch();
    if (!el) return;
    const arr = Array.isArray(pattern) ? pattern : [pattern];
    let at = 0;
    let fired = 0;
    for (let i = 0; i < arr.length && fired < 3; i += 2) {
      if (at === 0) el.click();
      else setTimeout(() => { try { el.click(); } catch { /* gone */ } }, at);
      fired += 1;
      at += (Number(arr[i]) || 0) + (Number(arr[i + 1]) || 0);
    }
  } catch { /* unsupported */ }
}

// One night's prescribed sets as a line a lifter can read at a glance.
// Identical sets collapse ("3 × 160 × 10"); a ramp lists every rung
// ("155×8 · 185×8 · 205×8"), because the ramp IS the instruction.
export function fmtSetLine(sets, { repUnit = null, bodyweight = false } = {}) {
  if (!sets?.length) return '—';
  const reps = (r) => `${r}${repUnit === 'sec' ? 's' : ''}`;
  const wt = (w) => (bodyweight || !w ? 'BW' : `${fmtW(w)}`);
  const same = sets.every((s) => s.weight === sets[0].weight && s.reps === sets[0].reps);
  if (same) {
    const w = sets[0].weight;
    return bodyweight || !w
      ? `${sets.length} × ${reps(sets[0].reps)}`
      : `${sets.length} × ${wt(w)} × ${reps(sets[0].reps)}`;
  }
  return sets.map((s) => (s.weight == null ? `?×${reps(s.reps)}` : `${wt(s.weight)}×${reps(s.reps)}`)).join(' · ');
}

// Rough clock for a whole session: every set costs its rest plus ~40s of
// work. Labelled "≈" everywhere it shows — it is a planning aid, not a promise.
export function estimateMins(rows) {
  const secs = rows.reduce((n, r) => n + r.sets.length * ((r.rest ?? 90) + 40), 0);
  return Math.max(1, Math.round(secs / 60));
}

// Split a session's logged sets into REAL rest vs REAL work, using the
// work-start bell (restEndedAt) stamped on each set. The rest timer is global —
// one pill — so the rest before a set began when the PREVIOUS set (any exercise)
// was logged, and the bell marks where that rest ended and the set began:
//   rest = bell − previous set's time,  work = this set's time − bell.
// Sets with no bell (first set of the night, straight-into-superset, or history
// logged before this was captured) are skipped, never guessed. Returns null when
// too few sets carry timing to say anything honest. Medians, so one bathroom
// break doesn't distort the picture. mmss() formats the seconds as M:SS.
export function restWorkStats(exercises) {
  const all = (exercises ?? [])
    .flatMap((x) => x.sets ?? [])
    .filter((s) => s.at)
    .sort((a, b) => a.at - b.at);
  const rests = [];
  const works = [];
  for (let i = 1; i < all.length; i++) {
    const s = all[i];
    const R = s.restEndedAt;
    if (R == null || R < all[i - 1].at || R > s.at) continue; // can't split — skip
    rests.push((R - all[i - 1].at) / 1000);
    works.push((s.at - R) / 1000);
  }
  if (rests.length < 2) return null;
  const med = (a) => {
    const b = [...a].sort((x, y) => x - y);
    const m = b.length >> 1;
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
  };
  const sum = (a) => a.reduce((n, v) => n + v, 0);
  return {
    n: rests.length,
    restMed: Math.round(med(rests)),
    workMed: Math.round(med(works)),
    restTotal: Math.round(sum(rests)),
    workTotal: Math.round(sum(works)),
  };
}

export function mmss(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const ICONS = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.6 4.5L19 7.5"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  bar: '<svg viewBox="0 0 24 24"><path d="M4 12h2.2M17.8 12H20M7 8.5v7M17 8.5v7M9.5 12h5" stroke-linecap="round"/></svg>',
};

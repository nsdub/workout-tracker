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
  const span = ats.length > 1 ? Math.max(1, Math.round((Math.max(...ats) - Math.min(...ats)) / 60000)) : null;
  if (!startedAt) return span;
  const m = Math.max(1, Math.round((end - startedAt) / 60000));
  return m > 360 && span ? span : m;
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

export function haptic(pattern = 10) {
  if (globalThis.__p3Haptics === false) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
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

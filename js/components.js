// Shared interaction components: bottom sheet, numpad, option list, confirm,
// toast, rest timer ring, count-up numbers.
import { $, esc, fmtW, haptic, ICONS } from './util.js';

const sheetRoot = () => $('#sheet-root');

// Sheet lifecycle. Two hard rules learned the hard way:
//  1. A pending cleanup timer must never wipe a NEWER sheet's DOM — that
//     leaves an invisible full-screen tap blocker (frozen app).
//  2. Every open sheet owns one history entry so the Android back gesture
//     closes it instead of exiting the PWA.
let cleanupTimer = null;
let backEats = 0; // popstates we triggered ourselves via history.back()

function internalClose(fromPop) {
  const root = sheetRoot();
  if (!root.classList.contains('open')) return;
  const mySheet = root.querySelector('.sheet');
  root.classList.remove('open');
  clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(() => {
    // Only clear if this sheet is still the one mounted and nothing reopened.
    if (!root.classList.contains('open') && mySheet && root.contains(mySheet)) root.innerHTML = '';
  }, 280);
  // Consume our own history entry — but only when the top entry is actually
  // ours, and with a reclaim timeout so a back() that never produces a
  // popstate can't poison the counter and eat a future sheet. History API
  // calls can throw under browser throttling; the UI must survive that.
  if (!fromPop && history.state?.p3 === 'sheet') {
    try {
      backEats += 1;
      setTimeout(() => { if (backEats > 0) backEats -= 1; }, 500);
      history.back();
    } catch { /* throttled: back-gesture degrades, UI unaffected */ }
  }
}

// Central popstate hook (called from app.js). Returns true when consumed.
export function sheetPopHandled() {
  if (backEats > 0) { backEats -= 1; return true; }
  if (sheetRoot().classList.contains('open')) { internalClose(true); return true; }
  return false;
}

export function openSheet(html, { onOpen } = {}) {
  const root = sheetRoot();
  clearTimeout(cleanupTimer);
  root.classList.remove('open');
  root.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog">${html}</div>`;
  // Forced reflow instead of rAF: rAF never fires on a hidden page (phone
  // locked mid-tap), which would leave the sheet mounted but invisible.
  void root.offsetHeight;
  root.classList.add('open');
  try { history.pushState({ p3: 'sheet' }, ''); } catch { /* throttled */ }
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    internalClose(false);
  };
  $('.scrim', root).addEventListener('click', close);
  onOpen?.(root.querySelector('.sheet'), close);
  return close;
}

export function closeSheet() {
  internalClose(false);
}

// Stepper + numpad for all numeric input. Two-tap logging stays sacred:
// steppers for nudges, digits for direct entry, one confirm.
export function numpadSheet({ title, sub = '', value = 0, unit = '', step = 5, min = 0, max = 2000, decimals = true, onConfirm }) {
  let current = value ?? 0;
  let typing = false; // first digit replaces the pre-filled value
  let buffer = '';

  const html = `
    <div class="grab"></div>
    <h2>${esc(title)}</h2>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
    <div class="np-display">
      <button class="np-step" data-d="-1">−${fmtW(step)}</button>
      <div class="np-value num"><span id="np-v">${fmtW(current)}</span>${unit ? `<span class="unit"> ${esc(unit)}</span>` : ''}</div>
      <button class="np-step" data-d="1">+${fmtW(step)}</button>
    </div>
    <div class="np-grid">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="np-key" data-k="${n}">${n}</button>`).join('')}
      <button class="np-key fn" data-k="."${decimals ? '' : ' disabled'}>.</button>
      <button class="np-key" data-k="0">0</button>
      <button class="np-key fn" data-k="del">⌫</button>
    </div>
    <button class="btn primary" id="np-ok">Lock in</button>`;

  openSheet(html, {
    onOpen(sheet, close) {
      const display = $('#np-v', sheet);
      const render = () => { display.textContent = typing ? (buffer || '0') : fmtW(current); };
      sheet.addEventListener('click', (e) => {
        const stepBtn = e.target.closest('.np-step');
        const key = e.target.closest('.np-key');
        if (stepBtn) {
          if (typing) { current = parseFloat(buffer || '0'); typing = false; }
          current = Math.min(max, Math.max(min, +(current + step * Number(stepBtn.dataset.d)).toFixed(2)));
          haptic(6);
          render();
        } else if (key && !key.disabled) {
          const k = key.dataset.k;
          if (!typing) { typing = true; buffer = ''; }
          if (k === 'del') buffer = buffer.slice(0, -1);
          else if (k === '.') { if (!buffer.includes('.')) buffer = (buffer || '0') + '.'; }
          else if (buffer.replace('.', '').length < 6) buffer += k;
          haptic(4);
          render();
        } else if (e.target.closest('#np-ok')) {
          const v = typing ? parseFloat(buffer || '0') : current;
          close();
          onConfirm(Math.min(max, Math.max(min, isNaN(v) ? 0 : v)));
        }
      });
    },
  });
}

export function optionSheet({ title, sub = '', options, onPick }) {
  const html = `
    <div class="grab"></div>
    <h2>${esc(title)}</h2>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
    <div class="opt-list">
      ${options.map((o, i) => `
        <button class="opt ${o.selected ? 'selected' : ''}" data-i="${i}">
          ${esc(o.label)}
          ${o.hint ? `<span class="hint">${esc(o.hint)}</span>` : ''}
        </button>`).join('')}
    </div>`;
  openSheet(html, {
    onOpen(sheet, close) {
      sheet.addEventListener('click', (e) => {
        const btn = e.target.closest('.opt');
        if (!btn) return;
        close();
        onPick(options[Number(btn.dataset.i)], Number(btn.dataset.i));
      });
    },
  });
}

export function confirmSheet({ title, body = '', confirmLabel = 'Confirm', danger = false, onConfirm }) {
  const html = `
    <div class="grab"></div>
    <h2>${esc(title)}</h2>
    ${body ? `<p style="color:var(--text2);font-size:14px;margin:6px 0 18px;line-height:1.5">${body}</p>` : ''}
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn ${danger ? 'danger' : 'primary'}" id="cf-ok">${esc(confirmLabel)}</button>
      <button class="btn quiet" id="cf-no">Cancel</button>
    </div>`;
  openSheet(html, {
    onOpen(sheet, close) {
      $('#cf-ok', sheet).addEventListener('click', () => { close(); onConfirm(); });
      $('#cf-no', sheet).addEventListener('click', close);
    },
  });
}

export function toast(msg, kind = 'ok', ms = 2400) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = `toast ${kind === 'ok' ? '' : kind}`;
  el.innerHTML = `<span class="dot"></span>${esc(msg)}`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 240);
  }, ms);
}

// Count-up for weight suggestions: 185 → 190 over ~400ms, mono stays aligned.
export function countUp(el, from, to, dur = 450) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
    el.textContent = fmtW(to);
    return;
  }
  const t0 = performance.now();
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtW(Math.round((from + (to - from) * eased) * 2) / 2);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = fmtW(to);
  };
  requestAnimationFrame(tick);
}

// ——— Cooldown: a smooth depleting bar with live digits ———

let restRAF = null;

export function showRestTimer(seconds, container) {
  hideRestTimer();
  const el = document.createElement('div');
  el.className = 'rest-pill';
  el.id = 'rest-pill';
  el.innerHTML = `
    <span class="lbl">Cooldown</span>
    <span class="t num" id="rest-t"></span>
    <span class="rbar"><i id="rest-bar" style="width:100%"></i></span>
    <button class="skip">Skip</button>`;
  container.prepend(el);

  const bar = el.querySelector('#rest-bar');
  const label = el.querySelector('#rest-t');
  const t0 = performance.now();
  const total = seconds * 1000;

  const tick = (t) => {
    const left = Math.max(0, total - (t - t0));
    bar.style.width = `${(left / total) * 100}%`;
    const s = Math.ceil(left / 1000);
    label.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (left > 0) {
      restRAF = requestAnimationFrame(tick);
    } else {
      el.classList.add('done-flash');
      haptic([30, 60, 30]);
      setTimeout(hideRestTimer, 1200);
    }
  };
  restRAF = requestAnimationFrame(tick);
  el.querySelector('.skip').addEventListener('click', hideRestTimer);
}

export function hideRestTimer() {
  if (restRAF) cancelAnimationFrame(restRAF);
  restRAF = null;
  document.getElementById('rest-pill')?.remove();
}

// Full-screen NEW RECORD banner — the biggest moment in the app.
export function recordBanner(text) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelector('.record-banner')?.remove();
  const el = document.createElement('div');
  el.className = 'record-banner';
  el.innerHTML = `★ NEW RECORD <span class="num">${esc(text)}</span> ★`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

// Themed particle burst from an element (the check, 25× a session).
// PRs get a bigger, longer pop.
export function burstAt(el, { pr = false } = {}) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const n = pr ? 16 : 9;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'burst-p';
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.background = i % 3 === 0 ? 'color-mix(in srgb, var(--accent) 45%, white)' : 'var(--accent)';
    document.body.appendChild(p);
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
    const dist = (pr ? 46 : 28) + Math.random() * (pr ? 42 : 20);
    p.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${(Math.cos(ang) * dist).toFixed(1)}px), calc(-50% + ${(Math.sin(ang) * dist - 10).toFixed(1)}px)) scale(.25)`, opacity: 0 },
    ], { duration: pr ? 720 : 520, easing: 'cubic-bezier(.15,.85,.35,1)' }).onfinish = () => p.remove();
  }
}

export const checkIcon = ICONS.check;

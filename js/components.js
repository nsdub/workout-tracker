// Shared machinery: sheets (with back-gesture support), numpad, toasts,
// cooldown timer, particle bursts, world-flavored interstitials.
import { $, esc, fmtW, haptic } from './util.js';
import { sfx } from './audio.js';

const sheetRoot = () => $('#sheet-root');

let cleanupTimer = null;
let backEats = 0;
let backPending = false;
let pendingPush = false;

function internalClose(fromPop) {
  const root = sheetRoot();
  if (!root.classList.contains('open')) return;
  const mySheet = root.querySelector('.sheet');
  root.classList.remove('open');
  clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(() => {
    if (!root.classList.contains('open') && mySheet && root.contains(mySheet)) root.innerHTML = '';
  }, 260);
  if (!fromPop && history.state?.p3 === 'sheet') {
    try {
      backEats += 1;
      backPending = true;
      setTimeout(() => { if (backEats > 0) backEats -= 1; backPending = false; flushPendingPush(); }, 500);
      history.back();
    } catch { backPending = false; }
  }
}

// A sheet opened while the previous sheet's back() is still in flight must
// not push its history entry yet — the pending pop would consume it and a
// later back-gesture would exit the app (UX audit P1).
function flushPendingPush() {
  if (pendingPush && sheetRoot().classList.contains('open')) {
    pendingPush = false;
    try { history.pushState({ p3: 'sheet' }, ''); } catch { /* throttled */ }
  } else {
    pendingPush = false;
  }
}

export function sheetPopHandled() {
  if (backEats > 0) {
    backEats -= 1;
    backPending = false;
    flushPendingPush();
    return true;
  }
  if (sheetRoot().classList.contains('open')) { internalClose(true); return true; }
  return false;
}

export function openSheet(html, { onOpen } = {}) {
  const root = sheetRoot();
  clearTimeout(cleanupTimer);
  root.classList.remove('open');
  root.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog">${html}</div>`;
  void root.offsetHeight;
  root.classList.add('open');
  if (backPending) pendingPush = true;
  else { try { history.pushState({ p3: 'sheet' }, ''); } catch { /* throttled */ } }
  let closed = false;
  const close = () => { if (!closed) { closed = true; internalClose(false); } };
  $('.scrim', root).addEventListener('click', close);
  onOpen?.(root.querySelector('.sheet'), close);
  return close;
}

export function numpadSheet({ title, sub = '', value = 0, unit = '', step = 5, min = 0, max = 2000, decimals = true, onConfirm }) {
  let current = value ?? 0;
  let typing = false;
  let buffer = '';
  openSheet(`
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
    <button class="btn primary" id="np-ok">Lock it in</button>`, {
    onOpen(sheet, close) {
      const display = $('#np-v', sheet);
      const render = () => { display.textContent = typing ? (buffer || '0') : fmtW(current); };
      sheet.addEventListener('click', (e) => {
        const stepBtn = e.target.closest('.np-step');
        const key = e.target.closest('.np-key');
        if (stepBtn) {
          if (typing) { current = parseFloat(buffer || '0'); typing = false; }
          current = Math.min(max, Math.max(min, +(current + step * Number(stepBtn.dataset.d)).toFixed(2)));
          haptic(6); render();
        } else if (key && !key.disabled) {
          const k = key.dataset.k;
          if (!typing) { typing = true; buffer = ''; }
          if (k === 'del') buffer = buffer.slice(0, -1);
          else if (k === '.') { if (!buffer.includes('.')) buffer = (buffer || '0') + '.'; }
          else if (buffer.replace('.', '').length < 6) buffer += k;
          haptic(4); render();
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
  openSheet(`
    <h2>${esc(title)}</h2>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
    <div class="opt-list">
      ${options.map((o, i) => `
        <button class="opt ${o.selected ? 'selected' : ''}" data-i="${i}">
          ${esc(o.label)}
          ${o.hint ? `<span class="hint">${esc(o.hint)}</span>` : ''}
        </button>`).join('')}
    </div>`, {
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
  openSheet(`
    <h2>${esc(title)}</h2>
    ${body ? `<p style="font-family:var(--body);font-size:13.5px;margin:6px 0 16px;line-height:1.5">${body}</p>` : ''}
    <div style="display:flex;flex-direction:column;gap:9px">
      <button class="btn ${danger ? 'danger' : 'primary'}" id="cf-ok">${esc(confirmLabel)}</button>
      <button class="btn quiet" id="cf-no">Never mind</button>
    </div>`, {
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
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 220); }, ms);
}

// ——— Cooldown (world names it: Intermission, Commercial break…) ———

let restRAF = null;

export function showRestTimer(seconds, container, label = 'Rest') {
  hideRestTimer();
  const el = document.createElement('div');
  el.className = 'rest-pill';
  el.id = 'rest-pill';
  el.innerHTML = `
    <span class="lbl">${esc(label)}</span>
    <span class="t num" id="rest-t"></span>
    <span class="rbar"><i id="rest-bar" style="width:100%"></i></span>
    <button class="skip">Skip</button>`;
  container.prepend(el);
  const bar = el.querySelector('#rest-bar');
  const digits = el.querySelector('#rest-t');
  const t0 = performance.now();
  const total = seconds * 1000;
  const tick = (t) => {
    const left = Math.max(0, total - (t - t0));
    bar.style.width = `${(left / total) * 100}%`;
    const s = Math.ceil(left / 1000);
    digits.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (left > 0) restRAF = requestAnimationFrame(tick);
    else { haptic([30, 60, 30]); sfx('restDone'); setTimeout(hideRestTimer, 1200); }
  };
  restRAF = requestAnimationFrame(tick);
  el.querySelector('.skip').addEventListener('click', hideRestTimer);
}

export function hideRestTimer() {
  if (restRAF) cancelAnimationFrame(restRAF);
  restRAF = null;
  document.getElementById('rest-pill')?.remove();
}

// ——— World-flavored moments ———

export function flashCard(title, name, then) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return then?.();
  const el = document.createElement('div');
  el.className = 'obj-flash';
  el.innerHTML = `<div class="of-card"><div class="of-t">${esc(title)}</div><div class="of-n">${esc(name)}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); then?.(); }, 950);
}

export function prOverlay(title, valueText) {
  document.querySelector('.pr-overlay')?.remove();
  const el = document.createElement('div');
  el.className = 'pr-overlay';
  el.innerHTML = `<div class="pr-card"><div class="pr-t">${esc(title)}</div><div class="pr-v">${esc(valueText)}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

export function burstAt(el, { pr = false } = {}) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ['var(--acc)', 'var(--acc2)', '#fff'];
  const n = pr ? 22 : 12;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'burst-p';
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.background = colors[i % 3];
    if (i % 4 === 0) p.style.borderRadius = '0';
    document.body.appendChild(p);
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.7;
    const dist = (pr ? 70 : 42) + Math.random() * (pr ? 60 : 30);
    p.animate([
      { transform: 'translate(-50%,-50%) scale(1) rotate(0)', opacity: 1 },
      { transform: `translate(calc(-50% + ${(Math.cos(ang) * dist).toFixed(1)}px), calc(-50% + ${(Math.sin(ang) * dist - 20).toFixed(1)}px)) scale(.3) rotate(${(Math.random() * 360) | 0}deg)`, opacity: 0 },
    ], { duration: pr ? 900 : 600, easing: 'cubic-bezier(.15,.85,.35,1)' }).onfinish = () => p.remove();
  }
}

// Shared interaction components: bottom sheet, numpad, option list, confirm,
// toast, rest timer ring, count-up numbers.
import { $, esc, fmtW, haptic, ICONS } from './util.js';

const sheetRoot = () => $('#sheet-root');

export function openSheet(html, { onOpen } = {}) {
  const root = sheetRoot();
  root.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog">${html}</div>`;
  let closed = false;
  requestAnimationFrame(() => { if (!closed) root.classList.add('open'); });
  const close = () => {
    closed = true;
    root.classList.remove('open');
    setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 280);
  };
  $('.scrim', root).addEventListener('click', close);
  onOpen?.(root.querySelector('.sheet'), close);
  return close;
}

export function closeSheet() {
  const root = sheetRoot();
  root.classList.remove('open');
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 280);
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
    <button class="btn primary" id="np-ok">Set</button>`;

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

// ——— Rest timer: a smooth ring, not a jumping integer ———

let restRAF = null;

export function showRestTimer(seconds, container) {
  hideRestTimer();
  const R = 14;
  const C = 2 * Math.PI * R;
  const el = document.createElement('div');
  el.className = 'rest-pill';
  el.id = 'rest-pill';
  el.innerHTML = `
    <svg class="ring" viewBox="0 0 34 34">
      <circle class="track" cx="17" cy="17" r="${R}"/>
      <circle class="arc" cx="17" cy="17" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 17 17)"/>
    </svg>
    <span class="t num" id="rest-t"></span>
    <span class="lbl">rest</span>
    <button class="skip">Skip</button>`;
  container.prepend(el);

  const arc = el.querySelector('.arc');
  const label = el.querySelector('#rest-t');
  const t0 = performance.now();
  const total = seconds * 1000;

  const tick = (t) => {
    const left = Math.max(0, total - (t - t0));
    const frac = left / total;
    arc.style.strokeDashoffset = String(C * (1 - frac));
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

export const checkIcon = ICONS.check;

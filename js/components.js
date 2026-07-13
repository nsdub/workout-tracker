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
          haptic(5); render();
        } else if (key && !key.disabled) {
          const k = key.dataset.k;
          if (!typing) { typing = true; buffer = ''; }
          if (k === 'del') buffer = buffer.slice(0, -1);
          else if (k === '.') { if (!buffer.includes('.')) buffer = (buffer || '0') + '.'; }
          else if (buffer.replace('.', '').length < 6) buffer += k;
          // Whisper on throwaway keystrokes — the impact belongs to the commit.
          haptic(2); render();
        } else if (e.target.closest('#np-ok')) {
          const v = typing ? parseFloat(buffer || '0') : current;
          // Locking in the working weight is the decisive beat: punctuate it
          // with a distinct pattern + a confirmation cue, not the flat per-key buzz.
          haptic([14, 22, 14]); sfx('objDone');
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
        // Picking an option is a commit — give it the same impact beat as a lock-in.
        haptic(10); sfx('objDone');
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
      $('#cf-ok', sheet).addEventListener('click', () => { haptic([14, 22, 14]); sfx('objDone'); close(); onConfirm(); });
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
// Wall-clock based: the deadline is an absolute timestamp, so backgrounding
// the app or locking the phone never loses time — on return the display
// catches up instantly and a missed completion fires once. While resting we
// also hold a screen wake lock so the phone doesn't sleep mid-countdown.

let restRAF = null;
let restState = null; // { deadline, total, fired, bar, digits, lock }

// The arcade loads lazily on the first Play tap — zero boot cost.
const GAME_UNIVERSES = new Set(['dojo', 'deep', 'park', 'wok', 'atoll', 'yeti']);
// A rest shorter than this can't host a game with a real difficulty arc, so it
// isn't worth launching. One constant feeds the launch floor, the chip render
// gate, and the "time ran down" fade so they can never disagree. (The 60–240s
// envelope is the design target; this is the hard minimum below which a
// session is all intro and no ramp.)
const GAME_FLOOR_MS = 20000;
// 6 game universes × 8 worlds = the full collectible lattice; the denominator
// for the lifetime medal tally shown on the Play chip. Hardcoded on purpose —
// importing the registry to count worlds would drag all six game modules into
// the boot path and defeat the zero-boot lazy load.
const TOTAL_WORLDS = 48;
let gameMod = null;
// loadGames ONLY performs the lazy import — that import is what wires
// gamePopHandled below into app.js's popstate chain. It is NOT the production
// open-path: the real entry is the #rest-play click handler below, which
// enforces the live rest floor and passes the actual restState.deadline into
// openGame. To verify the rest→game hard-stop cash-out, QA must drive a REAL
// rest timer to expiry mid-game; opening the overlay here with a synthetic
// deadline bypasses that guard and tests nothing about the handoff.
export async function loadGames() {
  gameMod ??= await import('./game/overlay.js');
  return gameMod;
}

// app.js popstate chain asks us; if the module never loaded, no game is open.
export function gamePopHandled() {
  return gameMod ? gameMod.gamePopHandled() : false;
}

async function acquireWakeLock() {
  try {
    if (!restState || !navigator.wakeLock) return;
    const lock = await navigator.wakeLock.request('screen');
    // The rest may have ended (hideRestTimer ran and nulled restState) while
    // this request was in flight. If so, adopt nothing and release it now —
    // otherwise the screen is held awake indefinitely while the app stays
    // foregrounded, since the lock only auto-releases when the page hides.
    if (restState) restState.lock = lock;
    else lock.release?.().catch?.(() => {});
  } catch { /* denied or unsupported — wall-clock math still holds */ }
}

function restTick() {
  if (!restState) return;
  const left = Math.max(0, restState.deadline - Date.now());
  // Under the game floor a session is all intro and no ramp — the Play chip
  // bows out visibly (a fade, not a pop) so its exit reads as "time ran down".
  if (left < GAME_FLOOR_MS) {
    const p = document.getElementById('rest-play');
    if (p && !p.dataset.gone) {
      p.dataset.gone = '1';
      p.classList.add('gone');
      setTimeout(() => p.remove(), 280);
    }
  }
  restState.bar.style.width = `${(left / restState.total) * 100}%`;
  const s = Math.ceil(left / 1000);
  restState.digits.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  if (left > 0) { restRAF = requestAnimationFrame(restTick); return; }
  if (!restState.fired) {
    restState.fired = true;
    haptic([30, 60, 30]);
    sfx('restDone');
    setTimeout(hideRestTimer, 1200);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && restState) {
    if (restRAF) cancelAnimationFrame(restRAF);
    acquireWakeLock(); // the lock auto-releases when the page hides
    restTick();
  }
});

export function showRestTimer(seconds, container, label = 'Rest') {
  hideRestTimer();
  const el = document.createElement('div');
  el.className = 'rest-pill';
  el.id = 'rest-pill';
  // Let the pill wrap rather than overflow: a returning player's Play chip
  // (best + medal ladder + lifetime tally) can be wide on a ~412px phone.
  // Wrap only engages when the row genuinely can't fit — the common
  // single-row case is untouched.
  el.style.flexWrap = 'wrap';
  // No Play chip on rests too short to ever start a game (the same floor the
  // tap guard enforces, +1s of grace — rendering it just to fade it is noise).
  const playable = GAME_UNIVERSES.has(document.documentElement.dataset.universe)
    && seconds * 1000 >= GAME_FLOOR_MS + 1000;
  // This world's record + medal ladder, plus a lifetime tally across all 48
  // worlds — so the Play chip always shows a target to build toward (a fresh
  // world's empty ladder IS the goal) and grinding across worlds shows visible
  // accumulation. Read straight from localStorage: importing the registry here
  // would drag all six game modules into the boot path and kill the lazy load.
  let best = 0, stars = 0, lifeStars = 0, medaled = 0;
  try {
    const bests = JSON.parse(localStorage.getItem('p3.gameBests')) || {};
    const v = bests[document.documentElement.dataset.world];
    best = (typeof v === 'number' ? v : v?.s) ?? 0;
    stars = (typeof v === 'object' && v ? v.st : 0) ?? 0;
    for (const e2 of Object.values(bests)) {
      const st = (typeof e2 === 'number' ? 0 : e2?.st) ?? 0;
      if (st > 0) { medaled += 1; lifeStars += st; }
    }
  } catch { /* corrupt — fall back to a fresh-looking chip */ }
  const ladder = `${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, 3 - stars))}`;
  // Played world → best score with the ladder ceiling still to climb; fresh
  // world → the empty ladder is the target (earn your first medal).
  const pbChip = best
    ? `<i class="pb">Best <b class="num">${best}</b> <b class="lad">${ladder}</b></i>`
    : `<i class="pb">Goal <b class="lad">${ladder}</b></i>`;
  // Lifetime collection tally — only once the player owns a medal, so a brand
  // new player isn't greeted with a discouraging 0/48 (and it saves chip width).
  const collChip = medaled
    ? `<i class="pb coll" title="Lifetime medals across all worlds">★<b class="num">${lifeStars}</b>·<b class="num">${medaled}</b>/${TOTAL_WORLDS}</i>`
    : '';
  el.innerHTML = `
    <span class="lbl">${esc(label)}</span>
    <span class="t num" id="rest-t"></span>
    <span class="rbar"><i id="rest-bar" style="width:100%"></i></span>
    ${playable ? `<button class="play" id="rest-play"><span class="play-lbl">▶ Play</span>${pbChip}${collChip}</button>` : ''}
    <button class="skip">Skip</button>`;
  container.prepend(el);
  const total = seconds * 1000;
  restState = {
    deadline: Date.now() + total,
    total,
    fired: false,
    bar: el.querySelector('#rest-bar'),
    digits: el.querySelector('#rest-t'),
    lock: null,
  };
  acquireWakeLock();
  restRAF = requestAnimationFrame(restTick);
  el.querySelector('.skip').addEventListener('click', hideRestTimer);
  const playBtn = el.querySelector('#rest-play');
  playBtn?.addEventListener('click', async () => {
    if (!restState || restState.deadline - Date.now() < GAME_FLOOR_MS) {
      return toast('Not enough rest left for a game', 'ok', 2200);
    }
    // Re-entrancy guard: an impatient double-tap during the cold import must
    // not open the overlay twice.
    if (playBtn.dataset.loading) return;
    playBtn.dataset.loading = '1';
    // Acknowledge the marquee tap SYNCHRONOUSLY. The cold first launch has a
    // real download+parse gap before the overlay's own boot screen exists, and
    // this is the single most important button in the arcade — a silent hit
    // here reads as a dead control.
    haptic(8);
    sfx('log');
    const lbl = playBtn.querySelector('.play-lbl');
    const restore = lbl ? lbl.textContent : '';
    if (lbl) lbl.textContent = '▶ Loading…';
    playBtn.style.opacity = '0.72';
    playBtn.setAttribute('aria-busy', 'true');
    try {
      const mod = await loadGames();
      // Re-run the SAME floor after the (possibly multi-second, cold) import:
      // the rest may have ended or dropped under the floor while Phaser
      // downloaded, and opening then would hard-stop the game in a blink.
      if (!restState || restState.deadline - Date.now() < GAME_FLOOR_MS) {
        return toast('Not enough rest left for a game', 'ok', 2200);
      }
      await mod.openGame({ deadline: restState.deadline });
    } catch {
      toast("Couldn't load the arcade — check your connection", 'bad', 2600);
    } finally {
      delete playBtn.dataset.loading;
      playBtn.removeAttribute('aria-busy');
      playBtn.style.opacity = '';
      if (lbl) lbl.textContent = restore;
    }
  });
}

export function hideRestTimer() {
  if (restRAF) cancelAnimationFrame(restRAF);
  restRAF = null;
  restState?.lock?.release?.().catch?.(() => {});
  restState = null;
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
  // A personal record is the app's loudest positive event — give it real
  // impact: a PR sting, a heavy haptic, a scale-in punch on the card, and a
  // particle burst from its center (all self-gating on reduced-motion).
  sfx('pr');
  haptic([40, 40, 20, 40, 90]);
  const card = el.querySelector('.pr-card');
  if (card && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Land at rotate(-4deg) — the card's CSS resting transform — so it doesn't
    // snap when the Web Animation finishes and hands back to the stylesheet.
    card.animate([
      { transform: 'scale(0.4) rotate(-12deg)', opacity: 0 },
      { transform: 'scale(1.14) rotate(1deg)', opacity: 1, offset: 0.5 },
      { transform: 'scale(0.96) rotate(-6deg)', offset: 0.7 },
      { transform: 'scale(1) rotate(-4deg)', opacity: 1 },
    ], { duration: 640, easing: 'cubic-bezier(.2,.9,.25,1.25)' });
    setTimeout(() => burstAt(card, { pr: true }), 250);
  }
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

// Shared machinery: sheets (with back-gesture support), numpad, toasts,
// cooldown timer, particle bursts, world-flavored interstitials.
import { $, esc, fmtW, haptic } from './util.js';
import { sfx, flushWhenRunning } from './audio.js';
import { armPush, disarmPush, pushConfigured } from './push.js';
import { UNIVERSES, NEUTRAL_COPY } from './worlds.js';

// The rest pill speaks whatever universe is on stage; dataset.universe holds
// the cls ('dojo'), so index the copy packs by cls once.
const COPY_BY_CLS = Object.fromEntries(Object.values(UNIVERSES).map((u) => [u.cls, u.copy]));
const uniCopy = () => COPY_BY_CLS[document.documentElement.dataset.universe] ?? NEUTRAL_COPY;

const sheetRoot = () => $('#sheet-root');

// ——— Drawn iconography ———
// Every mark the app shows is drawn in the cut-out line language — no Unicode
// glyph whose rendering the OS owns (the tabbar rule, applied at small scale).
// currentColor everywhere a context tints it; fixed paint only on characters
// (the sleeping moon stays gold in every sky).
export const ICONS = {
  chevL: `<svg class="ic" width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><path d="M10.4 2 L4.2 7.5 L10.4 13 Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  chevR: `<svg class="ic" width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><path d="M4.6 2 L10.8 7.5 L4.6 13 Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  close: `<svg class="ic" width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.6 2.8 L11.4 11.4 M11.2 2.4 L2.4 11.2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  backspace: `<svg class="ic" width="23" height="16" viewBox="0 0 23 16" aria-hidden="true"><path d="M7.4 1.6 h12.6 a1.6 1.6 0 0 1 1.6 1.6 v9.6 a1.6 1.6 0 0 1 -1.6 1.6 H7.4 L1.6 8 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M11 5.4 l5.2 5.2 M16.2 5.4 L11 10.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  play: `<svg class="ic" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true"><path d="M1.8 1.4 L9.8 6 L1.8 10.6 Z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  moon: `<svg class="ic" width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><path d="M12.6 1.7 A7.7 7.7 0 1 0 16.6 11.5 A6.3 6.3 0 0 1 12.6 1.7 Z" fill="#ffd24a" stroke="#c2822c" stroke-width="1.3" stroke-linejoin="round"/><path d="M6.9 8.1 q1 1 2 0" stroke="#7a5210" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M8.3 11.4 q.9 .7 1.8 0" stroke="#7a5210" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>`,
  snowflake: `<svg class="ic" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"><path d="M8 1.4 V14.6 M2.3 4.7 L13.7 11.3 M13.7 4.7 L2.3 11.3"/><path d="M6.4 2.6 L8 4.2 L9.6 2.6 M6.4 13.4 L8 11.8 L9.6 13.4"/></g></svg>`,
  compass: `<svg class="ic" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.9 5.1 L8.9 8.9 L5.1 10.9 L7.1 7.1 Z" fill="currentColor"/></svg>`,
  hourglass: `<svg class="ic" width="13" height="15" viewBox="0 0 14 16" aria-hidden="true"><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"><path d="M2.4 1.6 h9.2 M2.4 14.4 h9.2"/><path d="M3.4 1.6 c0 4.2 7.2 4.4 7.2 6.4 c0 2 -7.2 2.2 -7.2 6.4 M10.6 1.6 c0 4.2 -7.2 4.4 -7.2 6.4 c0 2 7.2 2.2 7.2 6.4"/></g></svg>`,
  gauge: `<svg class="ic" width="16" height="11" viewBox="0 0 18 12" aria-hidden="true"><path d="M2 10.6 a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M9 10.6 L12.6 5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="9" cy="10.6" r="1.4" fill="currentColor"/></svg>`,
  beam: `<svg class="ic" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M6 12.4 V4.8 M2.8 7.6 L6 4.4 L9.2 7.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 11 h1.6 M8.4 11 h1.6 M4.4 13.2 h3.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".6"/></svg>`,
  warn: `<svg class="ic" width="16" height="14" viewBox="0 0 18 16" aria-hidden="true"><path d="M9 1.6 L16.8 14.2 H1.2 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 6 v3.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="12" r="1.1" fill="currentColor"/></svg>`,
  pencil: `<svg class="ic" width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M9.6 1.4 L12.6 4.4 L4.8 12.2 L1.4 12.6 L1.8 9.2 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.4 2.6 L11.4 5.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
};

let cleanupTimer = null;
let backEats = 0;
let backPending = false;
let pendingPush = false;

function internalClose(fromPop) {
  const root = sheetRoot();
  if (!root.classList.contains('open')) return;
  sfx('close');
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
  // the clipboard announces itself in the world's voice and lands in the hand
  sfx('open');
  haptic(4);
  // Overflow is signalled by the paper's own bottom fade (CSS .can-scroll),
  // never a UA scrollbar — only when the content genuinely scrolls.
  const sheetEl = root.querySelector('.sheet');
  requestAnimationFrame(() => {
    if (root.contains(sheetEl)) sheetEl.classList.toggle('can-scroll', sheetEl.scrollHeight > sheetEl.clientHeight + 4);
  });
  if (backPending) pendingPush = true;
  else { try { history.pushState({ p3: 'sheet' }, ''); } catch { /* throttled */ } }
  let closed = false;
  const close = () => { if (!closed) { closed = true; internalClose(false); } };
  $('.scrim', root).addEventListener('click', close);
  onOpen?.(root.querySelector('.sheet'), close);
  return close;
}

export function numpadSheet({ title, sub = '', value = 0, unit = '', step = 5, min = 0, max = 2000, decimals = true, grid = null, onConfirm }) {
  let current = value ?? 0;
  let typing = false;
  let buffer = '';
  openSheet(`
    <h2>${esc(title)}</h2>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
    <div class="np-display">
      <button class="np-step" data-d="-1">${grid?.length ? '− pin' : `−${fmtW(step)}`}</button>
      <div class="np-value num"><span id="np-v">${fmtW(current)}</span>${unit ? `<span class="unit"> ${esc(unit)}</span>` : ''}</div>
      <button class="np-step" data-d="1">${grid?.length ? '+ pin' : `+${fmtW(step)}`}</button>
    </div>
    <div class="np-grid">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="np-key" data-k="${n}">${n}</button>`).join('')}
      <button class="np-key fn" data-k="."${decimals ? '' : ' disabled'}>.</button>
      <button class="np-key" data-k="0">0</button>
      <button class="np-key fn" data-k="del" aria-label="delete">${ICONS.backspace}</button>
    </div>
    <button class="btn primary" id="np-ok">Lock it in</button>`, {
    onOpen(sheet, close) {
      const display = $('#np-v', sheet);
      const render = () => { display.textContent = typing ? (buffer || '0') : fmtW(current); };
      // every keystroke lands: the value physically reacts (scale pulse) and
      // ticks in the world's tap voice — steppers hit harder than digits
      const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
      const pulse = (big) => {
        if (reduced()) return;
        display.parentElement?.animate(
          big
            ? [{ transform: 'scale(1.14)', color: 'var(--acc)' }, { transform: 'scale(1)' }]
            : [{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }],
          { duration: big ? 160 : 110, easing: big ? 'cubic-bezier(.2,.9,.3,1.3)' : 'ease-out' },
        );
      };
      sheet.addEventListener('click', (e) => {
        const stepBtn = e.target.closest('.np-step');
        const key = e.target.closest('.np-key');
        if (stepBtn) {
          if (typing) { current = parseFloat(buffer || '0'); typing = false; }
          const d = Number(stepBtn.dataset.d);
          if (grid?.length) {
            // Walk the machine's real pins: +/− lands on a weight that exists,
            // never on step-arithmetic the stack can't load. Past either end
            // the value HOLDS — a plus that lowers (typed 150 → top pin) or a
            // minus that raises (0 → first pin) would invert the button.
            current = d > 0
              ? (grid.find((v) => v > current + 1e-9) ?? current)
              : ([...grid].reverse().find((v) => v < current - 1e-9) ?? current);
          } else {
            current = Math.min(max, Math.max(min, +(current + step * d).toFixed(2)));
          }
          haptic(5); sfx('tap'); render(); pulse(true);
        } else if (key && !key.disabled) {
          const k = key.dataset.k;
          if (!typing) { typing = true; buffer = ''; }
          if (k === 'del') buffer = buffer.slice(0, -1);
          else if (k === '.') { if (!buffer.includes('.')) buffer = (buffer || '0') + '.'; }
          else if (buffer.replace('.', '').length < 6) buffer += k;
          // Whisper on throwaway keystrokes — the impact belongs to the commit.
          haptic(2); sfx('tap'); render(); pulse(false);
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

// Optional { action: { label, fn } } adds a tappable button (e.g. UNDO) —
// the one interactive element on an otherwise pass-through toast layer.
export function toast(msg, kind = 'ok', ms = 2400, { action } = {}) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = `toast ${kind === 'ok' ? '' : kind}`;
  el.textContent = msg;
  const dismiss = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
  const out = setTimeout(dismiss, ms);
  if (action) {
    const btn = document.createElement('button');
    btn.className = 't-act';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      clearTimeout(out);
      dismiss();
      action.fn?.();
    });
    el.appendChild(btn);
  }
  root.appendChild(el);
}

// ——— Cooldown (world names it: Intermission, Commercial break…) ———
// Wall-clock based: the deadline is an absolute timestamp, so backgrounding
// the app or locking the phone never loses time — on return the display
// catches up instantly and a missed completion fires once. While resting we
// also hold a screen wake lock so the phone doesn't sleep mid-countdown.

let restRAF = null;
let restTO = null;     // overtime's relaxed 500ms tick (a count-up needs no 60fps)
let restHideTO = null; // any pending timer owned by the pill lifecycle (wake-lock
                       // release after overtime) — hideRestTimer clears it so a
                       // stale timeout can never execute against a NEW pill
let restState = null;  // { deadline, total, fired, bar, digits, lbl, overLabel, lock }
let wakeLockPending = false; // one wake-lock request in flight at a time — a
                             // parallel grant would orphan the earlier sentinel

// The arcade warms up on idle once a game universe is on stage (see below) —
// boot cost moved to idle time, not first paint and not the first Play tap.
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
// the boot path; the idle warm-up below is fire-and-forget, never a boot cost.
const TOTAL_WORLDS = 48;
let gameMod = null;

// Idle eager warm-up: a stalled cold fetch on gym cell was the #1 cause of a
// dead Play chip, so once a game universe is on stage we pull the overlay AND
// Phaser during idle time. sw.js precaches both, so post-install this is a
// cache read; on a genuinely cold cache it's the same bytes the SW install
// pulls anyway. Fire-and-forget: failures here change nothing — the tap path
// below still loads (now warm) with its own watchdog.
const idleWarm = (fn) => (globalThis.requestIdleCallback
  ? requestIdleCallback(fn, { timeout: 4000 })
  : setTimeout(fn, 2000));
idleWarm(() => {
  if (!GAME_UNIVERSES.has(document.documentElement.dataset.universe)) return;
  loadGames().catch(() => {});
  import('./game/loader.js').then((l) => l.loadPhaser?.()).catch(() => {});
});
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

// The awake totem on the pill is lit exactly while we hold a screen lock —
// an honest lamp, never a decoration claiming protection we don't have.
function updateTotem() {
  const t = document.getElementById('rest-totem');
  if (t) t.classList.toggle('lit', !!restState?.lock);
}

async function acquireWakeLock() {
  try {
    if (!restState || !navigator.wakeLock) return;
    // One sentinel, ever. A second acquire while one is held (or one is
    // mid-request) would overwrite restState.lock and orphan the earlier
    // grant — a lock nothing references, nothing can release, and that pins
    // the screen awake until the page hides.
    if (restState.lock && !restState.lock.released) return;
    if (wakeLockPending) return;
    wakeLockPending = true;
    let lock;
    try {
      lock = await navigator.wakeLock.request('screen');
    } finally { wakeLockPending = false; }
    // The rest may have ended (hideRestTimer ran and nulled restState) while
    // this request was in flight. If so, adopt nothing and release it now —
    // otherwise the screen is held awake indefinitely while the app stays
    // foregrounded, since the lock only auto-releases when the page hides.
    if (restState) {
      restState.lock = lock;
      // The OS can yank the lock while we're frontmost (thermal, low battery).
      // Re-arm — but only on behalf of the rest that OWNS this lock. If this
      // release lands after a new pill took over (logging a set mid-rest
      // replaces the pill, which acquires its own lock), re-acquiring here
      // would double-lock the NEW rest and orphan a sentinel — so the
      // identity check gates everything, including the re-arm.
      lock.addEventListener('release', () => {
        if (restState?.lock !== lock) return;
        restState.lock = null;
        updateTotem();
        if (!restState.fired && document.visibilityState === 'visible') acquireWakeLock();
      });
    } else lock.release?.().catch?.(() => {});
    updateTotem();
  } catch { updateTotem(); /* denied or unsupported — wall-clock math still holds */ }
}

// Under the game floor a session is all intro and no ramp — the Play chip
// first flips to a legible "closed" sign, THEN bows out (a fade, not a pop),
// so its exit reads as "time ran down" instead of "the button broke".
function retireChip(msg = `${ICONS.play} Closed — under 0:20 left`) {
  const p = document.getElementById('rest-play');
  if (!p || p.dataset.gone) return;
  p.dataset.gone = '1'; // authoritative: the chip never resurrects past this
  p.disabled = true;
  p.setAttribute('aria-disabled', 'true');
  p.classList.add('closing');
  p.innerHTML = `<span class="play-lbl">${msg}</span>`;
  setTimeout(() => {
    p.classList.add('gone');
    setTimeout(() => p.remove(), 280);
  }, 1500);
}

// The bell must survive a muted phone: a full-screen world-accent flash +
// tabbar glow announce rest-done visually. Web Animations (not CSS keyframes)
// on purpose — the global reduced-motion clamp kills CSS animation, but this
// is a state cue, not decoration, so reduced motion gets a short 200ms
// opacity blink instead of nothing (the CSS swaps the radial for a solid).
function showRestDoneFlash() {
  document.querySelector('.rest-done-flash')?.remove();
  const f = document.createElement('div');
  f.className = 'rest-done-flash';
  document.body.appendChild(f);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anim = f.animate(
    [{ opacity: 0 }, { opacity: 1, offset: reduced ? 0.3 : 0.18 }, { opacity: 0 }],
    { duration: reduced ? 200 : 700, easing: reduced ? 'linear' : 'ease-out' },
  );
  anim.onfinish = () => f.remove();
  setTimeout(() => f.remove(), 1200); // belt and braces: never leave a stale layer
  const tb = document.getElementById('tabbar');
  if (tb) {
    tb.classList.add('rest-done-glow');
    setTimeout(() => tb.classList.remove('rest-done-glow'), 1600);
  }
}

function restTick() {
  if (!restState) return;
  const now = Date.now();
  const left = Math.max(0, restState.deadline - now);
  if (left < GAME_FLOOR_MS) retireChip();
  if (left > 0) {
    restState.bar.style.width = `${(left / restState.total) * 100}%`;
    const s = Math.ceil(left / 1000);
    restState.digits.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    // ENDGAME: the last 10s go hot (accent digits, red bar) and the final 3
    // whole seconds tick audibly — the bell lands as a resolved countdown,
    // not an ambush. Visible-tab only; each boundary speaks once.
    if (s <= 10 && !restState.ending) {
      restState.ending = true;
      document.getElementById('rest-pill')?.classList.add('ending');
    }
    if (s <= 3 && restState.lastTickSec !== s && document.visibilityState === 'visible') {
      restState.lastTickSec = s;
      sfx('tap');
    }
    // rAF freezes the moment the page hides — on the user's Pixel that killed
    // the countdown in the pocket and no notification could ever fire. Hidden
    // pages tick on a 1s timeout instead: Android keeps those alive long past
    // any rest length, so the deadline is crossed IN the background and the
    // OS notification posts for real. (iOS suspends JS soon after lock —
    // there the catch-up on return remains the honest best.)
    if (document.visibilityState === 'hidden') restTO = setTimeout(restTick, 1000);
    else restRAF = requestAnimationFrame(restTick);
    return;
  }
  if (!restState.fired) {
    // The bell — and then OVERTIME. The pill stays up counting how long past
    // the rest you are, until the next set is logged or Skip is tapped. A user
    // back from a locked phone sees exactly how late they're running.
    restState.fired = true;
    // A catch-up fire (page was hidden past the deadline) must not double-ring:
    // any echo whose window overlaps this very bell is spent, not pending.
    const overAtFire = now - restState.deadline;
    if (restState.echoes) restState.echoes = restState.echoes.filter((d) => d > overAtFire + 2000);
    haptic([30, 60, 30]);
    // Through the pending-cue path: if iOS froze the audio clock while the
    // phone was pocketed, the ding lands the instant the room wakes (or on
    // the first tap back) instead of dying silently against a suspended ctx.
    flushWhenRunning('restDone');
    showRestDoneFlash();
    // Backgrounded but still ticking: post the OS alert now (foreground rests
    // are covered by the flash + ding, so we only notify when hidden).
    if (document.visibilityState === 'hidden') fireRestNotificationNow(restState.overLabel);
    document.getElementById('rest-pill')?.classList.remove('ending');
    document.getElementById('rest-pill')?.classList.add('overtime');
    if (restState.lbl) restState.lbl.textContent = restState.overLabel;
    restState.bar.style.width = '0%';
    // A forgotten phone should get to sleep: hold the screen ~60s into
    // overtime (enough to notice the flip), then let the lock go.
    restHideTO = setTimeout(() => {
      restState?.lock?.release?.().catch?.(() => {});
      if (restState) restState.lock = null;
      updateTotem();
    }, 60000);
  }
  // Count UP, capped at +30:00 on the label (an abandoned session shouldn't
  // read like a stopwatch marathon); half-second cadence is plenty.
  const over = Math.min(now - restState.deadline, 30 * 60000);
  // The bell REPEATS into early overtime — one ding on a loud gym floor is a
  // coin flip. Echoes only reach a visible page (a pocketed phone can't hear
  // them anyway, and a stack of stale dings on return would be noise: the
  // catch-up flash + overtime pill already tell that story).
  while (restState.echoes?.length && over >= restState.echoes[0]) {
    const due = restState.echoes.shift();
    if (document.visibilityState === 'visible' && over - due < 2000) {
      haptic([30, 60, 30]);
      sfx('restDone');
    }
  }
  const s = Math.floor(over / 1000);
  restState.digits.textContent = `+${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  restTO = setTimeout(restTick, 500);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // A live rest leaves a dot on the home-screen icon where the OS allows it.
    // Fully wrapped, never prompts: pure progressive enhancement. (There is
    // deliberately NO scheduled notification here — no browser has an API to
    // fire one at a future time, and pretending otherwise was v42's mistake.)
    if (restState && !restState.fired) {
      try { navigator.setAppBadge?.(1)?.catch?.(() => {}); } catch { /* no badging */ }
      // Hand the countdown from the now-frozen rAF loop to the 1s background
      // timeout, or the deadline can never be crossed while pocketed and the
      // Android notification never fires.
      if (restRAF) cancelAnimationFrame(restRAF);
      clearTimeout(restTO);
      restTO = setTimeout(restTick, 1000);
    }
    return;
  }
  try { navigator.clearAppBadge?.()?.catch?.(() => {}); } catch { /* no badging */ }
  // Back in the app: the on-screen bell owns it now, so kill any pending/shown
  // OS notification before it can double-buzz.
  cancelRestNotification();
  if (restState) {
    if (restRAF) cancelAnimationFrame(restRAF);
    clearTimeout(restTO);
    if (!restState.fired) acquireWakeLock(); // the lock auto-releases when the page hides
    restTick(); // catches up instantly; a missed completion fires once (with the catch-up ding)
  }
});

// ——— Rest-done system notification ———
// HONESTY LEDGER (v45/v46): v42 scheduled these via the Notification Triggers
// API (showTrigger/TimestampTrigger). That API shipped in NO browser — WebKit
// never implemented it, Chromium removed it in 2021 — so the scheduled path,
// and the permission prompt gated behind it, were dead code on every device.
// Deleted. What a web app can truly do about a pocketed phone with no server:
// on ANDROID (the user's Pixel 8a), plenty — a hidden page keeps ~1 Hz timers
// for minutes, so the background tick crosses the deadline and posts a real
// OS notification (v46). On iOS, nothing — JS suspends within seconds of
// lock; only real Web Push (a server) can wake a locked iPhone. The wake
// lock + repeating bell remain the face-up contract on both.
const NOTIF_TAG = 'p3-rest-done';

async function cancelRestNotification() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const notes = await reg.getNotifications({ tag: NOTIF_TAG });
    notes.forEach((n) => n.close());
  } catch { /* nothing shown, or unsupported */ }
}

// The countdown reaching zero while the page is hidden posts the OS alert
// right then — the payoff of the 1s background tick. Android delivers this
// to a pocketed or locked phone; iOS will already have suspended us (the
// return catch-up covers it there).
async function fireRestNotificationNow(overLabel) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Rest’s up 💪', {
      tag: NOTIF_TAG,
      body: `${overLabel || 'Back to it'} — time for your next set.`,
      requireInteraction: false,
      data: { kind: 'rest-done' },
    });
  } catch { /* unsupported */ }
}

const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// One-time, opt-in, never nags. On Android (the user's Pixel 8a) the offer is
// real: with permission granted, the background tick crosses the deadline in
// the pocket and posts an OS notification. On iOS the truth is the tip: a web
// app cannot buzz a locked iPhone, so we promise only what we deliver.
// Key is restTip2 ON PURPOSE: v42-v44 burned 'p3.restTipShown' showing a tip
// on every install, which would suppress this now-working offer forever.
function offerRestAlerts() {
  if (localStorage.getItem('p3.restTip2')) return;
  try { localStorage.setItem('p3.restTip2', '1'); } catch { /* private mode: tip may repeat */ }
  const offerable = !IS_IOS && 'Notification' in window && 'serviceWorker' in navigator
    && Notification.permission === 'default';
  if (offerable) {
    toast('I keep your screen lit while you rest. Want a buzz when it’s up, even in your pocket?', 'ok', 6500, {
      action: {
        label: 'Alert me',
        async fn() {
          try {
            const p = await Notification.requestPermission();
            toast(p === 'granted' ? 'Rest alerts on 🔔' : 'No alerts — your phone said no', p === 'granted' ? 'ok' : 'bad', 3200);
          } catch { /* denied */ }
        },
      },
    });
  } else {
    toast('I keep your screen awake while you rest, and the bell re-rings twice if you miss it. iPhone won’t let a web app buzz a locked phone — keep me face-up.', 'ok', 6000);
  }
}

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
  const copy = uniCopy();
  el.innerHTML = `
    <span class="totem" id="rest-totem" aria-hidden="true">${esc(copy.awake ?? NEUTRAL_COPY.awake)}</span>
    <span class="lbl" id="rest-lbl">${esc(label)}</span>
    <span class="t num" id="rest-t"></span>
    <span class="rbar"><i id="rest-bar" style="width:100%"></i></span>
    ${playable ? `<button class="play" id="rest-play"><span class="play-lbl">${ICONS.play} Play</span>${pbChip}${collChip}</button>` : ''}
    <button class="skip">Skip</button>`;
  container.prepend(el);
  const total = seconds * 1000;
  restState = {
    deadline: Date.now() + total,
    total,
    fired: false,
    bar: el.querySelector('#rest-bar'),
    digits: el.querySelector('#rest-t'),
    lbl: el.querySelector('#rest-lbl'),
    overLabel: copy.restOver ?? NEUTRAL_COPY.restOver,
    lock: null,
    ending: false,      // last-10s hot state applied once
    lastTickSec: null,  // final-3s tick fires once per whole second
    echoes: [8000, 20000], // the bell re-rings at +0:08 and +0:20 overtime (visible page only)
  };
  acquireWakeLock();
  // The server-side bell: armed at rest START (not at backgrounding), because
  // the page may be evicted before any visibilitychange fires. Fire-and-forget
  // — the local timer is already running and never waits on the network.
  armPush(restState.deadline, restState.overLabel);
  // restTick schedules its own next step (rAF visible / 1s timeout hidden) —
  // calling it directly means even a rest born on a hidden page ticks.
  restTick();
  // First rest ever: offer the OS alert (opt-in) or, where unsupported, the
  // honest screen-lit tip. Never nags past the first time.
  offerRestAlerts();
  el.querySelector('.skip').addEventListener('click', () => { haptic(6); sfx('tap'); hideRestTimer(); });
  const playBtn = el.querySelector('#rest-play');
  playBtn?.addEventListener('click', async () => {
    if (!restState || restState.deadline - Date.now() < GAME_FLOOR_MS) {
      return toast('Not enough rest left for a game', 'bad', 2800);
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
    const restore = lbl ? lbl.innerHTML : '';
    if (lbl) lbl.innerHTML = `${ICONS.play} Loading…`;
    playBtn.style.opacity = '0.72';
    playBtn.setAttribute('aria-busy', 'true');
    try {
      // Race the import against a watchdog: a stalled fetch on gym cell must
      // never wedge the chip at "Loading…" forever — the loading guard clears
      // in finally and the next tap retries fresh.
      const mod = await Promise.race([
        loadGames(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('arcade-timeout')), 10000)),
      ]);
      // Re-run the SAME floor after the (possibly multi-second, cold) import:
      // the rest may have ended or dropped under the floor while Phaser
      // downloaded, and opening then would hard-stop the game in a blink.
      if (!restState || restState.deadline - Date.now() < GAME_FLOOR_MS) {
        retireChip(); // the refusal and the chip's exit tell one story
        return toast('Not enough rest left for a game', 'bad', 2800);
      }
      await mod.openGame({ deadline: restState.deadline });
    } catch (err) {
      if (err?.message === 'arcade-timeout') {
        toast('The arcade is taking too long — tap Play to retry', 'bad', 3200);
      } else {
        toast("Couldn't load the arcade — check your connection", 'bad', 3200);
      }
    } finally {
      delete playBtn.dataset.loading;
      playBtn.removeAttribute('aria-busy');
      playBtn.style.opacity = '';
      if (lbl) lbl.innerHTML = restore;
    }
  });
}

export function hideRestTimer() {
  if (restRAF) cancelAnimationFrame(restRAF);
  restRAF = null;
  clearTimeout(restTO);
  restTO = null;
  // Kill any pending pill-lifecycle timeout BEFORE nulling state, so a stale
  // timer from the previous pill can never execute against the next one.
  clearTimeout(restHideTO);
  restHideTO = null;
  try { navigator.clearAppBadge?.()?.catch?.(() => {}); } catch { /* no badging */ }
  cancelRestNotification(); // logging a set / Skip / a new rest kills a pending alert
  // ...and the same for the worker's alarm, unless this rest already rang
  // (then there is nothing pending, and a disarm race could only cancel the
  // NEXT rest's alarm — showRestTimer re-arms after this call, so the order
  // is safe either way).
  if (pushConfigured() && restState && !restState.fired) disarmPush();
  restState?.lock?.release?.().catch?.(() => {});
  restState = null;
  document.getElementById('rest-pill')?.remove();
}

// ——— World-flavored moments ———

export function flashCard(title, name, then) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Information parity: the announcement ("TONIGHT: <world>", "act
    // cleared") still lands under reduced motion — as a static toast.
    toast(`${title} — ${name}`, 'ok', 1800);
    return then?.();
  }
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

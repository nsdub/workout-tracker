// Boot, tabs, status tag, sync lifecycle, auto-update.
import { $, todayStr, syncErrorHint, haptic } from './util.js';
import { store } from './store.js';
import * as worlds from './worlds.js';
import { phaseForDate } from './engine.js';
import { flushQueue, pullRemote, bootstrapStaticPlan } from './github.js';
import { toast, sheetPopHandled, gamePopHandled } from './components.js';
import { initAudio, sfx } from './audio.js';
import * as session from './views/session.js';
import * as log from './views/log.js';
import * as board from './views/plan.js';

const VIEWS = { today: session, history: log, plan: board };
let active = 'today';

function renderActive() {
  VIEWS[active].render($(`#view-${active}`));
  if (active === 'today') session.renderDock();
  renderStatus();
}

function renderStatus() {
  const el = $('#hud-status');
  let phaseTxt = 'no plan';
  if (store.plan) {
    const info = phaseForDate(store.plan, todayStr(), store.settings.phaseOverride);
    phaseTxt = info.phase ? `${info.phase.name} · W${info.week}` : `starts ${store.plan.phases[0].start.slice(5).replace('-', '/')}`;
  }
  // Built ONCE, then updated in place — rebuilding innerHTML on every store
  // notification reset the pending-blink phase and re-attached listeners.
  if (!el.dataset.built) {
    el.dataset.built = '1';
    el.innerHTML = `
      <button class="tag" id="phase-tag"></button>
      <button class="sync" id="sync-tag" aria-label="sync"><i></i></button>`;
    $('#phase-tag').onclick = () => { if (store.plan) board.phaseOverrideSheet(phaseForDate(store.plan, todayStr(), store.settings.phaseOverride)); };
    $('#sync-tag').onclick = async () => {
      // No token → open the connect sheet right here, not a toast pointing at a
      // control two hops away at the bottom of the Mission deck.
      if (!store.settings.token) return session.connectSheet();
      if (!navigator.onLine) return toast('Offline. Writes are queued.');
      toast('Syncing…');
      await flushQueue({ force: true }); // a deliberate tap outranks the backoff clock
      await pullRemote();
      if (store.syncStatus() === 'synced') return toast('All caught up', 'ok');
      // name the real blocker — "still pending" is only for the patient cases
      toast(syncErrorHint(store.syncError()) ?? 'Still pending, will retry', 'bad');
    };
  }
  const tag = $('#phase-tag');
  if (tag.textContent !== phaseTxt) tag.textContent = phaseTxt;
  const syncBtn = $('#sync-tag');
  const status = store.syncStatus();
  const prev = syncBtn.dataset.st || '';
  if (prev !== status) {
    syncBtn.className = `sync ${status}`;
    syncBtn.dataset.st = status;
    // the moment your night lands in GitHub: the lamp pops green
    if (prev === 'pending' && status === 'synced' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      syncBtn.querySelector('i')?.animate(
        [{ transform: 'scale(1.8)' }, { transform: 'scale(1)' }],
        { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' },
      );
    }
  }
}

function switchTab(tab) {
  if (tab === active) return;
  // .booted gates the view-in slide and tab-boing so the boot paint stays
  // still — only a real user switch animates
  document.body.classList.add('booted');
  sfx('nav');
  haptic(4);
  $(`#view-${active}`).classList.remove('active');
  if (active === 'history') log.resetDrill(); // leave the Atlas with no drill leftovers
  active = tab;
  const next = $(`#view-${active}`);
  VIEWS[active].render(next);
  next.classList.add('active');
  next.scrollTop = 0;
  if (active === 'today') session.renderDock();
  else session.clearDock();
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  renderStatus();
}

$('#tabbar').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) switchTab(tab.dataset.tab);
});

// Cross-view navigation: modules dispatch (results card → tonight's Atlas
// star, Atlas re-open → the Lift screen), the tab owner routes. An event, not
// an export, so the views never import the entry module back (no cycle).
window.addEventListener('p3:nav', (e) => {
  const { tab, entryPath } = e.detail || {};
  if (entryPath) log.openEntry(entryPath);
  if (tab && tab !== active) switchTab(tab);
  else renderActive();
});

// Log a conditioning session from anywhere (Mission tab's Fuel cells) without a
// plan→session import cycle.
window.addEventListener('p3:log-cardio', () => session.conditioningSheet());

store.sub((quiet) => {
  if (quiet) return renderStatus();
  renderActive();
});

// Android back gesture: the game first, then sheets, then Atlas drill-ins.
// The Atlas only owns the gesture while its tab is up — a stale drill must
// never re-render a hidden view and stomp the live world underneath.
window.addEventListener('popstate', () => {
  if (gamePopHandled()) return;
  if (sheetPopHandled()) return;
  if (active === 'history') { log.popBack(); return; }
  log.resetDrill();
});

// ——— Boot ———

initAudio();
{
  // Boot prune: if a stale clean draft dies here, hand its unseen world back
  // to the universe pool — the night never happened, the draw shouldn't burn.
  const pruned = store.pruneDraft();
  if (pruned?.world) {
    try { worlds.returnWorld?.(pruned.session_type, pruned.world); } catch { /* refund is best-effort */ }
  }
}
$(`#view-${active}`).classList.add('active');
document.querySelector(`.tab[data-tab="${active}"]`).classList.add('active');
renderActive();

const appVersion = self.PROTOCOL_VERSION || 'dev';
const lastVersion = localStorage.getItem('p3.lastVersion');
if (lastVersion && lastVersion !== appVersion) {
  setTimeout(() => toast(`Updated to ${appVersion}`), 700);
}
localStorage.setItem('p3.lastVersion', appVersion);

if (store.settings.token && navigator.onLine) {
  pullRemote().then(flushQueue);
} else if (navigator.onLine) {
  // Token-less installs still get the static plan (first run) AND the
  // morning coach review straight off Pages — the review must never be
  // gated behind GitHub setup.
  bootstrapStaticPlan();
}

window.addEventListener('online', () => { flushQueue(); pullRemote(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { flushQueue(); pullRemote(); }
});
setInterval(() => { if (store.queue.length) flushQueue(); }, 45000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // updateViaCache:'none' — update checks must bypass the HTTP cache for
  // imported scripts too, or a stale js/version.js can pin an old build
  // for as long as the CDN cache lives.
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
    setInterval(() => reg.update().catch(() => {}), 15 * 60 * 1000);
  }).catch(() => {});
  let reloaded = false;
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } // first install: no reload
    if (reloaded) return;
    const sheetOpen = document.querySelector('.sheet-root.open');
    // A LIVE REST is as protective as an open numpad: reloading destroys the
    // countdown, the wake lock and the pill mid-set. And `hidden` must NOT
    // bypass the guard — a pocketed phone with a running rest is exactly the
    // case the background tick exists to serve. The pill is in the DOM for
    // precisely as long as the rest is live.
    const restLive = !!document.getElementById('rest-pill');
    if (!sheetOpen && !restLive) {
      reloaded = true;
      location.reload();
    } else {
      // never yank a numpad — or a running rest timer — out of someone's hands
      toast('Updated — applies next time you look away');
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && !reloaded
          && !document.getElementById('rest-pill')) { reloaded = true; location.reload(); }
      }, { once: true });
    }
  });
}

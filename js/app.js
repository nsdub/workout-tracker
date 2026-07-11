// Boot, tab navigation, header status, sync lifecycle.
import { $, todayStr } from './util.js';
import { store } from './store.js';
import { phaseForDate } from './engine.js';
import { flushQueue, pullRemote, bootstrapStaticPlan } from './github.js';
import { toast } from './components.js';
import { initTheme } from './theme.js';
import * as today from './views/today.js';
import * as history from './views/history.js';
import * as plan from './views/plan.js';

const VIEWS = { today, history, plan };
const ORDER = ['today', 'history', 'plan'];
let active = 'today';

function renderActive() {
  VIEWS[active].render($(`#view-${active}`));
  if (active === 'today') today.renderDock();
  renderHeader();
}

function renderHeader() {
  const chip = $('#phase-chip');
  if (store.plan) {
    const info = phaseForDate(store.plan, todayStr(), store.settings.phaseOverride);
    if (info.phase) {
      chip.textContent = `${info.phase.name} · W${info.week}`;
      chip.classList.remove('off');
      chip.classList.toggle('override', info.override);
    } else {
      chip.textContent = `starts ${store.plan.phases[0].start.slice(5).replace('-', '/')}`;
      chip.classList.add('off');
    }
  } else {
    chip.textContent = 'no plan';
    chip.classList.add('off');
  }
  $('#sync-dot').className = `sync-dot ${store.syncStatus()}`;
}

function switchTab(tab) {
  if (tab === active) return;
  const from = ORDER.indexOf(active);
  const to = ORDER.indexOf(tab);
  const prev = $(`#view-${active}`);
  prev.classList.remove('active', 'slide-in-r', 'slide-in-l');
  active = tab;
  const next = $(`#view-${active}`);
  VIEWS[active].render(next);
  next.classList.add('active', to > from ? 'slide-in-r' : 'slide-in-l');
  next.scrollTop = 0;
  if (active === 'today') today.renderDock();
  else today.clearDock();
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  renderHeader();
}

// ——— Wire up ———

$('#tabbar').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) switchTab(tab.dataset.tab);
});

$('#phase-chip').addEventListener('click', () => {
  if (!store.plan) return;
  const info = phaseForDate(store.plan, todayStr(), store.settings.phaseOverride);
  plan.phaseOverrideSheet(info);
});

$('#sync-dot').addEventListener('click', async () => {
  if (!store.settings.token) return toast('No token set. Add one on the Plan tab.', 'warn');
  if (!navigator.onLine) return toast('Offline. Writes are queued.', 'warn');
  toast('Syncing…');
  await flushQueue();
  await pullRemote();
  toast(store.syncStatus() === 'synced' ? 'Up to date' : 'Sync pending, will retry', store.syncStatus() === 'synced' ? 'ok' : 'warn');
});

store.sub((quiet) => {
  if (quiet) return renderHeader();
  renderActive();
});

// ——— Boot ———

initTheme(store.settings.theme);
store.pruneDraft();

// Announce fresh builds so updates are visible.
const appVersion = self.PROTOCOL_VERSION || 'dev';
const lastVersion = localStorage.getItem('p3.lastVersion');
if (lastVersion && lastVersion !== appVersion) {
  setTimeout(() => toast(`Updated to ${appVersion}`), 600);
}
localStorage.setItem('p3.lastVersion', appVersion);
$(`#view-${active}`).classList.add('active');
document.querySelector(`.tab[data-tab="${active}"]`).classList.add('active');
renderActive();

if (store.settings.token && navigator.onLine) {
  pullRemote().then(flushQueue);
} else if (!store.plan && navigator.onLine) {
  bootstrapStaticPlan();
}

window.addEventListener('online', () => { flushQueue(); pullRemote(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { flushQueue(); pullRemote(); }
});
setInterval(() => { if (store.queue.length) flushQueue(); }, 45000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // Look for a new version whenever the app comes back to the foreground.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => { /* dev server without https */ });

  // When an updated service worker takes over, reload once so the new
  // version applies immediately. Drafts live in localStorage, so nothing is lost.
  let reloadedForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForUpdate) return;
    reloadedForUpdate = true;
    location.reload();
  });
}

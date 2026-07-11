// Boot, tabs, status tag, sync lifecycle, auto-update.
import { $, todayStr } from './util.js';
import { store } from './store.js';
import { phaseForDate } from './engine.js';
import { flushQueue, pullRemote, bootstrapStaticPlan } from './github.js';
import { toast, sheetPopHandled } from './components.js';
import { initAudio } from './audio.js';
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
  el.innerHTML = `
    <button class="tag" id="phase-tag">${phaseTxt}</button>
    <button class="sync ${store.syncStatus()}" id="sync-tag" aria-label="sync"><i></i></button>`;
  $('#phase-tag').onclick = () => { if (store.plan) board.phaseOverrideSheet(phaseForDate(store.plan, todayStr(), store.settings.phaseOverride)); };
  $('#sync-tag').onclick = async () => {
    if (!store.settings.token) return toast('No token yet — Systems console on the Mission deck', 'bad');
    if (!navigator.onLine) return toast('Offline. Writes are queued.');
    toast('Syncing…');
    await flushQueue();
    await pullRemote();
    toast(store.syncStatus() === 'synced' ? 'All caught up' : 'Still pending, will retry', store.syncStatus() === 'synced' ? 'ok' : 'bad');
  };
}

function switchTab(tab) {
  if (tab === active) return;
  $(`#view-${active}`).classList.remove('active');
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

store.sub((quiet) => {
  if (quiet) return renderStatus();
  renderActive();
});

// Android back gesture: sheets first, then scrapbook drill-ins.
window.addEventListener('popstate', () => {
  if (sheetPopHandled()) return;
  log.popBack();
});

// ——— Boot ———

initAudio();
store.pruneDraft();
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
} else if (!store.plan && navigator.onLine) {
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
    if (document.visibilityState === 'hidden' || !sheetOpen) {
      reloaded = true;
      location.reload();
    } else {
      // never yank a numpad out of someone's hands mid-set
      toast('Updated — applies next time you look away');
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && !reloaded) { reloaded = true; location.reload(); }
      }, { once: true });
    }
  });
}

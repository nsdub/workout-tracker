// THE MUSEUM OF MY OWN INCOMPETENCE — gallery runtime.
// Hash-routed, filterable, keyboard-navigable, offline. Reads exhibits.json;
// the data is the record and this file only arranges it.

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const WING_VAR = { I: '--w1', II: '--w2', III: '--w3', IV: '--w4', V: '--w5' };
const SEVERITIES = ['critical', 'severe', 'moderate', 'minor'];

let DATA = null;
let view = { wing: 'ALL', sev: new Set(), stat: new Set(), q: '' };
let shown = [];   // exhibits currently on the wall, in display order

// ——— boot ———
(async function init() {
  try {
    const res = await fetch('exhibits.json', { cache: 'no-cache' });
    DATA = await res.json();
  } catch {
    $('#grid').innerHTML = '<li class="empty">The collection could not be loaded. '
      + 'Even the museum about failure fails. That belongs in it.</li>';
    return;
  }
  $('#sub').textContent = DATA.subtitle;
  $('#curator').textContent = DATA.curator_note;
  buildRibbon();
  buildWings();
  buildFilters();
  wireControls();
  window.addEventListener('hashchange', route);
  route();
  registerSW();
})();

// ——— the stat ribbon over the door ———
function buildRibbon() {
  const ex = DATA.exhibits;
  const n = (f) => ex.filter(f).length;
  const ticks = [
    ['exhibits', ex.length, false],
    ['critical', n((e) => e.severity === 'critical'), true],
    ['reversals of my own position', n((e) => e.wing === 'II'), true],
    ['fixed', n((e) => /fixed|current|gated|corrected|retracted|resolved/i.test(e.status)), false],
    ['still open', n((e) => /open|handed/i.test(e.status)), true],
    ['builds burned', 9, false],
    ['days the trainers were dead', 2, true],
  ];
  $('#ribbon').innerHTML = ticks.map(([label, v, bad]) =>
    `<span class="tick${bad ? ' bad' : ''}"><b>${v}</b>${esc(label)}</span>`).join('');
}

// ——— wing selector ———
function buildWings() {
  const counts = (id) => DATA.exhibits.filter((e) => e.wing === id).length;
  const btn = (id, name, n, cvar) =>
    `<button class="wing-btn" data-wing="${id}" style="--c:var(${cvar})"
       aria-current="false"><span>${esc(name)}</span><span class="n">${n}</span></button>`;
  $('#wings').innerHTML =
    btn('ALL', 'The whole collection', DATA.exhibits.length, '--gold')
    + DATA.wings.map((w) => btn(w.id, `${w.id} · ${w.name}`, counts(w.id), WING_VAR[w.id])).join('');
  $('#wings').addEventListener('click', (e) => {
    const b = e.target.closest('.wing-btn');
    if (b) location.hash = b.dataset.wing === 'ALL' ? '' : `#/wing/${b.dataset.wing}`;
  });
}

// ——— filter chips ———
function buildFilters() {
  $('#sev').innerHTML = SEVERITIES.map((s) =>
    `<button class="chip sev-${s}" data-sev="${s}" aria-pressed="false">${s}</button>`).join('');
  const stats = [...new Set(DATA.exhibits.map((e) => e.status))].sort();
  $('#stat').innerHTML = stats.map((s) =>
    `<button class="chip" data-stat="${esc(s)}" aria-pressed="false">${esc(s)}</button>`).join('');

  const toggle = (set, key) => (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const v = b.dataset[key];
    if (set.has(v)) set.delete(v); else set.add(v);
    b.setAttribute('aria-pressed', String(set.has(v)));
    render();
  };
  $('#sev').addEventListener('click', toggle(view.sev, 'sev'));
  $('#stat').addEventListener('click', toggle(view.stat, 'stat'));
}

function wireControls() {
  const q = $('#q');
  q.addEventListener('input', () => {
    view.q = q.value.trim().toLowerCase();
    $('#qclear').hidden = !q.value;
    render();
  });
  $('#qclear').addEventListener('click', () => {
    q.value = ''; view.q = ''; $('#qclear').hidden = true; render(); q.focus();
  });

  $('#grid').addEventListener('click', (e) => {
    const c = e.target.closest('.spec');
    if (c) location.hash = `#/exhibit/${c.dataset.id}`;
  });

  $('#vitrine').addEventListener('click', (e) => { if (e.target.dataset.close !== undefined) closePlate(); });
  $('#v-prev').addEventListener('click', () => step(-1));
  $('#v-next').addEventListener('click', () => step(1));

  document.addEventListener('keydown', (e) => {
    const open = !$('#vitrine').hidden;
    if (e.key === 'Escape' && open) { closePlate(); return; }
    if (open && (e.key === 'ArrowRight' || e.key === 'j')) { step(1); return; }
    if (open && (e.key === 'ArrowLeft' || e.key === 'k')) { step(-1); return; }
    if (e.key === '/' && !open && document.activeElement !== $('#q')) { e.preventDefault(); $('#q').focus(); }
  });
}

// ——— routing ———
function route() {
  const h = location.hash;
  const mEx = h.match(/^#\/exhibit\/(E\d+)/i);
  const mWing = h.match(/^#\/wing\/([IV]+)/i);
  view.wing = mWing ? mWing[1].toUpperCase() : (mEx ? view.wing : 'ALL');
  render();
  if (mEx) openPlate(mEx[1].toUpperCase()); else closePlate(true);
}

// ——— the wall ———
function render() {
  document.querySelectorAll('.wing-btn').forEach((b) =>
    b.setAttribute('aria-current', String(b.dataset.wing === view.wing)));

  const wing = DATA.wings.find((w) => w.id === view.wing);
  $('#wingcard').innerHTML = wing
    ? `<section class="wingwall" style="--c:var(${WING_VAR[wing.id]})">
         <div class="rom">Wing ${esc(wing.id)}</div>
         <h2>${esc(wing.name)}</h2>
         <p>${esc(wing.tagline)}</p>
       </section>${wing.id === 'II' ? pendulum() : ''}`
    : '';

  shown = DATA.exhibits.filter((e) => {
    if (view.wing !== 'ALL' && e.wing !== view.wing) return false;
    if (view.sev.size && !view.sev.has(e.severity)) return false;
    if (view.stat.size && !view.stat.has(e.status)) return false;
    if (view.q) {
      const hay = [e.id, e.title, e.claim, e.truth, e.evidence, e.cost, e.lesson, e.commit]
        .join(' ').toLowerCase();
      if (!hay.includes(view.q)) return false;
    }
    return true;
  });

  $('#count').textContent = shown.length === DATA.exhibits.length
    ? `All ${shown.length} exhibits on display`
    : `${shown.length} of ${DATA.exhibits.length} exhibits on display`;

  $('#grid').innerHTML = shown.map(card).join('');
  $('#empty').hidden = shown.length > 0;
}

function card(e) {
  return `<li><article class="spec" data-id="${e.id}" tabindex="0" role="button"
      style="--c:var(${WING_VAR[e.wing]})" aria-label="Exhibit ${e.id}: ${esc(e.title)}">
    <div class="spec-top">
      <span class="spec-id">${e.id}</span>
      <span class="spec-w">Wing ${e.wing}</span>
    </div>
    <h3>${esc(e.title)}</h3>
    <p class="gist">${esc(trim(e.truth, 165))}</p>
    <div class="tags">
      <span class="tag ${esc(e.severity)}">${esc(e.severity)}</span>
      <span class="tag st">${esc(e.status)}</span>
      ${e.commit ? `<span class="tag st">${esc(e.commit)}</span>` : ''}
    </div>
  </article></li>`;
}

const trim = (s, n) => (String(s).length > n ? `${String(s).slice(0, n).replace(/\s+\S*$/, '')}…` : String(s));

// Keyboard activation on the cards themselves.
document.addEventListener('keydown', (e) => {
  const c = document.activeElement?.closest?.('.spec');
  if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = `#/exhibit/${c.dataset.id}`; }
});

// ——— Wing II: the pendulum ———
function pendulum() {
  const P = [
    ['v72', 'KEEP', 'never snap a held weight'],
    ['v73', 'SNAP', 'snap held + typed input'],
    ['v76', 'REBUILD', 'rewrite the grid to fit his log'],
    ['v77', 'SNAP', 'revert to the manufacturer grid'],
    ['v78', 'KEEP', 'never touch anything he types'],
    ['v79', 'SNAP', 'snap held + typed — current'],
  ];
  const y = { KEEP: 54, SNAP: 12, REBUILD: 33 };
  const colW = 100 / P.length;
  const pts = P.map((p, i) => `${colW * i + colW / 2},${y[p[1]]}`).join(' ');
  const col = { KEEP: 'var(--w4)', SNAP: 'var(--w2)', REBUILD: 'var(--blood)' };
  return `<section class="pendulum">
    <h3>Wing II · the swing, plotted</h3>
    <p>One question — <em>should the app snap a cable weight onto the machine's grid?</em>
       Six answers in one night, five of them shipped to the phone he was holding.</p>
    <div class="pend-rail">
      ${P.map((p) => `<div class="pend-col"><div class="pend-v">${p[0]}</div></div>`).join('')}
    </div>
    <div class="pend-track">
      <svg viewBox="0 0 100 66" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="${pts}" fill="none" stroke="var(--gold)" stroke-width="1.1"
          vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
        ${P.map((p, i) => `<circle cx="${colW * i + colW / 2}" cy="${y[p[1]]}" r="2.4"
          fill="${col[p[1]]}" stroke="#0a0710" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('')}
      </svg>
    </div>
    <div class="pend-rail">
      ${P.map((p) => `<div class="pend-col">
        <div class="pend-dot" style="background:${col[p[1]]}"></div>
        <div class="pend-lab"><b>${p[1]}</b><br>${esc(p[2])}</div></div>`).join('')}
    </div>
  </section>`;
}

// ——— the vitrine ———
function openPlate(id) {
  const e = DATA.exhibits.find((x) => x.id === id);
  if (!e) return;
  const wing = DATA.wings.find((w) => w.id === e.wing);
  const row = (cls, label, val) => (val
    ? `<div class="v-sec ${cls}"><dt>${label}</dt><dd>${esc(val)}</dd></div>` : '');

  $('#v-body').innerHTML = `
    <div class="v-head" style="border-color:var(${WING_VAR[e.wing]})">
      <div class="v-eyebrow">
        <span>${e.id}</span>
        <span>Wing ${e.wing} · ${esc(wing?.name ?? '')}</span>
        <span class="tag ${esc(e.severity)}">${esc(e.severity)}</span>
        <span class="tag st">${esc(e.status)}</span>
        ${e.commit ? `<span class="tag st">${esc(e.commit)}</span>` : ''}
      </div>
      <h2>${esc(e.title)}</h2>
    </div>
    <dl style="margin:0">
      ${row('claim', 'What I said or shipped', e.claim)}
      ${row('truth', 'What was actually true', e.truth)}
      ${row('evidence', 'Evidence', e.evidence)}
      ${row('cost', 'What it cost him', e.cost)}
      ${e.lesson && e.lesson !== '—' ? row('lesson', 'The lesson', e.lesson) : ''}
    </dl>`;

  const i = shown.findIndex((x) => x.id === id);
  $('#v-prev').disabled = i <= 0;
  $('#v-next').disabled = i === -1 || i >= shown.length - 1;

  $('#vitrine').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#plate').scrollTop = 0;
  $('#plate').focus();
}

function step(d) {
  const cur = location.hash.match(/^#\/exhibit\/(E\d+)/i)?.[1]?.toUpperCase();
  const i = shown.findIndex((x) => x.id === cur);
  const next = shown[i + d];
  if (next) location.hash = `#/exhibit/${next.id}`;
}

function closePlate(silent) {
  if ($('#vitrine').hidden) return;
  $('#vitrine').hidden = true;
  document.body.style.overflow = '';
  if (!silent) {
    const back = view.wing === 'ALL' ? '' : `#/wing/${view.wing}`;
    if (location.hash !== back) location.hash = back;
  }
}

// ——— PWA ———
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
}

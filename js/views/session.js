// LIFT — one objective at a time inside its world. Giant numbers, one giant
// world-verb button, trophies for banked sets. Backend logic untouched.
import { $, esc, fmtW, todayStr, fmtDate, haptic } from '../util.js';
import { store } from '../store.js';
import * as engine from '../engine.js';
import { flushQueue, checkConnection, pullRemote, importSeedBundle } from '../github.js';
import { numpadSheet, optionSheet, confirmSheet, openSheet, toast, showRestTimer, hideRestTimer, burstAt, flashCard, prOverlay } from '../components.js';
import { UNIVERSES, applyWorld, universeOf, worldDef, pickWorld } from '../worlds.js';
import { sfx } from '../audio.js';

let root = null;
let focusIdx = null;
let lastLogAt = 0;
let resumeAsked = false;
let announceWorld = false; // set when a fresh draft lands in a new world
let navDir = null;         // 'next' | 'prev' — card slide direction
let lastWorldKey = null;   // entrance animations only when this changes

export function render(el) {
  root = el;
  if (!store.plan) { applyWorld('sb'); return renderSetup(); }
  const today = todayStr();
  const phaseInfo = engine.phaseForDate(store.plan, today, store.settings.phaseOverride);
  ensureDraft(today, phaseInfo);
  if (!store.draft.world) { // drafts from before the universes knew about worlds
    store.draft.world = pickWorld(store.draft.session_type);
    store.saveDraft(store.draft);
  }
  applyWorld(store.draft.session_type, store.draft.world);
  if (announceWorld) {
    announceWorld = false;
    const U = universeOf(store.draft.session_type);
    const W = worldDef(store.draft.session_type, store.draft.world);
    if (U && W) setTimeout(() => flashCard(`TONIGHT: ${W.name}`, U.name, () => {}), 350);
  }
  if (store.draft.date !== today && !resumeAsked) {
    resumeAsked = true;
    setTimeout(() => confirmSheet({
      title: `Finish ${fmtDate(store.draft.date)}, or start fresh?`,
      body: 'You have logged sets from a previous day. "Never mind" keeps finishing that night.',
      confirmLabel: 'Start tonight fresh',
      danger: true,
      onConfirm() { store.clearDraft(); focusIdx = null; render(root); renderDock(); },
    }), 300);
  }
  const n = store.draft.exercises.length;
  if (focusIdx == null || focusIdx >= n) focusIdx = defaultFocus(store.draft);
  // a re-render inside the same world must not replay the entrance — the
  // stage stays still and only the card moves
  const worldKey = `${store.draft.session_type}:${store.draft.world}`;
  root.classList.toggle('no-entrance', worldKey === lastWorldKey);
  lastWorldKey = worldKey;
  renderWorldScreen(store.draft, phaseInfo);
  navDir = null;
  renderDock();
}

function defaultFocus(d) {
  const i = d.exercises.findIndex((x) => x.sets.some((s) => !s.done && !s.skipped));
  return i === -1 ? Math.max(0, d.exercises.length - 1) : i;
}

// consecutive training days ending yesterday (tonight isn't banked yet)
function trainStreak(history, today) {
  const days = new Set(history.map((e) => e.date));
  const d = new Date(today + 'T12:00:00');
  let n = 0;
  d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ——— First run ———

function renderSetup() {
  root.onclick = null;
  root.innerHTML = `
    <div class="empty"><div class="card-e">
      <h3>Protocol</h3>
      <p>Your training data lives in the workout-tracker repo on GitHub. Connect once and the show starts.</p>
      <div style="display:flex;flex-direction:column;gap:9px;margin-top:14px">
        <button class="btn primary" id="su-connect">Connect GitHub</button>
        <button class="btn quiet" id="su-import">Import seed bundle</button>
        <input type="file" id="su-file" accept=".json" hidden>
      </div>
    </div></div>`;
  $('#su-connect', root).addEventListener('click', connectSheet);
  $('#su-import', root).addEventListener('click', () => $('#su-file', root).click());
  $('#su-file', root).addEventListener('change', handleSeedFile);
}

export function connectSheet() {
  const s = store.settings;
  openSheet(`
    <h2>Connect GitHub</h2>
    <div class="sub">Fine-grained token, contents read-write</div>
    <div class="card">
      <div class="field"><label>Repository</label><input id="c-repo" value="${esc(s.owner)}/${esc(s.repo)}" autocapitalize="off"></div>
      <div class="field"><label>Token</label><input id="c-token" type="password" value="${esc(s.token)}" placeholder="github_pat_…" autocapitalize="off"></div>
    </div>
    <button class="btn primary" id="c-save">Connect &amp; pull</button>`, {
    onOpen(sheet, close) {
      $('#c-save', sheet).addEventListener('click', async () => {
        const [owner, repo] = $('#c-repo', sheet).value.trim().split('/');
        const token = $('#c-token', sheet).value.trim();
        if (!owner || !repo || !token) return toast('Fill in repo and token', 'bad');
        const prior = { owner: store.settings.owner, repo: store.settings.repo, token: store.settings.token };
        store.saveSettings({ owner, repo, token });
        const btn = $('#c-save', sheet);
        btn.textContent = 'Connecting…'; btn.disabled = true;
        try {
          await checkConnection();
          close();
          toast('Connected');
          await pullRemote();
          await flushQueue();
          toast(store.plan ? 'Plan loaded' : 'Repo has no plan yet — import the seed bundle', store.plan ? 'ok' : 'bad', 3200);
        } catch (err) {
          store.saveSettings(prior); // never keep a token GitHub rejected
          btn.textContent = 'Connect & pull'; btn.disabled = false;
          toast('GitHub rejected it — check the token and repo name', 'bad', 4000);
        }
      });
    },
  });
}

export async function handleSeedFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const bundle = JSON.parse(await file.text());
    const n = importSeedBundle(bundle);
    toast(`Imported ${n} sessions`);
    flushQueue();
  } catch (err) {
    toast(err.message || 'Import failed', 'bad', 4000);
  }
  e.target.value = '';
}

// ——— Draft ———

function ensureDraft(today, phaseInfo) {
  const d = store.draft;
  const dirty = d?.exercises?.some((x) => x.sets.some((s) => s.done));
  if (d && (d.date === today || dirty)) return d.session_type;
  const type = engine.rotationNext(store.plan, store.history);
  store.saveDraft(buildDraft(today, type, phaseInfo));
  focusIdx = null;
  announceWorld = true;
  return type;
}

function buildDraft(date, sessionType, phaseInfo) {
  const session = store.plan.sessions[sessionType];
  const exercises = session.exercises.map((slot) => {
    const rx = engine.prescribe(store.plan, store.history, sessionType, slot, phaseInfo);
    const last = engine.lastPerformance(store.history, sessionType, slot.id, {});
    return {
      prev: last ? {
        date: last.entry.date,
        sets: last.ex.sets.map((s) => `${fmtW(s.weight)}×${s.reps}`).join('  '),
        tag: store.plan.phases.find((p) => p.id === last.entry.phase)?.type === 'deload' ? 'deload' : null,
      } : null,
      id: slot.id,
      name: engine.exMeta(store.plan, slot.id).name,
      repMin: slot.repMin, repMax: slot.repMax, repUnit: slot.repUnit || null,
      rest: slot.rest || 90,
      basis: rx.basis, prevTop: rx.prevTop, note: rx.note || null, bump: rx.increment || 0,
      stalled: engine.isStalled(store.plan, store.history, sessionType, slot),
      inc: engine.increment(store.plan, slot.id) || 2.5,
      sets: rx.sets.map((s) => ({ weight: s.weight, reps: s.reps, done: false })),
    };
  });
  return {
    date, session_type: sessionType, world: pickWorld(sessionType),
    phase: phaseInfo.phase?.id ?? null, week: phaseInfo.week,
    bodyweight: null, notes: '', exercises,
  };
}

function switchSession(type) {
  const today = todayStr();
  const phaseInfo = engine.phaseForDate(store.plan, today, store.settings.phaseOverride);
  hideRestTimer();
  store.saveDraft(buildDraft(today, type, phaseInfo));
  focusIdx = null;
  announceWorld = true;
  render(root);
}

// ——— The world screen ———

const BASIS = {
  progress: (x) => `<span class="num">${fmtW(x.prevTop)}</span> <span class="up">→ <span class="num">${fmtW(x.prevTop + x.bump)}</span> lb — every set hit the top</span>`,
  repeat: (x) => `Repeat <span class="num">${fmtW(x.prevTop)}</span> lb`,
  hold: (x) => `Prep — hold <span class="num">${fmtW(x.prevTop)}</span> lb`,
  seed: (x) => x.prev ? `New program — seed weight (older logs shown for reference)` : `First run — seed weight`,
  calibration: (x) => `90% of <span class="num">${fmtW(x.prevTop)}</span>, rounded down`,
  deload: (x) => `80% of <span class="num">${fmtW(x.prevTop)}</span>, rounded down`,
  verify: (x) => esc(x.note || 'Verify weight'),
  bodyweight: () => `Bodyweight`,
};

function renderWorldScreen(draft, phaseInfo) {
  const U = universeOf(draft.session_type);
  const W = worldDef(draft.session_type, draft.world);
  const session = store.plan.sessions[draft.session_type];
  const isNext = engine.rotationNext(store.plan, store.history) === draft.session_type;
  const phase = phaseInfo.phase;
  const missionNo = store.history.length + 1;
  const x = draft.exercises[focusIdx];
  const curIdx = x.sets.findIndex((s) => !s.done && !s.skipped);
  const cur = curIdx === -1 ? null : x.sets[curIdx];
  const lastWarned = [...x.sets].reverse().find((s) => s.done && s.warn && !s.warnDismissed);

  // Universe furniture: the console is a different machine in every universe.
  // The Deep's panel wears a live depth gauge; the Atoll's radio has a tuning
  // needle — both sweep as sets get logged.
  const doneInEx = x.sets.filter((s) => s.done).length;
  const exPct = Math.round((doneInEx / Math.max(1, x.sets.length)) * 100);

  const streak = trainStreak(store.history, draft.date);
  const frameExtras = U.cls === 'deep'
    ? `<div class="depth-rail"><i class="dmark" style="top:${(6 + exPct * 0.86).toFixed(1)}%"></i></div>`
    : U.cls === 'atoll'
      ? `<div class="freq"><i class="needle" style="left:${(5 + exPct * 0.88).toFixed(1)}%"></i></div>`
      : '';

  root.innerHTML = `
    <header class="world-head">
      <div class="uni-name">${esc(U.name)}</div>
      <div class="world-name">${esc(W.name)}</div>
      <div class="mission-line">${esc(session.name)} — night ${missionNo} — ${fmtDate(draft.date)}</div>
      <div class="head-tools">
        <button class="tool" id="chip-bw">BW ${draft.bodyweight ? fmtW(draft.bodyweight) : '—'}</button>
        <button class="tool" id="chip-notes">${draft.notes ? 'Note ●' : 'Note +'}</button>
        <button class="tool" id="switch-session">Swap day</button>
      </div>
    </header>
    ${isNext ? '' : `<div class="notice">Off the rotation tonight — allowed. Days get pushed, never skipped.</div>`}
    ${streak >= 6 ? `<div class="notice">${streak} straight nights — take the rest day. The rotation pauses, nothing is lost.</div>` : ''}
    ${draft.date !== todayStr() ? `<div class="notice"><span>Resuming ${fmtDate(draft.date)}</span><button id="resume-discard">Discard</button></div>` : ''}
    ${phase?.type === 'deload' ? `<div class="notice">Deload week — 80% load, 60% sets, 4+ RIR</div>` : ''}
    ${phase?.type === 'calibration' ? `<div class="notice">Calibration week — seeds at 90%</div>` : ''}

    <section class="objective ${navDir === 'next' ? 'slide-next' : navDir === 'prev' ? 'slide-prev' : ''}">
      ${frameExtras}
      <div class="obj-top">
        <button class="count" id="open-brief">Act <b>${focusIdx + 1}</b> of ${draft.exercises.length}</button>
        <div class="obj-pg">
          <button class="pg" id="pg-prev" ${focusIdx === 0 ? 'disabled' : ''}>◀</button>
          <button class="pg" id="pg-next" ${focusIdx === draft.exercises.length - 1 ? 'disabled' : ''}>▶</button>
        </div>
      </div>
      <h1 class="obj-name"><button id="open-howto" data-ex="${esc(x.id)}">${esc(x.name)}<span class="qm">?</span></button></h1>
      <div class="obj-meta">
        <span class="chipper">${x.sets.length} × ${x.repMin === x.repMax ? x.repMin : `${x.repMin}–${x.repMax}`}${x.repUnit === 'sec' ? 's' : ''}</span>
        ${x.stalled ? '<span class="chipper warn">stalled</span>' : ''}
        ${x.basis === 'verify' ? '<span class="chipper warn">verify</span>' : ''}
      </div>
      ${x.prev ? `<div class="last-strip"><b>LAST</b><span class="d">${fmtDate(x.prev.date)}${x.prev.tag ? ` · ${x.prev.tag}` : ''}</span><span class="num">${x.prev.sets}</span></div>` : ''}
      <div class="basis-line">${BASIS[x.basis]?.(x) ?? ''}</div>

      ${x.sets.some((s) => s.done) ? `
        <div class="trophy-note">${esc(U.copy.trophyNote)}</div>
        <div class="trophies">
          ${x.sets.map((s, si) => s.done ? `<button class="trophy" data-si="${si}"><span class="num">${fmtW(s.weight)}×${s.reps}</span>${s.pr ? ' ★' : ''}</button>` : '').join('')}
        </div>` : ''}

      ${lastWarned ? `<div class="warnbox">⚠ ${esc(lastWarned.warn)}<button class="dismiss" id="warn-dismiss">✕</button></div>` : ''}

      ${cur ? `
      <div class="console" id="console">
        <div class="striker"></div>
        <div class="set-label">set ${curIdx + 1} of ${x.sets.length}</div>
        <div class="c-vals">
          <button class="g-val" id="g-w">${cur.weight == null ? '—' : fmtW(cur.weight)}<u>lb</u></button>
          <span class="c-x">×</span>
          <button class="g-val" id="g-r">${cur.reps}<u>${x.repUnit === 'sec' ? 'sec' : 'reps'}</u></button>
        </div>
        <button class="g-log" id="g-log">${esc(U.copy.log)}</button>
        <button class="g-skip" id="g-skip">Skip this set</button>
        <div class="set-pips" id="set-pips">
          ${x.sets.map((s, si) => `<i class="pip ${s.done ? 'done' : s.skipped ? 'skip' : si === curIdx ? 'cur' : ''}" data-si="${si}"></i>`).join('')}
        </div>
      </div>` : `
      <div class="obj-done">
        <div class="big">${esc(U.copy.objDone)}!</div>
        ${x.sets.some((q) => q.skipped) ? `<div class="basis-line">${x.sets.filter((q) => q.skipped).length} skipped — tap a crossed pip below to bring one back</div><div class="set-pips" id="set-pips">${x.sets.map((q, si) => `<i class="pip ${q.done ? 'done' : q.skipped ? 'skip' : ''}" data-si="${si}"></i>`).join('')}</div>` : ''}
        ${focusIdx < draft.exercises.length - 1 ? `<button class="btn primary" id="od-next">Next act</button>` : `<div class="basis-line">Every act cleared — ${esc(U.copy.finish.toLowerCase())} below</div>`}
      </div>`}
    </section>

    <div class="obj-dots">
      ${draft.exercises.map((e, i) => {
        const st = e.sets.every((s) => s.done) ? 'done' : e.sets.some((s) => s.done) ? 'part' : '';
        return `<button class="odot ${st} ${i === focusIdx ? 'cur' : ''}" data-oi="${i}" aria-label="${esc(e.name)}"></button>`;
      }).join('')}
    </div>`;

  wire(draft, x, curIdx);
}

function wire(draft, x, curIdx) {
  root.onclick = null;
  const U = universeOf(draft.session_type);
  $('#open-brief', root).addEventListener('click', briefingSheet);
  $('#chip-bw', root).addEventListener('click', bodyweightSheet);
  $('#chip-notes', root).addEventListener('click', notesSheet);
  $('#switch-session', root).addEventListener('click', switchSheet);
  $('#open-howto', root).addEventListener('click', (e) => howtoSheet(e.currentTarget.dataset.ex));
  $('#resume-discard', root)?.addEventListener('click', () => {
    confirmSheet({
      title: `Discard ${fmtDate(draft.date)}?`,
      body: 'Its logged sets are dropped and today starts fresh.',
      confirmLabel: 'Discard', danger: true,
      onConfirm() { store.clearDraft(); focusIdx = null; render(root); renderDock(); },
    });
  });
  const paginate = (target, dir) => {
    navDir = dir ?? (target > focusIdx ? 'next' : 'prev');
    focusIdx = target;
    const st = root.scrollTop;
    render(root);
    root.scrollTop = st;
  };
  $('#pg-prev', root)?.addEventListener('click', () => paginate(focusIdx - 1, 'prev'));
  $('#pg-next', root)?.addEventListener('click', () => paginate(focusIdx + 1, 'next'));
  $('#od-next', root)?.addEventListener('click', () => paginate(defaultFocus(store.draft), 'next'));
  root.querySelectorAll('.odot').forEach((d) => d.addEventListener('click', () => {
    const t = Number(d.dataset.oi);
    if (t !== focusIdx) paginate(t);
  }));
  root.querySelectorAll('.trophy').forEach((t) => t.addEventListener('click', () => unlogSet(x, x.sets[Number(t.dataset.si)])));
  $('#set-pips', root)?.addEventListener('click', (e) => {
    const pip = e.target.closest('.pip.skip');
    if (!pip) return;
    x.sets[Number(pip.dataset.si)].skipped = false;
    store.saveDraft(store.draft);
    haptic(6);
    render(root);
    renderDock();
  });
  $('#warn-dismiss', root)?.addEventListener('click', () => {
    const s = [...x.sets].reverse().find((q) => q.done && q.warn && !q.warnDismissed);
    if (s) { s.warnDismissed = true; store.saveDraft(store.draft); render(root); }
  });
  if (curIdx !== -1) {
    const cur = x.sets[curIdx];
    $('#g-w', root).addEventListener('click', () => editValue(x, cur, curIdx, 'weight'));
    $('#g-r', root).addEventListener('click', () => editValue(x, cur, curIdx, 'reps'));
    $('#g-log', root).addEventListener('click', () => {
      if (cur.weight == null) return editValue(x, cur, curIdx, 'weight');
      logSet(x, cur, U);
    });
    $('#g-skip', root)?.addEventListener('click', () => {
      cur.skipped = true;
      store.saveDraft(store.draft);
      haptic(6);
      sfx('tap');
      render(root);
      renderDock();
    });
  }
}

// ——— Set actions ———

function editValue(x, s, si, field) {
  const isW = field === 'weight';
  numpadSheet({
    title: `${x.name} — set ${si + 1}`,
    sub: isW ? `weight / target ${x.repMin === x.repMax ? x.repMin : `${x.repMin}–${x.repMax}`}` : (x.repUnit === 'sec' ? 'seconds' : 'reps'),
    value: isW ? s.weight ?? 0 : s.reps,
    unit: isW ? 'lb' : (x.repUnit === 'sec' ? 's' : ''),
    step: isW ? x.inc : 1,
    decimals: isW,
    max: isW ? 2000 : 999,
    onConfirm(v) {
      if (isW) { for (let j = si; j < x.sets.length; j++) if (!x.sets[j].done) x.sets[j].weight = v; }
      else s.reps = Math.round(v);
      store.saveDraft(store.draft);
      render(root);
    },
  });
}

function draftBest(exId) {
  let best = 0;
  for (const x of store.draft.exercises) {
    if (x.id !== exId) continue;
    for (const s of x.sets) if (s.done && s.reps >= 1 && s.weight > best) best = s.weight;
  }
  return best;
}

function logSet(x, s, U) {
  const now = Date.now();
  if (now - lastLogAt < 400) return; // double-tap = one set
  lastLogAt = now;
  const bestBefore = Math.max(engine.allTimeBest(store.history, x.id)?.weight ?? 0, draftBest(x.id));
  s.done = true;
  s.at = Date.now();
  const warnings = engine.validateSet(store.plan, store.history, x.id, s.weight ?? 0, s.reps);
  s.warn = warnings.length ? warnings.map((w) => w.msg).join(' — ') : null;
  s.warnDismissed = false;
  s.pr = !warnings.length && !x.adhoc && s.reps >= 1 && bestBefore > 0 && (s.weight ?? 0) > bestBefore;
  s.repPr = !s.pr && !warnings.length && !x.adhoc && engine.isRepPR(store.history, x.id, s.weight ?? 0, s.reps);
  if (s.repPr) s.pr = true; // rep PRs at a held weight count as records too
  store.saveDraft(store.draft);
  haptic(s.pr ? [15, 40, 25] : 12);
  sfx(s.pr ? 'pr' : 'log');

  const finishedObjective = x.sets.every((q) => q.done || q.skipped);
  render(root);
  const anchor = root.querySelector('.console, .obj-done');
  if (anchor) {
    const r = anchor.getBoundingClientRect();
    // scroll only if the console left the viewport — never yank a stable page
    if (r.top < 0 || r.bottom > window.innerHeight - 140) anchor.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  const consoleEl = document.getElementById('console');
  consoleEl?.classList.add('struck');
  burstAt(consoleEl?.querySelector('.g-log') ?? root.querySelector('.obj-done'), { pr: s.pr });

  if (s.pr) {
    prOverlay(U.copy.pr, s.repPr ? `${fmtW(s.weight)}×${s.reps}` : `${fmtW(s.weight)} lb`);
    // the whole world reacts: scene sprites surge, panels shake (CSS per universe)
    document.documentElement.classList.add('pr-moment');
    setTimeout(() => document.documentElement.classList.remove('pr-moment'), 3000);
  }

  const remaining = store.draft.exercises.reduce((n, ex) => n + ex.sets.filter((q) => !q.done && !q.skipped).length, 0);
  if (store.settings.restTimer && remaining > 0) showRestTimer(x.rest, document.getElementById('dock'), U.copy.rest);
  if (finishedObjective && remaining > 0) {
    if (!s.pr) sfx('objDone');
    flashCard(`${U.copy.objDone}!`, x.name, () => { focusIdx = defaultFocus(store.draft); render(root); });
  }
  renderDock();
}

function unlogSet(x, s) {
  s.done = false; s.pr = false; s.repPr = false; s.warn = null;
  store.saveDraft(store.draft);
  toast('Took it back');
  haptic(8);
  sfx('tap');
  render(root);
  renderDock();
}

// ——— Sheets ———

export function howtoSheet(exId) {
  const meta = store.plan?.exercises[exId];
  const name = meta?.name ?? store.draft?.exercises.find((x) => x.id === exId)?.name ?? exId;
  openSheet(`
    <h2>${esc(name)}</h2>
    ${meta?.howto
      ? `<div class="howto">${meta.howto.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`
      : `<div class="howto"><p>No field guide for this one.</p></div>`}
    <button class="btn quiet" id="ht-close" style="margin-top:12px">Close</button>`, {
    onOpen(sheet, close) { $('#ht-close', sheet).addEventListener('click', close); },
  });
}

function briefingSheet() {
  const d = store.draft;
  openSheet(`
    <h2>Tonight’s program</h2>
    <div class="sub">${d.exercises.length} acts tonight</div>
    <div class="opt-list">
      ${d.exercises.map((e, i) => {
        const dn = e.sets.filter((s) => s.done).length;
        return `<button class="opt ${i === focusIdx ? 'selected' : ''}" data-oi="${i}">${esc(e.name)}<span class="hint num">${dn}/${e.sets.length}</span></button>`;
      }).join('')}
    </div>
    <button class="btn quiet" id="brief-add" style="margin-top:8px">+ Sneak one in</button>`, {
    onOpen(sheet, close) {
      sheet.addEventListener('click', (e) => {
        const opt = e.target.closest('.opt');
        if (opt) { close(); const t = Number(opt.dataset.oi); navDir = t >= focusIdx ? 'next' : 'prev'; focusIdx = t; render(root); }
      });
      $('#brief-add', sheet).addEventListener('click', () => { close(); addExerciseSheet(); });
    },
  });
}

function switchSheet() {
  const nextType = engine.rotationNext(store.plan, store.history);
  const dirty = store.draft?.exercises.some((x) => x.sets.some((s) => s.done));
  const lastByType = {};
  for (const e of store.history) lastByType[e.session_type] = e.date;
  optionSheet({
    title: 'Pick a universe',
    options: store.plan.rotation.map((t) => ({
      label: `${store.plan.sessions[t].name} — ${UNIVERSES[t].name}`,
      hint: t === nextType ? 'Next up' : lastByType[t] ? `Last ${fmtDate(lastByType[t])}` : '',
      selected: t === store.draft?.session_type,
      value: t,
    })),
    onPick(opt) {
      if (opt.value === store.draft?.session_type) return;
      if (dirty) {
        confirmSheet({
          title: 'Leave this universe?',
          body: `Switching to ${esc(store.plan.sessions[opt.value].name)} drops tonight’s logged sets.`,
          confirmLabel: 'Switch', danger: true,
          onConfirm: () => switchSession(opt.value),
        });
      } else switchSession(opt.value);
    },
  });
}

function bodyweightSheet() {
  const last = [...store.history].reverse().find((e) => e.bodyweight)?.bodyweight;
  numpadSheet({
    title: 'Bodyweight',
    sub: last ? `Optional — weigh 1–2× a week, same conditions · last ${fmtW(last)} lb` : 'Optional — weigh 1–2× a week, same conditions',
    value: store.draft.bodyweight ?? last ?? 215,
    unit: 'lb', step: 0.5, decimals: true, max: 400,
    onConfirm(v) { store.draft.bodyweight = v || null; store.saveDraft(store.draft); render(root); },
  });
}

function notesSheet() {
  openSheet(`
    <h2>Field notes</h2>
    <div class="card"><div class="field"><textarea id="notes-in" placeholder="Notes">${esc(store.draft.notes)}</textarea></div></div>
    <button class="btn primary" id="notes-save">Save</button>`, {
    onOpen(sheet, close) {
      $('#notes-save', sheet).addEventListener('click', () => {
        store.draft.notes = $('#notes-in', sheet).value.trim();
        store.saveDraft(store.draft);
        close(); render(root);
      });
    },
  });
}

function addExerciseSheet() {
  let sets = 3;
  openSheet(`
    <h2>Sneak one in</h2>
    <div class="sub">Tonight only</div>
    <div class="card">
      <div class="field"><label>Name</label><input id="ax-name" placeholder="e.g. Preacher Curl"></div>
      <div class="field"><label>Sets</label>
        <div style="display:flex;align-items:center;gap:16px">
          <button class="np-step" id="ax-minus">−</button>
          <span class="num" id="ax-sets" style="font-size:22px;min-width:28px;text-align:center">3</span>
          <button class="np-step" id="ax-plus">+</button>
        </div>
      </div>
    </div>
    <button class="btn primary" id="ax-add">Add</button>`, {
    onOpen(sheet, close) {
      $('#ax-minus', sheet).addEventListener('click', () => { sets = Math.max(1, sets - 1); $('#ax-sets', sheet).textContent = sets; });
      $('#ax-plus', sheet).addEventListener('click', () => { sets = Math.min(6, sets + 1); $('#ax-sets', sheet).textContent = sets; });
      $('#ax-add', sheet).addEventListener('click', () => {
        const name = $('#ax-name', sheet).value.trim();
        if (!name) return toast('Give it a name', 'bad');
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        store.draft.exercises.push({
          id, name, adhoc: true, repMin: 8, repMax: 12, rest: 90,
          basis: 'seed', prevTop: null, note: null, bump: 0, stalled: false, inc: 5, prev: null,
          sets: Array.from({ length: sets }, () => ({ weight: null, reps: 10, done: false })),
        });
        store.saveDraft(store.draft);
        close();
        focusIdx = store.draft.exercises.length - 1;
        render(root);
      });
    },
  });
}

// ——— Dock ———

export function renderDock() {
  const dock = document.getElementById('dock');
  let bar = document.getElementById('finish-bar');
  const d = store.draft;
  const done = d?.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0) ?? 0;
  const total = d?.exercises.reduce((n, x) => n + x.sets.filter((s) => !s.skipped).length, 0) ?? 0;
  if (!d || done === 0 || !store.plan) { bar?.remove(); return; }
  const U = universeOf(d.session_type);
  const pct = Math.max(2.5, (done / Math.max(1, total)) * 100).toFixed(1);
  if (bar) {
    // update in place so the fill visibly glides — rebuilding the node
    // every set killed the width transition
    bar.querySelector('.xp-head .num').textContent = `${done}/${total}`;
    bar.querySelector('.xp-track i').style.width = `${pct}%`;
    bar.querySelector('#finish-btn').textContent = U.copy.finish;
    return;
  }
  bar = document.createElement('div');
  bar.id = 'finish-bar';
  bar.className = 'finish-bar';
  dock.appendChild(bar);
  bar.innerHTML = `
    <span class="xp">
      <span class="xp-head"><span>Tonight</span><span class="num">${done}/${total}</span></span>
      <span class="xp-track"><i style="width:${pct}%"></i></span>
    </span>
    <button class="btn primary" id="finish-btn">${esc(U.copy.finish)}</button>`;
  bar.querySelector('#finish-btn').addEventListener('click', () => {
    const dn = store.draft?.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0) ?? 0;
    const tt = store.draft?.exercises.reduce((n, x) => n + x.sets.filter((s) => !s.skipped).length, 0) ?? 0;
    if (dn < tt) {
      confirmSheet({
        title: `Finish with ${dn} of ${tt} sets?`,
        body: 'Unlogged sets are dropped from the record.',
        confirmLabel: U.copy.finish,
        onConfirm: finishSession,
      });
    } else finishSession();
  });
}

export function clearDock() {
  document.getElementById('finish-bar')?.remove();
}

function finishSession() {
  const d = store.draft;
  const U = universeOf(d.session_type);
  const W = worldDef(d.session_type, d.world);
  const exercises = d.exercises
    .map((x) => ({ id: x.id, name: x.name, sets: x.sets.filter((s) => s.done).map((s) => ({ weight: s.weight ?? 0, reps: s.reps, ...(s.at ? { at: s.at } : {}) })) }))
    .filter((x) => x.sets.length);
  if (!exercises.length) return toast('Nothing logged yet', 'bad');

  const ats = exercises.flatMap((x) => x.sets.map((q) => q.at).filter(Boolean));
  const mins = ats.length > 1 ? Math.max(1, Math.round((Math.max(...ats) - Math.min(...ats)) / 60000)) : null;
  const stats = {
    mins,
    sets: exercises.reduce((n, x) => n + x.sets.length, 0),
    tonnage: Math.round(exercises.reduce((n, x) => n + x.sets.reduce((m, s) => m + s.weight * s.reps, 0), 0)),
    prs: d.exercises.reduce((n, x) => n + x.sets.filter((s) => s.pr).length, 0),
    acts: exercises.length,
    title: U.copy.results,
    world: W ? `${W.name} · ${U.name}` : U.name,
  };

  const entry = { date: d.date, session_type: d.session_type, phase: d.phase, week: d.week, exercises };
  if (d.world) entry.world = d.world;
  if (d.bodyweight) entry.bodyweight = d.bodyweight;
  if (d.notes) entry.notes = d.notes;

  store.clearDraft();
  store.upsertEntry(entry);
  clearDock();
  hideRestTimer();
  haptic([10, 60, 20, 60, 30]);
  sfx('finish');
  flushQueue();
  showResults(stats);
}

function showResults(stats) {
  document.querySelector('.results')?.remove();
  const el = document.createElement('div');
  el.className = 'results';
  el.innerHTML = `
    <div class="rs-card">
      <div class="rs-k">${esc(stats.world)}</div>
      <div class="rs-n">${esc(stats.title)}</div>
      <div class="rs-grid">
        <div class="rs-stat"><b class="num">${stats.sets}</b><i>${stats.sets === 1 ? 'set' : 'sets'}</i></div>
        <div class="rs-stat"><b class="num">${stats.tonnage.toLocaleString()}</b><i>lb moved</i></div>
        <div class="rs-stat"><b class="num">${stats.mins ?? stats.acts}</b><i>${stats.mins ? 'minutes' : stats.acts === 1 ? 'act' : 'acts'}</i></div>
        <div class="rs-stat ${stats.prs ? 'pr' : ''}"><b class="num">${stats.prs}</b><i>${stats.prs === 1 ? 'record' : 'records'}</i></div>
      </div>
      <button class="btn primary" id="rs-go">Take a bow</button>
      <div class="rs-sync">${navigator.onLine && store.settings.token ? 'Uploading to GitHub' : 'Saved offline — syncs later'}</div>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#rs-go').addEventListener('click', () => {
    el.remove();
    focusIdx = null;
    render(root);
    renderDock();
  });
}

// Today — the log screen. Opens straight into the next session in rotation,
// pre-filled from last time + the progression engine. Logging a set is one tap
// on the check (two with an adjustment). Everything lands in the draft first.
import { $, esc, fmtW, todayStr, fmtDate, haptic, ICONS } from '../util.js';
import { store } from '../store.js';
import * as engine from '../engine.js';
import { flushQueue, checkConnection, pullRemote, importSeedBundle } from '../github.js';
import { numpadSheet, optionSheet, confirmSheet, openSheet, toast, countUp, showRestTimer, hideRestTimer } from '../components.js';
import { setAccent, THEMES } from '../theme.js';

let root = null;
const counted = new Set(); // sessions whose suggestion count-ups already played

export function render(el) {
  root = el;
  if (!store.plan) { setAccent(null); return renderSetup(); }
  const today = todayStr();
  const phaseInfo = engine.phaseForDate(store.plan, today, store.settings.phaseOverride);
  ensureDraft(today, phaseInfo);
  setAccent(store.draft.session_type);
  renderSession(store.draft, phaseInfo);
  renderDock();
}

// ——— First run ———

function renderSetup() {
  root.onclick = null;
  root.innerHTML = `
    <div class="setup-hero">
      <div class="mark">
        <svg viewBox="0 0 58 58" fill="none">
          <circle cx="29" cy="29" r="26" stroke="var(--line-strong)" stroke-width="2"/>
          <path d="M29 3 a26 26 0 0 1 22.5 13" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
          <path d="M17 29h4M37 29h4M21.5 24v10M36.5 24v10M25.5 29h7" stroke="var(--text)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h1>Protocol</h1>
      <p>Training data syncs to the workout-tracker repo on GitHub. Add a token once. After that the app opens into today’s session.</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:18px 6px">
      <button class="btn primary" id="su-connect">Connect GitHub</button>
      <button class="btn quiet" id="su-import">Import seed bundle</button>
      <input type="file" id="su-file" accept=".json,application/json" hidden>
    </div>`;
  $('#su-connect', root).addEventListener('click', () => connectSheet());
  $('#su-import', root).addEventListener('click', () => $('#su-file', root).click());
  $('#su-file', root).addEventListener('change', handleSeedFile);
}

export function connectSheet() {
  const s = store.settings;
  openSheet(`
    <div class="grab"></div>
    <h2>Connect GitHub</h2>
    <div class="sub">fine-grained PAT · contents read/write</div>
    <div class="card" style="margin:4px 0 12px">
      <div class="field"><label>Repository</label><input id="c-repo" value="${esc(s.owner)}/${esc(s.repo)}" autocapitalize="off" autocorrect="off"></div>
      <div class="field"><label>Token</label><input id="c-token" type="password" value="${esc(s.token)}" placeholder="github_pat_…" autocapitalize="off"></div>
    </div>
    <button class="btn primary" id="c-save">Connect &amp; pull</button>`, {
    onOpen(sheet, close) {
      $('#c-save', sheet).addEventListener('click', async () => {
        const [owner, repo] = $('#c-repo', sheet).value.trim().split('/');
        const token = $('#c-token', sheet).value.trim();
        if (!owner || !repo || !token) return toast('Fill in repo and token', 'warn');
        store.saveSettings({ owner, repo, token });
        const btn = $('#c-save', sheet);
        btn.textContent = 'Connecting…';
        btn.disabled = true;
        try {
          await checkConnection();
          close();
          toast('Connected');
          await pullRemote();
          await flushQueue();
          toast(store.plan ? 'Plan loaded' : 'No plan in the repo yet. Import the seed bundle.', store.plan ? 'ok' : 'warn', 3200);
        } catch (err) {
          btn.textContent = 'Connect & pull';
          btn.disabled = false;
          toast(err.message, 'bad', 4000);
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
  let d = store.draft;
  const dirty = d?.exercises?.some((x) => x.sets.some((s) => s.done));
  if (d && (d.date === today || dirty)) return d.session_type;
  const type = engine.rotationNext(store.plan, store.history);
  store.saveDraft(buildDraft(today, type, phaseInfo));
  return type;
}

function buildDraft(date, sessionType, phaseInfo) {
  const session = store.plan.sessions[sessionType];
  const exercises = session.exercises.map((slot) => {
    const rx = engine.prescribe(store.plan, store.history, sessionType, slot, phaseInfo);
    return {
      id: slot.id,
      name: engine.exMeta(store.plan, slot.id).name,
      repMin: slot.repMin,
      repMax: slot.repMax,
      repUnit: slot.repUnit || null,
      rest: slot.rest || 90,
      basis: rx.basis,
      prevTop: rx.prevTop,
      note: rx.note || null,
      bump: rx.increment || 0,
      stalled: engine.isStalled(store.plan, store.history, sessionType, slot),
      inc: engine.increment(store.plan, slot.id) || 2.5,
      sets: rx.sets.map((s) => ({ weight: s.weight, reps: s.reps, done: false })),
    };
  });
  return {
    date, session_type: sessionType,
    phase: phaseInfo.phase?.id ?? null, week: phaseInfo.week,
    bodyweight: null, notes: '', exercises,
  };
}

function switchSession(type) {
  const today = todayStr();
  const phaseInfo = engine.phaseForDate(store.plan, today, store.settings.phaseOverride);
  hideRestTimer();
  store.saveDraft(buildDraft(today, type, phaseInfo));
  render(root);
}

// ——— Rendering ———

const BASIS_LABEL = {
  progress: (x) => `<span class="num prev">${fmtW(x.prevTop)}</span> <span class="up">→ <span class="num count-to" data-from="${x.prevTop}" data-to="${x.prevTop + x.bump}">${fmtW(x.prevTop + x.bump)}</span> lb</span>`,
  repeat: (x) => `last <span class="num">${fmtW(x.prevTop)}</span> lb`,
  hold: (x) => `hold <span class="num">${fmtW(x.prevTop)}</span> lb`,
  seed: () => `seed`,
  calibration: (x) => `seed <span class="num">${fmtW(x.prevTop)}</span> at 90%`,
  deload: (x) => `80% of <span class="num">${fmtW(x.prevTop)}</span>`,
  verify: (x) => esc(x.note || 'verify weight'),
  bodyweight: () => `bodyweight`,
};

function renderSession(draft, phaseInfo) {
  const plan = store.plan;
  const session = plan.sessions[draft.session_type];
  const isNext = engine.rotationNext(plan, store.history) === draft.session_type;
  const phase = phaseInfo.phase;
  const doneCount = draft.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0);
  let nextMarked = false;

  const theme = THEMES[draft.session_type];
  root.innerHTML = `
    <div class="session-head">
      <div class="eyebrow">${fmtDate(draft.date)}${theme ? ` · ${theme.world}` : ''}${isNext ? '' : ' · out of rotation'}</div>
      <h1><span class="session-title">${esc(session.name)}</span>
        <button class="session-switch" id="switch-session">switch</button>
      </h1>
      <div class="session-meta">
        <button class="meta-chip" id="chip-bw"><span class="k">BW</span> <span class="num">${draft.bodyweight ? fmtW(draft.bodyweight) : '—'}</span></button>
        <button class="meta-chip" id="chip-notes">${draft.notes ? 'Edit note' : 'Add note'}</button>
      </div>
    </div>
    ${phase?.type === 'deload' ? `<div class="deload-note">Deload week: 80% load, 60% sets, 4+ RIR.</div>` : ''}
    ${phase?.type === 'calibration' ? `<div class="deload-note">Calibration week: seeds run at 90%.</div>` : ''}
    ${draft.exercises.map((x, xi) => {
      const sub = BASIS_LABEL[x.basis]?.(x) ?? '';
      return `
      <div class="card ex-card" data-xi="${xi}">
        <div class="ex-head">
          <button class="ex-info" data-ex="${esc(x.id)}">
            <span class="ex-name">${esc(x.name)}</span><span class="info-glyph">?</span>
            <span class="ex-flags">
              ${x.stalled ? '<span class="flag stall">stall</span>' : ''}
              ${x.basis === 'verify' ? '<span class="flag verify">verify</span>' : ''}
            </span>
          </button>
          <span class="ex-target">${x.sets.length} × ${x.repMin === x.repMax ? x.repMin : `${x.repMin}–${x.repMax}`}${x.repUnit === 'sec' ? 's' : ''}</span>
        </div>
        <div class="ex-sub"><span class="sug">${sub}</span></div>
        <div class="set-rows">
          ${x.sets.map((s, si) => {
            const next = !nextMarked && !s.done ? (nextMarked = true, ' next') : '';
            return `
            <div class="set-row ${s.done ? 'done' : 'pending'}${next}" data-xi="${xi}" data-si="${si}">
              <span class="idx">${si + 1}</span>
              <span class="set-vals">
                <button class="val-btn num w ${s.weight == null ? 'unset' : ''}" data-f="weight">${s.weight == null ? '—' : fmtW(s.weight)}<span class="unit">lb</span></button>
                <span class="set-x">×</span>
                <button class="val-btn num reps" data-f="reps">${s.reps}${x.repUnit === 'sec' ? '<span class="unit">s</span>' : ''}</button>
                ${s.pr ? '<span class="pr-badge">PR</span>' : ''}
              </span>
              <button class="check" aria-label="Log set">${ICONS.check}</button>
              ${s.warn && !s.warnDismissed ? warnChip(s.warn) : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}
    <button class="add-row" id="add-ex">${ICONS.plus} Add exercise</button>`;

  // Count-up the progression suggestions on first sight of a session only
  const countKey = `${draft.date}|${draft.session_type}`;
  if (!counted.has(countKey)) {
    counted.add(countKey);
    root.querySelectorAll('.count-to').forEach((el) => {
      countUp(el, Number(el.dataset.from), Number(el.dataset.to), 500);
    });
  }

  $('#switch-session', root).addEventListener('click', sessionSwitchSheet);
  $('#chip-bw', root).addEventListener('click', bodyweightSheet);
  $('#chip-notes', root).addEventListener('click', notesSheet);
  $('#add-ex', root).addEventListener('click', addExerciseSheet);
  root.onclick = onRowTap; // assignment, not addEventListener: root persists across renders
}

function warnChip(warn) {
  return `<div class="warn-chip"><b>Check</b> ${esc(warn)}<button class="dismiss" data-act="dismiss">✕</button></div>`;
}

// ——— Interactions ———

function onRowTap(e) {
  const info = e.target.closest('.ex-info');
  if (info) return howtoSheet(info.dataset.ex);
  const row = e.target.closest('.set-row');
  if (!row) return;
  const xi = Number(row.dataset.xi);
  const si = Number(row.dataset.si);
  const x = store.draft?.exercises[xi];
  const s = x?.sets[si];
  if (!s) return render(root); // stale DOM after an external draft rebuild

  if (e.target.closest('[data-act="dismiss"]')) {
    s.warnDismissed = true;
    store.saveDraft(store.draft);
    row.querySelector('.warn-chip')?.remove();
    return;
  }

  const valBtn = e.target.closest('.val-btn');
  if (valBtn) return editValue(x, s, xi, si, valBtn.dataset.f);

  if (e.target.closest('.check')) {
    if (s.done) return unlogSet(x, s);
    if (s.weight == null && x.basis === 'verify') return editValue(x, s, xi, si, 'weight');
    return logSet(x, s, row);
  }
}

function editValue(x, s, xi, si, field) {
  const isW = field === 'weight';
  numpadSheet({
    title: `${x.name} — set ${si + 1}`,
    sub: isW ? `weight · ${x.repMin === x.repMax ? x.repMin : `${x.repMin}–${x.repMax}`} rep target` : x.repUnit === 'sec' ? 'seconds' : 'reps',
    value: isW ? s.weight ?? 0 : s.reps,
    unit: isW ? 'lb' : x.repUnit === 'sec' ? 's' : '',
    step: isW ? x.inc : 1,
    decimals: isW,
    max: isW ? 2000 : 999,
    onConfirm(v) {
      if (isW) {
        // Weight edits ripple forward through this exercise's pending sets —
        // in a gym that is almost always what you meant.
        for (let j = si; j < x.sets.length; j++) {
          if (!x.sets[j].done) x.sets[j].weight = v;
        }
      } else {
        s.reps = Math.round(v);
      }
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

function logSet(x, s, row) {
  const bestBefore = Math.max(engine.allTimeBest(store.history, x.id)?.weight ?? 0, draftBest(x.id));
  s.done = true;
  s.at = Date.now();

  const warnings = engine.validateSet(store.plan, store.history, x.id, s.weight ?? 0, s.reps);
  s.warn = warnings.length ? warnings.map((w) => w.msg).join(' · ') : null;
  s.warnDismissed = false;
  s.pr = !x.adhoc && s.reps >= 1 && bestBefore > 0 && (s.weight ?? 0) > bestBefore;

  store.saveDraft(store.draft);
  haptic(s.pr ? [15, 40, 25] : 12);
  render(root);
  const fresh = root.querySelector(`.set-row[data-xi="${row.dataset.xi}"][data-si="${row.dataset.si}"]`);
  fresh?.classList.add('just-done');

  const remaining = store.draft.exercises.reduce((n, ex) => n + ex.sets.filter((q) => !q.done).length, 0);
  if (store.settings.restTimer && remaining > 0) showRestTimer(x.rest, document.getElementById('dock'));
  renderDock();
}

function unlogSet(x, s) {
  s.done = false;
  s.pr = false;
  s.warn = null;
  store.saveDraft(store.draft);
  haptic(8);
  render(root);
  renderDock();
}

// ——— Sheets ———

export function howtoSheet(exId) {
  const meta = store.plan?.exercises[exId];
  const name = meta?.name ?? store.draft?.exercises.find((x) => x.id === exId)?.name ?? exId;
  const slots = [];
  for (const [type, s] of Object.entries(store.plan?.sessions ?? {})) {
    for (const slot of s.exercises) {
      if (slot.id === exId) slots.push(`${s.name}: ${slot.sets} × ${slot.repMin === slot.repMax ? slot.repMin : `${slot.repMin}–${slot.repMax}`}${slot.repUnit === 'sec' ? 's' : ''}`);
    }
  }
  openSheet(`
    <div class="grab"></div>
    <h2>${esc(name)}</h2>
    ${slots.length ? `<div class="sub">${esc(slots.join(' · '))}</div>` : ''}
    ${meta?.howto
      ? `<div class="howto">${meta.howto.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`
      : `<div class="howto"><p>No guide for this exercise.</p></div>`}
    <button class="btn quiet" id="ht-close" style="margin-top:14px">Close</button>`, {
    onOpen(sheet, close) {
      $('#ht-close', sheet).addEventListener('click', close);
    },
  });
}

function sessionSwitchSheet() {
  const nextType = engine.rotationNext(store.plan, store.history);
  const dirty = store.draft?.exercises.some((x) => x.sets.some((s) => s.done));
  const lastByType = {};
  for (const e of store.history) lastByType[e.session_type] = e.date;
  optionSheet({
    title: 'Session',
    options: store.plan.rotation.map((t) => ({
      label: `${store.plan.sessions[t].name} · ${THEMES[t]?.world ?? ''}`,
      hint: t === nextType ? 'next' : lastByType[t] ? `last ${fmtDate(lastByType[t])}` : '',
      selected: t === store.draft?.session_type,
      value: t,
    })),
    onPick(opt) {
      if (opt.value === store.draft?.session_type) return;
      if (dirty) {
        confirmSheet({
          title: 'Discard logged sets?',
          body: `Switching to ${esc(store.plan.sessions[opt.value].name)} clears today’s logged sets.`,
          confirmLabel: 'Switch session',
          danger: true,
          onConfirm: () => switchSession(opt.value),
        });
      } else {
        switchSession(opt.value);
      }
    },
  });
}

function bodyweightSheet() {
  const last = [...store.history].reverse().find((e) => e.bodyweight)?.bodyweight;
  numpadSheet({
    title: 'Bodyweight',
    sub: last ? `last recorded ${fmtW(last)} lb` : '',
    value: store.draft.bodyweight ?? last ?? 215,
    unit: 'lb', step: 0.5, decimals: true, max: 400,
    onConfirm(v) {
      store.draft.bodyweight = v || null;
      store.saveDraft(store.draft);
      render(root);
    },
  });
}

function notesSheet() {
  openSheet(`
    <div class="grab"></div>
    <h2>Session notes</h2>
    <div class="card" style="margin:10px 0 12px">
      <div class="field"><textarea id="notes-in" placeholder="Notes">${esc(store.draft.notes)}</textarea></div>
    </div>
    <button class="btn primary" id="notes-save">Save</button>`, {
    onOpen(sheet, close) {
      $('#notes-save', sheet).addEventListener('click', () => {
        store.draft.notes = $('#notes-in', sheet).value.trim();
        store.saveDraft(store.draft);
        close();
        render(root);
      });
    },
  });
}

function addExerciseSheet() {
  let sets = 3;
  openSheet(`
    <div class="grab"></div>
    <h2>Add exercise</h2>
    <div class="sub">this session only</div>
    <div class="card" style="margin:4px 0 12px">
      <div class="field"><label>Name</label><input id="ax-name" placeholder="e.g. Preacher Curl"></div>
      <div class="field"><label>Sets</label>
        <div style="display:flex;align-items:center;gap:16px">
          <button class="np-step" style="width:44px;height:44px" id="ax-minus">−</button>
          <span class="num" id="ax-sets" style="font-size:22px;min-width:28px;text-align:center">3</span>
          <button class="np-step" style="width:44px;height:44px" id="ax-plus">+</button>
        </div>
      </div>
    </div>
    <button class="btn primary" id="ax-add">Add</button>`, {
    onOpen(sheet, close) {
      $('#ax-minus', sheet).addEventListener('click', () => { sets = Math.max(1, sets - 1); $('#ax-sets', sheet).textContent = sets; });
      $('#ax-plus', sheet).addEventListener('click', () => { sets = Math.min(6, sets + 1); $('#ax-sets', sheet).textContent = sets; });
      $('#ax-add', sheet).addEventListener('click', () => {
        const name = $('#ax-name', sheet).value.trim();
        if (!name) return toast('Give it a name', 'warn');
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        store.draft.exercises.push({
          id, name, adhoc: true, repMin: 8, repMax: 12, rest: 90,
          basis: 'seed', prevTop: null, note: null, bump: 0, stalled: false, inc: 5,
          sets: Array.from({ length: sets }, () => ({ weight: null, reps: 10, done: false })),
        });
        store.saveDraft(store.draft);
        close();
        render(root);
      });
    },
  });
}

// ——— Finish bar ———

export function renderDock() {
  const dock = document.getElementById('dock');
  let bar = document.getElementById('finish-bar');
  const draft = store.draft;
  const done = draft?.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0) ?? 0;
  const total = draft?.exercises.reduce((n, x) => n + x.sets.length, 0) ?? 0;

  if (!draft || done === 0) { bar?.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'finish-bar';
    bar.className = 'finish-bar';
    dock.appendChild(bar);
  }
  bar.innerHTML = `
    <span class="prog num"><b>${done}</b> / ${total} sets</span>
    <button class="btn primary" id="finish-btn">Finish</button>`;
  bar.querySelector('#finish-btn').addEventListener('click', () => {
    if (done < total) {
      confirmSheet({
        title: `Finish with ${done} of ${total} sets?`,
        body: 'Unlogged sets are dropped from the record.',
        confirmLabel: 'Finish session',
        onConfirm: finishSession,
      });
    } else {
      finishSession();
    }
  });
}

// Leaving the Today tab hides the finish bar but not the rest timer —
// checking history mid-rest must not cancel the countdown.
export function clearDock() {
  document.getElementById('finish-bar')?.remove();
}

function finishSession() {
  const d = store.draft;
  const exercises = d.exercises
    .map((x) => ({ id: x.id, name: x.name, sets: x.sets.filter((s) => s.done).map((s) => ({ weight: s.weight ?? 0, reps: s.reps })) }))
    .filter((x) => x.sets.length);
  if (!exercises.length) return toast('Nothing logged yet', 'warn');

  const entry = {
    date: d.date,
    session_type: d.session_type,
    phase: d.phase,
    week: d.week,
    exercises,
  };
  if (d.bodyweight) entry.bodyweight = d.bodyweight;
  if (d.notes) entry.notes = d.notes;

  store.upsertEntry(entry);
  store.clearDraft();
  clearDock();
  hideRestTimer();
  haptic([10, 50, 20]);
  toast(navigator.onLine && store.settings.token ? 'Saved, syncing' : 'Saved offline');
  flushQueue();
  render(root);
}

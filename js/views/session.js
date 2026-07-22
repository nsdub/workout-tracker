// LIFT — one objective at a time inside its world. Giant numbers, one giant
// world-verb button, trophies for banked sets. Backend logic untouched.
import { $, esc, fmtW, todayStr, fmtDate, haptic, sessionMins, weekKey, fmtSetLine } from '../util.js';
import { store } from '../store.js';
import * as engine from '../engine.js';
import { flushQueue, checkConnection, pullRemote, importSeedBundle } from '../github.js';
import { numpadSheet, optionSheet, confirmSheet, openSheet, toast, showRestTimer, hideRestTimer, burstAt, flashCard, prOverlay, ICONS } from '../components.js';
import { UNIVERSES, applyWorld, universeOf, worldDef, pickWorld, returnWorld, NEUTRAL_COPY } from '../worlds.js';
import { sfx } from '../audio.js';
import { BASIS, previewSheet } from './preview.js';

let root = null;
let focusIdx = null;
let lastLogAt = 0;
let freshEdit = null;      // { field, at } — numpad confirm replays val-pop on the card
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
  // Tonight is already in the books and nothing is in progress: the night is
  // BANKED. No auto-built tomorrow-dated-today draft, no burned world draw.
  if (!store.draft) return renderBanked(today, phaseInfo);
  if (!store.draft.world) { // drafts from before the universes knew about worlds
    store.draft.world = pickWorld(store.draft.session_type);
    store.saveDraft(store.draft);
  }
  applyWorld(store.draft.session_type, store.draft.world);
  // Don't burn the world reveal under the results overlay: a quiet re-render
  // mid-ceremony (sync emit) leaves the flag set for the take-a-bow re-render.
  if (announceWorld && !document.querySelector('.results')) {
    announceWorld = false;
    const U = universeOf(store.draft.session_type);
    const W = worldDef(store.draft.session_type, store.draft.world);
    if (U && W) setTimeout(() => {
      // Only flash if Tonight is still the tab on stage — a cross-tab reveal
      // over the Atlas is noise, not ceremony.
      if (root?.classList.contains('active')) flashCard(`TONIGHT: ${W.name}`, U.name, () => {});
    }, 350);
  }
  if (store.draft.date !== today && !resumeAsked && !store.draft.reopened) {
    resumeAsked = true;
    setTimeout(() => confirmSheet({
      title: `Finish ${fmtDate(store.draft.date)}, or start fresh?`,
      body: 'You have logged sets from a previous day. "Never mind" keeps finishing that night.',
      confirmLabel: 'Start tonight fresh',
      danger: true,
      onConfirm() { hideRestTimer(); store.clearDraft(); focusIdx = null; render(root); renderDock(); },
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

// consecutive training days ending yesterday (tonight isn't banked yet).
// todayStr formats in LOCAL time — toISOString would walk UTC dates and
// miscount the streak for any evening lifter west of Greenwich.
function trainStreak(history, today) {
  const days = new Set(history.map((e) => e.date));
  const d = new Date(today + 'T12:00:00');
  let n = 0;
  d.setDate(d.getDate() - 1);
  while (days.has(todayStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ——— First run ———

function renderSetup() {
  root.onclick = null;
  // The first screen is a mission poster, not blank paper: Cinzel wordmark,
  // gold underline, two star-with-face crew members from the cosmos.
  const starface = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 1 L18.7 10.4 L28.5 11 L20.9 17.4 L23.4 27 L15 21.6 L6.6 27 L9.1 17.4 L1.5 11 L11.3 10.4 Z" fill="#ffd24a" stroke="#c2822c" stroke-width="1.4"/><circle cx="12" cy="13.4" r="1.5" fill="#2a1a08"/><circle cx="18" cy="13.4" r="1.5" fill="#2a1a08"/><path d="M12.6 17 q2.4 1.8 4.8 0" stroke="#2a1a08" stroke-width="1.2" fill="none"/></svg>`;
  root.innerHTML = `
    <div class="empty"><div class="card-e">
      <div class="su-stars">${starface(30)}${starface(22)}</div>
      <div class="su-poster">PROTOCOL</div>
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
          // A fresh token means the user just FIXED something — flush now,
          // ignoring any backoff window earned by the dead token.
          try { await flushQueue({ force: true }); } catch { await flushQueue(); }
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
  // A reopened night (d.reopened) is an editing session over a BANKED entry:
  // it survives regardless of date or cleanliness — un-logging every set is a
  // legitimate mid-edit state, not abandonment — and it must never refund its
  // world, which came from the entry (already trained), not a fresh draw.
  if (d && (d.date === today || dirty || d.reopened)) {
    // Migration: pre-fix builds auto-drafted the NEXT session dated today the
    // moment tonight was banked. Such a draft — clean, not deliberately
    // started, sitting on top of a banked night — is reclaimed: refund its
    // unseen world and show the banked hero instead. Deliberate double-day
    // drafts carry d.deliberate; reopened drafts carry d.reopened — neither
    // is ever reclaimed.
    if (!dirty && !d.deliberate && !d.reopened && store.history.some((e) => e.date === today && !e.supplemental)) {
      if (d.world) returnWorld(d.session_type, d.world);
      store.clearDraft();
      return null;
    }
    // A fresher trainer review usually lands via sync moments AFTER tonight's
    // draft was built on app open. An untouched draft (no sets logged or
    // skipped, nothing added, no notes) rebuilds its prescriptions under the
    // new review — same world, same start time, nothing burned. The moment
    // the user has touched anything, their night is theirs: no rebuild.
    const touched = dirty
      || d.exercises?.some((x) => x.adhoc || x.logNote || x.sets.some((s) => s.skipped));
    if (d.date === today && !touched && !d.reopened && (d.coachStamp ?? null) !== coachStamp()) {
      const fresh = buildDraft(today, d.session_type, phaseInfo, d.world ?? null);
      fresh.deliberate = d.deliberate;
      fresh.startedAt = d.startedAt ?? fresh.startedAt;
      fresh.bodyweight = d.bodyweight ?? null;
      fresh.notes = d.notes ?? '';
      store.saveDraft(fresh);
      return fresh.session_type;
    }
    return d.session_type;
  }
  // Date rolled over a clean draft: that world was drawn but never trained —
  // put it back on top of the deck before drawing again. (Reopened drafts
  // can't reach here — the branch above keeps them — but the guard stays:
  // their world WAS trained and must never re-enter the pool.)
  if (d?.world && !dirty && !d.reopened) returnWorld(d.session_type, d.world);
  // Tonight already banked and no work in progress: do NOT auto-build the
  // next rotation session dated today — that swapped the world behind the
  // results overlay, burned a pool draw the user never saw, and made the app
  // answer "what do I do today?" with tomorrow's session. The next draft
  // (with its world draw + visible reveal) waits for an explicit start.
  if (store.history.some((e) => e.date === today && !e.supplemental)) {
    if (d) store.clearDraft(); // the stale clean draft's world was refunded above
    return null;
  }
  const type = engine.rotationNext(store.plan, store.history);
  store.saveDraft(buildDraft(today, type, phaseInfo));
  focusIdx = null;
  announceWorld = true;
  return type;
}

// ——— Night banked: tonight is in the books; tomorrow waits ———

function renderBanked(today, phaseInfo) {
  const entry = [...store.history].reverse().find((e) => e.date === today && !e.supplemental);
  const U = universeOf(entry.session_type);
  const W = worldDef(entry.session_type, entry.world ?? null);
  applyWorld(entry.session_type, entry.world ?? null);
  // The conquered world stays on stage; entrance plays once, then holds still.
  const worldKey = `banked:${entry.session_type}:${entry.world ?? ''}`;
  root.classList.toggle('no-entrance', worldKey === lastWorldKey);
  lastWorldKey = worldKey;
  const sessionName = store.plan.sessions[entry.session_type]?.name ?? entry.session_type;
  const nextType = engine.rotationNext(store.plan, store.history);
  const nextName = store.plan.sessions[nextType]?.name ?? nextType;
  root.onclick = null;
  root.innerHTML = `
    <header class="world-head">
      <div class="world-name">${esc(W?.name ?? U?.name ?? sessionName)}</div>
      <div class="mission-line">${esc(U?.name ?? '')} — night ${store.history.length} banked · ${fmtDate(today)}</div>
    </header>
    <section class="objective banked-hero">
      <div class="bk-stamp">Night banked</div>
      <div class="bk-big">${esc(sessionName)} is in the books.</div>
      <div class="bk-next">Next up: <b>${esc(nextName)}</b> — tomorrow.</div>
      <button class="btn quiet" id="bk-start">Start it now anyway</button>
    </section>`;
  $('#bk-start', root).addEventListener('click', () => {
    // Double-days stay possible — but only by explicit request, so the world
    // draw and its TONIGHT reveal happen where the user can actually see them.
    // `deliberate` keeps ensureDraft's banked reclaim off this draft.
    store.saveDraft({ ...buildDraft(today, nextType, phaseInfo), deliberate: true });
    focusIdx = null;
    announceWorld = true;
    render(root);
    renderDock();
  });
  renderDock(); // no draft → the finish bar clears itself
}

// Identity of the trainer review a draft was prescribed under — lets a clean
// draft notice that a fresher review has landed and rebuild itself.
const coachStamp = () => store.coach?.generated_at ?? store.coach?.date ?? null;

function buildDraft(date, sessionType, phaseInfo, world = null) {
  const session = store.plan.sessions[sessionType];
  const exercises = session.exercises.map((slot) => {
    const rx = engine.prescribe(store.plan, store.history, sessionType, slot, phaseInfo, store.coach);
    // THIS day's last visit — the visit the prescription was actually built
    // from — and, separately, the same lift done since on another day. They
    // are different facts and the card labels them differently; collapsing
    // them into one "LAST" line is what made the card contradict itself.
    // rx.source is the visit the prescription actually read (through the
    // engine's own calibration/deload fences). Re-deriving "most recent" here
    // with a looser fence is exactly how the card came to show one session
    // while the sentence underneath described another.
    const sameDay = rx.source ?? engine.lastPerformance(store.history, sessionType, slot.id, {});
    const anywhere = engine.lastPerformanceAnywhere(store.history, slot.id);
    const otherDay = anywhere && anywhere.entry !== sameDay?.entry ? anywhere : null;
    const strip = (perf) => perf ? {
      date: perf.entry.date,
      day: store.plan.sessions[perf.entry.session_type]?.name ?? perf.entry.session_type,
      setsAll: perf.ex.sets.map((s) => `${fmtW(s.weight)}×${Number(s.reps) || 0}`).join('  '),
      tag: store.plan.phases.find((p) => p.id === perf.entry.phase)?.type === 'deload' ? 'deload' : null,
    } : null;
    const prev = strip(sameDay);
    const other = strip(otherDay);
    // The lifter's own most recent note on this exercise, resurfaced where it
    // was promised to matter: on the card, next time.
    const noted = engine.lastNotedPerformance(store.history, slot.id);
    return {
      prev,
      other,
      prevNote: noted ? { text: noted.ex.note, date: noted.entry.date } : null,
      id: slot.id,
      name: engine.exMeta(store.plan, slot.id).name,
      repMin: slot.repMin, repMax: slot.repMax, repUnit: slot.repUnit || null,
      rest: slot.rest || 90,
      superset: slot.superset ?? null, // paired lifts alternate, sharing one rest after each round
      basis: rx.basis, prevTop: rx.prevTop, note: rx.note || null, bump: rx.increment || 0,
      cross: rx.cross ?? null, // progress recognized from another day of the rotation
      coachRx: rx.coach ?? null, // the trainer's reason + review date, shown on the card
      srcDate: rx.source?.date ?? null, // the visit the standing rules copied from
      logNote: null, // the lifter's own per-exercise note; saved into the record and shown here next visit
      // the true post-grid percentage the engine computed (calibration/deload) —
      // labels state THIS, never a nominal 90/80 the rounding already broke
      pct: rx.pct ?? null,
      stalled: engine.isStalled(store.plan, store.history, sessionType, slot),
      inc: engine.increment(store.plan, slot.id) || 2.5,
      // real machine pins for this lift (null = plain grid) — the numpad
      // steppers walk these instead of inventing weights that don't exist
      grid: engine.ladderFor(store.plan, slot.id),
      // rxWeight: the engine's own prescription, kept per set so validateSet
      // can grant it immunity — the app never second-guesses its own numbers
      sets: rx.sets.map((s) => ({ weight: s.weight, reps: s.reps, rxWeight: s.weight, done: false })),
    };
  });
  return {
    date, session_type: sessionType, world: world ?? pickWorld(sessionType),
    phase: phaseInfo.phase?.id ?? null, week: phaseInfo.week,
    startedAt: Date.now(),
    coachStamp: coachStamp(), // which trainer review these prescriptions used
    bodyweight: null, notes: '', exercises,
  };
}

function switchSession(type) {
  const today = todayStr();
  const phaseInfo = engine.phaseForDate(store.plan, today, store.settings.phaseOverride);
  hideRestTimer();
  // Leaving a clean draft returns its unseen world to the pool — switching
  // universes back and forth must not burn through the deck. A reopened
  // draft's world is exempt even when clean: it came from a banked entry
  // (already trained), and refunding it would deal it out twice.
  const prev = store.draft;
  const prevDirty = prev?.exercises?.some((x) => x.sets.some((s) => s.done));
  if (prev?.world && !prevDirty && !prev.reopened) returnWorld(prev.session_type, prev.world);
  // Swapping the day is an explicit choice — never reclaimed as "banked"
  // even when tonight already has a logged entry.
  store.saveDraft({ ...buildDraft(today, type, phaseInfo), deliberate: true });
  focusIdx = null;
  announceWorld = true;
  render(root);
}

// ——— The world screen ———

// The "why this number" copy lives in views/preview.js and is imported here,
// so the exercise card and the whole-night preview can never drift apart.
// (x.prev is the card's own last-time strip; preview builds its own as
// x.last, and BASIS.seed reads whichever exists.)

function renderWorldScreen(draft, phaseInfo) {
  const U = universeOf(draft.session_type);
  const W = worldDef(draft.session_type, draft.world);
  const session = store.plan.sessions[draft.session_type];
  const isNext = engine.rotationNext(store.plan, store.history) === draft.session_type;
  const phase = phaseInfo.phase;
  // A reopened night REPLACES its banked entry, so the header wears that
  // night's original chronological number — never history.length + 1, which
  // would claim a new night the re-finish never creates (finishSession makes
  // the same call on the results card).
  const replacing = store.history.findIndex((e) => store.entryPath(e) === store.entryPath(draft));
  const missionNo = replacing === -1 ? store.history.length + 1 : replacing + 1;
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

  // ONE notice on screen — the single most important thing tonight; the rest
  // wait one tap away in the briefing (priority: resuming > streak >
  // off-rotation > back-off week).
  // Fresh trainer flags (a pain note outranks every number) surface here.
  const coachFlags = engine.coachFresh(store.history, store.coach) ? (store.coach?.flags ?? []) : [];
  const noticeList = [
    draft.date !== todayStr() ? { k: 'resume', ic: 'hourglass', txt: `Resuming ${fmtDate(draft.date)} — finishing that night’s log` } : null,
    ...coachFlags.map((f) => ({ k: 'coach', ic: 'warn', txt: `Trainer: ${f.note ?? f.kind ?? 'see this morning’s review'}` })),
    streak >= 6 ? { k: 'streak', ic: 'moon', txt: `${streak} straight nights — take the rest day. The rotation pauses, nothing is lost.` } : null,
    isNext ? null : { k: 'offrot', ic: 'compass', txt: 'Off the rotation tonight — allowed. Days get pushed, never skipped.' },
    phase?.type === 'deload' ? { k: 'deload', ic: 'snowflake', txt: 'Deload week — target −20% load (snapped to the weight grid), 60% sets, 4+ RIR' } : null,
    phase?.type === 'calibration' ? { k: 'cal', ic: 'gauge', txt: 'Calibration week — seeds at ~90%, snapped to the weight grid' } : null,
  ].filter(Boolean);
  const topNotice = noticeList[0];

  const repRange = `${x.repMin === x.repMax ? x.repMin : `${x.repMin}–${x.repMax}`}`;
  const repUnitTxt = x.repUnit === 'sec' ? 'sec' : 'reps';

  // The moment of earning survives .no-entrance: the set logged (or un-skip
  // restored) within the last ~1.5s renders as .fresh, and the CSS replays its
  // pop even though the rest of the stage holds still. The `at` timestamp the
  // engine already stamps on logged sets is the whole mechanism.
  const nowMs = Date.now();
  const isFresh = (s) => (s.at && nowMs - s.at < 1500) || (s.unskippedAt && nowMs - s.unskippedAt < 1500);
  const freshField = freshEdit && nowMs - freshEdit.at < 1500 ? freshEdit.field : null;

  root.innerHTML = `
    <header class="world-head">
      <div class="world-name">${esc(W.name)}</div>
      <div class="mission-line">${esc(U.name)} — ${esc(session.name)} · night ${missionNo} · ${fmtDate(draft.date)}</div>
    </header>
    ${topNotice ? `
    <div class="notice" id="notice-bar" role="button" tabindex="0">
      <span class="n-ic" aria-hidden="true">${ICONS[topNotice.ic] ?? ''}</span>
      <span class="n-txt">${esc(topNotice.txt)}</span>
      ${noticeList.length > 1 ? `<span class="n-more">+${noticeList.length - 1}</span>` : ''}
      ${topNotice.k === 'resume' ? `<button id="resume-discard">Discard</button>` : ''}
    </div>` : ''}

    <section class="objective ${navDir === 'next' ? 'slide-next' : navDir === 'prev' ? 'slide-prev' : ''}">
      ${frameExtras}
      <div class="obj-top">
        <button class="count" id="open-brief">Act <b>${focusIdx + 1}</b> of ${draft.exercises.length}<span class="dn">▾</span></button>
        <div class="obj-pg">
          <button class="pg" id="pg-prev" aria-label="previous act" ${focusIdx === 0 ? 'disabled' : ''}>${ICONS.chevL}</button>
          <button class="pg" id="pg-next" aria-label="next act" ${focusIdx === draft.exercises.length - 1 ? 'disabled' : ''}>${ICONS.chevR}</button>
        </div>
      </div>
      <h1 class="obj-name"><button id="open-howto" data-ex="${esc(x.id)}">${esc(x.name)}<span class="qm">?</span></button></h1>
      <div class="obj-meta">
        <span class="chipper">${x.sets.length} × ${repRange}${x.repUnit === 'sec' ? 's' : ''}</span>
        ${x.stalled ? '<span class="chipper warn">stalled</span>' : ''}
        ${x.basis === 'verify' ? '<span class="chipper warn">verify</span>' : ''}
        <button class="chipper note-chip${x.logNote ? ' has' : ''}" id="ex-note" data-oi="${focusIdx}">${x.logNote ? `${ICONS.pencil} note` : `${ICONS.pencil} add note`}</button>
      </div>
      ${(() => {
        const p = supersetPartner(draft, x);
        if (!p) return '';
        return `<div class="ss-strip"><div class="ss-line"><span class="ss-tag">SUPERSET</span><span class="ss-txt">straight into <b>${esc(p.name)}</b> — rest after both</span></div><button class="ss-jump" id="ss-jump" data-oi="${draft.exercises.indexOf(p)}">${esc(p.name)} ⇄</button></div>`;
      })()}
      ${x.prev || x.other || x.prevNote ? `
      <div class="last-strip">
        ${x.prev ? `
        <div class="ls-r"><b>${esc((x.prev.day || 'last').toUpperCase())}</b><span class="d">${fmtDate(x.prev.date)}${x.prev.tag ? ` · ${x.prev.tag}` : ''}</span></div>
        <div class="ls-sets num">${esc(x.prev.setsAll)}</div>` : ''}
        ${x.other ? `
        <div class="ls-r ls-other"><b>${esc(x.other.day.toUpperCase())}</b><span class="d">${fmtDate(x.other.date)}${x.other.tag ? ` · ${x.other.tag}` : ''}</span></div>
        <div class="ls-sets num ls-other-sets">${esc(x.other.setsAll)}</div>` : ''}
        ${x.prevNote ? `<div class="ls-note">${ICONS.pencil} “${esc(x.prevNote.text)}” <span class="d">— your note, ${fmtDate(x.prevNote.date)}</span></div>` : ''}
        <div class="basis-line">${BASIS[x.basis]?.(x) ?? ''}</div>
      </div>` : `<div class="basis-line">${BASIS[x.basis]?.(x) ?? ''}</div>`}

      ${x.sets.some((s) => s.done) ? `
        <div class="trophy-note">${esc(U.copy.trophyNote)}</div>
        <div class="trophies">
          ${x.sets.map((s, si) => s.done ? `<button class="trophy${isFresh(s) ? ' fresh' : ''}" data-si="${si}"><span class="num">${fmtW(s.weight)}×${s.reps}${s.pr ? ' ★' : ''}</span><span class="tb">↩ tap again to take back</span></button>` : '').join('')}
        </div>` : ''}

      ${lastWarned ? `<div class="warnbox">${ICONS.warn} ${esc(lastWarned.warn)}<button class="dismiss" id="warn-dismiss" aria-label="dismiss warning">${ICONS.close}</button></div>` : ''}

      ${cur ? `
      <div class="console" id="console">
        <div class="striker"></div>
        <div class="c-target"><b>Set ${curIdx + 1} of ${x.sets.length}</b> · target ${repRange} ${repUnitTxt}</div>
        <div class="c-vals">
          <button class="g-val${freshField === 'weight' ? ' fresh' : ''}" id="g-w">${cur.weight == null ? '—' : fmtW(cur.weight)}<u>lb</u></button>
          <span class="c-x">×</span>
          <button class="g-val${freshField === 'reps' ? ' fresh' : ''}" id="g-r">${cur.reps}<u>${x.repUnit === 'sec' ? 'sec' : 'reps'}</u></button>
        </div>
        <button class="g-log" id="g-log">${esc(U.copy.log)}</button>
        <button class="g-skip" id="g-skip">Skip this set</button>
        <div class="set-pips" id="set-pips">
          ${x.sets.map((s, si) => `<i class="pip ${s.done ? 'done' : s.skipped ? 'skip' : si === curIdx ? 'cur' : ''}${isFresh(s) ? ' fresh' : ''}" data-si="${si}" style="--i:${si}"></i>`).join('')}
        </div>
        ${x.sets.some((s) => s.skipped) ? `<div class="basis-line unskip-hint">${x.sets.filter((s) => s.skipped).length} skipped — tap a crossed pip to bring one back</div>` : ''}
      </div>` : `
      <div class="obj-done">
        <div class="big">${esc(U.copy.objDone)}!</div>
        ${x.sets.some((q) => q.skipped) ? `<div class="basis-line">${x.sets.filter((q) => q.skipped).length} skipped — tap a crossed pip below to bring one back</div><div class="set-pips" id="set-pips">${x.sets.map((q, si) => `<i class="pip ${q.done ? 'done' : q.skipped ? 'skip' : ''}${isFresh(q) ? ' fresh' : ''}" data-si="${si}" style="--i:${si}"></i>`).join('')}</div>` : ''}
        ${focusIdx < draft.exercises.length - 1 ? `<button class="btn primary" id="od-next">Next act</button>` : `<div class="basis-line">Every act cleared — ${esc(U.copy.finish.toLowerCase())} below</div>`}
      </div>`}
    </section>

    <div class="obj-dots">
      ${draft.exercises.map((e, i) => {
        const st = e.sets.every((s) => s.done) ? 'done' : e.sets.some((s) => s.done) ? 'part' : '';
        return `<button class="odot ${st} ${i === focusIdx ? 'cur' : ''}" data-oi="${i}" aria-label="${esc(e.name)}"></button>`;
      }).join('')}
    </div>`;

  wire(draft, x, curIdx, noticeList);
}

function wire(draft, x, curIdx, noticeList = []) {
  root.onclick = null;
  const U = universeOf(draft.session_type);
  $('#open-brief', root).addEventListener('click', briefingSheet);
  $('#open-howto', root).addEventListener('click', (e) => howtoSheet(e.currentTarget.dataset.ex));
  $('#ex-note', root)?.addEventListener('click', (e) => exerciseNoteSheet(Number(e.currentTarget.dataset.oi)));
  $('#ss-jump', root)?.addEventListener('click', (e) => {
    const t = Number(e.currentTarget.dataset.oi);
    navDir = t >= focusIdx ? 'next' : 'prev';
    focusIdx = t;
    render(root);
  });
  $('#notice-bar', root)?.addEventListener('click', (e) => {
    if (e.target.closest('#resume-discard')) return; // Discard owns its tap
    noticesSheet(noticeList);
  });
  $('#resume-discard', root)?.addEventListener('click', () => {
    confirmSheet({
      title: `Discard ${fmtDate(draft.date)}?`,
      body: 'Its logged sets are dropped and today starts fresh.',
      confirmLabel: 'Discard', danger: true,
      onConfirm() { hideRestTimer(); store.clearDraft(); focusIdx = null; render(root); renderDock(); },
    });
  });
  // A true sideways SCROLL of the deck: the outgoing card is cloned in place
  // and travels off as the incoming card travels in, both a full width in
  // lockstep. The clone is inert (no ids, no pointer events) and dies the
  // moment it lands; a rapid second tap removes any clone still in flight, so
  // at most one ever exists.
  const paginate = (target, dir) => {
    const d = dir ?? (target > focusIdx ? 'next' : 'prev');
    navDir = d;
    haptic(4);
    sfx('nav');

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.querySelector('.objective-ghost')?.remove();
    const old = reduced ? null : root.querySelector('.objective');
    // .view is the offsetParent, so these are layout coords in the scroll
    // container — MUST be read before render() detaches the node.
    const pos = old ? { top: old.offsetTop, left: old.offsetLeft, width: old.offsetWidth } : null;
    focusIdx = target;
    const st = root.scrollTop;
    render(root); // the fresh card takes slide-next/prev from navDir
    root.scrollTop = st;
    if (!old) return;
    old.classList.remove('slide-next', 'slide-prev');
    old.classList.add('objective-ghost', d === 'next' ? 'ghost-out-next' : 'ghost-out-prev');
    old.setAttribute('aria-hidden', 'true');
    old.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id')); // no duplicate ids
    Object.assign(old.style, {
      position: 'absolute', top: `${pos.top}px`, left: `${pos.left}px`, width: `${pos.width}px`,
      margin: '0', zIndex: '3', pointerEvents: 'none',
    });
    root.appendChild(old);
    const kill = () => old.remove();
    old.addEventListener('animationend', kill, { once: true });
    setTimeout(kill, 700); // fallback: animationend never fires on a hidden tab
  };
  $('#pg-prev', root)?.addEventListener('click', () => paginate(focusIdx - 1, 'prev'));
  $('#pg-next', root)?.addEventListener('click', () => paginate(focusIdx + 1, 'next'));
  // Horizontal swipe on the whole card = prev/next act — the reachable,
  // game-like alternative to the top-right pagers (flicking the case file /
  // scroll / order ticket; the dual-card slide sells the physics). 64px
  // travel, 2:1 axis dominance, and never from a touch that started on a
  // button or the sideways-scrolling trophy shelf.
  const objEl = root.querySelector('.objective');
  if (objEl) {
    let sx = 0, sy = 0, swipeDead = false;
    objEl.addEventListener('touchstart', (e) => {
      swipeDead = !!e.target.closest('button, .trophies');
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    objEl.addEventListener('touchend', (e) => {
      if (swipeDead) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) < 64 || Math.abs(dx) < 2 * Math.abs(dy)) return;
      const target = focusIdx + (dx < 0 ? 1 : -1);
      if (target < 0 || target >= draft.exercises.length) return;
      paginate(target, dx < 0 ? 'next' : 'prev');
    }, { passive: true });
  }
  $('#od-next', root)?.addEventListener('click', () => paginate(defaultFocus(store.draft), 'next'));
  root.querySelectorAll('.odot').forEach((d) => d.addEventListener('click', () => {
    const t = Number(d.dataset.oi);
    if (t !== focusIdx) paginate(t);
  }));
  // Two-step un-log: a trophy is a banked set — the costliest accidental tap
  // in the app. First tap arms the chip (wobble + plain-English "tap again"),
  // second tap within 2s takes it back; unlogSet's UNDO toast still covers
  // the true accident. Two-step prevents, undo recovers.
  root.querySelectorAll('.trophy').forEach((t) => t.addEventListener('click', () => {
    if (t.dataset.armed) {
      clearTimeout(Number(t.dataset.armed));
      unlogSet(x, x.sets[Number(t.dataset.si)]);
      return;
    }
    root.querySelectorAll('.trophy.armed').forEach((o) => {
      o.classList.remove('armed');
      clearTimeout(Number(o.dataset.armed));
      delete o.dataset.armed;
    });
    haptic(5);
    sfx('tap');
    t.classList.add('armed');
    t.dataset.armed = String(setTimeout(() => {
      t.classList.remove('armed');
      delete t.dataset.armed;
    }, 2000));
  }));
  $('#set-pips', root)?.addEventListener('click', (e) => {
    // The drawn pips stay tiny and world-styled (6px-wide dojo tallies,
    // dumplings, chairlift chairs) — the whole padded row is the touch strip,
    // and any tap inside it restores the nearest skipped pip within 28px.
    let pip = e.target.closest('.pip.skip');
    if (!pip) {
      let bestD = 29;
      for (const p of e.currentTarget.querySelectorAll('.pip.skip')) {
        const r = p.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        if (d < bestD) { bestD = d; pip = p; }
      }
    }
    if (!pip) return;
    const restored = x.sets[Number(pip.dataset.si)];
    restored.skipped = false;
    restored.unskippedAt = Date.now(); // the restored pip pops back in (.fresh)
    store.saveDraft(store.draft);
    haptic(6);
    sfx('tap');
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
  const repTxt = x.repMin === x.repMax ? `${x.repMin}` : `${x.repMin}–${x.repMax}`;
  const unitTxt = x.repUnit === 'sec' ? 'seconds' : 'reps';
  numpadSheet({
    title: `${x.name} — set ${si + 1}`,
    // Plain English on the cascade: a weight edit writes forward, and the
    // user gets told so BEFORE and AFTER (the toast below), never silently.
    sub: isW ? `target ${repTxt} ${unitTxt} — this weight applies to this and the remaining sets` : unitTxt,
    value: isW ? s.weight ?? 0 : s.reps,
    unit: isW ? 'lb' : (x.repUnit === 'sec' ? 's' : ''),
    step: isW ? x.inc : 1,
    // laddered lifts: the +/− steppers walk the machine's REAL pins
    grid: isW ? x.grid ?? null : null,
    decimals: isW,
    max: isW ? 2000 : 999,
    onConfirm(v) {
      if (isW) {
        const hit = [];
        for (let j = si; j < x.sets.length; j++) if (!x.sets[j].done) { x.sets[j].weight = v; hit.push(j + 1); }
        toast(hit.length > 1
          ? `Weight set for sets ${hit[0]}–${hit[hit.length - 1]}`
          : `Weight set for set ${hit[0] ?? si + 1}`);
      } else s.reps = Math.round(v);
      // the confirmed number pops back on the card — the .fresh mechanism
      // replays val-pop through .no-entrance
      freshEdit = { field, at: Date.now() };
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

// The other lift in x's superset (or null). Pairs share a `superset` id.
function supersetPartner(draft, x) {
  if (!x?.superset || !draft?.exercises) return null;
  return draft.exercises.find((e) => e !== x && e.superset === x.superset) ?? null;
}

function logSet(x, s, U) {
  const now = Date.now();
  if (now - lastLogAt < 400) return; // double-tap = one set
  lastLogAt = now;
  const bestBefore = Math.max(engine.allTimeBest(store.history, x.id)?.weight ?? 0, draftBest(x.id));
  s.done = true;
  // First log stamps the performance time; an unlog→edit→relog CORRECTION
  // keeps the original stamp. Restamping here let a routine typo fix scramble
  // the performed order the engine now trusts — a rep edit after set 3 made
  // set 1 "newest", and the envelope inflated the next session off the fake
  // dip (found by the v45 adversarial review, repro'd against real data).
  s.at ??= Date.now();
  // Hand validateSet the context it needs to be fair: the current phase (a
  // deload weight is light ON PURPOSE) and the engine's own prescription
  // (the app must never call its own number a typo).
  const phase = store.plan.phases.find((p) => p.id === store.draft.phase) ?? null;
  const warnings = engine.validateSet(store.plan, store.history, x.id, s.weight ?? 0, s.reps, { phase, prescribed: s.rxWeight ?? null });
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
    if (r.top < 0 || r.bottom > window.innerHeight - 140) {
      anchor.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
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

  // Superset: after the FIRST lift of a round, go straight into the partner —
  // no rest between the pair — and rest only once both halves are done. The
  // partner "owes" this round when it has logged fewer sets than the lift just
  // finished, so it works whichever of the two you start with.
  const partner = supersetPartner(store.draft, x);
  const partnerOwesRound = !!partner
    && partner.sets.some((q) => !q.done && !q.skipped)
    && partner.sets.filter((q) => q.done || q.skipped).length < x.sets.filter((q) => q.done || q.skipped).length;
  if (partnerOwesRound && remaining > 0) {
    hideRestTimer(); // no rest inside the pair
    focusIdx = store.draft.exercises.indexOf(partner);
    render(root);
    toast(`Straight into ${partner.name} — no rest`, 'ok', 2600);
    renderDock();
    return;
  }

  if (store.settings.restTimer && remaining > 0) showRestTimer(x.rest, document.getElementById('dock'), U.copy.rest);
  // The night's last set has nothing to rest FOR: retire any live pill (and
  // its wake lock + badge) instead of letting it flip to overtime and nag
  // beside the finish bar about a set that doesn't exist.
  else if (remaining === 0) hideRestTimer();
  // Finishing this lift isn't "objective done" while its superset partner is
  // still mid-round — the jump above owns that hand-off.
  const pairStillOwes = !!partner && partner.sets.some((q) => !q.done && !q.skipped);
  if (finishedObjective && remaining > 0 && !pairStillOwes) {
    if (!s.pr) sfx('objDone');
    flashCard(`${U.copy.objDone}!`, x.name, () => {
      focusIdx = defaultFocus(store.draft);
      // The flash lands ~1s later — if the user already switched tabs, update
      // state only; rendering here would stomp the other view's world.
      if (!root.classList.contains('active')) return;
      render(root);
    });
  } else if (partner && pairStillOwes && remaining > 0) {
    // A round just closed and the pair continues (resting now) — return focus to
    // the pair's first lift so the next round leads with it, not the one you
    // happened to finish on.
    const lead = store.draft.exercises.find((e) => e.superset === x.superset && e.sets.some((q) => !q.done && !q.skipped));
    if (lead) { focusIdx = store.draft.exercises.indexOf(lead); render(root); }
  }
  renderDock();
}

function unlogSet(x, s) {
  // Snapshot the recomputed flags BEFORE clearing: weight/reps survive an
  // un-log anyway, but pr/warn state is engine output worth an explicit undo.
  const snap = { done: s.done, pr: s.pr, repPr: s.repPr, warn: s.warn, warnDismissed: s.warnDismissed };
  s.done = false; s.pr = false; s.repPr = false; s.warn = null;
  store.saveDraft(store.draft);
  toast('Set un-logged', 'ok', 5000, {
    action: {
      label: 'UNDO',
      fn() {
        if (s.done) return; // already re-logged by hand — don't stomp fresh state
        // The draft can be gone (or rebuilt) by the time UNDO lands — finish,
        // session switch, start-fresh. `s` would then be a dead object: bail
        // unless it still lives in the CURRENT draft, or saveDraft persists
        // the wrong thing (including null) while claiming a restore.
        if (!store.draft?.exercises?.some((ex) => ex.sets.includes(s))) return;
        Object.assign(s, snap);
        store.saveDraft(store.draft);
        haptic(8);
        sfx('log');
        render(root);
        renderDock();
      },
    },
  });
  haptic(8);
  sfx('tap');
  render(root);
  renderDock();
}

// ——— Sheets ———

export function howtoSheet(exId) {
  const meta = store.plan?.exercises[exId];
  const ex = store.draft?.exercises.find((x) => x.id === exId);
  const name = meta?.name ?? ex?.name ?? exId;
  openSheet(`
    <h2>${esc(name)}</h2>
    ${ex?.prev ? `<div class="sub">Last time · ${fmtDate(ex.prev.date)}${ex.prev.tag ? ` · ${esc(ex.prev.tag)}` : ''} — <span class="num">${esc(ex.prev.setsAll ?? ex.prev.sets)}</span></div>` : ''}
    ${meta?.howto
      ? `<div class="howto">${meta.howto.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`
      : `<div class="howto"><p>No field guide for this one.</p></div>`}
    <button class="btn quiet" id="ht-close" style="margin-top:12px">Close</button>`, {
    onOpen(sheet, close) { $('#ht-close', sheet).addEventListener('click', close); },
  });
}

// Every active notice, in full plain-English sentences — the bar on the world
// screen shows only the loudest one, this is where the rest live.
function noticesSheet(list) {
  if (!list.length) return;
  openSheet(`
    <h2>Tonight’s briefing</h2>
    <div class="sub">${list.length === 1 ? 'One thing to know' : `${list.length} things to know`}</div>
    <div class="opt-list">
      ${list.map((n) => `<div class="opt notice-full">${esc(n.txt)}</div>`).join('')}
    </div>
    <button class="btn quiet" id="nt-close" style="margin-top:10px">Close</button>`, {
    onOpen(sheet, close) { $('#nt-close', sheet).addEventListener('click', close); },
  });
}

function briefingSheet() {
  const d = store.draft;
  openSheet(`
    <h2>Tonight’s program</h2>
    <div class="sub">${d.exercises.length} acts · every target weight below</div>
    <div class="opt-list">
      ${d.exercises.map((e, i) => {
        const dn = e.sets.filter((s) => s.done).length;
        const done = dn === e.sets.length;
        return `<button class="opt ${i === focusIdx ? 'selected' : ''}" data-oi="${i}">
          <span class="opt-main">${esc(e.name)}<span class="opt-sets num">${esc(fmtSetLine(e.sets, { repUnit: e.repUnit, bodyweight: !e.sets.some((s) => s.weight) }))}</span></span>
          <span class="hint num${done ? ' ok' : ''}">${dn}/${e.sets.length}</span>
        </button>`;
      }).join('')}
    </div>
    <button class="btn quiet" id="brief-card" style="margin-top:8px">See the whole card</button>
    <button class="btn quiet" id="brief-add" style="margin-top:8px">+ Sneak one in</button>
    <div class="sub" style="margin:14px 0 6px">Tonight’s kit</div>
    <div class="opt-list">
      <button class="opt" id="chip-bw">Bodyweight<span class="hint num">${d.bodyweight ? `${fmtW(d.bodyweight)} lb` : 'log it'}</span></button>
      <button class="opt" id="chip-notes">Field notes<span class="hint">${d.notes ? '●' : '+'}</span></button>
      <button class="opt" id="chip-cardio">Conditioning<span class="hint">${conditioningToday() ? '● logged today' : '+ log'}</span></button>
      <button class="opt" id="switch-session">Swap the day<span class="hint">${esc(store.plan.sessions[d.session_type].name)}</span></button>
    </div>
    <div class="sub" style="margin:14px 0 6px">Where tonight’s numbers come from</div>
    <div class="opt-list">${(() => {
      const latest = [...store.history].filter((e) => !e.supplemental).sort((a, b) => a.date.localeCompare(b.date)).pop();
      const latestTxt = latest ? ` (latest entry ${fmtDate(latest.date)})` : '';
      const rules = `Between reviews the standing rules run on this phone: hit the top of the rep range on every set and the lift goes up next time, progress on one day carries to the same lift on other days, and every weight lands on a pin your machines can actually load.`;
      const c = store.coach;
      if (c && engine.coachFresh(store.history, c)) {
        return `<div class="opt notice-full"><b>Trainer review of ${esc(fmtDate(c.date ?? c.reviewed_through))}</b> — read your full log through ${esc(fmtDate(c.reviewed_through))}, including your notes. Lifts it adjusted say so on their cards; the rest follow the standing rules.${c.brief ? `<br><br>“${esc(c.brief)}”` : ''}</div>`;
      }
      if (c) return `<div class="opt notice-full">Your trainer’s last review (${esc(fmtDate(c.date ?? c.reviewed_through))}) hasn’t seen your latest session${latestTxt} yet — tonight runs on the standing rules until the 6 AM review catches up. ${rules}</div>`;
      return `<div class="opt notice-full">No trainer review found yet — the coach task commits one to the repo every morning at 6. Tonight runs on the standing rules${latestTxt}. ${rules}</div>`;
    })()}</div>`, {
    onOpen(sheet, close) {
      sheet.addEventListener('click', (e) => {
        const opt = e.target.closest('.opt[data-oi]');
        if (opt) { close(); const t = Number(opt.dataset.oi); navDir = t >= focusIdx ? 'next' : 'prev'; focusIdx = t; render(root); }
      });
      $('#brief-card', sheet).addEventListener('click', () => { close(); setTimeout(() => previewSheet(d.session_type, { when: 'tonight' }), 120); });
      $('#brief-add', sheet).addEventListener('click', () => { close(); addExerciseSheet(); });
      $('#chip-bw', sheet).addEventListener('click', () => { close(); bodyweightSheet(); });
      $('#chip-notes', sheet).addEventListener('click', () => { close(); notesSheet(); });
      $('#chip-cardio', sheet).addEventListener('click', () => { close(); conditioningSheet(); });
      $('#switch-session', sheet).addEventListener('click', () => { close(); switchSheet(); });
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
    <div class="sub">The whole night — your trainer reads this in tomorrow’s 6 AM review</div>
    <div class="card"><div class="field"><textarea id="notes-in" placeholder="How did tonight go overall? Sleep, energy, gym — anything worth knowing at the next program revision.">${esc(store.draft.notes)}</textarea></div></div>
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

// Per-exercise note. Rides into the saved record as exercises[].note and
// resurfaces on this exercise's card the next time it comes up. No human
// reads these day-to-day — the copy must never claim otherwise.
function exerciseNoteSheet(idx) {
  const x = store.draft?.exercises[idx];
  if (!x) return;
  openSheet(`
    <h2>Note · ${esc(x.name)}</h2>
    <div class="sub">Just this exercise — your trainer reads it in the 6 AM review, and it shows on this card next time</div>
    <div class="card"><div class="field"><textarea id="exn-in" placeholder="How did it feel? Form cues, a tweak or pain, machine seat/pin, reps in reserve, energy — anything worth remembering next time.">${esc(x.logNote || '')}</textarea></div></div>
    <div class="row-btns">
      ${x.logNote ? `<button class="btn quiet" id="exn-clear">Clear</button>` : ''}
      <button class="btn primary" id="exn-save">Save note</button>
    </div>`, {
    onOpen(sheet, close) {
      $('#exn-save', sheet).addEventListener('click', () => {
        const v = $('#exn-in', sheet).value.trim();
        store.draft.exercises[idx].logNote = v || null;
        store.saveDraft(store.draft);
        close(); render(root);
        if (v) toast('Note saved — your trainer reads it at 6 AM, and it’ll be on this card next time', 'ok');
      });
      $('#exn-clear', sheet)?.addEventListener('click', () => {
        store.draft.exercises[idx].logNote = null;
        store.saveDraft(store.draft);
        close(); render(root);
      });
    },
  });
}

// ——— Conditioning: a separate cardio session, logged alongside the lift and
// fenced off from all lifting progression (engine skips entries flagged
// supplemental). Its own history record, so it never overwrites the day's lift.
const CARDIO_MODES = ['Run', 'Bike', 'Row', 'Incline walk', 'Stair', 'Elliptical', 'Swim', 'Other'];
const CARDIO_EFFORT = ['Easy', 'Moderate', 'Hard'];

export function conditioningToday() {
  const t = todayStr();
  return store.history.find((e) => e.supplemental && e.date === t && e.conditioning) || null;
}

export function conditioningSheet() {
  const today = todayStr();
  const prior = conditioningToday();
  let modality = prior?.conditioning.modality ?? 'Run';
  let mins = prior?.conditioning.mins ?? 25;
  let effort = prior?.conditioning.intensity ?? 'Easy';
  openSheet(`
    <h2>Log conditioning</h2>
    <div class="sub">A separate cardio session — kept off your lifting numbers</div>
    <div class="card">
      <div class="field"><label>Type</label>
        <div class="pick-row" id="cx-mode">${CARDIO_MODES.map((m) => `<button class="pick${m === modality ? ' sel' : ''}" data-m="${esc(m)}">${esc(m)}</button>`).join('')}</div>
      </div>
      <div class="field"><label>Minutes</label>
        <div style="display:flex;align-items:center;gap:16px">
          <button class="np-step" id="cx-minus" aria-label="less">−</button>
          <span class="num" id="cx-mins" style="font-size:22px;min-width:44px;text-align:center">${mins}</span>
          <button class="np-step" id="cx-plus" aria-label="more">+</button>
        </div>
      </div>
      <div class="field"><label>Effort</label>
        <div class="pick-row" id="cx-int">${CARDIO_EFFORT.map((v) => `<button class="pick${v === effort ? ' sel' : ''}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>
      </div>
      <div class="field"><label>Note</label><textarea id="cx-note" placeholder="Optional — how it felt, distance, avg HR…">${esc(prior?.conditioning.note ?? '')}</textarea></div>
    </div>
    <button class="btn primary" id="cx-save">${prior ? 'Update session' : 'Log it'}</button>`, {
    onOpen(sheet, close) {
      $('#cx-mode', sheet).addEventListener('click', (e) => {
        const b = e.target.closest('.pick'); if (!b) return;
        modality = b.dataset.m; haptic(4);
        sheet.querySelectorAll('#cx-mode .pick').forEach((x) => x.classList.toggle('sel', x === b));
      });
      $('#cx-int', sheet).addEventListener('click', (e) => {
        const b = e.target.closest('.pick'); if (!b) return;
        effort = b.dataset.v; haptic(4);
        sheet.querySelectorAll('#cx-int .pick').forEach((x) => x.classList.toggle('sel', x === b));
      });
      $('#cx-minus', sheet).addEventListener('click', () => { mins = Math.max(5, mins - 5); $('#cx-mins', sheet).textContent = mins; haptic(4); });
      $('#cx-plus', sheet).addEventListener('click', () => { mins = Math.min(180, mins + 5); $('#cx-mins', sheet).textContent = mins; haptic(4); });
      $('#cx-save', sheet).addEventListener('click', () => {
        const note = $('#cx-note', sheet).value.trim();
        const entry = {
          date: today, session_type: 'cardio', supplemental: true, exercises: [],
          conditioning: { modality, mins, intensity: effort, ...(note ? { note } : {}) },
          startedAt: Date.now(),
        };
        store.upsertEntry(entry); // its own path (…-cardio.json) — never clobbers the lift
        // reflect it in the weekly cardio target, but only on a fresh log
        if (!prior) {
          const wk = weekKey(today);
          const arr = store.settings.cardio[wk] || [false, false, false];
          const slot = arr.indexOf(false);
          if (slot !== -1) { arr[slot] = true; store.settings.cardio[wk] = arr; store.saveSettings(); }
        }
        haptic(10); sfx('objDone');
        close();
        toast(`Conditioning logged — ${mins} min ${modality.toLowerCase()} · kept off your lifting numbers`, 'ok', 3000);
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
          basis: 'seed', prevTop: null, note: null, logNote: null, bump: 0, stalled: false, inc: 5, prev: null,
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
    const n = bar.querySelector('.xp-head .num');
    const txt = `${done}/${total}`;
    if (n.textContent !== txt) {
      n.textContent = txt;
      // the tally pops when it changes — a banked set visibly lands in the bar
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        n.animate(
          [{ transform: 'scale(1.5)', color: 'var(--acc)' }, { transform: 'scale(1)' }],
          { duration: 250, easing: 'cubic-bezier(.34,1.56,.64,1)' },
        );
      }
    }
    bar.querySelector('.xp-track i').style.width = `${pct}%`;
    bar.querySelector('#finish-btn').textContent = U.copy.finish;
    return;
  }
  bar = document.createElement('div');
  bar.id = 'finish-bar';
  bar.className = 'finish-bar';
  dock.appendChild(bar);
  // the first banked set of the night deserves an audible arrival — but only
  // mid-session (userActivation), never on a cold boot resuming an old draft
  if (navigator.userActivation?.isActive) sfx('nav');
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
    .map((x) => ({
      id: x.id, name: x.name,
      sets: x.sets.filter((s) => s.done).map((s) => ({ weight: s.weight ?? 0, reps: s.reps, ...(s.at ? { at: s.at } : {}) })),
      ...(x.logNote && x.logNote.trim() ? { note: x.logNote.trim() } : {}),
    }))
    .filter((x) => x.sets.length);
  if (!exercises.length) return toast('Nothing logged yet', 'bad');

  const ats = exercises.flatMap((x) => x.sets.map((q) => q.at).filter(Boolean));
  // True wall-clock duration from the draft's birth; pre-deploy drafts fall
  // back to the first logged set. sessionMins guards stale resumed drafts.
  const startedAt = d.startedAt ?? (ats.length ? Math.min(...ats) : null);
  // A reopened night keeps the duration it was banked with: its startedAt is
  // days old, and a re-logged set stamps a fresh `at` beside the originals,
  // so a recompute here can span the reopen gap and write a multi-day mins.
  // The set span is trusted only when it still reads like a single night.
  let mins;
  if (d.reopened) {
    const span = sessionMins(null, ats);
    mins = d.origMins ?? (span && span <= 360 ? span : null);
  } else {
    mins = sessionMins(startedAt, ats);
  }

  const entry = { date: d.date, session_type: d.session_type, phase: d.phase, week: d.week, exercises };
  if (d.world) entry.world = d.world;
  if (d.bodyweight) entry.bodyweight = d.bodyweight;
  if (d.notes) entry.notes = d.notes;
  if (mins) entry.mins = mins;
  if (startedAt) entry.startedAt = startedAt;
  const path = store.entryPath(entry);
  // Read BEFORE upsertEntry banks tonight — and honestly: re-finishing a
  // reopened night REPLACES its entry (same date + session type), so that
  // night keeps its original chronological number. Only a genuinely new
  // entry grows the count.
  const replaceIdx = store.history.findIndex((e) => store.entryPath(e) === path);
  const stats = {
    night: replaceIdx === -1 ? store.history.length + 1 : replaceIdx + 1,
    mins,
    sets: exercises.reduce((n, x) => n + x.sets.length, 0),
    tonnage: Math.round(exercises.reduce((n, x) => n + x.sets.reduce((m, s) => m + s.weight * s.reps, 0), 0)),
    prs: d.exercises.reduce((n, x) => n + x.sets.filter((s) => s.pr).length, 0),
    acts: exercises.length,
    title: U.copy.results,
    world: W ? `${W.name} · ${U.name}` : U.name,
    delivered: U.copy.delivered ?? NEUTRAL_COPY.delivered,
    path,
  };

  store.clearDraft();
  // quiet: the results ceremony owns the screen — the world rebuild waits for
  // the take-a-bow tap instead of tearing the stage mid-fanfare.
  store.upsertEntry(entry, { quiet: true });
  clearDock();
  hideRestTimer();
  haptic([10, 60, 20, 60, 30]);
  sfx('finish');
  flushQueue();
  showResults(stats);
}

// Plain-English cause for a failed upload; the raw GitHub error is for repos,
// not for people standing in a gym.
function syncReason(msg = '') {
  if (/401|403|Bad credentials/i.test(msg)) return 'GitHub rejected the token';
  if (/404/.test(msg)) return 'Repo not found — check the name';
  if (/fetch|network|load failed/i.test(msg)) return 'The connection dropped mid-upload';
  return String(msg).replace(/^GitHub \d+:\s*/, '').slice(0, 80) || 'Upload hit a snag';
}

function showResults(stats) {
  document.querySelector('.results')?.remove();
  const el = document.createElement('div');
  el.className = 'results';
  el.innerHTML = `
    <div class="rs-card">
      <div class="rs-k rs-eyebrow">Night ${stats.night} — ${esc(stats.world)}</div>
      <div class="rs-n">${esc(stats.title)}</div>
      <div class="rs-grid">
        <div class="rs-stat rs-time" style="animation-delay:.12s"><b class="num">${stats.mins ?? '—'}</b><i>minutes in the world</i></div>
        <div class="rs-stat" style="animation-delay:.24s"><b class="num">${stats.sets}</b><i>${stats.sets === 1 ? 'set' : 'sets'}</i></div>
        <div class="rs-stat" style="animation-delay:.36s"><b class="num" id="rs-ton">${stats.tonnage.toLocaleString()}</b><i>lb moved</i></div>
        <div class="rs-stat" style="animation-delay:.48s"><b class="num">${stats.acts}</b><i>${stats.acts === 1 ? 'act' : 'acts'}</i></div>
        <div class="rs-stat ${stats.prs ? 'pr' : ''}" style="animation-delay:.6s"><b class="num">${stats.prs}</b><i>${stats.prs === 1 ? 'record' : 'records'}</i>${stats.prs ? '<span class="rs-star s1" aria-hidden="true">★</span><span class="rs-star s2" aria-hidden="true">★</span>' : ''}</div>
      </div>
      <button class="btn primary" id="rs-go">Take a bow</button>
      <button class="btn quiet rs-atlas" id="rs-atlas">See tonight’s star in the Atlas</button>
      <div class="rs-sync" id="rs-sync"></div>
    </div>`;
  document.body.appendChild(el);

  // CHOREOGRAPHY — the nightly climax finally outranks the arcade game-over:
  // stats stagger in (val-pop, inline delays), the tonnage number counts up
  // as its cell lands, the card bursts after the slam (gold-heavy when PRs
  // fell), and a PR night gets a second sting when the records cell pops.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tonEl = el.querySelector('#rs-ton');
  if (tonEl && !reduced && stats.tonnage > 0) {
    const t0 = performance.now();
    const dur = 700;
    const tick = (t) => {
      if (!el.isConnected) return; // dismissed mid-count
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - (1 - p) ** 3;
      tonEl.textContent = Math.round(stats.tonnage * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    tonEl.textContent = '0';
    setTimeout(() => requestAnimationFrame(tick), 380); // when its cell lands
  }
  setTimeout(() => {
    if (el.isConnected) burstAt(el.querySelector('.rs-card'), { pr: stats.prs > 0 });
  }, 550);
  if (stats.prs > 0) setTimeout(() => { if (el.isConnected) sfx('pr'); }, 600);

  // LIVE save confirmation: the sync line tracks the queue while the card is
  // up — uploading, then the universe's own "delivered" moment, or the plain
  // failure reason in red with a way to fix it.
  const renderSync = () => {
    const box = el.querySelector('#rs-sync');
    if (!box) return;
    if (!store.settings.token) {
      box.className = 'rs-sync';
      box.textContent = 'Saved on this phone — connect GitHub on the Mission deck to back it up';
      return;
    }
    const q = store.queue.find((it) => it.path === stats.path);
    if (!q) {
      box.className = 'rs-sync ok';
      box.textContent = `✓ ${stats.delivered}`;
      return;
    }
    if (!navigator.onLine) {
      box.className = 'rs-sync';
      box.textContent = 'Saved offline — uploads the moment the signal returns';
      return;
    }
    if (q.attempts > 0) {
      box.className = 'rs-sync bad';
      const fixable = /401|403|Bad credentials/i.test(q.lastError || '');
      box.innerHTML = `${esc(syncReason(q.lastError))} — kept safe on this phone, retrying${fixable ? ' <button class="rs-fix" id="rs-fix">Fix token</button>' : ''}`;
      return;
    }
    box.className = 'rs-sync up';
    box.textContent = 'Uploading to GitHub…';
  };
  const unsub = store.sub(renderSync);
  renderSync();

  const dismiss = () => {
    unsub();
    el.remove();
    focusIdx = null;
    render(root);
    renderDock();
  };
  el.querySelector('#rs-go').addEventListener('click', dismiss);
  // The star you just earned, one tap away: close the ceremony and drill the
  // Atlas straight into tonight's entry (app.js owns the tab switch).
  el.querySelector('#rs-atlas').addEventListener('click', () => {
    unsub();
    el.remove();
    focusIdx = null;
    window.dispatchEvent(new CustomEvent('p3:nav', { detail: { tab: 'history', entryPath: stats.path } }));
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('#rs-fix')) { dismiss(); connectSheet(); }
  });
}

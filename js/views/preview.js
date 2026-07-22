// THE CARD — a whole night's numbers on one screen, before you lift a thing.
// Same engine call the session screen makes (engine.previewSession wraps the
// very same prescribe), so what you read here is exactly what the console
// will prefill. No second guess, no drift.
import { esc, fmtW, fmtDate, fmtSetLine, estimateMins } from '../util.js';
import { store } from '../store.js';
import * as engine from '../engine.js';
// ICONS lives in components.js — util.js has its own smaller set without
// pencil/warn, and importing from there rendered a literal "undefined".
import { openSheet, ICONS } from '../components.js';
import { UNIVERSES } from '../worlds.js';

const repsWord = (x) => (x.repUnit === 'sec' ? 'seconds' : 'reps');
const gridName = (x) => (x.grid ? 'your cable machine’s real pins' : `the ${x.inc} lb grid`);
const dayName = (t) => store.plan?.sessions[t]?.name ?? t;
const topRx = (x) => Math.max(0, ...x.sets.map((s) => s.rxWeight ?? s.weight ?? 0));

// What the prescription did to last visit's sets, in the athlete's words.
// Works off the SAME two things the user can see: the sets on the card and
// the sets on the LAST line. If they match, there is nothing to explain.
function repeatDeltas(x) {
  const prevSets = (x.last ?? x.prev)?.sets;
  if (!Array.isArray(prevSets) || !prevSets.length || !x.sets?.length) return [];
  const out = [];
  const raised = [];
  for (let i = 0; i < Math.min(x.sets.length, prevSets.length); i++) {
    const now = x.sets[i]?.weight ?? 0;
    const was = prevSets[i]?.weight ?? 0;
    if (now > was) raised.push(i + 1);
  }
  if (raised.length) {
    const which = raised.length === 1 ? `set ${raised[0]}` : `sets ${raised.join(' and ')}`;
    out.push(`with ${which} brought up so the night never steps backwards`);
  }
  if (x.sets.length > prevSets.length) {
    out.push(`padded back to the planned ${x.sets.length} sets (you logged ${prevSets.length})`);
  }
  return out;
}

// WHY this number — one plain-English sentence per prescription. Lives here
// (not in session.js) so the preview and the exercise card always tell the
// same story; session.js imports this map.
export const BASIS = {
  // JUST THE REASON. "Set by your trainer in the Jul 22 morning review:" was
  // eight words of identical boilerplate on every single card — a third of
  // the text on screen, saying the same thing seven times. WHO and WHEN are
  // stated ONCE, in the receipt at the top; the card wears a TRAINER chip.
  coach: (x) => `${x.coachRx?.reason ? `“${esc(x.coachRx.reason)}”` : 'Set by your trainer.'}${
    x.coachRx?.asked ? ` <span class="adj">Adjusted to a weight your machine can load — the ask was ${esc(x.coachRx.asked.map((w) => fmtW(w)).join(', '))}.</span>` : ''}${
    // Where the trainers disagreed, say so and name who won. A panel whose
    // arguments are invisible is indistinguishable from one agent.
    x.coachRx?.dissent ? `<span class="dis"><b>The room split.</b> ${esc(x.coachRx.dissent.progression ?? '')}${x.coachRx.dissent.progression && x.coachRx.dissent.recovery ? ' vs ' : ''}${esc(x.coachRx.dissent.recovery ?? '')} — went with ${esc(x.coachRx.dissent.ruled_for)}: ${esc(x.coachRx.dissent.why)}</span>` : ''}`,
  progress: (x) => x.bump > 0
    // "the next pin" is only true when the jump IS one pin — exiting
    // calibration can vault several at once (22.5 → 30 skips 24, 25.5, 27.5).
    ? `<span class="up">Up <span class="num">${fmtW(x.prevTop)}</span> → <span class="num">${fmtW(x.prevTop + x.bump)}</span> lb${
      x.grid && Math.abs((engine.ladderUp(x.grid, x.prevTop) ?? NaN) - (x.prevTop + x.bump)) < 1e-9
        ? ' (the next pin your machine can load)' : ''}</span> — you hit the top of the rep range on every set${x.srcDate ? ` on ${fmtDate(x.srcDate)}` : ' last time'}.`
    : `<span class="up">Top of the stack</span> — the machine can’t load more, so the weight holds at <span class="num">${fmtW(x.prevTop)}</span>. Keep owning the reps.`,
  // "Repeating" must only be said when it is TRUE. The engine reorders sets
  // into performed order, never steps backwards mid-session, and pads a short
  // night up to the planned set count — so the prescription frequently is NOT
  // a copy. Saying so anyway put a sentence on screen that the numbers right
  // above it contradicted (14 of 34 repeat rows in the live data).
  repeat: (x) => {
    const changes = repeatDeltas(x);
    const src = x.srcDate ? ` (${fmtDate(x.srcDate)})` : '';
    const tail = ` Hit ${x.repMax} ${repsWord(x)} on every set tonight and the app raises this lift next time.`;
    return changes.length
      ? `Built from this day’s last visit${src}, ${changes.join(' and ')}.${tail}`
      : `Repeating this day’s last visit${src} exactly.${tail}`;
  },
  // States the weight the card ACTUALLY prefills (topRx), not the raw
  // cross-day number — those differ whenever the pin snap moves it, and
  // quoting the raw one put a weight in the sentence that appeared nowhere else.
  cross: (x) => x.cross
    ? `Raised to <span class="num">${fmtW(topRx(x))}</span> lb${topRx(x) !== x.cross.weight ? ' (the nearest pin your machine can load)' : ''} to match what you already did on ${esc(dayName(x.cross.sessionType))} (${fmtDate(x.cross.date)}: <span class="num">${fmtW(x.cross.weight)}×${x.cross.reps}</span>). Progress counts wherever it happens.`
    : `Raised to match your latest work on another day.`,
  hold: (x) => `Prep block — the weight holds at <span class="num">${fmtW(x.prevTop)}</span> lb on purpose; matching last time’s reps is the win.`,
  // x.prev on a session card, x.last in the preview — either means "there is
  // older work on record for this lift, just not on this day yet".
  seed: (x) => (x.prev || x.last) ? `Program starting weight — this day hasn’t logged this lift yet (your older log is shown for reference).` : `Program starting weight — first time logging this lift.`,
  calibration: (x) => !x.prevTop ? `Calibration week — seed weight minus 10%.`
    : x.pct != null
      ? `<span class="num">${fmtW(topRx(x))}</span> lb = ${x.pct}% of seed <span class="num">${fmtW(x.prevTop)}</span> — target 90%, snapped down to ${gridName(x)}.`
      : `Target 90% of seed <span class="num">${fmtW(x.prevTop)}</span>, snapped down to ${gridName(x)}.`,
  deload: (x) => !x.prevTop ? `Deload week — lighter on purpose.`
    : x.pct != null
      ? `<span class="num">${fmtW(topRx(x))}</span> lb = ${x.pct}% of <span class="num">${fmtW(x.prevTop)}</span> — target 80%, snapped down to ${gridName(x)}.`
      : `Target 80% of <span class="num">${fmtW(x.prevTop)}</span>, snapped down to ${gridName(x)}.`,
  verify: (x) => esc(x.note || 'Verify weight'),
  // A fixed 60-second plank is not "beat last time's reps", and its unit is
  // seconds. Match the slot's actual range and unit like every other basis.
  bodyweight: (x) => {
    const unit = repsWord(x);
    const target = x.sets?.[0]?.reps ?? x.repMin;
    return x.repMin === x.repMax
      ? `Bodyweight — hold <span class="num">${x.repMax}</span> ${unit}, every set.`
      : `Bodyweight — you held <span class="num">${target}</span> ${unit} last time; beat it.`;
  },
};

// Short chip per row, so the whole night's shape reads at a glance without
// opening anything: what changed, and who changed it.
const TAG = {
  coach: { txt: 'trainer', cls: 'coach' },
  progress: { txt: 'going up', cls: 'up' },
  cross: { txt: 'carried over', cls: 'up' },
  repeat: { txt: 'same as last', cls: '' },
  hold: { txt: 'holding', cls: '' },
  seed: { txt: 'starting weight', cls: '' },
  calibration: { txt: 'calibration', cls: '' },
  deload: { txt: 'deload', cls: '' },
  verify: { txt: 'verify', cls: 'warn' },
  bodyweight: { txt: 'bodyweight', cls: '' },
};

// THE RECEIPT. Who set tonight's numbers — counted from the prescriptions the
// app actually produced, not from anything the packet claims about itself.
// A lift is "trainer" only if its basis came out of the coach branch; every
// other lift was arithmetic, and this says so by name.
export function provenance(rows, coach = store.coach, fresh = false) {
  const byTrainer = rows.filter((r) => r.basis === 'coach');
  const byRules = rows.filter((r) => r.basis !== 'coach');
  const producer = coach?.produced_by ?? null;
  return {
    total: rows.length,
    trainer: byTrainer.map((r) => r.name),
    rules: byRules.map((r) => ({ name: r.name, basis: r.basis })),
    fresh,
    date: coach?.date ?? null,
    reviewedThrough: coach?.reviewed_through ?? null,
    // 'scheduled-task' = the autonomous 6 AM run. Anything else was a human
    // or a Claude session writing the packet by hand, and must say so.
    automatic: producer === 'scheduled-task',
    producer,
    reviewer: coach?.reviewer ?? null,
  };
}

// One honest paragraph, built from the receipt above.
export function provenanceText(p) {
  if (!p.trainer.length && !p.fresh) {
    return p.date
      ? `<b>No trainer review is driving tonight.</b> The last one (${esc(fmtDate(p.date))}) is stale or was written for another session, so all ${p.total} lifts come from the standing rules — the app's own arithmetic on your log.`
      : `<b>No trainer review has ever been applied.</b> All ${p.total} lifts come from the standing rules — the app's own arithmetic on your log.`;
  }
  const src = p.automatic
    ? `the automatic 6 AM review of ${esc(fmtDate(p.date))}`
    : `a review written by hand on ${esc(fmtDate(p.date))} <b>(not the automatic 6 AM run)</b>`;
  return `<b>${p.trainer.length} of ${p.total} lifts</b> were set by ${src}, which read your log through ${esc(fmtDate(p.reviewedThrough))}. The other ${p.rules.length} came from the standing rules. Each lift says which on its own card.`;
}

export function previewRows(sessionType, dateStr = null) {
  const date = dateStr ?? new Date().toLocaleDateString('sv-SE');
  const plan = store.livePlan();
  const phaseInfo = engine.phaseForDate(plan, date, store.settings.phaseOverride);
  return { rows: engine.previewSession(plan, store.history, sessionType, phaseInfo, store.coach), phaseInfo };
}

// The preview sheet. `when` is a human label ("Tonight", "Tomorrow", …).
export function previewSheet(sessionType, { when = null, dateStr = null } = {}) {
  const plan = store.livePlan();
  if (!plan?.sessions[sessionType]) return;
  const { rows, phaseInfo } = previewRows(sessionType, dateStr);
  const U = UNIVERSES[sessionType];
  const totalSets = rows.reduce((n, r) => n + r.sets.length, 0);
  const mins = estimateMins(rows);
  // The brief and its flags describe ONE session — the one the trainer wrote
  // them for. Rendering them on all six put "Legs B tonight, calves at 280"
  // at the top of the Push A card.
  const packetSession = store.coach?.session_expected ?? null;
  const coachFresh = engine.coachFresh(store.history, store.coach, phaseInfo.date)
    && (!packetSession || packetSession === sessionType);
  const flags = coachFresh ? (store.coach?.flags ?? []) : [];
  // Count rows whose numbers actually differ from last time — the basis label
  // is not the question the footer answers. A 'coach' row that holds the exact
  // same sets did not change; a 'repeat' row padded to 4 sets did.
  const line = (r, sets) => fmtSetLine(sets, { repUnit: r.repUnit, bodyweight: r.bodyweight });
  const changed = rows.filter((r) => r.last?.sets?.length && line(r, r.sets) !== line(r, r.last.sets)).length;
  const prov = provenance(rows, store.coach, coachFresh);

  openSheet(`
    <h2>${esc(plan.sessions[sessionType].name)}${when ? ` — ${esc(when.toLowerCase())}` : ''}</h2>
    <div class="sub">${esc(U?.name ?? '')} · ${rows.length} acts · ${totalSets} sets · ≈${mins} min${phaseInfo.phase ? ` · ${esc(phaseInfo.phase.name)}` : ''}</div>
    ${coachFresh && store.coach?.brief ? `
      <div class="card pv-brief">
        <div class="pv-brief-h">${ICONS.pencil} Trainer, ${esc(fmtDate(store.coach.date ?? store.coach.reviewed_through))}</div>
        <div class="pv-brief-b">${esc(store.coach.brief)}</div>
      </div>` : ''}
    ${flags.map((f) => `<div class="pv-flag">${ICONS.warn} ${esc(f.note ?? f.kind ?? '')}</div>`).join('')}
    <div class="pv-list">
      ${rows.map((r, i) => {
        const tag = TAG[r.basis] ?? { txt: r.basis, cls: '' };
        const ss = r.superset ? `<span class="pv-ss">superset</span>` : '';
        return `
        <div class="pv-row" data-ex="${esc(r.id)}" role="button" tabindex="0">
          <div class="pv-head">
            <span class="pv-n">${i + 1}</span>
            <span class="pv-name">${esc(r.name)}</span>
            ${r.stalled ? '<span class="chipper warn">stalled</span>' : ''}
            ${ss}
            <span class="pv-tag ${tag.cls}">${esc(tag.txt)}</span>
          </div>
          <div class="pv-sets num">${esc(fmtSetLine(r.sets, { repUnit: r.repUnit, bodyweight: r.bodyweight }))}</div>
          <div class="pv-why">${BASIS[r.basis]?.(r) ?? ''}</div>
          ${r.last ? `<div class="pv-last">${esc(dayName(r.last.session))} · ${fmtDate(r.last.date)}${r.last.deload ? ' · deload' : ''} — <span class="num">${esc(fmtSetLine(r.last.sets, { repUnit: r.repUnit, bodyweight: r.bodyweight }))}</span></div>` : ''}
          ${r.other ? `<div class="pv-last">${esc(dayName(r.other.session))} · ${fmtDate(r.other.date)}${r.other.deload ? ' · deload' : ''} — <span class="num">${esc(fmtSetLine(r.other.sets, { repUnit: r.repUnit, bodyweight: r.bodyweight }))}</span></div>` : ''}
          ${(r.last?.note || r.other?.note) ? `<div class="pv-note">“${esc(r.last?.note || r.other?.note)}”</div>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="card pv-prov">
      <div class="pv-prov-h">Who set these numbers</div>
      <div class="pv-prov-b">${provenanceText(prov)}</div>
      ${prov.rules.length ? `<div class="pv-prov-l">Standing rules tonight: ${esc(prov.rules.map((r) => r.name).join(', '))}.</div>` : ''}
      <div class="pv-prov-l">Every review is a file in your repo — <span class="num">data/coach/</span> — with a commit you can read.</div>
    </div>
    <div class="pv-foot">${changed ? `${changed} lift${changed === 1 ? '' : 's'} changed since last time. ` : 'Nothing changed since last time. '}Tap any lift for its form guide. Nothing here is locked — what you log is what counts.</div>`, {
    onOpen(sheet, close) {
      sheet.addEventListener('click', async (e) => {
        const row = e.target.closest('.pv-row');
        if (!row) return;
        close();
        const { howtoSheet } = await import('./session.js');
        setTimeout(() => howtoSheet(row.dataset.ex), 120);
      });
    },
  });
}

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

// WHY this number — one plain-English sentence per prescription. Lives here
// (not in session.js) so the preview and the exercise card always tell the
// same story; session.js imports this map.
export const BASIS = {
  coach: (x) => `<span class="up">Set by your trainer</span> in the ${x.coachRx?.date ? `${fmtDate(x.coachRx.date)} ` : ''}morning review${x.coachRx?.reason ? `: “${esc(x.coachRx.reason)}”` : '.'}`,
  progress: (x) => x.bump > 0
    ? `<span class="up">Up <span class="num">${fmtW(x.prevTop)}</span> → <span class="num">${fmtW(x.prevTop + x.bump)}</span> lb${x.grid ? ' (the next pin your machine can load)' : ''}</span> — you hit the top of the rep range on every set${x.srcDate ? ` on ${fmtDate(x.srcDate)}` : ' last time'}.`
    : `<span class="up">Top of the stack</span> — the machine can’t load more, so the weight holds at <span class="num">${fmtW(x.prevTop)}</span>. Keep owning the reps.`,
  repeat: (x) => `Repeating this day’s last visit${x.srcDate ? ` (${fmtDate(x.srcDate)})` : ''} — hit ${x.repMax} ${repsWord(x)} on every set tonight and the app raises this lift next time.`,
  cross: (x) => x.cross
    ? `Raised to <span class="num">${fmtW(x.cross.weight)}</span> lb to match what you already did on ${esc(dayName(x.cross.sessionType))} (${fmtDate(x.cross.date)}: <span class="num">${fmtW(x.cross.weight)}×${x.cross.reps}</span>). Progress counts wherever it happens.`
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
  bodyweight: () => `Bodyweight — beat last time’s reps.`,
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

export function previewRows(sessionType, dateStr = null) {
  const date = dateStr ?? new Date().toLocaleDateString('sv-SE');
  const phaseInfo = engine.phaseForDate(store.plan, date, store.settings.phaseOverride);
  return { rows: engine.previewSession(store.plan, store.history, sessionType, phaseInfo, store.coach), phaseInfo };
}

// The preview sheet. `when` is a human label ("Tonight", "Tomorrow", …).
export function previewSheet(sessionType, { when = null, dateStr = null } = {}) {
  const plan = store.plan;
  if (!plan?.sessions[sessionType]) return;
  const { rows, phaseInfo } = previewRows(sessionType, dateStr);
  const U = UNIVERSES[sessionType];
  const totalSets = rows.reduce((n, r) => n + r.sets.length, 0);
  const mins = estimateMins(rows);
  const coachFresh = engine.coachFresh(store.history, store.coach);
  const flags = coachFresh ? (store.coach?.flags ?? []) : [];
  const changed = rows.filter((r) => r.basis === 'coach' || r.basis === 'progress' || r.basis === 'cross').length;

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
          ${r.last ? `<div class="pv-last">Last: ${fmtDate(r.last.date)}${r.last.session !== sessionType ? ` · ${esc(dayName(r.last.session))}` : ''} — <span class="num">${esc(fmtSetLine(r.last.sets, { repUnit: r.repUnit, bodyweight: r.bodyweight }))}</span></div>` : ''}
          ${r.last?.note ? `<div class="pv-note">“${esc(r.last.note)}”</div>` : ''}
        </div>`;
      }).join('')}
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

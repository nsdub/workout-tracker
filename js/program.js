// THE PROGRAM, AS THE TRAINER WROTE IT (v88). Since 2026-10-13 the daily
// review owns data/coach/program.json: it changes the program directly and
// the app's job is to SHOW him what changed and why, not to ask. This file
// is the one place a program change is turned into a sentence, so the
// Mission card, the session notice and the "what changed" sheet never
// describe the same change three different ways.
import { $, esc, fmtDate, todayStr, daysBetween } from './util.js';
import { store } from './store.js';
import * as engine from './engine.js';
import { openSheet } from './components.js';

const name = (plan, id) => (id ? esc(engine.exMeta(plan, id)?.name ?? id) : '');
const where = (plan, c) => (c.session ? esc(plan.sessions[c.session]?.name ?? c.session) : null);

// One plain line per change. HTML: names in <b>, nothing else.
export function changeLine(c, plan = store.livePlan() ?? store.plan) {
  const on = where(plan, c);
  const at = on ? ` on ${on}` : '';
  const b = (s) => `<b>${s}</b>`;
  switch (c.kind) {
    case 'sets': return `${b(name(plan, c.exercise))}${at}: ${c.before?.sets ?? '?'} → ${c.after?.sets ?? '?'} sets`;
    case 'swap': return `${b(name(plan, c.exercise))} → ${b(name(plan, c.after?.id))}${at}`;
    case 'add': return `Added ${b(name(plan, c.exercise))}${at}${c.after?.sets ? `, ${c.after.sets} × ${c.after.repMin ?? '?'}–${c.after.repMax ?? '?'}` : ''}`;
    case 'remove': return `Dropped ${b(name(plan, c.exercise))}${on ? ` from ${on}` : ''}`;
    case 'reorder': return `Moved ${b(name(plan, c.exercise))}${at}${Number.isInteger(c.after?.position) ? ` to slot ${c.after.position + 1}` : ''}`;
    case 'reprange': return `${b(name(plan, c.exercise))}${at}: reps ${c.before ? `${c.before.repMin}–${c.before.repMax} → ` : ''}${c.after?.repMin}–${c.after?.repMax}`;
    case 'rest': return `${b(name(plan, c.exercise))}${at}: rest ${c.before?.rest ?? '?'}s → ${c.after?.rest ?? '?'}s`;
    case 'targets': return `Weekly set targets changed${c.after?.muscle ? ` for ${b(esc(c.after.muscle))}` : ''}`;
    case 'retract': return `Put ${b(name(plan, c.exercise))} back${at}`;
    case 'rename': return `${b(esc(c.before?.name ?? c.session ?? ''))} renamed ${b(esc(c.after?.name ?? ''))}`;
    case 'snapshot': return 'Program file created from the plan you were running';
    default: return esc(`${c.kind} ${c.exercise ?? ''}`);
  }
}

// Changes made inside the last `days`, newest first.
export function recentChanges(days = 14) {
  const today = todayStr();
  return (store.program?.changes ?? [])
    .filter((c) => c.kind !== 'snapshot' && c.date && daysBetween(c.date, today) <= days)
    .slice()
    .reverse();
}

// The review's own verdict on the block and the muscle table, when the
// packet describes THIS program version — a review of an older version
// would quote numbers the program no longer contains.
export function currentReview() {
  const c = store.coach;
  const p = store.program;
  if (!c?.review || !p || c.program_version !== p.version) return null;
  return c.review;
}

const VERDICT = { hold: 'hold', raise: 'more', cut: 'less', rotate: 'rotate', watch: 'watch' };

export function openProgramSheet() {
  const plan = store.livePlan() ?? store.plan;
  const p = store.program;
  const unseen = store.unseenProgramChanges().filter((c) => c.kind !== 'snapshot');
  const recent = recentChanges(14);
  // Everything he has not seen, plus the last fortnight for context.
  const list = [...new Map([...unseen, ...recent].map((c) => [`${c.version}:${c.session}:${c.exercise}:${c.kind}`, c])).values()]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (b.version ?? 0) - (a.version ?? 0));
  const byDate = new Map();
  for (const c of list) (byDate.get(c.date) ?? byDate.set(c.date, []).get(c.date)).push(c);
  const review = currentReview();
  const muscles = review?.muscles ?? null;
  openSheet(`
    <h2>Your program</h2>
    <div class="sub">${p ? `Version ${p.version} · set by your trainer ${esc(fmtDate(p.date))}` : 'No program file yet — running the signed plan'}</div>
    ${review?.block ? `<div class="card pv-brief"><div class="pv-brief-h">The block</div>
      <div class="pv-brief-b"><b>${esc(review.block.verdict)}</b> — ${esc(review.block.why)}</div></div>` : ''}
    <div class="sub" style="margin:12px 0 6px">${list.length ? `What changed${unseen.length ? ` · <b>${unseen.length} new</b>` : ' in the last two weeks'}` : 'Nothing changed in the last two weeks'}</div>
    <div class="pv-list">
      ${[...byDate.entries()].map(([d, cs]) => `
        <div class="pv-row">
          <div class="pv-head"><span class="pv-name">${esc(fmtDate(d))}</span>${cs.some((c) => unseen.includes(c)) ? '<span class="pv-tag up">new</span>' : ''}</div>
          ${cs.map((c) => `<div class="pg-change"><div class="pg-line">${changeLine(c, plan)}</div><div class="pv-why">${esc(c.why ?? '')}</div></div>`).join('')}
        </div>`).join('')}
    </div>
    ${muscles ? `
    <div class="sub" style="margin:14px 0 6px">Weekly sets per muscle · planned vs done (4-wk avg)</div>
    <div class="pg-table">
      ${engine.MUSCLES.map((m) => {
        const r = muscles[m];
        if (!r) return '';
        return `<div class="pg-mrow"><span class="pg-m">${esc(m.replace('-', ' '))}</span><span class="num">${r.planned_weekly_sets}</span><span class="num dim">${r.done_4wk_avg}</span><span class="pg-v ${esc(r.verdict)}">${esc(VERDICT[r.verdict] ?? r.verdict)}</span></div>`;
      }).join('')}
    </div>
    <div class="pv-foot">A set counts once for each main muscle it works and half for each helper. "more" and "less" mean the trainer changed or dated a change; "watch" means it is being tracked.</div>` : ''}
    <div class="pv-foot">You never approve a change: the trainer sets the program from your whole log every morning, and what you actually log is what the next review reads. Every change is a line in <span class="num">data/coach/program.json</span> with the commit that made it.</div>
    <button class="btn quiet" id="pg-close" style="margin-top:12px">Close</button>`, {
    onOpen(sheet, close) {
      store.markProgramSeen();
      $('#pg-close', sheet).addEventListener('click', close);
    },
  });
}

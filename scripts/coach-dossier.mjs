#!/usr/bin/env node
// THE PRINTOUT. Everything a trainer with the athlete's whole history would
// have on the desk, assembled into one JSON file for the daily review:
// the program as it stands (and every change ever made to it, with its age),
// what each muscle is planned to get each week against what it actually got
// over the last eight weeks, every lift's full trajectory with its stall,
// compliance and last change, the phase calendar and the show countdown, his
// notes, pain hits, bodyweight, pacing, layoffs, and the raw log.
//
// There are no slices any more (v88). The 2026-10-13 finding was that three
// seats each given a sliver of this reasoned slot by slot and nobody saw the
// week: Push B went 23→26 sets in eight days through three separate cards.
// The reviewer that audits the head trainer reads this same file.
// Usage: node scripts/coach-dossier.mjs [YYYY-MM-DD]   (defaults to today)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../js/engine.js';
// The app's own ISO week helper (tested in scripts/test-app.mjs) — the
// review's week buckets and the app's must be the same weeks.
import { weekKey } from '../js/util.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some((a) => a.startsWith('--slice='))) {
  console.error('--slice is gone (v88): the review reads the whole printout. Run without it.');
  process.exit(1);
}
const today = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? new Date().toLocaleDateString('sv-SE');

const signed = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const decisions = JSON.parse(readFileSync(join(root, 'data/coach/decisions.json'), 'utf8'));
const programPath = join(root, 'data/coach/program.json');
const program = existsSync(programPath) ? JSON.parse(readFileSync(programPath, 'utf8')) : null;
// The program he ACTUALLY RUNS: the trainer's file, or (before one exists)
// plan.json with every accepted decision applied.
const plan = E.effectivePlan(signed, decisions, program);
const history = readdirSync(join(root, 'data/history'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'data/history', f), 'utf8')))
  .sort((a, b) => a.date.localeCompare(b.date));

const lifting = history.filter((e) => !e.supplemental);
const latest = lifting[lifting.length - 1] ?? null;
const phaseInfo = E.phaseForDate(plan, today);
const nextSession = E.rotationNext(plan, history);
const dayMs = 86400000;
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / dayMs);

// `recent` only where a key genuinely means "lately" (pacing). The log
// itself is never windowed: the entire ten-month log is ~33k tokens and a
// trainer coaching off two weeks cannot see a 136-day layoff.
const RECENT_DAYS = 14;
const cutoff = new Date(new Date(today + 'T12:00').getTime() - RECENT_DAYS * dayMs).toLocaleDateString('sv-SE');
const recent = history.filter((e) => e.date >= cutoff);
const plainSets = (sets) => (sets ?? []).map((s) => ({ weight: s.weight, reps: s.reps }));

const PAIN = /pain|tweak|pinch|sharp|hurt|sore|off|strain|click|numb/i;
const painNotes = [];
for (const e of history) {
  if (e.notes && PAIN.test(e.notes)) painNotes.push({ date: e.date, session: e.session_type, scope: 'session', note: e.notes });
  for (const x of e.exercises ?? []) {
    if (x.note && PAIN.test(x.note)) painNotes.push({ date: e.date, session: e.session_type, scope: x.id, note: x.note });
  }
}

// Breaks in training, which outrank almost everything else in a load
// decision. His log carries a 136-day one. Dates only — what the break MEANT
// is the trainer's to read.
const layoffs = (() => {
  const out = [];
  for (let i = 1; i < lifting.length; i++) {
    const days = daysBetween(lifting[i - 1].date, lifting[i].date);
    if (days > RECENT_DAYS) out.push({ from: lifting[i - 1].date, to: lifting[i].date, days });
  }
  return out;
})();

// EVERY logged visit of one lift, oldest first, whatever day it was done on.
// Two visits cannot show that a lift sat at 175-195 for nine months before
// one 155 night at a new gym; a trajectory can.
const trajectoryOf = (exId) => {
  const out = [];
  for (const e of lifting) {
    const x = (e.exercises ?? []).find((q) => q.id === exId);
    if (!x?.sets?.length) continue;
    const top = E.topSet(x.sets);
    out.push({
      date: e.date,
      session: e.session_type,
      phase: e.phase ?? null,
      ...(e.gym ? { gym: e.gym } : {}),
      ...(x.as ? { as: x.as } : {}),
      ...(x.unit ? { unit: x.unit } : {}),
      sets: E.performedOrder(x.sets).map((s) => ({ weight: s.weight, reps: s.reps })),
      top: top ? `${top.weight}×${top.reps}` : null,
      ...(x.note ? { note: x.note } : {}),
    });
  }
  return out;
};

// The slot's history SPLIT BY WHAT HE ACTUALLY DID IN IT. `as` is the app's
// "Doing something else here": a kettlebell swing logged in the calf press
// slot is not a calf press, and a single "best" over a mixed slot lies in
// either direction. One row per movement.
const topOf = (v) => Number(String(v.top ?? '').split('×')[0]) || 0;
const repsOf = (v) => Number(String(v.top ?? '').split('×')[1]) || 0;
const byMovement = (traj) => {
  const out = {};
  for (const v of traj) {
    const key = v.as ?? '(the program’s lift)';
    const row = (out[key] ??= { visits: 0, first: v.date, last: v.date, best_top: null, best_on: null });
    row.visits++;
    row.last = v.date;
    const w = topOf(v);
    if (w > 0 && (row.best_top == null || w > topOf({ top: row.best_top }))) { row.best_top = v.top; row.best_on = v.date; }
  }
  return out;
};

// Plain arithmetic, NOT a conclusion: the last visit's top set against the
// median top set of the visits before it, SAME MOVEMENT ONLY. It is here so
// the trainer can see that a night sits off this movement's own trailing
// level and ask why: a gym, a kg dial, a real drop, a typo.
const offTrailing = (traj) => {
  const lastVisit = traj[traj.length - 1];
  if (!lastVisit) return null;
  const movement = lastVisit.as ?? null;
  const same = traj.filter((v) => (v.as ?? null) === movement);
  const tops = same.map(topOf).filter((w) => w > 0);
  if (tops.length < 4) {
    return movement || tops.length ? { movement, visits_of_this_movement: tops.length, trailing_median_top: null } : null;
  }
  const last = tops[tops.length - 1];
  const before = tops.slice(0, -1).slice(-6).sort((a, b) => a - b);
  const m = before.length >> 1;
  const med = before.length % 2 ? before[m] : (before[m - 1] + before[m]) / 2;
  if (!(med > 0)) return null;
  return { movement, last_top: last, trailing_median_top: med, pct_of_trailing: Math.round((last / med) * 100), visits_compared: before.length };
};

// The heaviest top set this lift has ever carried, WITH the night and the
// movement. A bodyweight lift has no weight to rank by, so its best is the
// most reps — a best with no night attached is not checkable either way.
const bestOf = (traj, bodyweight) => {
  let best = null;
  for (const v of traj) {
    const w = topOf(v);
    const r = repsOf(v);
    const key = bodyweight ? r : w;
    const cur = best ? (bodyweight ? best.reps : best.weight) : null;
    if (key > 0 && (cur == null || key > cur)) best = { weight: w, reps: r, top: v.top, date: v.date, session: v.session, gym: v.gym ?? null, as: v.as ?? null };
  }
  return best;
};

// A plain trend over the last visits of the program's own movement: moving
// up, holding, or down against the visit before — stated as counts, so the
// trainer's `trend` verdict has something to be checked against.
const trendOf = (traj, bodyweight) => {
  const same = traj.filter((v) => !v.as);
  const pts = same.slice(-5).map((v) => (bodyweight ? repsOf(v) : topOf(v) * 1000 + repsOf(v)));
  if (same.length === 0) return 'unlogged';
  if (same.length < 3) return 'new';
  let up = 0, down = 0;
  for (let i = 1; i < pts.length; i++) { if (pts[i] > pts[i - 1]) up++; else if (pts[i] < pts[i - 1]) down++; }
  if (up && !down) return 'progressing';
  if (down && !up) return 'regressing';
  if (!up && !down) return 'holding';
  return 'mixed';
};

// ——— the program and its history ———
const changes = (program?.changes ?? []).map((c) => ({ ...c, age_days: c.date ? daysBetween(c.date, today) : null }));
const lastChangeFor = (id) => {
  const mine = changes.filter((c) => c.exercise === id || c.after?.id === id).filter((c) => c.kind !== 'snapshot');
  return mine.length ? mine[mine.length - 1] : null;
};

// ——— muscles: planned vs done, per ISO week, last 8 weeks ———
const muscleWeek = (() => {
  const planned = E.plannedWeeklyByMuscle(plan);
  const weeks = {};
  for (const e of lifting) {
    const wk = weekKey(e.date);
    weeks[wk] ??= [];
    weeks[wk].push(e);
  }
  const keys = Object.keys(weeks).sort();
  const thisWeek = weekKey(today);
  const lastEight = keys.filter((k) => k <= thisWeek).slice(-8);
  const done = Object.fromEntries(lastEight.map((k) => [k, E.doneByMuscle(plan, weeks[k])]));
  // 4-week average over the last four COMPLETED-or-current weeks that had
  // any lifting at all; weeks with zero nights are a layoff, not a zero.
  const lastFour = lastEight.slice(-4);
  const avg4 = Object.fromEntries(E.MUSCLES.map((m) => [m, lastFour.length
    ? Math.round((lastFour.reduce((t, k) => t + (done[k][m] ?? 0), 0) / lastFour.length) * 10) / 10 : 0]));
  const untagged = Object.keys(plan.exercises).filter((id) => Object.values(plan.sessions).some((s) => s.exercises.some((x) => x.id === id)) && !plan.exercises[id].muscles?.primary?.length);
  return {
    convention: 'a set credits 1 to each primary mover and 0.5 to each secondary; planned = one pass through the six-day rotation; done = sets with reps ≥ 1 in that ISO week',
    targets: program?.targets ?? null,
    planned,
    avg_4wk_done: avg4,
    weeks: done,
    untagged_lifts_in_program: untagged,
  };
})();

// ——— every lift in the program ———
const programLiftIds = [...new Set(Object.values(plan.sessions).flatMap((s) => s.exercises.map((x) => x.id)))];
const lifts = Object.fromEntries(programLiftIds.map((id) => {
  const meta = E.exMeta(plan, id);
  const traj = trajectoryOf(id);
  const where = Object.entries(plan.sessions).filter(([, s]) => s.exercises.some((x) => x.id === id))
    .map(([type, s]) => { const x = s.exercises.find((q) => q.id === id); return { session: type, sets: x.sets, repMin: x.repMin, repMax: x.repMax, rest: x.rest ?? null, stalled: E.isStalled(plan, history, type, x) }; });
  // Compliance: over the last six visits, sets done against what the program
  // asks NOW for that day (the prescription at the time is not recorded).
  const last6 = traj.slice(-6);
  const prescribed = last6.reduce((t, v) => t + (where.find((w) => w.session === v.session)?.sets ?? 0), 0);
  const done = last6.reduce((t, v) => t + v.sets.filter((s) => (s.reps ?? 0) >= 1).length, 0);
  const lc = lastChangeFor(id);
  return [id, {
    name: meta.name,
    muscles: meta.muscles ?? null,
    bodyweight: !!meta.bodyweight,
    in: where,
    trend_last5: trendOf(traj, !!meta.bodyweight),
    visits: traj.length,
    first_logged: traj[0]?.date ?? null,
    last_logged: traj[traj.length - 1]?.date ?? null,
    all_time_best: bestOf(traj, !!meta.bodyweight),
    last_vs_trailing: offTrailing(traj),
    by_movement: byMovement(traj),
    compliance_last6: last6.length ? { visits: last6.length, prescribed_sets: prescribed, done_sets: done, pct: prescribed ? Math.round((done / prescribed) * 100) : null } : null,
    last_change: lc ? { date: lc.date, kind: lc.kind, session: lc.session, why: lc.why, age_days: lc.age_days } : null,
    visits_since_change: lc ? traj.filter((v) => v.date > lc.date).length : traj.length,
    // One line per visit: the top set, where, on what. The full set-by-set
    // record of every night is in `entries`; repeating it here doubled the
    // file without adding a fact.
    trajectory: traj.map(({ sets, ...v }) => ({ ...v, n_sets: sets.filter((s) => (s.reps ?? 0) >= 1).length })),
  }];
}));

// ——— compliance per session type: the last 8 visits of each day ———
const complianceBySession = Object.fromEntries(Object.keys(plan.sessions).map((type) => {
  const visits = lifting.filter((e) => e.session_type === type).slice(-8);
  const prescribed = plan.sessions[type].exercises.reduce((t, x) => t + x.sets, 0);
  return [type, visits.map((e) => ({
    date: e.date,
    gym: e.gym ?? null,
    mins: e.mins ?? null,
    prescribed_sets_now: prescribed,
    done_sets: (e.exercises ?? []).reduce((t, x) => t + (x.sets ?? []).filter((s) => (s.reps ?? 0) >= 1).length, 0),
    skipped_slots: plan.sessions[type].exercises.filter((x) => !(e.exercises ?? []).some((q) => q.id === x.id && (q.sets ?? []).some((s) => (s.reps ?? 0) >= 1))).map((x) => x.id),
  }))];
}));

// ——— tonight's slots, with what the app would do on its own ———
// The trainer is told the app's own number because declining to override a
// lift MEANS that number draws the card; it cannot rule on what it is
// declining to change without seeing it.
const slots = (plan.sessions[nextSession]?.exercises ?? []).map((slot) => {
  const rx = E.prescribe(plan, history, nextSession, slot, phaseInfo);
  const same = E.lastPerformance(history, nextSession, slot.id, {});
  const any = E.lastPerformanceAnywhere(history, slot.id);
  return {
    id: slot.id,
    name: E.exMeta(plan, slot.id).name,
    slot: { sets: slot.sets, repMin: slot.repMin, repMax: slot.repMax, rest: slot.rest, superset: slot.superset ?? null, repUnit: slot.repUnit ?? null },
    appWillPrescribe: { basis: rx.basis, sets: rx.sets, cross: rx.cross ?? null, note: rx.note ?? null },
    unit: E.unitFor(plan, slot.id),
    lastSameDay: same ? { date: same.entry.date, gym: same.entry.gym ?? null, as: same.ex.as ?? null, unit: same.ex.unit ?? 'lb', sets: same.ex.sets, note: same.ex.note ?? null } : null,
    lastAnywhere: any && any.entry.date !== (same?.entry.date ?? null)
      ? { date: any.entry.date, session: any.entry.session_type, gym: any.entry.gym ?? null, as: any.ex.as ?? null, unit: any.ex.unit ?? 'lb', sets: any.ex.sets, note: any.ex.note ?? null } : null,
    stalled: E.isStalled(plan, history, nextSession, slot),
  };
});

const show = plan.show?.date ?? null;
const dossier = {
  generated_for: today,
  phase: phaseInfo.phase ? { id: phaseInfo.phase.id, type: phaseInfo.phase.type, week: phaseInfo.week, of: phaseInfo.weeks, start: phaseInfo.phase.start, end: phaseInfo.phase.end, note: phaseInfo.phase.note ?? null } : null,
  calendar: plan.phases.map((p) => ({ id: p.id, type: p.type, start: p.start, end: p.end })),
  show: show ? { date: show, label: plan.show?.label ?? null, days_away: daysBetween(today, show) } : null,
  next_session: nextSession,
  latest_entry: latest ? { date: latest.date, session: latest.session_type, gym: latest.gym ?? null, mins: latest.mins ?? null, bodyweight: latest.bodyweight ?? null, days_ago: daysBetween(latest.date, today) } : null,
  layoffs,
  program: program ? {
    version: program.version,
    date: program.date,
    written_by: program.written_by,
    sessions: Object.fromEntries(Object.entries(plan.sessions).map(([t, s]) => [t, { name: s.name, sets_total: s.exercises.reduce((n, x) => n + x.sets, 0),
      exercises: s.exercises.map((x) => `${x.id} ${x.sets}×${x.repMin}-${x.repMax}${x.repUnit === 'sec' ? 's' : ''}${x.superset ? ` (superset:${x.superset})` : ''}`) }])),
    targets: program.targets ?? null,
    exercises_added: Object.keys(program.exercises ?? {}),
    changes,
  } : { note: 'NO PROGRAM FILE YET — the app is running plan.json + decisions.json. Run scripts/program-init.mjs once.', sessions: Object.fromEntries(Object.entries(plan.sessions).map(([t, s]) => [t, s.exercises.map((x) => `${x.id} ${x.sets}×${x.repMin}-${x.repMax}`)])) },
  catalogue: Object.fromEntries(Object.entries(plan.exercises).map(([id, x]) => [id, { name: x.name, role: x.role ?? null, muscles: x.muscles ?? null, equipment: x.equipment ?? null, pattern: x.pattern ?? null, in_program: programLiftIds.includes(id) }])),
  muscle_week: muscleWeek,
  lifts,
  compliance_by_session: complianceBySession,
  stalled_lifts: E.stalledLifts(plan, history),
  next_session_slots: slots,
  pain_notes: painNotes,
  // Every note he has ever written, in his own words, with what he was doing
  // when he wrote it. He writes them FOR the review.
  notes_all: history.flatMap((e) => [
    ...(e.notes ? [{ date: e.date, session: e.session_type, scope: 'session', note: e.notes }] : []),
    ...(e.exercises ?? []).filter((x) => x.note).map((x) => ({ date: e.date, session: e.session_type, scope: x.id, note: x.note })),
  ]),
  bodyweight_trend: history.filter((e) => e.bodyweight).map((e) => ({ date: e.date, lb: e.bodyweight })),
  // Pacing: REAL median rest vs work per recent session, split by the
  // work-start bell stamped on each set (restEndedAt). Rising rest or falling
  // work density across sessions is a fatigue signal.
  tempo_trend: recent.filter((e) => !e.supplemental).map((e) => {
    const all = (e.exercises ?? []).flatMap((x) => x.sets ?? []).filter((s) => s.at).sort((a, b) => a.at - b.at);
    const rests = [];
    const works = [];
    for (let i = 1; i < all.length; i++) {
      const R = all[i].restEndedAt;
      if (R == null || R < all[i - 1].at || R > all[i].at) continue;
      rests.push((R - all[i - 1].at) / 1000);
      works.push((all[i].at - R) / 1000);
    }
    const med = (a) => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return Math.round(b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2); };
    const timed = rests.length >= 2;
    return { date: e.date, session: e.session_type, rest_med_s: timed ? med(rests) : null, work_med_s: timed ? med(works) : null, timed_sets: rests.length };
  }),
  // EVERY night he has logged, oldest first.
  entries: history.map((e) => (e.supplemental
    ? { date: e.date, conditioning: e.conditioning ?? null }
    : {
      date: e.date, session: e.session_type, phase: e.phase, mins: e.mins ?? null, gym: e.gym ?? null,
      bodyweight: e.bodyweight ?? null, notes: e.notes ?? null,
      exercises: (e.exercises ?? []).map((x) => ({ id: x.id, ...(x.as ? { as: x.as } : {}), ...(x.unit ? { unit: x.unit } : {}), sets: plainSets(x.sets), ...(x.note ? { note: x.note } : {}) })),
    })),
  gear_note: 'There is NO machine model (v84). He changes gyms often and each gym\'s machines differ, so the app never snaps weights to a ladder. Every weight in this file is in POUNDS; a set logged on a kg-labelled machine also carries `kg` and its exercise carries `unit: "kg"`. An exercise with `as` is what he ACTUALLY did in that slot at that gym — treat it as the lift performed. Entries carry `gym`; numbers from different gyms are different machines and do not compare 1:1. Write overrides in lb; the engine caps a raise at two steps above proven work.',
};

console.log(JSON.stringify(dossier, null, 2));

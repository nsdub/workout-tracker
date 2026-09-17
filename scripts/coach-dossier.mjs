#!/usr/bin/env node
// Assembles everything the daily trainer review needs into one JSON dossier:
// the rotation state, what the app will prescribe on its own, the athlete's
// ENTIRE logged history with his notes, and the signals a coach actually
// reads (pain notes, stalls, layoffs, bodyweight, pacing, conditioning).
// Nothing here is windowed to the last N days any more — see the note above
// `RECENT_DAYS`.
// Usage: node scripts/coach-dossier.mjs [YYYY-MM-DD]   (defaults to today)
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../js/engine.js';
// The app's own ISO week helper (tested in scripts/test-app.mjs) — the panel's
// week buckets and the app's must be the same weeks.
import { weekKey } from '../js/util.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// The panel must see the program the athlete ACTUALLY RUNS, not the signed
// baseline. Accepted structural decisions live as an overlay in
// decisions.json, so plan.json alone is a program he stopped running weeks
// ago. Reading it raw is why the 2026-07-30 review prescribed leg-extension
// on Legs B (removed 2026-07-22) and pitched a plank→hanging-leg-raise swap
// he had already accepted on 2026-07-22.
const signed = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const decisions = JSON.parse(readFileSync(join(root, 'data/coach/decisions.json'), 'utf8'));
const plan = E.effectivePlan(signed, decisions);
const history = readdirSync(join(root, 'data/history'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'data/history', f), 'utf8')))
  .sort((a, b) => a.date.localeCompare(b.date));

// --slice=<role> gives each panel seat its OWN VIEW of the whole log. It used
// to give each seat a SHORTER log, which is a different thing and the wrong
// one: decorrelation is about what a seat is asked to weigh, not about how
// much of the athlete's training it is allowed to know. Every seat that
// reasons about him now gets `entries` — all 85 nights — and the digests its
// own mandate needs on top.
const args = process.argv.slice(2);
const slice = (args.find((a) => a.startsWith('--slice=')) ?? '').split('=')[1] || 'all';
const today = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? new Date().toLocaleDateString('sv-SE');
const SLICES = {
  // The load driver. The whole log, plus each of tonight's lifts as its own
  // trajectory — the digest is redundant with `entries` on purpose, because a
  // seat reading 85 nights raw will not reliably notice that ONE lift went
  // 175-195-180-155. It gets no notes and no pain text, so it cannot quietly
  // become the recovery seat, and (see the bottom of this file) no
  // appWillPrescribe to anchor on.
  progression: ['generated_for', 'phase', 'next_session', 'entries', 'next_session_slots', 'stalled_lifts', 'layoffs', 'gear_note'],
  // The brake: his own words and his body, all of them, over the whole log —
  // every note he has ever written, every bodyweight reading, every break.
  // No progression tables, so it never argues load arithmetic it was not
  // asked to argue.
  recovery: ['generated_for', 'phase', 'next_session', 'latest_entry', 'pain_notes', 'notes_all', 'entries', 'bodyweight_trend', 'tempo_trend', 'layoffs'],
  // Structure: composition and balance, as a trend rather than a fortnight.
  // Emits no weights at all.
  program: ['generated_for', 'phase', 'next_session', 'session_composition', 'volume_by_week', 'sets_all_time', 'day_divergence', 'stalled_lifts', 'layoffs'],
  // The head coach rules on the seats' files. It keeps the compact per-slot
  // signals and the app's own number (declining to override MEANS the app's
  // arithmetic draws that card), and is not handed the log a fourth time.
  head: ['generated_for', 'phase', 'next_session', 'latest_entry', 'next_session_slots', 'layoffs'],
  all: null,
};
const lifting = history.filter((e) => !e.supplemental);
const latest = lifting[lifting.length - 1] ?? null;
const phaseInfo = E.phaseForDate(plan, today);
const nextSession = E.rotationNext(plan, history);

// NO WINDOW. Every seat sees the whole log. This file used to cut the
// evidence at 14 days — 8 entries out of 86 — on the stated grounds that a
// bigger dossier costs three times as much across three agents. Measured, the
// entire ten-month log is 33k tokens raw and 26k with per-set timestamps
// dropped, so the saving was never worth what it cost: a trainer coaching
// load off two weeks cannot see a 136-day layoff (2026-02-25 to 2026-07-11),
// cannot see that a lift sat at 175-195 for nine months before one 155 night,
// and cannot tell a gym change from a regression. Decorrelation stays — each
// seat still gets its OWN view and not the others' — but depth is no longer
// traded for it.
//
// `recent` remains for the handful of places that genuinely mean "lately"
// (pacing trend), and every one of them says so in its own key name.
const RECENT_DAYS = 14;
const cutoff = new Date(new Date(today + 'T12:00').getTime() - RECENT_DAYS * 86400000)
  .toLocaleDateString('sv-SE');
const recent = history.filter((e) => e.date >= cutoff);
// Per-set timestamps are ~25% of the bytes and are already distilled into
// tempo_trend; the seats read weights and reps.
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
// decision and were invisible behind the 14-day cut. His log carries a
// 136-day one. Dates only — what the break MEANT is the panel's to read.
const layoffs = (() => {
  const lift = history.filter((e) => !e.supplemental);
  const out = [];
  for (let i = 1; i < lift.length; i++) {
    const days = Math.round((new Date(lift[i].date + 'T12:00') - new Date(lift[i - 1].date + 'T12:00')) / 86400000);
    if (days > RECENT_DAYS) out.push({ from: lift[i - 1].date, to: lift[i].date, days });
  }
  return out;
})();

// EVERY logged visit of one lift, oldest first, whatever day it was done on.
// The progression seat used to get `lastSameDay` and `lastAnywhere` — two
// visits out of 85 logged nights — plus the app's own arithmetic to anchor
// on, and was expected to coach load off that. It cannot: a single night at a
// new gym reads as the athlete's current strength. Both of the numbers he
// caught on 2026-09-17 are that failure. The smith incline press went to
// 155×8 (from 175-195) because one 09-08 night was logged on a BARBELL at a
// new gym; the standing calf raise went to 45 (from 240-300) on one night at
// another. Two visits cannot show that. A trajectory can.
const trajectoryOf = (exId) => {
  const out = [];
  for (const e of history) {
    if (e.supplemental) continue;
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
// "Doing something else here": on 2026-09-17 the Calf Press slot carries
// as: "Kettlebell swing/thrusts" at 35/40/45, and read as a calf press that
// is a collapse from 300. It is not a calf press. A single number for "this
// lift's best" over a mixed slot is a lie in either direction, so the seat
// gets one row per movement and can never conflate them.
//
// This file cannot know which movement he is doing TONIGHT — the gym profile
// that holds the current `as` lives in his phone's settings and is not synced
// to the repo. So the split is reported and the panel reads it.
const topOf = (v) => Number(String(v.top ?? '').split('×')[0]) || 0;
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
// median top set of the visits before it — COMPARED ONLY AGAINST THE SAME
// MOVEMENT, or the number is a calf press measured against a kettlebell
// swing. It is here so the seat can see that a night sits off this movement's
// own trailing level and ask why: a gym, a different machine, a kg dial, a
// real drop, a typo. Nothing in this file decides which.
const offTrailing = (traj) => {
  const lastVisit = traj[traj.length - 1];
  if (!lastVisit) return null;
  const movement = lastVisit.as ?? null;
  const same = traj.filter((v) => (v.as ?? null) === movement);
  const tops = same.map(topOf).filter((w) => w > 0);
  if (tops.length < 4) {
    // Too little of THIS movement to have a trailing level. That is itself
    // worth saying — one night of a substitute is not a baseline.
    return movement || tops.length ? { movement, visits_of_this_movement: tops.length, trailing_median_top: null } : null;
  }
  const last = tops[tops.length - 1];
  const before = tops.slice(0, -1).slice(-6).sort((a, b) => a - b);
  const m = before.length >> 1;
  const med = before.length % 2 ? before[m] : (before[m - 1] + before[m]) / 2;
  if (!(med > 0)) return null;
  return {
    movement,
    last_top: last,
    trailing_median_top: med,
    pct_of_trailing: Math.round((last / med) * 100),
    visits_compared: before.length,
  };
};

const slots = (plan.sessions[nextSession]?.exercises ?? []).map((slot) => {
  const rx = E.prescribe(plan, history, nextSession, slot, phaseInfo);
  const same = E.lastPerformance(history, nextSession, slot.id, {});
  const any = E.lastPerformanceAnywhere(history, slot.id);
  const trajectory = trajectoryOf(slot.id);
  return {
    id: slot.id,
    name: E.exMeta(plan, slot.id).name,
    slot: { sets: slot.sets, repMin: slot.repMin, repMax: slot.repMax, rest: slot.rest, superset: slot.superset ?? null },
    appWillPrescribe: { basis: rx.basis, sets: rx.sets, cross: rx.cross ?? null, note: rx.note ?? null },
    unit: E.unitFor(plan, slot.id),
    lastSameDay: same ? { date: same.entry.date, gym: same.entry.gym ?? null, as: same.ex.as ?? null, unit: same.ex.unit ?? 'lb', sets: same.ex.sets, note: same.ex.note ?? null } : null,
    lastAnywhere: any && any.entry.date !== (same?.entry.date ?? null)
      ? { date: any.entry.date, session: any.entry.session_type, gym: any.entry.gym ?? null, as: any.ex.as ?? null, unit: any.ex.unit ?? 'lb', sets: any.ex.sets, note: any.ex.note ?? null } : null,
    stalled: E.isStalled(plan, history, nextSession, slot),
    // The heaviest top set this slot has ever carried, WITH the night it was
    // carried on AND what he was doing — a best with no movement attached is
    // how a kettlebell swing and a calf press end up in the same number.
    all_time_best: (() => {
      let best = null;
      for (const v of trajectory) {
        const w = topOf(v);
        if (w > 0 && (!best || w > best.weight)) best = { weight: w, top: v.top, date: v.date, session: v.session, gym: v.gym ?? null, as: v.as ?? null };
      }
      return best;
    })(),
    last_vs_trailing: offTrailing(trajectory),
    by_movement: byMovement(trajectory),
    trajectory,
  };
});

const dossier = {
  generated_for: today,
  phase: phaseInfo.phase ? { id: phaseInfo.phase.id, type: phaseInfo.phase.type, week: phaseInfo.week, of: phaseInfo.weeks } : null,
  next_session: nextSession,
  latest_entry: latest ? { date: latest.date, session: latest.session_type, gym: latest.gym ?? null, mins: latest.mins ?? null, bodyweight: latest.bodyweight ?? null } : null,
  pain_notes: painNotes,
  stalled_lifts: E.stalledLifts(plan, history),
  layoffs,
  next_session_slots: slots,
  // EVERY night he has logged, oldest first — not a 14-day window. This is
  // the key the seats read to see the shape of ten months.
  entries: history.map((e) => (e.supplemental
    ? { date: e.date, conditioning: e.conditioning ?? null }
    : {
      date: e.date, session: e.session_type, phase: e.phase, mins: e.mins ?? null, gym: e.gym ?? null,
      bodyweight: e.bodyweight ?? null, notes: e.notes ?? null,
      exercises: (e.exercises ?? []).map((x) => ({ id: x.id, ...(x.as ? { as: x.as } : {}), ...(x.unit ? { unit: x.unit } : {}), sets: plainSets(x.sets), ...(x.note ? { note: x.note } : {}) })),
    })),
  // Every note he has ever written, in his own words, with what he was doing
  // when he wrote it. The recovery seat used to see 14 days of these; he
  // writes them FOR the panel, so it gets all of them.
  notes_all: history.flatMap((e) => [
    ...(e.notes ? [{ date: e.date, session: e.session_type, scope: 'session', note: e.notes }] : []),
    ...(e.exercises ?? []).filter((x) => x.note).map((x) => ({ date: e.date, session: e.session_type, scope: x.id, note: x.note })),
  ]),
  bodyweight_trend: history.filter((e) => e.bodyweight).map((e) => ({ date: e.date, lb: e.bodyweight })),
  // Pacing: REAL median rest vs work per recent session, split by the work-start
  // bell stamped on each set (restEndedAt) — not the old flat "~40s/set" guess.
  // Rising rest or falling work density across sessions is a fatigue signal the
  // recovery seat reads. null on sessions logged before the bell was captured.
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
    const med = (a) => {
      const b = [...a].sort((x, y) => x - y);
      const m = b.length >> 1;
      return Math.round(b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2);
    };
    const timed = rests.length >= 2;
    return { date: e.date, session: e.session_type, rest_med_s: timed ? med(rests) : null, work_med_s: timed ? med(works) : null, timed_sets: rests.length };
  }),
  gear_note: 'v84: there is NO machine model any more. He changes gyms often (2026-09-02 and since) and each gym\'s machines differ, so the app no longer snaps weights to a ladder of pins. Every weight in this file is in POUNDS; a set logged on a kg-labelled machine also carries `kg` (the dial reading) and its exercise carries `unit: "kg"`. An exercise with `as` is what he ACTUALLY did in that slot at that gym (e.g. "Barbell" for a smith slot) — treat it as the lift performed. Entries carry `gym` where he named one; numbers from different gyms are different machines and do not compare 1:1. Write overrides in lb; the engine only caps a raise at two steps above proven work.',
  // ——— structure evidence, for the PROGRAM seat ———
  session_composition: Object.fromEntries(Object.entries(plan.sessions).map(([t, s]) => [t,
    s.exercises.map((x) => `${x.id} ${x.sets}×${x.repMin}-${x.repMax}${x.superset ? ` (superset:${x.superset})` : ''}`)])),
  // Weekly working sets per exercise across the last 14 days — the raw input
  // for "is anything under- or over-done" without any judgment baked in.
  // Working sets per exercise per ISO week across the WHOLE log, so "is
  // anything under- or over-done" is a trend rather than a fortnight's
  // snapshot — and a block where a lift disappeared entirely is visible.
  volume_by_week: (() => {
    const byWeek = {};
    for (const e of history) {
      const wk = weekKey(e.date);
      for (const x of e.exercises ?? []) {
        const n = (x.sets ?? []).filter((s) => (s.reps ?? 0) >= 1).length;
        if (!n) continue;
        (byWeek[wk] ??= {})[x.id] = (byWeek[wk][x.id] ?? 0) + n;
      }
    }
    return Object.fromEntries(Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0])));
  })(),
  // Career total per exercise, for the "how much of this has he ever done"
  // question that a per-week table answers only by being added up.
  sets_all_time: (() => {
    const v = {};
    for (const e of history) {
      for (const x of e.exercises ?? []) {
        v[x.id] = (v[x.id] ?? 0) + (x.sets ?? []).filter((s) => (s.reps ?? 0) >= 1).length;
      }
    }
    return Object.fromEntries(Object.entries(v).sort((a, b) => b[1] - a[1]));
  })(),
  // Lifts that appear on more than one day, with each day's latest top set —
  // this is where "Legs A is beating Legs B" becomes visible as data.
  day_divergence: (() => {
    const byEx = {};
    for (const [type, s] of Object.entries(plan.sessions)) {
      for (const slot of s.exercises) (byEx[slot.id] ??= new Set()).add(type);
    }
    const out = {};
    for (const [id, types] of Object.entries(byEx)) {
      if (types.size < 2) continue;
      out[id] = {};
      for (const t of types) {
        const p = E.lastPerformance(history, t, id, {});
        const top = p && E.topSet(p.ex.sets);
        out[id][t] = p ? { date: p.entry.date, top: top ? `${top.weight}×${top.reps}` : null, sets: p.ex.sets.length } : null;
      }
    }
    return out;
  })(),
};

if (!(slice in SLICES)) {
  console.error(`unknown --slice=${slice}; expected one of ${Object.keys(SLICES).join(', ')}`);
  process.exit(1);
}
const keys = SLICES[slice];
const out = keys ? Object.fromEntries(keys.filter((k) => k in dossier).map((k) => [k, dossier[k]])) : dossier;

// THE PROGRESSION SEAT DOES NOT GET THE APP'S ANSWER. It was being handed
// `appWillPrescribe` inside every slot — the standing-rules arithmetic, the
// number it exists to second-guess — and an anchor offered before the
// evidence is read is an anchor that gets adopted. It reasons from the
// trajectory, the rep ask and its own judgment now.
//
// The head coach keeps it, and needs it: writing no override for a lift MEANS
// the app's arithmetic draws that card, so the head coach cannot rule without
// knowing what it is declining to change.
if (slice === 'progression' && Array.isArray(out.next_session_slots)) {
  out.next_session_slots = out.next_session_slots.map(({ appWillPrescribe, ...rest }) => rest);
}
// The head coach rules on the seats' files rather than re-reading the whole
// log, so it keeps the compact signals (all_time_best, last_vs_trailing) that
// let it check a seat's claim, and drops the 18-visit trajectories that the
// progression seat was given to reason over. Without this the head slice is
// the full dossier again, which is the cost this file exists to avoid.
if (slice === 'head' && Array.isArray(out.next_session_slots)) {
  out.next_session_slots = out.next_session_slots.map(({ trajectory, ...rest }) => rest);
}
console.log(JSON.stringify(out, null, 2));

#!/usr/bin/env node
// Assembles everything the daily trainer review needs into one JSON dossier:
// the rotation state, what the app will prescribe on its own, full recent
// history with the lifter's notes, and the signals a coach actually reads
// (pain notes, stalls, incomplete sessions, bodyweight, conditioning).
// Usage: node scripts/coach-dossier.mjs [YYYY-MM-DD]   (defaults to today)
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../js/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const history = readdirSync(join(root, 'data/history'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'data/history', f), 'utf8')))
  .sort((a, b) => a.date.localeCompare(b.date));

// --slice=<role> hands each panel seat ONLY the evidence its mandate covers.
// Decorrelation is enforced at the input, not by asking politely in a prompt:
// three agents reading the same 9k-token dossier produce the same answer three
// times at three times the price. It is also the main cost lever.
const args = process.argv.slice(2);
const slice = (args.find((a) => a.startsWith('--slice=')) ?? '').split('=')[1] || 'all';
const today = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? new Date().toLocaleDateString('sv-SE');
const SLICES = {
  // the load driver: numbers only. No notes, no pain text, no timestamps —
  // so it cannot quietly become the recovery seat too.
  progression: ['generated_for', 'phase', 'next_session', 'next_session_slots', 'stalled_lifts', 'gear_note'],
  // the brake: the athlete's own words and body. No progression tables, so it
  // never argues load arithmetic it was not asked to argue.
  recovery: ['generated_for', 'phase', 'next_session', 'latest_entry', 'pain_notes', 'recent_entries', 'bodyweight_trend', 'tempo_trend'],
  // structure: composition and balance. Emits no weights at all.
  program: ['generated_for', 'phase', 'next_session', 'session_composition', 'weekly_volume', 'day_divergence', 'stalled_lifts'],
  // the head coach reads the panel's files, not the raw evidence again.
  head: ['generated_for', 'phase', 'next_session', 'latest_entry', 'next_session_slots'],
  all: null,
};
const lifting = history.filter((e) => !e.supplemental);
const latest = lifting[lifting.length - 1] ?? null;
const phaseInfo = E.phaseForDate(plan, today);
const nextSession = E.rotationNext(plan, history);

const cutoff = new Date(new Date(today + 'T12:00').getTime() - 14 * 86400000)
  .toLocaleDateString('sv-SE');
const recent = history.filter((e) => e.date >= cutoff);

const PAIN = /pain|tweak|pinch|sharp|hurt|sore|off|strain|click|numb/i;
const painNotes = [];
for (const e of recent) {
  if (e.notes && PAIN.test(e.notes)) painNotes.push({ date: e.date, session: e.session_type, scope: 'session', note: e.notes });
  for (const x of e.exercises ?? []) {
    if (x.note && PAIN.test(x.note)) painNotes.push({ date: e.date, session: e.session_type, scope: x.id, note: x.note });
  }
}

const slots = (plan.sessions[nextSession]?.exercises ?? []).map((slot) => {
  const rx = E.prescribe(plan, history, nextSession, slot, phaseInfo);
  const same = E.lastPerformance(history, nextSession, slot.id, {});
  const any = E.lastPerformanceAnywhere(history, slot.id);
  return {
    id: slot.id,
    name: E.exMeta(plan, slot.id).name,
    slot: { sets: slot.sets, repMin: slot.repMin, repMax: slot.repMax, rest: slot.rest, superset: slot.superset ?? null },
    appWillPrescribe: { basis: rx.basis, sets: rx.sets, cross: rx.cross ?? null, note: rx.note ?? null },
    lastSameDay: same ? { date: same.entry.date, sets: same.ex.sets, note: same.ex.note ?? null } : null,
    lastAnywhere: any && any.entry.date !== (same?.entry.date ?? null)
      ? { date: any.entry.date, session: any.entry.session_type, sets: any.ex.sets, note: any.ex.note ?? null } : null,
    stalled: E.isStalled(plan, history, nextSession, slot),
  };
});

const dossier = {
  generated_for: today,
  phase: phaseInfo.phase ? { id: phaseInfo.phase.id, type: phaseInfo.phase.type, week: phaseInfo.week, of: phaseInfo.weeks } : null,
  next_session: nextSession,
  latest_entry: latest ? { date: latest.date, session: latest.session_type, mins: latest.mins ?? null, bodyweight: latest.bodyweight ?? null } : null,
  pain_notes: painNotes,
  stalled_lifts: E.stalledLifts(plan, history),
  next_session_slots: slots,
  recent_entries: recent.map((e) => e.supplemental
    ? { date: e.date, conditioning: e.conditioning ?? null }
    : {
      date: e.date, session: e.session_type, phase: e.phase, mins: e.mins ?? null,
      bodyweight: e.bodyweight ?? null, notes: e.notes ?? null,
      exercises: (e.exercises ?? []).map((x) => ({ id: x.id, sets: x.sets, ...(x.note ? { note: x.note } : {}) })),
    }),
  bodyweight_trend: history.filter((e) => e.bodyweight).slice(-6).map((e) => ({ date: e.date, lb: e.bodyweight })),
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
  gear_note: 'Exercises with meta.gear in plan.json load only real hardware pins (photographed 2026-07-23): main-cable = 2.5..97.5 by 5 + micros +1.5/+3; dumbbell = 2.5s to 20, 5s to 50, then 60/70/80/90; leg-press = 20-lb selectorized steps; chest-press = 15-lb stack + 7.5 micro. The engine snaps and caps every coach override to the exercise\'s own ladder; write loadable weights anyway.',
  // ——— structure evidence, for the PROGRAM seat ———
  session_composition: Object.fromEntries(Object.entries(plan.sessions).map(([t, s]) => [t,
    s.exercises.map((x) => `${x.id} ${x.sets}×${x.repMin}-${x.repMax}${x.superset ? ` (superset:${x.superset})` : ''}`)])),
  // Weekly working sets per exercise across the last 14 days — the raw input
  // for "is anything under- or over-done" without any judgment baked in.
  weekly_volume: (() => {
    const v = {};
    for (const e of recent) {
      for (const x of e.exercises ?? []) {
        v[x.id] = (v[x.id] ?? 0) + x.sets.filter((s) => (s.reps ?? 0) >= 1).length;
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
console.log(JSON.stringify(out, null, 2));

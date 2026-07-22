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

const today = process.argv[2] ?? new Date().toLocaleDateString('sv-SE');
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
  gear_note: 'Exercises with meta.gear in plan.json load only real pins (stack 2.5..97.5 by 5, micros +1.5/+3). The engine snaps and caps every coach override; write loadable weights anyway.',
};

console.log(JSON.stringify(dossier, null, 2));

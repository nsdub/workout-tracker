#!/usr/bin/env node
// ONE-TIME: writes data/coach/program.json v1 as the snapshot of the program
// the athlete actually runs today — plan.json with every accepted decision
// applied — and seeds its change log from those decisions, so the trainer
// that owns the file from here on can see what was changed before, when, and
// why. Refuses to overwrite an existing program file: after v1 the daily
// review is the only writer.
// Usage: node scripts/program-init.mjs [YYYY-MM-DD]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../js/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'data/coach/program.json');
if (existsSync(out)) {
  console.error(`${out} already exists — the daily review owns it now. Delete it deliberately if you really mean to re-seed.`);
  process.exit(1);
}
const today = process.argv[2] ?? new Date().toLocaleDateString('sv-SE');
const plan = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const decisions = JSON.parse(readFileSync(join(root, 'data/coach/decisions.json'), 'utf8'));
const live = E.effectivePlan(plan, decisions);

// Starting weekly hard-set targets (primary = 1, secondary = 0.5). These are
// a trainer's first draft, not a law: program.json carries them so the
// review can edit them with a reason like any other change.
const targets = {
  chest: { min: 10, max: 18 }, 'front-delts': { min: 4, max: 10 }, 'side-delts': { min: 8, max: 16 }, 'rear-delts': { min: 6, max: 12 },
  lats: { min: 10, max: 18 }, 'upper-back': { min: 8, max: 16 }, traps: { min: 4, max: 10 }, 'lower-back': { min: 2, max: 8 },
  biceps: { min: 8, max: 14 }, triceps: { min: 8, max: 14 }, forearms: { min: 2, max: 8 },
  quads: { min: 10, max: 18 }, hamstrings: { min: 8, max: 14 }, glutes: { min: 6, max: 14 }, adductors: { min: 2, max: 6 }, abductors: { min: 2, max: 6 },
  calves: { min: 6, max: 12 }, abs: { min: 4, max: 10 },
};

// The accepted decisions, in the order he gave them, as change entries. The
// trainer's change log must start with the real history, not a blank page.
const changes = decisions
  .filter((d) => d.decision === 'accepted' && d.proposal?.kind)
  .sort((a, b) => String(a.decided_at ?? '').localeCompare(String(b.decided_at ?? '')))
  .map((d) => {
    const p = d.proposal;
    const kind = { volume: 'sets', keep: 'retract' }[p.kind] ?? p.kind;
    const after = p.kind === 'volume' ? { sets: p.sets }
      : p.kind === 'swap' ? { id: p.replacement, ...(p.slot ?? {}) }
      : p.kind === 'add' ? { ...(p.slot ?? {}) }
      : p.kind === 'reprange' ? { repMin: p.repMin, repMax: p.repMax }
      : p.kind === 'reorder' ? { position: p.position }
      : null;
    return {
      version: 0,
      date: String(d.decided_at ?? p.date ?? '').slice(0, 10) || p.date,
      session: p.scope ?? null,
      exercise: p.exercise,
      kind,
      before: null,
      after,
      why: p.why,
      evidence: [],
      origin: `decision by the athlete (${p.from ?? 'trainer'} proposal of ${p.date})`,
    };
  });

const program = {
  version: 1,
  date: today,
  written_by: 'interactive-session',
  note: 'v1 is the snapshot of plan.json with every decision the athlete accepted through ' + today + '. From here the daily review owns this file.',
  sessions: Object.fromEntries(Object.entries(live.sessions).map(([k, s]) => [k, { name: s.name, exercises: s.exercises.map((x) => {
    const slot = { id: x.id, sets: x.sets, repMin: x.repMin, repMax: x.repMax, rest: x.rest ?? 90 };
    if (x.superset) slot.superset = x.superset;
    if (x.repUnit) slot.repUnit = x.repUnit;
    if (x.seed != null) slot.seed = x.seed;
    if (x.seedNote) slot.seedNote = x.seedNote;
    return slot;
  }) }])),
  exercises: {},
  targets,
  changes: [...changes, {
    version: 1,
    date: today,
    session: null,
    exercise: null,
    kind: 'snapshot',
    before: null,
    after: null,
    why: 'Program file created: the program as he ran it on this date, with every accepted decision applied. The trainer owns it from here.',
    evidence: [],
  }],
};

writeFileSync(out, JSON.stringify(program, null, 2) + '\n');
const totals = Object.fromEntries(Object.entries(program.sessions).map(([k, s]) => [k, s.exercises.reduce((n, x) => n + x.sets, 0)]));
console.log(`wrote ${out}: v1, ${changes.length} historical changes, sets per session ${JSON.stringify(totals)}`);

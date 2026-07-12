#!/usr/bin/env node
// Sanity tests for the pure engine against the real plan + imported history.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../js/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const bundle = JSON.parse(readFileSync(join(root, 'data/seed-bundle.json'), 'utf8'));
const history = bundle.history;

const slot = (type, id) => plan.sessions[type].exercises.find((x) => x.id === id);
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`  ✓ ${name}`); };

// ——— Phase calendar ———
ok('pre-program date has no phase', () => {
  assert.equal(E.phaseForDate(plan, '2026-07-10').phase, null);
});
ok('calibration week', () => {
  const i = E.phaseForDate(plan, '2026-07-15');
  assert.equal(i.phase.id, 'calibration');
  assert.equal(i.week, 1);
});
ok('meso1 week 2', () => {
  const i = E.phaseForDate(plan, '2026-07-27');
  assert.equal(i.phase.id, 'meso1');
  assert.equal(i.week, 2);
  assert.equal(i.weeks, 4);
});
ok('deload by date', () => {
  assert.equal(E.phaseForDate(plan, '2026-08-20').phase.type, 'deload');
});
ok('prep continues past its end date', () => {
  assert.equal(E.phaseForDate(plan, '2027-06-01').phase.id, 'prep');
});
ok('manual override wins', () => {
  assert.equal(E.phaseForDate(plan, '2026-07-27', 'deload1').phase.id, 'deload1');
});

// ——— Rotation ———
ok('rotation continues after last imported session (PullB → LegsB)', () => {
  assert.equal(E.rotationNext(plan, history), 'LegsB');
});
ok('empty history starts at PushA', () => {
  assert.equal(E.rotationNext(plan, []), 'PushA');
});

// ——— Prescriptions ———
const calib = E.phaseForDate(plan, '2026-07-15');
ok('calibration: seed −10% rounded to 2.5 (185 → 167.5)', () => {
  const rx = E.prescribe(plan, history, 'PushA', slot('PushA', 'smith-incline-press'), calib);
  assert.equal(rx.basis, 'calibration');
  assert.equal(rx.sets.length, 4);
  assert.equal(rx.sets[0].weight, 167.5);
  assert.equal(rx.sets[0].reps, 6);
});
ok('calibration: null seed → verify', () => {
  const rx = E.prescribe(plan, history, 'PullA', slot('PullA', 'lat-pulldown-wide'), calib);
  assert.equal(rx.basis, 'verify');
  assert.equal(rx.sets[0].weight, null);
});

const meso = E.phaseForDate(plan, '2026-07-27');
ok('build with no post-calibration history → seed as-is', () => {
  const rx = E.prescribe(plan, history, 'PushA', slot('PushA', 'smith-incline-press'), meso);
  assert.equal(rx.basis, 'seed');
  assert.equal(rx.sets[0].weight, 185);
});
ok('legacy import never feeds prefill', () => {
  // Deadlift has rich legacy history; prefill must still come from the seed.
  const rx = E.prescribe(plan, history, 'PullA', slot('PullA', 'deadlift'), meso);
  assert.equal(rx.basis, 'seed');
});

const mkEntry = (date, type, id, sets, phase = 'meso1') => ({
  date, session_type: type, phase, week: 1,
  exercises: [{ id, name: id, sets }],
});

ok('double progression: all sets at top → +5 upper, reps reset to min', () => {
  const h = [...history, mkEntry('2026-07-21', 'PushA', 'machine-chest-press', [
    { weight: 195, reps: 10 }, { weight: 195, reps: 10 }, { weight: 195, reps: 10 },
  ])];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso);
  assert.equal(rx.basis, 'progress');
  assert.equal(rx.sets[0].weight, 200);
  assert.equal(rx.sets[0].reps, 8);
});
ok('double progression: +10 for deadlift', () => {
  const h = [...history, mkEntry('2026-07-21', 'PullA', 'deadlift', [
    { weight: 235, reps: 6 }, { weight: 235, reps: 6 }, { weight: 235, reps: 6 }, { weight: 235, reps: 6 },
  ])];
  const rx = E.prescribe(plan, h, 'PullA', slot('PullA', 'deadlift'), meso);
  assert.equal(rx.sets[0].weight, 245);
});
ok('incomplete session never triggers progression', () => {
  const h = [...history, mkEntry('2026-07-21', 'PushA', 'machine-chest-press', [
    { weight: 195, reps: 10 }, { weight: 195, reps: 10 },
  ])];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso);
  assert.equal(rx.basis, 'repeat');
  assert.equal(rx.sets[0].weight, 195);
});
ok('short of top reps → repeat weight, keep reps', () => {
  const h = [...history, mkEntry('2026-07-21', 'PushA', 'machine-chest-press', [
    { weight: 195, reps: 10 }, { weight: 195, reps: 9 }, { weight: 195, reps: 8 },
  ])];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso);
  assert.equal(rx.basis, 'repeat');
  assert.equal(rx.sets[0].weight, 195);
  assert.equal(rx.sets[2].reps, 8);
});
ok('pyramid weights progress per set', () => {
  const h = [...history, mkEntry('2026-07-21', 'PullA', 'deadlift', [
    { weight: 225, reps: 6 }, { weight: 245, reps: 6 }, { weight: 255, reps: 6 }, { weight: 265, reps: 6 },
  ])];
  const rx = E.prescribe(plan, h, 'PullA', slot('PullA', 'deadlift'), meso);
  assert.deepEqual(rx.sets.map((s) => s.weight), [235, 255, 265, 275]);
});

const deload = E.phaseForDate(plan, '2026-08-20');
ok('deload: −20% load, ~60% sets (4 → 2)', () => {
  const h = [...history, mkEntry('2026-08-10', 'PushA', 'smith-incline-press', [
    { weight: 200, reps: 8 }, { weight: 200, reps: 8 }, { weight: 200, reps: 8 }, { weight: 200, reps: 7 },
  ])];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'smith-incline-press'), deload);
  assert.equal(rx.basis, 'deload');
  assert.equal(rx.sets.length, 2);
  assert.equal(rx.sets[0].weight, 160);
});
ok('meso 2 progresses off meso 1, skipping the deload entry', () => {
  const meso2 = E.phaseForDate(plan, '2026-08-25');
  const h = [...history,
    mkEntry('2026-08-10', 'PushA', 'smith-incline-press', [{ weight: 200, reps: 8 }, { weight: 200, reps: 8 }, { weight: 200, reps: 8 }, { weight: 200, reps: 8 }], 'meso1'),
    mkEntry('2026-08-19', 'PushA', 'smith-incline-press', [{ weight: 160, reps: 6 }, { weight: 160, reps: 6 }], 'deload1'),
  ];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'smith-incline-press'), meso2);
  assert.equal(rx.basis, 'progress');
  assert.equal(rx.sets[0].weight, 205);
});
ok('prep holds weight even at top of range', () => {
  const prep = E.phaseForDate(plan, '2026-11-20');
  const h = [...history, mkEntry('2026-11-15', 'PushA', 'machine-chest-press', [
    { weight: 225, reps: 10 }, { weight: 225, reps: 10 }, { weight: 225, reps: 10 },
  ], 'prep')];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), prep);
  assert.equal(rx.basis, 'hold');
  assert.equal(rx.sets[0].weight, 225);
});

// ——— Stall detection ———
ok('3 flat sessions → stalled', () => {
  const flat = (d) => mkEntry(d, 'PushA', 'machine-chest-press', [
    { weight: 195, reps: 9 }, { weight: 195, reps: 8 }, { weight: 195, reps: 8 },
  ]);
  const h = [...history, flat('2026-07-21'), flat('2026-07-28'), flat('2026-08-04')];
  assert.equal(E.isStalled(plan, h, 'PushA', slot('PushA', 'machine-chest-press')), true);
});
ok('weight increase clears the stall', () => {
  const h = [...history,
    mkEntry('2026-07-21', 'PushA', 'machine-chest-press', [{ weight: 195, reps: 9 }]),
    mkEntry('2026-07-28', 'PushA', 'machine-chest-press', [{ weight: 195, reps: 10 }]),
    mkEntry('2026-08-04', 'PushA', 'machine-chest-press', [{ weight: 200, reps: 8 }]),
  ];
  assert.equal(E.isStalled(plan, h, 'PushA', slot('PushA', 'machine-chest-press')), false);
});
ok('legacy history alone never stalls', () => {
  assert.equal(E.stalledLifts(plan, history).length, 0);
});

// ——— PRs ———
ok('deadlift best ignores the 290×0 miss', () => {
  assert.equal(E.allTimeBest(history, 'deadlift').weight, 285);
});
ok('290×1 would be a PR, 285 is not', () => {
  assert.equal(E.isPR(history, 'deadlift', 290, 1), true);
  assert.equal(E.isPR(history, 'deadlift', 285, 5), false);
});

// ——— Validation ———
ok('>25% deviation from trailing average warns, with user-checkable math', () => {
  const warns = E.validateSet(plan, history, 'deadlift', 150, 5);
  const m = warns.find((w) => w.code === 'dev')?.msg ?? '';
  const [, pct, dir, avg] = m.match(/(\d+)% (lighter|heavier) than your recent top sets \(avg (\d+) lb\)/) ?? [];
  assert.ok(pct, `dev message malformed: ${m}`);
  assert.equal(dir, 'lighter');
  assert.equal(Number(pct), Math.round(Math.abs(150 - Number(avg)) / Number(avg) * 100), 'shown % must match shown avg');
  assert.equal(warns.some((w) => w.code === 'dev'), true);
});
ok('normal weight passes clean', () => {
  assert.equal(E.validateSet(plan, history, 'deadlift', 265, 5).length, 0);
});
ok('reps > 30 warns', () => {
  assert.equal(E.validateSet(plan, history, 'deadlift', 265, 31).some((w) => w.code === 'reps'), true);
});
ok('zero weight on a loaded lift warns; bodyweight lifts exempt', () => {
  assert.equal(E.validateSet(plan, history, 'deadlift', 0, 5).some((w) => w.code === 'zero'), true);
  assert.equal(E.validateSet(plan, history, 'hanging-leg-raise', 0, 10).length, 0);
});

// ——— Coach-audit rules ———
ok('rep gains at the same weight clear the stall flag', () => {
  const mk = (d, reps) => mkEntry(d, 'PushA', 'machine-chest-press',
    reps.map((r) => ({ weight: 195, reps: r })));
  const h = [...history, mk('2026-07-21', [8, 8, 8]), mk('2026-07-28', [9, 8, 8]), mk('2026-08-04', [10, 9, 8])];
  assert.equal(E.isStalled(plan, h, 'PushA', slot('PushA', 'machine-chest-press')), false);
});
ok('progressing out of calibration returns at least to the seed', () => {
  const h = [...history, {
    date: '2026-07-15', session_type: 'PushA', phase: 'calibration', week: 1,
    exercises: [{ id: 'smith-incline-press', name: 'x', sets: [6, 6, 6, 6].map(() => ({ weight: 167.5, reps: 8 })) }],
  }];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'smith-incline-press'), E.phaseForDate(plan, '2026-07-21'));
  assert.equal(rx.basis, 'progress');
  assert.equal(rx.sets[0].weight, 185); // max(seed 185, 167.5 + 5)
});
ok('smashing the ceiling by 2+ reps earns a double jump', () => {
  const h = [...history, mkEntry('2026-07-21', 'PushA', 'machine-chest-press', [
    { weight: 195, reps: 12 }, { weight: 195, reps: 12 }, { weight: 195, reps: 12 },
  ])];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso);
  assert.equal(rx.sets[0].weight, 205); // +10 instead of +5
});
ok('rep PR at a held weight is detected; matching reps are not', () => {
  assert.equal(E.isRepPR(history, 'deadlift', 255, 7), true);  // best at 255 is 6
  assert.equal(E.isRepPR(history, 'deadlift', 255, 6), false);
  assert.equal(E.isRepPR(history, 'deadlift', 999, 5), false); // never lifted
});

console.log(`\n${n} engine tests passed`);

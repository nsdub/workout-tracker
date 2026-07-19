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
ok('calibration: 90% rounded DOWN to the program grid, never off it (170 → 150)', () => {
  const rx = E.prescribe(plan, history, 'PushA', slot('PushA', 'smith-incline-press'), calib);
  assert.equal(rx.basis, 'calibration');
  assert.equal(rx.sets.length, 4);
  // 170 × 0.9 = 153 → floored to the 5 lb upper grid = 150. NEVER 155
  // (that rounded UP, above the 90% target).
  assert.equal(rx.sets[0].weight, 150);
  assert.equal(rx.sets[0].reps, 6);
});
ok('calibration: cables/machines land on real, loadable weights', () => {
  const w = (id) => E.prescribe(plan, history, 'PushA', slot('PushA', id), calib).sets[0].weight;
  assert.equal(w('machine-chest-press'), 135);        // 135 is exactly 90% AND on the grid — no floor needed
  assert.equal(w('cable-crossover-low-high'), 12.5);  // 13.95 → 12.5 on its 2.5 lb stack, not 15 (above 90%)
  assert.equal(w('rope-pushdown'), 50);               // 51.75 → 50, not 52.5 (above 90%)
  assert.equal(w('cable-lateral-raise'), 7.5);        // 9.45 → 7.5 on its 2.5 lb stack, not 10 (above 90%)
});
ok('calibration: lower lifts round down to the 10 lb grid (240 → 210)', () => {
  const rx = E.prescribe(plan, history, 'LegsA', slot('LegsA', 'leg-press-low'), calib);
  assert.equal(rx.sets[0].weight, 210);               // 240 × 0.9 = 216 → floored to 10 = 210, not 215
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
  assert.equal(rx.sets[0].weight, 170);
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
ok('deload: rounds DOWN, never up past the 80% target (205 → 160)', () => {
  const h = [...history, mkEntry('2026-08-10', 'PushA', 'smith-incline-press', [
    { weight: 205, reps: 8 }, { weight: 205, reps: 8 }, { weight: 205, reps: 8 }, { weight: 205, reps: 8 },
  ])];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'smith-incline-press'), deload);
  // 205 × 0.8 = 164 → floored to 5 = 160. The old 2.5-grid gave 165, ABOVE the 80% target.
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
  // no options: legacy entries normalize at factor 1 and no phase scales the
  // expectation, so the classic build-phase wording (and math) must hold.
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
    exercises: [{ id: 'smith-incline-press', name: 'x', sets: [6, 6, 6, 6].map(() => ({ weight: 155, reps: 8 })) }],
  }];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'smith-incline-press'), E.phaseForDate(plan, '2026-07-21'));
  assert.equal(rx.basis, 'progress');
  assert.equal(rx.sets[0].weight, 170); // max(seed 170, 155 + 5) — the earned floor binds
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

// ——— Honest % math (backoffInfo + phase-aware validation) ———
const mkSets = (w, r, count = 3) => Array.from({ length: count }, () => ({ weight: w, reps: r }));
// a plausible meso 1: four PushA visits climbing 175 → 180
const meso1Push = [
  mkEntry('2026-07-23', 'PushA', 'smith-incline-press', mkSets(175, 8, 4)),
  mkEntry('2026-07-30', 'PushA', 'smith-incline-press', mkSets(175, 8, 4)),
  mkEntry('2026-08-06', 'PushA', 'smith-incline-press', mkSets(180, 8, 4)),
  mkEntry('2026-08-13', 'PushA', 'smith-incline-press', mkSets(180, 8, 4)),
];

ok('backoffInfo reports the post-grid ratio, not the nominal target', () => {
  assert.deepEqual(E.backoffInfo(255, 0.9, 10), { weight: 220, pct: 86 }); // "90%" that is really 86
  assert.deepEqual(E.backoffInfo(35, 0.9, 5), { weight: 30, pct: 86 });
  assert.deepEqual(E.backoffInfo(180, 0.8, 5), { weight: 140, pct: 78 }); // "80%" that is really 78
  assert.deepEqual(E.backoffInfo(205, 0.8, 10), { weight: 160, pct: 78 });
});
ok('prescribe surfaces the real pct alongside the back-off weight', () => {
  const rx = E.prescribe(plan, history, 'PushA', slot('PushA', 'smith-incline-press'), calib);
  assert.equal(rx.sets[0].weight, 150);
  assert.equal(rx.pct, 88); // 150/170 — the label must never claim "90%"
  const h = [...history, mkEntry('2026-08-10', 'PushA', 'smith-incline-press', mkSets(180, 8, 4))];
  const drx = E.prescribe(plan, h, 'PushA', slot('PushA', 'smith-incline-press'), deload);
  assert.equal(drx.sets[0].weight, 140);
  assert.equal(drx.pct, 78); // 140/180, measured on the top set
});
ok("deload: the app's own 80% weight never trips the deviation warning", () => {
  const h = [...history, ...meso1Push];
  const { phase } = E.phaseForDate(plan, '2026-08-17');
  const warns = E.validateSet(plan, h, 'smith-incline-press', 140, 6, { phase });
  assert.equal(warns.some((w) => w.code === 'dev'), false);
  // small weights are where the grid floor bites hardest: incline-db-curl
  // history sits flat at 30, the deload ask is 20 — 33% off the raw average
  // and screaming, but dead-on for a −20% week measured honestly.
  const curl = E.validateSet(plan, history, 'incline-db-curl', 20, 6, { phase });
  assert.equal(curl.some((w) => w.code === 'dev'), false);
});
ok('deload: a genuine typo still warns, with honest recomputable numbers', () => {
  const h = [...history, ...meso1Push];
  const { phase } = E.phaseForDate(plan, '2026-08-17');
  const warns = E.validateSet(plan, h, 'smith-incline-press', 40, 6, { phase });
  const m = warns.find((w) => w.code === 'dev')?.msg ?? '';
  const [, pct, dir, exp] = m.match(/(\d+)% (lighter|heavier) than expected for deload \(~(\d+) lb = 80% of your (\d+) lb average\)/) ?? [];
  assert.ok(pct, `dev message malformed: ${m}`);
  assert.equal(dir, 'lighter');
  assert.equal(Number(pct), Math.round(Math.abs(40 - Number(exp)) / Number(exp) * 100), 'shown % must recompute from the shown lb figure');
  const heavy = E.validateSet(plan, h, 'smith-incline-press', 400, 6, { phase });
  assert.ok(heavy.find((w) => w.code === 'dev')?.msg.includes('heavier'));
});
ok('week after deload: deload entries are normalized, not averaged raw', () => {
  const h = [...history, ...meso1Push,
    mkEntry('2026-08-17', 'PushA', 'smith-incline-press', mkSets(140, 6, 2), 'deload1')];
  const { phase } = E.phaseForDate(plan, '2026-08-24');
  const warns = E.validateSet(plan, h, 'smith-incline-press', 185, 6, { phase });
  assert.equal(warns.some((w) => w.code === 'dev'), false);
});
ok("calibration entries are normalized into meso 1's baseline", () => {
  const h = [...history,
    mkEntry('2026-07-14', 'PushA', 'smith-incline-press', mkSets(165, 6, 4), 'calibration'),
    mkEntry('2026-07-16', 'PushA', 'smith-incline-press', mkSets(165, 6, 4), 'calibration'),
    mkEntry('2026-07-18', 'PushA', 'smith-incline-press', mkSets(165, 6, 4), 'calibration')];
  const warns = E.validateSet(plan, h, 'smith-incline-press', 185, 8, { phase: meso.phase });
  assert.equal(warns.some((w) => w.code === 'dev'), false);
});
ok('a weight equal to the prescription never warns (db-curl real-data regression)', () => {
  // legacy db-curl tops run 65–70 lb (per-pair logging); the calibration ask
  // from the 30 lb seed is 25 lb — a "60% lighter" screamer without immunity.
  const rx = E.prescribe(plan, history, 'PullA', slot('PullA', 'db-curl'), calib);
  assert.equal(rx.sets[0].weight, 25);
  const bare = E.validateSet(plan, history, 'db-curl', 25, 10, { phase: calib.phase });
  assert.equal(bare.some((w) => w.code === 'dev'), true, 'unfenceable legacy data still deviates');
  const warns = E.validateSet(plan, history, 'db-curl', 25, 10, { phase: calib.phase, prescribed: rx.sets[0].weight });
  assert.equal(warns.some((w) => w.code === 'dev'), false, 'the app never second-guesses its own ask');
});

// ——— Trainer-audit progression guards ———
ok('a per-exercise increment override wins over the upper/lower rule', () => {
  const p = { ...plan, exercises: { ...plan.exercises, 'db-fly': { name: 'DB Fly', increment: 2.5 } } };
  assert.equal(E.increment(p, 'db-fly'), 2.5);
  assert.equal(E.increment(plan, 'db-curl'), 5);   // defaults untouched
  assert.equal(E.increment(plan, 'deadlift'), 10);
});
ok('calibration exit: a top far under the reduced ask never teleports to the seed', () => {
  // real shape: incline-db-curl seed 20, calibration ask 15, lifter managed 12.5
  const h = [...history, mkEntry('2026-07-16', 'PullB', 'incline-db-curl', mkSets(12.5, 10, 3), 'calibration')];
  const rx = E.prescribe(plan, h, 'PullB', slot('PullB', 'incline-db-curl'), E.phaseForDate(plan, '2026-07-21'));
  assert.equal(rx.basis, 'progress');
  assert.equal(rx.sets[0].weight, 17.5); // 12.5 + 5, never seed 20 (+60% overnight)
});
ok('calibration exit: face-pulls climb by their 2.5 lb stack step', () => {
  const h = [...history, mkEntry('2026-07-15', 'PushA', 'face-pulls', mkSets(22.5, 15, 2), 'calibration')];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'face-pulls'), E.phaseForDate(plan, '2026-07-21'));
  assert.equal(rx.sets[0].weight, 25); // earned floor (22.5 ≥ the 20 ask) + one 2.5 cable step, never a +5 leap
});
ok('isolation lifts never double-jump, whatever the rep surplus', () => {
  // compound branch is pinned by the machine-chest-press double-jump test above
  const h = [...history, mkEntry('2026-07-21', 'PullA', 'db-curl', mkSets(35, 12, 3))];
  const rx = E.prescribe(plan, h, 'PullA', slot('PullA', 'db-curl'), meso);
  assert.equal(rx.basis, 'progress');
  assert.equal(rx.sets[0].weight, 40); // +5, never +10 on a curl
});
ok('oscillating back to an old weight is a stall, not progress', () => {
  const swing = (d, w) => mkEntry(d, 'PushA', 'machine-chest-press', mkSets(w, 8, 3));
  const h = [...history, swing('2026-07-21', 200), swing('2026-07-28', 195), swing('2026-08-04', 200), swing('2026-08-11', 195)];
  assert.equal(E.isStalled(plan, h, 'PushA', slot('PushA', 'machine-chest-press')), true);
});
ok('a trigger met for 3 flat sessions is a stall (fixed rep slots can trap)', () => {
  // face-pulls 15/15: progressionMet fires every visit, weight never moves
  const fp = (d) => mkEntry(d, 'PushA', 'face-pulls', mkSets(40, 15, 2));
  const h = [...history, fp('2026-07-21'), fp('2026-07-28'), fp('2026-08-04')];
  assert.equal(E.isStalled(plan, h, 'PushA', slot('PushA', 'face-pulls')), true);
});
ok('bodyweight prescription anchors on the best set, not the first (9,8,10 → 10)', () => {
  const h = [...history, mkEntry('2026-07-22', 'PushB', 'assisted-dips', [
    { weight: 0, reps: 9 }, { weight: 0, reps: 8 }, { weight: 0, reps: 10 },
  ])];
  const rx = E.prescribe(plan, h, 'PushB', slot('PushB', 'assisted-dips'), meso);
  assert.equal(rx.basis, 'bodyweight');
  assert.equal(rx.sets[0].reps, 10);
});

// ——— Conditioning (supplemental) entries are fenced from all lifting logic ———
ok('supplemental conditioning entry never moves rotation, PRs, or prescriptions', () => {
  const lifts = [
    { date: '2026-07-20', session_type: 'PushA', phase: 'meso1', exercises: [{ id: 'zz', name: 'ZZ', sets: [{ weight: 100, reps: 5 }] }] },
    { date: '2026-07-21', session_type: 'PullA', phase: 'meso1', exercises: [{ id: 'zz', name: 'ZZ', sets: [{ weight: 200, reps: 5 }] }] },
  ];
  const cardio = { date: '2026-07-22', session_type: 'cardio', supplemental: true, exercises: [], conditioning: { modality: 'Run', mins: 25, intensity: 'Easy' } };
  const withCardio = [...lifts, cardio];
  // "what's next" follows the last LIFT (PullA → LegsA), never resets to rot[0]
  assert.equal(E.rotationNext(plan, lifts), 'LegsA');
  assert.equal(E.rotationNext(plan, withCardio), 'LegsA');
  // best/PR readers ignore it and never throw on its empty exercises
  assert.equal(E.allTimeBest(withCardio, 'zz').weight, 200);
  assert.doesNotThrow(() => E.isRepPR(withCardio, 'zz', 200, 6));
});

console.log(`\n${n} engine tests passed`);

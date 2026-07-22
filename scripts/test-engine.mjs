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
  // The cable-stack lifts snap to the machine's REAL pins (5 lb plates + two
  // 1.5 micros), never to the fictional 2.5 grid the old tests demanded:
  assert.equal(w('cable-crossover-low-high'), 12.5);  // 13.95 → pin 12.5 (the next pin, 14, overshoots the 90% target)
  assert.equal(w('rope-pushdown'), 50.5);             // 51.75 → pin 50.5; the old ask of 50 does not exist on this stack
  assert.equal(w('cable-lateral-raise'), 9);          // 9.45 → pin 9 (7.5+1.5); the old 7.5 gave away 1.5 lb for no reason
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
ok('deload keeps the WORKING sets of a ramp, not the warm-ups', () => {
  // A ramp deloaded from the front kept 155/185 and threw the 205 top set
  // away, while the card claimed "140 lb = 78% of 205" — arithmetic that was
  // simply false. The cut must take the last nSets.
  const h = [...history, mkEntry('2026-08-10', 'LegsB', 'smith-rdl', [
    { weight: 155, reps: 8 }, { weight: 185, reps: 8 }, { weight: 205, reps: 8 }, { weight: 205, reps: 8 },
  ])];
  const rx = E.prescribe(plan, h, 'LegsB', slot('LegsB', 'smith-rdl'), deload);
  assert.equal(rx.sets.length, 2);
  assert.deepEqual(rx.sets.map((s) => s.weight), [160, 160]);
  assert.equal(rx.prevTop, 205);
  // the headline % must be TRUE of the heaviest weight actually prescribed
  assert.equal(Math.round((Math.max(...rx.sets.map((s) => s.weight)) / rx.prevTop) * 100), rx.pct);
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
ok('calibration exit: face-pulls climb one REAL pin (22.5 → 24, never the nonexistent 25)', () => {
  const h = [...history, mkEntry('2026-07-15', 'PushA', 'face-pulls', mkSets(22.5, 15, 2), 'calibration')];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'face-pulls'), E.phaseForDate(plan, '2026-07-21'));
  // The stack pins 22.5 → 24 (+1.5 micro) → 25.5 → 27.5. The old +2.5 rule
  // asked for 25 — a weight this machine cannot make (the user proved it on
  // 2026-07-21 by loading 25.5 against a 25 ask).
  assert.equal(rx.basis, 'progress');
  assert.equal(rx.sets[0].weight, 24);
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

// ——— Machine ladder: prescriptions land on pins that physically exist ———
const LADDER = E.ladderFor(plan, 'face-pulls');
ok('the cable ladder is the photographed machine: 5 lb pins + two 1.5 micros', () => {
  assert.deepEqual(LADDER.slice(0, 6), [2.5, 4, 5.5, 7.5, 9, 10.5]);
  assert.equal(LADDER[LADDER.length - 1], 100.5); // 97.5 pin + both micros
  assert.equal(E.ladderUp(LADDER, 22.5), 24);
  assert.equal(E.ladderUp(LADDER, 24), 25.5);
  assert.equal(E.ladderUp(LADDER, 25.5), 27.5);
  assert.equal(E.ladderUp(LADDER, 100.5), null); // top of the stack: no higher pin
  assert.equal(E.ladderDown(LADDER, 20.25), 19);
  assert.equal(E.ladderNearest(LADDER, 25), 25.5); // ties and near-misses resolve to a real pin
});
ok('every weight prescribed for a laddered lift is a loadable pin (full sweep)', () => {
  const pins = new Set(LADDER);
  for (const [type, session] of Object.entries(plan.sessions)) {
    for (const sl of session.exercises) {
      if (!E.exMeta(plan, sl.id).gear) continue;
      for (const ph of [calib, meso]) {
        for (const s of E.prescribe(plan, history, type, sl, ph).sets) {
          if (s.weight != null) assert.ok(pins.has(s.weight), `${type}/${sl.id}: ${s.weight} is not a pin`);
        }
      }
    }
  }
});
ok('repeat of an off-pin logged weight snaps to the nearest real pin', () => {
  const h = [...history, mkEntry('2026-07-22', 'PushA', 'face-pulls', [
    { weight: 25, reps: 14 }, { weight: 25, reps: 15 }, // 25 does not exist on this stack
  ])];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'face-pulls'), meso);
  assert.equal(rx.basis, 'repeat');
  assert.equal(rx.sets[0].weight, 25.5);
});
ok('at the top of the stack the weight holds AND the earned reps hold', () => {
  const h = [...history, mkEntry('2026-07-22', 'PullA', 'cable-hammer-curl', mkSets(100.5, 12, 3))];
  const rx = E.prescribe(plan, h, 'PullA', slot('PullA', 'cable-hammer-curl'), meso);
  assert.equal(rx.sets[0].weight, 100.5); // never null, never an imaginary heavier pin
  assert.equal(rx.sets[0].reps, 12);      // a raise that doesn't exist must not reset reps to the floor
  assert.equal(rx.increment, 0);          // the card renders the honest "top of the stack" line off this
});
ok('a zero-weight set is never climbed FROM on the progress path either', () => {
  // the same anomaly applyCross already refused to touch: +5 from 0 invents a
  // 5 lb "working set"; a ladder step from 0 lands on the lightest pin.
  // reps 10 = repMax exactly → the single +5 step (12 would earn the
  // compound double-jump and muddy what this test is pinning)
  const h = [...history, mkEntry('2026-07-21', 'PushA', 'machine-chest-press', [
    { weight: 0, reps: 10 }, { weight: 195, reps: 10 }, { weight: 195, reps: 10 },
  ])];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso);
  assert.equal(rx.basis, 'progress');
  assert.deepEqual(rx.sets.map((s) => s.weight), [0, 200, 200]);
  const lad = [...history, mkEntry('2026-07-21', 'PullB', 'face-pulls', [
    { weight: 0, reps: 15 }, { weight: 25.5, reps: 15 },
  ])];
  const lrx = E.prescribe(plan, lad, 'PullB', slot('PullB', 'face-pulls'), meso);
  assert.equal(lrx.sets[0].weight, 0, 'a ladder step from 0 must not land on the lightest pin');
});
ok('the card’s LAST strip is the visit prescribe actually read, fences and all', () => {
  // a deload entry is the most recent same-day-type visit, but the meso
  // prescription deliberately skips it — so the strip must show the meso
  // visit, not the deload, or the card contradicts its own sentence again.
  const meso2 = E.phaseForDate(plan, '2026-08-25');
  const h = [...history,
    mkEntry('2026-08-10', 'PushA', 'machine-chest-press', mkSets(195, 10, 3), 'meso1'),
    mkEntry('2026-08-19', 'PushA', 'machine-chest-press', mkSets(155, 6, 2), 'deload1'),
  ];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso2);
  assert.equal(rx.source.date, '2026-08-10', 'source must be the visit the numbers came from');
  const row = E.previewSession(plan, h, 'PushA', meso2).find((r) => r.id === 'machine-chest-press');
  assert.equal(row.last.date, '2026-08-10', 'the displayed strip must match that same visit');
});
ok('a zero-weight set inside a real shape is never teleported to the cross top', () => {
  const h = [...history,
    mkEntry('2026-07-16', 'PushA', 'machine-chest-press', [
      { weight: 0, reps: 9 }, { weight: 142.5, reps: 9 }, { weight: 150, reps: 9 }]),
    mkEntry('2026-07-20', 'PushB', 'machine-chest-press', mkSets(157.5, 10, 3)),
  ];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso);
  assert.equal(rx.basis, 'cross');
  assert.deepEqual(rx.sets.map((s) => s.weight), [0, 150, 157.5]); // the anomaly stays an anomaly
});

// ——— Set-shape sanity: performed order + no up-then-down echoes ———
ok('prescriptions follow performed order (timestamps), not storage order', () => {
  // real shape from 2026-07-20 PushB: array [157.5, 142.5, 150] but the
  // timestamps prove a clean ascending ramp — the next ask must be the ramp,
  // not the scrambled array.
  const h = [...history, mkEntry('2026-07-22', 'PushB', 'machine-chest-press', [
    { weight: 157.5, reps: 10, at: 3000 }, { weight: 142.5, reps: 10, at: 1000 }, { weight: 150, reps: 10, at: 2000 },
  ])];
  const rx = E.prescribe(plan, h, 'PushB', slot('PushB', 'machine-chest-press'), meso);
  assert.equal(rx.basis, 'repeat'); // 10s in a 10–12 range: trigger not met
  assert.deepEqual(rx.sets.map((s) => s.weight), [142.5, 150, 157.5]);
});
ok('one night’s mid-set dip is never echoed back as a target (30/37.5/30 → 30/37.5/37.5)', () => {
  // real shape from 2026-07-13 PullB straight-arm-pulldown; on 2026-07-21 the
  // app replayed the dip verbatim and the user rightly called it out.
  const h = [...history, mkEntry('2026-07-22', 'PullB', 'straight-arm-pulldown', [
    { weight: 30, reps: 13 }, { weight: 37.5, reps: 12 }, { weight: 30, reps: 12 },
  ])];
  const rx = E.prescribe(plan, h, 'PullB', slot('PullB', 'straight-arm-pulldown'), meso);
  assert.deepEqual(rx.sets.map((s) => s.weight), [30, 37.5, 37.5]);
  assert.deepEqual(rx.sets.map((s) => s.reps), [13, 12, 12]);
});

// ——— Cross-day progression: overlap days share their evidence ———
ok('a fresher, heavier day raises the whole shape (shape preserved)', () => {
  const h = [...history,
    mkEntry('2026-07-16', 'PushA', 'machine-chest-press', [
      { weight: 120, reps: 10 }, { weight: 142.5, reps: 8 }, { weight: 150, reps: 10 }]),
    mkEntry('2026-07-20', 'PushB', 'machine-chest-press', [
      { weight: 142.5, reps: 10 }, { weight: 150, reps: 10 }, { weight: 157.5, reps: 10 }]),
  ];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso);
  assert.equal(rx.basis, 'cross');
  assert.equal(rx.cross.sessionType, 'PushB');
  assert.equal(rx.cross.weight, 157.5);
  // the PushA ramp survives, shifted up so its top lands on the proven weight
  assert.deepEqual(rx.sets.map((s) => s.weight), [127.5, 150, 157.5]);
});
ok('cross-day evidence must satisfy THIS slot’s rep floor', () => {
  // a heavy 157.5×6 on another day says nothing about an 8–10 slot
  const h = [...history,
    mkEntry('2026-07-16', 'PushA', 'machine-chest-press', mkSets(150, 9, 3)),
    mkEntry('2026-07-20', 'PushB', 'machine-chest-press', mkSets(157.5, 6, 3)),
  ];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso);
  assert.equal(rx.basis, 'repeat');
  assert.equal(rx.sets[0].weight, 150);
});
ok('cross-day floor fills a day that has NO history of the exercise yet', () => {
  // face-pulls close 4 days from one shared seed; a PushA that never logged
  // them post-calibration starts where the freshest day left off, not at seed
  const h = [...history, mkEntry('2026-07-21', 'PullB', 'face-pulls', mkSets(25.5, 15, 2))];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'face-pulls'), meso);
  assert.equal(rx.basis, 'cross');
  assert.deepEqual(rx.sets.map((s) => s.weight), [25.5, 25.5]);
});
ok('two sessions on ONE date: the other day’s proof still counts', () => {
  // real in this history — 2026-01-10 PushA+PullA, 2026-02-13 PullA+PullB.
  // A `<=` fence used to discard same-date evidence entirely, silently
  // breaking the "progress carries across days" promise on the Mission screen.
  const h = [...history,
    mkEntry('2026-07-23', 'PushA', 'machine-chest-press', mkSets(150, 9, 3)),
    mkEntry('2026-07-23', 'PushB', 'machine-chest-press', mkSets(160, 12, 3)),
  ];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso);
  assert.equal(rx.basis, 'cross');
  assert.equal(rx.cross.date, '2026-07-23');
  assert.equal(rx.sets[0].weight, 160);
});
ok('older cross-day work never overrides this day’s own newer choice', () => {
  const h = [...history,
    mkEntry('2026-07-16', 'PushB', 'machine-chest-press', mkSets(157.5, 10, 3)),
    mkEntry('2026-07-20', 'PushA', 'machine-chest-press', mkSets(145, 9, 3)), // deliberate back-off after the 157.5s
  ];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), meso);
  assert.equal(rx.basis, 'repeat');
  assert.equal(rx.sets[0].weight, 145);
});
ok('deload entries never set the cross-day floor', () => {
  const h = [...history,
    mkEntry('2026-07-16', 'PushA', 'machine-chest-press', mkSets(150, 9, 3)),
    mkEntry('2026-08-19', 'PushB', 'machine-chest-press', mkSets(160, 12, 3), 'deload1'),
  ];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), E.phaseForDate(plan, '2026-08-25'));
  assert.equal(rx.basis, 'repeat');
  assert.equal(rx.sets[0].weight, 150);
});
ok('prep holds: no cross-day raises either', () => {
  const prep = E.phaseForDate(plan, '2026-11-20');
  const h = [...history,
    mkEntry('2026-11-15', 'PushA', 'machine-chest-press', mkSets(225, 10, 3), 'prep'),
    mkEntry('2026-11-17', 'PushB', 'machine-chest-press', mkSets(235, 10, 3), 'prep'),
  ];
  const rx = E.prescribe(plan, h, 'PushA', slot('PushA', 'machine-chest-press'), prep);
  assert.equal(rx.basis, 'hold');
  assert.equal(rx.sets[0].weight, 225);
});

// ——— Coach directives: the daily trainer review drives the prefills ———
const coachPkt = (over, extra = {}) => ({
  date: '2026-07-22', reviewed_through: '2026-07-21', overrides: over, ...extra,
});
// A packet is only fresh for a few days (COACH_MAX_AGE_DAYS), so coach tests
// prescribe for a night INSIDE that window rather than the generic `meso`
// fixture five days later — which is itself the behaviour being asserted.
const mesoNow = E.phaseForDate(plan, '2026-07-22');
ok('a fresh coach override becomes the prescription, reason attached', () => {
  const h = [...history, mkEntry('2026-07-21', 'PullB', 'db-shrug', mkSets(70, 12, 3))];
  const coach = coachPkt([{ exercise: 'db-shrug', session: 'PullB', reason: 'hold here one more week', sets: mkSets(70, 12, 3) }]);
  const rx = E.prescribe(plan, h, 'PullB', slot('PullB', 'db-shrug'), mesoNow, coach);
  assert.equal(rx.basis, 'coach');
  assert.equal(rx.sets[0].weight, 70);
  assert.equal(rx.coach.reason, 'hold here one more week');
});
ok('the moment a session the trainer has not seen is logged, overrides expire', () => {
  const h = [...history,
    mkEntry('2026-07-21', 'PullB', 'db-shrug', mkSets(70, 12, 3)),
    mkEntry('2026-07-22', 'LegsB', 'leg-curl', mkSets(135, 10, 4)),
  ];
  const coach = coachPkt([{ exercise: 'db-shrug', session: 'PullB', sets: mkSets(70, 12, 3) }]);
  assert.equal(E.coachFresh(h, coach), false);
  const rx = E.prescribe(plan, h, 'PullB', slot('PullB', 'db-shrug'), mesoNow, coach);
  assert.equal(rx.basis, 'repeat'); // standing rules take back over, honestly
});
ok('a runaway coach raise is capped two honest steps above proven work', () => {
  // best face-pull since calibration: 25.5. Cap = two pins up = 29.
  const h = [...history, mkEntry('2026-07-21', 'PullB', 'face-pulls', mkSets(25.5, 15, 2))];
  const coach = coachPkt([{ exercise: 'face-pulls', sets: mkSets(60, 15, 2) }]);
  const rx = E.prescribe(plan, h, 'PullB', slot('PullB', 'face-pulls'), mesoNow, coach);
  assert.equal(rx.basis, 'coach');
  assert.equal(rx.sets[0].weight, 29);
});
ok('coach weights snap to real pins; reps clamp to the validation ceiling', () => {
  const h = [...history, mkEntry('2026-07-21', 'PullB', 'face-pulls', mkSets(25.5, 15, 2))];
  const coach = coachPkt([{ exercise: 'face-pulls', sets: [{ weight: 25, reps: 15 }, { weight: 25, reps: 99 }] }]);
  const rx = E.prescribe(plan, h, 'PullB', slot('PullB', 'face-pulls'), mesoNow, coach);
  assert.equal(rx.sets[0].weight, 25.5); // 25 does not exist on the stack
  assert.equal(rx.sets[1].reps, 30);
});
ok('a session-scoped override never leaks onto another day; unscoped applies anywhere', () => {
  const h = [...history, mkEntry('2026-07-20', 'PushB', 'face-pulls', mkSets(24, 15, 2))];
  const scoped = coachPkt([{ exercise: 'face-pulls', session: 'PushB', sets: mkSets(24, 15, 2) }]);
  assert.notEqual(E.prescribe(plan, h, 'PullB', slot('PullB', 'face-pulls'), mesoNow, scoped).basis, 'coach');
  const open = coachPkt([{ exercise: 'face-pulls', sets: mkSets(24, 15, 2) }]);
  assert.equal(E.prescribe(plan, h, 'PullB', slot('PullB', 'face-pulls'), mesoNow, open).basis, 'coach');
});
ok('a packet goes stale by the CALENDAR, not just by new logs', () => {
  // "Nothing logged since" alone let a weeks-old review keep driving the
  // numbers under a banner claiming it had read everything — straight across
  // a rest week and, worse, through a phase boundary into the deload.
  const coach = coachPkt([{ exercise: 'db-shrug', session: 'PullB', reason: 'hold', sets: mkSets(70, 12, 3) }]);
  const h = [...history, mkEntry('2026-07-21', 'PullB', 'db-shrug', mkSets(70, 12, 3))];
  assert.equal(E.coachFresh(h, coach, '2026-07-22'), true);
  assert.equal(E.coachFresh(h, coach, '2026-07-25'), true, 'inside the window');
  assert.equal(E.coachFresh(h, coach, '2026-07-26'), false, 'past the window');
  // and the prescription itself falls back to the standing rules
  const rx = E.prescribe(plan, h, 'PullB', slot('PullB', 'db-shrug'), E.phaseForDate(plan, '2026-08-20'), coach);
  assert.equal(rx.basis, 'deload', 'a stale packet must never override a deload week');
});
ok('coach never touches bodyweight slots; malformed sets are ignored', () => {
  const coach = coachPkt([
    { exercise: 'assisted-dips', sets: mkSets(50, 10, 3) },
    { exercise: 'db-shrug', session: 'PullB', sets: [{ weight: 0, reps: 12 }] },
  ]);
  const dips = E.prescribe(plan, history, 'PushB', slot('PushB', 'assisted-dips'), mesoNow, coach);
  assert.equal(dips.basis, 'bodyweight');
  const shrug = E.prescribe(plan, history, 'PullB', slot('PullB', 'db-shrug'), mesoNow, coach);
  assert.notEqual(shrug.basis, 'coach'); // zero-weight set = malformed, standing rules run
});

// ——— previewSession: the whole night, and it MUST match the session screen ———
ok('previewSession returns every slot with the same numbers prescribe gives', () => {
  const h = [...history, mkEntry('2026-07-21', 'PullB', 'db-shrug', mkSets(70, 12, 3))];
  const rows = E.previewSession(plan, h, 'PullB', meso);
  assert.equal(rows.length, plan.sessions.PullB.exercises.length);
  for (const slot of plan.sessions.PullB.exercises) {
    const row = rows.find((r) => r.id === slot.id);
    const rx = E.prescribe(plan, h, 'PullB', slot, meso);
    assert.deepEqual(row.sets, rx.sets, `${slot.id}: preview and prescribe must never disagree`);
    assert.equal(row.basis, rx.basis);
  }
});
ok('previewSession carries the coach packet and NEVER conflates the two histories', () => {
  // The card once showed the freshest work from ANY day under a sentence about
  // "this day's last visit", so three different sessions appeared at once and
  // the prescribed number matched none of them. last = the visit the numbers
  // came from; other = work done since on a different day. Separate, always.
  const h = [...history,
    mkEntry('2026-07-19', 'PullB', 'face-pulls', mkSets(22.5, 15, 2)),
    mkEntry('2026-07-20', 'PushB', 'face-pulls', mkSets(24, 15, 2)),
  ];
  const coach = coachPkt([{ exercise: 'db-shrug', session: 'PullB', reason: 'hold', sets: mkSets(70, 12, 3) }]);
  const rows = E.previewSession(plan, h, 'PullB', mesoNow, coach);
  assert.equal(rows.find((r) => r.id === 'db-shrug').basis, 'coach');
  const fp = rows.find((r) => r.id === 'face-pulls');
  assert.equal(fp.last.session, 'PullB');   // this day's own visit — what 'repeat' copies
  assert.equal(fp.last.date, '2026-07-19');
  assert.equal(fp.other.session, 'PushB');  // done since, on another day
  assert.equal(fp.other.date, '2026-07-20');
  assert.equal(fp.other.newer, true);
});
ok('no cross-day work → other is null, never a duplicate of last', () => {
  const h = [...history, mkEntry('2026-07-19', 'PullB', 'db-shrug', mkSets(70, 12, 3))];
  const row = E.previewSession(plan, h, 'PullB', meso).find((r) => r.id === 'db-shrug');
  assert.equal(row.last.date, '2026-07-19');
  assert.equal(row.other, null);
});
ok('previewSession is empty for an unknown session type, never throws', () => {
  assert.deepEqual(E.previewSession(plan, history, 'NopeC', meso), []);
});

// ——— Structural decisions: the trainers change the PROGRAM, the athlete rules ———
const prop = (o) => ({ date: '2026-07-22', ...o });
const acc = (p) => ({ proposal: p, decision: 'accepted' });
ok('an accepted removal drops the slot — and plan.json is untouched', () => {
  const p = prop({ kind: 'remove', exercise: 'face-pulls', scope: 'PushA' });
  const live = E.effectivePlan(plan, [acc(p)]);
  assert.equal(live.sessions.PushA.exercises.some((x) => x.id === 'face-pulls'), false);
  assert.equal(plan.sessions.PushA.exercises.some((x) => x.id === 'face-pulls'), true, 'the signed program must never be mutated');
  // scoped: the other days keep theirs
  assert.equal(live.sessions.PullB.exercises.some((x) => x.id === 'face-pulls'), true);
});
ok('declining, or deciding nothing, changes nothing at all', () => {
  const p = prop({ kind: 'remove', exercise: 'plank', scope: 'LegsB' });
  assert.deepEqual(E.effectivePlan(plan, [{ proposal: p, decision: 'declined' }]), plan);
  assert.deepEqual(E.effectivePlan(plan, []), plan);
});
ok('the newest decision on a proposal wins (undo is just another decision)', () => {
  const p = prop({ kind: 'remove', exercise: 'plank', scope: 'LegsB' });
  const live = E.effectivePlan(plan, [acc(p), { proposal: p, decision: 'declined' }]);
  assert.equal(live.sessions.LegsB.exercises.some((x) => x.id === 'plank'), true);
});
ok('volume, swap, reorder and add all apply — and a bogus one is ignored, not guessed', () => {
  const vol = E.effectivePlan(plan, [acc(prop({ kind: 'volume', exercise: 'standing-calf-raise', scope: 'LegsB', sets: 3 }))]);
  assert.equal(vol.sessions.LegsB.exercises.find((x) => x.id === 'standing-calf-raise').sets, 3);
  const sw = E.effectivePlan(plan, [acc(prop({ kind: 'swap', exercise: 'leg-extension', scope: 'LegsB', replacement: 'leg-press-low' }))]);
  assert.equal(sw.sessions.LegsB.exercises.some((x) => x.id === 'leg-press-low'), true);
  assert.equal(sw.sessions.LegsB.exercises.find((x) => x.id === 'leg-press-low').seed, null, 'a swapped-in lift must ask for its weight, not inherit one');
  const ro = E.effectivePlan(plan, [acc(prop({ kind: 'reorder', exercise: 'leg-curl', scope: 'LegsA', position: 0 }))]);
  assert.equal(ro.sessions.LegsA.exercises[0].id, 'leg-curl');
  const add = E.effectivePlan(plan, [acc(prop({ kind: 'add', exercise: 'hip-adductor', scope: 'LegsB', slot: { sets: 2, repMin: 12, repMax: 15 } }))]);
  assert.equal(add.sessions.LegsB.exercises.some((x) => x.id === 'hip-adductor'), true);
  // a swap naming an exercise that does not exist is dropped, never invented
  const bad = E.effectivePlan(plan, [acc(prop({ kind: 'swap', exercise: 'leg-curl', scope: 'LegsB', replacement: 'nordic-ham-curl' }))]);
  assert.deepEqual(bad.sessions.LegsB.exercises.map((x) => x.id), plan.sessions.LegsB.exercises.map((x) => x.id));
});
ok('reprange flips what a slot asks for, without touching the movement', () => {
  // the two push days' ranges were backwards: he pressed HEAVIER on the day
  // labelled lighter, because on PushA the chest is pre-fatigued by inclines.
  const live = E.effectivePlan(plan, [
    acc(prop({ kind: 'reprange', exercise: 'machine-chest-press', scope: 'PushA', repMin: 10, repMax: 12 })),
    acc(prop({ kind: 'reprange', exercise: 'machine-chest-press', scope: 'PushB', repMin: 8, repMax: 10 })),
  ]);
  const a = live.sessions.PushA.exercises.find((x) => x.id === 'machine-chest-press');
  const b = live.sessions.PushB.exercises.find((x) => x.id === 'machine-chest-press');
  assert.deepEqual([a.repMin, a.repMax], [10, 12]);
  assert.deepEqual([b.repMin, b.repMax], [8, 10]);
  assert.equal(a.id, 'machine-chest-press', 'the movement itself is untouched');
  assert.equal(a.sets, plan.sessions.PushA.exercises.find((x) => x.id === 'machine-chest-press').sets);
  // and the new range drives the actual prescription's progression trigger
  const rows = E.previewSession(live, history, 'PushA', meso);
  assert.equal(rows.find((r) => r.id === 'machine-chest-press').repMax, 12);
});
ok('an accepted change flows into the actual prescription', () => {
  const live = E.effectivePlan(plan, [acc(prop({ kind: 'volume', exercise: 'standing-calf-raise', scope: 'LegsB', sets: 3 }))]);
  const rows = E.previewSession(live, history, 'LegsB', meso);
  assert.equal(rows.find((r) => r.id === 'standing-calf-raise').sets.length, 3);
  assert.equal(rows.some((r) => r.id === 'plank'), true, 'untouched slots survive');
});

console.log(`\n${n} engine tests passed`);

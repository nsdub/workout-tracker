#!/usr/bin/env node
// Gate for data/coach/latest.json: the daily review may only be committed if
// this passes. Validates the packet's shape and freshness, checks that the
// REVIEW it carries is complete and that every number it quotes about the
// program is true, then prints exactly what the app will prescribe WITH the
// packet applied — every place the engine's cap changed a coach ask is
// flagged loudly so the reviewing agent can rethink before shipping numbers
// it didn't intend.
// Usage: P3_SCHEDULED=1 node scripts/validate-coach.mjs [path] [YYYY-MM-DD]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../js/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pktPath = process.argv[2] ?? join(root, 'data/coach/latest.json');
const today = process.argv[3] ?? new Date().toLocaleDateString('sv-SE');
// Validate against the program he ACTUALLY RUNS: the trainer's program file,
// or (before one exists) the signed plan with his accepted decisions.
const signed = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const decisions = JSON.parse(readFileSync(join(root, 'data/coach/decisions.json'), 'utf8'));
const programPath = join(root, 'data/coach/program.json');
const program = existsSync(programPath) ? JSON.parse(readFileSync(programPath, 'utf8')) : null;
const plan = E.effectivePlan(signed, decisions, program);
const history = readdirSync(join(root, 'data/history'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'data/history', f), 'utf8')))
  .sort((a, b) => a.date.localeCompare(b.date));

const fail = (msg) => { console.error(`✗ ${msg}`); process.exitCode = 1; };
const warn = (msg) => console.warn(`⚠ ${msg}`);
const pkt = JSON.parse(readFileSync(pktPath, 'utf8'));

const ISO = /^\d{4}-\d{2}-\d{2}$/;
if (!ISO.test(pkt.date ?? '')) fail('date missing or not YYYY-MM-DD');
if (!ISO.test(pkt.reviewed_through ?? '')) fail('reviewed_through missing or not YYYY-MM-DD');
if (typeof pkt.brief !== 'string' || !pkt.brief.trim()) fail('brief missing — the athlete reads this');
// PROVENANCE IS NOT OPTIONAL. The app tells the athlete whether the automatic
// scheduled run produced these numbers or a human/session hand-wrote them, and it
// can only be honest if the packet says so. `scheduled-task` is a claim ONLY
// the scheduled run may make.
const PRODUCERS = ['scheduled-task', 'interactive-session'];
if (!PRODUCERS.includes(pkt.produced_by)) {
  fail(`produced_by must be one of ${PRODUCERS.join(' | ')} — the app shows this to the athlete verbatim`);
}
if (pkt.produced_by === 'scheduled-task' && process.env.P3_SCHEDULED !== '1') {
  fail('produced_by says "scheduled-task" but this is not the scheduled run (set P3_SCHEDULED=1 there) — do not claim automation that did not happen');
}

const lifting = history.filter((e) => !e.supplemental);
const latest = lifting[lifting.length - 1]?.date ?? null;
if (latest && pkt.reviewed_through !== latest) {
  fail(`reviewed_through ${pkt.reviewed_through} ≠ latest logged session ${latest} — the review must ingest everything (or it is stale at birth)`);
}
if (!E.coachFresh(history, pkt)) fail('packet is not fresh against history — the app would ignore every override');

// The old Yes/No cards are gone (v88): the trainer sets the program.
if (Array.isArray(pkt.proposals) && pkt.proposals.length) fail('proposals[] is no longer a thing — program changes go into data/coach/program.json with a change entry, and the app shows them as "what changed"');

for (const f of pkt.flags ?? []) {
  if (typeof f.note !== 'string' || !f.note.trim()) fail(`flag ${JSON.stringify(f)} has no note`);
}

// ——— THE REVIEW: every muscle, every lift, numbers that are true ———
if (!program) {
  warn('no program.json — the review checks below are skipped; run scripts/program-init.mjs');
} else {
  if (pkt.program_version !== program.version) fail(`program_version ${pkt.program_version} ≠ program.json v${program.version}`);
  const review = pkt.review;
  if (!review || typeof review !== 'object') fail('review{} missing — the packet must carry the full program review (block, every muscle, every lift)');
  const MV = ['hold', 'raise', 'cut', 'rotate', 'watch'];
  const LT = ['progressing', 'holding', 'stalled', 'regressing', 'new', 'unlogged'];
  const LV = ['progress', 'hold', 'deload', 'rotate', 'drop', 'watch'];
  const deferred = pkt.deferred ?? [];
  const todays = (program.changes ?? []).filter((c) => c.version === program.version && c.date === pkt.date);
  const planned = E.plannedWeeklyByMuscle(plan);

  if (review?.block) {
    const b = review.block;
    if (!b.verdict || !b.why) fail('review.block needs verdict and why');
    const info = E.phaseForDate(plan, pkt.date);
    if (b.phase && info.phase && b.phase !== info.phase.id) fail(`review.block.phase "${b.phase}" but the calendar says ${info.phase.id}`);
  } else fail('review.block missing — where is he in the plan and is the block on course');

  const muscles = review?.muscles ?? {};
  for (const m of E.MUSCLES) {
    const r = muscles[m];
    const tag = `review.muscles.${m}`;
    if (!r) { fail(`${tag}: missing — every muscle gets a verdict every day`); continue; }
    if (!MV.includes(r.verdict)) fail(`${tag}: verdict must be ${MV.join('|')}`);
    if (typeof r.why !== 'string' || r.why.trim().length < 15) fail(`${tag}: why must be a real sentence`);
    // THE NUMBER ON SCREEN MUST BE TRUE: the planned figure is recomputed
    // from the program, not taken from the packet.
    if (Math.abs((r.planned_weekly_sets ?? -1) - planned[m]) > 0.05) fail(`${tag}: planned_weekly_sets ${r.planned_weekly_sets} but the program plans ${planned[m]}`);
    if (!(typeof r.done_4wk_avg === 'number')) fail(`${tag}: done_4wk_avg required (from the dossier's muscle_week.avg_4wk_done)`);
    if (['raise', 'cut', 'rotate'].includes(r.verdict)) {
      const touched = todays.some((c) => {
        const ex = plan.exercises[c.exercise ?? c.after?.id];
        return c.kind === 'targets' || (ex?.muscles?.primary ?? []).includes(m) || (ex?.muscles?.secondary ?? []).includes(m);
      });
      const def = deferred.some((d) => d.muscle === m);
      if (!touched && !def) fail(`${tag}: verdict "${r.verdict}" but no change today touches ${m} and nothing in deferred[] says when it will — a verdict with no action is a note to self`);
    }
  }
  for (const k of Object.keys(muscles)) if (!E.MUSCLES.includes(k)) fail(`review.muscles.${k}: not a muscle in the list`);

  const programLifts = [...new Set(Object.values(plan.sessions).flatMap((s) => s.exercises.map((x) => x.id)))];
  const lifts = review?.lifts ?? {};
  for (const id of programLifts) {
    const r = lifts[id];
    const tag = `review.lifts.${id}`;
    if (!r) { fail(`${tag}: missing — every lift in the program gets a verdict every day`); continue; }
    if (!LT.includes(r.trend)) fail(`${tag}: trend must be ${LT.join('|')}`);
    if (!LV.includes(r.verdict)) fail(`${tag}: verdict must be ${LV.join('|')}`);
    if (typeof r.why !== 'string' || r.why.trim().length < 15) fail(`${tag}: why must be a real sentence`);
    if (['rotate', 'drop'].includes(r.verdict)) {
      const touched = todays.some((c) => c.exercise === id);
      const def = deferred.some((d) => d.exercise === id);
      if (!touched && !def) fail(`${tag}: verdict "${r.verdict}" but no change today names ${id} and nothing in deferred[] says when — decide it or date it`);
    }
  }
  for (const k of Object.keys(lifts)) if (!programLifts.includes(k)) warn(`review.lifts.${k}: not in the program (a lift just dropped is fine here)`);
  for (const [i, d] of deferred.entries()) {
    if (!ISO.test(d.until ?? '')) fail(`deferred[${i}]: until must be a date`);
    if (!(d.muscle || d.exercise) || !d.why) fail(`deferred[${i}]: needs muscle|exercise and why`);
    if (d.until <= pkt.date) fail(`deferred[${i}]: until ${d.until} is not in the future`);
  }
}

// ——— overrides: tonight's loads ———
const painRecent = (() => {
  // A pain note on a lift inside ten days caps tonight's weight on it at the
  // last logged top set. The recovery seat used to be the only brake; this
  // is the part of the brake a script can hold.
  const PAIN = /pain|tweak|pinch|sharp|hurt|strain|click|numb/i;
  const since = new Date(new Date(today + 'T12:00').getTime() - 10 * 86400000).toLocaleDateString('sv-SE');
  const out = {};
  for (const e of lifting) {
    if (e.date < since) continue;
    for (const x of e.exercises ?? []) if (x.note && PAIN.test(x.note)) out[x.id] = { date: e.date, note: x.note };
  }
  return out;
})();
for (const o of pkt.overrides ?? []) {
  if (!plan.exercises[o.exercise]) fail(`override for unknown exercise "${o.exercise}"`);
  if (o.session && !plan.sessions[o.session]) fail(`override session "${o.session}" is not in the plan`);
  // An override aimed at a lift that isn't a slot in that session is dropped
  // silently by the engine — and the summary below would still have said
  // "every override lands exactly as written". Catch it here instead.
  const inSess = (id) => !!plan.sessions[id]?.exercises?.some((x) => x.id === o.exercise);
  if (o.session && plan.sessions[o.session] && !inSess(o.session)) {
    fail(`override "${o.exercise}" is not a slot in ${o.session} — the app would drop it silently`);
  }
  if (!o.session && !Object.keys(plan.sessions).some(inSess)) {
    fail(`override "${o.exercise}" is not a slot in any session — the app would drop it silently`);
  }
  if (typeof o.reason !== 'string' || !o.reason.trim()) fail(`override ${o.exercise}: reason is required — the card quotes it`);
  if (!Array.isArray(o.sets) || !o.sets.length) fail(`override ${o.exercise}: sets[] required`);
  for (const s of o.sets ?? []) {
    // A bodyweight slot (plank, hanging leg raise, assisted dips) carries
    // weight 0 and prescribes only the hold or the rep count.
    const bw = !!plan.exercises[o.exercise]?.bodyweight;
    if (bw ? (s.weight ?? 0) !== 0 : !(s.weight > 0) || !Number.isFinite(s.weight)) {
      fail(`override ${o.exercise}: bad weight ${s.weight}${bw ? ' — bodyweight slots take weight 0' : ''}`);
    }
    // Seconds are not reps: a timed slot's ceiling is time, not the 30-rep cap.
    const timed = Object.values(plan.sessions).some((sess) => sess.exercises
      .some((x) => x.id === o.exercise && x.repUnit === 'sec'));
    const repCap = timed ? 600 : (plan.rules?.validation?.maxReps ?? 30);
    if (!(s.reps >= 1) || s.reps > repCap) fail(`override ${o.exercise}: bad ${timed ? 'seconds' : 'reps'} ${s.reps}`);
  }
  const pain = painRecent[o.exercise];
  if (pain) {
    const last = E.lastPerformanceAnywhere(history, o.exercise);
    const top = last && E.topSet(last.ex.sets);
    const ask = Math.max(0, ...(o.sets ?? []).map((s) => s.weight ?? 0));
    if (top && ask > top.weight) fail(`override ${o.exercise}: ${ask} lb asked, but he wrote "${pain.note}" on ${pain.date} and last did ${top.weight} — a pain note holds the weight`);
  }
}

const type = pkt.session_expected ?? E.rotationNext(plan, history);
if (!plan.sessions[type]) fail(`session_expected "${type}" is not in the plan`);
const phaseInfo = E.phaseForDate(plan, pkt.date ?? today);

if (process.exitCode) {
  console.error('\nPacket INVALID — do not commit.');
  process.exit(1);
}

console.log(`Packet valid. What the app will show for ${type} (${phaseInfo.phase?.id ?? 'no phase'}), program v${program?.version ?? '—'}:\n`);
let altered = false;
for (const slot of plan.sessions[type].exercises) {
  const rx = E.prescribe(plan, history, type, slot, phaseInfo, pkt);
  const line = rx.sets.map((s) => `${s.weight ?? '—'}×${s.reps}`).join(', ');
  console.log(`  ${slot.id.padEnd(24)} ${rx.basis.padEnd(8)} ${line}${rx.coach?.reason ? `  — "${rx.coach.reason}"` : ''}`);
  const o = (pkt.overrides ?? []).find((q) => q.exercise === slot.id && (!q.session || q.session === type));
  if (o && rx.basis === 'coach') {
    if (o.sets.length !== rx.sets.length) {
      altered = true;
      console.log(`    ⚠ engine changed the SET COUNT: you wrote ${o.sets.length}, the app will show ${rx.sets.length} (slot cap, or the deload's set budget)`);
    }
    o.sets.slice(0, rx.sets.length).forEach((s, i) => {
      if (s.weight !== rx.sets[i].weight || Math.round(s.reps) !== rx.sets[i].reps) {
        altered = true;
        console.log(`    ⚠ engine ALTERED your ask on set ${i + 1}: you wrote ${s.weight}×${s.reps}, the app will show ${rx.sets[i].weight}×${rx.sets[i].reps} (safety cap: two steps above proven work)`);
      }
    });
  }
  if (o && rx.basis !== 'coach') {
    altered = true;
    console.log(`    ⚠ your override was REJECTED (basis=${rx.basis}) — malformed sets or bodyweight slot`);
  }
}
console.log(altered
  ? '\n⚠ At least one ask was altered or rejected — reconsider before committing.'
  : '\n✓ Every override lands exactly as written.');

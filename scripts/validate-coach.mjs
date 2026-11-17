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
import { previousPacket, notesToAnswer, prepFacts, cardNames, duplicateMovements, appBugs, BODYWEIGHT_STALE_DAYS, PREP_WINDOW_DAYS } from './coach-ledger.mjs';

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
  // Every change dated today, whatever version carried it — two versions can
  // land in one day and a verdict acted on by the first is still acted on.
  const todays = (program.changes ?? []).filter((c) => c.date === pkt.date && c.kind !== 'snapshot');
  const planned = E.plannedWeeklyByMuscle(plan);
  const direct = E.directWeeklyByMuscle(plan);

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
    // ONE convention per argument (2026-11-17 audit): the targets judge the
    // weighted figure; the direct figure is stated beside it, recomputed here,
    // so no verdict can quote whichever count happens to suit it.
    if (Math.abs((r.direct_weekly_sets ?? -1) - direct[m]) > 0.05) fail(`${tag}: direct_weekly_sets ${r.direct_weekly_sets} but the program plans ${direct[m]} direct (primary-mover) sets — copy muscle_week.planned_direct`);
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

// ——— EVERY NOTE HE WRITES GETS AN ANSWER ———
// He asked "Does the science support any of your set counts?" on 10 November
// and a week later the review still listed it as open. A note on a card is a
// question to his trainer. Every note since the last packet, plus anything it
// left open, needs an entry in answers[] keyed "<date>:<scope>".
{
  const prev = previousPacket(root, pkt.date);
  const owed = notesToAnswer(history, prev, pkt.date);
  const answers = Array.isArray(pkt.answers) ? pkt.answers : null;
  if (!answers && owed.length) fail(`answers[] missing — ${owed.length} note(s) he wrote need an answer (see the dossier's notes_to_answer)`);
  const byKey = new Map((answers ?? []).map((a) => [a?.key, a]));
  for (const n of owed) {
    const a = byKey.get(n.key);
    const tag = `answers[${n.key}]`;
    if (!a) { fail(`${tag}: he wrote "${n.note.slice(0, 80)}" and the packet does not answer it`); continue; }
    if (!['answered', 'open', 'ack'].includes(a.status)) fail(`${tag}: status must be answered | open | ack`);
    if (typeof a.answer !== 'string' || a.answer.trim().length < 20) fail(`${tag}: answer must be real sentences addressed to him`);
    if (a.note !== n.note) fail(`${tag}: note must quote what he wrote, exactly`);
    if (a.status === 'open' && (typeof a.consequence !== 'string' || !a.consequence.trim())) fail(`${tag}: an open answer must say what it costs him until it is closed`);
  }
  for (const a of answers ?? []) if (!owed.some((n) => n.key === a?.key)) warn(`answers[${a?.key}]: not a note owed today (kept, but check the key)`);
}

// ——— SHOW PREP ———
// 104 days out on 17 November the prep phase was a placeholder, no bodyweight
// had been logged since 23 August, and no review had said what prep would be.
// Inside the prep window every packet carries review.prep, and its numbers are
// recomputed here.
{
  const facts = prepFacts(plan, history, pkt.date);
  if (facts?.in_window) {
    const p = pkt.review?.prep;
    if (!p || typeof p !== 'object') fail(`review.prep missing — the show is ${facts.days_away} days away; every review inside ${PREP_WINDOW_DAYS} days of the show states the prep plan`);
    else {
      if (p.weeks_out !== facts.weeks_out) fail(`review.prep.weeks_out ${p.weeks_out} but the show is ${facts.weeks_out} weeks out`);
      if ((p.bodyweight_last ?? null) !== (facts.bodyweight_last?.date ?? null)) fail(`review.prep.bodyweight_last ${p.bodyweight_last} but the last logged bodyweight is ${facts.bodyweight_last?.date ?? 'none'}`);
      if (typeof p.plan !== 'string' || p.plan.trim().length < 120) fail('review.prep.plan must lay out the prep in real sentences: when it starts, how training changes, how fat loss is paced and checked');
      if (typeof p.next_step !== 'string' || p.next_step.trim().length < 20) fail('review.prep.next_step: the one thing that happens next for prep, and when');
      if (!Array.isArray(p.data_missing)) fail('review.prep.data_missing[] required (empty only when nothing is missing)');
      const stale = facts.days_since_bodyweight == null || facts.days_since_bodyweight > BODYWEIGHT_STALE_DAYS;
      if (stale && !(p.data_missing ?? []).some((x) => /bodyweight|weigh/i.test(String(x)))) fail(`review.prep.data_missing must name the bodyweight: ${facts.bodyweight_last ? `the last was ${facts.days_since_bodyweight} days ago` : 'none has ever been logged'}`);
      if (facts.prep_is_placeholder && facts.days_until_prep <= 28 && !/\b(week|wk)\b/i.test(p.plan ?? '')) fail('review.prep.plan: prep starts within four weeks and the calendar still says placeholder — the plan must say week by week what changes');
    }
  }
}

// ——— TONIGHT'S CARD NEVER SHOWS ONE MOVEMENT TWICE ———
{
  const t = pkt.session_expected ?? E.rotationNext(plan, history);
  if (plan.sessions[t]) {
    for (const d of duplicateMovements(cardNames(plan, history, t))) {
      fail(`${t}: the card would show "${d.a.shown}" (${d.a.id}) and "${d.b.shown}" (${d.b.id}) — ${d.why}. On 31 October that was "YOU GAVE ME TWO DIPS EXERCISES".`);
    }
  }
}

// ——— APP BUGS ARE FILED, NOT BURIED ———
for (const [i, b] of appBugs(root).entries()) {
  const tag = `app-bugs[${i}]`;
  for (const k of ['id', 'found', 'what', 'where', 'consequence']) if (typeof b?.[k] !== 'string' || !b[k].trim()) fail(`${tag}: ${k} required`);
  if (!['open', 'fixed'].includes(b?.status)) fail(`${tag}: status must be open | fixed`);
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
  // REPS INSIDE THE SLOT'S RANGE. On 17 November the Legs A leg extension
  // (12 to 15) was asked at 157.5 for 10 "on purpose", the same weight as Legs
  // B's 10-to-12 slot — the up-and-down he keeps asking about. If the trainer
  // wants other reps, the rep range changes in the program, with a reason.
  for (const sid of (o.session ? [o.session] : Object.keys(plan.sessions)).filter((k) => plan.sessions[k]?.exercises?.some((x) => x.id === o.exercise))) {
    const slotDef = plan.sessions[sid].exercises.find((x) => x.id === o.exercise);
    const out = (o.sets ?? []).filter((s) => s.reps < slotDef.repMin || s.reps > slotDef.repMax);
    if (out.length) fail(`override ${o.exercise} (${sid}): ${out.map((s) => `${s.weight}×${s.reps}`).join(', ')} sits outside the slot's ${slotDef.repMin}–${slotDef.repMax} — pick a weight for the range, or change the range in program.json with a reason`);
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

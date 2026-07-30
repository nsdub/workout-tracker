#!/usr/bin/env node
// Gate for data/coach/latest.json: the daily trainer review may only be
// committed if this passes. Validates the packet's shape and freshness, then
// prints exactly what the app will prescribe WITH the packet applied — every
// place the engine's snap/cap changed a coach ask is flagged loudly so the
// reviewing agent can rethink before shipping numbers it didn't intend.
// Usage: node scripts/validate-coach.mjs [path] [YYYY-MM-DD]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../js/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pktPath = process.argv[2] ?? join(root, 'data/coach/latest.json');
const today = process.argv[3] ?? new Date().toLocaleDateString('sv-SE');
// Validate against the program he ACTUALLY RUNS. Accepted structural
// decisions are an overlay on plan.json, so checking the signed baseline
// passed a packet that prescribed leg-extension on a Legs B slot removed on
// 2026-07-22, while the lift that replaced it got no prescription at all.
const signed = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const decisions = JSON.parse(readFileSync(join(root, 'data/coach/decisions.json'), 'utf8'));
const plan = E.effectivePlan(signed, decisions);
const history = readdirSync(join(root, 'data/history'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'data/history', f), 'utf8')))
  .sort((a, b) => a.date.localeCompare(b.date));

const fail = (msg) => { console.error(`✗ ${msg}`); process.exitCode = 1; };
const pkt = JSON.parse(readFileSync(pktPath, 'utf8'));

const ISO = /^\d{4}-\d{2}-\d{2}$/;
if (!ISO.test(pkt.date ?? '')) fail('date missing or not YYYY-MM-DD');
if (!ISO.test(pkt.reviewed_through ?? '')) fail('reviewed_through missing or not YYYY-MM-DD');
if (typeof pkt.brief !== 'string' || !pkt.brief.trim()) fail('brief missing — the athlete reads this');
// PROVENANCE IS NOT OPTIONAL. The app tells the athlete whether the automatic
// 6 AM run produced these numbers or a human/session hand-wrote them, and it
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

for (const f of pkt.flags ?? []) {
  if (typeof f.note !== 'string' || !f.note.trim()) fail(`flag ${JSON.stringify(f)} has no note`);
}
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
    if (!(s.weight > 0) || !Number.isFinite(s.weight)) fail(`override ${o.exercise}: bad weight ${s.weight}`);
    if (!(s.reps >= 1) || s.reps > (plan.rules?.validation?.maxReps ?? 30)) fail(`override ${o.exercise}: bad reps ${s.reps}`);
  }
}

// ——— Structural proposals: the only way a trainer ask becomes answerable ———
// The app renders `proposals[]` as Yes/No cards (js/views/plan.js) and records
// the answer in decisions.json. Anything the panel writes as prose instead
// lands in the briefing sheet, which has one button on it: Close. On
// 2026-07-30 all three of the program seat's structure_proposals were
// flattened into flags[] and the athlete had no way to answer any of them —
// one had been re-asked daily for over a week. These gates make that
// impossible: a dropped proposal, an inapplicable one, or one that silently
// does nothing all fail the packet.
const PROPOSAL_KINDS = ['add', 'remove', 'swap', 'volume', 'reorder', 'reprange', 'keep'];
const bareId = (p) => `${p.kind}:${p.exercise}:${p.scope ?? 'all'}`;
const decidedAlready = new Map(decisions.map((d) => [bareId(d.proposal ?? {}), d]));

for (const p of pkt.proposals ?? []) {
  const tag = `proposal ${p.kind}/${p.exercise}`;
  if (!PROPOSAL_KINDS.includes(p.kind)) { fail(`${tag}: kind must be one of ${PROPOSAL_KINDS.join(' | ')}`); continue; }
  if (!signed.exercises[p.exercise]) { fail(`${tag}: unknown exercise`); continue; }
  if (typeof p.why !== 'string' || !p.why.trim()) fail(`${tag}: why is required — the card quotes it to the athlete`);
  // SCOPE IS MANDATORY. `effectivePlan` treats a missing scope as EVERY
  // session: the 2026-07-30 packet's unscoped `remove face-pulls` would have
  // stripped them from all four days while its own note promised "cut them
  // from both push days and keep them on Pull A and Pull B only".
  if (!p.scope) fail(`${tag}: scope is required — without it this applies to EVERY session, which is almost never what the note says`);
  else if (!plan.sessions[p.scope]) fail(`${tag}: scope "${p.scope}" is not a session`);
  if (p.kind === 'swap') {
    if (!p.replacement) fail(`${tag}: swap needs a replacement`);
    else if (!signed.exercises[p.replacement]) fail(`${tag}: replacement "${p.replacement}" is not in the catalog`);
    else if (!!signed.exercises[p.exercise]?.timed !== !!signed.exercises[p.replacement]?.timed
             && !p.slot && !E.nativeSlot(signed, p.replacement)) {
      fail(`${tag}: this swap crosses the timed/untimed boundary and neither the proposal nor the plan gives ${p.replacement} a shape — supply slot{sets,repMin,repMax} or the app cannot know its units`);
    }
  }
  if (p.kind === 'add' && !(p.slot?.sets > 0)) fail(`${tag}: add needs slot{sets,repMin,repMax} — the trainer sets the prescription, not the athlete`);
  if (p.kind === 'volume' && !(p.sets > 0)) fail(`${tag}: volume needs sets`);
  if (p.kind === 'reorder' && !Number.isInteger(p.position)) fail(`${tag}: reorder needs an integer position`);
  if (p.kind === 'reprange' && !(p.repMin > 0 && p.repMax >= p.repMin)) fail(`${tag}: reprange needs repMin/repMax`);
  // Dry-run it. A proposal the athlete accepts and that then changes nothing
  // is worse than no proposal: the app reports it as applied.
  const before = E.effectivePlan(signed, decisions);
  const after = E.effectivePlan(signed, [...decisions, { proposal: { ...p, date: p.date ?? pkt.date }, decision: 'accepted' }]);
  if (JSON.stringify(before.sessions) === JSON.stringify(after.sessions)) {
    fail(`${tag}: accepting this changes NOTHING — the app would show it as applied and the program would be identical`);
  }
  // Re-pitching is only a WARNING, never a failure: an accepted `keep` can
  // retract an earlier accepted change (the face-pull reversal on 2026-07-22
  // did exactly that), which makes re-proposing it legitimate. The dry-run
  // above is the real gate — if the change is already in force it is a no-op
  // and fails there.
  const prior = decidedAlready.get(bareId(p));
  if (prior) console.warn(`⚠ ${tag}: he already answered "${prior.decision}" to this on ${(prior.decided_at ?? '').slice(0, 10)} — re-raise it only if something retracted it since`);
}

// Every structural ask a seat raised must reach the athlete as an answerable
// proposal. Prose in flags[] is a dead end.
const panelDir = join(root, 'data/coach/panel');
const seatFiles = readdirSync(panelDir).filter((f) => f.startsWith(`${pkt.date}-`) && f.endsWith('.json'));
const carried = new Set((pkt.proposals ?? []).map(bareId));
for (const f of seatFiles) {
  const seat = JSON.parse(readFileSync(join(panelDir, f), 'utf8'));
  for (const sp of seat.structure_proposals ?? []) {
    if (!carried.has(bareId(sp))) {
      fail(`${f}: the ${seat.role} seat proposed ${sp.kind}/${sp.exercise} but it is not in the packet's proposals[] — the athlete would see prose he cannot answer`);
    }
  }
}

const type = pkt.session_expected ?? E.rotationNext(plan, history);
if (!plan.sessions[type]) fail(`session_expected "${type}" is not in the plan`);
const phaseInfo = E.phaseForDate(plan, pkt.date ?? today);

if (process.exitCode) {
  console.error('\nPacket INVALID — do not commit.');
  process.exit(1);
}

console.log(`Packet valid. What the app will show for ${type} (${phaseInfo.phase?.id ?? 'no phase'}):\n`);
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
        console.log(`    ⚠ engine ALTERED your ask on set ${i + 1}: you wrote ${s.weight}×${s.reps}, the app will show ${rx.sets[i].weight}×${rx.sets[i].reps} (pin snap / safety cap)`);
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

#!/usr/bin/env node
// THE PANEL GATE. Three trainers argue, a head coach rules — and this script
// is what makes "they checked each other" a fact instead of a claim.
//
// It enforces four things no prose can:
//   1. EVERY citation a trainer makes resolves to real logged data. A seat
//      that invents "you hit 135×12 on the 15th" fails here, not in the gym.
//   2. Where the panel DISAGREED, the ruling equals one side exactly. Averaging
//      215 and 205 into 210 produces a number no trainer argued for and nobody
//      can defend on the card.
//   3. A recovery veto on pain or injury is never overridden — not by the head
//      coach, not by anyone.
//   4. The head coach names its reason for every dissent it settles.
//
// Usage: node scripts/verify-panel.mjs [YYYY-MM-DD]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(dirname(fileURLToPath(import.meta.url))), '.');
const date = process.argv[2] ?? new Date().toLocaleDateString('sv-SE');
const panelDir = join(root, 'data/coach/panel');
const plan = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const history = readdirSync(join(root, 'data/history'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'data/history', f), 'utf8')));

let bad = 0;
const fail = (msg) => { console.error(`✗ ${msg}`); bad++; };
const ROLES = ['progression', 'recovery', 'program'];

if (!existsSync(panelDir)) {
  console.error(`No panel directory yet (${panelDir}) — nothing to verify.`);
  process.exit(0);
}

// ——— load whatever seats reported ———
const seats = {};
for (const role of ROLES) {
  const p = join(panelDir, `${date}-${role}.json`);
  if (!existsSync(p)) { console.log(`  · ${role}: did not report`); continue; }
  try { seats[role] = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { fail(`${role}: unreadable JSON — ${e.message}`); }
}
if (!Object.keys(seats).length) {
  console.error('No panel files for this date — the head coach ruled with no panel.');
  process.exit(1);
}

// ——— 1. CITATIONS MUST RESOLVE ———
// Format: "<YYYY-MM-DD>:<exercise-id>" or "<YYYY-MM-DD>:note". Anything a seat
// asserts about the athlete's training must point at a real row of his log.
const entryFor = (d) => history.filter((e) => e.date === d && !e.supplemental);
function checkCitation(role, c) {
  const m = /^(\d{4}-\d{2}-\d{2}):(.+)$/.exec(String(c));
  if (!m) return fail(`${role}: citation "${c}" is not <date>:<exercise-id|note>`);
  const [, d, what] = m;
  const entries = entryFor(d);
  if (!entries.length) return fail(`${role}: cites ${d}, which has no logged session`);
  if (what === 'note') {
    const has = entries.some((e) => e.notes || (e.exercises ?? []).some((x) => x.note));
    if (!has) fail(`${role}: cites a note on ${d}, but that session carries none`);
    return;
  }
  if (!plan.exercises[what]) return fail(`${role}: cites unknown exercise "${what}"`);
  const has = entries.some((e) => (e.exercises ?? []).some((x) => x.id === what && x.sets.length));
  if (!has) fail(`${role}: cites ${what} on ${d}, but it was not logged that day`);
}

for (const [role, seat] of Object.entries(seats)) {
  if (seat.date !== date) fail(`${role}: file says date ${seat.date}, expected ${date}`);
  const items = [...(seat.calls ?? []), ...(seat.vetoes ?? []), ...(seat.structure_proposals ?? [])];
  if (!items.length) fail(`${role}: reported nothing at all`);
  for (const it of items) {
    if (!it.why || !String(it.why).trim()) fail(`${role}: an item on "${it.exercise ?? '?'}" has no why`);
    const ev = it.evidence ?? [];
    if (!ev.length) fail(`${role}: "${it.exercise ?? it.kind ?? '?'}" cites no evidence — every claim must point at the log`);
    ev.forEach((c) => checkCitation(role, c));
  }
  // The program seat argues structure and must never move a number.
  if (role === 'program' && (seat.calls ?? []).some((c) => c.sets)) {
    fail('program: emitted sets — it has no load authority, only structure proposals');
  }
}

// ——— 2/3/4. THE RULING MUST HONOUR THE ROOM ———
const latestPath = join(root, 'data/coach/latest.json');
if (existsSync(latestPath)) {
  const pkt = JSON.parse(readFileSync(latestPath, 'utf8'));
  if (pkt.date === date) {
    const emitted = (id) => pkt.overrides?.find((o) => o.exercise === id) ?? null;
    const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length
      && a.every((s, i) => s.weight === b[i].weight && Math.round(s.reps) === Math.round(b[i].reps));

    // A veto on pain/injury is absolute.
    for (const v of seats.recovery?.vetoes ?? []) {
      if (!['pain', 'injury'].includes(v.grounds)) continue;
      const o = emitted(v.exercise);
      const rec = (seats.recovery.calls ?? []).find((c) => c.exercise === v.exercise);
      if (o && rec?.sets && !same(o.sets, rec.sets)) {
        fail(`VETO OVERRIDDEN: recovery vetoed ${v.exercise} on ${v.grounds} grounds and the packet prescribes something else`);
      }
      if (o && !rec?.sets) {
        fail(`VETO OVERRIDDEN: recovery vetoed ${v.exercise} (${v.grounds}) but the packet still prescribes it`);
      }
    }

    // Every dissent must be settled by picking a side, in full, with a reason.
    for (const d of pkt.dissent ?? []) {
      if (!d.exercise || !d.ruled_for) { fail(`dissent entry is missing exercise/ruled_for`); continue; }
      if (!d.why || !String(d.why).trim()) fail(`dissent on ${d.exercise}: no why — the head coach must name what it weighed`);
      const winner = (seats[d.ruled_for]?.calls ?? []).find((c) => c.exercise === d.exercise);
      const o = emitted(d.exercise);
      if (!winner) { fail(`dissent on ${d.exercise}: ruled_for "${d.ruled_for}" made no call on it`); continue; }
      if (!winner.sets) continue; // a stance without numbers (e.g. "hold") is settled by the packet holding
      if (!o) { fail(`dissent on ${d.exercise}: ruled for ${d.ruled_for} but the packet prescribes nothing`); continue; }
      if (!same(o.sets, winner.sets)) {
        fail(`SPLIT THE DIFFERENCE on ${d.exercise}: packet ${JSON.stringify(o.sets.map((s) => s.weight))} equals neither side — ${d.ruled_for} argued ${JSON.stringify(winner.sets.map((s) => s.weight))}`);
      }
    }

    // Any lift where the two number-bearing seats actually differ MUST appear
    // in dissent[] — silence is how a disagreement gets buried.
    const declared = new Set((pkt.dissent ?? []).map((d) => d.exercise));
    for (const p of seats.progression?.calls ?? []) {
      const r = (seats.recovery?.calls ?? []).find((c) => c.exercise === p.exercise && c.sets);
      if (!r || !p.sets) continue;
      if (!same(p.sets, r.sets) && !declared.has(p.exercise)) {
        fail(`UNDECLARED DISAGREEMENT on ${p.exercise}: progression ${JSON.stringify(p.sets.map((s) => s.weight))} vs recovery ${JSON.stringify(r.sets.map((s) => s.weight))}, absent from dissent[]`);
      }
    }
  }
}

const seatList = Object.keys(seats).join(', ');
if (bad) {
  console.error(`\n${bad} problem(s). Panel INVALID — do not commit.`);
  process.exit(1);
}
console.log(`✓ Panel verified for ${date} — seats: ${seatList}. Every citation resolves; every disagreement was declared and settled by picking a side.`);

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
const plan = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
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
  if (typeof o.reason !== 'string' || !o.reason.trim()) fail(`override ${o.exercise}: reason is required — the card quotes it`);
  if (!Array.isArray(o.sets) || !o.sets.length) fail(`override ${o.exercise}: sets[] required`);
  for (const s of o.sets ?? []) {
    if (!(s.weight > 0) || !Number.isFinite(s.weight)) fail(`override ${o.exercise}: bad weight ${s.weight}`);
    if (!(s.reps >= 1) || s.reps > (plan.rules?.validation?.maxReps ?? 30)) fail(`override ${o.exercise}: bad reps ${s.reps}`);
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

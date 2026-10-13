#!/usr/bin/env node
// THE REVIEW GATE (v88, replaces verify-panel.mjs). The head trainer writes
// a full review every morning and a reviewer tries to break it. This script
// is what makes "every claim points at the log" and "every finding was
// dealt with" facts rather than claims:
//   1. EVERY citation in the review, in today's program changes and in the
//      audit resolves to a real logged row. A trainer that invents "you hit
//      135×12 on the 15th" fails here, not in the gym.
//   2. The audit ran, and every finding has one of the three exits — fixed,
//      refuted, or handed to the athlete as open with its consequence. There
//      is no "minor" bucket (CLAUDE.md, the findings rule).
//   3. The packet's `changes_today` is exactly what program.json gained in
//      this version — the sheet he reads and the program he runs agree.
// Usage: node scripts/verify-review.mjs [YYYY-MM-DD]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(dirname(fileURLToPath(import.meta.url))), '.');
const date = process.argv[2] ?? new Date().toLocaleDateString('sv-SE');
const plan = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const programPath = join(root, 'data/coach/program.json');
const program = existsSync(programPath) ? JSON.parse(readFileSync(programPath, 'utf8')) : null;
const catalogue = { ...plan.exercises, ...(program?.exercises ?? {}) };
const history = readdirSync(join(root, 'data/history'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'data/history', f), 'utf8')));

let bad = 0;
const fail = (msg) => { console.error(`✗ ${msg}`); bad++; };
const pkt = JSON.parse(readFileSync(join(root, 'data/coach/latest.json'), 'utf8'));
if (pkt.date !== date) fail(`latest.json is dated ${pkt.date}, expected ${date}`);

// ——— 1. CITATIONS MUST RESOLVE ———
// "<YYYY-MM-DD>:<exercise-id>" or "<YYYY-MM-DD>:note" or "<YYYY-MM-DD>:bodyweight".
const entryFor = (d) => history.filter((e) => e.date === d && !e.supplemental);
let cited = 0;
function checkCitation(where, c) {
  cited++;
  const m = /^(\d{4}-\d{2}-\d{2}):(.+)$/.exec(String(c));
  if (!m) return fail(`${where}: citation "${c}" is not <date>:<exercise-id|note|bodyweight>`);
  const [, d, what] = m;
  const entries = entryFor(d);
  if (!entries.length) return fail(`${where}: cites ${d}, which has no logged session`);
  if (what === 'note') {
    if (!entries.some((e) => e.notes || (e.exercises ?? []).some((x) => x.note))) fail(`${where}: cites a note on ${d}, but that session carries none`);
    return;
  }
  if (what === 'bodyweight') {
    if (!entries.some((e) => e.bodyweight)) fail(`${where}: cites a bodyweight on ${d}, but none was logged`);
    return;
  }
  if (!catalogue[what]) return fail(`${where}: cites unknown exercise "${what}"`);
  if (!entries.some((e) => (e.exercises ?? []).some((x) => x.id === what && x.sets?.length))) fail(`${where}: cites ${what} on ${d}, but it was not logged that day`);
}
const checkAll = (where, item) => {
  if (!item || typeof item !== 'object') return;
  if (typeof item.why !== 'string' || !item.why.trim()) fail(`${where}: no why`);
  const ev = item.evidence ?? [];
  if (!Array.isArray(ev)) return fail(`${where}: evidence must be an array`);
  for (const c of ev) checkCitation(where, c);
};

const review = pkt.review ?? {};
for (const [m, r] of Object.entries(review.muscles ?? {})) {
  checkAll(`review.muscles.${m}`, r);
  // A verdict that says the muscle is under- or over-served must point at nights, not at a feeling.
  if (['raise', 'cut', 'rotate'].includes(r?.verdict) && !(r.evidence ?? []).length) fail(`review.muscles.${m}: a "${r.verdict}" verdict cites no evidence`);
}
for (const [id, r] of Object.entries(review.lifts ?? {})) {
  checkAll(`review.lifts.${id}`, r);
  if (r?.trend && r.trend !== 'unlogged' && r.trend !== 'new' && !(r.evidence ?? []).length) fail(`review.lifts.${id}: trend "${r.trend}" with no night cited`);
}
if (review.block) checkAll('review.block', review.block);
for (const [i, c] of (pkt.changes_today ?? []).entries()) {
  checkAll(`changes_today[${i}]`, c);
  if (c.kind !== 'snapshot' && !(c.evidence ?? []).length) fail(`changes_today[${i}] (${c.kind} ${c.exercise ?? ''}): a program change must cite the sessions it rests on`);
}
for (const [i, d] of (pkt.deferred ?? []).entries()) checkAll(`deferred[${i}]`, d);

// ——— 2. THE AUDIT RAN AND EVERY FINDING HAS AN EXIT ———
const audit = pkt.audit;
if (!audit || audit.reviewer_ran !== true) fail('audit.reviewer_ran must be true — a review nobody tried to break is a review that was not checked');
if (!Array.isArray(audit?.findings)) fail('audit.findings[] must exist (empty is allowed, and is itself a statement the reviewer stands behind)');
for (const [i, f] of (audit?.findings ?? []).entries()) {
  const tag = `audit.findings[${i}]`;
  if (typeof f.finding !== 'string' || !f.finding.trim()) fail(`${tag}: finding text missing`);
  if (!['fixed', 'refuted', 'open'].includes(f.disposition)) fail(`${tag}: disposition must be fixed | refuted | open — there is no "minor"`);
  if (typeof f.why !== 'string' || !f.why.trim()) fail(`${tag}: why missing — say what was done, or why it is wrong`);
  if (f.disposition === 'refuted' && !(f.evidence ?? []).length) fail(`${tag}: a refutation needs the logged rows that refute it`);
  if (f.disposition === 'open' && (typeof f.consequence !== 'string' || !f.consequence.trim())) fail(`${tag}: an open finding must spell out its consequence for him`);
  for (const c of f.evidence ?? []) checkCitation(tag, c);
}

// ——— 3. THE SHEET AND THE PROGRAM AGREE ———
if (program) {
  // "Today's changes" are every change dated today, whatever version carried
  // them: two versions can land in one day (the morning run, then an answer
  // from the athlete that evening), and the sheet he reads must show both.
  const inProgram = (program.changes ?? []).filter((c) => c.date === date && c.kind !== 'snapshot');
  const strip = (c) => JSON.stringify({ s: c.session ?? null, e: c.exercise ?? null, k: c.kind, b: c.before ?? null, a: c.after ?? null, w: c.why });
  const a = inProgram.map(strip).sort();
  const b = (pkt.changes_today ?? []).map(strip).sort();
  if (pkt.program_version !== program.version) fail(`packet says program v${pkt.program_version}, program.json is v${program.version}`);
  if (program.version > 1 && program.date === date && JSON.stringify(a) !== JSON.stringify(b)) {
    fail(`changes_today does not match what program.json v${program.version} gained (${inProgram.length} in the program, ${(pkt.changes_today ?? []).length} in the packet) — the sheet he reads must be the change he runs`);
  }
  if (program.date !== date && (pkt.changes_today ?? []).length) fail(`changes_today lists changes but program.json was last written ${program.date}, not today`);
}

if (bad) { console.error(`\n${bad} problem(s). Review INVALID — do not commit.`); process.exit(1); }
console.log(`✓ Review verified for ${date}: ${cited} citations resolve, ${(audit?.findings ?? []).length} audit finding(s) each with an exit, program v${program?.version ?? '—'} and the packet agree.`);

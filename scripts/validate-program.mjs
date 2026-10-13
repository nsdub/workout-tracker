#!/usr/bin/env node
// Gate for data/coach/program.json: the trainer-owned program the app runs.
// A program file that fails here is never committed. It checks the things a
// file can be checked for — shape, every lift real and tagged, sane set and
// rep counts, a complete change log — and the two things that burned this
// repo: set creep (a per-session cap and the weekly muscle targets) and
// flip-flopping (a change that walks a slot back within 14 days must cite a
// session logged AFTER the change it undoes).
// Usage: node scripts/validate-program.mjs [path] [YYYY-MM-DD]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as E from '../js/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = process.argv[2] ?? join(root, 'data/coach/program.json');
const today = process.argv[3] ?? new Date().toLocaleDateString('sv-SE');
const plan = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const history = readdirSync(join(root, 'data/history'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'data/history', f), 'utf8')))
  .sort((a, b) => a.date.localeCompare(b.date));

let bad = 0;
const fail = (m) => { console.error(`✗ ${m}`); bad++; };
const warn = (m) => console.warn(`⚠ ${m}`);

export const SESSION_IDS = ['PushA', 'PullA', 'LegsA', 'PushB', 'PullB', 'LegsB'];
export const MAX_SETS_PER_SESSION = 28;
export const REVERSAL_WINDOW_DAYS = 14;
const CHANGE_KINDS = ['sets', 'swap', 'add', 'remove', 'reorder', 'reprange', 'rest', 'targets', 'retract', 'snapshot', 'rename'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

let program;
try { program = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { fail(`unreadable: ${e.message}`); }

if (program) {
  if (!Number.isInteger(program.version) || program.version < 1) fail('version must be a positive integer');
  if (!ISO.test(program.date ?? '')) fail('date missing or not YYYY-MM-DD');
  if (!['daily-training-brief', 'interactive-session'].includes(program.written_by)) fail('written_by must be daily-training-brief | interactive-session');

  // ——— sessions ———
  const sessions = program.sessions ?? {};
  for (const id of SESSION_IDS) if (!sessions[id]?.exercises) fail(`session ${id} is missing — the six ids are fixed (each is a universe)`);
  for (const id of Object.keys(sessions)) if (!SESSION_IDS.includes(id)) fail(`session "${id}" is not one of ${SESSION_IDS.join(', ')}`);

  const catalogue = { ...plan.exercises, ...(program.exercises ?? {}) };
  const live = E.effectivePlan(plan, [], program);
  for (const [id, ex] of Object.entries(program.exercises ?? {})) {
    const tag = `exercises.${id}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) fail(`${tag}: id must be kebab-case`);
    if (!ex?.name) fail(`${tag}: name required`);
    if (!['compound', 'hypertrophy', 'corrective', 'core'].includes(ex?.role)) fail(`${tag}: role must be compound|hypertrophy|corrective|core`);
    if (!Array.isArray(ex?.howto) || ex.howto.length < 2 || !ex.howto.every((s) => typeof s === 'string' && s.trim())) fail(`${tag}: howto needs at least two plain sentences — the card shows them`);
  }
  for (const [id, ex] of Object.entries(catalogue)) {
    const used = SESSION_IDS.some((s) => (sessions[s]?.exercises ?? []).some((x) => x.id === id));
    if (!used) continue;
    const m = ex?.muscles;
    if (!m || !Array.isArray(m.primary) || !m.primary.length) fail(`${id}: no primary muscles — the weekly table cannot count it`);
    for (const k of [...(m?.primary ?? []), ...(m?.secondary ?? [])]) if (!E.MUSCLES.includes(k)) fail(`${id}: unknown muscle "${k}"`);
  }

  const totals = {};
  for (const sid of SESSION_IDS) {
    const list = sessions[sid]?.exercises ?? [];
    if (!list.length) { fail(`${sid}: no exercises`); continue; }
    if (!sessions[sid].name) fail(`${sid}: name required`);
    const seen = new Set();
    let n = 0;
    for (const x of list) {
      const tag = `${sid}/${x.id}`;
      if (!catalogue[x.id]) { fail(`${tag}: unknown exercise — add it under "exercises" with name, role, muscles and howto`); continue; }
      if (seen.has(x.id)) fail(`${tag}: appears twice in one session`);
      seen.add(x.id);
      if (!Number.isInteger(x.sets) || x.sets < 1 || x.sets > 6) fail(`${tag}: sets must be 1–6 (got ${x.sets})`);
      const timed = x.repUnit === 'sec' || !!catalogue[x.id]?.timed;
      const cap = timed ? 600 : (plan.rules?.validation?.maxReps ?? 30);
      if (!(x.repMin >= 1) || !(x.repMax >= x.repMin) || x.repMax > cap) fail(`${tag}: rep range ${x.repMin}–${x.repMax} is not sane${timed ? ' (seconds)' : ''}`);
      if (x.rest != null && !(x.rest >= 30 && x.rest <= 300)) fail(`${tag}: rest ${x.rest}s is outside 30–300`);
      if (x.superset && !list.some((y) => y !== x && y.superset === x.superset)) fail(`${tag}: superset "${x.superset}" has no partner in ${sid}`);
      if (catalogue[x.id]?.timed && x.repUnit !== 'sec') fail(`${tag}: a timed hold must carry repUnit "sec"`);
      if (!catalogue[x.id]?.timed && x.repUnit === 'sec') fail(`${tag}: repUnit "sec" on a rep movement`);
      n += x.sets ?? 0;
    }
    totals[sid] = n;
    if (n > MAX_SETS_PER_SESSION) fail(`${sid}: ${n} hard sets — the cap is ${MAX_SETS_PER_SESSION}. This is the set creep the review exists to stop.`);
  }

  // ——— weekly muscle sets vs the trainer's own targets ———
  const weekly = E.plannedWeeklyByMuscle(live);
  const targets = program.targets ?? {};
  for (const m of E.MUSCLES) {
    const t = targets[m];
    if (!t || !(t.min >= 0) || !(t.max >= t.min)) { fail(`targets.${m}: min/max required for every muscle`); continue; }
    if (weekly[m] < t.min) warn(`${m}: ${weekly[m]} weekly sets planned, below the target floor ${t.min}`);
    if (weekly[m] > t.max) warn(`${m}: ${weekly[m]} weekly sets planned, above the target ceiling ${t.max}`);
  }

  // ——— the change log ———
  const changes = program.changes ?? [];
  if (!Array.isArray(changes) || !changes.length) fail('changes[] must exist — a program with no history is a program nobody can audit');
  for (const [i, c] of changes.entries()) {
    const tag = `changes[${i}]`;
    if (!ISO.test(c.date ?? '')) fail(`${tag}: date missing`);
    if (!CHANGE_KINDS.includes(c.kind)) fail(`${tag}: kind must be one of ${CHANGE_KINDS.join('|')}`);
    if (!Number.isInteger(c.version)) fail(`${tag}: version required`);
    if (typeof c.why !== 'string' || c.why.trim().length < 20) fail(`${tag}: why must be a real sentence — it is what he reads`);
    if (!Array.isArray(c.evidence)) fail(`${tag}: evidence[] required (may be empty only on historical rows)`);
    if (c.version === program.version && c.kind !== 'snapshot' && !c.evidence.length) fail(`${tag}: a change made in this version must cite the logged sessions it is based on`);
    if (c.session && !SESSION_IDS.includes(c.session)) fail(`${tag}: session "${c.session}"`);
    if (c.exercise && !catalogue[c.exercise] && c.kind !== 'remove' && c.kind !== 'swap' && c.kind !== 'retract') fail(`${tag}: exercise "${c.exercise}" is not in the catalogue`);
    if (c.kind === 'swap' && !c.after?.id) fail(`${tag}: a swap names the replacement in after.id`);
  }
  const maxV = Math.max(0, ...changes.map((c) => c.version ?? 0));
  if (program.version !== maxV) fail(`version ${program.version} but the newest change is v${maxV} — every version bump is a change entry and vice versa`);

  // ——— version must move when the program moves ———
  // Compare against what is committed. The daily review edits this file
  // before committing, so HEAD is "yesterday".
  try {
    const prevRaw = execFileSync('git', ['-C', root, 'show', 'HEAD:data/coach/program.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const prev = JSON.parse(prevRaw);
    const moved = JSON.stringify(prev.sessions) !== JSON.stringify(program.sessions)
      || JSON.stringify(prev.targets) !== JSON.stringify(program.targets)
      || JSON.stringify(prev.exercises ?? {}) !== JSON.stringify(program.exercises ?? {});
    if (moved && !(program.version > prev.version)) fail(`the program changed but version did not move past the committed v${prev.version}`);
    if (!moved && program.version !== prev.version) fail(`version moved to v${program.version} but nothing in the program changed — a version is a change`);
    if (moved) {
      const todays = changes.filter((c) => c.version === program.version);
      if (!todays.length) fail('the program changed and no change entry carries the new version');
      // Every slot that differs must be named by a change entry.
      for (const sid of SESSION_IDS) {
        const a = Object.fromEntries((prev.sessions?.[sid]?.exercises ?? []).map((x) => [x.id, x]));
        const b = Object.fromEntries((sessions[sid]?.exercises ?? []).map((x) => [x.id, x]));
        for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
          if (JSON.stringify(a[id] ?? null) === JSON.stringify(b[id] ?? null)) continue;
          const named = todays.some((c) => c.session === sid && (c.exercise === id || c.after?.id === id));
          if (!named) fail(`${sid}/${id} changed in this version and no change entry names it — a silent edit is the thing he cannot forgive`);
        }
        const orderA = (prev.sessions?.[sid]?.exercises ?? []).map((x) => x.id).filter((id) => b[id]).join(',');
        const orderB = (sessions[sid]?.exercises ?? []).map((x) => x.id).filter((id) => a[id]).join(',');
        if (orderA !== orderB && !todays.some((c) => c.session === sid && ['reorder', 'swap', 'add', 'remove'].includes(c.kind))) {
          fail(`${sid}: the order of lifts changed and no change entry says so`);
        }
      }
    }
    // ——— REVERSAL GUARD ———
    // A change that moves a slot back toward where it stood inside the window
    // must cite a session logged after the change it reverses. "Reasoning
    // harder is not a fact" (rule 4): leg curl went 3→4→3, split squat 2→3→2,
    // lateral raise 4→3→4, reverse pec deck 3→2→3 inside eight days.
    const since = new Date(new Date(today + 'T12:00').getTime() - REVERSAL_WINDOW_DAYS * 86400000).toLocaleDateString('sv-SE');
    const recent = changes.filter((c) => c.version < program.version && c.date >= since && c.exercise);
    for (const c of changes.filter((x) => x.version === program.version && x.exercise)) {
      const prior = recent.filter((r) => r.exercise === c.exercise && r.session === c.session && r.kind === c.kind);
      for (const r of prior) {
        const undoes = JSON.stringify(c.after) === JSON.stringify(r.before) || (c.kind === 'add' && r.kind === 'add') || (c.kind === 'remove' && r.kind === 'remove');
        const reverse = c.kind === 'sets' && r.after?.sets != null && c.after?.sets != null && r.before?.sets != null
          && Math.sign(c.after.sets - r.after.sets) === -Math.sign(r.after.sets - r.before.sets);
        if (!undoes && !reverse) continue;
        const cited = (c.evidence ?? []).some((ev) => String(ev).slice(0, 10) > r.date);
        if (!cited) fail(`${c.session}/${c.exercise}: this ${c.kind} walks back the ${r.kind} of ${r.date} (${REVERSAL_WINDOW_DAYS}-day window) and cites no session logged after it — a reversal needs new evidence, not a new opinion`);
      }
    }
  } catch (e) {
    if (!/exists on disk|does not exist|fatal|Command failed/.test(String(e.message))) throw e;
    warn('no committed program.json to compare against (first version)');
  }

  console.log(`sets per session: ${JSON.stringify(totals)}`);
  console.log(`weekly sets per muscle: ${Object.entries(weekly).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

if (bad) { console.error(`\n${bad} problem(s). Program INVALID — do not commit.`); process.exit(1); }
console.log(`✓ Program v${program.version} valid.`);

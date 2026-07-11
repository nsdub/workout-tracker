#!/usr/bin/env node
// Parses Appendix A (scripts/history-raw.txt) into per-session history JSON files
// plus a one-shot seed bundle (plan + full history) for the in-app importer.
// Import is verbatim — suspect entries are preserved exactly as logged.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(readFileSync(join(root, 'data/plan.json'), 'utf8'));
const raw = readFileSync(join(root, 'scripts/history-raw.txt'), 'utf8');

const ALIASES = {
  'Smith Incline Press': 'smith-incline-press',
  'Machine Chest Press': 'machine-chest-press',
  'Cable Crossover LH': 'cable-crossover-low-high',
  'DB Shoulder Press': 'db-shoulder-press',
  'Cable Lateral Raise': 'cable-lateral-raise',
  'OH Cable Triceps Ext': 'overhead-cable-triceps',
  'Rope Pushdown': 'rope-pushdown',
  'Face Pulls': 'face-pulls',
  'Deadlift': 'deadlift',
  'Lat Pulldown Wide': 'lat-pulldown-wide',
  'Seated Cable Row Wide': 'seated-cable-row-wide',
  'DB Curl': 'db-curl',
  'Cable Hammer Curl': 'cable-hammer-curl',
  'Smith Bent Over Row': 'smith-bent-over-row',
  'Lat Pulldown Close': 'lat-pulldown-close',
  'Straight Arm Pulldown': 'straight-arm-pulldown',
  'DB Shrug': 'db-shrug',
  'Incline DB Curl': 'incline-db-curl',
  'Cable Reverse Curl': 'cable-reverse-curl',
  'Smith OHP': 'smith-overhead-press',
  'DB Lateral Raise': 'db-lateral-raise',
  'Cable Crossover HL': 'cable-crossover-high-low',
  'Reverse Pec Deck': 'reverse-pec-deck',
  'Assisted Dips': 'assisted-dips',
  'Reverse Grip Pushdown': 'reverse-grip-pushdown',
  'Leg Press Low': 'leg-press-low',
  'Leg Extension': 'leg-extension',
  'Leg Curl': 'leg-curl',
  'Hip Adductor': 'hip-adductor',
  'Hip Abductor': 'hip-abductor',
  'Standing Calf Raise': 'standing-calf-raise',
  'Cable Crunch': 'cable-crunch',
  'Hanging Leg Raise': 'hanging-leg-raise',
  'Smith RDL': 'smith-rdl',
  'Leg Press High': 'leg-press-high',
  'Plank': 'plank',
};

const SESSION_TYPES = new Set(['PushA', 'PullA', 'LegsA', 'PushB', 'PullB', 'LegsB']);

function parseDate(s) {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!m) throw new Error(`Bad date: ${s}`);
  return `20${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

function parseSets(s) {
  return s.split(',').map((pair) => {
    const m = pair.trim().match(/^(\d+(?:\.\d+)?)[×x](\d+)$/);
    if (!m) throw new Error(`Bad set: "${pair}"`);
    return { weight: Number(m[1]), reps: Number(m[2]) };
  });
}

const entries = [];
for (const line of raw.split('\n')) {
  if (!line.trim()) continue;
  const parts = line.split('|').map((p) => p.trim());
  const date = parseDate(parts[0]);
  const session_type = parts[1];
  if (!SESSION_TYPES.has(session_type)) throw new Error(`Bad session type: ${session_type}`);

  const entry = { date, session_type, phase: 'legacy', week: null, exercises: [], imported: true };
  let rest = parts.slice(2);
  if (rest[0]?.startsWith('BW ')) {
    entry.bodyweight = Number(rest[0].slice(3));
    rest = rest.slice(1);
  }
  for (const seg of rest) {
    const idx = seg.indexOf(':');
    if (idx === -1) throw new Error(`Bad segment: "${seg}"`);
    const rawName = seg.slice(0, idx).trim();
    const id = ALIASES[rawName];
    if (!id) throw new Error(`Unknown exercise: "${rawName}"`);
    if (!plan.exercises[id]) throw new Error(`Alias maps to unknown plan exercise: ${id}`);
    entry.exercises.push({ id, name: plan.exercises[id].name, sets: parseSets(seg.slice(idx + 1)) });
  }
  entries.push(entry);
}

entries.sort((a, b) => a.date.localeCompare(b.date) || a.session_type.localeCompare(b.session_type));

const outDir = join(root, 'data/history');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const e of entries) {
  writeFileSync(join(outDir, `${e.date}-${e.session_type.toLowerCase()}.json`), JSON.stringify(e, null, 2) + '\n');
}

writeFileSync(
  join(root, 'data/seed-bundle.json'),
  JSON.stringify({ kind: 'protocol-seed', version: 3, plan, history: entries }, null, 2) + '\n'
);

// Report
const totalSets = entries.reduce((n, e) => n + e.exercises.reduce((m, x) => m + x.sets.length, 0), 0);
const byType = {};
for (const e of entries) byType[e.session_type] = (byType[e.session_type] || 0) + 1;
console.log(`sessions: ${entries.length}  (${Object.entries(byType).map(([k, v]) => `${k}:${v}`).join(' ')})`);
console.log(`exercise entries: ${entries.reduce((n, e) => n + e.exercises.length, 0)}, sets: ${totalSets}`);
console.log(`range: ${entries[0].date} → ${entries[entries.length - 1].date}`);
console.log(`bodyweight days: ${entries.filter((e) => e.bodyweight != null).length}`);

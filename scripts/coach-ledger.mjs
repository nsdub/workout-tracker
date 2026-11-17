// Shared by the dossier (what the trainer reads) and validate-coach (what the
// trainer is held to), so both agree on exactly which of his notes still need
// an answer, what the show-prep numbers are, and what a card will be called.
//
// Why this exists (2026-11-17 audit): he asked "Does the science support any
// of your set counts?" on 10 November and the review was still listing it as
// an open question a week later. Three questions written on 15 November got
// answers only because a person noticed them. A note he writes is a question
// to his trainer; this makes answering every one of them a gate.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// The notes ledger starts with the New York block (2026-10-28). Notes before
// it were read by the old panel; the ones since are the ones he has been
// shouting about on the cards.
export const LEDGER_START = '2026-10-27';

// Prep is reviewed every day once the show is this close.
export const PREP_WINDOW_DAYS = 140;
// A bodyweight older than this is not a prep number.
export const BODYWEIGHT_STALE_DAYS = 14;

const dayMs = 86400000;
export const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / dayMs);

// The packet that came before `date`: the newest archive dated earlier.
export function previousPacket(root, date) {
  const dir = join(root, 'data/coach/archive');
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(0, 10) < date).sort();
  if (!files.length) return null;
  return JSON.parse(readFileSync(join(dir, files[files.length - 1]), 'utf8'));
}

// Every note that needs an answer in the packet for `date`:
//   - every session or exercise note logged after the previous packet's
//     reviewed_through (from the ledger start if that packet predates answers[]),
//   - plus every answer the previous packet left "open", carried until closed.
// Each item has a stable key "<date>:<scope>" the packet's answers[] must use.
export function notesToAnswer(history, prev, date) {
  const since = prev && Array.isArray(prev.answers) ? prev.reviewed_through : LEDGER_START;
  const out = [];
  const seen = new Set();
  const push = (item) => { if (!seen.has(item.key)) { seen.add(item.key); out.push(item); } };
  for (const e of history) {
    if (e.supplemental || !(e.date > since) || e.date > date) continue;
    if (typeof e.notes === 'string' && e.notes.trim()) {
      push({ key: `${e.date}:session`, date: e.date, session: e.session_type, scope: 'session', note: e.notes.trim() });
    }
    for (const x of e.exercises ?? []) {
      if (typeof x.note === 'string' && x.note.trim()) {
        push({ key: `${e.date}:${x.id}`, date: e.date, session: e.session_type, scope: x.id, ...(x.as ? { as: x.as } : {}), note: x.note.trim() });
      }
    }
  }
  for (const a of prev?.answers ?? []) {
    if (a?.status === 'open' && a.key) push({ key: a.key, date: a.date, session: a.session ?? null, scope: a.scope, note: a.note, carried_from: prev.date });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

// The show-prep numbers a review must state truthfully.
export function prepFacts(plan, history, today) {
  const show = plan.show?.date ?? null;
  if (!show) return null;
  const days = daysBetween(today, show);
  const prep = plan.phases.find((p) => p.type === 'prep') ?? null;
  const bws = history.filter((e) => e.bodyweight).map((e) => ({ date: e.date, lb: e.bodyweight })).sort((a, b) => a.date.localeCompare(b.date));
  const last = bws[bws.length - 1] ?? null;
  const eightWeeksAgo = new Date(new Date(today + 'T12:00').getTime() - 56 * dayMs).toLocaleDateString('sv-SE');
  return {
    show,
    label: plan.show?.label ?? null,
    days_away: days,
    weeks_out: Math.floor(days / 7),
    prep_phase: prep ? { start: prep.start, end: prep.end, note: prep.note ?? null } : null,
    prep_weeks_before_show: prep ? Math.floor(daysBetween(prep.start, show) / 7) : null,
    days_until_prep: prep ? daysBetween(today, prep.start) : null,
    prep_is_placeholder: !!prep && /placeholder/i.test(prep.note ?? ''),
    bodyweight_last: last,
    days_since_bodyweight: last ? daysBetween(last.date, today) : null,
    bodyweights_last_8wk: bws.filter((b) => b.date >= eightWeeksAgo).length,
    in_window: days <= PREP_WINDOW_DAYS,
  };
}

// What tonight's card will CALL each slot. The substitute name ("Doing
// something else here") lives in the phone's per-gym settings, which the repo
// does not carry; the last name logged for that slot at that gym is the
// proxy. On 31 October the card showed "Dips" (a renamed overhead slot) next
// to "Assisted Dips" and he wrote "YOU GAVE ME TWO DIPS EXERCISES".
export function cardNames(plan, history, sessionType) {
  const lifting = history.filter((e) => !e.supplemental).sort((a, b) => a.date.localeCompare(b.date));
  const gym = lifting[lifting.length - 1]?.gym ?? null;
  return (plan.sessions[sessionType]?.exercises ?? []).map((slot) => {
    let as = null;
    for (let i = lifting.length - 1; i >= 0; i--) {
      const e = lifting[i];
      if ((e.gym ?? null) !== gym || e.session_type !== sessionType) continue;
      const x = (e.exercises ?? []).find((q) => q.id === slot.id);
      if (x) { as = x.as ?? null; break; }
    }
    return { id: slot.id, name: plan.exercises[slot.id]?.name ?? slot.id, as, shown: as || plan.exercises[slot.id]?.name || slot.id };
  });
}

const norm = (s) => String(s).toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean)
  .map((w) => w.replace(/(es|s)$/, '')).filter((w) => !['db', 'dumbbell', 'cable', 'machine', 'smith', 'barbell', 'assisted', 'seated', 'standing'].includes(w)).join(' ');
// Movement words that should appear once per session. Curls, presses, rows and
// pulldowns are left out on purpose: two of those in one day is normal design.
const ONCE = ['dip', 'squat', 'deadlift', 'rdl', 'lateral', 'shrug', 'plank', 'crunch', 'rollout', 'pushdown'];

// Two slots a card would show as the same movement.
export function duplicateMovements(names) {
  const out = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = norm(names[i].shown);
      const b = norm(names[j].shown);
      if (a && a === b) { out.push({ a: names[i], b: names[j], why: 'same name' }); continue; }
      const word = ONCE.find((w) => a.split(' ').includes(w) && b.split(' ').includes(w));
      if (word) out.push({ a: names[i], b: names[j], why: `both are a ${word}` });
    }
  }
  return out;
}

// Code bugs the trainer has found in the app. The daily review may not edit
// app code; before this file existed, a bug it found lived only in a packet's
// audit and nobody fixed it (the cross-gym "stalled" label sat on his screen
// from at least 15 November).
export function appBugs(root) {
  const p = join(root, 'data/coach/app-bugs.json');
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, 'utf8'));
}

// What the trainer knows about each gym's equipment, with where it learned it.
// Rule 2: never name a machine the log does not show exists.
export function gymFacts(root) {
  const p = join(root, 'data/coach/gyms.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}

// Pure program logic: phase calendar, rotation, prescriptions, progression,
// stall detection, PRs, input validation. No DOM, no storage — testable in node.

export function roundLoad(w) {
  return Math.round(w / 2.5) * 2.5;
}

// ——— Units ———
// Every weight the engine stores, compares, or emits is in POUNDS. A machine
// labelled in kilograms is a display fact: the athlete types kg, the app keeps
// lb, and the card shows kg again. No machine ladders, no pin snapping — the
// gyms change (2026-09-02 and since), the machines change with them, and a
// weight he can type is a weight he lifted.
export const KG_PER_LB = 0.45359237;
export const toKg = (lb) => lb * KG_PER_LB;
export const toLb = (kg) => kg / KG_PER_LB;
// Round a weight to the precision a stored number needs: three decimals keep
// a kg entry exact on the way back (52.5 kg → 115.743 lb → 52.5 kg).
export const roundW = (w) => (w == null ? w : Math.round(w * 1000) / 1000);
export const DEFAULT_KG_STEP = 2.5;

// The unit this lift is shown and typed in: the exercise's own (a gym-profile
// overlay sets it per machine), else the plan's default, else lb.
export function unitFor(plan, id) {
  const u = exMeta(plan, id).unit ?? plan.units ?? 'lb';
  return u === 'kg' ? 'kg' : 'lb';
}

// A gym profile is the athlete's own per-machine facts at ONE gym: which unit
// a machine reads in, and what he actually does in a slot there ("Barbell",
// "one-arm dumbbell row"). Overlaid on the plan's exercises the same way
// accepted decisions overlay its sessions — plan.json is never rewritten.
export function applyGymProfile(plan, profile) {
  if (!profile || !Object.keys(profile).length) return plan;
  const exercises = { ...plan.exercises };
  for (const [id, p] of Object.entries(profile)) {
    if (!p || typeof p !== 'object') continue;
    const base = exercises[id] ?? { name: id };
    const next = { ...base };
    if (p.unit === 'kg' || p.unit === 'lb') next.unit = p.unit;
    if (typeof p.as === 'string' && p.as.trim()) next.as = p.as.trim();
    exercises[id] = next;
  }
  return { ...plan, exercises };
}

// Back-off weeks (calibration 90%, deload 80%) must never round UP past their
// target and must land on the lift's OWN increment grid — 5 lb upper / 10 lb
// lower, or 2.5 kg on a kg machine. Rounds the reduced load DOWN to that
// increment; a loaded lift is never dropped below a single increment.
export function backoffLoad(w, inc) {
  if (!(inc > 0)) return roundLoad(w); // no known increment → legacy 2.5 grid
  // 1e-4 of a step of slack: a stored kg weight is rounded to 0.001 lb, and
  // without it 80% of 50 kg (a clean 16 steps) floors to 15 steps = 37.5 kg.
  return roundW(Math.max(inc, Math.floor(w / inc + 1e-4) * inc));
}

// The grid snap means "90%" is almost never 90% — 185 × 0.9 lands at 165,
// which is really 89%. One place computes both the weight and the ratio it
// actually is, so every label downstream can tell the truth instead of
// asserting the nominal target.
export function backoffInfo(base, factor, inc) {
  const weight = backoffLoad(base * factor, inc);
  return { weight, pct: Math.round((weight / base) * 100) };
}

export function exMeta(plan, id) {
  return plan.exercises[id] || { name: id };
}

// The progression step for a lift, IN POUNDS. A kg machine steps in kg
// (2.5 by default, or the exercise's own incrementKg) and the lb figure is
// that step converted, so a prescription lands on a number the kg dial shows.
export function increment(plan, id) {
  const meta = exMeta(plan, id);
  if (meta.bodyweight) return 0;
  if (unitFor(plan, id) === 'kg') {
    const kg = typeof meta.incrementKg === 'number' && meta.incrementKg > 0 ? meta.incrementKg : DEFAULT_KG_STEP;
    return toLb(kg); // exact — rounding it here drifts a floored 40 kg to 37.5
  }
  // A lift that lives on its own grid — 2.5 lb dumbbell steps, a 7.5 lb
  // stack — can say so per-exercise; the upper/lower rule is only the
  // default, not a law of the gym.
  if (typeof meta.increment === 'number' && meta.increment > 0) return meta.increment;
  return plan.rules.progression.lowerExercises.includes(id)
    ? plan.rules.progression.lowerIncrement
    : plan.rules.progression.upperIncrement;
}

// The same step in the unit the lift is shown in — what the numpad's ± walks.
export function incrementShown(plan, id) {
  const inc = increment(plan, id);
  return unitFor(plan, id) === 'kg' ? Math.round(toKg(inc) * 100) / 100 : inc;
}

// ——— Structural decisions (the trainers change the PROGRAM, not just loads) ———
// A panel proposal — drop this slot, add that lift, cut these sets — becomes
// real the moment the athlete accepts it, and it applies as an OVERLAY on the
// plan rather than by rewriting plan.json. That matters: the plan stays the
// signed program, the change is one line in data/coach/decisions.json, and
// declining or undoing is the same one line going the other way.

export function proposalId(p) {
  return `${p.date ?? ''}:${p.kind}:${p.exercise}:${p.scope ?? 'all'}`;
}

// A movement's own prescription where the signed plan already defines it, so
// a swap can adopt the replacement's real reps and units instead of wearing
// the outgoing slot's. Always reads the ORIGINAL plan, never the overlay
// being built, so the answer doesn't depend on decision order.
export function nativeSlot(plan, id) {
  for (const s of Object.values(plan.sessions)) {
    const hit = s.exercises.find((x) => x.id === id);
    if (hit) return hit;
  }
  return null;
}

// The athlete's answers, REPLAYED IN THE ORDER HE GAVE THEM, applied to the
// session templates. decisions.json is an append-only ledger, so order is the
// whole meaning: it is what makes a retraction say "undo what I said before"
// instead of "veto this slot forever".
export function effectivePlan(plan, decisions = []) {
  // Sort by when he actually answered. The previous version trusted array
  // position for "newest wins", which is only correct if the file happens to
  // be in chronological order — nothing guaranteed that, and a synced or
  // merged ledger need not be. Ties (and pre-`decided_at` rows) keep their
  // original order, so a hand-built list still replays as written.
  // A row with no usable `decided_at` inherits the time of the row before it,
  // so it holds its place instead of teleporting to the front of the ledger.
  // Without that, appending an unstamped decision (a dry-run asking "what
  // would accepting this do?") replays it BEFORE every dated row, and an old
  // retraction cancels a change that was meant to happen after it.
  let carried = 0;
  const ordered = decisions
    .map((d, i) => {
      const parsed = Date.parse(d?.decided_at ?? '');
      if (Number.isFinite(parsed)) carried = parsed;
      return { d, i, t: carried };
    })
    .filter((x) => x.d?.proposal?.kind)
    .sort((a, b) => (a.t - b.t) || (a.i - b.i))
    .map((x) => x.d);
  // A later decision on the SAME proposal replaces the earlier one — undo is
  // just another decision.
  const latest = new Map();
  for (const d of ordered) latest.set(proposalId(d.proposal), d);

  const slotKey = (p) => `${p.exercise}:${p.scope ?? null}`;
  const live = [];
  for (const d of ordered) {
    if (latest.get(proposalId(d.proposal)) !== d || d.decision !== 'accepted') continue;
    const p = d.proposal;
    // A `keep` is a RETRACTION: the trainers changed their mind, or a later
    // audit overturned an earlier call, and accepting it undoes that call
    // without the athlete hunting down the original. It cancels only what he
    // had accepted BEFORE it, on that exercise+scope.
    //
    // It is NOT a permanent veto. Treating it as one — filtering the whole
    // accepted set, with no notion of time — meant the 2026-07-22 face-pull
    // reversal silently blocked every future change to that slot: the panel
    // could re-argue the case with new evidence, he could tap Yes, and the
    // program would not move. Nothing surfaced the no-op.
    if (p.kind === 'keep') {
      for (let i = live.length - 1; i >= 0; i--) if (slotKey(live[i]) === slotKey(p)) live.splice(i, 1);
      continue;
    }
    live.push(p);
  }
  if (!live.length) return plan;

  const next = { ...plan, sessions: Object.fromEntries(Object.entries(plan.sessions).map(([k, s]) => [k, { ...s, exercises: [...s.exercises] }])) };
  const targets = (scope) => (scope && next.sessions[scope] ? [scope] : Object.keys(next.sessions));

  for (const p of live) {
    for (const t of targets(p.scope)) {
      const list = next.sessions[t].exercises;
      const i = list.findIndex((x) => x.id === p.exercise);
      if (p.kind === 'remove') {
        if (i !== -1) list.splice(i, 1);
      } else if (p.kind === 'volume') {
        if (i !== -1 && p.sets > 0) list[i] = { ...list[i], sets: Math.round(p.sets) };
      } else if (p.kind === 'swap') {
        // Keep the slot's POSITION and set count, change the movement — but
        // NEVER carry the old slot's reps or units onto the new one. The
        // plank slot is `repMin/repMax: 60, repUnit: 'sec'`; spreading that
        // onto a rep movement is how the app prescribed "Hanging Leg Raise
        // 2 × 60 sec" on 2026-07-30 — a timed hold five times longer than
        // the hardest set he had ever logged, for an exercise measured in
        // reps. The replacement's own shape wins: the proposal's explicit
        // `slot` first (the trainer's call), else the movement's real
        // prescription elsewhere in the signed plan. If the swap crosses the
        // timed/untimed boundary and neither is available, it is dropped
        // rather than guessed at — same rule as an unknown replacement.
        if (i !== -1 && p.replacement && plan.exercises[p.replacement]) {
          const shape = p.slot ?? nativeSlot(plan, p.replacement);
          const crosses = !!plan.exercises[p.exercise]?.timed !== !!plan.exercises[p.replacement]?.timed;
          if (shape || !crosses) {
            const slot = { ...list[i], id: p.replacement, seed: null, seedNote: `Swapped in for ${exMeta(plan, p.exercise).name} — set your working weight` };
            if (shape) {
              // sets stay with the SLOT (the program's volume for this
              // position) unless the proposal explicitly reallocates it.
              if (p.slot?.sets > 0) slot.sets = Math.round(p.slot.sets);
              if (shape.repMin > 0) slot.repMin = Math.round(shape.repMin);
              if (shape.repMax >= shape.repMin) slot.repMax = Math.round(shape.repMax);
              if (shape.rest > 0) slot.rest = shape.rest;
              if (shape.repUnit) slot.repUnit = shape.repUnit;
              else delete slot.repUnit;
            }
            list[i] = slot;
          }
        }
      } else if (p.kind === 'reprange') {
        // Change what a slot ASKS FOR without touching the movement — e.g.
        // flipping which push day carries the heavy 8-10 exposure and which
        // carries the 10-12, when the logs show the labels are backwards.
        if (i !== -1 && p.repMin > 0 && p.repMax >= p.repMin) {
          list[i] = { ...list[i], repMin: Math.round(p.repMin), repMax: Math.round(p.repMax) };
        }
      } else if (p.kind === 'reorder') {
        if (i !== -1 && Number.isInteger(p.position)) {
          const [slot] = list.splice(i, 1);
          list.splice(Math.max(0, Math.min(list.length, p.position)), 0, slot);
        }
      } else if (p.kind === 'add') {
        if (i === -1 && plan.exercises[p.exercise] && p.slot?.sets > 0) {
          const slot = {
            id: p.exercise, sets: p.slot.sets, repMin: p.slot.repMin ?? 8, repMax: p.slot.repMax ?? 12,
            rest: p.slot.rest ?? 90, seed: p.slot.seed ?? null,
            seedNote: p.slot.seed == null ? 'Added by your trainers — set your working weight' : undefined,
          };
          const at = Number.isInteger(p.position) ? p.position : list.length;
          list.splice(Math.max(0, Math.min(list.length, at)), 0, slot);
        }
      }
    }
  }
  return next;
}

// ——— Phase calendar ———

export function phaseForDate(plan, dateStr, overrideId = null) {
  const phases = plan.phases;
  let phase = overrideId ? phases.find((p) => p.id === overrideId) : null;
  if (!phase) {
    phase = phases.find((p) => dateStr >= p.start && dateStr <= p.end);
    if (!phase && dateStr > phases[phases.length - 1].end) phase = phases[phases.length - 1];
  }
  // `date` rides along so downstream (coach freshness) can judge age against
  // the night being prescribed rather than against wall-clock "now".
  if (!phase) return { phase: null, week: null, weeks: null, override: false, date: dateStr };
  const days = Math.max(0, Math.round((new Date(dateStr + 'T12:00') - new Date(phase.start + 'T12:00')) / 86400000));
  const weeks = Math.ceil((Math.round((new Date(phase.end + 'T12:00') - new Date(phase.start + 'T12:00')) / 86400000) + 1) / 7);
  return { phase, week: Math.floor(days / 7) + 1, weeks, override: !!overrideId, date: dateStr };
}

// ——— Rotation ———

// Exported because the DISPLAY layer needs the same fence. Every view that
// counted `store.history` raw inherited the cardio entries this filter
// exists to exclude: the session header read "night 63" on his 62nd lift,
// and Mission Control's "nights this week" gauge read 7/6 over a six-day
// rotation. The discipline was here; the screens just weren't using it.
export function sortedHistory(history) {
  // Supplemental entries (logged conditioning / cardio) carry no barbell work and
  // must never move "what's next" or feed a prescription. Fencing them here covers
  // rotationNext, lastPerformance/performances, isStalled, and validateSet in one
  // place — the same discipline as the deload/sinceDate fences.
  return [...history].filter((e) => !e.supplemental).sort((a, b) => a.date.localeCompare(b.date));
}

export function rotationNext(plan, history, override = null) {
  // Manual day pin (settings.dayOverride): after a break the athlete picks
  // where the six-day order resumes; the pin is consumed when a new night is
  // banked (store.upsertEntry). Only a session the plan knows is honored — a
  // pin persisted under an older plan falls back to the automatic order.
  if (override && plan.sessions?.[override]) return override;
  const rot = plan.rotation;
  const sorted = sortedHistory(history);
  const last = sorted[sorted.length - 1];
  if (!last) return rot[0];
  const i = rot.indexOf(last.session_type);
  return rot[(i + 1) % rot.length];
}

// ——— Performance lookups ———

// Most recent logged performance of an exercise within a session type.
// sinceDate fences off the legacy import; skipPhases fences off deload entries
// so a meso never progresses off deload loads.
// A SLOT'S LOAD HISTORY IS ONLY THE NIGHTS HE DID THE SAME MOVEMENT.
// `as` is what he actually did in the slot at that gym — the app's "Doing
// something else here". On 2026-09-17 the Calf Press slot carries
// as: "Kettlebell swing/thrusts", logged 35/40/45. Nothing in this chain read
// that field, so the app took a kettlebell swing as the calf press's new
// level: the next Legs B would have asked 40/45/50 of a man with a proven
// 300 lb calf press, and the trainers' dossier said the same. He had told the
// app exactly what he did; the app just wasn't reading it.
//
// Pass the `as` key to fence a reader — `as: null` means the program's own
// lift, a string means that substitute, and OMITTING the key leaves the
// reader unfenced. Display sites stay unfenced on purpose: the card shows
// that night WITH its `as` label, which is the honest thing to show.
const asOf = (ex) => (typeof ex?.as === 'string' && ex.as.trim() ? ex.as.trim() : null);
const wants = (opts) => ('as' in opts ? (typeof opts.as === 'string' && opts.as.trim() ? opts.as.trim() : null) : undefined);
const movementOk = (ex, want) => want === undefined || asOf(ex) === want;

export function lastPerformance(history, sessionType, exId, opts = {}) {
  const { sinceDate = null, skipPhases = [] } = opts;
  const want = wants(opts);
  const sorted = sortedHistory(history);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i];
    if (e.session_type !== sessionType) continue;
    if (sinceDate && e.date < sinceDate) break;
    if (skipPhases.includes(e.phase)) continue;
    const ex = e.exercises.find((x) => x.id === exId);
    if (ex && ex.sets.length && movementOk(ex, want)) return { entry: e, ex };
  }
  return null;
}

// Most recent logged performance of an exercise in ANY session type — the
// honest answer to "what did I lift last time?" for lifts that live on
// several days of the rotation.
export function lastPerformanceAnywhere(history, exId, opts = {}) {
  const want = wants(opts);
  const sorted = sortedHistory(history);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const ex = sorted[i].exercises.find((x) => x.id === exId);
    if (ex && ex.sets.length && movementOk(ex, want)) return { entry: sorted[i], ex };
  }
  return null;
}

// Most recent performance that carries the lifter's own note — per-exercise
// notes resurface on the card the next time the exercise comes up.
export function lastNotedPerformance(history, exId) {
  const sorted = sortedHistory(history);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const ex = sorted[i].exercises.find((x) => x.id === exId);
    if (ex && ex.note && String(ex.note).trim()) return { entry: sorted[i], ex };
  }
  return null;
}

export function performances(history, sessionType, exId, limit = Infinity, opts = {}) {
  const want = wants(opts);
  const out = [];
  const sorted = sortedHistory(history);
  for (let i = sorted.length - 1; i >= 0 && out.length < limit; i--) {
    const e = sorted[i];
    if (e.session_type !== sessionType) continue;
    const ex = e.exercises.find((x) => x.id === exId);
    if (ex && ex.sets.length && movementOk(ex, want)) out.push({ entry: e, ex });
  }
  return out.reverse();
}

export function topSet(sets) {
  let best = null;
  for (const s of sets) {
    if (s.reps < 1) continue;
    if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) best = s;
  }
  return best;
}

// All-time best working weight (ignores 0-rep misses), across every session type.
export function allTimeBest(history, exId, opts = {}) {
  const want = wants(opts);
  let best = null;
  for (const e of history) {
    if (e.supplemental || !e.exercises) continue; // conditioning entries hold no lifts
    for (const x of e.exercises) {
      if (x.id !== exId || !movementOk(x, want)) continue;
      const t = topSet(x.sets);
      if (t && (!best || t.weight > best.weight)) best = t;
    }
  }
  return best;
}

// ——— Progression ———

// Double progression trigger: every set hit the top of the rep range.
export function progressionMet(sets, repMax) {
  return sets.length > 0 && sets.every((s) => s.reps >= repMax);
}

function deloadPhaseIds(plan) {
  return plan.phases.filter((p) => p.type === 'deload').map((p) => p.id);
}

function calibrationStart(plan) {
  const c = plan.phases.find((p) => p.type === 'calibration');
  return c ? c.start : plan.phases[0].start;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Last session's sets, in the order they were PERFORMED. Edited sets restamp
// `at`, so the stored array order can put the heaviest set first — copying
// that index-by-index prescribed 157.5 / 142.5 / 150 the day after a clean
// ascending ramp. Chronology is the truth when every set carries a timestamp.
export function performedOrder(sets) {
  const s = [...sets];
  if (s.length > 1 && s.every((q) => q.at)) s.sort((a, b) => a.at - b.at);
  return s;
}

// Never prescribe a weight LOWER than an earlier set of the same exercise.
// A logged 30 / 37.5 / 30 was one night's mid-session experiment; echoing the
// dip back as next session's target (the "weights went up then down" ask the
// user rightly flagged) turns a one-off into a template. The envelope keeps
// deliberate ramps and flattens only the dips: 30 / 37.5 / 37.5.
function envelopeUp(sets) {
  let run = -Infinity;
  return sets.map((q) => {
    if (!(q.weight > 0)) return q;
    run = Math.max(run, q.weight);
    return { ...q, weight: run };
  });
}

const normalizeSets = (sets) => envelopeUp(performedOrder(sets));

// Best qualifying top set of this exercise in any OTHER session type since
// `afterDate` (or since calibration when the slot has no same-day history).
// Qualifying = reps meet THIS slot's rep floor, so a heavy triple on a
// strength day never inflates a 15-rep day. Deload entries lift light on
// purpose and never speak here; supplemental entries are already fenced.
export function crossDayBest(plan, history, sessionType, slot, afterDate = null) {
  // Same fence as the rest of the load chain: a substitute done on another
  // day is not proof about THIS slot's movement.
  const want = exMeta(plan, slot.id)?.as ?? null;
  const skip = deloadPhaseIds(plan);
  const since = calibrationStart(plan);
  let best = null;
  for (const e of sortedHistory(history)) {
    if (e.session_type === sessionType) continue;
    if (e.date < since) continue;
    // STRICTLY older is excluded — same-date work is not. This user trains
    // two sessions on one calendar date (2026-01-10, 2026-02-13), and a `<=`
    // fence silently threw that evidence away while the Mission screen
    // promised "progress on one day carries to every other day it appears".
    // Date-only granularity can't order two same-day sessions, so trust the
    // heavier proof: applyCross only ever raises, never lowers.
    if (afterDate && e.date < afterDate) continue;
    if (skip.includes(e.phase)) continue;
    const ex = e.exercises.find((x) => x.id === slot.id);
    if (!ex || asOf(ex) !== (typeof want === 'string' && want.trim() ? want.trim() : null)) continue;
    for (const s of ex.sets) {
      if (!(s.weight > 0) || (s.reps ?? 0) < slot.repMin) continue;
      if (!best || s.weight > best.weight || (s.weight === best.weight && e.date > best.date)) {
        best = { weight: s.weight, reps: s.reps, date: e.date, sessionType: e.session_type };
      }
    }
  }
  return best;
}

// ——— Coach directives: the daily trainer review ———
// The daily trainer agent commits data/coach/latest.json. Its overrides drive
// the prefills ONLY while the review is fresh — the moment a session is
// logged that the trainer hasn't seen, every override expires and the
// standing rules take back over (and the UI says so). The engine never
// trusts the packet blindly: weights are capped near what this lift has
// actually demonstrated.

// A packet is fresh only while BOTH hold: nothing has been logged that the
// trainer hasn't seen, AND it isn't stale by the calendar. Without the age
// bound, a rest week (or a missed run of morning reviews) let a weeks-old
// review keep driving tonight's numbers under a banner claiming it had read
// everything — including straight through a phase boundary into a deload.
export const COACH_MAX_AGE_DAYS = 3;

export function coachFresh(history, coach, today = null) {
  if (!coach?.reviewed_through) return false;
  if (sortedHistory(history).some((e) => e.date > coach.reviewed_through)) return false;
  const now = today ?? new Date().toLocaleDateString('sv-SE');
  const written = coach.date ?? coach.reviewed_through;
  const age = Math.round((new Date(now + 'T12:00') - new Date(written + 'T12:00')) / 86400000);
  return age <= COACH_MAX_AGE_DAYS;
}

function coachOverrideFor(coach, sessionType, exId) {
  return coach?.overrides?.find?.((o) => o.exercise === exId && (!o.session || o.session === sessionType)) ?? null;
}

// Ceiling for a coach-prescribed weight: two honest steps above the best top
// set this lift has shown since calibration (deloads excluded), or above the
// seed when it hasn't been logged yet. A trainer can hold or cut without
// limit; a runaway raise gets clamped.
function coachCap(plan, history, slot, inc) {
  const since = calibrationStart(plan);
  const skip = deloadPhaseIds(plan);
  let base = 0;
  for (const e of sortedHistory(history)) {
    if (e.date < since || skip.includes(e.phase)) continue;
    const ex = e.exercises.find((x) => x.id === slot.id);
    const t = ex && topSet(ex.sets);
    if (t && t.weight > base) base = t.weight;
  }
  if (!base && slot.seed != null) base = slot.seed;
  if (!base) return Infinity;
  return roundW(base + 2 * inc);
}

// Builds the pre-filled targets for one exercise slot of a session template.
// Returns { sets: [{weight, reps}], basis, prevTop, note, increment, pct,
// cross, coach }. `coach` (optional) is the daily trainer review packet.
export function prescribe(plan, history, sessionType, slot, phaseInfo, coach = null) {
  const { phase } = phaseInfo;
  const inc = increment(plan, slot.id);
  const meta = exMeta(plan, slot.id);
  const nSets = phase?.type === 'deload' ? Math.max(1, Math.round(slot.sets * (phase.setFactor ?? 0.6))) : slot.sets;
  const mk = (w, r) => Array.from({ length: nSets }, () => ({ weight: w, reps: r }));
  // The trainer's word comes first — but only fresh and capped.
  // Bodyweight slots USED to be excluded here on the grounds that there was
  // "nothing to prescribe but reps". There is: the plank went 60s → 45s and
  // the recovery seat wrote "your card will still say 60 because I cannot set
  // a timed hold from here" in two consecutive reviews. It was right, and the
  // hole was here. A bodyweight override carries weight 0 and the reps (or
  // seconds) it wants; the cap has nothing to do on it.
  if (coach && coachFresh(history, coach, phaseInfo?.date ?? null)) {
    const o = coachOverrideFor(coach, sessionType, slot.id);
    const shaped = o && Array.isArray(o.sets) && o.sets.length && o.sets.every((s) => s.reps > 0
      && (meta.bodyweight ? (s.weight ?? 0) === 0 : s.weight > 0));
    if (shaped) {
      const cap = coachCap(plan, history, slot, inc);
      // A REP ceiling must not be applied to SECONDS. The plan's own plank is
      // 2 × 60 sec; clamping it at maxReps (30) made a 60-second hold
      // inexpressible — the trainer would have asked for 45 and the card would
      // have printed 30.
      const maxReps = slot.repUnit === 'sec'
        ? Math.max(600, slot.repMax ?? 0)
        : (plan.rules?.validation?.maxReps ?? 30);
      // In a deload week the app's own notice bar promises ~60% of the sets.
      // A packet restoring the full count would make that notice false, so the
      // deload's set budget wins over the trainer's count (its weights don't).
      const askSets = o.sets.slice(0, phase?.type === 'deload' ? nSets : slot.sets + 2);
      // A bodyweight slot carries no load, so there is no weight ceiling to
      // cap against — only the hold or the rep count.
      const sets = askSets.map((s) => ({
        weight: meta.bodyweight ? 0 : Math.min(cap, s.weight),
        reps: clamp(Math.round(s.reps), 1, maxReps),
      }));
      // If the safety cap moved the trainer's number, the card
      // MUST say so — otherwise it quotes a reason for 50 while prefilling
      // 50.5, and the athlete is reading a justification for a weight that is
      // not on screen.
      const asked = sets.some((s, i) => s.weight !== askSets[i].weight)
        ? askSets.map((s) => s.weight) : null;
      return {
        sets,
        basis: 'coach',
        prevTop: null,
        coach: {
          reason: o.reason ?? null,
          date: coach.date ?? coach.reviewed_through ?? null,
          asked,
          // the panel's disagreement on THIS lift, if the room split on it
          dissent: coach.dissent?.find?.((d) => d.exercise === slot.id) ?? null,
        },
      };
    }
  }

  if (meta.bodyweight) {
    const last = lastPerformance(history, sessionType, slot.id, { sinceDate: calibrationStart(plan), as: meta.as ?? null });
    // Anchor on the BEST set of the last visit, not whichever happened to be
    // logged first — a 9,8,10 day proved 10, and that's the bar to hold.
    const reps = last ? clamp(topSet(last.ex.sets)?.reps ?? slot.repMin, slot.repMin, slot.repMax) : slot.repMin;
    return { sets: mk(0, reps), basis: 'bodyweight', prevTop: null };
  }

  if (phase?.type === 'calibration') {
    if (slot.seed == null) return { sets: mk(null, slot.repMin), basis: 'verify', prevTop: null, note: slot.seedNote };
    const bo = backoffInfo(slot.seed, phase.loadFactor ?? 0.9, inc);
    return { sets: mk(bo.weight, slot.repMin), basis: 'calibration', prevTop: slot.seed, pct: bo.pct };
  }

  // Fenced on the movement: `as` is what he does in this slot at this gym, and
  // a night logged under a different one is a different exercise (see
  // lastPerformance). Without this the Calf Press slot progressed off a
  // kettlebell swing.
  const fence = { sinceDate: calibrationStart(plan), skipPhases: phase?.type === 'deload' ? [] : deloadPhaseIds(plan), as: meta.as ?? null };
  const last = lastPerformance(history, sessionType, slot.id, fence);

  if (phase?.type === 'deload') {
    const baseSets = last ? normalizeSets(last.ex.sets) : slot.seed != null ? mk(slot.seed, slot.repMin) : null;
    if (!baseSets) return { sets: mk(null, slot.repMin), basis: 'verify', prevTop: null, note: slot.seedNote };
    const factor = phase.loadFactor ?? 0.8;
    // A deload cuts SET COUNT, and the sets it must keep are the working ones.
    // Indexing a ramp from the front kept the warm-ups and threw the top set
    // away — so a 155/185/205/205 night deloaded to 120/145 while the label
    // underneath claimed "140 lb = 78% of 205", arithmetic that was simply
    // false. Take the last nSets of the (ascending) base instead.
    const off = Math.max(0, baseSets.length - nSets);
    const sets = Array.from({ length: nSets }, (_, i) => {
      const src = baseSets[Math.min(i + off, baseSets.length - 1)];
      return {
        weight: src.weight > 0 ? backoffInfo(src.weight, factor, inc).weight : src.weight,
        reps: slot.repMin,
      };
    });
    // pct describes the TOP set — a ramped base means every set carries its
    // own ratio, and the headline should match the heaviest bar of the day.
    const top = topSet(baseSets);
    return { sets, basis: 'deload', prevTop: top?.weight ?? null, pct: top ? backoffInfo(top.weight, factor, inc).pct : null };
  }

  // The floor set elsewhere in the rotation: face pulls close four different
  // days, chest press lives on both push days, leg work repeats — progress
  // made on ANY of them since this slot's own last visit carries over instead
  // of each day type climbing its own blind silo.
  const cross = meta.bodyweight ? null
    : crossDayBest(plan, history, sessionType, slot, last?.entry.date ?? null);
  const applyCross = (sets, prevTop, source = null) => {
    const top = Math.max(0, ...sets.map((s) => s.weight ?? 0));
    if (!cross || cross.weight <= top) return null;
    // Shift the whole shape up so the TOP set lands on the proven weight — a
    // deliberate ramp stays a ramp, a flat prescription stays flat.
    const delta = cross.weight - top;
    // A zero-weight set inside a real shape is an anomaly (saved without a
    // weight) — leave it alone rather than teleport it to the day's top. Only
    // the all-zero shape (a verify slot) adopts the cross weight wholesale.
    return {
      sets: top > 0
        ? sets.map((s) => ({ ...s, weight: s.weight > 0 ? roundW(s.weight + delta) : s.weight }))
        : sets.map((s) => ({ ...s, weight: cross.weight })),
      basis: 'cross',
      prevTop,
      cross,
      // carried so the card never falls back to an UNFENCED "most recent"
      // lookup and labels a deload night as this day's last visit
      ...(source ? { source } : {}),
    };
  };

  if (!last) {
    if (slot.seed == null) {
      const lifted = applyCross(mk(0, slot.repMin), null);
      if (lifted) return lifted; // real recent work beats "verify" every time
      return { sets: mk(null, slot.repMin), basis: 'verify', prevTop: null, note: slot.seedNote };
    }
    const seeded = mk(slot.seed, slot.repMin);
    return applyCross(seeded, null) ?? { sets: seeded, basis: 'seed', prevTop: null, note: slot.seedNote };
  }

  const prev = normalizeSets(last.ex.sets);
  const prevTop = topSet(prev)?.weight ?? null;
  // Progression needs every prescribed set, not just every logged one —
  // 2-of-4 sets at the top of the range is an unfinished session, not a trigger.
  const grow = phase?.type !== 'prep' && prev.length >= slot.sets && progressionMet(prev, slot.repMax);
  // Smashing the ceiling by 2+ reps on every set earns a double jump — but
  // only on compounds. +10 on a deadlift is ~4%; +10 on a curl is a form
  // breakdown waiting to happen, so isolation lifts take the single step no
  // matter how loud the rep surplus.
  const rungs = grow && meta.compound === true && prev.every((s) => s.reps >= slot.repMax + 2) ? 2 : 1;
  const jump = inc * rungs;
  const lastPhase = plan.phases.find((p) => p.id === last.entry.phase);
  const fromCalibration = lastPhase?.type === 'calibration';
  // Progressing out of calibration returns at least to the seed — the -10%
  // week must never sandbag the meso. But the seed is only owed if the
  // calibration top actually landed at its reduced ask: a lift that came in
  // far under (20 against a 25 ask, seed 30) hasn't earned a teleport to a
  // weight it never touched — it climbs one honest jump from where it stands.
  const seedEarned = fromCalibration && slot.seed != null && prevTop != null
    && prevTop >= backoffInfo(slot.seed, lastPhase?.loadFactor ?? 0.9, inc).weight;
  // THE ASK, not the memory of last time. While the weight is held, the ONLY
  // thing that earns the raise is repMax on every set — that is exactly what
  // progressionMet tests, and exactly what the card's own sentence promises
  // ("hit 12 reps on every set and the app raises this lift next time").
  // Copying last visit's reps forward put "×10" on screen underneath that
  // sentence, and an athlete who obeyed the card to the letter could never
  // trigger the progression the same card was promising him. Prep is the one
  // exception: it holds by design and its card says matching last time IS the
  // win, so prep alone keeps last visit's reps.
  const askReps = (src) => (phase?.type === 'prep'
    ? clamp(src.reps, slot.repMin, slot.repMax)
    : slot.repMax);
  // When the night ran LONGER than the plan asks for, the sets that survive
  // into the prescription are the working ones. Indexing a ramp from the front
  // kept the warm-ups and threw the top set away — a 142.5/142.5/150 night
  // came back as two sets of 142.5, quietly retiring a weight he had already
  // pressed. The deload branch already takes the tail for exactly this reason.
  const off = Math.max(0, prev.length - nSets);
  const sets = Array.from({ length: nSets }, (_, i) => {
    const src = prev[Math.min(i + off, prev.length - 1)];
    // A set saved without a weight is an anomaly, not a rung to climb from:
    // adding an increment to 0 invents a 7.5 lb "working set". Same rule
    // applyCross already uses — leave the anomaly exactly where it is.
    if (!(src.weight > 0)) return { weight: src.weight, reps: grow ? slot.repMin : askReps(src) };
    // Held: the weight he logged, to the decimal. Whatever he typed at
    // whatever gym is the only model of the machine the app has.
    if (!grow) return { weight: src.weight, reps: askReps(src) };
    let w = roundW(src.weight + jump);
    if (seedEarned) w = Math.max(w, slot.seed);
    return { weight: w, reps: slot.repMin };
  });
  const newTop = Math.max(0, ...sets.map((s) => s.weight ?? 0));
  // The visit these numbers were actually built from — carried out whole so
  // the card can display THAT session rather than re-deriving "most recent"
  // with a different fence and contradicting itself.
  const source = { date: last.entry.date, entry: last.entry, ex: last.ex };
  // Per-set rises, so a MIXED shape (set 1 climbs, the top two hold) can't
  // be labelled "weight holds" while set 1 in fact went up. Zero only when
  // nothing moved at all.
  const rose = grow ? Math.max(0, ...sets.map((s, i) => (s.weight ?? 0) - (prev[Math.min(i, prev.length - 1)].weight ?? 0))) : 0;
  const base = {
    sets,
    basis: grow ? 'progress' : phase?.type === 'prep' ? 'hold' : 'repeat',
    prevTop,
    increment: grow && prevTop != null ? +Math.max(rose, newTop - prevTop).toFixed(2) : 0,
    source,
  };
  if (phase?.type === 'prep') return base; // prep holds — no cross-day raises either
  return applyCross(sets, prevTop, source) ?? base;
}

// Every slot of a session, prescribed — the whole night's numbers in one
// call, so a preview screen shows EXACTLY what the session screen will
// prefill (same function, same fences) instead of a second, drifting guess.
export function previewSession(plan, history, sessionType, phaseInfo, coach = null) {
  const session = plan.sessions[sessionType];
  if (!session) return [];
  return session.exercises.map((slot) => {
    const rx = prescribe(plan, history, sessionType, slot, phaseInfo, coach);
    const meta = exMeta(plan, slot.id);
    // TWO distinct facts, never conflated: the visit this day's numbers were
    // built from, and any work done since on another day. Showing only the
    // latter under a sentence about the former put three different sessions
    // on one card and made the app look broken (it was).
    // rx.source is authoritative — it is the entry prescribe actually read,
    // through prescribe's own fences (calibration cutoff, deload skip). The
    // unfenced fallback only runs for bases that read no prior visit.
    const sameDay = rx.source ?? lastPerformance(history, sessionType, slot.id, {});
    const anywhere = lastPerformanceAnywhere(history, slot.id);
    const other = anywhere && anywhere.entry !== sameDay?.entry ? anywhere : null;
    return {
      id: slot.id,
      name: meta.name,
      bodyweight: !!meta.bodyweight,
      repMin: slot.repMin, repMax: slot.repMax, repUnit: slot.repUnit ?? null,
      superset: slot.superset ?? null,
      rest: slot.rest ?? 90,
      inc: increment(plan, slot.id) || 2.5,
      unit: unitFor(plan, slot.id),
      as: meta.as ?? null, // what he actually does in this slot at this gym
      sets: rx.sets,
      basis: rx.basis,
      prevTop: rx.prevTop ?? null,
      bump: rx.increment ?? 0,
      pct: rx.pct ?? null,
      note: rx.note ?? null,
      cross: rx.cross ?? null,
      coachRx: rx.coach ?? null,
      srcDate: rx.source?.date ?? null,
      stalled: isStalled(plan, history, sessionType, slot),
      // this day's own last visit — the one the standing rules copied from.
      // Sets are shown in the order they were PERFORMED (the order the engine
      // read them in), never raw array order, or the strip and the
      // prescription describe different nights.
      last: sameDay ? {
        date: sameDay.entry.date,
        session: sameDay.entry.session_type,
        gym: sameDay.entry.gym ?? null,
        sets: performedOrder(sameDay.ex.sets),
        note: sameDay.ex.note ?? null,
        deload: deloadPhaseIds(plan).includes(sameDay.entry.phase),
      } : null,
      // the same lift done SINCE then on a different day, if any
      other: other ? {
        date: other.entry.date,
        session: other.entry.session_type,
        gym: other.entry.gym ?? null,
        sets: performedOrder(other.ex.sets),
        note: other.ex.note ?? null,
        newer: !sameDay || other.entry.date > sameDay.entry.date,
        deload: deloadPhaseIds(plan).includes(other.entry.phase),
        sameType: other.entry.session_type === sessionType,
      } : null,
    };
  });
}

// ——— Stall detection ———

// 3 sessions without progression on a lift → flag. A weight increase or a
// met progression-trigger on the newest performance clears it.
export function isStalled(plan, history, sessionType, slot) {
  const since = calibrationStart(plan);
  const perfs = performances(history, sessionType, slot.id, Infinity, { as: exMeta(plan, slot.id).as ?? null })
    .filter((p) => p.entry.date >= since && !deloadPhaseIds(plan).includes(p.entry.phase));
  if (perfs.length < 3) return false;
  const recent = perfs.slice(-4);
  const tops = recent.map((p) => topSet(p.ex.sets) ?? { weight: 0, reps: 0 });
  // Progress means beating the best the window has already seen — weight up,
  // or reps up at that same best weight. Merely climbing back to a weight
  // already lifted (100 → 95 → 100 → 95) is the same ground twice, not
  // progress, so the adjacent up-tick doesn't count.
  let best = tops[0];
  let increased = false;
  for (let i = 1; i < tops.length; i++) {
    const t = tops[i];
    if (t.weight > best.weight || (t.weight === best.weight && t.reps > best.reps)) {
      increased = true;
      best = t;
    }
  }
  if (increased) return false;
  // A trigger that keeps firing while the bar never moves is not a lift on
  // the verge of progress — it's a lift going nowhere with the light stuck
  // green. Fixed rep slots (15/15) meet the trigger every single session, so
  // without this check the flag could never fire on them at all.
  const run = recent.slice(-3);
  const runTops = tops.slice(-3);
  const trapped = runTops.every((t) => t.weight === runTops[0].weight)
    && run.every((p) => progressionMet(p.ex.sets, slot.repMax));
  return trapped || !progressionMet(recent[recent.length - 1].ex.sets, slot.repMax);
}

export function stalledLifts(plan, history) {
  const out = [];
  for (const [type, session] of Object.entries(plan.sessions)) {
    for (const slot of session.exercises) {
      if (exMeta(plan, slot.id).bodyweight) continue;
      if (isStalled(plan, history, type, slot)) {
        out.push({ sessionType: type, id: slot.id, name: exMeta(plan, slot.id).name });
      }
    }
  }
  return out;
}

// What a stall actually looks like, for a screen that REPORTS it instead of
// issuing orders about it. The Mission tab used to answer a stall with "Swap
// variations at the next deload" — an instruction the athlete has no control
// to carry out (structural changes only happen by accepting a trainer
// proposal), and one that contradicted what his trainers had actually called.
// Returns the weight the top set keeps landing on and how many sessions in
// the window have sat there, so the screen can state the fact and name who is
// handling it.
export function stallDetail(plan, history, sessionType, exId) {
  const since = calibrationStart(plan);
  const perfs = performances(history, sessionType, exId, Infinity, { as: exMeta(plan, exId).as ?? null })
    .filter((p) => p.entry.date >= since && !deloadPhaseIds(plan).includes(p.entry.phase));
  const recent = perfs.slice(-4);
  if (!recent.length) return null;
  const tops = recent.map((p) => ({ date: p.entry.date, ...(topSet(p.ex.sets) ?? { weight: 0, reps: 0 }) }));
  const weight = Math.max(...tops.map((t) => t.weight));
  const at = tops.filter((t) => t.weight === weight);
  return { weight, sessions: at.length, dates: at.map((t) => t.date), lastDate: tops[tops.length - 1].date };
}

// ——— PR detection ———

export function isPR(history, exId, weight, reps, opts = {}) {
  if (reps < 1 || !weight) return false;
  const best = allTimeBest(history, exId, opts);
  return !best || weight > best.weight;
}

// Best reps ever achieved at exactly this weight (rep-PR detection).
export function isRepPR(history, exId, weight, reps, opts = {}) {
  if (!weight || reps < 1) return false;
  const want = wants(opts);
  let best = null;
  for (const e of history) {
    if (e.supplemental || !e.exercises) continue; // conditioning entries hold no lifts
    for (const x of e.exercises) {
      if (x.id !== exId || !movementOk(x, want)) continue;
      for (const s of x.sets) {
        if (s.weight === weight && s.reps >= 1) best = Math.max(best ?? 0, s.reps);
      }
    }
  }
  return best != null && reps > best;
}

// ——— Input validation (warn, never block) ———

// Back-off phases lift light ON PURPOSE; reading their history (or judging
// their inputs) at face value is how a deload poisons a month of averages.
const loadFactorOf = (phase) => {
  if (phase?.type === 'deload') return phase.loadFactor ?? 0.8;
  if (phase?.type === 'calibration') return phase.loadFactor ?? 0.9;
  return 1;
};

export function validateSet(plan, history, exId, weight, reps, { phase = null, prescribed = null } = {}) {
  const warnings = [];
  const meta = exMeta(plan, exId);
  if (reps > (plan.rules.validation.maxReps ?? 30)) {
    warnings.push({ code: 'reps', msg: `${reps} reps — check the entry` });
  }
  if (!meta.bodyweight && (weight === 0 || weight == null)) {
    warnings.push({ code: 'zero', msg: 'Weight is 0 on a loaded exercise' });
  }
  // A weight the engine itself prescribed cannot be a typo — the app never
  // second-guesses its own ask, whatever the history looks like. (Legacy
  // imports can't be normalized away — per-hand vs per-pair logging, gym
  // changes — so this immunity is the only guard that always holds.)
  const rxImmune = prescribed != null && weight === prescribed;
  if (weight > 0 && !meta.bodyweight && !rxImmune) {
    const tops = [];
    const sorted = sortedHistory(history);
    for (let i = sorted.length - 1; i >= 0 && tops.length < (plan.rules.validation.trailingSessions ?? 5); i--) {
      const e = sorted[i];
      const ex = e.exercises.find((x) => x.id === exId);
      const t = ex && topSet(ex.sets);
      // each top set is read through ITS OWN phase's factor, so a 140 lb
      // deload single stands in the average as the 175 lb lift it represents;
      // legacy/unknown phases pass through at face value.
      if (t) tops.push(t.weight / loadFactorOf(plan.phases.find((q) => q.id === e.phase)));
    }
    if (tops.length >= 3) {
      const avg = tops.reduce((a, b) => a + b, 0) / tops.length;
      // ...and the expectation bends to the CURRENT phase: in a deload week
      // the right weight IS 20% lighter, so that's the yardstick.
      const factor = loadFactorOf(phase);
      const expect = avg * factor;
      const dev = Math.abs(weight - expect) / expect;
      if (dev > (plan.rules.validation.deviationPct ?? 25) / 100) {
        // show percent against the SAME rounded number we display, so the
        // arithmetic in the message checks out by hand — in the unit the
        // lift is shown in, or the sentence quotes a number the card never shows
        const unit = unitFor(plan, exId);
        const shown = (lb) => Math.round(unit === 'kg' ? toKg(lb) : lb);
        const expShown = shown(expect);
        const wShown = unit === 'kg' ? toKg(weight) : weight;
        const pct = Math.round((Math.abs(wShown - expShown) / expShown) * 100);
        const dir = wShown < expShown ? 'lighter' : 'heavier';
        const msg = factor === 1
          ? `${pct}% ${dir} than your recent top sets (avg ${expShown} ${unit})`
          : `${pct}% ${dir} than expected for ${phase.type} (~${expShown} ${unit} = ${Math.round(factor * 100)}% of your ${shown(avg)} ${unit} average)`;
        warnings.push({ code: 'dev', msg });
      }
    }
  }
  return warnings;
}

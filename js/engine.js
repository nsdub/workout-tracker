// Pure program logic: phase calendar, rotation, prescriptions, progression,
// stall detection, PRs, input validation. No DOM, no storage — testable in node.

export function roundLoad(w) {
  return Math.round(w / 2.5) * 2.5;
}

// Back-off weeks (calibration 90%, deload 80%) must never round UP past their
// target and must land on the program's OWN increment grid — 5 lb upper /
// 10 lb lower — so every prescribed weight is actually loadable (a rope stack
// has no 72.5, a cable no 27.5). Rounds the reduced load DOWN to that
// increment; a loaded lift is never dropped below a single increment.
export function backoffLoad(w, inc) {
  if (!(inc > 0)) return roundLoad(w); // no known increment → legacy 2.5 grid
  return Math.max(inc, Math.floor(w / inc) * inc);
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

export function increment(plan, id) {
  const meta = exMeta(plan, id);
  if (meta.bodyweight) return 0;
  // A lift that lives on its own grid — 2.5 lb dumbbell steps, a fractional
  // cable stack — can say so per-exercise; the upper/lower rule is only the
  // default, not a law of the gym.
  if (typeof meta.increment === 'number' && meta.increment > 0) return meta.increment;
  return plan.rules.progression.lowerExercises.includes(id)
    ? plan.rules.progression.lowerIncrement
    : plan.rules.progression.upperIncrement;
}

// ——— Phase calendar ———

export function phaseForDate(plan, dateStr, overrideId = null) {
  const phases = plan.phases;
  let phase = overrideId ? phases.find((p) => p.id === overrideId) : null;
  if (!phase) {
    phase = phases.find((p) => dateStr >= p.start && dateStr <= p.end);
    if (!phase && dateStr > phases[phases.length - 1].end) phase = phases[phases.length - 1];
  }
  if (!phase) return { phase: null, week: null, weeks: null, override: false };
  const days = Math.max(0, Math.round((new Date(dateStr + 'T12:00') - new Date(phase.start + 'T12:00')) / 86400000));
  const weeks = Math.ceil((Math.round((new Date(phase.end + 'T12:00') - new Date(phase.start + 'T12:00')) / 86400000) + 1) / 7);
  return { phase, week: Math.floor(days / 7) + 1, weeks, override: !!overrideId };
}

// ——— Rotation ———

function sortedHistory(history) {
  // Supplemental entries (logged conditioning / cardio) carry no barbell work and
  // must never move "what's next" or feed a prescription. Fencing them here covers
  // rotationNext, lastPerformance/performances, isStalled, and validateSet in one
  // place — the same discipline as the deload/sinceDate fences.
  return [...history].filter((e) => !e.supplemental).sort((a, b) => a.date.localeCompare(b.date));
}

export function rotationNext(plan, history) {
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
export function lastPerformance(history, sessionType, exId, { sinceDate = null, skipPhases = [] } = {}) {
  const sorted = sortedHistory(history);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i];
    if (e.session_type !== sessionType) continue;
    if (sinceDate && e.date < sinceDate) break;
    if (skipPhases.includes(e.phase)) continue;
    const ex = e.exercises.find((x) => x.id === exId);
    if (ex && ex.sets.length) return { entry: e, ex };
  }
  return null;
}

export function performances(history, sessionType, exId, limit = Infinity) {
  const out = [];
  const sorted = sortedHistory(history);
  for (let i = sorted.length - 1; i >= 0 && out.length < limit; i--) {
    const e = sorted[i];
    if (e.session_type !== sessionType) continue;
    const ex = e.exercises.find((x) => x.id === exId);
    if (ex && ex.sets.length) out.push({ entry: e, ex });
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
export function allTimeBest(history, exId) {
  let best = null;
  for (const e of history) {
    if (e.supplemental || !e.exercises) continue; // conditioning entries hold no lifts
    for (const x of e.exercises) {
      if (x.id !== exId) continue;
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

// Builds the pre-filled targets for one exercise slot of a session template.
// Returns { sets: [{weight, reps}], basis, prevTop, note }
export function prescribe(plan, history, sessionType, slot, phaseInfo) {
  const { phase } = phaseInfo;
  const inc = increment(plan, slot.id);
  const meta = exMeta(plan, slot.id);
  const nSets = phase?.type === 'deload' ? Math.max(1, Math.round(slot.sets * (phase.setFactor ?? 0.6))) : slot.sets;
  const mk = (w, r) => Array.from({ length: nSets }, () => ({ weight: w, reps: r }));

  if (meta.bodyweight) {
    const last = lastPerformance(history, sessionType, slot.id, { sinceDate: calibrationStart(plan) });
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

  const fence = { sinceDate: calibrationStart(plan), skipPhases: phase?.type === 'deload' ? [] : deloadPhaseIds(plan) };
  const last = lastPerformance(history, sessionType, slot.id, fence);

  if (phase?.type === 'deload') {
    const baseSets = last ? last.ex.sets : slot.seed != null ? mk(slot.seed, slot.repMin) : null;
    if (!baseSets) return { sets: mk(null, slot.repMin), basis: 'verify', prevTop: null, note: slot.seedNote };
    const factor = phase.loadFactor ?? 0.8;
    const sets = Array.from({ length: nSets }, (_, i) => {
      const src = baseSets[Math.min(i, baseSets.length - 1)];
      return { weight: backoffInfo(src.weight, factor, inc).weight, reps: slot.repMin };
    });
    // pct describes the TOP set — a ramped base means every set carries its
    // own ratio, and the headline should match the heaviest bar of the day.
    const top = topSet(baseSets);
    return { sets, basis: 'deload', prevTop: top?.weight ?? null, pct: top ? backoffInfo(top.weight, factor, inc).pct : null };
  }

  if (!last) {
    if (slot.seed == null) return { sets: mk(null, slot.repMin), basis: 'verify', prevTop: null, note: slot.seedNote };
    return { sets: mk(slot.seed, slot.repMin), basis: 'seed', prevTop: null, note: slot.seedNote };
  }

  const prev = last.ex.sets;
  const prevTop = topSet(prev)?.weight ?? null;
  // Progression needs every prescribed set, not just every logged one —
  // 2-of-4 sets at the top of the range is an unfinished session, not a trigger.
  const grow = phase?.type !== 'prep' && prev.length >= slot.sets && progressionMet(prev, slot.repMax);
  // Smashing the ceiling by 2+ reps on every set earns a double jump — but
  // only on compounds. +10 on a deadlift is ~4%; +10 on a curl is a form
  // breakdown waiting to happen, so isolation lifts take the single step no
  // matter how loud the rep surplus.
  const jump = grow && meta.compound === true && prev.every((s) => s.reps >= slot.repMax + 2) ? inc * 2 : inc;
  const lastPhase = plan.phases.find((p) => p.id === last.entry.phase);
  const fromCalibration = lastPhase?.type === 'calibration';
  // Progressing out of calibration returns at least to the seed — the -10%
  // week must never sandbag the meso. But the seed is only owed if the
  // calibration top actually landed at its reduced ask: a lift that came in
  // far under (20 against a 25 ask, seed 30) hasn't earned a teleport to a
  // weight it never touched — it climbs one honest jump from where it stands.
  const seedEarned = fromCalibration && slot.seed != null && prevTop != null
    && prevTop >= backoffLoad(slot.seed * (lastPhase.loadFactor ?? 0.9), inc);
  const sets = Array.from({ length: nSets }, (_, i) => {
    const src = prev[Math.min(i, prev.length - 1)];
    if (!grow) return { weight: src.weight, reps: clamp(src.reps, slot.repMin, slot.repMax) };
    let w = src.weight + jump;
    if (seedEarned) w = Math.max(w, slot.seed);
    return { weight: w, reps: slot.repMin };
  });
  return {
    sets,
    basis: grow ? 'progress' : phase?.type === 'prep' ? 'hold' : 'repeat',
    prevTop,
    increment: grow ? inc : 0,
  };
}

// ——— Stall detection ———

// 3 sessions without progression on a lift → flag. A weight increase or a
// met progression-trigger on the newest performance clears it.
export function isStalled(plan, history, sessionType, slot) {
  const since = calibrationStart(plan);
  const perfs = performances(history, sessionType, slot.id).filter((p) => p.entry.date >= since && !deloadPhaseIds(plan).includes(p.entry.phase));
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

// ——— PR detection ———

export function isPR(history, exId, weight, reps) {
  if (reps < 1 || !weight) return false;
  const best = allTimeBest(history, exId);
  return !best || weight > best.weight;
}

// Best reps ever achieved at exactly this weight (rep-PR detection).
export function isRepPR(history, exId, weight, reps) {
  if (!weight || reps < 1) return false;
  let best = null;
  for (const e of history) {
    if (e.supplemental || !e.exercises) continue; // conditioning entries hold no lifts
    for (const x of e.exercises) {
      if (x.id !== exId) continue;
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
        // arithmetic in the message checks out by hand
        const expShown = Math.round(expect);
        const pct = Math.round((Math.abs(weight - expShown) / expShown) * 100);
        const dir = weight < expShown ? 'lighter' : 'heavier';
        const msg = factor === 1
          ? `${pct}% ${dir} than your recent top sets (avg ${expShown} lb)`
          : `${pct}% ${dir} than expected for ${phase.type} (~${expShown} lb = ${Math.round(factor * 100)}% of your ${Math.round(avg)} lb average)`;
        warnings.push({ code: 'dev', msg });
      }
    }
  }
  return warnings;
}

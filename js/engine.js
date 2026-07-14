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

export function exMeta(plan, id) {
  return plan.exercises[id] || { name: id };
}

export function increment(plan, id) {
  const meta = exMeta(plan, id);
  if (meta.bodyweight) return 0;
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
  return [...history].sort((a, b) => a.date.localeCompare(b.date));
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
    const reps = last ? clamp(last.ex.sets[0].reps, slot.repMin, slot.repMax) : slot.repMin;
    return { sets: mk(0, reps), basis: 'bodyweight', prevTop: null };
  }

  if (phase?.type === 'calibration') {
    if (slot.seed == null) return { sets: mk(null, slot.repMin), basis: 'verify', prevTop: null, note: slot.seedNote };
    return { sets: mk(backoffLoad(slot.seed * (phase.loadFactor ?? 0.9), inc), slot.repMin), basis: 'calibration', prevTop: slot.seed };
  }

  const fence = { sinceDate: calibrationStart(plan), skipPhases: phase?.type === 'deload' ? [] : deloadPhaseIds(plan) };
  const last = lastPerformance(history, sessionType, slot.id, fence);

  if (phase?.type === 'deload') {
    const baseSets = last ? last.ex.sets : slot.seed != null ? mk(slot.seed, slot.repMin) : null;
    if (!baseSets) return { sets: mk(null, slot.repMin), basis: 'verify', prevTop: null, note: slot.seedNote };
    const sets = Array.from({ length: nSets }, (_, i) => {
      const src = baseSets[Math.min(i, baseSets.length - 1)];
      return { weight: backoffLoad(src.weight * (phase.loadFactor ?? 0.8), inc), reps: slot.repMin };
    });
    return { sets, basis: 'deload', prevTop: topSet(baseSets)?.weight ?? null };
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
  // Smashing the ceiling by 2+ reps on every set earns a double jump;
  // and progressing out of calibration returns at least to the seed —
  // the -10% week must never sandbag the meso.
  const jump = grow && prev.every((s) => s.reps >= slot.repMax + 2) ? inc * 2 : inc;
  const lastPhase = plan.phases.find((p) => p.id === last.entry.phase);
  const fromCalibration = lastPhase?.type === 'calibration';
  const sets = Array.from({ length: nSets }, (_, i) => {
    const src = prev[Math.min(i, prev.length - 1)];
    if (!grow) return { weight: src.weight, reps: clamp(src.reps, slot.repMin, slot.repMax) };
    let w = src.weight + jump;
    if (fromCalibration && slot.seed != null) w = Math.max(w, slot.seed);
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
  let increased = false;
  for (let i = 1; i < tops.length; i++) {
    // weight up, or reps up at the same weight — both are progress
    if (tops[i].weight > tops[i - 1].weight) increased = true;
    else if (tops[i].weight === tops[i - 1].weight && tops[i].reps > tops[i - 1].reps) increased = true;
  }
  const newest = recent[recent.length - 1];
  return !increased && !progressionMet(newest.ex.sets, slot.repMax);
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

export function validateSet(plan, history, exId, weight, reps) {
  const warnings = [];
  const meta = exMeta(plan, exId);
  if (reps > (plan.rules.validation.maxReps ?? 30)) {
    warnings.push({ code: 'reps', msg: `${reps} reps — check the entry` });
  }
  if (!meta.bodyweight && (weight === 0 || weight == null)) {
    warnings.push({ code: 'zero', msg: 'Weight is 0 on a loaded exercise' });
  }
  if (weight > 0 && !meta.bodyweight) {
    const tops = [];
    const sorted = sortedHistory(history);
    for (let i = sorted.length - 1; i >= 0 && tops.length < (plan.rules.validation.trailingSessions ?? 5); i--) {
      const ex = sorted[i].exercises.find((x) => x.id === exId);
      const t = ex && topSet(ex.sets);
      if (t) tops.push(t.weight);
    }
    if (tops.length >= 3) {
      const avg = tops.reduce((a, b) => a + b, 0) / tops.length;
      const dev = Math.abs(weight - avg) / avg;
      if (dev > (plan.rules.validation.deviationPct ?? 25) / 100) {
        // show percent against the SAME rounded average we display, so the
        // arithmetic in the message checks out by hand
        const avgShown = Math.round(avg);
        const pct = Math.round((Math.abs(weight - avgShown) / avgShown) * 100);
        warnings.push({ code: 'dev', msg: `${pct}% ${weight < avgShown ? 'lighter' : 'heavier'} than your recent top sets (avg ${avgShown} lb)` });
      }
    }
  }
  return warnings;
}

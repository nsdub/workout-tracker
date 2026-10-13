# The full-review trainer (v88)

Written 2026-10-13 after the athlete said the daily panel "adjusts exercises
in isolation", that set counts had crept, that the exercises never change,
and that "if this was a real trainer I would have fired him months ago."

He stated the bar himself: *if I gave you a printout of all my workout
history, Claude could act as a trainer, analyze it and recommend a plan
going forward. I want that same level of diligence after every single
training day.* He chose option A: **the trainer sets the program.** Changes
apply directly; the app shows what changed and why; he overrides by logging
what he actually did, exactly as he does with weights.

## What was wrong (verified 2026-10-13)

- `data/plan.json` session templates untouched since 2026-07-18; the same
  lifts as the Nov 2025 log. Catalogue of 37 exercises, 36 in use: no pool
  to rotate from.
- All 66 program decisions were single-exercise, single-session cards. The
  program seat could not see its own past proposals and reversed itself four
  times in Aug–Sep (leg curl 3→4→3, split squat 2→3→2, lateral raise 4→3→4,
  reverse pec deck 3→2→3 eight days apart).
- Push B went 23→26 sets in eight days (14–22 Sep) through three separate
  "volume" cards, each argued alone. Nobody summed them.
- Since 2026-09-28 the program seat abstained on every slot in ten straight
  runs, reasoning "mid-block is not a reason to change".
- The program seat's inputs were per-exercise weekly sets, A/B divergence,
  stalls, layoffs. No muscle-group view, no targets, no show date, no change
  history. The head coach never read the program slice.

## The model

One **head trainer** with the whole printout, every morning. It owns the
program. A second agent, the **reviewer**, reads the same printout plus the
head's packet and tries to break it; every finding is fixed, refuted with
evidence, or handed to the athlete as an open item with its consequence.
Two script gates make the diligence checkable rather than claimed.

### Files

`data/coach/program.json` — THE program the app runs. Trainer-owned.

```
{
  "version": 3,                    // monotonic; bumps on every change
  "date": "2026-10-14",
  "written_by": "daily-training-brief" | "interactive-session",
  "sessions": { PushA|PullA|LegsA|PushB|PullB|LegsB: { name, exercises: [
      { id, sets, repMin, repMax, rest, superset?, repUnit?, seed? } ] } },
  "exercises": { "<id>": <catalogue entry> },   // trainer-added lifts only
  "targets": { "<muscle>": { "min": N, "max": N } },  // weekly hard sets
  "changes": [ { version, date, session, exercise, kind, before, after, why,
                 evidence: ["YYYY-MM-DD:<exercise-id>" | "YYYY-MM-DD:note"] } ]
}
```

The six session ids are fixed (each is a universe with its own art); names
and contents are the trainer's. `plan.json` keeps phases, rules, rotation
and the exercise catalogue. `decisions.json` is frozen history: program v1
is the snapshot of `effectivePlan(plan, decisions)` and the accepted
decisions become its first `changes[]`.

`data/plan.json` `exercises` grows into a real catalogue (~90 lifts) and
every entry carries `muscles: { primary: [...], secondary: [...] }`,
`equipment`, `pattern`, and `howto`. The muscle enum (18):
chest, front-delts, side-delts, rear-delts, lats, upper-back, traps,
lower-back, biceps, triceps, forearms, quads, hamstrings, glutes, adductors,
abductors, calves, abs. Weekly set counting: primary = 1, secondary = 0.5.

`data/coach/latest.json` — the daily packet. Keeps `date`,
`reviewed_through`, `generated_at`, `produced_by`, `reviewer`,
`session_expected`, `brief`, `flags[]`, `overrides[]`. Drops `proposals[]`,
`dissent[]`, `panel`. Adds:

```
"program_version": 3,
"review": {
  "block":   { phase, week, of, days_to_show, verdict, why },
  "muscles": { "<every muscle>": { planned_weekly_sets, done_4wk_avg,
               verdict: hold|raise|cut|rotate|watch, why, evidence[] } },
  "lifts":   { "<every lift in the program>": { sessions[], trend:
               progressing|holding|stalled|regressing|new|unlogged,
               verdict: progress|hold|deload|rotate|drop|watch, why, evidence[] } }
},
"changes_today": [ ...the entries appended to program.changes today ],
"deferred": [ { muscle|exercise, verdict, until, why } ],
"audit": { "findings": [ { finding, disposition: fixed|refuted|open,
                           why, consequence?, evidence[] } ] }
```

### Gates

`scripts/validate-program.mjs` — program.json is well-formed and sane: six
ids; every exercise known (catalogue or `exercises`) with a complete entry;
sets 1–6; reps sane; superset partners exist; ≤ 28 hard sets per session;
`version` greater than the committed one whenever `sessions` differ; every
change entry complete; **reversal guard**: a change that moves a slot back
toward where it stood within the last 14 days must cite a logged session
dated after the earlier change.

`scripts/verify-review.mjs` — every `evidence` citation in the review, the
changes and the audit resolves to a real logged row; every audit finding has
a disposition; an `open` finding has a `consequence`.

`scripts/validate-coach.mjs` — the packet against the app: unchanged load
checks, plus `program_version` equals program.json; `review.muscles` has
every muscle and its `planned_weekly_sets` equals what the program actually
contains (the number on screen must be true); `review.lifts` has every lift
in the program; a `raise|cut|rotate|drop` verdict has a matching change
today or a `deferred` entry; **pain guard**: a pain note on a lift inside 10
days caps its override at the last logged top set.

### Dossier

`scripts/coach-dossier.mjs` loses `--slice`. Everyone gets everything. It
adds: the program with each change's age; `muscle_week` (planned vs done per
muscle for the last 8 ISO weeks, with the 4-week average); `lifts` for
every lift in the program (trajectory, stall, compliance over the last 6
visits, last change, sessions since); `compliance_by_session`; the show
countdown.

### App

- `store.program`; `livePlan()` = `applyGymProfile(effectivePlan(plan,
  decisions, program), gym)`. Pulled with the packet, also off Pages
  token-less.
- Proposals are gone: `js/proposals.js`, the Yes/No sheet, the waiting card,
  the pending dot's old meaning, the briefing's proposals block, `decide()`.
- Mission gets **What changed**: version, the last 14 days of changes with
  reasons, and a sheet with the block verdict and the muscle table from the
  packet. The tab dot means unseen program changes; opening the sheet marks
  `settings.seenProgramVersion`.
- The session notice bar says when tonight's session changed since he last
  ran it.
- Rulebook copy rewritten: one trainer with the whole log, a reviewer, two
  gates; he overrides by logging.
- `js/version.js` → v88, `sw.js` build line to match.

### The daily task

1. Pull. 2. `node scripts/coach-dossier.mjs`. 3. Read the whole thing and
write the review: block, every muscle, every lift. 4. Decide program changes;
if any, edit program.json (bump version, append changes). 5. Tonight's loads.
6. Dispatch the reviewer with the dossier and the packet; resolve every
finding. 7. Three gates. 8. Commit `data/coach/`, prove it landed, notify.
"Nothing new logged" means the review repeats and says so; it never means
the review is skipped.

### Not in scope

Changing the six session ids or the rotation length. Phase calendar edits
(still prose). Photos or physique assessment inputs. The push worker.

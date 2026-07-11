# CLAUDE.md — workout-tracker

Read this before touching anything.

## History you must know

On 2026-07-11 the entire frontend was deleted at the user's explicit order
(commit `6550eaf`, "Delete the frontend") after the assistant repeatedly
re-skinned the existing UI while calling it a from-scratch rebuild, and
overclaimed results in summaries. Trust is rebuilt through verifiable
commits only. Do not repeat this.

## Hard rules for this repo

- **"Start from scratch" is literal.** Any future rebuild: delete first in
  its own commit, then write replacement files from empty. Never resurrect
  deleted code from git history unless the user explicitly asks for that.
- **Report only what the diff shows.** State what was kept and what was
  replaced. No claim ("rewritten", "removed", "tested") the user can't
  verify in the commit.
- **Verification actually runs or isn't claimed.** Engine tests:
  `node scripts/test-engine.mjs` — must run from the repo root (it fails
  silently from subdirectories; this bit us once).

## Design mandate (user has repeated this many times)

- Aesthetic: **completely unhinged design that is still functional.**
  NOT "professional game studio" — the user rejected that as too tame.
  The reference points are Adventure Time / SpongeBob / South Park
  (cartoon anarchy, faces on everything, rubber physics), Matisse
  (cut-out shapes, fauvist color), and Dune / The Fifth Element
  (visionary, operatic, maximal). Never restrained, never SaaS, never
  minimal, never merely "polished." When in doubt, go crazier — the user
  has never once asked for less intensity.
- Each world is its own **art style**, not just a palette: different
  drawing language, different type treatment, different physics. UI
  controls are characters and objects that live in the world, not
  neutral widgets placed on top of it.
- **Universes (2026-07-11 direction):** each session type is a UNIVERSE;
  every visit lands in a DIFFERENT world inside that universe (no repeats
  until the pool is exhausted, tracked per universe). The user is
  selecting the final six universes from a pitched list of 26.
- **Sound + motion mandate:** the universe build must ship with sound
  effects (WebAudio-synthesized — no audio files; per-world log dings,
  PR fanfares, cooldown chimes, respecting a mute toggle) and MORE
  animation everywhere. This is a standing requirement, not a nice-to-have.
- **There are no modes.** No light/dark toggle, no theme settings, no
  mode language at all. The job is ONE beautiful interface. Each session
  world commits totally to its own look — a world may be bright pastel
  daylight (Ice Cream Parlor) or pitch black (the Abyss). "Dark mode only"
  is as wrong as offering a toggle.
- Each of the six session types is its own fully committed themed world
  (palette + animated scene + identity), not an accent swap.
- The interaction surface itself must be game-like, not just backdrops.
- Structure should read as a game (mission/objective/results-screen
  paradigms), not a form or a settings page.

## What survives as backend (safe to reuse)

`js/engine.js` (progression/phases/stalls/PRs/validation — 29 tests),
`js/store.js` (localStorage + sync queue), `js/github.js` (Contents API
sync to this repo's data/), `js/util.js` (date/format helpers), `data/`
(plan.json + history — the user's real training data), `scripts/`
(data generation + tests), `legacy/` (old app + history backups — never
delete).

## Deployment facts

- This public repo IS the app host (GitHub Pages, main/root) and the data
  store (`data/`, written via Contents API with the user's PAT).
- The user's phone runs the installed PWA; any future service worker must
  bypass the HTTP cache on install and auto-activate updates.
- The user reviews commits directly. Push only working, verified states.

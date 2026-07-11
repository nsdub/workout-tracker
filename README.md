# Protocol

Single-user workout tracker PWA. Log sets fast, see last session's numbers,
follow the progression rules, track the training phase. Built for one phone
(Pixel 8a), one gym, one program.

Everything lives in this repo: the app is served by GitHub Pages from the
root, and training data sits beside it in `data/` (`plan.json` plus one JSON
file per logged session in `data/history/`). The app writes new sessions back
to `data/` through the GitHub Contents API. Note the repo is public, so the
training log is public too.

## Architecture

- **No build step.** Vanilla ES modules, self-hosted fonts.
- **Offline-first.** Writes land in `localStorage` immediately; a sync queue
  commits them to `data/` when there's signal. Local storage is the write
  buffer, the repo is the source of truth. The service worker caches the app
  shell only (never `data/`) — bump `VERSION` in `sw.js` when deploying.
- **Reads without a token.** A fresh install loads `data/plan.json` straight
  off Pages. The PAT is only needed to write and to pull history.
- **Worlds.** One interface, no modes, no theme selector. Each session
  type is a fully committed world with its own art style — bright or dark
  as the world demands. The worlds themselves are creative territory, not
  spec: they are whatever the current build says they are.
- **How-tos.** Every exercise in `plan.json` carries a `howto` form guide,
  reachable from the exercise name on the log screen and from the templates
  on the Plan tab.

```
js/
  app.js         boot, tabs, header, sync lifecycle
  engine.js      pure logic: phases, rotation, progression, stalls, PRs, validation
  store.js       localStorage state + sync queue
  github.js      Contents API client, pull/flush, seed import
  theme.js       mode (light/dark/system) + per-session accents
  components.js  sheets, numpad, toast, rest timer
  views/         today (log), history, plan
data/
  plan.json      program: templates, seeds, phase calendar, rules, how-tos
  history/       one JSON file per logged session
scripts/
  build-data.mjs   regenerate data/ from the raw history log
  test-engine.mjs  engine unit tests (28)
```

## Setup

1. Create a fine-grained PAT: GitHub Settings → Developer settings →
   Fine-grained tokens → only `workout-tracker` → Contents: Read and write.
2. Open the app → Connect GitHub → paste the token.
3. On the phone: open the Pages URL in Chrome → ⋮ → Add to home screen.

## Daily use

- The app opens into the next session in rotation, pre-filled with last
  session's numbers and the progression suggestion.
- Tap the check to log a set as prescribed. Tap a number to adjust first;
  weight edits carry through the remaining sets of that lift.
- Tap an exercise name for its form guide.
- Progression: all sets at the top of the rep range → next session suggests
  +5 lb upper / +10 lb on deadlift, RDL, and leg press. Phases advance by
  calendar; deloads run 80% load and ~60% sets. Warnings on odd entries are
  dismissible and never block a set.

## Development

```
python3 -m http.server 8407      # any static server works
node scripts/test-engine.mjs     # engine unit tests
node scripts/build-data.mjs      # regenerate data/ from scripts/history-raw.txt
```

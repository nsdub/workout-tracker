# data

Training data, read and written by the app through the GitHub Contents API.

- `plan.json` — Protocol v3: the six PPL A/B session templates with seeds and
  rep ranges, per-exercise form guides (`howto`), the Jul 2026 → Mar 2027
  phase calendar, and progression/deload/stall rules. Edit this file to
  reprogram the app; it picks the change up on next load.
- `history/YYYY-MM-DD-<session>.json` — one file per logged session. The 46
  seeded files are the verbatim import of the Nov 29 2025 – Feb 25 2026
  training log, suspect entries included, marked `"phase": "legacy"`. The
  progression engine never prefills from legacy entries (seeds are the
  baseline); they feed charts and history only.
- `seed-bundle.json` — plan + full history in one file for the app's
  importer. Only needed to bootstrap a repo that doesn't already have this
  folder.

Regenerate from the raw log with `node scripts/build-data.mjs`.

# Rest-period mini-games — design spec

Date: 2026-07-12 · Status: approved by user (scope, launch, end-semantics)

## Purpose

Between sets the lifter is resting 60–240 seconds with the phone in hand.
Fill that window with a one-thumb mini-game that belongs to the universe and
world they are training in — and that ends the instant rest ends, so the game
enforces training discipline instead of competing with it.

## Decisions (user-approved)

1. **Scope:** one core mechanic per universe (6 games). Each of the 8 worlds
   inside a universe reskins the game (art, obstacles, speed) and adds one
   twist. 48 distinct world configs, 6 mechanics.
2. **Launch:** a pulsing PLAY button on the rest pill. Opt-in per rest.
   Never auto-launches.
3. **End:** rest over = game over. Score locks, "BACK TO WORK" screen, one
   tap returns to the set. Quitting early (✕) never touches the rest timer.

## The six games

| Universe | Game | Mechanic | Example world twists |
|---|---|---|---|
| Mount Volcano Dojo | IAIDO SLASH | Tap arcing objects at the right moment | Summit adds bombs; Hall = snuff candles; Falls = leaping koi |
| The Deep | DESCENT | Hold to sink, release to rise, thread the gaps | Ballroom gaps pulse; Void = small light radius; Subs = drifting mines |
| Cryptid National Park | SNAPSHOT | Photograph creatures before they hide; skip decoys | Bog inverts: wisps are traps; Mothman peeks at the moon |
| The Noodle Cosmos | WOK CATCH | Drag the wok to catch good, dodge junk | Asteroids = low gravity; Nebula = curving falls; Boba = bouncing pearls |
| Pirate Radio Atoll | ON AIR | Tap when the sweeping needle crosses the band | Lighthouse = circular dial; Storm = jittering band; Kraken = dual needles |
| Yeti Ski Resort | SLALOM | Hold = carve left, release = carve right, pass gates | Disco = strobe; Ice Bar = slippery; Aurora = night fog |

No game has a fail state — they are score-attack until the clock ends,
because the clock is the rest timer.

## Architecture

Zero dependencies, no build step (repo law). New directory `js/game/`:

- **engine.js** — canvas 2D micro-engine: DPR-scaled canvas, fixed-step
  update loop (60 Hz accumulator, capped to avoid spiral), wall-clock
  deadline (shared with the rest timer), pointer input (tap queue +
  held/drag state), pause on `visibilitychange` (timer keeps draining —
  consistent with "rest ends the game"), pure helpers (`clamp`, `rand`,
  `circleHit`, `rectHit`) exported for node tests.
- **registry.js** — maps universe cls → game module, world cls → config;
  best-score persistence (`p3.gameBests` in localStorage); exports coverage
  info for tests.
- **overlay.js** — fullscreen layer (below sheets, above tabbar): HUD
  (game title, world name, score, rest countdown, quit ✕), canvas, game-over
  screen (score, per-world best, NEW RECORD moment using the universe PR
  sound), error guard: any exception in update/render tears the overlay down
  and toasts — games can never block logging.
- **games/{dojo,deep,park,wok,atoll,yeti}.js** — each exports `TITLE`,
  `WORLDS` (8 configs keyed by world cls, each with `name` + tuning), and
  `create(eng, api, cfg)` returning `{update, render, onTap?, onDown?, onUp?}`.

Integration: `components.js` rest pill gains the PLAY button (shown only
when `registry` has a game for the active `data-universe`/`data-world`);
tapping calls `openGame({ deadline })` with the existing rest deadline.
Wake lock already held during rest covers gameplay.

## Data

- `p3.gameBests`: `{ [worldCls]: bestScore }` — local only, never synced.
- No changes to entries, drafts, plan, or sync.

## Testing

- Registry coverage: every one of the 48 world cls values in
  `js/worlds.js` resolves to a game config with required fields.
- Engine math: collision + clamp unit tests.
- Best-score persistence round-trip with stubbed localStorage.
- Manual QA: every game booted in the preview browser; feel-checked;
  screenshots captured.

## Release

`sw.js` SHELL gains the 9 new files; `// build:` and `PROTOCOL_VERSION`
bump together (release ritual). Single release: v26.

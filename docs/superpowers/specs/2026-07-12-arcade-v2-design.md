# The Rest Arcade v2 — six physics toys on Phaser 4

Supersedes `2026-07-12-rest-minigames-design.md`. The v1 lineup (tap/timing
mechanics on a hand-rolled canvas engine) was rejected as cheap graphics and
cheap gameplay. v2 was designed research-first: a canon of legendary
one-thumb mechanics, a verified Phaser 4.2 capability report, and a bold
concept slate, synthesized into the six games below.

## Laws (from the research)

- **One verb, readable in 3 seconds, zero tutorial** (WarioWare).
- **Physics ownership**: the player flings/cuts/grows/steers real simulated
  bodies; never a widget, never a judgment bar.
- **Permanence** (Vlambeer): debris stays. The battlefield at T-0 is the
  trophy.
- **The hard-stop is the fever** (Peggle): at T−10s every game goes molten
  gold and points double (GOLD RUSH ×2, overlay-owned); the final ~1.2s
  plays in slow motion into the results ceremony. Rest ending feels like
  winning, because it means back to the bar.
- **Juice everywhere**, with researched parameters: hit-stop 33–80 ms on
  hits, 130–250 ms on kills; shake scaled to impact mass; squash-and-
  stretch (1.3 along velocity, 0.75 across, Back-ease return) on
  everything that collides; zoom-punch 1.05–1.12 over ~80 ms; slow-mo
  climaxes ≤2 per session; pitch-ramped pentatonic note chains (WebAudio,
  never dissonant, reset on miss); floating scores, per-glyph banners;
  WebGL-only spectacle (bloom, cone lights, gravity wells) behind
  graceful-degradation guards.

## The six games (one per universe, 8 worlds each, 48 total)

### DOJO — IAIDO (swipe = the blade)
Objects arc up on Arcade physics; a swipe is a sword stroke that splits
everything it crosses into two velocity-inheriting halves. Chained slices
in one stroke escalate combos (slow-mo at ×4+). Hold your thumb still to
sheathe: time collapses while a recharging stance meter drains; the flick
out of stance is a full draw-cut through everything on the line. Powder
bombs with angry faces punish greed. Debris piles up at the floor.
Worlds: stairs base · falls (cut the waterfall ribbon to reveal golden koi)
· summit (ingots only cut while the forge pulse has them glowing) · bamboo
(vertical-cut bonus) · torii (near-missed spirits teleport between gates) ·
snow (periodic ice-time freezes objects mid-air for line-ups) · hall
(candle-lit; every cut gutters the flames — aggression dims your own
light) · dragon (the floor is an undulating spine that launches objects at
wild angles; a riding itch-spot pays bonus).

### DEEP — TERMINAL VELOCITY (hold = plummet)
You are a cast-iron dumbbell falling into the abyss. Hold to vent and
plummet, release to drift. Depth is score. Above threshold speed you SMASH
THROUGH obstacles (splinter ceremonies); below it they bump you and bleed
seconds. The camera zooms out with speed; bubble contrails; per-10-fathom
depth dings rise in pitch.
Worlds: vents (eruption columns slam you downward on a timer) · whalefall
(rib arcs shatter at speed) · market (stall canopies are soft bumpers,
lanterns light the lane) · kelp (strands snag and tether unless torn at
speed) · jelly (bouncy domes steal depth unless pierced at terminal
velocity, slow-mo on the pierce) · subs (sweeping searchlights slow you;
hulls breakable) · reef (dense breakable coral shelves) · void (darkness
with your own light cone; anglerfish fake lights lie about the gaps).

### PARK — SKIP LEGEND (drag back, release = the throw)
Skip a stone across a mile of postcard lake (a 4-screen-wide world the
camera chases). Entry angle and speed honestly decide the skim: shallow
and fast skips with a rising xylophone ding and an expanding ring; steep
kills it. Near-missing ducks, buoys and canoes pays; hitting them ends the
throw. Many throws per rest.
Worlds: trail base · marina (canoe-and-buoy slalom alley) · bog (dead
water; hop lily pads and grumbling turtles only) · mothman (night;
firefly rings are bonus gates; a far throw may earn the cryptid TAIL-BAT
over the mountains) · ufo (beam columns re-loft the stone) · meadow
(wading bison are moving bounce pads) · tower (cliff throw — long first
ballistic drop with wind shear) · canyon (banked ricochets off canyon
walls).

### WOK — DIM SUM DROP (drag to aim, release = drop the dumpling)
Peggle reborn as cosmic street food. Drag to aim the drop point and angle,
release: the dumpling falls through a field of glowing lantern pegs into
woks sliding along the bottom. Every peg hit chimes one step up a
pentatonic scale (WebAudio) and lights the lantern's face; lit lanterns
are spent. Wok catches bank a multiplier on everything lit that drop.
One decision, eight seconds of fortune — the lowest motor demand in the
arcade, on purpose (heavy-set rests need one game you can play with a
dead arm).
Worlds: alley base · inferno (firecracker pegs detonate their neighbors —
chain reactions) · steam (vents shove the falling dumpling mid-flight) ·
asteroids (low gravity, dreamy bounces) · nebula (field lines curve the
drop) · dragon (a noodle dragon coils through the pegs; landing on its
head rides it across the field relighting pegs) · shrine (golden blessed
pegs pay double but sit behind bells that deflect) · boba (pegs are
bouncy pearls with huge restitution — the dumpling goes wild).

### ATOLL — BROADSIDE FM (drag to aim, release = the broadside)
The censor-navy sails in to kill the pirate signal; you are the shipwreck
cannon deck. Enemy ships are Matter assemblies — hull, masts, crates,
powder kegs, a captain. Kegs chain-detonate, masts topple onto neighbors,
low shots skim wave crests for multipliers, and every piece of wreckage
floats there for the rest of the session.
Worlds: wreck base · light (the volcano loads lava rounds that set fires
spreading along rigging) · parrots (hit rigging and the parrot congress
dive-bombs a second ship for you) · kraken (tentacle swipes bat your ball
into ×2 bank shots) · bottles (message bottles bob between hulls as
pickups) · skull (cave studio — ricochet off the ceiling) · storm (wind
curves every ballistic; read the palms) · antenna (the flagship hides a
jackpot treasure-antenna weak point behind armor).

### YETI — YETI BOWL (hold to grow, release to roll, drag to steer)
At the summit, hold to pack the snowball — it grows while the slope-light
burns down (greed vs. time). Release drops into the run: drag steers,
smaller-than-you smashes or gets absorbed, bigger-than-you bounces you.
The run ends through a snowman village arranged as bowling pins. A penguin
rides on top, judging.
Worlds: village base (maximum pins) · lift (pylons and swinging chairs;
breakable only when huge) · diamond (moguls launch you; air steering) ·
disco (strobe cave — layout appears only on the beat) · springs (melt
pools shrink the ball) · icebar (frictionless lake, drift committed early)
· groomer (moving corduroy lanes boost, groomer machines crush) · aurora
(rhythmic pulses halve gravity; float the gaps on the downbeat).

## Architecture

- `vendor/phaser.min.js` — Phaser 4.2.1 (latest; Arcade + Matter).
- `js/game/loader.js` — one-time engine injection.
- `js/game/fx.js` — juice kit + WebGL-guarded v4 spectacle (bloom,
  vignette, cone lights, gravity-well score suction, glyph banners).
- `js/game/overlay.js` — cabinet: wall-clock deadline, HUD, history
  handling, error teardown, GOLD RUSH fever layer, count-up ceremony.
- `js/game/registry.js` — world-first lookup; bests in `p3.gameBests`.
- `js/game/games/{dojo,deep,park,wok,atoll,yeti}.js` — one scene factory
  each; data-only `WORLDS` export (node-testable), Phaser only inside
  `create()`.
- QA: interaction in the CDP daemon (Canvas fallback), WebGL visuals in
  the preview browser; SW wiped before every check.

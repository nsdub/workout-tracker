// The juice kit. Every game leans on this for light, weight and ceremony:
// procedurally generated glow textures (no image assets), additive particle
// bursts, shock rings, floating scores, camera shake/flash, hit-stop and
// slow-mo. All of it runs on Phaser's WebGL renderer.
//
// Convention: colors are 0xRRGGBB numbers for tints, CSS strings for text.

// Build the shared texture set once per Phaser.Game instance.
// Everything is grayscale so per-call-site tints stay true; shading is
// baked in so even a single particle reads as an object, not a disc.
export function ensureFx(scene) {
  const tm = scene.textures;
  if (tm.exists('fx-dot')) return;
  const paint = (key, w, h, draw) => {
    const cv = tm.createCanvas(key, w, h);
    draw(cv.getContext());
    cv.refresh();
  };

  // Soft radial glow — the workhorse of every burst, trail and halo.
  // Long quadratic-ish falloff kills the hard "mach band" edge the old
  // two-stop gradient printed around suns, moons and halos.
  paint('fx-dot', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.22, 'rgba(255,255,255,.92)');
    g.addColorStop(0.45, 'rgba(255,255,255,.55)');
    g.addColorStop(0.68, 'rgba(255,255,255,.22)');
    g.addColorStop(0.88, 'rgba(255,255,255,.05)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });

  // Shaded round chip — debris, snow, confetti. Off-center highlight and
  // a darker rim so tumbling debris reads as beads, not flat dots.
  paint('fx-chip', 16, 16, (c) => {
    const g = c.createRadialGradient(6, 5.4, 0.5, 8, 8, 7.4);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#e6e6e6');
    g.addColorStop(0.85, '#bdbdbd');
    g.addColorStop(1, '#8f8f8f');
    c.fillStyle = g;
    c.beginPath(); c.arc(8, 8, 7, 0, 7); c.fill();
  });

  // Ring — shockwaves, lock pulses. A crisp band wrapped in soft bloom on
  // both sides (the old hard 8px stroke aliased into a wire when scaled).
  paint('fx-ring', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 38, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,.14)');
    g.addColorStop(0.72, 'rgba(255,255,255,1)');
    g.addColorStop(0.78, 'rgba(255,255,255,.85)');
    g.addColorStop(0.92, 'rgba(255,255,255,.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });

  // Four-point sparkle — concave curved edges (the classic lens glint),
  // with a hot core glow, instead of the old straight-edged kite.
  paint('fx-star', 64, 64, (c) => {
    const halo = c.createRadialGradient(32, 32, 0, 32, 32, 15);
    halo.addColorStop(0, 'rgba(255,255,255,.85)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = halo;
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(32, 1);
    c.quadraticCurveTo(35.5, 28.5, 63, 32);
    c.quadraticCurveTo(35.5, 35.5, 32, 63);
    c.quadraticCurveTo(28.5, 35.5, 1, 32);
    c.quadraticCurveTo(28.5, 28.5, 32, 1);
    c.closePath(); c.fill();
  });

  // Streak — motion trails, rain, speed lines. A comet: bright leading
  // head (bottom — everything that uses it travels downward), tapered
  // fading tail, instead of a uniform capsule.
  paint('fx-streak', 6, 28, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 28);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,.45)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(3, 0);
    c.quadraticCurveTo(5.6, 14, 5.6, 23.6);
    c.arc(3, 24.2, 2.6, -0.25, Math.PI + 0.25);
    c.quadraticCurveTo(0.4, 14, 3, 0);
    c.closePath(); c.fill();
  });
}

// The universe's display typeface (the app sets --disp per universe on
// the root element) — in-canvas words wear the world's own voice.
export function displayFont() {
  try {
    const f = getComputedStyle(document.documentElement).getPropertyValue('--disp').trim();
    return f || '"Chewy", sans-serif';
  } catch { return 'sans-serif'; }
}

// One-shot additive explosion of glow particles.
export function burst(scene, x, y, tint, opts = {}) {
  const { n = 16, speed = 300, scale = 0.55, life = 550, gravityY = 0, texture = 'fx-dot' } = opts;
  // flash frame: one hot core that pops and dies in ~7 frames — the
  // Fruit-Ninja splat law: every real hit opens on a frame of light.
  // (Tiny garnish bursts skip it so sprays don't strobe.)
  if (n >= 8) {
    const core = scene.add.image(x, y, 'fx-dot')
      .setBlendMode('ADD').setAlpha(0.9).setScale(scale * 0.5).setDepth(52);
    scene.tweens.add({
      targets: core, scale: Math.max(1.2, scale * 2.4), alpha: 0,
      duration: 150, ease: 'Cubic.easeOut', onComplete: () => core.destroy(),
    });
  }
  const e = scene.add.particles(x, y, texture, {
    speed: { min: speed * 0.25, max: speed },
    angle: { min: 0, max: 360 },
    scale: { start: scale, end: 0 },
    lifespan: { min: life * 0.5, max: life },
    gravityY,
    tint,
    blendMode: 'ADD',
    emitting: false,
  }).setDepth(50);
  e.explode(n);
  scene.time.delayedCall(life + 150, () => e.destroy());
  // material variety sells the hit: tumbling chips and the odd star
  // among the glow, falling under gravity like real debris
  if (n >= 10) {
    const d = scene.add.particles(x, y, 'fx-chip', {
      speed: { min: speed * 0.3, max: speed * 0.85 },
      angle: { min: 0, max: 360 },
      scale: { start: scale * 0.5, end: scale * 0.12 },
      rotate: { min: 0, max: 360 },
      lifespan: { min: life * 0.6, max: life * 1.2 },
      gravityY: Math.max(gravityY, 340),
      tint,
      emitting: false,
    }).setDepth(50);
    d.explode(Math.ceil(n * 0.4));
    const st = scene.add.particles(x, y, 'fx-star', {
      speed: { min: speed * 0.4, max: speed * 0.9 },
      angle: { min: 0, max: 360 },
      scale: { start: scale * 0.45, end: 0 },
      rotate: { min: -180, max: 180 },
      lifespan: life,
      gravityY: gravityY * 0.5,
      tint: 0xfff0c8,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(51);
    st.explode(Math.max(2, Math.round(n * 0.15)));
    scene.time.delayedCall(life * 1.2 + 150, () => { d.destroy(); st.destroy(); });
  }
  return e;
}

// Expanding ring of light: a fast Expo-eased pressure front with a
// smaller echo ring a beat behind — one ring is a diagram, two are a bang.
export function shockRing(scene, x, y, tint, radius = 90) {
  const img = scene.add.image(x, y, 'fx-ring')
    .setTint(tint).setBlendMode('ADD').setAlpha(1).setScale(0.1).setDepth(49);
  scene.tweens.add({
    targets: img, scale: radius / 56, alpha: 0,
    duration: 480, ease: 'Expo.easeOut',
    onComplete: () => img.destroy(),
  });
  const echo = scene.add.image(x, y, 'fx-ring')
    .setTint(tint).setBlendMode('ADD').setAlpha(0).setScale(0.06).setDepth(49);
  scene.tweens.add({
    targets: echo, scale: radius * 0.62 / 56, alpha: { from: 0.7, to: 0 },
    delay: 80, duration: 420, ease: 'Cubic.easeOut',
    onComplete: () => echo.destroy(),
  });
}

// "+15" that pops, rises and fades. Numbers wear the mono face by law.
// Overshoot pop + a lazy tilt that rights itself: arcade, not tooltip.
export function floatScore(scene, x, y, text, color = '#ffd24a', size = 24) {
  // The score sits ON a world object (scrollFactor 1), so clamp it into the
  // camera's CURRENT view, not the raw canvas: in a scrolling world (park's
  // mile of lake) the biggest hits happen 1-3 screens out, and clamping to
  // [0, scale.width] would pin them off the left edge of the viewport,
  // invisible. worldView == [0,0,W,H] for a still camera, so still games are
  // unchanged.
  const view = scene.cameras?.main?.worldView;
  const vx = view && view.width ? view.x : 0;
  const vy = view && view.height ? view.y : 0;
  const vw = view && view.width ? view.width : scene.scale.width;
  const vh = view && view.height ? view.height : scene.scale.height;
  // clamp into the visible view — points earned at the edge must be read
  const margin = size * (0.4 * String(text).length + 1);
  x = Math.max(vx + margin, Math.min(vx + vw - margin, x));
  y = Math.max(vy + size * 3, Math.min(vy + vh - size * 2, y));
  const t = scene.add.text(x, y, text, {
    fontFamily: '"Geist Mono", monospace',
    fontSize: `${Math.round(size)}px`,
    fontStyle: '700',
    color,
    stroke: 'rgba(4,6,14,.82)',
    strokeThickness: Math.max(4, size * 0.24),
    shadow: { offsetX: 0, offsetY: Math.max(2, size * 0.09), color: 'rgba(0,0,0,.45)', blur: Math.max(4, size * 0.2), fill: true },
  }).setOrigin(0.5).setDepth(60).setScale(0.3).setAngle((Math.random() - 0.5) * 10);
  scene.tweens.add({ targets: t, scale: 1.14, angle: 0, duration: 150, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: t, scale: 1, delay: 150, duration: 160, ease: 'Sine.easeOut' });
  scene.tweens.add({ targets: t, y: y - size * 2.4, duration: 850, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: t, alpha: 0, delay: 470, duration: 380, onComplete: () => t.destroy() });
}

// Big center-stage announcement ("WAVE CLEAR", "COMBO ×4").
export function banner(scene, text, color = '#ffd24a', size = 34) {
  const W = scene.scale.width, H = scene.scale.height;
  const t = scene.add.text(W / 2, H * 0.30, text, {
    fontFamily: displayFont(),
    fontSize: `${Math.round(size * 1.15)}px`,
    color,
    stroke: 'rgba(4,6,14,.85)',
    strokeThickness: size * 0.28,
    shadow: { offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,.5)', blur: 10, fill: true },
  }).setOrigin(0.5).setDepth(61).setScale(0.2).setAngle(-4).setScrollFactor(0);
  // fit to the screen — a banner that runs off both edges is a bug, not drama
  const maxW = W * 0.9;
  if (t.width > maxW) t.setFontSize(Math.max(12, Math.floor(size * 1.15 * maxW / t.width)));
  scene.tweens.add({ targets: t, scale: 1, angle: 0, duration: 260, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, alpha: 0, y: H * 0.26, scale: 1.08, delay: 800, duration: 420, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
}

export function shake(scene, intensity = 0.008, ms = 130) {
  scene.cameras.main.shake(ms, intensity);
}

export function flash(scene, tint = 0xffffff, ms = 110, alpha = 0.55) {
  // Phaser's flash() signature is (duration, r, g, b, force, callback, context)
  // — there is NO alpha argument; the effect captures its PEAK alpha from
  // flashEffect.alpha at start() time. Passing alpha as the 7th arg (as this
  // used to) set `context` and left every flash at full opacity. Set the peak
  // on the effect first, and force=true so an overlapping flash re-triggers
  // (the death flash must land even mid-finale-flash). Re-set each call since
  // effectComplete restores the previous peak.
  const cam = scene.cameras.main;
  const fe = cam.flashEffect;
  if (fe) fe.alpha = alpha;
  cam.flash(ms, (tint >> 16) & 255, (tint >> 8) & 255, tint & 255, true);
}

// Hit-stop: freeze the world for a beat so a big hit lands with weight, then
// optionally shake on release. We freeze MOTION (tweens + physics), NOT the
// whole scene: pausing the scene also freezes the InputPlugin, and in these
// one-thumb reaction games the hit itself came from the player — a tap or
// swipe arriving inside the freeze must still register instantly, not be
// swallowed for up to the hit-stop length. window.setTimeout drives the
// release on the wall clock so it lands even if the render loop is throttled.
export function hitstop(scene, ms = 70, after = null) {
  if (!scene.scene.isActive()) return;
  // supersede any hit-stop still in flight so its release can't thaw the world
  // early (and re-thaw a freeze this one owns).
  const gen = scene._hitstopGen = (scene._hitstopGen || 0) + 1;
  try { scene.tweens.pauseAll(); } catch { /* no tween mgr */ }
  try { scene.physics?.world?.pause(); } catch { /* no arcade world */ }
  try { scene.matter?.world?.pause(); } catch { /* no matter world */ }
  clearTimeout(scene._hitstopTimer);
  scene._hitstopTimer = setTimeout(() => {
    if (scene._hitstopGen !== gen) return; // a newer hit-stop owns the freeze
    try {
      scene.tweens.resumeAll();
      scene.physics?.world?.resume();
      scene.matter?.world?.resume();
    } catch { /* scene torn down */ }
    try { after?.(); } catch { /* release garnish */ }
  }, ms);
}

// Slow motion for dramatic beats (multi-slice, final target). factor 0.3 =
// 30% speed. Phaser scales tweens/timers UP with timeScale, Arcade
// physics DOWN, and Matter with its own timing — hence the three writes.
export function slowmo(scene, factor = 0.35, ms = 450) {
  // supersede any slow-mo still in flight: without this, an earlier (shorter)
  // reset timer would fire mid-effect and snap the world back to full speed —
  // a stutter, and it would cut the overlay's final slow-mo finale short.
  const gen = scene._slowmoGen = (scene._slowmoGen || 0) + 1;
  scene.time.timeScale = factor;
  scene.tweens.timeScale = factor;
  if (scene.physics?.world) scene.physics.world.timeScale = 1 / factor;
  if (scene.matter?.world?.engine) scene.matter.world.engine.timing.timeScale = factor;
  clearTimeout(scene._slowmoTimer);
  scene._slowmoTimer = setTimeout(() => {
    if (scene._slowmoGen !== gen) return; // a newer slow-mo owns the clock
    try {
      scene.time.timeScale = 1;
      scene.tweens.timeScale = 1;
      if (scene.physics?.world) scene.physics.world.timeScale = 1;
      if (scene.matter?.world?.engine) scene.matter.world.engine.timing.timeScale = 1;
    } catch { /* scene torn down */ }
  }, ms);
}

// Squash-and-stretch on impact: 1.28 along the hit axis's normal, 0.72
// along it, sprung back with Back ease. Apply to EVERYTHING that collides.
export function squash(scene, obj, axis = 'y', ms = 170) {
  if (!obj.active) return;
  // Re-hitting an object before its spring-back finishes used to snapshot the
  // live (already-inflated) scale as the rest state and stack a second tween,
  // so the object ballooned and never returned to true size. Instead: if a
  // squash is still in flight, adopt the rest scale it was springing back TO
  // and stop only that tween (never touch the object's other tweens); if none
  // is in flight, the current scale IS the rest scale — which lets objects
  // that legitimately resize between hits (a growing snowball) keep their size.
  let sx, sy;
  if (obj._sqTween) {
    try { obj._sqTween.stop(); } catch { /* already removed */ }
    sx = obj._sqBaseX ?? obj.scaleX;
    sy = obj._sqBaseY ?? obj.scaleY;
  } else {
    sx = obj.scaleX; sy = obj.scaleY;
  }
  obj._sqBaseX = sx; obj._sqBaseY = sy;
  if (axis === 'y') obj.setScale(sx * 1.28, sy * 0.72);
  else obj.setScale(sx * 0.72, sy * 1.28);
  obj._sqTween = scene.tweens.add({
    targets: obj, scaleX: sx, scaleY: sy, duration: ms, ease: 'Back.easeOut',
    onComplete: () => { obj._sqTween = null; },
  });
}

// GOLD RUSH — the last 10 seconds of every rest. The world goes molten:
// a pulsing gold veil, gold sparks rising, everything worth double
// (the doubling itself lives in the overlay's score API).
// A caller may pass { duration } = the real remaining rush ms so the crescendo
// lands exactly on the buzzer; without it we build over a ~9.5s default (the
// rush is always the last ~10s), which is close enough and never overshoots.
// Everything here is scrollFactor(0) — the molten world is a screen-space
// overlay, so it stays put even when the camera scrolls (park's mile of lake)
// rather than drifting a screen to the left and vanishing.
export function goldRush(scene, opts = {}) {
  const W = scene.scale.width, H = scene.scale.height;
  const winMs = Math.max(2000, opts.duration ?? 9500);
  const veil = scene.add.rectangle(0, 0, W, H, 0xffb43c, 0.1).setOrigin(0).setDepth(70).setScrollFactor(0);
  try { veil.setBlendMode('ADD'); } catch { /* canvas quirk */ }
  // molten floor: a breathing band of gold light rising off the ground —
  // the whole WORLD is smelting, not just a color filter
  const floorKey = canvasTex(scene, 'fx-goldfloor', 8, 160, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,180,60,0)');
    g.addColorStop(0.7, 'rgba(255,180,60,.4)');
    g.addColorStop(1, 'rgba(255,214,110,.85)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  const floor = scene.add.image(0, H, floorKey).setOrigin(0, 1)
    .setDisplaySize(W, H * 0.26).setBlendMode('ADD').setAlpha(0.5).setDepth(69).setScrollFactor(0);
  const sparks = scene.add.particles(0, 0, 'fx-dot', {
    x: { min: 0, max: W }, y: H + 8,
    speedY: { min: -H * 0.12, max: -H * 0.05 },
    scale: { start: 0.34, end: 0 },
    tint: [0xffd24a, 0xffb43c, 0xfff0c8],
    blendMode: 'ADD',
    lifespan: 3000,
    frequency: 130,
  }).setDepth(69).setScrollFactor(0);
  // twinkling gold glints across the whole scene — treasure in the air
  const glints = scene.add.particles(0, 0, 'fx-star', {
    x: { min: 0, max: W }, y: { min: 0, max: H * 0.85 },
    speedY: { min: -8, max: -20 },
    scale: { start: 0.5, end: 0 },
    rotate: { min: -90, max: 90 },
    tint: [0xffd24a, 0xfff0c8],
    blendMode: 'ADD',
    lifespan: 800,
    frequency: 320,
  }).setDepth(69).setScrollFactor(0);

  // ——— the crescendo: intensity RAMPS toward the cash-out ———
  // Each tier restarts the breathing pulse hotter and faster, packs the sparks
  // denser, and shoves a heave of floor-light up — so the double-points window
  // builds to a peak as the buzzer nears instead of looping flat. Wall-clock
  // scheduled so a slow-mo beat can't stall the build.
  let veilTween = null, floorTween = null;
  const pulse = (peakVeil, peakFloor, dur) => {
    try { veilTween?.stop(); floorTween?.stop(); } catch { /* removed */ }
    veilTween = scene.tweens.add({ targets: veil, alpha: { from: peakVeil * 0.45, to: peakVeil }, duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    floorTween = scene.tweens.add({ targets: floor, alpha: { from: peakFloor * 0.55, to: peakFloor }, duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  };
  const tiers = [
    { at: 0.00, veil: 0.13, floor: 0.58, dur: 720, spark: 130, glint: 320 },
    { at: 0.34, veil: 0.18, floor: 0.72, dur: 560, spark: 82, glint: 220 },
    { at: 0.64, veil: 0.24, floor: 0.86, dur: 430, spark: 54, glint: 150 },
    { at: 0.86, veil: 0.32, floor: 1.0, dur: 300, spark: 34, glint: 90 },
  ];
  const heave = () => {
    // a one-shot surge of gold sparks on each new tier — the world heaves.
    // emitParticle (NOT explode, which would set frequency -1 and kill the
    // continuous stream, and NOT an alpha tween, which would fight the pulse).
    try { sparks.emitParticle(16); } catch { /* v4 emitter */ }
  };
  tiers.forEach((tr) => {
    const run = () => {
      if (!scene.scene.isActive() || !veil.active) return;
      pulse(tr.veil, tr.floor, tr.dur);
      try { sparks.setFrequency(tr.spark); glints.setFrequency(tr.glint); } catch { /* v4 emitter */ }
      if (tr.at > 0) heave();
    };
    if (tr.at === 0) run();
    else setTimeout(run, winMs * tr.at);
  });
}

// Vertical gradient sky painted into a texture and stretched full-canvas.
// stops: [[0, '#hex'], [1, '#hex'], ...]
let skySeq = 0;
export function paintSky(scene, stops, depth = -100) {
  const key = `sky-${skySeq++}`;
  const cv = scene.textures.createCanvas(key, 8, 512);
  const c = cv.getContext();
  const g = c.createLinearGradient(0, 0, 0, 512);
  for (const [p, col] of stops) g.addColorStop(p, col);
  c.fillStyle = g;
  c.fillRect(0, 0, 8, 512);
  cv.refresh();
  return scene.add.image(0, 0, key).setOrigin(0)
    .setDisplaySize(scene.scale.width, scene.scale.height).setDepth(depth);
}

// Drifting ambient glow motes that make any scene feel alive. Two layers:
// a far field of big soft bokeh discs and a near field of small bright
// sparks — one flat layer of dots reads as screen dirt, two read as air.
export function ambientMotes(scene, tint, opts = {}) {
  const { n = 14, depth = -40, alpha = 0.5, scaleMax = 0.22 } = opts;
  const W = scene.scale.width, H = scene.scale.height;
  scene.add.particles(0, 0, 'fx-dot', {
    x: { min: 0, max: W },
    y: { min: 0, max: H },
    quantity: 1,
    frequency: (2600 / n * 10) * 2.4,
    lifespan: 13000,
    speedY: { min: -6, max: -16 },
    speedX: { min: -6, max: 6 },
    scale: { start: scaleMax * 2.6, end: scaleMax * 0.8 },
    alpha: { start: 0, end: alpha * 0.16, ease: 'Sine.easeIn' },
    tint,
    blendMode: 'ADD',
    advance: 13000,
  }).setDepth(depth - 1);
  return scene.add.particles(0, 0, 'fx-dot', {
    x: { min: 0, max: W },
    y: { min: 0, max: H },
    quantity: 1,
    frequency: 2600 / n * 10,
    lifespan: 9000,
    speedY: { min: -14, max: -34 },
    speedX: { min: -10, max: 10 },
    scale: { start: scaleMax, end: 0.04 },
    alpha: { start: 0, end: alpha, ease: 'Sine.easeIn' },
    tint,
    blendMode: 'ADD',
    advance: 9000, // pre-warm so the field is already alive on frame one
  }).setDepth(depth);
}

// ——— WebGL-only spectacle (Phaser 4 filters/lights) ———
// The QA rig and odd devices fall back to Phaser's Canvas renderer, where
// none of this exists; every helper here feature-detects and degrades to
// nothing rather than crashing a rest period.
//
// IMPORTANT: the phone PWA runs WebGL EXCLUSIVELY, so this whole layer (bloom,
// vignette, darkness cones, molten-gold lighting) is what the user actually
// sees — yet it compiles out to nothing under the Canvas renderer a headless
// QA pass typically uses. A boot-and-score Canvas run therefore CANNOT certify
// any of this; these worlds must be verified on a real WebGL context. Every
// gl()-gated call below now warns (instead of swallowing) so a renamed Phaser-4
// filter/light API — which would break only on the phone — is at least visible
// in the console rather than a silent green pass.

const gl = (scene) => !!scene.sys.renderer?.renderNodes;

// Full-screen bloom on the main camera. Call once in create(); every glow
// texture in the scene starts to actually GLOW.
export function bloomCamera(scene) {
  if (!gl(scene)) return;
  try { window.Phaser.Actions.AddEffectBloom(scene.cameras.main); }
  catch (e) { console.warn('fx.bloomCamera: WebGL bloom filter failed', e); }
}

// Soft darkened edges — instant cinema, one filter pass.
export function vignette(scene, strength = 0.3, radius = 0.85) {
  if (!gl(scene)) return;
  // hand-tuned once on a real WebGL phone: heavier values than the 0.32 cap
  // swallow the whole scene on a phone-shaped canvas. (Not re-checkable by a
  // Canvas QA run — this filter is skipped there — so keep the cap conservative.)
  try { scene.cameras.main.filters.internal.addVignette(0.5, 0.5, radius, Math.min(strength, 0.32)); }
  catch (e) { console.warn('fx.vignette: WebGL vignette filter failed', e); }
}

// Camera zoom-punch: kiss the action, spring back.
export function zoomPunch(scene, amount = 1.1, ms = 260) {
  const cam = scene.cameras.main;
  try {
    cam.zoomTo(amount, ms * 0.35, 'Back.easeOut', true);
    scene.time.delayedCall(ms * 0.4, () => cam.zoomTo(1, ms * 0.6, 'Sine.easeOut', true));
  } catch { /* camera busy */ }
}

// Score suction: a burst whose sparks spiral into a point (the HUD corner)
// — Peggle-style "the points are physically coming to you".
export function collectTo(scene, x, y, tx, ty, tint, n = 14) {
  const e = scene.add.particles(x, y, 'fx-dot', {
    speed: { min: 60, max: 260 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.4, end: 0.08 },
    lifespan: 900,
    tint,
    blendMode: 'ADD',
    emitting: false,
  }).setDepth(58);
  try { e.createGravityWell({ x: tx, y: ty, power: 4, epsilon: 120, gravity: 260 }); } catch { /* v4-only */ }
  e.explode(n);
  scene.time.delayedCall(1000, () => e.destroy());
}

// Per-glyph ceremony text: letters slam in from the center outward, each
// with its own tilt that rights itself, ride a settle-wave, then flee
// upward in the same center-out order. Peggle's "EXTREME FEVER" law:
// ceremony text is choreography, not a fade.
export function glyphBanner(scene, text, color = '#ffd24a', size = 36) {
  const W = scene.scale.width, H = scene.scale.height;
  const glyphs = [...text];
  const style = {
    fontFamily: displayFont(), fontSize: `${Math.round(size * 1.15)}px`,
    color, stroke: 'rgba(4,6,14,.85)', strokeThickness: size * 0.26,
    shadow: { offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,.5)', blur: 10, fill: true },
  };
  // measure real glyph widths so any typeface stays centered
  const objs = glyphs.map((ch) => scene.add.text(0, H * 0.3, ch === ' ' ? ' ' : ch, style)
    .setOrigin(0.5).setDepth(61).setScale(0).setAlpha(0).setScrollFactor(0)
    .setAngle((Math.random() - 0.5) * 22));
  const widths = objs.map((o, i) => (glyphs[i] === ' ' ? size * 0.5 : o.width * 0.92));
  let total = widths.reduce((a, b) => a + b, 0);
  // shrink to fit the screen so a long banner never runs off both edges
  const maxW = W * 0.9;
  if (total > maxW) {
    const fit = maxW / total;
    const px = Math.max(11, Math.floor(size * 1.15 * fit));
    objs.forEach((o) => o.setFontSize(px));
    for (let i = 0; i < widths.length; i++) widths[i] *= fit;
    total *= fit;
  }
  let x = W / 2 - total / 2;
  objs.forEach((o, i) => { o.x = x + widths[i] / 2; x += widths[i]; });
  scene.tweens.add({
    targets: objs, scale: 1, alpha: 1, angle: 0, duration: 300, ease: 'Back.easeOut',
    delay: scene.tweens.stagger(34, { from: 'center' }),
  });
  // the settle wave: a small bounce rippling outward once everyone landed
  scene.tweens.add({
    targets: objs, y: H * 0.3 - size * 0.18, duration: 170, yoyo: true, ease: 'Sine.easeInOut',
    delay: scene.tweens.stagger(26, { from: 'center', start: 480 }),
  });
  scene.tweens.add({
    targets: objs, alpha: 0, y: H * 0.25, scale: 1.12, duration: 340, ease: 'Cubic.easeIn',
    delay: scene.tweens.stagger(14, { from: 'center', start: 1050 }),
    onComplete: () => objs.forEach((o) => o.destroy()),
  });
}

// The entry ritual: never materialize mid-game. Black veil lifts, the
// world's VERB slams in wearing the universe typeface — and LANDS: shock
// ring, spark spray, camera kick, an underline snapping open beneath it.
// Input unlocks on the beat. WarioWare's law: one word teaches the game.
// `sub` (optional) is a short plain-English gesture cue — "HOLD to fall",
// "DRAG BACK & release" — drawn under the verb so a first-timer learns the
// one load-bearing control at the moment input unlocks, not only if they open
// the opt-in help panel.
export function introCard(scene, verb, onGo, sub) {
  const W = scene.scale.width, H = scene.scale.height;
  const K = unit(scene);
  const cx = W / 2, cy = H * 0.42;
  const veil = scene.add.rectangle(0, 0, W, H, 0x05070f, 1).setOrigin(0).setDepth(90);
  scene.tweens.add({ targets: veil, alpha: 0, duration: 500, delay: 220, onComplete: () => veil.destroy() });
  // a breathing pool of light behind the word so it never sits on raw black
  const glow = scene.add.image(cx, cy, 'fx-dot')
    .setBlendMode('ADD').setTint(0xfff0c8).setAlpha(0).setScale(7 * K).setDepth(90);
  scene.tweens.add({ targets: glow, alpha: 0.3, scale: 8.4 * K, duration: 360, ease: 'Sine.easeOut' });
  const card = scene.add.text(cx, cy, verb, {
    fontFamily: displayFont(),
    fontSize: `${Math.round(58 * K)}px`,
    color: '#ffffff',
    stroke: 'rgba(4,6,14,.85)',
    strokeThickness: 12 * K,
    shadow: { offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,.5)', blur: 12, fill: true },
  }).setOrigin(0.5).setDepth(91).setScale(0).setAngle(-7);
  // fit the verb to the screen — a wide --disp face or long verb must never run
  // off both edges (the guard banner/glyphBanner already carry). Shrink before
  // the underline reads card.width so they stay matched.
  const maxW = W * 0.9;
  if (card.width > maxW) card.setFontSize(Math.max(14, Math.floor(58 * K * maxW / card.width)));
  scene.tweens.add({ targets: card, scale: 1, angle: 0, duration: 360, ease: 'Back.easeOut' });
  // the underline snaps open on the landing beat
  const line = scene.add.rectangle(cx, cy + 46 * K, Math.max(40, card.width * 0.92), 4 * K, 0xffffff, 0.9)
    .setDepth(91);
  line.scaleX = 0;
  scene.tweens.add({ targets: line, scaleX: 1, delay: 300, duration: 200, ease: 'Back.easeOut' });
  // the gesture cue rides in just under the underline, on the same landing beat
  let subT = null;
  if (sub) {
    subT = scene.add.text(cx, cy + 70 * K, String(sub).toUpperCase(), {
      fontFamily: '"Geist Mono", monospace',
      fontSize: `${Math.round(15 * K)}px`,
      fontStyle: '700',
      color: '#dfe8ff',
      stroke: 'rgba(4,6,14,.85)',
      strokeThickness: Math.max(2, 3 * K),
    }).setOrigin(0.5).setDepth(91).setAlpha(0).setScale(0.9);
    if (subT.width > maxW) subT.setFontSize(Math.max(10, Math.floor(15 * K * maxW / subT.width)));
    scene.tweens.add({ targets: subT, alpha: 0.92, scale: 1, delay: 340, duration: 240, ease: 'Sine.easeOut' });
  }
  // impact frame: the word HITS the world
  scene.time.delayedCall(330, () => {
    try {
      shockRing(scene, cx, cy, 0xffffff, 150 * K);
      burst(scene, cx, cy, 0xfff0c8, { n: 12, speed: 340 * K, scale: 0.5 * K, life: 450 });
      shake(scene, 0.005, 110);
    } catch { /* torn down mid-intro */ }
  });
  scene.tweens.add({ targets: subT ? [line, glow, subT] : [line, glow], alpha: 0, delay: 1000, duration: 200, ease: 'Cubic.easeIn' });
  scene.tweens.add({
    targets: card, scale: 1.5, alpha: 0, delay: 1000, duration: 230, ease: 'Cubic.easeIn',
    onComplete: () => { card.destroy(); line.destroy(); glow.destroy(); subT?.destroy(); onGo?.(); },
  });
}

// Real darkness with a real light. Returns the cone light (or null on
// Canvas) — aim it with setConeRotation / move it with x/y.
export function darknessCone(scene, opts = {}) {
  if (!gl(scene)) return null;
  const { ambient = 0x0b0b16, x = 0, y = 0, radius = 420, color = 0xffe2b0, intensity = 2.4, angle = 0.55 } = opts;
  try {
    scene.lights.enable().setAmbientColor(ambient);
    return scene.lights.addConeLight(x, y, radius, color, intensity, 0, angle * 0.5, angle);
  } catch (e) { console.warn('fx.darknessCone: WebGL cone light failed', e); return null; }
}

export function pointLight(scene, x, y, color = 0xffc46c, radius = 220, intensity = 1.6, flicker = true) {
  if (!gl(scene)) return null;
  try {
    const l = scene.lights.addLight(x, y, radius, color, intensity);
    if (flicker) {
      scene.tweens.add({
        targets: l, intensity: intensity * 0.55, duration: 260 + Math.random() * 240,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    return l;
  } catch (e) { console.warn('fx.pointLight: WebGL light failed', e); return null; }
}

// Mark a game object as lit by the scene's lights (no-op on Canvas).
export function lit(obj) {
  try { obj.setLighting?.(true); } catch { /* canvas renderer */ }
  return obj;
}

// Rich sprite factory: draw once into a canvas texture with the full 2D
// API (radial gradients, shadows, faces on everything), render forever as
// a WebGL sprite. Returns the key so call sites can inline it.
export function canvasTex(scene, key, w, h, draw) {
  if (!scene.textures.exists(key)) {
    const cv = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
    draw(cv.getContext(), w, h);
    cv.refresh();
  }
  return key;
}

// Responsive scale factor: 1.0 on a ~400×640 CSS-pixel phone canvas,
// proportionally larger on denser/bigger screens. Games multiply every
// absolute size by this so the art holds together on any device.
export function unit(scene) {
  return Math.min(scene.scale.width / 400, scene.scale.height / 640);
}

// ——— shared scenery: pieces every illustrated backdrop leans on ———

// A puffy cumulus painted once; tint per world at the call site.
// Every puff carries its own top-lit gradient and the whole mass sits on
// a shaded base — a cartoon cloud with volume, not five flat circles.
export function cloudTex(scene) {
  return canvasTex(scene, 'fx-cloud', 140, 60, (c, w, h) => {
    const puffs = [[0.28, 0.62, 0.2], [0.45, 0.45, 0.26], [0.64, 0.55, 0.22], [0.8, 0.66, 0.15], [0.15, 0.7, 0.13]];
    // under-shadow first, so the puffs read as stacked ON it
    c.fillStyle = 'rgba(148,166,196,.55)';
    c.beginPath(); c.ellipse(w * 0.5, h * 0.8, w * 0.43, h * 0.17, 0, 0, 7); c.fill();
    for (const [x, y, r] of puffs) {
      const R = w * r * 0.9;
      const g = c.createRadialGradient(w * x - R * 0.35, h * y - R * 0.45, R * 0.1, w * x, h * y, R);
      g.addColorStop(0, 'rgba(255,255,255,.98)');
      g.addColorStop(0.62, 'rgba(244,248,255,.94)');
      g.addColorStop(1, 'rgba(196,210,232,.88)');
      c.fillStyle = g;
      c.beginPath(); c.arc(w * x, h * y, R, 0, 7); c.fill();
    }
    // crown highlight along the tallest puff
    c.fillStyle = 'rgba(255,255,255,.8)';
    c.beginPath(); c.ellipse(w * 0.44, h * 0.3, w * 0.13, h * 0.07, -0.2, 0, 7); c.fill();
  });
}

// Slow clouds drifting across the sky forever, wrapping at the edge.
export function driftClouds(scene, opts = {}) {
  const { n = 3, tint = 0xffffff, alpha = 0.5, yBand = [0.05, 0.28], scaleMin = 0.8, scaleMax = 1.7, depth = -85, speed = 9, scrollFactor = 1 } = opts;
  const W = scene.scale.width, H = scene.scale.height;
  const K = unit(scene);
  const key = cloudTex(scene);
  for (let i = 0; i < n; i++) {
    const c = scene.add.image(Math.random() * W, H * (yBand[0] + Math.random() * (yBand[1] - yBand[0])), key)
      .setTint(tint).setAlpha(alpha * (0.7 + Math.random() * 0.3))
      .setScale((scaleMin + Math.random() * (scaleMax - scaleMin)) * K)
      .setDepth(depth).setScrollFactor(scrollFactor);
    // slow breathing bob so even the sky has a pulse
    scene.tweens.add({
      targets: c, scaleY: c.scaleY * 0.94, duration: 3200 + Math.random() * 1800,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const drift = () => {
      const dist = W + 200 * K - c.x;
      scene.tweens.add({
        targets: c, x: W + 100 * K, duration: Math.max(4000, (dist / (speed * K)) * 1000),
        onComplete: () => {
          if (!c.active) return;
          c.x = -100 * K;
          c.y = H * (yBand[0] + Math.random() * (yBand[1] - yBand[0]));
          drift();
        },
      });
    };
    drift();
  }
}

// A sun or moon with a breathing halo.
export function celestial(scene, x, y, r, color, opts = {}) {
  const { halo = 3.2, alpha = 0.9, depth = -92, crescent = false, scrollFactor = 1 } = opts;
  const glowImg = scene.add.image(x, y, 'fx-dot').setTint(color).setBlendMode('ADD')
    .setScale(r * halo / 32).setAlpha(0.5).setDepth(depth).setScrollFactor(scrollFactor);
  scene.tweens.add({ targets: glowImg, alpha: 0.3, scale: r * halo * 0.85 / 32, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const hex = `#${color.toString(16).padStart(6, '0')}`;
  const key = canvasTex(scene, `fx-cel-${color}-${crescent ? 'c' : 'f'}`, 64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w * 0.42, h * 0.4, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, hex); g.addColorStop(1, hex);
    c.fillStyle = g;
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.48, 0, 7); c.fill();
    if (crescent) {
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(w * 0.68, h * 0.4, w * 0.4, 0, 7); c.fill();
    }
  });
  return scene.add.image(x, y, key).setScale(r / 32).setAlpha(alpha).setDepth(depth + 1).setScrollFactor(scrollFactor);
}

// God rays / light shafts: additive wedges that breathe.
export function lightShafts(scene, tint, opts = {}) {
  const { n = 3, alpha = 0.14, depth = -75 } = opts;
  const W = scene.scale.width, H = scene.scale.height;
  const key = canvasTex(scene, 'fx-shaft', 90, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(w * 0.3, 0); c.lineTo(w * 0.7, 0); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
  });
  for (let i = 0; i < n; i++) {
    const s = scene.add.image(W * (0.15 + i * 0.35 + Math.random() * 0.1), 0, key)
      .setOrigin(0.5, 0).setTint(tint).setBlendMode('ADD')
      .setAlpha(alpha * (0.7 + Math.random() * 0.5))
      .setAngle((Math.random() - 0.5) * 14)
      .setDisplaySize(90 * unit(scene) * (0.8 + Math.random()), H * 0.85)
      .setDepth(depth);
    scene.tweens.add({
      targets: s, alpha: alpha * 0.4, duration: 2200 + i * 700,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }
}

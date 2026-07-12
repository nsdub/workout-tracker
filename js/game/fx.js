// The juice kit. Every game leans on this for light, weight and ceremony:
// procedurally generated glow textures (no image assets), additive particle
// bursts, shock rings, floating scores, camera shake/flash, hit-stop and
// slow-mo. All of it runs on Phaser's WebGL renderer.
//
// Convention: colors are 0xRRGGBB numbers for tints, CSS strings for text.

// Build the shared texture set once per Phaser.Game instance.
export function ensureFx(scene) {
  const tm = scene.textures;
  if (tm.exists('fx-dot')) return;

  // Soft radial glow — the workhorse of every burst, trail and halo.
  const cv = tm.createCanvas('fx-dot', 64, 64);
  const c = cv.getContext();
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.32, 'rgba(255,255,255,.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  cv.refresh();

  const gfx = scene.make.graphics({ x: 0, y: 0, add: false });

  // Hard round chip — debris, snow, confetti.
  gfx.fillStyle(0xffffff, 1).fillCircle(8, 8, 7);
  gfx.generateTexture('fx-chip', 16, 16);
  gfx.clear();

  // Ring — shockwaves, lock pulses.
  gfx.lineStyle(8, 0xffffff, 1).strokeCircle(64, 64, 56);
  gfx.generateTexture('fx-ring', 128, 128);
  gfx.clear();

  // Four-point star — PR sparkle, record ceremony.
  gfx.fillStyle(0xffffff, 1);
  gfx.beginPath();
  gfx.moveTo(32, 0); gfx.lineTo(40, 24); gfx.lineTo(64, 32); gfx.lineTo(40, 40);
  gfx.lineTo(32, 64); gfx.lineTo(24, 40); gfx.lineTo(0, 32); gfx.lineTo(24, 24);
  gfx.closePath().fillPath();
  gfx.generateTexture('fx-star', 64, 64);
  gfx.clear();

  // Streak — motion trails, rain, speed lines.
  gfx.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, 6, 28, 3);
  gfx.generateTexture('fx-streak', 6, 28);
  gfx.destroy();
}

// One-shot additive explosion of glow particles.
export function burst(scene, x, y, tint, opts = {}) {
  const { n = 16, speed = 300, scale = 0.55, life = 550, gravityY = 0, texture = 'fx-dot' } = opts;
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
  return e;
}

// Expanding ring of light.
export function shockRing(scene, x, y, tint, radius = 90) {
  const img = scene.add.image(x, y, 'fx-ring')
    .setTint(tint).setBlendMode('ADD').setAlpha(0.9).setScale(0.12).setDepth(49);
  scene.tweens.add({
    targets: img, scale: radius / 56, alpha: 0,
    duration: 460, ease: 'Cubic.easeOut',
    onComplete: () => img.destroy(),
  });
}

// "+15" that pops, rises and fades. Numbers wear the mono face by law.
export function floatScore(scene, x, y, text, color = '#ffd24a', size = 24) {
  const t = scene.add.text(x, y, text, {
    fontFamily: '"Geist Mono", monospace',
    fontSize: `${Math.round(size)}px`,
    fontStyle: '700',
    color,
    stroke: 'rgba(4,6,14,.7)',
    strokeThickness: Math.max(4, size * 0.22),
  }).setOrigin(0.5).setDepth(60).setScale(0.4);
  scene.tweens.add({ targets: t, scale: 1, duration: 170, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, y: y - size * 2.4, duration: 850, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: t, alpha: 0, delay: 470, duration: 380, onComplete: () => t.destroy() });
}

// Big center-stage announcement ("WAVE CLEAR", "COMBO ×4").
export function banner(scene, text, color = '#ffd24a', size = 34) {
  const W = scene.scale.width, H = scene.scale.height;
  const t = scene.add.text(W / 2, H * 0.30, text, {
    fontFamily: '"Geist Mono", monospace',
    fontSize: `${Math.round(size)}px`,
    fontStyle: '700',
    color,
    stroke: 'rgba(4,6,14,.75)',
    strokeThickness: size * 0.24,
  }).setOrigin(0.5).setDepth(61).setScale(0.2).setAngle(-4);
  scene.tweens.add({ targets: t, scale: 1, angle: 0, duration: 260, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, alpha: 0, y: H * 0.26, delay: 800, duration: 420, onComplete: () => t.destroy() });
}

export function shake(scene, intensity = 0.008, ms = 130) {
  scene.cameras.main.shake(ms, intensity);
}

export function flash(scene, tint = 0xffffff, ms = 110, alpha = 0.55) {
  scene.cameras.main.flash(ms, (tint >> 16) & 255, (tint >> 8) & 255, tint & 255, false, undefined, alpha);
}

// Hit-stop: freeze the scene for a beat so a big hit lands with weight,
// then optionally shake on release. window.setTimeout keeps ticking while
// the scene is paused, which is exactly the point.
export function hitstop(scene, ms = 70, after = null) {
  if (!scene.scene.isActive()) return;
  scene.scene.pause();
  setTimeout(() => {
    try { scene.scene.resume(); after?.(); } catch { /* scene torn down */ }
  }, ms);
}

// Slow motion for dramatic beats (multi-slice, final target). factor 0.3 =
// 30% speed. Phaser scales tweens/timers UP with timeScale, Arcade
// physics DOWN, and Matter with its own timing — hence the three writes.
export function slowmo(scene, factor = 0.35, ms = 450) {
  scene.time.timeScale = factor;
  scene.tweens.timeScale = factor;
  if (scene.physics?.world) scene.physics.world.timeScale = 1 / factor;
  if (scene.matter?.world?.engine) scene.matter.world.engine.timing.timeScale = factor;
  setTimeout(() => {
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
  const sx = obj.scaleX, sy = obj.scaleY;
  if (axis === 'y') obj.setScale(sx * 1.28, sy * 0.72);
  else obj.setScale(sx * 0.72, sy * 1.28);
  scene.tweens.add({ targets: obj, scaleX: sx, scaleY: sy, duration: ms, ease: 'Back.easeOut' });
}

// GOLD RUSH — the last 10 seconds of every rest. The world goes molten:
// a pulsing gold veil, gold sparks rising, everything worth double
// (the doubling itself lives in the overlay's score API).
export function goldRush(scene) {
  const W = scene.scale.width, H = scene.scale.height;
  const veil = scene.add.rectangle(0, 0, W, H, 0xffb43c, 0.1).setOrigin(0).setDepth(70);
  try { veil.setBlendMode('ADD'); } catch { /* canvas quirk */ }
  scene.tweens.add({ targets: veil, alpha: { from: 0.06, to: 0.16 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.add.particles(0, 0, 'fx-dot', {
    x: { min: 0, max: W }, y: H + 8,
    speedY: { min: -H * 0.12, max: -H * 0.05 },
    scale: { start: 0.34, end: 0 },
    tint: [0xffd24a, 0xffb43c, 0xfff0c8],
    blendMode: 'ADD',
    lifespan: 3000,
    frequency: 90,
  }).setDepth(69);
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

// Drifting ambient glow motes that make any scene feel alive.
export function ambientMotes(scene, tint, opts = {}) {
  const { n = 14, depth = -40, alpha = 0.5, scaleMax = 0.22 } = opts;
  const W = scene.scale.width, H = scene.scale.height;
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

const gl = (scene) => !!scene.sys.renderer?.renderNodes;

// Full-screen bloom on the main camera. Call once in create(); every glow
// texture in the scene starts to actually GLOW.
export function bloomCamera(scene) {
  if (!gl(scene)) return;
  try { window.Phaser.Actions.AddEffectBloom(scene.cameras.main); } catch { /* filter miss */ }
}

// Soft darkened edges — instant cinema, one filter pass.
export function vignette(scene, strength = 0.3, radius = 0.85) {
  if (!gl(scene)) return;
  // verified on the WebGL renderer: heavier values than this swallow the
  // whole scene on a phone-shaped canvas
  try { scene.cameras.main.filters.internal.addVignette(0.5, 0.5, radius, Math.min(strength, 0.32)); } catch { /* filter miss */ }
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

// Per-glyph ceremony text: letters bounce in from the center outward.
export function glyphBanner(scene, text, color = '#ffd24a', size = 36) {
  const W = scene.scale.width, H = scene.scale.height;
  const glyphs = [...text];
  const style = {
    fontFamily: '"Geist Mono", monospace', fontSize: `${Math.round(size)}px`, fontStyle: '700',
    color, stroke: 'rgba(4,6,14,.75)', strokeThickness: size * 0.22,
  };
  const widths = glyphs.map((ch) => (ch === ' ' ? size * 0.5 : size * 0.62));
  const total = widths.reduce((a, b) => a + b, 0);
  let x = W / 2 - total / 2;
  const objs = glyphs.map((ch, i) => {
    const t = scene.add.text(x + widths[i] / 2, H * 0.3, ch, style)
      .setOrigin(0.5).setDepth(61).setScale(0).setAlpha(0);
    x += widths[i];
    return t;
  });
  scene.tweens.add({
    targets: objs, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut',
    delay: scene.tweens.stagger(34, { from: 'center' }),
  });
  scene.tweens.add({
    targets: objs, alpha: 0, y: H * 0.26, delay: 1000, duration: 380,
    onComplete: () => objs.forEach((o) => o.destroy()),
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
  } catch { return null; }
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
  } catch { return null; }
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

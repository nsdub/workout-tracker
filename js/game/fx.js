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
// 30% speed. Phaser scales tweens/timers UP with timeScale and Arcade
// physics DOWN, hence the split.
export function slowmo(scene, factor = 0.35, ms = 450) {
  scene.time.timeScale = factor;
  scene.tweens.timeScale = factor;
  if (scene.physics?.world) scene.physics.world.timeScale = 1 / factor;
  setTimeout(() => {
    try {
      scene.time.timeScale = 1;
      scene.tweens.timeScale = 1;
      if (scene.physics?.world) scene.physics.world.timeScale = 1;
    } catch { /* scene torn down */ }
  }, ms);
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

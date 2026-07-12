// The sound of each universe, synthesized live in WebAudio. No files.
// Every pack answers the same five cues: log, objDone, pr, restDone, finish.
import { store } from './store.js';

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Unlock on the first gesture so cues can fire from timers later.
export function initAudio() {
  const unlock = () => { ac(); document.removeEventListener('pointerdown', unlock); };
  document.addEventListener('pointerdown', unlock, { passive: true });
}

// ——— instruments ———

function tone(c, { freq = 440, type = 'sine', t = 0, dur = 0.2, vol = 0.2, slide = 0, curve = 0.0001 }) {
  const o = c.createOscillator();
  const g = c.createGain();
  const at = c.currentTime + t;
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), at + dur);
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(curve, at + dur);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + dur + 0.05);
}

let noiseBuf = null;
function noise(c, { t = 0, dur = 0.3, vol = 0.15, freq = 1000, q = 1, type = 'bandpass', slide = 0 }) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  const at = c.currentTime + t;
  f.frequency.setValueAtTime(freq, at);
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), at + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(at);
  src.stop(at + dur + 0.05);
}

const thump = (c, t = 0, f = 90, vol = 0.5) => tone(c, { freq: f, t, dur: 0.22, vol, slide: -f * 0.6, type: 'sine' });
const ding = (c, t, f, vol = 0.14, dur = 0.5) => { tone(c, { freq: f, t, dur, vol, type: 'sine' }); tone(c, { freq: f * 2.76, t, dur: dur * 0.6, vol: vol * 0.35, type: 'sine' }); };
const gong = (c, t = 0, f = 110, vol = 0.3) => {
  [1, 1.48, 2.31, 3.17].forEach((m, i) => tone(c, { freq: f * m, t, dur: 1.8 - i * 0.3, vol: vol / (i + 1.5), type: 'sine' }));
  noise(c, { t, dur: 0.12, vol: 0.1, freq: 3000, q: 0.6 });
};
const arp = (c, notes, step = 0.09, vol = 0.16, type = 'triangle', dur = 0.22) =>
  notes.forEach((f, i) => tone(c, { freq: f, t: i * step, dur, vol, type }));

// ——— the packs ———

const PACKS = {
  // Mount Volcano Dojo: taiko, wood block, temple gong.
  dojo: {
    log: (c) => { thump(c, 0, 85, 0.55); thump(c, 0.09, 120, 0.3); noise(c, { dur: 0.06, vol: 0.12, freq: 2400, q: 2 }); },
    objDone: (c) => { tone(c, { freq: 1600, dur: 0.05, vol: 0.2, type: 'square' }); tone(c, { freq: 2100, t: 0.09, dur: 0.05, vol: 0.16, type: 'square' }); },
    pr: (c) => { gong(c, 0, 98, 0.4); thump(c, 0.15, 70, 0.6); gong(c, 0.4, 147, 0.25); },
    restDone: (c) => { ding(c, 0, 880, 0.14, 0.9); ding(c, 0.25, 880, 0.1, 0.9); },
    finish: (c) => { gong(c, 0, 82, 0.35); arp(c, [392, 523, 659, 784], 0.14, 0.1, 'sine', 0.5); },
  },
  // The Deep: sonar, whale song, pressure hull.
  deep: {
    log: (c) => { ding(c, 0, 1180, 0.13, 0.7); ding(c, 0.18, 1180, 0.05, 1.1); },
    objDone: (c) => arp(c, [523, 659], 0.1, 0.1, 'sine', 0.4),
    pr: (c) => { tone(c, { freq: 65, dur: 1.6, vol: 0.3, slide: 42, type: 'sine' }); tone(c, { freq: 98, t: 0.5, dur: 1.4, vol: 0.2, slide: 60, type: 'sine' }); noise(c, { dur: 1.2, vol: 0.05, freq: 300, q: 0.5, slide: 500 }); },
    restDone: (c) => { ding(c, 0, 1180, 0.12, 0.6); ding(c, 0.22, 1570, 0.12, 0.8); },
    finish: (c) => { noise(c, { dur: 1.1, vol: 0.12, freq: 400, slide: 2400, q: 0.8 }); arp(c, [330, 415, 494, 659], 0.13, 0.09, 'sine', 0.6); },
  },
  // Cryptid National Park: camera shutter, walkie-talkie, distant howl.
  park: {
    log: (c) => { noise(c, { dur: 0.04, vol: 0.3, freq: 3800, q: 1.4 }); noise(c, { t: 0.07, dur: 0.05, vol: 0.22, freq: 2600, q: 1.4 }); tone(c, { freq: 190, t: 0.02, dur: 0.05, vol: 0.12, type: 'square' }); },
    objDone: (c) => { tone(c, { freq: 1320, dur: 0.06, vol: 0.14, type: 'square' }); noise(c, { t: 0.08, dur: 0.08, vol: 0.08, freq: 1800, q: 3 }); },
    pr: (c) => { tone(c, { freq: 392, dur: 1.2, vol: 0.16, slide: 190, type: 'sawtooth', curve: 0.001 }); tone(c, { freq: 587, t: 0.15, dur: 1.1, vol: 0.1, slide: 250, type: 'sawtooth', curve: 0.001 }); noise(c, { t: 0.1, dur: 1.2, vol: 0.05, freq: 900, q: 0.6 }); },
    restDone: (c) => { noise(c, { dur: 0.09, vol: 0.14, freq: 2200, q: 4 }); tone(c, { freq: 988, t: 0.1, dur: 0.12, vol: 0.13, type: 'square' }); tone(c, { freq: 1319, t: 0.24, dur: 0.14, vol: 0.13, type: 'square' }); },
    finish: (c) => { arp(c, [523, 440, 349, 262], 0.16, 0.11, 'triangle', 0.5); noise(c, { t: 0.5, dur: 0.5, vol: 0.05, freq: 500, q: 0.5 }); },
  },
  // The Noodle Cosmos: wok clang, sizzle, order bell.
  wok: {
    log: (c) => { tone(c, { freq: 620, dur: 0.15, vol: 0.22, type: 'square', slide: -180 }); noise(c, { dur: 0.35, vol: 0.14, freq: 5200, q: 0.7 }); },
    objDone: (c) => { ding(c, 0, 2093, 0.16, 0.5); },
    pr: (c) => { gong(c, 0, 130, 0.35); noise(c, { t: 0.1, dur: 1.4, vol: 0.12, freq: 5600, q: 0.6 }); arp(c, [659, 784, 988, 1319], 0.1, 0.12, 'triangle', 0.3); },
    restDone: (c) => { ding(c, 0, 2093, 0.15, 0.4); ding(c, 0.18, 2093, 0.12, 0.6); },
    finish: (c) => { ding(c, 0, 1568, 0.14, 0.7); arp(c, [523, 659, 784, 1047], 0.11, 0.1, 'triangle', 0.4); noise(c, { t: 0.3, dur: 0.6, vol: 0.06, freq: 4800, q: 0.7 }); },
  },
  // Pirate Radio Atoll: dial blips, vinyl, air-horn through static.
  atoll: {
    log: (c) => { tone(c, { freq: 740, dur: 0.07, vol: 0.2, type: 'square' }); tone(c, { freq: 1100, t: 0.08, dur: 0.09, vol: 0.16, type: 'square' }); noise(c, { dur: 0.12, vol: 0.05, freq: 3000, q: 0.5 }); },
    objDone: (c) => { noise(c, { dur: 0.1, vol: 0.12, freq: 1600, q: 2, slide: -900 }); tone(c, { freq: 880, t: 0.1, dur: 0.12, vol: 0.14, type: 'square' }); },
    pr: (c) => { [0, 0.12, 0.24].forEach((t) => tone(c, { freq: 466, t, dur: 0.11, vol: 0.2, type: 'sawtooth' })); tone(c, { freq: 466, t: 0.38, dur: 0.7, vol: 0.24, type: 'sawtooth' }); tone(c, { freq: 587, t: 0.38, dur: 0.7, vol: 0.16, type: 'sawtooth' }); noise(c, { dur: 1.1, vol: 0.04, freq: 2500, q: 0.4 }); },
    restDone: (c) => { tone(c, { freq: 988, dur: 0.09, vol: 0.16, type: 'square' }); tone(c, { freq: 988, t: 0.14, dur: 0.09, vol: 0.16, type: 'square' }); tone(c, { freq: 1480, t: 0.28, dur: 0.16, vol: 0.16, type: 'square' }); },
    finish: (c) => { arp(c, [587, 494, 440, 370, 294], 0.13, 0.12, 'square', 0.3); noise(c, { t: 0.55, dur: 0.7, vol: 0.07, freq: 1200, q: 0.4, slide: -900 }); },
  },
  // Yeti Ski Resort: swoosh, cowbell, avalanche, a little disco.
  yeti: {
    log: (c) => { noise(c, { dur: 0.28, vol: 0.2, freq: 900, q: 0.8, slide: 2600 }); tone(c, { freq: 523, t: 0.16, dur: 0.12, vol: 0.12, type: 'triangle' }); },
    objDone: (c) => { tone(c, { freq: 800, dur: 0.12, vol: 0.2, type: 'square', slide: -60 }); tone(c, { freq: 540, t: 0.02, dur: 0.1, vol: 0.1, type: 'square' }); },
    pr: (c) => { noise(c, { dur: 1.8, vol: 0.22, freq: 220, q: 0.4, slide: -140 }); thump(c, 0.1, 55, 0.5); thump(c, 0.5, 48, 0.45); arp(c, [784, 988, 1175, 1568], 0.09, 0.1, 'triangle', 0.3); },
    restDone: (c) => { [0, 0.16, 0.32].forEach((t, i) => tone(c, { freq: 800 - i * 40, t, dur: 0.09, vol: 0.16, type: 'square', slide: -50 })); },
    finish: (c) => { arp(c, [392, 494, 587, 784, 988], 0.1, 0.11, 'triangle', 0.4); noise(c, { t: 0.5, dur: 0.5, vol: 0.08, freq: 1400, q: 0.8, slide: 1800 }); },
  },
};

// Neutral pack for the scrapbook/board and anything unskinned.
const NEUTRAL = {
  log: (c) => thump(c, 0, 110, 0.3),
  objDone: (c) => ding(c, 0, 1047, 0.12, 0.4),
  pr: (c) => arp(c, [523, 659, 784, 1047], 0.1, 0.12),
  restDone: (c) => { ding(c, 0, 988, 0.13, 0.5); ding(c, 0.2, 1319, 0.13, 0.7); },
  finish: (c) => arp(c, [392, 523, 659, 784], 0.12, 0.1),
};

const TAP = (c) => tone(c, { freq: 1500, dur: 0.03, vol: 0.06, type: 'sine' });

// Play a cue in the current universe's voice. Safe to call anywhere.
export function sfx(cue) {
  if (!store.settings.sound) return;
  const c = ac();
  if (!c) return;
  try {
    if (cue === 'tap') return TAP(c);
    const pack = PACKS[document.documentElement.dataset.universe] || NEUTRAL;
    (pack[cue] || NEUTRAL[cue])?.(c);
  } catch { /* audio is garnish, never break the set log */ }
}

// Pentatonic combo ladder for the arcade: consecutive hits step up a
// never-dissonant scale (Peggle's trick — the music of a hot streak).
// Callers restart their chain at 0 on a miss. Caps three octaves up.
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0];
export function note(step = 0, vol = 0.15) {
  if (!store.settings.sound) return;
  const c = ac();
  if (!c) return;
  try {
    const s = Math.max(0, Math.min(step, PENTA.length * 3 - 1));
    const f = PENTA[s % PENTA.length] * 2 ** Math.floor(s / PENTA.length);
    ding(c, 0, f, vol, 0.34);
  } catch { /* audio is garnish, never break the rest */ }
}

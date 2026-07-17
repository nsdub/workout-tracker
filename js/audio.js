// The sound of each universe, synthesized live in WebAudio. No files.
// Every pack answers the same five cues: log, objDone, pr, restDone, finish.
// v2 kernel: everything plays into one mastered room — a gentle glue
// compressor plus a procedurally-built convolution reverb — so cues sound
// like instruments recorded in a space, not oscillators wired to a jack.
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

// ——— the room ———

// One shared impulse response: two seconds of exponentially dying stereo
// noise whose highs roll off as it fades — the tail darkens like a real hall.
function impulse(c) {
  const len = Math.floor(c.sampleRate * 1.9);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const p = i / len;
      const k = 0.55 - 0.45 * p; // one-pole closes over time: the echo goes dark
      lp += k * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * (1 - p) ** 2.6;
    }
  }
  return buf;
}

// Master bus, built once: voices -> master -> gentle compressor -> trim -> out.
// The trim eats the compressor's automatic makeup gain so overall loudness
// stays polite. The convolver is a send bus every voice can whisper into.
let bus = null;
function room(c) {
  if (bus && bus.c === c) return bus;
  const master = c.createGain();
  master.gain.value = 0.85;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.24;
  const trim = c.createGain();
  trim.gain.value = 0.62;
  master.connect(comp).connect(trim).connect(c.destination);
  const verb = c.createConvolver();
  verb.buffer = impulse(c);
  const wet = c.createGain();
  wet.gain.value = 0.6;
  verb.connect(wet).connect(master);
  bus = { c, master, verb };
  return bus;
}

let noiseBuf = null;
function noise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 1.2), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// Every voice speaks through one of these: a few ms of linear attack (never a
// click), exponential decay, a dry line to the master, a small send to the room.
function vca(c, { t = 0, dur = 0.3, vol = 0.2, atk = 0.004, send = 0.12 } = {}) {
  const { master, verb } = room(c);
  const at = c.currentTime + Math.max(0, t);
  const d = Math.max(dur, atk + 0.006);
  const v = Math.max(0.001, vol);
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(v, at + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  g.connect(master);
  if (send > 0) {
    const s = c.createGain();
    s.gain.value = send;
    g.connect(s).connect(verb);
  }
  return { g, at, end: at + d + 0.08 };
}

// Humanization: nothing real plays the same twice.
const hum = (f) => f * 2 ** ((Math.random() * 8 - 4) / 1200); // ±4 cents
const jit = () => Math.random() * 0.016 - 0.008;              // ±8 ms

// ——— instruments ———

// Modern UI pop: a sine that falls out of the sky plus a breath of air.
// Physical and round — the anti-beep.
function thock(c, { t = 0, freq = 520, drop = 1.8, dur = 0.13, vol = 0.28, send = 0.06, click = 0.5, wow = 0 } = {}) {
  const v = vca(c, { t, dur, vol, atk: 0.002, send });
  const o = c.createOscillator();
  o.frequency.setValueAtTime(hum(freq) * drop, v.at);
  o.frequency.exponentialRampToValueAtTime(freq, v.at + 0.035);
  if (wow) { // a little tape flutter for warmth
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.value = wow;
    lfo.connect(lg).connect(o.detune);
    lfo.start(v.at); lfo.stop(v.end);
  }
  o.connect(v.g);
  o.start(v.at); o.stop(v.end);
  if (click) hiss(c, { t, dur: 0.012, vol: vol * 0.3 * click, freq: 3400, q: 1.2, send: 0.02 });
}

// Shaped noise through a filter — clicks, sizzle, wind, surf, static.
// Pan args ride a StereoPanner when the platform has one.
function hiss(c, { t = 0, dur = 0.25, vol = 0.14, freq = 1200, to = 0, q = 1, type = 'bandpass', atk = 0.003, send = 0.08, pan = 0, panTo = null } = {}) {
  const v = vca(c, { t, dur, vol, atk, send });
  const src = c.createBufferSource();
  src.buffer = noise(c);
  src.loop = true;
  src.loopStart = Math.random(); // never the same grain twice
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, v.at);
  if (to) f.frequency.exponentialRampToValueAtTime(Math.max(40, to), v.at + dur);
  let tail = f;
  if ((pan || panTo !== null) && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.setValueAtTime(pan, v.at);
    if (panTo !== null) p.pan.linearRampToValueAtTime(panTo, v.at + dur);
    f.connect(p);
    tail = p;
  }
  src.connect(f);
  tail.connect(v.g);
  src.start(v.at, Math.random());
  src.stop(v.end);
}

// Stereo air in motion: the hiss instrument told to travel.
const whoosh = (c, o = {}) =>
  hiss(c, { dur: 0.45, vol: 0.14, freq: 500, to: 3000, q: 0.8, atk: 0.03, send: 0.15, pan: -0.6, panTo: 0.6, ...o });

// FM mallet / bowl / bell: one modulator whose depth decays, so the strike is
// bright metal and the tail is pure tone. ratio picks the alloy (whole numbers
// ring true, odd fractions clang); index picks how hard it was hit;
// bright is how long the shimmer survives.
function bell(c, { t = 0, freq = 880, dur = 1.0, vol = 0.18, ratio = 2.76, index = 2.5, bright = 0.12, atk = 0.003, send = 0.3 } = {}) {
  const v = vca(c, { t, dur, vol, atk, send });
  const f0 = hum(freq);
  const car = c.createOscillator();
  car.frequency.value = f0;
  const mod = c.createOscillator();
  mod.frequency.value = f0 * ratio;
  const mg = c.createGain();
  mg.gain.setValueAtTime(f0 * index, v.at);
  mg.gain.exponentialRampToValueAtTime(f0 * 0.02, v.at + Math.max(0.02, bright));
  mod.connect(mg).connect(car.frequency);
  car.connect(v.g);
  car.start(v.at); mod.start(v.at);
  car.stop(v.end); mod.stop(v.end);
}

// Synth pluck: two saws a few cents apart behind a lowpass that snaps shut.
// All warmth, no buzz — the buzz dies with the filter.
function pluck(c, { t = 0, freq = 440, dur = 0.5, vol = 0.2, send = 0.15, brightHz = 0 } = {}) {
  const v = vca(c, { t, dur, vol, atk: 0.003, send });
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(brightHz || Math.min(11000, freq * 7), v.at);
  f.frequency.exponentialRampToValueAtTime(freq * 1.4, v.at + Math.min(0.16, dur * 0.6));
  const trim = c.createGain();
  trim.gain.value = 0.55;
  trim.connect(f).connect(v.g);
  [-5, 4].forEach((d) => {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = d + Math.random() * 3;
    o.connect(trim);
    o.start(v.at); o.stop(v.end);
  });
}

// Fanfare fuel: a detuned saw/triangle stack behind a lowpass that opens as
// the envelope grows. Chords swell instead of blaring.
function swell(c, { t = 0, freqs = [220, 277, 330], dur = 0.9, vol = 0.18, send = 0.25, atk = 0.05, open = 10, type = 'sawtooth' } = {}) {
  const v = vca(c, { t, dur, vol, atk, send });
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 0.7;
  const base = Math.min(...freqs);
  f.frequency.setValueAtTime(base * 1.5, v.at);
  f.frequency.exponentialRampToValueAtTime(Math.min(9000, base * open), v.at + Math.max(atk, dur * 0.35));
  const trim = c.createGain();
  trim.gain.value = 1 / (freqs.length + 1);
  trim.connect(f).connect(v.g);
  freqs.forEach((fr) =>
    [-7, 6].forEach((d) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = fr;
      o.detune.value = d + Math.random() * 3;
      o.connect(trim);
      o.start(v.at); o.stop(v.end);
    }));
}

// Clean sine weight under a hit. Felt more than heard.
function sub(c, { t = 0, freq = 60, dur = 0.35, vol = 0.45, drop = 0.55, send = 0.03 } = {}) {
  const v = vca(c, { t, dur, vol, atk: 0.005, send });
  const o = c.createOscillator();
  o.frequency.setValueAtTime(freq * 1.6, v.at);
  o.frequency.exponentialRampToValueAtTime(Math.max(28, freq * drop), v.at + dur * 0.8);
  o.connect(v.g);
  o.start(v.at); o.stop(v.end);
}

// A voice that bends: a glide with slow vibrato, softened by a lowpass.
// Whales, wolves, wind through a canyon.
function glide(c, { t = 0, from = 180, to = 90, dur = 1.4, vol = 0.18, type = 'sine', vib = 14, vibHz = 4.5, atk = 0.08, send = 0.4 } = {}) {
  const v = vca(c, { t, dur, vol, atk, send });
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, v.at);
  o.frequency.exponentialRampToValueAtTime(to, v.at + dur * 0.85);
  const lfo = c.createOscillator();
  const lg = c.createGain();
  lfo.frequency.value = vibHz;
  lg.gain.value = vib; // vibrato depth in cents
  lfo.connect(lg).connect(o.detune);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = Math.max(from, to) * 3.5;
  o.connect(f).connect(v.g);
  o.start(v.at); lfo.start(v.at);
  o.stop(v.end); lfo.stop(v.end);
}

// Warm FM keys — marimba front, felt-piano tail. The combo ladder's voice.
function keys(c, { t = 0, freq = 523, dur = 0.55, vol = 0.16, send = 0.22 } = {}) {
  bell(c, { t, freq, dur, vol, ratio: 3.99, index: 1.5, bright: 0.07, send });
  hiss(c, { t, dur: 0.008, vol: vol * 0.22, freq: 2600, q: 1.6, send: 0.02 }); // mallet contact
}

// Sparse dusty ticks — vinyl garnish for the atoll.
function crackle(c, t = 0, dur = 0.6, vol = 0.05) {
  for (let i = 0; i < 5; i++) {
    hiss(c, { t: t + Math.random() * dur, dur: 0.012, vol: vol * (0.4 + Math.random() * 0.6), freq: 4200 + Math.random() * 3000, q: 2.5, send: 0.02 });
  }
}

// ——— the packs ———

const PACKS = {
  // Mount Volcano Dojo: taiko drums and temple bowls ringing into the rafters.
  dojo: {
    log: (c) => { // taiko: the skin, the stick, the weight
      sub(c, { freq: 82, vol: 0.5, dur: 0.3, drop: 0.5 });
      hiss(c, { dur: 0.05, vol: 0.16, freq: 480, q: 0.7, send: 0.12 });
      hiss(c, { dur: 0.012, vol: 0.1, freq: 2800, q: 1.5, send: 0.03 });
    },
    objDone: (c) => bell(c, { freq: 1244, dur: 0.7, vol: 0.15, ratio: 3.01, index: 2.2, bright: 0.05, send: 0.35 }), // small bowl
    pr: (c) => { // the great bowl, struck twice, with the drum underneath
      bell(c, { freq: 98, dur: 2.6, vol: 0.32, ratio: 1.41, index: 4, bright: 0.5, send: 0.5 });
      sub(c, { t: 0.02, freq: 70, vol: 0.45, dur: 0.4 });
      bell(c, { t: 0.46 + jit(), freq: 147, dur: 2.0, vol: 0.22, ratio: 1.41, index: 3, bright: 0.4, send: 0.55 });
      sub(c, { t: 0.46, freq: 62, vol: 0.5, dur: 0.5 });
      bell(c, { t: 0.92 + jit(), freq: 587, dur: 1.4, vol: 0.1, ratio: 3.01, index: 2, bright: 0.08, send: 0.6 });
    },
    restDone: (c) => [0, 0.28].forEach((t) => { // two bowl strikes that carry
      bell(c, { t, freq: 988, dur: 0.8, vol: 0.2, ratio: 2.61, index: 2.4, bright: 0.05, send: 0.25 });
      bell(c, { t, freq: 494, dur: 0.6, vol: 0.09, ratio: 2.01, index: 1.2, bright: 0.05, send: 0.2 });
    }),
    finish: (c) => { // taiko roll into a pentatonic bowl song
      [0, 0.16, 0.3].forEach((t, i) => sub(c, { t: t + jit(), freq: 76 - i * 6, vol: 0.4 + i * 0.05, dur: 0.28 }));
      bell(c, { t: 0.42, freq: 110, dur: 2.2, vol: 0.26, ratio: 1.41, index: 3.5, bright: 0.45, send: 0.5 });
      [392, 523, 587, 784].forEach((f, i) =>
        bell(c, { t: 0.55 + i * 0.13 + jit(), freq: f, dur: 0.9, vol: 0.1, ratio: 3.01, index: 1.8, bright: 0.06, send: 0.45 }));
    },
  },
  // The Deep: sonar in a cathedral of water, whale song, abyssal pressure.
  deep: {
    log: (c) => { // one ping and its far-wall answer
      bell(c, { freq: 1175, dur: 1.0, vol: 0.15, ratio: 1.5, index: 0.4, bright: 0.03, send: 0.65 });
      bell(c, { t: 0.28, freq: 1175, dur: 1.2, vol: 0.05, ratio: 1.5, index: 0.2, bright: 0.03, send: 0.8 });
    },
    objDone: (c) => [988, 1319].forEach((f, i) =>
      bell(c, { t: i * (0.14 + jit()), freq: f, dur: 0.8, vol: 0.11, ratio: 1.5, index: 0.5, bright: 0.04, send: 0.55 })),
    pr: (c) => { // the whale answers, and the whole trench hears it
      sub(c, { freq: 45, vol: 0.5, dur: 1.2, drop: 0.7 });
      glide(c, { from: 70, to: 190, dur: 1.5, vol: 0.22, vib: 16, vibHz: 3.5, atk: 0.12, send: 0.5 });
      glide(c, { t: 0.7, from: 210, to: 120, dur: 1.4, vol: 0.14, vib: 20, vibHz: 3, atk: 0.15, send: 0.6 });
      bell(c, { t: 1.15, freq: 1568, dur: 1.4, vol: 0.1, ratio: 1.5, index: 0.4, bright: 0.03, send: 0.75 });
    },
    restDone: (c) => [1175, 1568].forEach((f, i) => { // surfacing ping: up a fourth, drier so it cuts
      bell(c, { t: i * 0.26, freq: f, dur: 0.7, vol: 0.19, ratio: 1.5, index: 0.6, bright: 0.04, send: 0.3 });
      bell(c, { t: i * 0.26, freq: f / 2, dur: 0.5, vol: 0.07, ratio: 2, index: 0.5, bright: 0.04, send: 0.25 });
    }),
    finish: (c) => { // dark water chord under a rising song
      swell(c, { freqs: [110, 165, 220], dur: 1.6, vol: 0.14, type: 'triangle', open: 6, atk: 0.2, send: 0.5 });
      glide(c, { t: 0.2, from: 130, to: 260, dur: 1.2, vol: 0.14, vib: 14, vibHz: 4, send: 0.55 });
      bell(c, { t: 0.9, freq: 1319, dur: 1.2, vol: 0.09, ratio: 1.5, index: 0.4, bright: 0.03, send: 0.7 });
    },
  },
  // Cryptid National Park: camera shutter, walkie-talkie, something howling.
  park: {
    log: (c) => { // shutter: mirror up, mirror down — tight and mechanical
      hiss(c, { dur: 0.01, vol: 0.26, freq: 3600, q: 1.6, send: 0.02 });
      thock(c, { t: 0.005, freq: 310, drop: 1.4, dur: 0.06, vol: 0.14, send: 0.03, click: 0 });
      hiss(c, { t: 0.055, dur: 0.016, vol: 0.2, freq: 2300, q: 1.6, send: 0.03 });
    },
    objDone: (c) => { // walkie chirp, softened — copy that
      thock(c, { freq: 1050, drop: 1.12, dur: 0.09, vol: 0.15, send: 0.08, click: 0 });
      thock(c, { t: 0.1, freq: 1400, drop: 1.1, dur: 0.11, vol: 0.13, send: 0.1, click: 0 });
      hiss(c, { t: 0.2, dur: 0.05, vol: 0.04, freq: 1900, q: 4, send: 0.08 }); // squelch tail
    },
    pr: (c) => { // the howl — far ridge, slow vibrato, unmistakable
      sub(c, { freq: 55, vol: 0.35, dur: 0.8 });
      glide(c, { from: 350, to: 640, dur: 0.8, vol: 0.16, type: 'sawtooth', vib: 24, vibHz: 5.5, atk: 0.1, send: 0.55 });
      glide(c, { t: 0.72, from: 640, to: 392, dur: 1.1, vol: 0.13, type: 'sawtooth', vib: 32, vibHz: 5, atk: 0.05, send: 0.6 });
      glide(c, { t: 1.0, from: 520, to: 420, dur: 0.9, vol: 0.06, type: 'sawtooth', vib: 28, vibHz: 5, atk: 0.2, send: 0.8 }); // the pack answers
    },
    restDone: (c) => [0, 0.3].forEach((t) => { // radio check: twice, bright plus body
      bell(c, { t, freq: 1047, dur: 0.5, vol: 0.18, ratio: 2, index: 1.2, bright: 0.04, send: 0.15 });
      thock(c, { t, freq: 523, drop: 1.15, dur: 0.1, vol: 0.1, send: 0.08, click: 0 });
    }),
    finish: (c) => { // campfire kalimba coming down the trail
      [784, 659, 523, 392].forEach((f, i) => pluck(c, { t: i * 0.15 + jit(), freq: f, dur: 0.6, vol: 0.13, send: 0.3 }));
      whoosh(c, { t: 0.5, dur: 0.7, vol: 0.05, freq: 400, to: 1400, send: 0.3 });
      glide(c, { t: 0.75, from: 587, to: 494, dur: 0.7, vol: 0.06, vib: 20, vibHz: 4.5, send: 0.6 }); // one last distant hoot
    },
  },
  // The Noodle Cosmos: wok steel, oil sizzle, the order bell.
  wok: {
    log: (c) => { // clang — real metal, real oil
      bell(c, { freq: 720, dur: 0.5, vol: 0.2, ratio: 2.53, index: 5, bright: 0.04, send: 0.2 });
      sub(c, { freq: 110, vol: 0.2, dur: 0.15, drop: 0.7 });
      hiss(c, { dur: 0.4, vol: 0.09, freq: 5200, to: 3400, q: 0.7, send: 0.08 }); // sizzle
    },
    objDone: (c) => { // order bell: bright but round
      bell(c, { freq: 1319, dur: 0.7, vol: 0.16, ratio: 2, index: 1.8, bright: 0.05, send: 0.3 });
      bell(c, { freq: 660, dur: 0.4, vol: 0.06, ratio: 2, index: 1, bright: 0.04, send: 0.25 });
    },
    pr: (c) => { // flambé: the big clang, the flame, the kitchen cheers
      bell(c, { freq: 340, dur: 1.6, vol: 0.26, ratio: 2.53, index: 6, bright: 0.09, send: 0.35 });
      sub(c, { freq: 65, vol: 0.45, dur: 0.5 });
      hiss(c, { dur: 1.3, vol: 0.09, freq: 6000, to: 2800, q: 0.6, atk: 0.06, send: 0.12 });
      [659, 784, 988, 1319].forEach((f, i) => pluck(c, { t: 0.28 + i * 0.11 + jit(), freq: f, dur: 0.35, vol: 0.12, send: 0.25 }));
      bell(c, { t: 0.75, freq: 1568, dur: 0.9, vol: 0.13, ratio: 2, index: 1.8, bright: 0.05, send: 0.4 });
    },
    restDone: (c) => [0, 0.26].forEach((t) => { // order up! order up!
      bell(c, { t, freq: 1319, dur: 0.55, vol: 0.19, ratio: 2, index: 2, bright: 0.05, send: 0.2 });
      bell(c, { t, freq: 660, dur: 0.35, vol: 0.07, ratio: 2, index: 1, bright: 0.04, send: 0.15 });
    }),
    finish: (c) => { // service! — bell, a rising ladle riff, oil settling
      bell(c, { freq: 1047, dur: 0.9, vol: 0.15, ratio: 2, index: 2, bright: 0.06, send: 0.35 });
      [523, 659, 784, 1047].forEach((f, i) => pluck(c, { t: 0.15 + i * 0.12 + jit(), freq: f, dur: 0.45, vol: 0.12, send: 0.25 }));
      hiss(c, { t: 0.4, dur: 0.7, vol: 0.05, freq: 5000, to: 2600, q: 0.7, send: 0.1 });
      sub(c, { t: 0.62, freq: 78, vol: 0.3, dur: 0.3 });
    },
  },
  // Pirate Radio Atoll: warm dial blips, vinyl dust, the air-horn of victory.
  atoll: {
    log: (c) => { // tuning blip with a little tape wow
      thock(c, { freq: 640, drop: 1.35, dur: 0.11, vol: 0.2, send: 0.08, click: 0.3, wow: 10 });
      crackle(c, 0, 0.18, 0.04);
    },
    objDone: (c) => { // signal found — two warm pops up the dial
      thock(c, { freq: 523, drop: 1.3, dur: 0.1, vol: 0.18, send: 0.08, wow: 8 });
      thock(c, { t: 0.12 + jit(), freq: 784, drop: 1.25, dur: 0.13, vol: 0.16, send: 0.12, wow: 8 });
      crackle(c, 0, 0.3, 0.04);
    },
    pr: (c) => { // AIR HORN. Three stabs and the long one. Pull up.
      const horn = (t, dur, vol) => swell(c, { t, freqs: [233, 466, 469.5], dur, vol, atk: 0.012, open: 16, send: 0.18 });
      horn(0, 0.1, 0.22); horn(0.14 + jit(), 0.1, 0.22); horn(0.28 + jit(), 0.1, 0.22);
      horn(0.44, 0.85, 0.26);
      sub(c, { t: 0.44, freq: 58, vol: 0.4, dur: 0.55 });
      crackle(c, 0, 1.1, 0.05);
    },
    restDone: (c) => [0, 0.28].forEach((t) => { // the DJ taps the mic: back to work
      bell(c, { t, freq: 988, dur: 0.5, vol: 0.19, ratio: 2, index: 1.5, bright: 0.04, send: 0.18 });
      thock(c, { t, freq: 494, drop: 1.2, dur: 0.1, vol: 0.1, send: 0.08, click: 0 });
    }),
    finish: (c) => { // dub outro: the riff, then its echo from across the lagoon
      [587, 494, 392, 294].forEach((f, i) => pluck(c, { t: i * 0.14 + jit(), freq: f, dur: 0.5, vol: 0.13, send: 0.3 }));
      [587, 494, 392, 294].forEach((f, i) => pluck(c, { t: 0.38 + i * 0.14, freq: f, dur: 0.5, vol: 0.05, send: 0.6 }));
      swell(c, { t: 0.85, freqs: [233, 466], dur: 0.4, vol: 0.12, atk: 0.012, open: 12, send: 0.25 }); // one last horn
      crackle(c, 0, 1.2, 0.04);
    },
  },
  // Yeti Ski Resort: powder in stereo, cowbell, and après-ski disco.
  yeti: {
    log: (c) => { // carve left to right, land soft
      whoosh(c, { dur: 0.32, vol: 0.16, freq: 700, to: 2600, q: 0.9, send: 0.12 });
      thock(c, { t: 0.15, freq: 420, drop: 1.3, dur: 0.1, vol: 0.13, send: 0.06, click: 0 });
    },
    objDone: (c) => { // the cowbell. there is never enough of it
      bell(c, { freq: 835, dur: 0.22, vol: 0.18, ratio: 0.646, index: 2.8, bright: 0.03, send: 0.1 });
      bell(c, { freq: 540, dur: 0.16, vol: 0.08, ratio: 0.72, index: 2, bright: 0.03, send: 0.08 });
    },
    pr: (c) => { // avalanche into the chalet — and the DJ leans in
      whoosh(c, { dur: 1.2, vol: 0.18, freq: 2400, to: 300, q: 0.7, pan: 0.7, panTo: -0.7, atk: 0.08, send: 0.25 });
      sub(c, { t: 0.1, freq: 52, vol: 0.5, dur: 0.5 });
      sub(c, { t: 0.5, freq: 46, vol: 0.45, dur: 0.6 });
      swell(c, { t: 0.55, freqs: [392, 494, 587], dur: 0.16, vol: 0.16, atk: 0.008, open: 14, send: 0.2 });
      swell(c, { t: 0.75, freqs: [440, 554, 659], dur: 0.2, vol: 0.18, atk: 0.008, open: 14, send: 0.25 });
      bell(c, { t: 0.95, freq: 835, dur: 0.25, vol: 0.16, ratio: 0.646, index: 3, bright: 0.03, send: 0.15 });
    },
    restDone: (c) => [0, 0.26].forEach((t) => { // cowbell twice: lift's leaving
      bell(c, { t, freq: 835, dur: 0.24, vol: 0.2, ratio: 0.646, index: 3, bright: 0.03, send: 0.1 });
      bell(c, { t: t + 0.01, freq: 1670, dur: 0.14, vol: 0.06, ratio: 1.5, index: 1, bright: 0.02, send: 0.12 });
    }),
    finish: (c) => { // four on the floor, stabs on the off-beat, ride out
      [0, 0.15, 0.3, 0.45].forEach((t) => sub(c, { t, freq: 55, vol: 0.4, dur: 0.13, drop: 0.6 }));
      [0.075, 0.225, 0.375, 0.525].forEach((t) => hiss(c, { t, dur: 0.03, vol: 0.06, freq: 7000, q: 1.4, send: 0.04 }));
      [0.15, 0.45].forEach((t, i) => swell(c, { t, freqs: i ? [440, 554, 659] : [392, 494, 587], dur: 0.13, vol: 0.14, atk: 0.008, open: 12, send: 0.18 }));
      whoosh(c, { t: 0.55, dur: 0.5, vol: 0.1, freq: 600, to: 3200, send: 0.25 });
    },
  },
};

// Neutral pack for the scrapbook/board and anything unskinned:
// a modern UI kit — pops, marimba, one tasteful fanfare.
const NEUTRAL = {
  log: (c) => { thock(c, { freq: 480, vol: 0.24 }); sub(c, { freq: 95, vol: 0.16, dur: 0.14 }); },
  objDone: (c) => keys(c, { freq: 784, vol: 0.15 }),
  pr: (c) => {
    bell(c, { freq: 660, dur: 1.4, vol: 0.2, ratio: 2, index: 2.5, bright: 0.09, send: 0.4 });
    swell(c, { t: 0.1, freqs: [262, 330, 392], dur: 0.9, vol: 0.13, atk: 0.05, send: 0.3 });
    sub(c, { freq: 60, vol: 0.35, dur: 0.4 });
  },
  restDone: (c) => [988, 1319].forEach((f, i) => {
    bell(c, { t: i * 0.24, freq: f, dur: 0.6, vol: 0.17, ratio: 2, index: 1.6, bright: 0.04, send: 0.2 });
    thock(c, { t: i * 0.24, freq: f / 2, drop: 1.15, dur: 0.09, vol: 0.07, send: 0.08, click: 0 });
  }),
  finish: (c) => {
    [523, 659, 784, 1047].forEach((f, i) => keys(c, { t: i * 0.12 + jit(), freq: f, vol: 0.13 }));
    swell(c, { t: 0.36, freqs: [262, 392, 523], dur: 0.8, vol: 0.1, atk: 0.08, send: 0.35 });
  },
};

// The tap: a soft, nearly-dry tick. Feels like a key, not a beep.
const TAP = (c) => {
  hiss(c, { dur: 0.01, vol: 0.05, freq: 2100, q: 1.2, atk: 0.002, send: 0.02 });
  thock(c, { freq: 900, drop: 1.2, dur: 0.045, vol: 0.06, send: 0.02, click: 0 });
};

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

// The one cue that must survive a locked phone. iOS suspends the context on
// screen-lock and often refuses resume outside a gesture — so if the room is
// asleep, stash the cue and fire it the instant the context wakes (statechange
// after resume, or the user's first tap back). Freshness window: a ding is a
// "now" signal — never play one more than 15s stale. Used ONLY by the rest
// timer; every other cue keeps plain sfx().
let pendingCue = null;
let flushTapHooked = false;
let flushStateHooked = null; // the ctx instance carrying our statechange listener
export function flushWhenRunning(cue) {
  const c = ac();
  if (c && c.state === 'running') return sfx(cue);
  pendingCue = { cue, at: Date.now() };
  const tryFlush = () => {
    if (pendingCue && Date.now() - pendingCue.at > 15000) pendingCue = null;
    if (!pendingCue || !ctx || ctx.state !== 'running') return;
    const held = pendingCue;
    pendingCue = null;
    sfx(held.cue);
  };
  if (c && flushStateHooked !== c) {
    flushStateHooked = c;
    try { c.addEventListener('statechange', tryFlush); } catch { /* ancient webkit */ }
  }
  if (!flushTapHooked) {
    flushTapHooked = true;
    document.addEventListener('pointerdown', () => { ac(); setTimeout(tryFlush, 40); }, { passive: true });
  }
}

// Pentatonic combo ladder for the arcade: consecutive hits step up a
// never-dissonant scale (Peggle's trick — the music of a hot streak).
// Callers restart their chain at 0 on a miss. Caps three octaves up.
// Voiced as warm FM keys into the room, so a streak plays a marimba solo.
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0];
export function note(step = 0, vol = 0.15) {
  if (!store.settings.sound) return;
  const c = ac();
  if (!c) return;
  try {
    const s = Math.max(0, Math.min(step, PENTA.length * 3 - 1));
    const f = PENTA[s % PENTA.length] * 2 ** Math.floor(s / PENTA.length);
    keys(c, { freq: f, vol, dur: 0.45, send: 0.25 + (s / 30) }); // higher up the ladder, wetter the hall
  } catch { /* audio is garnish, never break the rest */ }
}

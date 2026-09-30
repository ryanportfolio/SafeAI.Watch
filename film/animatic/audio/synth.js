// Voices for the score. Every voice schedules its own nodes on a (usually offline) context at
// absolute times; nothing here reads a clock or Math.random(). Each voice hands its last node
// to M.retire(end, node) so the renderer can disconnect it once it has fallen silent. Openly synthetic: detuned
// unison pads with moving filters, FM bells whose index decays (bright attack, soft tail),
// filtered plucks, a sine sub with a saturated octave. Envelopes are exponential
// (setTargetAtTime), attacks are at least 5 ms, and every source stops only after its
// envelope has fallen below -70 dB, so no voice can click.

export const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// 'F#4' -> 66
export function midi(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
export const hz = (name) => mtof(midi(name));

const MIN_ATTACK = 0.005;

// Slow modulation (drift, wow, filter sweeps) is sampled once per 128-frame block: at 48 kHz
// that is every 2.7 ms, far finer than any of these movements, and it keeps the offline
// render several times faster than per-sample coefficient updates.
const kr = (p) => { p.automationRate = 'k-rate'; return p; };
function lowpass(ctx, f, q) {
  const b = ctx.createBiquadFilter();
  b.type = 'lowpass';
  b.Q.value = q;
  kr(b.frequency);
  b.frequency.value = f;
  return b;
}

// Exponential envelope on a gain param: rise to peak (95% at t0 + a), optional decay to a
// sustain level, release from t1 (60 dB down after r). Returns when the source may stop.
export function env(p, { t0, a, peak, d = 0, sustain = peak, t1 = null, r = 0.5 }) {
  const att = Math.max(MIN_ATTACK, a);
  p.setValueAtTime(0, t0);
  p.setTargetAtTime(peak, t0, att / 3);
  if (d > 0) p.setTargetAtTime(sustain, t0 + att, d / 6.9);
  if (t1 == null) return t0 + att + d * 1.2;
  p.setTargetAtTime(0, Math.max(t1, t0 + att * 0.5), r / 6.9);
  return t1 + r * 1.25;
}

function osc(ctx, type, f, t0, t1, wow) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = f;
  kr(o.detune);
  if (wow) wow.connect(o.detune);
  o.start(t0);
  o.stop(t1);
  return o;
}

function panner(ctx, pan, out) {
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  p.connect(out);
  return p;
}

// Slow drift LFO in cents, one per voice, from the seeded rng.
function drift(ctx, rng, t0, t1, cents = 3) {
  const l = ctx.createOscillator();
  l.frequency.value = 0.05 + 0.15 * rng();
  const g = ctx.createGain();
  g.gain.value = cents * (0.6 + 0.4 * rng());
  l.connect(g);
  l.start(t0);
  l.stop(t1);
  return g;
}

let TANH = null;
export function tanhCurve(k = 2.5) {
  const n = 2048, c = new Float32Array(n), norm = Math.tanh(k);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / norm; }
  return c;
}

// Pad: per note, a triangle in the centre and two saws detuned +-7 cents spread wide, through
// a low-pass whose cutoff rises through the attack and breathes on a slow LFO, so the timbre
// keeps moving for the whole chord.
// One filter set per chord (left saws, right saws, centre triangles), sharing one sweep and one
// LFO; each note keeps its own slow pitch drift.
export function pad(ctx, M, rng, { t0, t1, notes, gain = 0.05, cut = 1600, a = 2.2, r = 2.6, spread = 0.7, send = 0.45 }) {
  const end = t1 + r * 1.25;
  const vg = ctx.createGain();
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06 + 0.1 * rng();
  const lg = ctx.createGain();
  lg.gain.value = cut * (0.2 + 0.12 * rng());
  lfo.connect(lg);
  lfo.start(t0);
  lfo.stop(end);
  const lanes = [-spread, 0, spread].map((pan) => {
    const lp = lowpass(ctx, cut * 0.45, 0.9);
    lp.frequency.setValueAtTime(cut * 0.45, t0);
    lp.frequency.setTargetAtTime(cut, t0, a * 0.8);
    lg.connect(lp.frequency);
    lp.connect(pan ? panner(ctx, pan, vg) : vg);
    return lp;
  });
  notes.forEach((n, i) => {
    const f = hz(n);
    const dr = drift(ctx, rng, t0, end, 3);
    const side = i % 2 ? 1 : -1;
    // top notes slightly softer, so an open voicing stays dark
    const w = 1 - 0.08 * i;
    const voices = [['triangle', 0, 1, 1.0], ['sawtooth', -7, 1 - side, 0.42], ['sawtooth', 7, 1 + side, 0.42]];
    for (const [type, det, lane, lvl] of voices) {
      const o = osc(ctx, type, f, t0, end, M.wow);
      o.detune.value = det + (rng() - 0.5) * 2;
      dr.connect(o.detune);
      const g = ctx.createGain();
      g.gain.value = lvl * w;
      o.connect(g).connect(lanes[lane]);
    }
  });
  env(vg.gain, { t0, a, peak: gain, t1, r });
  vg.connect(M.pad);
  const s = ctx.createGain();
  s.gain.value = send;
  vg.connect(s).connect(M.verb);
  return M.retire(end, vg);
}

// FM bell: sine carrier, sine modulator at a non-integer ratio, index falling from bright to
// soft, plus a quiet pure partial an octave down for body. Tuned to the key.
export function bell(ctx, M, rng, { t, note, vel = 1, dec = 3.2, ratio = 3.5, index = 2.2, pan = 0, send = 0.4, out = M.bell, body = 0.22 }) {
  const f = hz(note);
  const end = t + dec * 1.3;
  const car = osc(ctx, 'sine', f, t, end, M.wow);
  const mod = osc(ctx, 'sine', f * ratio, t, end, null);
  const mg = ctx.createGain();
  mg.gain.setValueAtTime(f * index, t);
  mg.gain.setTargetAtTime(f * 0.12, t, 0.09);
  mod.connect(mg).connect(car.frequency);
  const low = osc(ctx, 'sine', f / 2, t, end, M.wow);
  const lg = ctx.createGain();
  lg.gain.value = body;
  const sum = ctx.createGain();
  car.connect(sum);
  low.connect(lg).connect(sum);
  const lp = lowpass(ctx, 9000, 0.7);
  const g = ctx.createGain();
  env(g.gain, { t0: t, a: 0.006, peak: 0.16 * vel, d: dec, sustain: 0 });
  sum.connect(lp).connect(g);
  g.connect(panner(ctx, pan, out));
  const s = ctx.createGain();
  s.gain.value = send;
  g.connect(s).connect(M.verb);
  return M.retire(end, g);
}

// A reading: a small, soft tuned point (harmonic FM, short). Many of them make the chart's
// readings audible in the labels chapter.
export function point(ctx, M, rng, { t, note, vel = 1, pan = 0, dec = 0.8 }) {
  const f = hz(note);
  const end = t + dec * 1.3;
  const car = osc(ctx, 'sine', f, t, end, null);
  const mod = osc(ctx, 'sine', f * 2, t, end, null);
  const mg = ctx.createGain();
  mg.gain.setValueAtTime(f * 1.1, t);
  mg.gain.setTargetAtTime(0, t, 0.04);
  mod.connect(mg).connect(car.frequency);
  const g = ctx.createGain();
  env(g.gain, { t0: t, a: 0.007, peak: 0.05 * vel, d: dec, sustain: 0 });
  car.connect(g);
  g.connect(panner(ctx, pan, M.read));
  const s = ctx.createGain();
  s.gain.value = 0.7;
  g.connect(s).connect(M.verb);
  return M.retire(end, g);
}

// Pluck for the pulse: two saws a few cents apart, a resonant low-pass that closes quickly.
export function pluck(ctx, M, rng, { t, note, vel = 1, cut = 1800, dec = 0.9, pan = 0, send = 0.3 }) {
  const f = hz(note);
  const end = t + dec * 1.3;
  const lp = lowpass(ctx, cut, 1.6);
  lp.frequency.setValueAtTime(Math.min(16000, cut * 2.6), t);
  lp.frequency.setTargetAtTime(cut * 0.55, t, 0.11);
  for (const det of [-5, 5]) {
    const o = osc(ctx, 'sawtooth', f, t, end, M.wow);
    o.detune.value = det;
    o.connect(lp);
  }
  const tri = osc(ctx, 'triangle', f * 2, t, end, M.wow);
  const tg = ctx.createGain();
  tg.gain.value = 0.25;
  tri.connect(tg).connect(lp);
  const g = ctx.createGain();
  env(g.gain, { t0: t, a: 0.007, peak: 0.05 * vel, d: dec, sustain: 0 });
  lp.connect(g);
  g.connect(panner(ctx, pan, M.arp));
  const s = ctx.createGain();
  s.gain.value = send;
  g.connect(s).connect(M.verb);
  return M.retire(end, g);
}

// Bass: a sine sub on the note plus a saturated saw an octave up (reads on small speakers),
// low-passed, mono on the low bus.
export function bass(ctx, M, rng, { t0, t1, note, gain = 0.1, a = 0.9, r = 1.2 }) {
  const f = hz(note);
  const end = t1 + r * 1.25;
  const sub = osc(ctx, 'sine', f, t0, end, null);
  const up = osc(ctx, 'sawtooth', f * 2, t0, end, null);
  const drive = ctx.createGain();
  drive.gain.value = 0.9;
  const sh = ctx.createWaveShaper();
  sh.curve = TANH || (TANH = tanhCurve(2.5));
  sh.oversample = '2x';
  const lp = lowpass(ctx, 380, 0.5);
  const ug = ctx.createGain();
  ug.gain.value = 0.35;
  up.connect(drive).connect(sh).connect(lp).connect(ug);
  const g = ctx.createGain();
  sub.connect(g);
  ug.connect(g);
  env(g.gain, { t0, a, peak: gain, t1, r });
  g.connect(M.low);
  return M.retire(end, g);
}

// Low tone for a label landing or the one big moment: sine on the note, a soft octave, a quick
// exponential decay. Tuned (D), mono, no noise burst.
export function low(ctx, M, rng, { t, note, vel = 1, dec = 1.6, octave = 0.35 }) {
  const f = hz(note);
  const end = t + dec * 1.3;
  const a = osc(ctx, 'sine', f, t, end, null);
  const b = osc(ctx, 'sine', f * 2, t, end, null);
  const bg = ctx.createGain();
  bg.gain.value = octave;
  const g = ctx.createGain();
  a.connect(g);
  b.connect(bg).connect(g);
  env(g.gain, { t0: t, a: 0.015, peak: 0.16 * vel, d: dec, sustain: 0 });
  g.connect(M.low);
  return M.retire(end, g);
}

// Warm felt dyad (the catch): triangle pair through a low low-pass.
export function felt(ctx, M, rng, { t, notes, vel = 1, dec = 1.6 }) {
  const end = t + dec * 1.3;
  const lp = lowpass(ctx, 1400, 0.7);
  lp.frequency.setValueAtTime(1400, t);
  lp.frequency.setTargetAtTime(500, t, 0.15);
  for (const n of notes) osc(ctx, 'triangle', hz(n), t, end, M.wow).connect(lp);
  const g = ctx.createGain();
  env(g.gain, { t0: t, a: 0.01, peak: 0.12 * vel, d: dec, sustain: 0 });
  lp.connect(g);
  g.connect(M.pad);
  const s = ctx.createGain();
  s.gain.value = 0.35;
  g.connect(s).connect(M.verb);
  return M.retire(end, g);
}

// Air: seeded noise, band-limited high, with slow wow on the level. Each side is 55% a shared
// bed and 45% its own, so it is wide but stays positively correlated (mono-safe).
export function air(ctx, M, rng, { t0, t1, level = 0.004 }) {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const bed = () => { const d = new Float32Array(len); let y = 0; for (let i = 0; i < len; i++) { y = 0.97 * y + (rng() * 2 - 1); d[i] = y * 0.12; } return d; };
  const shared = bed();
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch), own = bed();
    for (let i = 0; i < len; i++) d[i] = 0.78 * shared[i] + 0.63 * own[i];
    // loop seam: fade the ends into each other
    const fl = 2400;
    for (let i = 0; i < fl; i++) { const w = i / fl; d[i] = d[i] * w + d[len - fl + i] * (1 - w); }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.loopEnd = (len - 2400) / ctx.sampleRate;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 9000;
  const g = ctx.createGain();
  env(g.gain, { t0, a: 1.5, peak: level, t1, r: 2 });
  // wow multiplies the level by 1 +- 0.18 after the envelope, so it can never leave a step
  const wow = ctx.createGain();
  const w = ctx.createOscillator();
  w.frequency.value = 0.23;
  const wg = ctx.createGain();
  wg.gain.value = 0.18;
  w.connect(wg).connect(wow.gain);
  w.start(t0);
  w.stop(t1 + 2.6);
  src.connect(hp).connect(lp).connect(g).connect(wow).connect(M.air);
  src.start(t0);
  src.stop(t1 + 2.6);
}

// The bus for the score, and the finishing done on the rendered buffer.
//
// Chrome's DynamicsCompressorNode delays its output by a fixed 6 ms lookahead; the renderer
// renders that much extra and drops it from the front, so onsets stay on their frames.
export const LOOKAHEAD = 0.006;

// Graph: pads (carved at 300 Hz, erase filter, duck) / pulse / bells / readings -> music bus ->
// 24 dB/oct high-pass at 120 Hz; bass and low tones -> mono low bus (never high-passed, never
// reverbed); sends -> high-pass 200 Hz -> convolution reverb from a generated impulse
// (pre-delay, decorrelated L/R, darker tail); all -> glue compressor -> soft tape saturation ->
// master. After the offline render, finish() sets integrated loudness to -14 LUFS (BS.1770-4)
// and a true-peak limiter holds the peaks at -1.2 dBTP. Pure functions of the buffer: the same
// render always finishes the same way.
import { tanhCurve } from './synth.js';
import { mulberry32 } from '../engine/util.js';

export const TARGET_LUFS = -14;
export const CEILING_DBTP = -1.2; // 0.2 dB under the -1 dBTP rule for the encoder's margin

function biquad(ctx, type, f, q = 0.7071, gain = 0) {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  b.gain.value = gain;
  return b;
}

// Stereo impulse: sparse early reflections, then two independently seeded noise tails whose
// brightness falls with time (a one-pole low-pass that closes as the tail decays).
export function makeImpulse(ctx, { seed = 1978, len = 4.6, rt60 = 3.4, pre = 0.024 } = {}) {
  const sr = ctx.sampleRate, n = Math.floor(len * sr);
  const buf = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const r = mulberry32(seed + ch * 7919);
    const d = buf.getChannelData(ch);
    const p0 = Math.floor(pre * sr);
    // early reflections: 9 taps between 8 and 70 ms after the pre-delay
    for (let k = 0; k < 9; k++) {
      const at = p0 + Math.floor((0.008 + 0.062 * r()) * sr);
      d[at] += (r() < 0.5 ? -1 : 1) * (0.35 - 0.025 * k);
    }
    let y = 0;
    for (let i = p0; i < n; i++) {
      const tt = (i - p0) / sr;
      const decay = Math.exp((-6.9 * tt) / rt60);
      // cutoff falls from about 9 kHz to about 1.8 kHz along the tail
      const fc = 1800 + 7200 * Math.exp(-tt / 0.9);
      const a = Math.exp((-2 * Math.PI * fc) / sr);
      y = (1 - a) * (r() * 2 - 1) + a * y;
      // fade the first 12 ms in so the tail starts without a step
      const fin = Math.min(1, tt / 0.012);
      d[i] += y * decay * fin * 2.2;
    }
    // fade the last 60 ms to zero
    const fo = Math.floor(0.06 * sr);
    for (let i = 0; i < fo; i++) d[n - 1 - i] *= i / fo;
  }
  return buf;
}

export function makeMix(ctx) {
  const g = (v = 1) => { const x = ctx.createGain(); x.gain.value = v; return x; };
  const pre = g(1);
  // mono low end: split mid and side, high-pass the side at 200 Hz, recombine
  const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
  const mono1 = (v) => { const x = g(v); x.channelCount = 1; x.channelCountMode = 'explicit'; return x; };
  const mid = mono1(1), side = mono1(1), inv = g(-1);
  pre.connect(split);
  for (const [ch, m, sd] of [[0, 0.5, 0.5], [1, 0.5, -0.5]]) {
    split.connect(g(m), ch).connect(mid);
    split.connect(g(sd), ch).connect(side);
  }
  const sideHi = side.connect(biquad(ctx, 'highpass', 200)).connect(biquad(ctx, 'highpass', 200));
  mid.connect(merge, 0, 0); mid.connect(merge, 0, 1);
  sideHi.connect(merge, 0, 0); sideHi.connect(inv).connect(merge, 0, 1);
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -22;
  glue.knee.value = 10;
  glue.ratio.value = 2;
  glue.attack.value = 0.03;
  glue.release.value = 0.35;
  const sat = ctx.createWaveShaper();
  sat.curve = tanhCurve(1.1);
  sat.oversample = '4x';
  const drive = g(0.9), master = g(1);
  merge.connect(glue).connect(drive).connect(sat).connect(master).connect(ctx.destination);

  const music = g(1);
  music.connect(biquad(ctx, 'highpass', 120)).connect(biquad(ctx, 'highpass', 120)).connect(pre);

  // pads: carve 200-400 Hz, then the erase filter (labels chapter), then the duck
  const pad = g(1), padTone = biquad(ctx, 'lowpass', 18000, 0.5), padDuck = g(1);
  pad.connect(biquad(ctx, 'peaking', 300, 0.8, -4)).connect(padTone).connect(padDuck).connect(music);

  const arp = g(1); arp.connect(music);
  const bell = g(1); bell.connect(music);
  const read = g(1), readTone = biquad(ctx, 'lowpass', 16000, 0.5), readGain = g(1);
  read.connect(readTone).connect(readGain).connect(music);
  const air = g(1); air.connect(pre);

  // reverb: sends are high-passed at 200 Hz so the low end stays dry and mono
  const verb = g(1), verbOut = g(0.55);
  const conv = ctx.createConvolver();
  conv.normalize = true;
  conv.buffer = makeImpulse(ctx);
  verb.connect(biquad(ctx, 'highpass', 200)).connect(conv).connect(biquad(ctx, 'lowpass', 6000)).connect(verbOut).connect(pre);

  // low bus: summed to one channel, then upmixed equally to L and R
  const low = ctx.createGain();
  low.channelCount = 1;
  low.channelCountMode = 'explicit';
  low.channelInterpretation = 'speakers';
  low.connect(pre);

  return { ctx, pre, master, music, pad, padTone, padDuck, arp, bell, read, readTone, readGain, air, verb, low };
}

// Short exponential dip on a gain (a scheduled sidechain): down by db at t, back over rec.
export function duck(param, t, db = -2.5, rec = 0.45) {
  param.setTargetAtTime(10 ** (db / 20), t, 0.012);
  param.setTargetAtTime(1, t + 0.06, rec / 4);
}

// ---------- finishing (runs on the rendered Float32 channels) ----------

// BS.1770-4 K-weighting at 48 kHz, then 400 ms blocks with 75% overlap, gated at -70 LUFS
// absolute and -10 LU relative. Returns integrated loudness in LUFS.
export function integratedLoudness(chans, sr = 48000) {
  if (sr !== 48000) throw new Error('K-weighting coefficients here are for 48 kHz');
  const s1 = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] };
  const s2 = { b: [1.0, -2.0, 1.0], a: [-1.99004745483398, 0.99007225036621] };
  const n = chans[0].length, step = sr / 10, blk = step * 4;
  const nb = Math.max(0, Math.floor((n - blk) / step) + 1);
  const sums = new Float64Array(nb);
  for (const x of chans) {
    const sq = new Float64Array(Math.ceil(n / step));
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0, u1 = 0, u2 = 0, v1 = 0, v2 = 0;
    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const y = s1.b[0] * xi + s1.b[1] * x1 + s1.b[2] * x2 - s1.a[0] * y1 - s1.a[1] * y2;
      x2 = x1; x1 = xi; y2 = y1; y1 = y;
      const v = s2.b[0] * y + s2.b[1] * u1 + s2.b[2] * u2 - s2.a[0] * v1 - s2.a[1] * v2;
      u2 = u1; u1 = y; v2 = v1; v1 = v;
      sq[(i / step) | 0] += v * v;
    }
    for (let b = 0; b < nb; b++) sums[b] += (sq[b] + sq[b + 1] + sq[b + 2] + sq[b + 3]) / blk;
  }
  const L = (z) => -0.691 + 10 * Math.log10(z);
  const abs = [...sums].filter((z) => L(z) > -70);
  if (!abs.length) return -Infinity;
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((z) => L(z) > rel);
  return L(gated.reduce((a, b) => a + b, 0) / gated.length);
}

// 4x oversampled peak around sample i (windowed-sinc interpolation, 32 taps per phase).
const TAPS = 16;
const KERN = [0.25, 0.5, 0.75].map((f) => {
  const k = new Float64Array(2 * TAPS);
  for (let j = -TAPS + 1; j <= TAPS; j++) {
    const x = j - f; // distance from the fractional point to sample i + j
    const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / TAPS);
    k[j + TAPS - 1] = (Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)) * w;
  }
  return k;
});
function interPeak(x, i) {
  let m = Math.abs(x[i]);
  for (const k of KERN) {
    let s = 0;
    for (let j = -TAPS + 1; j <= TAPS; j++) { const q = i + j; if (q >= 0 && q < x.length) s += x[q] * k[j + TAPS - 1]; }
    m = Math.max(m, Math.abs(s));
  }
  return m;
}

export function truePeak(chans) {
  let m = 0;
  for (const x of chans) for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > m * 0.7) m = Math.max(m, interPeak(x, i));
  return m;
}

// Linked-stereo true-peak limiter: 5 ms lookahead (sliding minimum of the required gain, then
// a box average of the same length, which never exceeds the requirement), 80 ms release.
function limit(chans, sr, ceiling) {
  const n = chans[0].length, L = Math.round(0.005 * sr);
  const req = new Float32Array(n).fill(1);
  const thr = ceiling * 0.5;
  for (const x of chans) for (let i = 0; i < n; i++) {
    const a = Math.abs(x[i]);
    if (a < thr) continue;
    const p = interPeak(x, i);
    if (p > ceiling) req[i] = Math.min(req[i], ceiling / p);
  }
  // sliding minimum over [i, i + L]
  const gmin = new Float32Array(n), dq = new Int32Array(n);
  let h = 0, tl = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (tl > h && req[dq[tl - 1]] >= req[i]) tl--;
    dq[tl++] = i;
    while (dq[h] > i + L) h++;
    gmin[i] = req[dq[h]];
  }
  const rc = 1 - Math.exp(-1 / (0.08 * sr));
  let r = 1;
  for (let i = 0; i < n; i++) { r = Math.min(gmin[i], r + (1 - r) * rc); gmin[i] = r; }
  // causal box average over [i - L, i]; history before the start counts as unity gain
  const g = new Float32Array(n);
  let acc = L + 1;
  for (let i = 0; i < n; i++) {
    acc += gmin[i] - (i - L - 1 >= 0 ? gmin[i - L - 1] : 1);
    g[i] = acc / (L + 1);
  }
  for (const x of chans) for (let i = 0; i < n; i++) x[i] *= g[i];
  let minG = 1;
  for (let i = 0; i < n; i++) if (g[i] < minG) minG = g[i];
  return minG;
}

// Loudness to target, true peak under the ceiling. Two passes: limiting lowers the loudness a
// little, so the second pass re-gains and re-limits.
export function finish(chans, sr = 48000) {
  const ceil = 10 ** (CEILING_DBTP / 20);
  let gr = 1;
  for (let pass = 0; pass < 3; pass++) {
    const lufs = integratedLoudness(chans, sr);
    const gain = 10 ** ((TARGET_LUFS - lufs) / 20);
    if (Math.abs(TARGET_LUFS - lufs) < 0.05 && pass > 0) break;
    for (const x of chans) for (let i = 0; i < x.length; i++) x[i] *= gain;
    gr = limit(chans, sr, ceil);
  }
  return { lufs: integratedLoudness(chans, sr), truePeakDb: 20 * Math.log10(truePeak(chans)), maxReductionDb: 20 * Math.log10(gr) };
}

// 24-bit PCM stereo WAV.
export function encodeWav(chans, sr = 48000) {
  const n = chans[0].length, nc = chans.length, bps = 3;
  const out = new Uint8Array(44 + n * nc * bps);
  const dv = new DataView(out.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * nc * bps, true); str(8, 'WAVE');
  str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, nc, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * nc * bps, true); dv.setUint16(32, nc * bps, true); dv.setUint16(34, 24, true);
  str(36, 'data'); dv.setUint32(40, n * nc * bps, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const v = Math.max(-8388608, Math.min(8388607, Math.round(chans[c][i] * 8388607)));
    out[o++] = v & 255; out[o++] = (v >> 8) & 255; out[o++] = (v >> 16) & 255;
  }
  return out;
}

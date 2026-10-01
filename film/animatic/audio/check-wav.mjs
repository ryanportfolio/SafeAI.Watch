// Scripted checks for the rendered score (wow-animation references/score.md), run on the WAVs
// that render-wav.mjs writes. No agent can hear the result; these are the numbers.
//
// Usage (repo root): node film/animatic/audio/check-wav.mjs [--dir .tmp/film/audio] [--shots <dir>]
// Needs score.wav + cues.json (mix), score-hits.wav (hits stem), score-pads.wav (pads stem),
// score-floor.wav (floor stem: the chain with no notes),
// and ffmpeg on PATH for loudness, true peak and the spectrograms.
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DIR = resolve(ROOT, arg('dir', '.tmp/film/audio'));
const SHOTS = arg('shots', null);
const FRAME = 1 / 60;

function readWav(file) {
  const b = readFileSync(file);
  let o = 12, fmt = null, data = null;
  while (o < b.length) {
    const id = b.toString('ascii', o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) };
    if (id === 'data') data = [o + 8, size];
    o += 8 + size + (size % 2);
  }
  const { ch, sr, bits } = fmt, bps = bits / 8, n = data[1] / (ch * bps);
  const chans = Array.from({ length: ch }, () => new Float32Array(n));
  let p = data[0];
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++, p += bps) {
    let v = b[p] | (b[p + 1] << 8) | (b[p + 2] << 16);
    if (v & 0x800000) v |= ~0xffffff;
    chans[c][i] = v / 8388608;
  }
  return { sr, chans, n };
}

// 4th-order Butterworth low-pass (two cascaded biquads, Q 0.5412 and 1.3066)
function lowpass4(x, sr, fc) {
  let y = x;
  for (const Q of [0.5411961, 1.3065630]) {
    const w = (2 * Math.PI * fc) / sr, al = Math.sin(w) / (2 * Q), c = Math.cos(w), a0 = 1 + al;
    const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, b2 = b0, a1 = (-2 * c) / a0, a2 = (1 - al) / a0;
    const out = new Float32Array(y.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < y.length; i++) { const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = y[i]; y2 = y1; y1 = v; out[i] = v; }
    y = out;
  }
  return y;
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

function spectrum(x, sr, at, N = 8192) {
  const i0 = Math.round(at * sr), re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = (x[i0 + i] || 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  fft(re, im);
  const p = new Float64Array(N / 2);
  for (let k = 0; k < N / 2; k++) p[k] = re[k] * re[k] + im[k] * im[k];
  return p;
}

const corr = (a, b, i0, i1) => {
  let ab = 0, aa = 0, bb = 0;
  for (let i = i0; i < i1; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
  return aa > 0 && bb > 0 ? { r: ab / Math.sqrt(aa * bb), rms: Math.sqrt((aa + bb) / (2 * (i1 - i0))) } : { r: 1, rms: 0 };
};
const db = (v) => 20 * Math.log10(Math.max(v, 1e-12));
const f = (v, d = 2) => v.toFixed(d);
const results = [];
const report = (name, value, pass) => { results.push({ name, value, pass }); console.log(`${pass === null ? 'INFO' : pass ? 'PASS' : 'FAIL'}  ${name}: ${value}`); };

const cues = JSON.parse(readFileSync(join(DIR, 'cues.json'), 'utf8'));
const mix = readWav(join(DIR, 'score.wav'));
const { sr } = mix;
const [L, R] = mix.chans;
report('format', `${sr} Hz, ${mix.chans.length} ch, ${f(mix.n / sr, 3)} s`, sr === 48000 && mix.chans.length === 2);

// 1. loudness and true peak (ffmpeg ebur128)
const eb = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', join(DIR, 'score.wav'), '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
const sum = eb.stderr.slice(eb.stderr.lastIndexOf('Summary:'));
const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1]);
const TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum.slice(sum.indexOf('True peak')))?.[1]);
const LRA = Number(/LRA:\s+(-?[\d.]+) LU/.exec(sum)?.[1]);
report('integrated loudness (ffmpeg ebur128)', `${I} LUFS (target -14 +-1), LRA ${LRA} LU`, Math.abs(I + 14) <= 1);
report('true peak (ffmpeg ebur128 peak=true)', `${TP} dBTP (limit -1)`, TP <= -1);

// 2. onsets: every hit in the hits stem lands on its visual time or up to one frame after
if (existsSync(join(DIR, 'score-hits.wav'))) {
  const hs = readWav(join(DIR, 'score-hits.wav'));
  const env = new Float32Array(hs.n);
  const a = Math.exp(-1 / (0.0005 * sr));
  let y = 0;
  for (let i = 0; i < hs.n; i++) { y = Math.max(Math.abs(hs.chans[0][i]) + Math.abs(hs.chans[1][i]), y * a); env[i] = y; }
  const offs = [];
  for (const h of cues.hits) {
    const i = Math.round(h.t * sr);
    let base = 0;
    for (let k = i - Math.round(0.03 * sr); k < i - Math.round(0.002 * sr); k++) base = Math.max(base, env[k]);
    let peak = 0;
    for (let k = i; k < i + Math.round(0.12 * sr); k++) peak = Math.max(peak, env[k]);
    const thr = base + 0.1 * (peak - base);
    let on = null;
    for (let k = i - Math.round(0.05 * sr); k < i + Math.round(0.12 * sr); k++) if (env[k] > thr && env[k] > base * 1.5 + 1e-5) { on = k; break; }
    const off = on == null ? NaN : (on / sr - h.t) * 1000;
    offs.push({ t: h.t, what: h.what, off });
  }
  const bad = offs.filter((o) => !(o.off >= -0.5 && o.off <= FRAME * 1000));
  const vals = offs.map((o) => o.off);
  report('onsets vs visual hits (hits stem)', `${offs.length} hits, offset ${f(Math.min(...vals), 1)} to ${f(Math.max(...vals), 1)} ms after the picture (window 0 to ${f(FRAME * 1000, 1)} ms)`, bad.length === 0);
  for (const o of bad) console.log(`      ${f(o.t, 2)} s ${o.what}: ${f(o.off, 1)} ms`);
}

// 3. clicks: second-difference spikes far above their local context, outside the scheduled note
// onsets (score.md: "no sample-to-sample jump above a set threshold outside scheduled onsets").
// With no noise bed under the music, a bright attack stands far above its quiet context, so the
// first 40 ms of every scheduled note are attacks, not clicks; they are counted separately.
{
  let spikes = 0, worst = 0, maxJump = 0, atOnset = 0;
  const on = new Uint8Array(mix.n);
  for (const t of cues.onsets || []) for (let i = Math.max(0, Math.round((t - 0.002) * sr)); i < Math.min(mix.n, Math.round((t + 0.04) * sr)); i++) on[i] = 1;
  const W = Math.round(0.01 * sr);
  for (const x of [L, R]) {
    const d2 = new Float32Array(mix.n);
    for (let i = 2; i < mix.n; i++) d2[i] = x[i] - 2 * x[i - 1] + x[i - 2];
    let acc = 0;
    for (let i = 2; i < mix.n; i++) {
      acc += d2[i] * d2[i] - (i - W >= 2 ? d2[i - W] * d2[i - W] : 0);
      maxJump = Math.max(maxJump, Math.abs(x[i] - x[i - 1]));
      if (i < W + 2) continue;
      // local rms from the window before this sample (excluding it)
      const loc = Math.sqrt(Math.max(acc - d2[i] * d2[i], 0) / (W - 1));
      const ratio = Math.abs(d2[i]) / (loc + 1e-7);
      if (Math.abs(d2[i]) > 0.002 && ratio > 12) { if (on[i]) atOnset++; else { spikes++; worst = Math.max(worst, ratio); } }
    }
  }
  report('clicks (|2nd difference| > 12x its 10 ms context and > 0.002, outside note onsets)', `${spikes} spikes outside onsets (${atOnset} inside the first 40 ms of ${(cues.onsets || []).length} scheduled notes); largest sample-to-sample step ${f(maxJump, 4)} (${f(db(maxJump), 1)} dBFS)`, spikes === 0);
}

// 4. stereo: low end mono below 120 Hz (FFT cross-spectrum over the bins under 120 Hz, so no
// filter skirt lets higher content in), full band positive
{
  const N = 8192, kMax = Math.floor((120 * N) / sr), lo = [], full = [];
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  for (let s0 = 0; s0 + sr <= mix.n; s0 += sr) {
    let ab = 0, aa = 0, bb = 0;
    for (let i0 = s0; i0 + N <= s0 + sr + N / 2 && i0 + N <= mix.n; i0 += N / 2) {
      const lr = new Float64Array(N), li = new Float64Array(N), rr = new Float64Array(N), ri = new Float64Array(N);
      for (let i = 0; i < N; i++) { lr[i] = L[i0 + i] * win[i]; rr[i] = R[i0 + i] * win[i]; }
      fft(lr, li); fft(rr, ri);
      for (let k = 1; k <= kMax; k++) { ab += lr[k] * rr[k] + li[k] * ri[k]; aa += lr[k] ** 2 + li[k] ** 2; bb += rr[k] ** 2 + ri[k] ** 2; }
    }
    // only windows with real low end: band power within 40 dB of the loudest low band window
    lo.push({ r: aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 1, p: aa + bb, t: s0 / sr });
    full.push(corr(L, R, s0, s0 + sr).r);
  }
  const pMax = Math.max(...lo.map((w) => w.p));
  const low = lo.filter((w) => w.p > pMax * 1e-4);
  const worst = low.reduce((a, w) => (w.r < a.r ? w : a));
  const mean = (a) => a.reduce((p, q) => p + q, 0) / a.length;
  report('low-end correlation L/R below 120 Hz (FFT, 1 s windows within 40 dB of the loudest)', `min ${f(worst.r, 4)} at ${worst.t} s, mean ${f(mean(low.map((w) => w.r)), 4)} over ${low.length} s`, worst.r > 0.95);
  report('full-band correlation L/R', `min ${f(Math.min(...full), 3)}, mean ${f(mean(full), 3)}`, Math.min(...full) > 0);
}

// 5. bass share: energy below 150 Hz as a share of total
{
  const eLow = [L, R].map((x) => lowpass4(x, sr, 150)).reduce((s, x) => s + x.reduce((a, v) => a + v * v, 0), 0);
  const eAll = [L, R].reduce((s, x) => s + x.reduce((a, v) => a + v * v, 0), 0);
  report('bass share (energy below 150 Hz / total)', `${f((100 * eLow) / eAll, 1)}% (reference track not on disk: compare by ear)`, null);
  // band balance per chapter, for the spectrogram read
  const bands = [[20, 60], [60, 150], [150, 400], [400, 2000], [2000, 8000], [8000, 20000]];
  const secs = cues.sections || [];
  for (let c = 0; c < secs.length; c++) {
    const t0 = secs[c].start, t1 = secs[c + 1] ? secs[c + 1].start : mix.n / sr;
    const acc = bands.map(() => 0);
    for (let t = t0; t + 0.2 < t1; t += 0.25) {
      const p = spectrum(L, sr, t), q = spectrum(R, sr, t);
      bands.forEach(([a, b], j) => { for (let k = Math.ceil((a * 8192) / sr); k < (b * 8192) / sr; k++) acc[j] += p[k] + q[k]; });
    }
    const tot = acc.reduce((a, b) => a + b, 0);
    console.log(`      ${secs[c].title}: ${bands.map(([a, b], j) => `${a}-${b} Hz ${f((100 * acc[j]) / tot, 1)}%`).join(', ')}`);
  }
}

// 6. timbre moves: spectral centroid of each sustained pad over its length (pads stem)
if (existsSync(join(DIR, 'score-pads.wav'))) {
  const ps = readWav(join(DIR, 'score-pads.wav'));
  const rows = [];
  for (const p of cues.pads) {
    if (p.t1 - p.t0 < 3) continue;
    const cs = [];
    for (let t = p.t0 + 0.5; t + 0.2 < p.t1; t += 0.1) {
      const s = spectrum(ps.chans[0], sr, t, 4096);
      let num = 0, den = 0;
      for (let k = 1; k < s.length; k++) { num += k * s[k]; den += s[k]; }
      if (den > 0) cs.push((num / den) * (sr / 4096));
    }
    const lo = Math.min(...cs), hi = Math.max(...cs), mean = cs.reduce((a, b) => a + b, 0) / cs.length;
    rows.push({ id: p.id, lo, hi, move: (100 * (hi - lo)) / mean });
  }
  const least = rows.reduce((a, b) => (a.move < b.move ? a : b));
  report('pad spectral centroid moves (each pad >= 3 s)', `${rows.length} pads; smallest range ${f(least.move, 1)}% (${least.id}, ${f(least.lo, 0)}-${f(least.hi, 0)} Hz); median ${f(rows.map((r) => r.move).sort((a, b) => a - b)[rows.length >> 1], 1)}%`, least.move >= 10);
}

// 6b. noise floor: the chain with every note removed, read at the mix's make-up gain. The owner
// rejected the old noise bed (a waterfall under the captions); nothing may sound between notes.
const rms1s = (chs, n) => {
  const out = [];
  for (let s0 = 0; s0 + sr <= n; s0 += sr / 10) {
    let a = 0;
    for (const x of chs) for (let i = s0; i < s0 + sr; i++) a += x[i] * x[i];
    out.push({ t: s0 / sr, db: db(Math.sqrt(a / (chs.length * sr))) });
  }
  return out;
};
if (existsSync(join(DIR, 'score-floor.wav'))) {
  const fl = readWav(join(DIR, 'score-floor.wav'));
  const g = cues.report?.gainDb ?? 0;
  const loudest = Math.max(...rms1s(fl.chans, fl.n).map((w) => w.db)) + g;
  report('noise floor (floor stem, loudest 1 s window at mix gain)', `${loudest < -150 ? 'digital silence' : f(loudest, 1) + ' dBFS'} (limit -60)`, loudest <= -60);
}
{
  // the music's own quiet: 1 s windows inside the film (after the first 0.5 s, before the last 2 s)
  const body = rms1s([L, R], mix.n).filter((w) => w.t >= 0.5 && w.t + 1 <= mix.n / sr - 2).sort((a, b) => a.db - b.db);
  report('quietest 1 s windows inside the film (mix)', `${f(body[0].db, 1)} dBFS at ${f(body[0].t, 1)} s; 10th percentile ${f(body[Math.floor(body.length * 0.1)].db, 1)}, median ${f(body[body.length >> 1].db, 1)} dBFS`, null);
  // hiss band: the mix high-passed at 2 kHz, where the old noise bed sat
  const hp = (x) => { const y = new Float32Array(x.length); const c = Math.exp((-2 * Math.PI * 2000) / sr); let px = 0, py = 0; for (let i = 0; i < x.length; i++) { py = c * (py + x[i] - px); px = x[i]; y[i] = py; } return y; };
  const hb = rms1s([hp(L), hp(R)], mix.n).filter((w) => w.t >= 0.5 && w.t + 1 <= mix.n / sr - 2).map((w) => w.db).sort((a, b) => a - b);
  report('energy above 2 kHz (1 s windows inside the film)', `quietest ${f(hb[0], 1)}, median ${f(hb[hb.length >> 1], 1)} dBFS`, null);
}

// 7. the ending decays into silence rather than cutting
{
  let m = 0;
  for (let i = mix.n - Math.round(0.1 * sr); i < mix.n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
  report('last 100 ms peak (tail decays, no cut)', `${f(db(m), 1)} dBFS`, db(m) < -60);
}

// spectrograms, one per chapter plus the whole film
if (SHOTS) {
  mkdirSync(SHOTS, { recursive: true });
  const secs = [...(cues.sections || []).map((c, i, a) => [c.title, c.start, a[i + 1] ? a[i + 1].start : mix.n / sr]), ['full', 0, mix.n / sr]];
  secs.forEach(([title, t0, t1], i) => {
    const name = `${i < secs.length - 1 ? `c${i + 1}-` : ''}${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    const out = join(SHOTS, name);
    spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(t0), '-t', String(t1 - t0), '-i', join(DIR, 'score.wav'),
      '-lavfi', 'showspectrumpic=s=1600x640:mode=combined:scale=log:fscale=log:legend=1:drange=90:start=30:stop=16000', out]);
    console.log(`      spectrogram ${out}`);
  });
}

const failed = results.filter((r) => r.pass === false);
console.log(failed.length ? `${failed.length} check(s) failed` : 'all scripted checks pass');
process.exitCode = failed.length ? 1 : 0;

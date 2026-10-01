#!/usr/bin/env node
// Checks on the exported film (motion-design verify-export.md, wow-animation score.md), run on the
// files export-video.mjs writes. Needs its lossless segments and reference stills in --tmp.
//
// Usage (repo root):
//   node scripts/film/check-export.mjs [--dir D:/videos/SafeAI.Watch] [--name safeai-watch-film-animatic-draft]
//     [--tmp .tmp/film/export] [--clean]
// --clean deletes the lossless segments once every check passes. ffmpeg and ffprobe: FFMPEG /
// FFPROBE env vars, else on PATH.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const FFMPEG = process.env.FFMPEG || 'ffmpeg', FFPROBE = process.env.FFPROBE || 'ffprobe';
const DIR = resolve(ROOT, arg('dir', 'D:/videos/SafeAI.Watch'));
const NAME = arg('name', 'safeai-watch-film-animatic-draft');
const TMP = resolve(ROOT, arg('tmp', '.tmp/film/export'));
const SOUND = join(DIR, `${NAME}-with-sound.mp4`), SILENT = join(DIR, `${NAME}-silent.mp4`);
const EXP = JSON.parse(readFileSync(join(TMP, 'export.json'), 'utf8'));
const FPS = EXP.fps, FRAMES = EXP.frames, DUR = EXP.duration, W = 1920, H = 1080, FR = 1 / FPS;
// the score the exporter muxed (export.json records it) and the cue metadata render-wav.mjs wrote
// beside it
const WAV = resolve(ROOT, EXP.wav || '.tmp/film/audio/score.wav');
const cues = JSON.parse(readFileSync(join(dirname(WAV), 'cues.json'), 'utf8'));

const results = [];
const report = (name, value, pass) => { results.push(pass); console.log(`${pass === null ? 'INFO' : pass ? 'PASS' : 'FAIL'}  ${name}: ${value}`); };
const sh = (bin, args, enc = 'utf8') => {
  const r = spawnSync(bin, args, { encoding: enc, maxBuffer: 2 ** 31 - 1 });
  if (r.status !== 0) throw new Error(`${bin} ${args.join(' ')}\n${r.stderr}`);
  return r;
};
const probe = (file, args) => JSON.parse(sh(FFPROBE, ['-v', 'error', '-of', 'json', ...args, file]).stdout);
const f2 = (v, d = 2) => Number(v).toFixed(d);

// ---------- streams, duration, tags ----------
const P = probe(SOUND, ['-show_streams', '-show_format']);
const v = P.streams.find((s) => s.codec_type === 'video'), a = P.streams.find((s) => s.codec_type === 'audio');
report('streams (with sound)', `video ${v?.codec_name} ${v?.profile} ${v?.width}x${v?.height} ${v?.r_frame_rate} ${v?.pix_fmt}; audio ${a?.codec_name} ${a?.sample_rate} Hz ${a?.channels} ch ${Math.round(a?.bit_rate / 1000)} kb/s`,
  v?.codec_name === 'h264' && v.width === W && v.height === H && v.pix_fmt === 'yuv420p' && v.r_frame_rate === `${FPS}/1` && a?.codec_name === 'aac' && a.sample_rate === '48000' && a.channels === 2);
report('colour tags', `primaries ${v.color_primaries}, matrix ${v.color_space}, transfer ${v.color_transfer}, range ${v.color_range}`,
  v.color_primaries === 'bt709' && v.color_space === 'bt709' && v.color_transfer === 'iec61966-2-1' && v.color_range === 'tv');
const vDur = Number(v.duration), aDur = Number(a.duration), fDur = Number(P.format.duration);
report('duration matches the film', `film ${DUR} s; video ${f2(vDur, 3)} s, audio ${f2(aDur, 3)} s, container ${f2(fDur, 3)} s`,
  Math.abs(vDur - DUR) <= FR / 2 && Math.abs(aDur - DUR) <= 0.025 && Math.abs(fDur - DUR) <= 0.025);
const fast = readFileSync(SOUND).subarray(0, 64 * 1024).toString('latin1');
report('faststart (moov before mdat)', `moov at ${fast.indexOf('moov')}, mdat at ${fast.indexOf('mdat')}`, fast.indexOf('moov') >= 0 && (fast.indexOf('mdat') < 0 || fast.indexOf('moov') < fast.indexOf('mdat')));
const pkt = probe(SOUND, ['-select_streams', 'a:0', '-read_intervals', '%+#2', '-show_packets', '-show_data_hash', 'md5', '-show_entries', 'packet=pts_time,side_data_list', '-show_entries', 'stream=start_time']);
const skip = JSON.stringify(pkt.packets?.[0]?.side_data_list || []);
report('AAC priming handled (first packet skip_samples or edit list)', `first audio packet side data ${skip.slice(0, 120)}; stream start ${a.start_time} s`, /skip_samples/.test(skip) || Number(a.start_time) <= 0);

const S = probe(SILENT, ['-show_streams', '-show_format']);
const sv = S.streams.filter((s) => s.codec_type === 'video'), sa = S.streams.filter((s) => s.codec_type === 'audio');
report('silent version', `${sv.length} video, ${sa.length} audio streams; ${f2(S.format.duration, 3)} s`, sv.length === 1 && sa.length === 0 && Math.abs(Number(S.format.duration) - DUR) <= FR / 2);

// ---------- frames: count, timing, no drop or duplicate ----------
const pts = probe(SOUND, ['-select_streams', 'v:0', '-show_entries', 'packet=pts', '-show_entries', 'stream=time_base']).packets.map((p) => Number(p.pts)).sort((x, y) => x - y);
const tb = v.time_base.split('/').map(Number), step = Math.round(tb[1] / tb[0] / FPS);
const bad = pts.filter((p, i) => i > 0 && p - pts[i - 1] !== step).length;
report('frame count and timestamps', `${pts.length} frames (expected ${FRAMES}), ${bad} irregular steps (each must be exactly 1/${FPS} s)`, pts.length === FRAMES && bad === 0);
const silentHash = (f) => sh(FFMPEG, ['-v', 'error', '-i', f, '-map', '0:v:0', '-c', 'copy', '-f', 'md5', '-']).stdout.trim();
const sameVideo = silentHash(SOUND) === silentHash(SILENT);
report('silent video stream identical to the sound version', sameVideo ? 'byte-identical packets' : 'packets differ', sameVideo);

// lossless segments: the browser's frames, in order. segments.txt lists this export's segments;
// stale seg-*.mkv files left by an earlier run with more workers are not part of it
const segs = readFileSync(join(TMP, 'segments.txt'), 'utf8').split(/\r?\n/).map((l) => /^file '(.+)'$/.exec(l.trim())?.[1]).filter(Boolean);
const segCounts = segs.map((n) => Number(probe(join(TMP, n), ['-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets']).streams[0].nb_read_packets));
report('lossless intermediate', `${segs.length} FFV1 segments, ${segCounts.reduce((x, y) => x + y, 0)} frames (${segCounts.join(' + ')})`, segCounts.reduce((x, y) => x + y, 0) === FRAMES);

// decode chosen frames to RGB (BT.709 limited -> full) in one pass per file
const toRGB = 'scale=in_color_matrix=bt709:in_range=tv:out_range=pc:flags=accurate_rnd+full_chroma_int,format=rgb24';
function frames(input, list, { concat = false, yuv = true } = {}) {
  const sel = [...new Set(list)].sort((x, y) => x - y);
  const expr = sel.map((n) => `eq(n\\,${n})`).join('+');
  const r = sh(FFMPEG, ['-v', 'error', ...(concat ? ['-f', 'concat', '-safe', '0'] : []), '-i', input, '-map', '0:v:0', '-vf', `select='${expr}',${yuv ? toRGB : 'format=rgb24'}`, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'], 'buffer');
  const out = new Map();
  sel.forEach((n, i) => out.set(n, r.stdout.subarray(i * W * H * 3, (i + 1) * W * H * 3)));
  if (r.stdout.length !== sel.length * W * H * 3) throw new Error(`decoded ${r.stdout.length / (W * H * 3)} of ${sel.length} frames from ${input}`);
  return out;
}
const pngRGB = (file) => sh(FFMPEG, ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], 'buffer').stdout;
const mad = (x, y) => { let s = 0; for (let i = 0; i < x.length; i += 3) s += Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]); return s / x.length; };

const ALIGN = [2.0, 40.0, 76.5, 120.0, 139.5].map((t) => Math.round(t * FPS));
const REFS = EXP.refTimes.map((t) => ({ t, n: Math.round(t * FPS) }));
const CUES = [
  { name: 'question caption (motif A4)', t: cues.hits.find((h) => /stated/.test(h.what)).t, box: [100, 790, 1000, 110], test: 'diff' },
  { name: 'Hold both at once (low D, full chord)', t: cues.hits.find((h) => /big moment/.test(h.what)).t, box: [100, 790, 700, 110], test: 'diff' },
  { name: 'orange marker lands (motif resolves)', t: cues.hits.find((h) => /resolved/.test(h.what)).t, box: [930, 270, 60, 60], test: 'orange' },
];
const cueFrames = CUES.flatMap((c) => { const n = Math.round(c.t * FPS); return Array.from({ length: 13 }, (_, i) => n - 6 + i); });
const mp4 = frames(SOUND, [...ALIGN, ...REFS.map((r) => r.n), ...cueFrames]);
const lossless = frames(join(TMP, 'segments.txt'), [...ALIGN.flatMap((n) => [n - 1, n, n + 1]), ...REFS.map((r) => r.n)], { concat: true, yuv: false });

const aligned = ALIGN.map((n) => { const d = [n - 1, n, n + 1].map((k) => mad(mp4.get(n), lossless.get(k))); return { n, d, ok: d[1] < d[0] && d[1] < d[2] }; });
report('no dropped or duplicated frames (mp4 frame n is closest to browser frame n, not n-1 or n+1)',
  aligned.map((x) => `${f2(x.n / FPS, 1)} s: ${x.d.map((d) => f2(d, 2)).join('/')}`).join('; '), aligned.every((x) => x.ok));

// ---------- colour: browser render vs export ----------
const BRAND = { orange: [255, 119, 51], amber: [229, 167, 0], cream: [244, 244, 231] };
for (const r of REFS) {
  const ref = pngRGB(join(TMP, `ref-t${r.t}.png`));
  const exact = mad(ref, lossless.get(r.n)) === 0;
  const m = mp4.get(r.n);
  const rows = [];
  for (const [name, c] of Object.entries(BRAND)) {
    let n = 0; const err = [0, 0, 0];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      let solid = true;
      for (let dy = -1; dy <= 1 && solid; dy++) for (let dx = -1; dx <= 1 && solid; dx++) {
        const i = ((y + dy) * W + x + dx) * 3;
        if (Math.abs(ref[i] - c[0]) + Math.abs(ref[i + 1] - c[1]) + Math.abs(ref[i + 2] - c[2]) > 12) solid = false;
      }
      if (!solid) continue;
      const i = (y * W + x) * 3;
      for (let k = 0; k < 3; k++) err[k] += Math.abs(m[i + k] - ref[i + k]);
      n++;
    }
    // judge a brand colour only where it covers enough solid pixels: a 2 px feature is all edge,
    // and 4:2:0 chroma halves its colour resolution (reported, not judged)
    if (n) rows.push(`${name} ${n} px${n < 20 ? ' (too few to judge)' : ''}, mean |error| ${err.map((e) => f2(e / n, 1)).join('/')}`);
    r[name] = n >= 20 ? Math.max(...err.map((e) => e / n)) : null;
  }
  const whole = mad(ref, m);
  report(`colour at ${r.t} s (browser PNG vs mp4)`, `intermediate ${exact ? 'pixel-exact' : 'DIFFERS'}; whole-frame mean |error| ${f2(whole, 2)} per channel; ${rows.join('; ') || 'no solid brand pixels'}`,
    exact && whole < 2 && Object.keys(BRAND).every((k) => r[k] == null || r[k] <= 4));
}

// ---------- audio: loudness and true peak of the muxed stream ----------
const eb = sh(FFMPEG, ['-hide_banner', '-nostats', '-i', SOUND, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr;
const sum = eb.slice(eb.lastIndexOf('Summary:'));
const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1]), TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum.slice(sum.indexOf('True peak')))?.[1]);
report('muxed audio loudness', `${I} LUFS (target -14 +-1)`, Math.abs(I + 14) <= 1);
report('muxed audio true peak', `${TP} dBTP (limit -1)`, TP <= -1);

// ---------- A/V sync: first frame showing the cue vs the audio onset in the mp4 ----------
const pcm = (file) => { const b = sh(FFMPEG, ['-v', 'error', '-i', file, '-map', '0:a:0', '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'], 'buffer').stdout; return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
function onset(x, t, sr = 48000) {
  // the hits-stem method from check-wav.mjs, on the full mix: envelope rise above its 30 ms context
  const i0 = Math.round((t - 0.08) * sr), i1 = Math.round((t + 0.15) * sr), a = Math.exp(-1 / (0.0005 * sr));
  const env = new Float32Array(i1 - i0); let y = 0;
  for (let i = i0 - 2400; i < i1; i++) { y = Math.max(Math.abs(x[2 * i]) + Math.abs(x[2 * i + 1]), y * a); if (i >= i0) env[i - i0] = y; }
  const k0 = Math.round((t - i0 / sr) * sr);
  let base = 0; for (let k = k0 - Math.round(0.03 * sr); k < k0 - Math.round(0.002 * sr); k++) base = Math.max(base, env[k]);
  let peak = 0; for (let k = k0; k < k0 + Math.round(0.12 * sr); k++) peak = Math.max(peak, env[k]);
  const thr = base + 0.1 * (peak - base);
  for (let k = k0 - Math.round(0.05 * sr); k < env.length; k++) if (env[k] > thr && env[k] > base * 1.2) return (i0 + k) / sr;
  return NaN;
}
const mixMp4 = pcm(SOUND);
// lag of the mp4's audio against the rendered WAV around t, by cross-correlation (+ = mp4 later)
function lag(x, y, t, sr = 48000, max = 2400) {
  const i0 = Math.round((t - 0.3) * sr), n = Math.round(0.8 * sr);
  let best = 0, bv = -Infinity;
  for (let L = -max; L <= max; L++) {
    let acc = 0;
    for (let i = i0; i < i0 + n; i += 2) acc += x[2 * (i + L)] * y[2 * i] + x[2 * (i + L) + 1] * y[2 * i + 1];
    if (acc > bv) { bv = acc; best = L; }
  }
  return best / sr;
}
const wav = pcm(WAV);
for (const c of CUES) {
  const n0 = Math.round(c.t * FPS), [bx, by, bw, bh] = c.box;
  const ref = mp4.get(n0 - 6);
  let first = null;
  for (let n = n0 - 5; n <= n0 + 6 && first == null; n++) {
    const f = mp4.get(n); let hits = 0;
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
      const i = (y * W + x) * 3;
      if (c.test === 'orange') { if (f[i] > 180 && f[i] - f[i + 2] > 100 && f[i + 1] > 60 && f[i + 1] < 170) hits++; }
      else if (Math.abs(f[i] - ref[i]) + Math.abs(f[i + 1] - ref[i + 1]) + Math.abs(f[i + 2] - ref[i + 2]) > 30) hits++;
    }
    if (hits >= (c.test === 'orange' ? 3 : 30)) first = n;
  }
  // the onset is read on the WAV (AAC pre-echo smears energy up to a block ahead of a transient,
  // which an onset threshold reads as an early start); the mp4's audio is placed against the WAV
  // by cross-correlation
  const tv = first / FPS, tw = onset(wav, c.t), lg = lag(mixMp4, wav, c.t), ta = tw + lg;
  const off = (ta - tv) * 1000;
  report(`A/V sync: ${c.name}`, `cue ${f2(c.t, 3)} s; first frame showing it ${first} (${f2(tv, 4)} s); audio onset ${f2(ta, 4)} s (WAV onset ${f2(tw, 4)} s, mp4 audio vs WAV ${f2(lg * 1000, 2)} ms); audio - picture ${f2(off, 1)} ms`,
    Number.isFinite(off) && Math.abs(off) <= FR * 1000 && Math.abs(lg) <= 0.001);
}

const failed = results.filter((x) => x === false).length;
console.log(failed ? `${failed} check(s) failed` : 'all export checks pass');
if (!failed && process.argv.includes('--clean')) {
  for (const n of readdirSync(TMP)) if (/^seg-\d+\.mkv$/.test(n)) rmSync(join(TMP, n));
  console.log(`deleted the lossless segments in ${TMP}`);
}
process.exitCode = failed ? 1 : 0;

#!/usr/bin/env node
// Frame-stepped video export of the film animatic (motion-design verify-export.md): every frame
// is rendered through window.__anim.seek(f / fps) in headed Chrome (parked offscreen, real GPU),
// read back from the canvas as lossless PNG, and piped into ffmpeg as a lossless FFV1
// intermediate. Several pages render contiguous segments in parallel; frame(t) is a pure function
// of t, so any page can render any frame. The segments are then encoded once to H.264 (yuv420p,
// BT.709, +faststart) with the score muxed as AAC 48 kHz, and the silent version is a stream copy
// of the same video.
//
// Usage (repo root, server running: node film/animatic/serve.mjs; score rendered:
// node film/animatic/audio/render-wav.mjs):
//   node scripts/film/export-video.mjs [--fps 60] [--workers 6] [--crf 17]
//     [--out-dir D:/videos/SafeAI.Watch] [--name safeai-watch-film-animatic-draft]
//     [--wav .tmp/film/audio/score.wav] [--tmp .tmp/film/export] [--encode-only]
// Writes <name>-with-sound.mp4 and <name>-silent.mp4, plus two browser reference stills in --tmp
// for check-export.mjs (which deletes the segments with --clean once the checks pass). --encode-only
// takes the fps from the capture's export.json and records the --wav it muxes there. ffmpeg: FFMPEG env var, else ffmpeg on PATH.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchPlacedChrome } from '../lib/launch-chrome.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const REUSE = process.argv.includes('--encode-only'); // re-encode from the segments already in --tmp
const TMP = resolve(ROOT, arg('tmp', '.tmp/film/export'));
// --encode-only reuses a capture: its fps comes from the capture's export.json, and an explicit
// --fps must agree with it (the segments hold frames at that rate)
const PREV = REUSE ? JSON.parse(readFileSync(join(TMP, 'export.json'), 'utf8')) : null;
if (REUSE && arg('fps') !== undefined && Number(arg('fps')) !== PREV.fps) throw new Error(`--fps ${arg('fps')} differs from the capture's ${PREV.fps} fps in ${join(TMP, 'export.json')}`);
const FPS = REUSE ? PREV.fps : Number(arg('fps', 60));
const WORKERS = Number(arg('workers', 6));
const CRF = arg('crf', '17');
const OUT_DIR = resolve(ROOT, arg('out-dir', 'D:/videos/SafeAI.Watch'));
const NAME = arg('name', 'safeai-watch-film-animatic-draft');
const WAV = resolve(ROOT, arg('wav', '.tmp/film/audio/score.wav'));
const BASE = arg('url', `http://localhost:${process.env.PORT || 4329}`);
const REF_TIMES = [58.6, 141.5]; // browser stills kept for the colour check
if (!existsSync(WAV)) throw new Error(`no score at ${WAV}: run node film/animatic/audio/render-wav.mjs`);
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const run = (args) => {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
};

const browser = REUSE ? null : await launchPlacedChrome({ place: 'offscreen', channel: 'chrome' });
const t0 = Date.now();
let total;
if (!REUSE) try {
  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    page.on('pageerror', (e) => { throw e; });
    await page.goto(`${BASE}/film/animatic/?t=0`);
    await page.waitForFunction(() => window.__anim?.ready, null, { timeout: 30000 });
    await page.evaluate(() => window.__anim.pause());
    return page;
  };
  const first = await open();
  const duration = await first.evaluate(() => window.__anim.duration);
  total = Math.round(duration * FPS);
  const per = Math.ceil(total / WORKERS);
  const segs = Array.from({ length: WORKERS }, (_, i) => [i * per, Math.min(total, (i + 1) * per)]).filter(([a, b]) => b > a);
  console.log(`${duration} s at ${FPS} fps: ${total} frames, ${segs.length} workers`);
  const pages = [first, ...(await Promise.all(segs.slice(1).map(open)))];
  const grab = (page, t) => page.evaluate((x) => { window.__anim.seek(x); return document.getElementById('film').toDataURL('image/png').split(',')[1]; }, t);

  for (const t of REF_TIMES) writeFileSync(join(TMP, `ref-t${t}.png`), Buffer.from(await grab(first, t), 'base64'));

  let done = 0;
  await Promise.all(segs.map(async ([a, b], i) => {
    const file = join(TMP, `seg-${String(i).padStart(2, '0')}.mkv`);
    const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'bgr0', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise((ok, fail) => ff.on('close', (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg segment ${i} exited ${c}`)))));
    for (let f = a; f < b; f++) {
      const buf = Buffer.from(await grab(pages[i], f / FPS), 'base64');
      if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once('drain', ok));
      if (++done % 600 === 0) console.log(`  ${done}/${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end();
    await closed;
  }));
  writeFileSync(join(TMP, 'segments.txt'), segs.map((_, i) => `file 'seg-${String(i).padStart(2, '0')}.mkv'`).join('\n') + '\n');
  writeFileSync(join(TMP, 'export.json'), JSON.stringify({ fps: FPS, frames: total, duration, refTimes: REF_TIMES, wav: WAV }, null, 1));
} finally {
  await browser.close();
}
else {
  // the encode below muxes WAV; record it so check-export.mjs reads the same score and cues
  writeFileSync(join(TMP, 'export.json'), JSON.stringify({ ...PREV, wav: WAV }, null, 1));
  console.log(`--encode-only: reusing the segments captured at ${FPS} fps`);
}
console.log(`captured in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// One H.264 encode from the lossless segments. RGB -> BT.709 limited range set explicitly;
// tags BT.709 primaries and matrix with the sRGB transfer (verify-export.md, colour tags).
const withSound = join(OUT_DIR, `${NAME}-with-sound.mp4`);
const silent = join(OUT_DIR, `${NAME}-silent.mp4`);
run(['-f', 'concat', '-safe', '0', '-i', join(TMP, 'segments.txt'), '-i', WAV, '-map', '0:v:0', '-map', '1:a:0',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-g', String(FPS / 2), '-bf', '2', '-x264-params', 'aq-mode=3',
  '-color_primaries', 'bt709', '-colorspace', 'bt709', '-color_trc', 'iec61966-2-1', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', withSound]);
run(['-i', withSound, '-map', '0:v:0', '-c', 'copy', '-movflags', '+faststart', silent]);
for (const f of [withSound, silent]) console.log(`${f}: ${(statSync(f).size / 1e6).toFixed(1)} MB`);
console.log('lossless segments stay in ' + TMP + ' until check-export.mjs --clean');

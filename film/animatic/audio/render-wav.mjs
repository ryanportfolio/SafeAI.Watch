// Render the film's score to a 48 kHz stereo 24-bit WAV, with the same code and the same
// OfflineAudioContext render the animatic plays, so preview, checks and the video export share
// one buffer. Runs the render in headed Chrome (parked offscreen) against the animatic server.
//
// Usage (repo root, server running: node film/animatic/serve.mjs):
//   node film/animatic/audio/render-wav.mjs [--stem mix|hits|pads|floor] [--out <file.wav>]
// Default out: .tmp/film/audio/score.wav (stems: score-<stem>.wav). Also writes cues.json
// (hit times, pad segments, loudness report) next to it. Needs playwright or playwright-core.
import { mkdirSync, writeFileSync, openSync, writeSync, closeSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchPlacedChrome } from '../../../scripts/lib/launch-chrome.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const stem = arg('stem', 'mix');
const base = arg('url', `http://localhost:${process.env.PORT || 4329}`);
const out = resolve(ROOT, arg('out', `.tmp/film/audio/${stem === 'mix' ? 'score' : `score-${stem}`}.wav`));
mkdirSync(dirname(out), { recursive: true });

const browser = await launchPlacedChrome({ place: 'offscreen' });
try {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  await page.goto(`${base}/film/beats.json`);
  const t0 = Date.now();
  const info = await page.evaluate(async (stemName) => {
    const { renderFilmAudio } = await import('/film/animatic/audio/score.js');
    const { encodeWav } = await import('/film/animatic/audio/mix.js');
    const data = await fetch('/film/beats.json', { cache: 'no-store' }).then((r) => r.json());
    const r = await renderFilmAudio(data, { stem: stemName });
    const b = r.buffer;
    window.__wav = encodeWav([b.getChannelData(0), b.getChannelData(1)], b.sampleRate);
    return { bytes: window.__wav.length, sampleRate: b.sampleRate, channels: b.numberOfChannels, seconds: b.duration, hits: r.hits, pads: r.pads, onsets: r.onsets, sections: data.chapters, report: r.report };
  }, stem);
  const fd = openSync(out, 'w');
  const CHUNK = 3 * 1024 * 1024;
  for (let o = 0; o < info.bytes; o += CHUNK) {
    const b64 = await page.evaluate(([o, n]) => {
      const a = window.__wav.subarray(o, o + n);
      let s = '';
      for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
      return btoa(s);
    }, [o, CHUNK]);
    writeSync(fd, Buffer.from(b64, 'base64'));
  }
  closeSync(fd);
  const { bytes, ...meta } = info;
  writeFileSync(resolve(dirname(out), stem === 'mix' ? 'cues.json' : `cues-${stem}.json`), JSON.stringify({ stem, renderedMs: Date.now() - t0, ...meta }, null, 1));
  console.log(`${out}: ${meta.seconds.toFixed(3)} s, ${meta.sampleRate} Hz, ${meta.channels} ch, 24-bit, ${(bytes / 1e6).toFixed(1)} MB, render ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (meta.report) console.log(`finish: ${meta.report.lufs.toFixed(2)} LUFS, ${meta.report.truePeakDb.toFixed(2)} dBTP (4x), limiter max ${meta.report.maxReductionDb.toFixed(2)} dB`);
} finally {
  await browser.close();
}

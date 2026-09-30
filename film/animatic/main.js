// Animatic shell: loads beats.json and the site's fonts, then drives frame(t) from a transport.
// Only this file touches the clock; the film itself is engine/film.js.
import { createFilm } from './engine/film.js';
import { FONTS } from './engine/captions.js';
import { qt, clamp } from './engine/util.js';

const q = new URLSearchParams(location.search);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || q.has('rm');

// The site's font files (K19, K20, K21): fontsource packages plus the committed italic subset.
const FONT_FILES = [
  [FONTS.serif, '../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2', { style: 'normal', weight: '200 800' }],
  [FONTS.serif, '../../src/assets/fonts/newsreader-italic-subset.woff2', { style: 'italic', weight: '400' }],
  [FONTS.sans, '../../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', { style: 'normal', weight: '100 900' }],
  [FONTS.mono, '../../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2', { style: 'normal', weight: '100 900' }],
];

async function loadFonts() {
  const faces = await Promise.all(FONT_FILES.map(async ([family, url, desc]) => {
    const f = new FontFace(family, `url(${new URL(url, import.meta.url)})`, desc);
    await f.load();
    document.fonts.add(f);
    return f;
  }));
  await document.fonts.ready;
  return faces;
}

const $ = (id) => document.getElementById(id);
const canvas = $('film'), stage = $('stage'), wrap = $('wrap'), range = $('range'), playBtn = $('play'), timeEl = $('time'), status = $('status');

function layout() {
  const r = wrap.getBoundingClientRect();
  const w = Math.floor(Math.min(r.width, (r.height * 16) / 9));
  stage.style.width = `${w}px`;
  stage.style.height = `${Math.floor((w * 9) / 16)}px`;
}

async function main() {
  layout();
  addEventListener('resize', layout);
  const [data] = await Promise.all([fetch('../beats.json', { cache: 'no-store' }).then((r) => r.json()), loadFonts()]);
  const film = createFilm(data, { canvas, reducedMotion: RM });
  const D = film.duration;

  for (const c of film.chapters) {
    const tick = document.createElement('div');
    tick.className = 'tick';
    tick.style.left = `${(c.start / D) * 100}%`;
    tick.innerHTML = `<span></span>`;
    tick.firstChild.textContent = c.title;
    $('scrub').appendChild(tick);
  }

  let t = qt(clamp(parseFloat(q.get('t') ?? '0') || 0, 0, D));
  let playing = q.has('play');
  let last = performance.now();
  let dirty = true;
  const chapterAt = (x) => film.chapters.filter((c) => c.start <= x).at(-1)?.title ?? '';
  const beatAt = (x) => film.beats.filter((b) => b.start <= x).at(-1)?.id ?? '';

  function render() {
    film.frame(t);
    timeEl.textContent = `${t.toFixed(1)} / ${D.toFixed(1)}`;
    status.textContent = `${beatAt(t)} · ${chapterAt(t)}${RM ? ' · reduced motion' : ''}`;
    if (document.activeElement !== range) range.value = String(Math.round((t / D) * 100000));
    dirty = false;
  }
  const seek = (x) => { t = qt(clamp(x, 0, D)); dirty = true; };
  const setPlaying = (p) => { playing = p; playBtn.textContent = playing ? 'Pause' : 'Play'; last = performance.now(); if (playing && t >= D) seek(0); };

  range.addEventListener('input', () => seek((range.value / 100000) * D));
  playBtn.addEventListener('click', () => setPlaying(!playing));
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight') seek(t + 1);
    else if (e.key === 'ArrowLeft') seek(t - 1);
    else if (e.key === ']') { const n = film.chapters.find((c) => c.start > t + 0.01); if (n) seek(n.start); }
    else if (e.key === '[') { const p = film.chapters.filter((c) => c.start < t - 0.3).at(-1); seek(p ? p.start : 0); }
  });

  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      t = qt(t + dt);
      if (t >= D) { t = D; setPlaying(false); }
      dirty = true;
    }
    if (dirty) render();
    requestAnimationFrame(loop);
  }
  setPlaying(playing);
  render();
  requestAnimationFrame(loop);

  window.__anim = {
    seek(x) { seek(x); render(); },
    pause() { setPlaying(false); },
    play() { setPlaying(true); },
    get t() { return t; },
    get playing() { return playing; },
    duration: D,
    beats: film.beats,
    reducedMotion: RM,
    ready: true,
  };
}

main().catch((err) => { status.textContent = `error: ${err.message}`; console.error(err); });

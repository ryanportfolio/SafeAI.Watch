// About page player for the silent film. The film is engine/film.js, a pure frame(t) over
// film/beats.json; this file owns the clock, the controls and the page lifecycle. No audio.
//
// Cost rules: requestAnimationFrame runs only while the film plays and is on screen. A paused,
// offscreen or hidden-tab film schedules nothing; seeks and resizes paint one frame.
import data from '../../../film/beats.json';
import { createFilm } from './engine/film.js';
import { qt, clamp } from './engine/util.js';

// The site's own font families (BaseLayout and global.css register them); the film measures
// and draws with these faces, so no font file is fetched twice.
const FONTS = { serif: 'Newsreader Variable', sans: 'Geist Variable', mono: 'Geist Mono Variable' };
const POSTER_T = 4.6; // the opening question over the blank chart
const EXIT = 0.45; // caption exit, as in engine/captions.js
const NARROW = 760; // below this film width the canvas captions drop under 10px; set them as text
const SEEK_STEP = 5;

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function allText() {
  const out = [];
  for (const b of data.beats) {
    out.push(b.statement.text, b.precision?.text ?? '');
    for (const e of b.extra || []) out.push(e.text);
  }
  return out.join(' ');
}

async function loadFonts() {
  const text = allText();
  await Promise.all([
    document.fonts.load(`400 62px "${FONTS.serif}"`, text),
    document.fonts.load(`italic 400 62px "${FONTS.serif}"`, 'the evidence'),
    document.fonts.load(`400 26px "${FONTS.sans}"`, text),
    document.fonts.load(`500 21px "${FONTS.mono}"`, text.toUpperCase()),
  ]);
}

// ---------- text captions for narrow players (same timing as the canvas captions) ----------

function statementNodes(st) {
  // italic runs from beats.json become <em>; quotes get the film's curly marks
  const frag = document.createDocumentFragment();
  let rest = st.text;
  const runs = [...(st.italic || [])];
  const push = (s, em) => {
    if (!s) return;
    const node = em ? document.createElement('em') : document.createTextNode(s);
    if (em) node.textContent = s;
    frag.append(node);
  };
  for (const run of runs) {
    const i = rest.indexOf(run);
    if (i < 0) continue;
    push(rest.slice(0, i), false);
    push(run, true);
    rest = rest.slice(i + run.length);
  }
  push(rest, false);
  if (st.quote) { frag.prepend('“'); frag.append('”'); }
  return frag;
}

function captionState(beat, t) {
  const site = beat.type === 'site';
  const live = site || t < beat.end - EXIT;
  const head = (beat.extra || []).find((e) => e.role === 'heading');
  return {
    head: !!head && live && t >= head.at,
    statement: live && t >= beat.statement.at,
    precision: !!beat.precision && live && t >= beat.precision.at,
  };
}

function makeCaptions(box) {
  const head = box.querySelector('[data-cap-head]');
  const statement = box.querySelector('[data-cap-statement]');
  const precision = box.querySelector('[data-cap-precision]');
  let shownBeat = null;
  let key = '';

  function fill(beat) {
    head.textContent = (beat.extra || []).find((e) => e.role === 'heading')?.text ?? '';
    statement.replaceChildren(statementNodes(beat.statement));
    precision.textContent = beat.precision?.text ?? '';
    shownBeat = beat;
  }

  return {
    // reserve the tallest caption's height so the essay below never moves
    measure() {
      box.style.minHeight = '';
      let max = 0;
      for (const b of data.beats) { fill(b); max = Math.max(max, box.scrollHeight); }
      box.style.minHeight = `${max}px`;
      shownBeat = null;
      key = '';
    },
    update(beat, t) {
      const s = captionState(beat, t);
      const k = `${beat.id}|${s.head}|${s.statement}|${s.precision}`;
      if (k === key) return;
      key = k;
      if (shownBeat !== beat) fill(beat);
      head.classList.toggle('is-on', s.head);
      statement.classList.toggle('is-on', s.statement);
      precision.classList.toggle('is-on', s.precision);
    },
  };
}

// ---------- the player ----------

async function mount(root) {
  const canvas = root.querySelector('canvas');
  const playBtn = root.querySelector('[data-film-play]');
  const playLabel = root.querySelector('[data-film-play-label]');
  const range = root.querySelector('[data-film-range]');
  const timeEl = root.querySelector('[data-film-time]');
  const capBox = root.querySelector('[data-film-captions]');
  const captions = makeCaptions(capBox);
  const D = data.duration;
  const chapterAt = (x) => data.chapters.filter((c) => c.start <= x).at(-1);
  const beatAt = (x) => data.beats.find((b) => x >= b.start && x < b.end) || data.beats.at(-1);

  const q = new URLSearchParams(location.search);
  const capture = q.has('t'); // ?t= opens paused at that time, for stills and checks
  const rmQuery = matchMedia('(prefers-reduced-motion: reduce)');

  await loadFonts();
  let film = createFilm(data, { canvas, reducedMotion: rmQuery.matches, fonts: FONTS });

  let t = capture ? qt(clamp(parseFloat(q.get('t')) || 0, 0, D)) : POSTER_T;
  let started = capture; // false while the poster frame is up
  let want = false; // the viewer (or the first view) asked for playback
  let autoplay = !capture && !rmQuery.matches; // silent film: may start once when scrolled into view
  let inView = false;
  let narrow = false;
  let raf = 0;
  let last = 0;
  let shownSecond = -1;

  function render() {
    film.frame(t);
    range.value = String(t);
    const sec = Math.floor(t);
    if (sec !== shownSecond) {
      shownSecond = sec;
      timeEl.textContent = `${fmt(t)} / ${fmt(D)}`;
      range.setAttribute('aria-valuetext', `${fmt(t)} of ${fmt(D)}, ${chapterAt(t).title}`);
    }
    if (narrow) captions.update(beatAt(t), t);
  }

  function setButton() {
    const ended = started && t >= D;
    const label = want ? 'Pause' : ended ? 'Replay' : 'Play';
    playLabel.textContent = label;
    playBtn.setAttribute('aria-label', `${label} film`);
    root.classList.toggle('is-playing', want);
  }

  function tick(now) {
    raf = 0;
    // the first frame's timestamp can precede the performance.now() that sync() stored; a
    // negative step would put t below 0, outside every chapter
    const dt = clamp((now - last) / 1000, 0, 0.1);
    last = now;
    t = qt(t + dt);
    if (t >= D) { t = D; want = false; }
    render();
    sync();
  }

  // start or stop the loop to match the state; the only place rAF is requested
  function sync() {
    const run = want && inView && !document.hidden;
    if (run && !raf) {
      if (!last || performance.now() - last > 100) last = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!run) last = 0;
    setButton();
  }

  function play() {
    if (!started || t >= D) { t = 0; started = true; }
    want = true;
    autoplay = false;
    render();
    sync();
  }
  function pause() { want = false; autoplay = false; sync(); }
  const toggle = () => (want ? pause() : play());

  function seek(x) {
    started = true;
    t = qt(clamp(x, 0, D));
    render();
    setButton();
  }

  playBtn.addEventListener('click', toggle);
  canvas.addEventListener('click', toggle);
  range.max = String(D);
  range.addEventListener('input', () => seek(parseFloat(range.value)));
  range.addEventListener('keydown', (e) => {
    let to = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') to = t + SEEK_STEP;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') to = t - SEEK_STEP;
    else if (e.key === 'PageDown') to = data.chapters.find((c) => c.start > t + 0.01)?.start ?? D;
    else if (e.key === 'PageUp') to = data.chapters.filter((c) => c.start < t - 0.3).at(-1)?.start ?? 0;
    if (to === null) return;
    e.preventDefault();
    seek(to);
  });

  // Playback holds while at least half the film is on screen. The one autoplay waits until the
  // whole picture fits in view, so the captions at its foot are not below the fold.
  const stage = canvas.parentElement;
  new IntersectionObserver((entries) => {
    let whole = false;
    for (const e of entries) {
      inView = e.isIntersecting && e.intersectionRatio >= 0.5;
      const fit = Math.min(e.boundingClientRect.height, e.rootBounds?.height ?? Infinity);
      whole = e.isIntersecting && e.intersectionRect.height >= fit - 2;
    }
    if (whole && autoplay) play();
    else sync();
  }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }).observe(stage);
  document.addEventListener('visibilitychange', sync);

  // narrow players: captions as page text under the film
  let measuredW = 0;
  new ResizeObserver(() => {
    const w = canvas.clientWidth;
    const n = w < NARROW;
    if (n === narrow && (!narrow || w === measuredW)) return;
    narrow = n;
    root.classList.toggle('is-narrow', narrow);
    film.setCaptions(!narrow);
    if (narrow) { captions.measure(); measuredW = w; }
    render();
  }).observe(canvas);

  rmQuery.addEventListener('change', () => {
    film = createFilm(data, { canvas, reducedMotion: rmQuery.matches, fonts: FONTS });
    film.setCaptions(!narrow);
    if (rmQuery.matches && want) pause();
    render();
  });

  root.classList.add('is-ready');
  render();
  setButton();
  // scripts and checks can drive the player without a global
  root.film = { play, pause, seek, get t() { return t; }, get playing() { return raf !== 0; }, duration: D };
}

for (const root of document.querySelectorAll('[data-film]')) {
  mount(root).catch((err) => { root.classList.add('is-failed'); console.error(err); });
}

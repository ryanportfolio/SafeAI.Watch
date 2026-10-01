/* Direction F, Topographic S: builds every SVG in this folder and board.html.

   Run: node build.mjs [folder-with-node_modules] [--preview]
   Needs fontkit, wawoff2 and subset-font (sharp too with --preview). The
   logo-lab worktree has no node_modules, so they resolve from the about-film
   worktree by default.

   Geometry lives in geo.mjs (height fields, marching squares, Bezier output)
   and variants.mjs (the four marks and their favicons). Every contour is a
   level set of one field, so no two lines can touch or cross; this script
   also measures the smallest gap and the point's clearance and stops if a
   line comes closer than its own stroke width.
*/
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as G from './geo.mjs';
import * as V from './variants.mjs';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const args = process.argv.slice(2);
const PREVIEW = args.includes('--preview');
const MODS = (args.find((a) => !a.startsWith('--')) || 'C:/Users/Home/CoreWise/SafeAI.Watch-worktrees/about-film/').replace(/\/?$/, '/');
const require = createRequire(MODS + 'package.json');
const fontkit = require('fontkit');
const wawoff2 = require('wawoff2');
const subsetFont = require('subset-font');

const C = { ink: '#1a1614', paper: '#d7d7d0', orange: '#ff7733', cream: '#f4f4e7', dark: '#181a15' };
const REC = 'F2'; // recommended variant
const REC_TYPE = 'serif'; // recommended pairing

/* ---------- geometry ---------- */

const META = {
  F1: { name: 'Survey', line: 'The concept, measured: six contours one step apart, two summits at the ends of the S, a saddle in the middle.', build: V.F1, fav: V.F1fav, elev: (L) => L, wght: { geist: 420, serif: 420 } },
  F2: { name: 'Three lines', line: 'The same ground at three levels and a heavy pen: still terrain at 64 px, where F1 and F3 turn grey.', build: V.F2, fav: V.F2fav, elev: (L) => L, wght: { geist: 540, serif: 520 } },
  F3: { name: 'Steep ground', line: 'The S is the steep ridge where the contours crowd; the lines around it soften into plain ground.', build: V.F3, fav: V.F3fav, elev: (L) => L, wght: { geist: 420, serif: 420 } },
  F4: { name: 'Valley sheet', line: 'Turned inside out: the S is the valley floor on a map sheet, the ground rising both ways from it.', build: V.F4, fav: V.F4fav, elev: (L) => -L, wght: { geist: 420, serif: 420 } },
};

const MARKS = {};
for (const [id, m] of Object.entries(META)) {
  console.time(id);
  const g = m.build();
  const gap = G.minGap(g.lines);
  console.timeEnd(id);
  console.log(`${id}: ${g.lines.length} lines, view ${g.view.w.toFixed(1)} x ${g.view.h.toFixed(1)}, smallest centre gap ${gap.toFixed(2)} (stroke ${g.sw}, clear ${(gap - g.sw).toFixed(2)}), point clearance ${g.dot.clearance}`);
  if (gap - g.sw < 0.6) throw new Error(`${id}: contours closer than the stroke allows`);
  if (g.dot.clearance < 0.4) throw new Error(`${id}: the point sits on a line`);
  const levels = [...new Set(g.lines.map((l) => l.L))].sort((a, b) => m.elev(a) - m.elev(b));
  g.lines.forEach((l) => (l.rank = levels.indexOf(l.L)));
  g.levelCount = levels.length;
  MARKS[id] = { ...m, g, favicon: m.fav() };
}

/* ---------- fonts ---------- */

const FONTS = MODS + 'node_modules/@fontsource-variable/';
const FILES = {
  geist: 'geist/files/geist-latin-wght-normal.woff2',
  mono: 'geist-mono/files/geist-mono-latin-wght-normal.woff2',
  serif: 'newsreader/files/newsreader-latin-opsz-normal.woff2',
};
const ttfCache = {};
async function ttf(key) {
  return (ttfCache[key] ??= Buffer.from(await wawoff2.decompress(readFileSync(FONTS + FILES[key]))));
}
async function face(key, axes) {
  return fontkit.create(await ttf(key)).getVariation(axes);
}

const fmt = (n) => {
  const v = Math.round(n * 100) / 100;
  return String(Object.is(v, -0) ? 0 : v);
};
const round = (s) => s.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => fmt(Number(n)));

/* Shape text with fontkit (kerning as the browser applies it) and return outlines
   with the baseline at (x, y). tracking in em. */
function outline(font, text, { size, x = 0, y = 0, tracking = 0 }) {
  const run = font.layout(text);
  const k = size / font.unitsPerEm;
  let pen = 0;
  const parts = [];
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const d = glyph.path.transform(k, 0, 0, -k, x + (pen + pos.xOffset) * k, y - pos.yOffset * k).toSVG();
    if (d) parts.push(round(d));
    pen += pos.xAdvance;
    if (i < run.glyphs.length - 1) pen += tracking * font.unitsPerEm;
  });
  return { d: parts.join(''), width: pen * k, cap: (font.capHeight / font.unitsPerEm) * size };
}

const WORD = 'SafeAI.watch';
const TYPE = {
  geist: { label: 'Geist', tracking: -0.012, font: (w) => face('geist', { wght: w }) },
  // opsz 36: the display cut is too fine at header sizes, the text cut too plain at hero sizes
  serif: { label: 'Newsreader', tracking: -0.006, font: (w) => face('serif', { wght: w, opsz: 36 }) },
};

/* ---------- SVG writers ---------- */

const svgDoc = (vb, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(fmt).join(' ')}"${extra}>${body}</svg>`;

/* The mark's own elements. colors: { line, dot }. anim adds per-level data for the draw-on. */
function markBody(g, colors, { anim = false, scale = 1 } = {}) {
  const sw = fmt(g.sw);
  const paths = g.lines
    .map((l) => (anim ? `<path pathLength="1" style="--i:${l.rank}" d="${l.d}"/>` : `<path d="${l.d}"/>`))
    .join('');
  return `<g fill="none" stroke="${colors.line}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</g><circle${anim ? ' class="pt"' : ''} cx="${fmt(g.dot.x)}" cy="${fmt(g.dot.y)}" r="${fmt(g.dot.r)}" fill="${colors.dot}"/>`;
}
const markVB = (g) => [g.view.x, g.view.y, g.view.w, g.view.h];

function markSVG(id, colors = { line: C.ink, dot: C.orange }, extra = '') {
  const g = MARKS[id].g;
  return svgDoc(markVB(g), markBody(g, colors), extra);
}

/* Lockups are laid out in units where the mark is 100 tall. */
async function lockup(id, type, layout, colors = { line: C.ink, dot: C.orange, text: C.ink }) {
  const { g, wght } = MARKS[id];
  const T = TYPE[type];
  const font = await T.font(wght[type]);
  const k = 100 / g.view.h;
  const mw = g.view.w * k;
  const place = (x, y) => `<g transform="translate(${fmt(x - g.view.x * k)} ${fmt(y - g.view.y * k)}) scale(${fmt(k)})">${markBody(g, colors)}</g>`;
  if (layout === 'h') {
    // cap height 34% of the mark, centred on it; gap 26% of the mark height
    const probe = outline(font, WORD, { size: 100 });
    const size = (34 / probe.cap) * 100;
    const gap = 26;
    const t = outline(font, WORD, { size, x: mw + gap, y: 50 + (probe.cap * size) / 100 / 2, tracking: T.tracking });
    return svgDoc([0, 0, mw + gap + t.width, 100], place(0, 0) + `<path fill="${colors.text}" d="${t.d}"/>`);
  }
  // stacked: wordmark 2.3 x the mark's width (capped for the wide F4 sheet), 20 below
  const probe = outline(font, WORD, { size: 100, tracking: T.tracking });
  const tw = Math.min(mw * 2.3, 190);
  const size = (tw / probe.width) * 100;
  const cap = (probe.cap * size) / 100;
  const W = Math.max(tw, mw);
  const t = outline(font, WORD, { size, x: (W - tw) / 2, y: 100 + 20 + cap, tracking: T.tracking });
  return svgDoc([0, 0, W, 120 + cap], place((W - mw) / 2, 0) + `<path fill="${colors.text}" d="${t.d}"/>`);
}

function faviconSVG(id) {
  const f = MARKS[id].favicon;
  const light = f.body({ ink: C.ink, orange: C.orange }, 'kl');
  // dark scheme: same geometry in cream
  const dark = f.body({ ink: C.cream, orange: C.orange }, 'kd');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.d{display:none}@media (prefers-color-scheme:dark){.l{display:none}.d{display:inline}}</style><g class="l">${light}</g><g class="d">${dark}</g></svg>`;
}
let uid = 0;
const favInline = (id, ink, ground, size) => `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${MARKS[id].favicon.body({ ink, orange: C.orange }, `k${uid++}`)}</svg>`;

/* Small lockup: below 48 px the full mark fills in, so the lockup swaps in the favicon drawing.
   Same text layout as the horizontal lockup, with the mark box cropped to what the favicon draws. */
async function lockupSmall(id, type, colors = { line: C.ink, dot: C.orange, text: C.ink }) {
  const { favicon: f, wght } = MARKS[id];
  const T = TYPE[type];
  const font = await T.font(wght[type]);
  const k = 100 / 32;
  const mw = f.box.w * k;
  const probe = outline(font, WORD, { size: 100 });
  const size = (40 / probe.cap) * 100;
  const gap = 24;
  const t = outline(font, WORD, { size, x: mw + gap, y: 50 + (probe.cap * size) / 100 / 2, tracking: T.tracking });
  const mark = `<g transform="translate(${fmt(-f.box.x * k)} 0) scale(${fmt(k)})">${f.body({ ink: colors.line, orange: colors.dot }, `s${uid++}`)}</g>`;
  return svgDoc([0, 0, mw + gap + t.width, 100], mark + `<path fill="${colors.text}" d="${t.d}"/>`);
}

/* ---------- files ---------- */

const out = (name, s) => writeFileSync(HERE + name, s.endsWith('\n') ? s : s + '\n');
const LOCK = {};
for (const id of Object.keys(MARKS)) {
  out(`${id}-mark.svg`, markSVG(id));
  out(`${id}-favicon.svg`, faviconSVG(id));
  for (const type of Object.keys(TYPE)) {
    LOCK[`${id}-${type}-h`] = await lockup(id, type, 'h');
    LOCK[`${id}-${type}-s`] = await lockup(id, type, 's');
    LOCK[`${id}-${type}-h-dark`] = await lockup(id, type, 'h', { line: C.cream, dot: C.orange, text: C.cream });
    LOCK[`${id}-${type}-s-dark`] = await lockup(id, type, 's', { line: C.cream, dot: C.orange, text: C.cream });
    LOCK[`${id}-${type}-h-mono`] = await lockup(id, type, 'h', { line: C.ink, dot: C.ink, text: C.ink });
    LOCK[`${id}-${type}-h-mono-dark`] = await lockup(id, type, 'h', { line: C.cream, dot: C.cream, text: C.cream });
  }
  LOCK[`${id}-small`] = await lockupSmall(id, REC_TYPE);
  LOCK[`${id}-small-dark`] = await lockupSmall(id, REC_TYPE, { line: C.cream, dot: C.orange, text: C.cream });
  out(`${id}-lockup-horizontal.svg`, LOCK[`${id}-${REC_TYPE}-h`]);
  out(`${id}-lockup-small.svg`, LOCK[`${id}-small`]);
  out(`${id}-lockup-stacked.svg`, LOCK[`${id}-${REC_TYPE}-s`]);
}

/* ---------- board ---------- */

const inline = (svg, cls = '', label = '') =>
  svg.replace('<svg xmlns="http://www.w3.org/2000/svg"', `<svg${cls ? ` class="${cls}"` : ''}${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}`);

const ids = Object.keys(MARKS);
const recG = MARKS[REC].g;
const bigMark = (id, colors) => inline(markSVG(id, colors), 'mk', `${id} mark`);

const variantCards = ids
  .map((id) => {
    const m = MARKS[id];
    return `<figure class="card${id === REC ? ' rec' : ''}">
  <div class="stage paper">${bigMark(id, { line: C.ink, dot: C.orange })}</div>
  <div class="stage dark">${bigMark(id, { line: C.cream, dot: C.orange })}</div>
  <figcaption><b>${id} · ${m.name}</b>${id === REC ? ' <span class="tag">recommended</span>' : ''}<br>${m.line}<br><span class="cap">${m.g.lines.length} lines · ${m.g.levelCount} levels · stroke ${m.g.sw} on a ${Math.round(m.g.view.h)}-unit mark</span></figcaption>
</figure>`;
  })
  .join('\n');

const lockRows = ids
  .map(
    (id) => `<div class="lrow">
  <div class="lab">${id}</div>
  <div class="tile paper h">${inline(LOCK[`${id}-${REC_TYPE}-h`], 'lk')}</div>
  <div class="tile paper s">${inline(LOCK[`${id}-${REC_TYPE}-s`], 'lk')}</div>
  <div class="tile dark h">${inline(LOCK[`${id}-${REC_TYPE}-h-dark`], 'lk')}</div>
  <div class="tile dark s">${inline(LOCK[`${id}-${REC_TYPE}-s-dark`], 'lk')}</div>
</div>`,
  )
  .join('\n');

const smallRows = ids
  .map(
    (id) => `<div class="srow">
  <div class="lab">${id}</div>
  <div class="tile paper sm">${inline(LOCK[`${id}-${REC_TYPE}-h`], 'lk')}<span class="cap">full mark</span></div>
  <div class="tile paper sm">${inline(LOCK[`${id}-small`], 'lk')}<span class="cap">small lockup</span></div>
  <div class="tile dark sm">${inline(LOCK[`${id}-small-dark`], 'lk')}<span class="cap">small lockup</span></div>
</div>`,
  )
  .join('\n');

const typeRows = ids
  .map(
    (id) => `<div class="trow">
  <div class="lab">${id}</div>
  <div class="tile paper h">${inline(LOCK[`${id}-geist-h`], 'lk')}<span class="cap">Geist ${MARKS[id].wght.geist}</span></div>
  <div class="tile paper h">${inline(LOCK[`${id}-serif-h`], 'lk')}<span class="cap">Newsreader ${MARKS[id].wght.serif}, opsz 36</span></div>
</div>`,
  )
  .join('\n');

const tab = (id, mode) => {
  const ink = mode === 'dark' ? C.cream : C.ink;
  const ground = mode === 'dark' ? '#35363a' : '#ffffff';
  return `<div class="tabbar ${mode}"><div class="tabx">${favInline(id, ink, ground, 16)}<span>SafeAI.watch</span><i>×</i></div><div class="tabx off"><span class="blank"></span><span>New tab</span></div></div>`;
};
const favRows = ids
  .map(
    (id) => `<div class="frow">
  <div class="lab">${id}</div>
  ${tab(id, 'light')}
  ${tab(id, 'dark')}
  <div class="fsizes paper">${[16, 32, 64].map((s) => favInline(id, C.ink, C.paper, s)).join('')}</div>
  <div class="fsizes dark">${[16, 32, 64].map((s) => favInline(id, C.cream, C.dark, s)).join('')}</div>
</div>`,
  )
  .join('\n');

const monoRows = ids
  .map(
    (id) => `<div class="mrow">
  <div class="lab">${id}</div>
  <div class="tile paper h">${inline(LOCK[`${id}-${REC_TYPE}-h-mono`], 'lk')}</div>
  <div class="tile dark h">${inline(LOCK[`${id}-${REC_TYPE}-h-mono-dark`], 'lk')}</div>
</div>`,
  )
  .join('\n');

const animMark = (colors) => svgDoc(markVB(recG), markBody(recG, colors, { anim: true }));
const LEVEL_STEP = 0.42;
const DRAW = 1.5;
const dotDelay = (recG.levelCount - 1) * LEVEL_STEP + DRAW * 0.8;

const recType = TYPE[REC_TYPE].label;
const board = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>F · Topographic S: SafeAI.watch logo board</title>
<link rel="icon" href="${REC}-favicon.svg" type="image/svg+xml">
<style>
/*FONTS*/
:root { --paper: ${C.paper}; --ink: ${C.ink}; --cream: ${C.cream}; --dark: ${C.dark}; --orange: ${C.orange}; --ink-64: rgb(26 22 20 / .64); --ink-10: rgb(26 22 20 / .1); }
* { box-sizing: border-box; }
html { background: var(--paper); }
body { margin: 0; color: var(--ink); font: 15px/1.55 'F Geist', system-ui, sans-serif; }
main { max-width: 1360px; margin: 0 auto; padding: 48px 40px 96px; }
h1 { font: 400 44px/1.1 'F Newsreader', Georgia, serif; letter-spacing: -0.02em; margin: 0 0 12px; }
h2 { font: 400 28px/1.2 'F Newsreader', Georgia, serif; letter-spacing: -0.01em; margin: 64px 0 6px; }
h2 + p { margin: 0 0 22px; color: var(--ink-64); max-width: 80ch; }
.lede { max-width: 76ch; color: var(--ink-64); margin: 0; font-size: 17px; }
.cap, .lab { font: 500 11px/1.4 'F Mono', ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-64); }
.lab { align-self: center; }
.paper { background: #e3e2db; }
.dark { background: var(--dark); color: var(--cream); }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.card { margin: 0; }
.card .stage { display: flex; align-items: center; justify-content: center; height: 340px; border-radius: 6px; }
.card .stage.dark { height: 150px; margin-top: 8px; }
.card .stage.dark .mk { height: 104px; }
.card .mk { height: 270px; width: auto; }
.card figcaption { margin-top: 12px; font-size: 14px; color: var(--ink-64); }
.card figcaption b { color: var(--ink); font-weight: 600; }
.card.rec .stage.paper { outline: 1px dashed var(--ink-64); outline-offset: -8px; }
.tag { font: 500 10px/1 'F Mono', monospace; text-transform: uppercase; letter-spacing: .08em; background: var(--ink); color: var(--cream); padding: 3px 6px; border-radius: 3px; vertical-align: 2px; }
.lrow, .trow, .mrow, .frow { display: grid; gap: 14px; margin-bottom: 14px; }
.lrow { grid-template-columns: 34px 1.5fr 1fr 1.5fr 1fr; }
.trow { grid-template-columns: 34px 1fr 1fr; }
.srow { display: grid; gap: 14px; margin-bottom: 14px; grid-template-columns: 34px 1fr 1fr 1fr; }
.tile.sm { min-height: 96px; padding: 18px; }
.tile.sm .lk { height: 28px; width: auto; }
.dark .cap { color: rgb(244 244 231 / .6); }
.mrow { grid-template-columns: 34px 1fr 1fr; }
.tile { border-radius: 6px; display: flex; flex-direction: column; gap: 10px; align-items: center; justify-content: center; padding: 26px 20px; min-height: 150px; }
.tile.h .lk { height: 52px; width: auto; max-width: 100%; }
.tile.s .lk { height: 104px; width: auto; }
.trow .tile.h .lk { height: 60px; }
.frow { grid-template-columns: 34px 230px 230px 1fr 1fr; align-items: stretch; }
.tabbar { display: flex; align-items: end; gap: 2px; padding: 10px 10px 0; border-radius: 6px; }
.tabbar.light { background: #dee1e6; }
.tabbar.dark { background: #202124; }
.tabx { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; border-radius: 8px 8px 0 0; font: 12px/1 system-ui, sans-serif; width: 150px; }
.tabbar.light .tabx { background: #fff; color: #1f1f1f; }
.tabbar.dark .tabx { background: #35363a; color: #e8eaed; }
.tabbar .tabx.off { background: transparent; width: 84px; opacity: .55; }
.tabx span { white-space: nowrap; }
.tabx i { margin-left: auto; font-style: normal; opacity: .6; }
.tabx svg { flex: none; }
.blank { width: 16px; height: 16px; border-radius: 50%; background: currentColor; opacity: .25; }
.fsizes { display: flex; align-items: end; gap: 22px; padding: 16px 22px; border-radius: 6px; }
.site { border-radius: 8px; overflow: hidden; background: var(--paper); box-shadow: 0 0 0 1px var(--ink-10); }
.nav { display: flex; align-items: center; gap: 28px; padding: 18px 32px; border-bottom: 1px dashed var(--ink-10); }
.nav .lk { height: 30px; width: auto; }
.nav a { color: var(--ink-64); text-decoration: none; font-size: 14px; }
.nav .sp { flex: 1; }
.hero { padding: 72px 32px 80px; display: grid; grid-template-columns: 1.3fr 1fr; gap: 48px; align-items: center; }
.hero h3 { font: 400 54px/1.1 'F Newsreader', Georgia, serif; letter-spacing: -0.037em; margin: 0 0 18px; }
.hero p { font: 400 21px/1.6 'F Geist', sans-serif; color: rgb(26 22 20 / .7); margin: 0; max-width: 40ch; }
.hero .side { display: flex; justify-content: center; }
.hero .side svg { height: 300px; width: auto; }
.animrow { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.anim { position: relative; height: 460px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.anim svg { height: 380px; width: auto; }
.replay { position: absolute; right: 14px; bottom: 14px; font: 500 11px/1 'F Mono', monospace; letter-spacing: .06em; text-transform: uppercase; background: none; border: 1px dashed currentColor; color: inherit; padding: 8px 10px; border-radius: 4px; cursor: pointer; opacity: .7; }
.anim path { stroke-dasharray: 1 1; stroke-dashoffset: 0; }
.anim.play path { animation: draw ${DRAW}s cubic-bezier(.45,.05,.25,1) both; animation-delay: calc(var(--i) * ${LEVEL_STEP}s); }
.anim.play .pt { animation: land .9s cubic-bezier(.2,.7,.25,1) ${dotDelay.toFixed(2)}s both; transform-box: fill-box; transform-origin: center; }
@keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes land { 0% { opacity: 0; transform: translateY(-14px) scale(.4); } 60% { opacity: 1; } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .anim.play path, .anim.play .pt { animation: none; } }
.notes { columns: 2; column-gap: 40px; max-width: 1100px; color: var(--ink-64); font-size: 14px; }
.notes p { margin: 0 0 10px; break-inside: avoid; }
.notes b { color: var(--ink); font-weight: 600; }
</style>
</head>
<body>
<main>
<h1>F · Topographic S</h1>
<p class="lede">An S you find in surveyed ground rather than read as a letter. Every line is a contour of one height field, traced and smoothed in <code>build.mjs</code>, so the lines keep their spacing and never touch. The one orange point marks where you stand. Recommended: <b>${REC} · ${MARKS[REC].name}</b> with ${recType}.</p>

<h2>Four variations</h2>
<p>Ink on paper above, cream on the dark closing ground below. Same palette, one accent.</p>
<div class="cards">
${variantCards}
</div>

<h2>Lockups</h2>
<p>${recType} wordmark, outlined. Horizontal and stacked, on paper ${C.paper} and on dark ${C.dark}.</p>
${lockRows}
<h2>Small sizes</h2>
<p>Below 48 px the contours fill in, so the lockup swaps in the favicon drawing (<code>F&lt;n&gt;-lockup-small.svg</code>). Each row: the full lockup and the small lockup at 28 px, on paper and dark.</p>
${smallRows}

<h2>Type pairings</h2>
<p>Geist (the site's sans, monoline like the contours) against Newsreader (the site's serif, and the survey-map habit of serif place names). Weight matched per variant to the contour stroke. Recommended: Newsreader. Geist's capital I has no serifs, so "SafeAI" reads as "SafeAl"; Newsreader's serifed I keeps the name exact, and it ties the wordmark to the site's headings.</p>
${typeRows}

<h2 id="fav-h">Favicons</h2>
<p>Separate geometry on a 32-unit grid, one unit is half a pixel at 16 px. Browser tabs in light and dark at 16 px, then 16, 32 and 64 px on paper and dark. Real pixels, no scaling.</p>
<section id="favicons" aria-label="Favicon">
${favRows}
</section>

<h2>One colour</h2>
<p>The point drops to the line colour. Nothing else changes: the mark does not depend on the orange.</p>
${monoRows}

<h2>In the site header</h2>
<p>${REC} small lockup at 30 px in the nav, full mark at hero size, Newsreader heading, Geist body.</p>
<div class="site">
  <div class="nav">${inline(LOCK[`${REC}-small`], 'lk', 'SafeAI.watch')}<span class="sp"></span><a href="#">Record</a><a href="#">Coverage</a><a href="#">About</a></div>
  <div class="hero">
    <div><h3>Keeping watch on AI safety, one sourced entry at a time.</h3><p>Research, reported incidents, public warnings and policy. Each entry separates what happened, what the evidence shows and what remains uncertain.</p></div>
    <div class="side">${inline(markSVG(REC, { line: C.ink, dot: C.orange }))}</div>
  </div>
</div>

<h2>Draw-on</h2>
<p>${REC}: contours draw in from the lowest level to the highest, ${LEVEL_STEP}s apart, then the point lands. With reduced motion the mark shows complete.</p>
<div class="animrow">
  <div class="anim paper play" id="anim-paper">${inline(animMark({ line: C.ink, dot: C.orange }))}<button class="replay" type="button">Replay</button></div>
  <div class="anim dark play" id="anim-dark">${inline(animMark({ line: C.cream, dot: C.orange }))}<button class="replay" type="button">Replay</button></div>
</div>

<h2>Notes</h2>
<div class="notes">
<p><b>Why ${REC}.</b> ${'NOTE_REC'}</p>
<p><b>Rings and targets.</b> No loop is round: each summit loop follows the curve of the S, so it reads as a banana-shaped hilltop, and the point never sits at the centre of a set of loops. F3's outer lines come closest to nested ovals; its waist notches keep them from closing into rings.</p>
<p><b>Small sizes.</b> F1 and F3 need 64 px or more for their line count; below that the lines fill in (F3 is designed to: its crowded core turns into a solid S). Below about 48 px every variant switches to its small lockup, which uses the favicon drawing.</p>
<p><b>Construction.</b> Height field from a range of slope-1 cones along an S spine (F1 to F3) or the distance to the spine (F4); light Gaussian blur; marching squares; Catmull-Rom to cubic Beziers. Minimum line gaps are printed by the build.</p>
</div>
</main>
<script>
for (const b of document.querySelectorAll('.replay')) b.addEventListener('click', () => { const a = b.parentElement; a.classList.remove('play'); void a.offsetWidth; a.classList.add('play'); });
</script>
</body>
</html>
`;

/* Embed subsets of the three faces as data URLs so the board works from file:// and the lab server alike. */
async function fontFaces(html) {
  const text = html.replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>|<svg[\s\S]*?<\/svg>|<[^>]+>/g, ' ');
  const chars = [...new Set(text + ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;·-()×')].join('');
  const faces = [
    ['F Geist', 'geist', '100 900'],
    ['F Mono', 'mono', '100 900'],
    ['F Newsreader', 'serif', '200 800'],
  ];
  let css = '';
  for (const [family, key, range] of faces) {
    const buf = await subsetFont(readFileSync(FONTS + FILES[key]), chars, { targetFormat: 'woff2' });
    css += `@font-face { font-family: '${family}'; font-weight: ${range}; font-display: block; src: url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2'); }\n`;
  }
  return css;
}

const NOTE_REC = {
  F2: 'Three contours at a heavy stroke still read as terrain at 64 px, where F1 and F3 turn grey, and its favicon (a solid S with the crest line cut out and the point on the upper terminal) holds at 16 px. It keeps the concept: the same ground, summits at both ends of the S, a saddle between. F1 is the richer drawing of the same field and suits large formats (a poster, the About page).',
};
let html = board.replace("${'NOTE_REC'}", '').replace('NOTE_REC', NOTE_REC[REC] || '');
html = html.replace('/*FONTS*/', await fontFaces(html));
out('board.html', html);
console.log('wrote marks, lockups, favicons, board.html');

/* ---------- optional raster previews for quick review ---------- */
if (PREVIEW) {
  const sharp = require('sharp');
  const TMP = HERE + '../../../.tmp/topo/';
  mkdirSync(TMP, { recursive: true });
  const tiles = [];
  let x = 10;
  for (const id of ids) {
    const buf = await sharp(Buffer.from(markSVG(id).replace('<svg ', `<svg style="background:${C.paper}" `)), { density: 400 }).resize(null, 420).flatten({ background: C.paper }).png().toBuffer();
    const w = (await sharp(buf).metadata()).width;
    tiles.push({ input: buf, left: x, top: 10 });
    x += w + 30;
  }
  await sharp({ create: { width: x, height: 440, channels: 3, background: C.paper } }).composite(tiles).png().toFile(TMP + 'marks.png');
  console.log('preview', TMP + 'marks.png');
}

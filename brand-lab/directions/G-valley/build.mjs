/* Direction G, Valley: builds every SVG in this folder and board.html.

   Run: node build.mjs [folder-with-node_modules]
   Needs fontkit, wawoff2 and subset-font; they resolve from the about-film
   worktree by default (the logo-lab worktree has no node_modules).

   Geometry: variants.mjs (elevation fields, tracing, favicons) on geo.mjs
   (marching squares, Bezier output; same core as direction F). The build
   prints the smallest gap between lines and the point's clearance, and stops
   if a line comes closer than its stroke allows or touches the point.
*/
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as G from './geo.mjs';
import * as V from './variants.mjs';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const MODS = (process.argv[2] || 'C:/Users/Home/CoreWise/SafeAI.Watch-worktrees/about-film/').replace(/\/?$/, '/');
const require = createRequire(MODS + 'package.json');
const fontkit = require('fontkit');
const wawoff2 = require('wawoff2');
const subsetFont = require('subset-font');

const C = { ink: '#1a1614', paper: '#d7d7d0', orange: '#ff7733', cream: '#f4f4e7', dark: '#181a15' };
const REC = 'G3';
const S = V.SHEET;

/* ---------- geometry ---------- */

const META = {
  G1: { name: 'Polished', line: 'F4 refined: a square sheet, balanced counters, a valley twice as wide as any gap, steep walls that ease outward, lines cut flush at the edge, the point where the floor crosses the centre line.', build: V.G1, fav: V.G1fav },
  G2: { name: 'Surveyed', line: 'The same valley on real-looking ground: seeded noise in the height, a slight wobble, outer banks steeper than inner ones, a hollow in the lower bend. Land first, S second.', build: V.G2, fav: V.G2fav },
  G3: { name: 'Marker', line: 'G1\u2019s ground with a triangulation mark on the valley floor and a hairline neatline with corner ticks: a map sheet, not a pattern.', build: V.G1, fav: V.G3fav, marker: true, neat: true },
};

const MARKS = {};
const cache = {};
for (const [id, m] of Object.entries(META)) {
  const g = (cache[m.build.name] ??= m.build());
  const gap = G.minGap(g.lines);
  const pts = g.lines.flatMap((l) => l.pts);
  let clear = 1e9;
  for (const p of pts) clear = Math.min(clear, Math.hypot(p[0] - g.dot.x, p[1] - g.dot.y));
  const pointR = m.marker ? 3.1 + 0.43 : g.dot.r; // triangle circumradius plus half its stroke
  const pc = clear - pointR - g.sw / 2;
  console.log(`${id}: ${g.lines.length} lines, smallest centre gap ${gap.toFixed(2)} (stroke ${g.sw}, clear ${(gap - g.sw).toFixed(2)}), point clearance ${pc.toFixed(2)}`);
  if (gap - g.sw < 0.8) throw new Error(`${id}: contours closer than the stroke allows`);
  if (pc < 0.4) throw new Error(`${id}: the point is crowded by a line`);
  MARKS[id] = { ...m, g, favicon: m.fav() };
}

/* ---------- fonts ---------- */

const FONTS = MODS + 'node_modules/@fontsource-variable/';
const FILES = {
  geist: 'geist/files/geist-latin-wght-normal.woff2',
  mono: 'geist-mono/files/geist-mono-latin-wght-normal.woff2',
  serif: 'newsreader/files/newsreader-latin-opsz-normal.woff2',
};
const ttf = async (key) => Buffer.from(await wawoff2.decompress(readFileSync(FONTS + FILES[key])));
// Newsreader, as chosen in F: its serifed capital I keeps "SafeAI" from reading "SafeAl"
const SERIF = fontkit.create(await ttf('serif')).getVariation({ wght: 420, opsz: 36 });
const TRACK = -0.006;

const fmt = (n) => {
  const v = Math.round(n * 100) / 100;
  return String(Object.is(v, -0) ? 0 : v);
};
const round = (s) => s.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => fmt(Number(n)));

function outline(text, { size, x = 0, y = 0, tracking = TRACK }) {
  const run = SERIF.layout(text);
  const k = size / SERIF.unitsPerEm;
  let pen = 0;
  const parts = [];
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const d = glyph.path.transform(k, 0, 0, -k, x + (pen + pos.xOffset) * k, y - pos.yOffset * k).toSVG();
    if (d) parts.push(round(d));
    pen += pos.xAdvance;
    if (i < run.glyphs.length - 1) pen += tracking * SERIF.unitsPerEm;
  });
  return { d: parts.join(''), width: pen * k, cap: (SERIF.capHeight / SERIF.unitsPerEm) * size };
}
const WORD = 'SafeAI.watch';

/* ---------- SVG ---------- */

let uid = 0;
const svgDoc = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(fmt).join(' ')}">${body}</svg>`;

// G3's neatline sits on the sheet edge; its ticks run 4 units past each corner
const TICK = 4;
const markBox = (id) => (MARKS[id].neat ? [-TICK, -TICK, S + 2 * TICK, S + 2 * TICK] : [0, 0, S, S]);

/* colors: { line, dot }. anim: per-level data for the draw-on. */
function markBody(id, colors, { anim = false } = {}) {
  const { g, marker, neat } = MARKS[id];
  const cid = `gc${uid++}`;
  const paths = g.lines.map((l) => (anim ? `<path pathLength="1" style="--i:${l.li}" d="${l.d}"/>` : `<path d="${l.d}"/>`)).join('');
  let out = `<clipPath id="${cid}"><rect width="${S}" height="${S}"/></clipPath><g clip-path="url(#${cid})" fill="none" stroke="${colors.line}" stroke-width="${g.sw}">${paths}</g>`;
  if (neat) {
    const h = 0.45; // hairline
    const t = `M${-TICK} 0H0M0 ${-TICK}V0M${S} ${-TICK}V0M${S} 0H${S + TICK}M${S + TICK} ${S}H${S}M${S} ${S}V${S + TICK}M0 ${S + TICK}V${S}M0 ${S}H${-TICK}`;
    out += `<g${anim ? ' class="neat"' : ''} fill="none" stroke="${colors.line}" stroke-width="${h}"><rect x="0" y="0" width="${S}" height="${S}"/><path d="${t}"/></g>`;
  }
  const { x, y } = g.dot;
  const pt = marker
    ? `<g${anim ? ' class="pt"' : ''}>${V.triangle(x, y, 3.1, 'none', ` stroke="${colors.dot}" stroke-width="0.85" stroke-linejoin="round"`)}<circle cx="${x}" cy="${y}" r="1.05" fill="${colors.dot}"/></g>`
    : `<circle${anim ? ' class="pt"' : ''} cx="${x}" cy="${y}" r="${g.dot.r}" fill="${colors.dot}"/>`;
  return out + pt;
}
const markSVG = (id, colors = { line: C.ink, dot: C.orange }) => svgDoc(markBox(id), markBody(id, colors));

/* Lockups in units where the mark is 100 tall. */
function lockup(id, layout, colors = { line: C.ink, dot: C.orange, text: C.ink }) {
  const [bx, by, bw, bh] = markBox(id);
  const k = 100 / bh;
  const mw = bw * k;
  const mark = (x, y) => `<g transform="translate(${fmt(x - bx * k)} ${fmt(y - by * k)}) scale(${fmt(k)})">${markBody(id, colors)}</g>`;
  const probe = outline(WORD, { size: 100 });
  if (layout === 'h') {
    const size = (30 / probe.cap) * 100; // cap height 30% of the mark, centred on it
    const gap = 24;
    const t = outline(WORD, { size, x: mw + gap, y: 50 + (probe.cap * size) / 100 / 2 });
    return svgDoc([0, 0, mw + gap + t.width, 100], mark(0, 0) + `<path fill="${colors.text}" d="${t.d}"/>`);
  }
  const tw = mw * 1.55;
  const size = (tw / probe.width) * 100;
  const cap = (probe.cap * size) / 100;
  const t = outline(WORD, { size, y: 100 + 20 + cap });
  return svgDoc([0, 0, tw, 120 + cap], mark((tw - mw) / 2, 0) + `<path fill="${colors.text}" d="${t.d}"/>`);
}

/* Small lockup: below 48 px the contours fill in, so it uses the favicon's ink sheet. */
function lockupSmall(id, colors = { line: C.ink, dot: C.orange, text: C.ink }) {
  const f = MARKS[id].favicon;
  const k = 100 / 30; // the favicon sheet spans 1..31
  const probe = outline(WORD, { size: 100 });
  const size = (40 / probe.cap) * 100;
  const gap = 26;
  const t = outline(WORD, { size, x: 100 + gap, y: 50 + (probe.cap * size) / 100 / 2 });
  const mark = `<g transform="translate(${fmt(-k)} ${fmt(-k)}) scale(${fmt(k)})">${f.body({ ink: colors.line, orange: colors.dot }, `gs${uid++}`)}</g>`;
  return svgDoc([0, 0, 100 + gap + t.width, 100], mark + `<path fill="${colors.text}" d="${t.d}"/>`);
}

function faviconSVG(id) {
  const f = MARKS[id].favicon;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.d{display:none}@media (prefers-color-scheme:dark){.l{display:none}.d{display:inline}}</style><g class="l">${f.body({ ink: C.ink, orange: C.orange }, 'kl')}</g><g class="d">${f.body({ ink: C.cream, orange: C.orange }, 'kd')}</g></svg>`;
}
const favInline = (id, ink, size) => `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${MARKS[id].favicon.body({ ink, orange: C.orange }, `k${uid++}`)}</svg>`;

/* ---------- files ---------- */

const out = (name, s) => writeFileSync(HERE + name, s.endsWith('\n') ? s : s + '\n');
const L = {};
const DARK = { line: C.cream, dot: C.orange, text: C.cream };
for (const id of Object.keys(MARKS)) {
  L[`${id}-h`] = lockup(id, 'h');
  L[`${id}-s`] = lockup(id, 's');
  L[`${id}-h-dark`] = lockup(id, 'h', DARK);
  L[`${id}-s-dark`] = lockup(id, 's', DARK);
  L[`${id}-h-mono`] = lockup(id, 'h', { line: C.ink, dot: C.ink, text: C.ink });
  L[`${id}-h-mono-dark`] = lockup(id, 'h', { line: C.cream, dot: C.cream, text: C.cream });
  L[`${id}-small`] = lockupSmall(id);
  L[`${id}-small-dark`] = lockupSmall(id, DARK);
  out(`${id}-mark.svg`, markSVG(id));
  out(`${id}-lockup-horizontal.svg`, L[`${id}-h`]);
  out(`${id}-lockup-stacked.svg`, L[`${id}-s`]);
  out(`${id}-lockup-small.svg`, L[`${id}-small`]);
  out(`${id}-favicon.svg`, faviconSVG(id));
}

/* ---------- board ---------- */

const ids = Object.keys(MARKS);
const inline = (svg, cls = '', label = '') =>
  svg.replace('<svg xmlns="http://www.w3.org/2000/svg"', `<svg${cls ? ` class="${cls}"` : ''}${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}`);

const cards = ids
  .map((id) => {
    const m = MARKS[id];
    return `<figure class="card${id === REC ? ' rec' : ''}">
  <div class="stage paper">${inline(markSVG(id), 'mk', `${id} mark`)}</div>
  <div class="stage dark">${inline(markSVG(id, { line: C.cream, dot: C.orange }), 'mk')}</div>
  <figcaption><b>${id} · ${m.name}</b>${id === REC ? ' <span class="tag">recommended</span>' : ''}<br>${m.line}</figcaption>
</figure>`;
  })
  .join('\n');

const row = (cls, cells) => `<div class="${cls}">\n${cells.join('\n')}\n</div>`;
const lockRows = ids.map((id) => row('lrow', [`<div class="lab">${id}</div>`, `<div class="tile paper h">${inline(L[`${id}-h`], 'lk')}</div>`, `<div class="tile paper s">${inline(L[`${id}-s`], 'lk')}</div>`, `<div class="tile dark h">${inline(L[`${id}-h-dark`], 'lk')}</div>`, `<div class="tile dark s">${inline(L[`${id}-s-dark`], 'lk')}</div>`])).join('\n');
const smallRows = ids.map((id) => row('srow', [`<div class="lab">${id}</div>`, `<div class="tile paper sm">${inline(L[`${id}-h`], 'lk')}<span class="cap">full mark</span></div>`, `<div class="tile paper sm">${inline(L[`${id}-small`], 'lk')}<span class="cap">small lockup</span></div>`, `<div class="tile dark sm">${inline(L[`${id}-small-dark`], 'lk')}<span class="cap">small lockup</span></div>`])).join('\n');
const monoRows = ids.map((id) => row('mrow', [`<div class="lab">${id}</div>`, `<div class="tile paper h">${inline(L[`${id}-h-mono`], 'lk')}</div>`, `<div class="tile dark h">${inline(L[`${id}-h-mono-dark`], 'lk')}</div>`])).join('\n');
const tab = (id, mode) => `<div class="tabbar ${mode}"><div class="tabx">${favInline(id, mode === 'dark' ? C.cream : C.ink, 16)}<span>SafeAI.watch</span><i>×</i></div><div class="tabx off"><span class="blank"></span><span>New tab</span></div></div>`;
const favRows = ids.map((id) => row('frow', [`<div class="lab">${id}</div>`, tab(id, 'light'), tab(id, 'dark'), `<div class="fsizes paper">${[16, 32, 64].map((s) => favInline(id, C.ink, s)).join('')}</div>`, `<div class="fsizes dark">${[16, 32, 64].map((s) => favInline(id, C.cream, s)).join('')}</div>`])).join('\n');

const recLevels = MARKS[REC].g.levelCount;
const STEP = 0.38, DRAW = 1.6;
const ptDelay = (recLevels - 1) * STEP + DRAW * 0.85;
const anim = (colors) => svgDoc(markBox(REC), markBody(REC, colors, { anim: true }));

const NOTES = {
  G3: 'The neatline and ticks settle the stripe-field risk: framed and ticked, the lines read as a cut map sheet, and the edge stops looking like the end of a pattern. The triangulation mark says "a surveyed position" more precisely than a dot and is still one orange point at small sizes, where it becomes a dot again. The ground is G1\u2019s, so the S reads first.',
};

const board = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>G · Valley: SafeAI.watch logo board</title>
<link rel="icon" href="${REC}-favicon.svg" type="image/svg+xml">
<style>
/*FONTS*/
:root { --paper: ${C.paper}; --ink: ${C.ink}; --cream: ${C.cream}; --dark: ${C.dark}; --ink-64: rgb(26 22 20 / .64); --ink-10: rgb(26 22 20 / .1); }
* { box-sizing: border-box; }
html { background: var(--paper); }
body { margin: 0; color: var(--ink); font: 15px/1.55 'F Geist', system-ui, sans-serif; }
main { max-width: 1360px; margin: 0 auto; padding: 48px 40px 96px; }
h1 { font: 400 44px/1.1 'F Newsreader', Georgia, serif; letter-spacing: -0.02em; margin: 0 0 12px; }
h2 { font: 400 28px/1.2 'F Newsreader', Georgia, serif; letter-spacing: -0.01em; margin: 64px 0 6px; }
h2 + p { margin: 0 0 22px; color: var(--ink-64); max-width: 80ch; }
.lede { max-width: 78ch; color: var(--ink-64); margin: 0; font-size: 17px; }
.cap, .lab { font: 500 11px/1.4 'F Mono', ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-64); }
.lab { align-self: center; }
.paper { background: #e3e2db; }
.dark { background: var(--dark); color: var(--cream); }
.dark .cap { color: rgb(244 244 231 / .6); }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
.card { margin: 0; }
.card .stage { display: flex; align-items: center; justify-content: center; height: 420px; border-radius: 6px; }
.card .mk { height: 340px; width: auto; }
.card .stage.dark { height: 220px; margin-top: 10px; }
.card .stage.dark .mk { height: 170px; }
.card figcaption { margin-top: 12px; font-size: 14px; color: var(--ink-64); max-width: 52ch; }
.card figcaption b { color: var(--ink); font-weight: 600; }
.card.rec .stage.paper { outline: 1px dashed var(--ink-64); outline-offset: -10px; }
.tag { font: 500 10px/1 'F Mono', monospace; text-transform: uppercase; letter-spacing: .08em; background: var(--ink); color: var(--cream); padding: 3px 6px; border-radius: 3px; vertical-align: 2px; }
.lrow, .srow, .mrow, .frow { display: grid; gap: 14px; margin-bottom: 14px; }
.lrow { grid-template-columns: 34px 1.5fr 1fr 1.5fr 1fr; }
.srow { grid-template-columns: 34px 1fr 1fr 1fr; }
.mrow { grid-template-columns: 34px 1fr 1fr; }
.frow { grid-template-columns: 34px 240px 240px 1fr 1fr; }
.tile { border-radius: 6px; display: flex; flex-direction: column; gap: 10px; align-items: center; justify-content: center; padding: 26px 20px; min-height: 160px; }
.tile.h .lk { height: 64px; width: auto; max-width: 100%; }
.tile.s .lk { height: 120px; width: auto; }
.tile.sm { min-height: 96px; padding: 18px; }
.tile.sm .lk { height: 28px; width: auto; }
.tabbar { display: flex; align-items: end; gap: 2px; padding: 10px 10px 0; border-radius: 6px; }
.tabbar.light { background: #dee1e6; }
.tabbar.dark { background: #202124; }
.tabx { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; border-radius: 8px 8px 0 0; font: 12px/1 system-ui, sans-serif; width: 150px; }
.tabx span { white-space: nowrap; }
.tabbar.light .tabx { background: #fff; color: #1f1f1f; }
.tabbar.dark .tabx { background: #35363a; color: #e8eaed; }
.tabbar .tabx.off { background: transparent; width: 84px; opacity: .55; }
.tabx i { margin-left: auto; font-style: normal; opacity: .6; }
.tabx svg { flex: none; }
.blank { width: 16px; height: 16px; border-radius: 50%; background: currentColor; opacity: .25; }
.fsizes { display: flex; align-items: end; gap: 22px; padding: 16px 22px; border-radius: 6px; }
.site { border-radius: 8px; overflow: hidden; background: var(--paper); box-shadow: 0 0 0 1px var(--ink-10); }
.nav { display: flex; align-items: center; gap: 28px; padding: 18px 32px; border-bottom: 1px dashed var(--ink-10); }
.nav .lk { height: 30px; width: auto; }
.nav a { color: var(--ink-64); text-decoration: none; font-size: 14px; }
.nav .sp { flex: 1; }
.hero { padding: 64px 32px 72px; display: grid; grid-template-columns: 1.3fr 1fr; gap: 48px; align-items: center; }
.hero h3 { font: 400 54px/1.1 'F Newsreader', Georgia, serif; letter-spacing: -0.037em; margin: 0 0 18px; }
.hero p { font: 400 21px/1.6 'F Geist', sans-serif; color: rgb(26 22 20 / .7); margin: 0; max-width: 40ch; }
.hero .side { display: flex; justify-content: center; }
.hero .side svg { height: 320px; width: auto; }
.animrow { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.anim { position: relative; height: 480px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.anim svg { height: 400px; width: auto; }
.replay { position: absolute; right: 14px; bottom: 14px; font: 500 11px/1 'F Mono', monospace; letter-spacing: .06em; text-transform: uppercase; background: none; border: 1px dashed currentColor; color: inherit; padding: 8px 10px; border-radius: 4px; cursor: pointer; opacity: .7; }
.anim path[pathLength] { stroke-dasharray: 1 1; }
.anim.play path[pathLength] { animation: draw ${DRAW}s cubic-bezier(.45,.05,.25,1) both; animation-delay: calc(var(--i) * ${STEP}s); }
.anim.play .neat { animation: fade 1.2s ease both; }
.anim.play .pt { animation: land .9s cubic-bezier(.2,.7,.25,1) ${ptDelay.toFixed(2)}s both; transform-box: fill-box; transform-origin: center; }
@keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes land { 0% { opacity: 0; transform: translateY(-12px) scale(.4); } 60% { opacity: 1; } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .anim.play path[pathLength], .anim.play .neat, .anim.play .pt { animation: none; } }
.notes { columns: 2; column-gap: 40px; max-width: 1100px; color: var(--ink-64); font-size: 14px; }
.notes p { margin: 0 0 10px; break-inside: avoid; }
.notes b { color: var(--ink); font-weight: 600; }
</style>
</head>
<body>
<main>
<h1>G · Valley</h1>
<p class="lede">The owner's pick from F: the S as a valley floor on a map sheet, the ground rising both ways from it. Three refinements. Every line is a contour of one elevation field: steep valley walls that ease outward, low hills in the open ground so the outer lines close or bend as terrain does instead of running on as stripes. Recommended: <b>${REC} · ${MARKS[REC].name}</b>.</p>

<h2>Three refinements</h2>
<p>Ink on paper, cream on the dark closing ground. Newsreader wordmark throughout (chosen in F).</p>
<div class="cards">
${cards}
</div>

<h2>Lockups</h2>
<p>Horizontal and stacked, outlined Newsreader 420, on paper ${C.paper} and dark ${C.dark}.</p>
${lockRows}

<h2>Small sizes</h2>
<p>Below 48 px the contours fill in, so the lockup swaps in the favicon's ink sheet (<code>G&lt;n&gt;-lockup-small.svg</code>). Each row at 28 px: full mark, small lockup on paper and dark.</p>
${smallRows}

<h2>Favicons</h2>
<p>The ink square with the valley cut out, one orange point (G3: the triangulation mark). Browser tabs at 16 px, then 16, 32 and 64 px on paper and dark. Real pixels.</p>
<section id="favicons" aria-label="Favicon">
${favRows}
</section>

<h2>One colour</h2>
<p>The point takes the line colour; the mark does not depend on the orange.</p>
${monoRows}

<h2>In the site header</h2>
<p>${REC}: small lockup at 30 px in the nav, the full sheet at hero size, Newsreader heading, Geist body.</p>
<div class="site">
  <div class="nav">${inline(L[`${REC}-small`], 'lk', 'SafeAI.watch')}<span class="sp"></span><a href="#">Record</a><a href="#">Coverage</a><a href="#">About</a></div>
  <div class="hero">
    <div><h3>Keeping watch on AI safety, one sourced entry at a time.</h3><p>Research, reported incidents, public warnings and policy. Each entry separates what happened, what the evidence shows and what remains uncertain.</p></div>
    <div class="side">${inline(markSVG(REC))}</div>
  </div>
</div>

<h2>Draw-on</h2>
<p>${REC}: contours rise from the valley floor outward, ${STEP}s apart${MARKS[REC].neat ? ', the neatline fades in with them' : ''}, and the point lands last. With reduced motion the mark shows complete.</p>
<div class="animrow">
  <div class="anim paper play" id="anim-paper">${inline(anim({ line: C.ink, dot: C.orange }))}<button class="replay" type="button">Replay</button></div>
  <div class="anim dark play" id="anim-dark">${inline(anim({ line: C.cream, dot: C.orange }))}<button class="replay" type="button">Replay</button></div>
</div>

<h2>Notes</h2>
<div class="notes">
<p><b>Why ${REC}.</b> ${NOTES[REC] || ''}</p>
<p><b>Stripe field.</b> No line is straight: the walls follow the S, the outer lines bend around low hills and close where the hill fits on the sheet. The longest near-parallel runs are on the left and right edges, where the shoulders run off the sheet; G2 breaks them most.</p>
<p><b>Small sizes.</b> The contours need about 64 px. Below 48 px the small lockup and favicon carry the idea as the valley cut from an ink sheet.</p>
<p><b>Construction.</b> Elevation = steep-then-easing wall from the valley floor + four low hills (+ seeded noise and an asymmetric wall in G2); marching squares; Catmull-Rom to cubic Beziers; lines traced past the sheet and cut flush by a clip path at the edge.</p>
</div>
</main>
<script>
for (const b of document.querySelectorAll('.replay')) b.addEventListener('click', () => { const a = b.parentElement; a.classList.remove('play'); void a.offsetWidth; a.classList.add('play'); });
</script>
</body>
</html>
`;

async function fontFaces(html) {
  const text = html.replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>|<svg[\s\S]*?<\/svg>|<[^>]+>/g, ' ');
  const chars = [...new Set(text + ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;·-()×\u2019')].join('');
  let css = '';
  for (const [family, key, range] of [['F Geist', 'geist', '100 900'], ['F Mono', 'mono', '100 900'], ['F Newsreader', 'serif', '200 800']]) {
    const buf = await subsetFont(readFileSync(FONTS + FILES[key]), chars, { targetFormat: 'woff2' });
    css += `@font-face { font-family: '${family}'; font-weight: ${range}; font-display: block; src: url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2'); }\n`;
  }
  return css;
}
out('board.html', board.replace('/*FONTS*/', await fontFaces(board)));
console.log('wrote marks, lockups, favicons, board.html');

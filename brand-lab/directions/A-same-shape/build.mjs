/* Direction A, Same shape: builds every SVG in this folder, and board.html,
   from one geometry.

   Run: node build.mjs [folder-with-node_modules]
   Needs fontkit and wawoff2. The logo-lab worktree has no node_modules, so they
   resolve from a sibling worktree by default:
   C:/Users/Home/CoreWise/SafeAI.Watch-worktrees/about-film/

   Geometry, in mark units (mark box 10 wide, 12 tall):
     band t = 1.5; runs at y 0-1.5, 5.25-6.75, 10.5-12; counters 3.75.
     Bends: inner radius 0.5, outer radius t + 0.5 = 2, concentric, so the band
     keeps its width through each turn.
     One half = top run + left drop + half the middle run (the spine).
     The other half is the same outline turned 180 degrees about the centre (5, 6).
     The seam lies on the diagonal from the top terminal's outer corner (10, 0)
     to the bottom terminal's outer corner (0, 12). That line passes through the
     centre, so it maps onto itself under the turn and the halves meet flush.
     Seam gap 0.24 (square to the seam) in every version drawn from the master.
*/
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const MODS = (process.argv[2] || 'C:/Users/Home/CoreWise/SafeAI.Watch-worktrees/about-film/').replace(/\/?$/, '/');
const require = createRequire(MODS + 'package.json');
const fontkit = require('fontkit');
const wawoff2 = require('wawoff2');

const C = {
  ink: '#1a1614',
  paper: '#d7d7d0',
  cream: '#f4f4e7',
  dark: '#181a15',
  orange: '#ff7733',
};

const r = (n) => {
  const v = Math.round(n * 1000) / 1000;
  return String(Object.is(v, -0) ? 0 : v);
};
const nums = (s) => s.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => r(Number(n)));

/* ---------- the half ---------- */

const W = 10, H = 12, T = 1.5, RI = 0.5, GAP = 0.24;
const CX = W / 2, CY = H / 2;
const seamX = (y) => W - (W / H) * y; // the terminal-to-terminal diagonal
const seamCos = H / Math.hypot(W, H); // the seam normal against the x axis
const shiftFor = (gap) => gap / 2 / seamCos; // horizontal shift for a square gap

/* Ink half. gap = clear space across the seam (0 = halves touch). */
function halfPath(gap = GAP) {
  const s = shiftFor(gap);
  const yt = CY - T / 2, yb = CY + T / 2; // spine top and bottom
  const RO = T + RI;
  return nums(
    `M${W} 0H${RO}A${RO} ${RO} 0 0 0 0 ${RO}V${yb - RO}A${RO} ${RO} 0 0 0 ${RO} ${yb}` +
      `H${seamX(yb) - s}L${seamX(yt) - s} ${yt}` +
      `H${T + RI}A${RI} ${RI} 0 0 1 ${T} ${yt - RI}V${T + RI}A${RI} ${RI} 0 0 1 ${T + RI} ${T}H${W}Z`,
  );
}
const HALF = halfPath();
const TURN = `rotate(180 ${CX} ${CY})`;

/* spin = true tags the turned half for the board's CSS animation */
const markBody = (a = C.ink, b = C.orange, spin = false) =>
  `<path fill="${a}" d="${HALF}"/><path${spin ? ' class="b"' : ''} fill="${b}" d="${HALF}" transform="${TURN}"/>`;

/* ---------- favicon: whole pixels on a 16 grid ---------- */
/* The master lands on fractional pixels at 16 px and blurs, so the favicon is
   redrawn: mark x 2-14, y 0-16; top and bottom runs 3 px, spine 4 px (the usual
   optical correction for an S), counters 3 px, drops 3 px wide, outer bends
   radius 3 on sharp inner corners, no seam gap. Seam on the same diagonal. */
function faviconHalf() {
  const x0 = 2, w = 12, h = 16, t = 3, yt = 6, yb = 10;
  const sx = (y) => x0 + w - (w / h) * y;
  return nums(
    `M${x0 + w} 0H${x0 + t}A${t} ${t} 0 0 0 ${x0} ${t}V${yb - t}A${t} ${t} 0 0 0 ${x0 + t} ${yb}` +
      `H${sx(yb)}L${sx(yt)} ${yt}H${x0 + t}V${t}H${x0 + w}Z`,
  );
}
const FAV = faviconHalf();
const favBody = (a, b) => `<path fill="${a}" d="${FAV}"/><path fill="${b}" d="${FAV}" transform="rotate(180 8 8)"/>`;

/* ---------- type: outlines from the site's OFL fonts ---------- */

async function loadFont(file, axes) {
  const ttf = Buffer.from(await wawoff2.decompress(readFileSync(MODS + 'node_modules/@fontsource-variable/' + file)));
  return fontkit.create(ttf).getVariation(axes);
}
// Newsreader at display optical size, a touch above regular so it holds beside the mark's band
const serif = await loadFont('newsreader/files/newsreader-latin-opsz-normal.woff2', { wght: 460, opsz: 48 });

function outline(font, text, { size, x = 0, y = 0, tracking = 0 }) {
  const run = font.layout(text);
  const k = size / font.unitsPerEm;
  let pen = 0;
  const parts = [];
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i];
    const d = g.path.transform(k, 0, 0, -k, x + (pen + p.xOffset) * k, y - p.yOffset * k).toSVG();
    if (d) parts.push(nums(d));
    pen += p.xAdvance;
    if (i < run.glyphs.length - 1) pen += tracking * font.unitsPerEm;
  });
  return { d: parts.join(''), width: pen * k, capH: (font.capHeight / font.unitsPerEm) * size };
}

/* The name: one face, one weight, one colour. The mark carries the idea. */
const NAME = 'SafeAI.watch';
const TRACK = -0.012;
const SIZE = 48;

/* Horizontal: mark height = 1.5 x cap height, centred on the cap band;
   mark-to-name space = one counter (3.75 units). */
function lockupH({ a = C.ink, b = C.orange, text = C.ink, spin = false } = {}) {
  const capH = outline(serif, NAME, { size: SIZE }).capH;
  const mh = capH * 1.5, u = mh / H, mw = W * u, gap = 3.75 * u;
  const base = mh / 2 + capH / 2;
  const word = outline(serif, NAME, { size: SIZE, x: mw + gap, y: base, tracking: TRACK });
  return {
    w: mw + gap + word.width,
    h: mh,
    body: `<g transform="scale(${r(u)})">${markBody(a, b, spin)}</g><path fill="${text}" d="${word.d}"/>`,
  };
}

/* Stacked: mark height = 3 x cap height, name centred below,
   mark-to-cap-line space = one counter. */
function lockupS({ a = C.ink, b = C.orange, text = C.ink } = {}) {
  const probe = outline(serif, NAME, { size: SIZE, tracking: TRACK });
  const capH = probe.capH;
  const mh = capH * 3, u = mh / H, mw = W * u;
  const w = Math.max(probe.width, mw);
  const base = mh + 3.75 * u + capH;
  const word = outline(serif, NAME, { size: SIZE, x: (w - probe.width) / 2, y: base, tracking: TRACK });
  return {
    w,
    h: base,
    body: `<g transform="translate(${r((w - mw) / 2)} 0) scale(${r(u)})">${markBody(a, b)}</g><path fill="${text}" d="${word.d}"/>`,
  };
}

const svg = (w, h, body, size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(w)} ${r(h)}"` +
  (size ? ` width="${size[0]}" height="${size[1]}"` : ` width="${r(w)}" height="${r(h)}"`) +
  ` role="img" aria-label="SafeAI.watch">${body}</svg>`;

/* ---------- files ---------- */

const out = (name, s) => writeFileSync(HERE + name, s + (s.endsWith('\n') ? '' : '\n'));

out('mark.svg', svg(W, H, markBody(), [100, 120]));
out('mark-mono.svg', svg(W, H, markBody(C.ink, C.ink), [100, 120]));
const LH = lockupH(), LHm = lockupH({ b: C.ink }), LS = lockupS();
out('lockup-horizontal.svg', svg(LH.w, LH.h, LH.body));
out('lockup-horizontal-mono.svg', svg(LHm.w, LHm.h, LHm.body));
out('lockup-stacked.svg', svg(LS.w, LS.h, LS.body));
out(
  'favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">` +
    `<style>.a{fill:${C.ink}}.b{fill:${C.orange}}@media (prefers-color-scheme:dark){.a{fill:${C.cream}}}</style>` +
    `<path class="a" d="${FAV}"/><path class="b" d="${FAV}" transform="rotate(180 8 8)"/></svg>`,
);

/* ---------- board.html ---------- */

const inline = (w, h, body, attrs = '') => `<svg viewBox="0 0 ${r(w)} ${r(h)}" ${attrs} aria-hidden="true">${body}</svg>`;
const mk = (a, b, attrs, spin) => inline(W, H, markBody(a, b, spin), attrs);
const fav = (a, b, px) => `<svg viewBox="0 0 16 16" width="${px}" height="${px}" aria-hidden="true">${favBody(a, b)}</svg>`;
const lh = (o, attrs) => { const l = lockupH(o); return inline(l.w, l.h, l.body, attrs); };
const ls = (o, attrs) => { const l = lockupS(o); return inline(l.w, l.h, l.body, attrs); };
const DARK = { a: C.cream, text: C.cream };

// construction drawing: unit grid, the seam diagonal, the centre of the turn
const construct = (() => {
  let g = '';
  for (let x = 0; x <= W; x += 0.5) g += `<line x1="${x}" y1="-.6" x2="${x}" y2="${H + 0.6}" class="${x % 1 ? 'g2' : 'g1'}"/>`;
  for (let y = 0; y <= H; y += 0.5) g += `<line x1="-.6" y1="${y}" x2="${W + 0.6}" y2="${y}" class="${y % 1 ? 'g2' : 'g1'}"/>`;
  return (
    `<svg class="construct" viewBox="-2.2 -1.4 16.4 14.8" aria-hidden="true">` +
    markBody() + g +
    `<line x1="${W + 0.5}" y1="-0.6" x2="-0.5" y2="${H + 0.6}" class="seam"/>` +
    `<path d="M${CX + 1.5} ${CY} A1.5 1.5 0 0 1 ${CX - 1.5} ${CY}" class="arc"/>` +
    `<circle cx="${CX}" cy="${CY}" r=".2" class="ctr"/>` +
    `<text x="10.7" y="1.05" class="lbl">t 1.5</text>` +
    `<text x="10.7" y="3.6" class="lbl">counter</text><text x="10.7" y="4.15" class="lbl">3.75</text>` +
    `<text x="10.7" y="6.2" class="lbl">spine</text>` +
    `<text x="10.7" y="-.5" class="lbl">(10, 0)</text><text x="-2.1" y="13" class="lbl">(0, 12)</text>` +
    `<text x="${CX - 1.1}" y="${CY + 2.3}" class="lbl">180°</text>` +
    `</svg>`
  );
})();

// the 16 px favicon on its pixel grid
const favGrid = (() => {
  let g = '';
  for (let i = 0; i <= 16; i++) g += `<line x1="${i}" y1="0" x2="${i}" y2="16" class="px"/><line x1="0" y1="${i}" x2="16" y2="${i}" class="px"/>`;
  return `<svg class="favgrid" viewBox="0 0 16 16" aria-hidden="true"><rect width="16" height="16" fill="#fff"/>${favBody(C.ink, C.orange)}${g}</svg>`;
})();

const FONT = (pkg, file) =>
  `url('../../../node_modules/@fontsource-variable/${pkg}/files/${file}') format('woff2'), ` +
  `url('../../../../about-film/node_modules/@fontsource-variable/${pkg}/files/${file}') format('woff2')`;

const tab = (dark) => `
          <div class="tab ${dark ? 'tab-dark' : ''}">${fav(dark ? C.cream : C.ink, C.orange, 16)}<span>SafeAI.watch · AI safety, from the source</span></div>`;

const board = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SafeAI.watch logo lab · A, Same shape</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<!-- Generated by build.mjs. Edit the script, not this file. -->
<style>
@font-face { font-family: 'Geist Variable'; font-weight: 100 900; font-display: block; src: ${FONT('geist', 'geist-latin-wght-normal.woff2')}; }
@font-face { font-family: 'Geist Mono Variable'; font-weight: 100 900; font-display: block; src: ${FONT('geist-mono', 'geist-mono-latin-wght-normal.woff2')}; }
@font-face { font-family: 'Newsreader Variable'; font-weight: 200 800; font-display: block; src: ${FONT('newsreader', 'newsreader-latin-opsz-normal.woff2')}; }
:root {
  --ink: ${C.ink}; --paper: ${C.paper}; --cream: ${C.cream}; --dark: ${C.dark}; --orange: ${C.orange};
  --ink-70: rgb(26 22 20 / .7); --ink-64: rgb(26 22 20 / .64); --ink-34: rgb(26 22 20 / .34); --ink-10: rgb(26 22 20 / .1);
  --cream-85: rgb(244 244 231 / .85); --cream-60: rgb(244 244 231 / .6); --cream-40: rgb(244 244 231 / .4);
  --sans: 'Geist Variable', ui-sans-serif, system-ui, sans-serif;
  --mono: 'Geist Mono Variable', ui-monospace, monospace;
  --serif: 'Newsreader Variable', Georgia, serif;
  --ease-io: cubic-bezier(0.65, 0, 0.35, 1);
}
* { box-sizing: border-box; }
html { background: var(--paper); color: var(--ink); }
body { margin: 0; font: 16px/1.5 var(--sans); -webkit-font-smoothing: antialiased; }
svg { display: block; }
code { font: 13px var(--mono); }
.wrap { max-width: 1280px; margin: 0 auto; padding: 56px 48px 96px; }
.eyebrow { font: 500 11px/1.2 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-64); margin: 0 0 14px; }
.dark .eyebrow { color: var(--cream-60); }
h1.title { font: 400 76px/1 var(--serif); letter-spacing: -.02em; margin: 0 0 18px; }
p.lead { font: 400 24px/1.3 var(--serif); color: var(--ink-70); max-width: 780px; margin: 0; }
h2 { font: 400 32px/1.1 var(--serif); letter-spacing: -.01em; margin: 0 0 8px; }
.note { color: var(--ink-70); font-size: 14px; max-width: 680px; margin: 0 0 22px; }
section { margin-top: 80px; }
.frame { position: relative; outline: 1px dashed var(--ink-10); outline-offset: -1px; }
.frame::before, .frame::after { content: ''; position: absolute; width: 7px; height: 7px; border-color: var(--ink); border-style: solid; }
.frame::before { top: 0; left: 0; border-width: 1px 0 0 1px; }
.frame::after { bottom: 0; right: 0; border-width: 0 1px 1px 0; }
.dark { background: var(--dark); color: var(--cream); }
.dark.frame { outline-color: var(--cream-40); }
.dark.frame::before, .dark.frame::after { border-color: var(--cream); }
.row { display: grid; gap: 24px; }
.c3 { grid-template-columns: 1fr 1fr 1fr; }
.c2 { grid-template-columns: 1fr 1fr; }
.c4 { grid-template-columns: repeat(4, 1fr); }
.cell { padding: 32px; display: flex; flex-direction: column; justify-content: space-between; gap: 24px; min-height: 200px; }
.cap { font: 500 10px/1.3 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-64); }
.dark .cap { color: var(--cream-60); }
.hero-mark { height: 340px; width: auto; margin: 0 auto; }
.construct { height: 340px; width: auto; margin: 0 auto; overflow: visible; }
.construct .g1 { stroke: rgb(26 22 20 / .28); stroke-width: .025; }
.construct .g2 { stroke: rgb(26 22 20 / .1); stroke-width: .02; }
.construct .seam { stroke: var(--ink); stroke-width: .045; stroke-dasharray: .22 .16; }
.construct .ctr { fill: var(--paper); stroke: var(--ink); stroke-width: .06; }
.construct .arc { fill: none; stroke: var(--ink); stroke-width: .05; }
.construct .lbl { font: 500 .44px var(--mono); fill: var(--ink-70); }
.halves { display: flex; align-items: center; justify-content: center; gap: 22px; }
.halves svg { height: 170px; width: auto; }
.halves .op { font: 400 36px var(--serif); color: var(--ink-64); }
.lock-h { height: 84px; width: auto; }
.lock-s { height: 250px; width: auto; }
.sizes { display: flex; align-items: flex-end; gap: 28px; }
.sizes svg { width: auto; }
.tabs { display: flex; flex-direction: column; gap: 10px; }
.tab { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; max-width: 330px; border-radius: 9px 9px 0 0; background: #f7f7f5; font: 400 12px/1 system-ui, sans-serif; color: #222; }
.tab-dark { background: #35363a; color: #e8e8e8; }
.favs { display: flex; align-items: flex-end; gap: 30px; }
.favs figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.favgrid { width: 224px; height: 224px; margin: 0 auto; }
.favgrid .px { stroke: rgb(0 0 0 / .14); stroke-width: .03; }
.site { overflow: hidden; }
.nav { display: flex; align-items: center; justify-content: space-between; height: 76px; padding: 0 32px; }
.nav .links { display: flex; gap: 26px; font: 500 14px/1.5 var(--sans); }
.site .hero { padding: 56px 32px 64px; max-width: 900px; }
.site h3 { font: 400 54px/1.1 var(--serif); letter-spacing: -.037em; margin: 0 0 20px; }
.site .lede { font: 400 24px/1.2 var(--serif); color: var(--ink-70); margin: 0 0 18px; max-width: 700px; }
.site .body { font: 400 16px/1.5 var(--sans); color: var(--ink-70); max-width: 620px; margin: 0; }
.dark .lede { color: var(--cream-85); }
.dark .body { color: var(--cream-60); }
.site .rule { height: 1px; background: var(--ink-10); margin: 0 32px; }
.dark .rule { background: rgb(244 244 231 / .12); }
/* Motion: the orange half starts on the ink half (same outline) and turns 180 degrees about the centre. */
.b { transform-box: view-box; transform-origin: ${CX}px ${CY}px; }
.loop, .once { overflow: visible; }
.loop .b { animation: loop 8s var(--ease-io) infinite; }
@keyframes loop {
  0%, 14% { transform: rotate(0deg); }
  42%, 74% { transform: rotate(180deg); }
  100% { transform: rotate(360deg); }
}
.once .b { animation: land 1.4s var(--ease-io) .5s both; }
@keyframes land { from { transform: rotate(0deg); } to { transform: rotate(180deg); } }
@media (prefers-reduced-motion: reduce) {
  .loop .b, .once .b { animation: none; transform: rotate(180deg); }
}
button.replay { font: 500 11px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; background: none; border: 1px solid var(--cream-40); color: var(--cream); padding: 8px 12px; border-radius: 999px; cursor: pointer; }
</style>
</head>
<body>
<main class="wrap">
  <p class="eyebrow">Logo lab · Direction A</p>
  <h1 class="title">Same shape</h1>
  <p class="lead">Two identical halves, one turned 180 degrees, lock into an S. One is ink and one is orange: the benefit and the danger come from the same capability, and neither half is the whole mark.</p>

  <section>
    <div class="row c3">
      <div class="cell frame"><span class="cap">Mark</span>${mk(C.ink, C.orange, 'class="hero-mark"')}</div>
      <div class="cell frame"><span class="cap">Construction · 10 × 12 units · bends r 0.5 and 2</span>${construct}</div>
      <div class="cell frame"><span class="cap">One outline, drawn twice</span>
        <div class="halves">
          ${inline(W, H, `<path fill="${C.ink}" d="${HALF}"/>`)}
          <span class="op">+</span>
          ${inline(W, H, `<path fill="${C.orange}" d="${HALF}" transform="${TURN}"/>`)}
        </div>
        <p class="note" style="margin:0">The orange half is the ink half turned about the centre. The seam runs on the diagonal that joins the two free ends, which passes through the centre and maps onto itself under the turn, so the halves meet flush. Gap 0.24 units.</p>
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">Lockups</p>
    <h2>Horizontal and stacked</h2>
    <p class="note">Name in Newsreader (weight 460, optical size 48), converted to outlines. Horizontal: mark 1.5 × cap height, centred on the caps, one counter of space. Stacked: mark 3 × cap height, one counter above the cap line.</p>
    <div class="row c2">
      <div class="cell frame" style="justify-content:center;min-height:320px">${lh({}, 'class="lock-h"')}</div>
      <div class="cell frame" style="align-items:center;justify-content:center">${ls({}, 'class="lock-s"')}</div>
    </div>
  </section>

  <section>
    <p class="eyebrow">Grounds</p>
    <h2>Paper and the closing dark</h2>
    <p class="note">On dark, ink becomes cream <code>${C.cream}</code> and the orange half stays. Orange is the only accent.</p>
    <div class="row c2">
      <div class="cell frame" style="gap:44px;align-items:flex-start">
        <span class="cap">Paper ${C.paper}</span>
        ${lh({}, 'class="lock-h" style="height:60px"')}
        ${ls({}, 'class="lock-s" style="height:170px"')}
      </div>
      <div class="cell frame dark" style="gap:44px;align-items:flex-start">
        <span class="cap">Dark ${C.dark}</span>
        ${lh(DARK, 'class="lock-h" style="height:60px"')}
        ${ls(DARK, 'class="lock-s" style="height:170px"')}
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">One colour</p>
    <h2>Where only one ink is allowed</h2>
    <p class="note">The seam gap keeps the two halves readable without colour. The favicon drops the gap and reads as a plain S.</p>
    <div class="row c4">
      <div class="cell frame"><span class="cap">Ink</span>${mk(C.ink, C.ink, 'style="height:150px;width:auto"')}</div>
      <div class="cell frame dark"><span class="cap">Cream</span>${mk(C.cream, C.cream, 'style="height:150px;width:auto"')}</div>
      <div class="cell frame" style="grid-column: span 2"><span class="cap">Ink lockup · mark at 16, 24, 32, 48, 72 px</span>
        ${lh({ b: C.ink }, 'class="lock-h" style="height:56px"')}
        <div class="sizes">
          ${[16, 24, 32, 48, 72].map((px) => mk(C.ink, C.orange, `style="height:${px}px"`)).join('\n          ')}
        </div>
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">Favicon</p>
    <h2>16, 32 and 64 pixels</h2>
    <p class="note">Redrawn on whole pixels: runs 3 px, spine 4 px, counters 3 px, no seam gap. <code>favicon.svg</code> switches ink to cream under <code>prefers-color-scheme: dark</code>.</p>
    <div class="row c3">
      <div class="cell frame">
        <span class="cap">Actual size, on paper</span>
        <div class="favs">
          <figure>${fav(C.ink, C.orange, 16)}<span class="cap">16</span></figure>
          <figure>${fav(C.ink, C.orange, 32)}<span class="cap">32</span></figure>
          <figure>${fav(C.ink, C.orange, 64)}<span class="cap">64</span></figure>
          <figure><img src="favicon.svg" width="16" height="16" alt=""><span class="cap">file</span></figure>
        </div>
        <span class="cap">On dark</span>
        <div class="favs dark" style="padding:16px">
          <figure>${fav(C.cream, C.orange, 16)}<span class="cap">16</span></figure>
          <figure>${fav(C.cream, C.orange, 32)}<span class="cap">32</span></figure>
          <figure>${fav(C.cream, C.orange, 64)}<span class="cap">64</span></figure>
        </div>
      </div>
      <div class="cell frame">
        <span class="cap">Browser tabs, 16 px</span>
        <div class="tabs" style="flex:1;justify-content:center">${tab(false)}${tab(true)}
        </div>
      </div>
      <div class="cell frame"><span class="cap">The 16 px grid, drawn at 14 ×</span>${favGrid}</div>
    </div>
  </section>

  <section>
    <p class="eyebrow">In use</p>
    <h2>Beside the site's type</h2>
    <p class="note">Nav lockup 28 px tall; heading Newsreader 54 px, lede Newsreader 24 px, body Geist 16 px, as on the site today. Header copy is placeholder text written from the site's stated method.</p>
    <div class="row">
      <div class="site frame">
        <div class="nav">
          ${lh({}, 'style="height:28px;width:auto"')}
          <div class="links"><span>Latest</span><span>Coverage</span><span>About</span></div>
        </div>
        <div class="rule"></div>
        <div class="hero">
          <p class="eyebrow">AI safety and security, for general readers</p>
          <h3>Hold both at once.</h3>
          <p class="lede">The same capabilities bring the benefit and the danger. Each entry links its original source.</p>
          <p class="body">Every entry separates what happened, what the evidence shows, and what remains uncertain.</p>
        </div>
      </div>
      <div class="site frame dark">
        <div class="nav">
          ${lh(DARK, 'style="height:28px;width:auto"')}
          <div class="links"><span>Latest</span><span>Coverage</span><span>About</span></div>
        </div>
        <div class="rule"></div>
        <div class="hero">
          <h3>Understand it, rather than fear it or dismiss it.</h3>
          <p class="body">No camps. Every claim goes back to where it was first made.</p>
        </div>
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">Motion</p>
    <h2>The turn</h2>
    <p class="note">The orange half starts on top of the ink half, the same outline, then turns 180 degrees about the centre into place. On the site it runs once on first load (right: 1.4 s, the site's ease-in-out curve); the loop on the left is for this board. Under <code>prefers-reduced-motion: reduce</code> both show the finished mark.</p>
    <div class="row c2">
      <div class="cell frame" style="align-items:center">${mk(C.ink, C.orange, 'class="loop" style="height:320px;width:auto"', true)}</div>
      <div class="cell frame dark" style="justify-content:center;gap:40px">
        <div id="once">${(() => { const l = lockupH({ ...DARK, spin: true }); return inline(l.w, l.h, l.body, 'class="once" style="height:72px;width:auto"'); })()}</div>
        <div><button class="replay" type="button">Replay</button></div>
      </div>
    </div>
  </section>
</main>
<script>
  document.querySelector('.replay').addEventListener('click', () => {
    const s = document.querySelector('#once svg');
    s.classList.remove('once');
    void s.getBoundingClientRect();
    s.classList.add('once');
  });
</script>
</body>
</html>
`;
out('board.html', board);
console.log(JSON.stringify({ half: HALF, fav: FAV, lockH: [r(LH.w), r(LH.h)], lockS: [r(LS.w), r(LS.h)] }));

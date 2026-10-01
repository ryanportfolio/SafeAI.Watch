/* Direction C, Evidence line: builds mark.svg, lockup-horizontal.svg,
   lockup-stacked.svg, favicon.svg and board.html in this folder.

   Run: node build.mjs   (from anywhere; fonts and fontkit come from the first
   node_modules found in the list below)

   Text is converted to outlines with fontkit, as scripts/brand/build-brand.mjs does.
*/
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LAB = join(HERE, '..', '..', '..'); // logo-lab worktree root
const CANDIDATES = [join(LAB, 'node_modules'), join(LAB, '..', 'about-film', 'node_modules')];
const NM = CANDIDATES.find((p) => existsSync(join(p, 'fontkit')));
if (!NM) throw new Error('need fontkit + wawoff2 + @fontsource-variable/* in one of: ' + CANDIDATES.join(', '));
const require = createRequire(join(NM, 'x.js'));
const fontkit = require('fontkit');
const wawoff2 = require('wawoff2');

/* ---------- tokens ---------- */
const C = {
  ink: '#1a1614',
  paper: '#d7d7d0',
  cream: '#f4f4e7',
  dark: '#181a15',
  orange: '#ff7733',
};

/* ---------- fonts ---------- */
const FONTS = join(NM, '@fontsource-variable');
async function loadFont(rel, axes) {
  const ttf = Buffer.from(await wawoff2.decompress(readFileSync(join(FONTS, rel))));
  return fontkit.create(ttf).getVariation(axes);
}
const serif = await loadFont('newsreader/files/newsreader-latin-opsz-normal.woff2', { wght: 450, opsz: 60 });

const r2 = (n) => Math.round(n * 100) / 100;
const round = (s) =>
  s.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => {
    const v = r2(Number(n));
    return String(Object.is(v, -0) ? 0 : v);
  });

function outline(font, text, { size, x = 0, y = 0, tracking = 0 }) {
  const run = font.layout(text);
  const k = size / font.unitsPerEm;
  let pen = 0;
  const parts = [];
  let minX = Infinity;
  let maxX = -Infinity;
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const ox = x + (pen + pos.xOffset) * k;
    const oy = y - pos.yOffset * k;
    const d = glyph.path.transform(k, 0, 0, -k, ox, oy).toSVG();
    if (d) {
      parts.push(round(d));
      const bb = glyph.path.bbox;
      minX = Math.min(minX, ox + bb.minX * k);
      maxX = Math.max(maxX, ox + bb.maxX * k);
    }
    pen += pos.xAdvance;
    if (i < run.glyphs.length - 1) pen += tracking * font.unitsPerEm;
  });
  return { d: parts.join(''), advance: pen * k, minX, maxX };
}

/* ---------- the evidence line ----------
   One stroke of width w, cut into three equal runs of 9w:
     happened   solid                      ink 9/9
     evidence   dash 2w, gap 1w  (x3)      ink 6/9
     uncertain  dot  1w, gap 2w  (x3)      ink 3/9
   Each run carries one third less ink than the one before. The start is a
   tick 7w tall (the dated moment the record begins). Grid: 27w x 7w. */
const W = 1;
const LINE = [
  { run: 'happened', x: 0, len: 9 },
  { run: 'evidence', x: 10, len: 2 },
  { run: 'evidence', x: 13, len: 2 },
  { run: 'evidence', x: 16, len: 2 },
  { run: 'uncertain', x: 20, len: 1 },
  { run: 'uncertain', x: 23, len: 1 },
  { run: 'uncertain', x: 26, len: 1 },
];
const MARK_W = 27;
const MARK_H = 7;

/* Mark as rects on its own grid (origin top-left, units of w).
   opts.tick / opts.line: fill colours; opts.cls adds classes for the board animation. */
function markRects({ x = 0, y = 0, w = 1, tick = C.ink, line = C.ink, cls = false } = {}) {
  const R = (rx, ry, rw, rh, fill, c) =>
    `<rect${cls ? ` class="${c}"` : ''} x="${r2(x + rx * w)}" y="${r2(y + ry * w)}" width="${r2(rw * w)}" height="${r2(rh * w)}" fill="${fill}"/>`;
  let out = '';
  LINE.forEach((s, i) => {
    out += R(s.x, 3, s.len, 1, line, `seg seg-${s.run} s${i}`);
  });
  out += R(0, 0, 1, MARK_H, tick, 'tick');
  return out;
}

const svgDoc = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(w)}" height="${r2(h)}" viewBox="0 0 ${r2(w)} ${r2(h)}"${extra}>${body}</svg>\n`;

/* ---------- mark.svg ---------- */
const MARK_SCALE = 8; // 216 x 56
const markSvg = (colors) => svgDoc(MARK_W * MARK_SCALE, MARK_H * MARK_SCALE, markRects({ w: MARK_SCALE, ...colors }));

/* ---------- horizontal lockup ----------
   Font size S. Tick height = cap height H, so the tick runs baseline to cap line
   and w = H / 7. The line sits at half cap height. Gap mark-to-name = 4w
   measured to the S's ink, so the last dot and the S sit 2 dot-gaps apart. */
const S = 100;
const H = (serif.capHeight / serif.unitsPerEm) * S;
const wH = H / 7;
const NAME = 'SafeAI.watch';
const nameProbe = outline(serif, NAME, { size: S });
const desc = (-serif.descent / serif.unitsPerEm) * S;

function horizontal({ tick = C.ink, line = C.ink, text = C.ink, cls = false } = {}) {
  const pad = 0;
  const top = pad;
  const baseline = top + H;
  const markX = pad;
  const nameX = markX + MARK_W * wH + 4 * wH - nameProbe.minX;
  const name = outline(serif, NAME, { size: S, x: nameX, y: baseline });
  const width = name.maxX + pad;
  const height = baseline + 0.02 * S; // no descenders in the name; keep a hair for overshoot
  const body = markRects({ x: markX, y: top, w: wH, tick, line, cls }) + `<path${cls ? ' class="name"' : ''} fill="${text}" d="${name.d}"/>`;
  return { width, height, body };
}

/* ---------- stacked lockup ----------
   The same parts as the horizontal lockup at the same scale (w = H / 7),
   turned from beside to under: name on top, the mark below it, both on one
   left edge (the S's ink). Name baseline to tick top = 4w, the same gap the
   horizontal lockup keeps between the last dot and the S. */
function stacked({ tick = C.ink, line = C.ink, text = C.ink, cls = false } = {}) {
  const name = outline(serif, NAME, { size: S, x: 0, y: 0 });
  const inkW = name.maxX - name.minX;
  const baseline = H;
  const nameSvg = outline(serif, NAME, { size: S, x: -name.minX, y: baseline });
  const lineTop = baseline + 4 * wH;
  const body =
    `<path${cls ? ' class="name"' : ''} fill="${text}" d="${nameSvg.d}"/>` +
    markRects({ x: 0, y: lineTop, w: wH, tick, line, cls });
  return { width: inkW, height: lineTop + MARK_H * wH, body, w: wH };
}

/* ---------- favicon ----------
   Drawn on a 16 px grid, integer edges so 16 and 32 render crisp.
   Monoline at 3 px. Condensed rule: tick, solid 7, dash 3, dot 2;
   gaps grow 1 -> 2, so ink still thins left to right. */
const FAV = [
  // x, y, w, h
  { c: 'tick', r: [1, 2, 3, 11] },
  { c: 'seg', r: [1, 6, 7, 3] },
  { c: 'seg', r: [9, 6, 3, 3] },
  { c: 'seg', r: [14, 6, 2, 3] },
];
const favRects = (fill, tickFill = fill, cls = false) =>
  FAV.map(({ c, r: [x, y, w, h] }) => `<rect${cls ? ` class="${c}"` : ''} x="${x}" y="${y}" width="${w}" height="${h}" fill="${c === 'tick' ? tickFill : fill}"/>`).join('');

/* ---------- write files ---------- */
const out = (name, data) => writeFileSync(join(HERE, name), data);

out('mark.svg', markSvg({}));
{
  const h = horizontal();
  out('lockup-horizontal.svg', svgDoc(h.width, h.height, h.body));
  const s = stacked();
  out('lockup-stacked.svg', svgDoc(s.width, s.height, s.body));
}
out(
  'favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><style>rect{fill:${C.ink}}@media (prefers-color-scheme:dark){rect{fill:${C.cream}}}</style>${favRects(C.ink)}</svg>\n`,
);

/* ---------- board ---------- */
const inline = ({ width, height, body }, extra = '') =>
  `<svg viewBox="0 0 ${r2(width)} ${r2(height)}" ${extra}>${body}</svg>`;
const cur = { tick: 'currentColor', line: 'currentColor', text: 'currentColor' };
const acc = { tick: 'var(--accent)', line: 'currentColor', text: 'currentColor' };
const markObj = (colors, w = 1) => ({ width: MARK_W, height: MARK_H, body: markRects({ w, ...colors }) });
const favObj = (fill, tick = fill, cls = false) => ({ width: 16, height: 16, body: favRects(fill, tick, cls) });

const H1 = horizontal(acc);
const H1c = horizontal(cur);
const ST = stacked(acc);
const STc = stacked(cur);

const fontRel = (p) => {
  // try the worktree's own node_modules first, then the about-film checkout
  const a = `../../../node_modules/@fontsource-variable/${p}`;
  const b = `../../../../about-film/node_modules/@fontsource-variable/${p}`;
  return `url('${a}') format('woff2'), url('${b}') format('woff2')`;
};

const board = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SafeAI.watch logo lab: C, Evidence line</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
@font-face { font-family: 'Newsreader Variable'; font-style: normal; font-weight: 200 800; src: ${fontRel('newsreader/files/newsreader-latin-opsz-normal.woff2')}; }
@font-face { font-family: 'Newsreader Variable'; font-style: italic; font-weight: 200 800; src: ${fontRel('newsreader/files/newsreader-latin-opsz-italic.woff2')}; }
@font-face { font-family: 'Geist Variable'; font-weight: 100 900; src: ${fontRel('geist/files/geist-latin-wght-normal.woff2')}; }
@font-face { font-family: 'Geist Mono Variable'; font-weight: 100 900; src: ${fontRel('geist-mono/files/geist-mono-latin-wght-normal.woff2')}; }
:root {
  --paper: ${C.paper}; --ink: ${C.ink}; --cream: ${C.cream}; --dark: ${C.dark}; --accent: ${C.orange};
  --ink-64: rgb(26 22 20 / .64); --ink-10: rgb(26 22 20 / .1);
  --ease-out: cubic-bezier(0.4, 0, 0.2, 1); --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --serif: 'Newsreader Variable', Georgia, serif; --sans: 'Geist Variable', system-ui, sans-serif; --mono: 'Geist Mono Variable', ui-monospace, monospace;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.5 var(--sans); }
main { width: min(1280px, 100% - 60px); margin: 0 auto; padding: 56px 0 120px; }
svg { display: block; overflow: visible; }
.eyebrow { font: 500 10px/1.2 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-64); margin: 0 0 14px; }
.dark .eyebrow { color: rgb(244 244 231 / .6); }
h1.title { font: 400 44px/1.1 var(--serif); letter-spacing: -.02em; margin: 0 0 10px; }
.intro { max-width: 760px; color: rgb(26 22 20 / .7); margin: 0 0 48px; font-size: 17px; }
section { margin: 0 0 28px; }
.panel { position: relative; padding: 48px; outline: 1px dashed var(--ink-10); }
.panel::before, .panel::after { content: ''; position: absolute; width: 7px; height: 7px; border: solid var(--ink); }
.panel::before { top: 0; left: 0; border-width: 1px 0 0 1px; }
.panel::after { bottom: 0; right: 0; border-width: 0 1px 1px 0; }
.dark { background: var(--dark); color: var(--cream); outline-color: rgb(244 244 231 / .4); }
.dark::before, .dark::after { border-color: var(--cream); }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.swatch { display: flex; align-items: center; justify-content: center; min-height: 150px; padding: 28px; outline: 1px dashed var(--ink-10); }
.hero-mark { width: min(100%, 860px); }
.center { display: flex; align-items: center; justify-content: center; min-height: 240px; }
.fav-row { display: flex; align-items: flex-end; gap: 40px; flex-wrap: wrap; }
.fav-row figure { margin: 0; text-align: center; }
.fav-row figcaption, .cap { font: 500 10px/1.2 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-64); margin-top: 10px; }
.dark .cap, .dark figcaption { color: rgb(244 244 231 / .6); }
.px canvas { width: 128px; height: 128px; image-rendering: pixelated; outline: 1px solid var(--ink-10); }
.tabstrip { display: inline-flex; gap: 8px; padding: 8px; background: #dee1e6; border-radius: 8px; }
.tabstrip.darkchrome { background: #202124; }
.tab { display: flex; align-items: center; gap: 8px; height: 30px; padding: 0 12px; border-radius: 6px; background: #fff; font: 12px/1 system-ui, sans-serif; color: #202124; }
.darkchrome .tab { background: #35363a; color: #e8eaed; }
.tab img, .tab svg { width: 16px; height: 16px; }
/* site header sample */
.site { background: var(--paper); outline: 1px dashed var(--ink-10); }
.nav { display: flex; align-items: center; justify-content: space-between; padding: 22px 30px; }
.brand { display: flex; align-items: center; color: var(--ink); text-decoration: none; }
.navlinks { display: flex; gap: 6px; padding: 5px; border-radius: 82px; background: rgb(232 232 232 / .67); box-shadow: inset 0 0 10px rgb(0 0 0 / .08); }
.navlinks a { font: 500 14px/1.5 var(--sans); color: var(--ink); text-decoration: none; padding: 7px 16px; border-radius: 82px; }
.navlinks a:first-child { background: rgb(26 22 20 / .06); }
.site-hero { padding: 80px 120px 96px; max-width: 900px; }
.site-hero h2 { font: 400 54px/1.1 var(--serif); letter-spacing: -.037em; margin: 0 0 20px; }
.site-hero p { font: 400 24px/1.2 var(--serif); color: rgb(26 22 20 / .7); margin: 0 0 28px; max-width: 640px; }
.entry { display: grid; grid-template-columns: 180px 1fr; gap: 10px 24px; padding: 28px 120px 56px; border-top: 1px solid rgb(26 22 20 / .1); }
.entry h3 { grid-column: 1 / -1; font: 400 28px/1.2 var(--serif); letter-spacing: -.01em; margin: 0 0 8px; }
.entry .k { display: flex; align-items: center; gap: 10px; font: 500 10px/1.2 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-64); padding-top: 5px; }
.entry .v { font: 16px/1.5 var(--sans); color: rgb(26 22 20 / .85); margin: 0; }
.legend svg { width: 36px; height: 8px; }
/* animation */
.anim .tick { transform-box: fill-box; transform-origin: 50% 50%; }
.anim .seg { transform-box: fill-box; transform-origin: 0 50%; }
.play .tick { animation: tickIn .5s var(--ease-out) both; }
.play .seg-happened { animation: draw 1.1s var(--ease-in-out) .45s both; }
.play .seg-evidence, .play .seg-uncertain { animation: draw .5s var(--ease-out) both; }
.play .s1 { animation-delay: 1.55s; } .play .s2 { animation-delay: 1.8s; } .play .s3 { animation-delay: 2.1s; }
.play .s4 { animation-name: fade; animation-duration: .7s; animation-delay: 2.6s; }
.play .s5 { animation-name: fade; animation-duration: .7s; animation-delay: 3.2s; }
.play .s6 { animation-name: fade; animation-duration: .7s; animation-delay: 4.0s; }
.play .name { animation: fade .9s var(--ease-out) .2s both; }
@keyframes tickIn { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes draw { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .play * { animation: none !important; } }
button.replay { font: 500 10px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink); background: none; border: 1px solid rgb(26 22 20 / .3); border-radius: 82px; padding: 10px 16px; cursor: pointer; }
.dark button.replay { color: var(--cream); border-color: rgb(244 244 231 / .4); }
.rule-note { font: 14px/1.5 var(--sans); color: rgb(26 22 20 / .75); max-width: 60ch; }
.construct text { font: 500 9px var(--mono); letter-spacing: .08em; text-transform: uppercase; }
</style>
</head>
<body>
<main>
<p class="eyebrow">SafeAI.watch logo lab · Direction C</p>
<h1 class="title">Evidence line</h1>
<p class="intro">One stroke that loses ink in three equal steps: solid for what happened, dashed for what the evidence shows, dotted for what remains uncertain. The tick at the start is the dated moment an entry begins.</p>

<section class="panel center" aria-label="Mark, large">
  <div class="hero-mark">${inline(markObj(acc, 1), 'style="color:var(--ink)" role="img" aria-label="Evidence line mark"')}</div>
</section>

<section class="panel" aria-label="Construction">
  <p class="eyebrow">Construction · 27 × 7 units, one unit = stroke width w</p>
  ${constructionSvg()}
  <p class="rule-note">Three runs of 9w. Solid 9 of 9 units inked; dashed 2 on, 1 off (6 of 9); dotted 1 on, 2 off (3 of 9). Every run holds one third less ink than the one before. The tick is 1w wide and 7w tall, the full height of the grid; in a lockup it runs from baseline to cap height.</p>
</section>

<div class="grid2">
  <section class="panel center" aria-label="Horizontal lockup on paper">
    <div style="width:100%">${inline(H1, 'role="img" aria-label="SafeAI.watch"')}</div>
  </section>
  <section class="panel dark center" aria-label="Horizontal lockup on dark">
    <div style="width:100%">${inline(H1, 'role="img" aria-label="SafeAI.watch"')}</div>
  </section>
  <section class="panel center" aria-label="Stacked lockup on paper">
    <div style="width:62%">${inline(ST, 'role="img" aria-label="SafeAI.watch"')}</div>
  </section>
  <section class="panel dark center" aria-label="Stacked lockup on dark">
    <div style="width:62%">${inline(ST, 'role="img" aria-label="SafeAI.watch"')}</div>
  </section>
</div>

<section class="panel" aria-label="One colour">
  <p class="eyebrow">One colour · ink, cream, orange</p>
  <div class="grid3">
    <div class="swatch" style="color:var(--ink)">${inline(H1c)}</div>
    <div class="swatch" style="color:var(--cream);background:var(--dark)">${inline(H1c)}</div>
    <div class="swatch" style="color:var(--ink)">${inline(STc, 'style="width:70%"')}</div>
    <div class="swatch" style="color:var(--accent);background:var(--dark)">${inline(markObj(cur, 1), 'style="width:55%"')}</div>
    <div class="swatch" style="color:var(--ink)">${inline(markObj(cur, 1), 'style="width:55%"')}</div>
    <div class="swatch" style="color:var(--cream);background:var(--dark)">${inline(STc, 'style="width:70%"')}</div>
  </div>
</section>

<section class="panel" aria-label="Favicon">
  <p class="eyebrow">Favicon · 16 px grid, integer edges</p>
  <div class="fav-row">
    <figure>${inline(favObj(C.ink), 'width="16" height="16"')}<figcaption>16</figcaption></figure>
    <figure>${inline(favObj(C.ink), 'width="32" height="32"')}<figcaption>32</figcaption></figure>
    <figure>${inline(favObj(C.ink), 'width="64" height="64"')}<figcaption>64</figcaption></figure>
    <figure>${inline(favObj(C.ink, C.orange), 'width="16" height="16"')}<figcaption>16 accent</figcaption></figure>
    <figure>${inline(favObj(C.ink, C.orange), 'width="32" height="32"')}<figcaption>32 accent</figcaption></figure>
    <figure>${inline(favObj(C.ink, C.orange), 'width="64" height="64"')}<figcaption>64 accent</figcaption></figure>
    <figure class="px"><canvas id="px16" width="16" height="16"></canvas><figcaption>16 px raster, 8x</figcaption></figure>
  </div>
  <div style="display:flex;gap:24px;margin-top:28px;flex-wrap:wrap">
    <div class="tabstrip"><div class="tab"><img src="favicon.svg" alt="">SafeAI.watch</div><div class="tab"><span style="width:16px;height:16px;border-radius:50%;background:#9aa0a6"></span>Other tab</div></div>
    <div class="tabstrip darkchrome"><div class="tab">${inline(favObj(C.cream), 'width="16" height="16"')}SafeAI.watch</div><div class="tab"><span style="width:16px;height:16px;border-radius:50%;background:#5f6368"></span>Other tab</div></div>
  </div>
</section>

<section class="site" aria-label="Sample site header">
  <div class="nav">
    <a class="brand" href="#" aria-label="SafeAI.watch">${inline(horizontal(acc), 'style="height:21px;width:auto"')}</a>
    <nav class="navlinks"><a href="#">Latest</a><a href="#">Timeline</a><a href="#">Coverage</a><a href="#">About</a></nav>
  </div>
  <div class="site-hero">
    <h2>Keeping watch on AI</h2>
    <p>A dated record of AI safety and security research, incidents, warnings, and policy. Each entry links its original source and separates what happened from what remains uncertain.</p>
  </div>
  <div class="entry">
    <h3>Sample entry layout (placeholder, no data)</h3>
    <div class="k legend">${legendSvg('happened')}What happened</div><p class="v">Placeholder text. The solid run labels the account of the event.</p>
    <div class="k legend">${legendSvg('evidence')}Evidence</div><p class="v">Placeholder text. The dashed run labels what the sources support.</p>
    <div class="k legend">${legendSvg('uncertain')}Uncertain</div><p class="v">Placeholder text. The dotted run labels the open questions.</p>
  </div>
</section>

<div class="grid2" style="margin-top:28px">
  <section class="panel center anim" id="anim-paper" aria-label="Animation on paper">
    <div style="width:100%">${inline(horizontal({ ...acc, cls: true }), 'role="img" aria-label="SafeAI.watch"')}</div>
  </section>
  <section class="panel dark center anim" id="anim-dark" aria-label="Animation on dark">
    <div style="width:100%">${inline(horizontal({ ...acc, cls: true }), 'role="img" aria-label="SafeAI.watch"')}</div>
  </section>
</div>
<p style="margin-top:14px"><button class="replay" type="button">Replay draw-on</button> <span class="cap" style="margin-left:10px">4.7 s once, eased; slows as the evidence thins. Reduced motion: static.</span></p>
</main>
<script>
  // 16 px raster preview of favicon.svg, scaled up without smoothing
  (function () {
    const img = new Image();
    img.onload = () => { const c = document.getElementById('px16').getContext('2d'); c.drawImage(img, 0, 0, 16, 16); };
    img.src = 'favicon.svg';
  })();
  const play = () => document.querySelectorAll('.anim').forEach((el) => {
    el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
  });
  document.querySelector('.replay').addEventListener('click', play);
  play();
</script>
</body>
</html>
`;

function legendSvg(run) {
  // one 9w run of the line at w = 2 px (18 x 2), repeated twice so the rhythm shows
  const w = 2;
  const starts = { happened: 0, evidence: 9, uncertain: 18 };
  const x0 = starts[run];
  let body = '';
  for (const rep of [0, 9]) {
    for (const s of LINE.filter((s) => s.run === run)) {
      const sx = s.x - x0 + rep;
      const len = run === 'happened' ? 9 : s.len;
      body += `<rect x="${sx * w}" y="3" width="${len * w}" height="${w}" fill="currentColor"/>`;
    }
  }
  return `<svg viewBox="0 0 36 8" aria-hidden="true">${body}</svg>`;
}

function constructionSvg() {
  const u = 30;
  const ox = 20;
  const oy = 40;
  let g = '';
  for (let i = 0; i <= MARK_W; i++) g += `<line x1="${ox + i * u}" y1="${oy}" x2="${ox + i * u}" y2="${oy + MARK_H * u}" stroke="rgb(26 22 20 / ${i % 9 === 0 ? 0.45 : 0.12})" stroke-width="1"/>`;
  for (let j = 0; j <= MARK_H; j++) g += `<line x1="${ox}" y1="${oy + j * u}" x2="${ox + MARK_W * u}" y2="${oy + j * u}" stroke="rgb(26 22 20 / .12)" stroke-width="1"/>`;
  const labels = [
    ['What happened · 9 / 9', 0],
    ['What the evidence shows · 6 / 9', 9],
    ['What remains uncertain · 3 / 9', 18],
  ]
    .map(([t, x]) => `<text x="${ox + x * u + 4}" y="${oy - 12}" fill="rgb(26 22 20 / .64)">${t}</text>`)
    .join('');
  const w = ox * 2 + MARK_W * u;
  const h = oy + MARK_H * u + 20;
  return `<svg class="construct" viewBox="0 0 ${w} ${h}" style="width:100%;max-width:${w}px">${g}<g opacity=".92">${markRects({ x: ox, y: oy, w: u, tick: C.orange })}</g>${labels}</svg>`;
}

out('board.html', board);
console.log(`nm: ${NM}\ncap height ${r2(H)} / size ${S}; w(horizontal) = ${r2(wH)}; stacked w = ${r2(stacked().w)}`);

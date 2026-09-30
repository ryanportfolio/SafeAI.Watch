/* Direction B, The point: builds every SVG in this folder from the site's own
   OFL fonts, with all text converted to outlines (fontkit shaping, as in
   scripts/brand/build-brand.mjs).

   Run: node brand-lab/directions/B-the-point/build.mjs
   Needs fontkit, wawoff2 and @fontsource-variable/{newsreader,geist-mono} in a
   node_modules: the repo's own if installed, else the about-film worktree's.

   Construction, in one unit: s, the stem of Newsreader Regular at display size
   (the right stem of "n" measures 0.092 em at opsz 72, wght 400).
     point      2s tall, 2s wide. Left half: a semicircle of radius s (the round
                full stop of Newsreader). Right half: an s x 2s rectangle (the
                square full stop of Geist Mono). It sits on the baseline.
     spacing    exactly s of clear space between the point and the nearest ink
                of "I" and of "w", measured across the point's own height.
     stacked    line 2 (point + "watch") starts at the ink edge of S; the clear
                gap from line 1's baseline to the mono x-height is one serif x-height.
     "watch"    Geist Mono, wght 350, sized so its x-height is one stem lower
                than Newsreader's (0.512 em - s).
     colour     the point is the only accent (orange); everything else is ink.
*/
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const SIBLING = fileURLToPath(new URL('../../../../about-film/', import.meta.url));
const BASE = existsSync(REPO + 'node_modules/fontkit') ? REPO : SIBLING;
const require = createRequire(BASE + 'package.json');
const fontkit = require('fontkit');
const wawoff2 = require('wawoff2');
const FONTS = BASE + 'node_modules/@fontsource-variable/';

async function loadFont(rel, axes) {
  const ttf = Buffer.from(await wawoff2.decompress(readFileSync(FONTS + rel)));
  return fontkit.create(ttf).getVariation(axes);
}
const serif = await loadFont('newsreader/files/newsreader-latin-opsz-normal.woff2', { wght: 400, opsz: 72 });
const mono = await loadFont('geist-mono/files/geist-mono-latin-wght-normal.woff2', { wght: 350 });

const INK = '#1a1614';
const ORANGE = '#ff7733';
const CREAM = '#f4f4e7';

/* ---------- units ---------- */
const S = 100; // Newsreader size in SVG units
const s = 0.092 * S; // stem
const serifXh = 0.512 * S;
const monoSize = (serifXh - s) / 0.53; // Geist Mono x-height is 0.53 em
const TRACK_SERIF = -0.02;
const TRACK_MONO = -0.02;

const round = (str) =>
  str.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => {
    const v = Math.round(Number(n) * 100) / 100;
    return String(Object.is(v, -0) ? 0 : v);
  });

/* Shape text; return path data plus the ink box of the run. */
function outline(font, text, { size, x = 0, y = 0, tracking = 0 }) {
  const run = font.layout(text);
  const k = size / font.unitsPerEm;
  let pen = 0;
  const parts = [];
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const glyphs = [];
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const ox = x + (pen + pos.xOffset) * k;
    const oy = y - pos.yOffset * k;
    const d = glyph.path.transform(k, 0, 0, -k, ox, oy).toSVG();
    if (d) parts.push(round(d));
    const b = glyph.path.bbox;
    const g = { x0: ox + b.minX * k, x1: ox + b.maxX * k, y0: oy - b.maxY * k, y1: oy - b.minY * k };
    glyphs.push(g);
    box.x0 = Math.min(box.x0, g.x0); box.x1 = Math.max(box.x1, g.x1);
    box.y0 = Math.min(box.y0, g.y0); box.y1 = Math.max(box.y1, g.y1);
    pen += pos.xAdvance;
    if (i < run.glyphs.length - 1) pen += tracking * font.unitsPerEm;
  });
  return { d: parts.join(''), parts, glyphs, box };
}

/* Horizontal ink extent of a run along the line y (SVG coords): flattens every
   glyph outline and intersects it with that line, so spacing is measured where
   the point actually sits, not at a glyph's bounding box. */
function inkAt(font, text, { size, x = 0, y: base = 0, tracking = 0 }, y) {
  const run = font.layout(text);
  const k = size / font.unitsPerEm;
  let pen = 0, lo = Infinity, hi = -Infinity;
  run.glyphs.forEach((glyph, i) => {
    const ox = x + (pen + run.positions[i].xOffset) * k;
    const P = (px, py) => [ox + px * k, base - py * k];
    const seg = (a, b) => {
      if (a[1] === b[1] || (a[1] - y) * (b[1] - y) > 0) return;
      const xh = a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
      lo = Math.min(lo, xh); hi = Math.max(hi, xh);
    };
    let cur = [0, 0], start = [0, 0];
    for (const { command, args: a } of glyph.path.commands) {
      if (command === 'moveTo') { cur = start = P(a[0], a[1]); continue; }
      if (command === 'closePath') { seg(cur, start); cur = start; continue; }
      const ctrl = [];
      for (let j = 0; j < a.length; j += 2) ctrl.push(P(a[j], a[j + 1]));
      const pts = [];
      if (command === 'lineTo') pts.push(ctrl[0]);
      else for (let n = 1; n <= 32; n++) {
        const t = n / 32, u = 1 - t, p0 = cur;
        pts.push(ctrl.length === 2
          ? [0, 1].map((c) => u * u * p0[c] + 2 * u * t * ctrl[0][c] + t * t * ctrl[1][c])
          : [0, 1].map((c) => u ** 3 * p0[c] + 3 * u * u * t * ctrl[0][c] + 3 * u * t * t * ctrl[1][c] + t ** 3 * ctrl[2][c]));
      }
      for (const p of pts) { seg(cur, p); cur = p; }
    }
    pen += run.positions[i].xAdvance;
    if (i < run.glyphs.length - 1) pen += tracking * font.unitsPerEm;
  });
  return { lo, hi };
}

/* The point: box (x, baseline - 2r) to (x + 2r, baseline). */
const pointPath = (x, b, r) =>
  round(`M${x + r} ${b - 2 * r}H${x + 2 * r}V${b}H${x + r}A${r} ${r} 0 0 1 ${x + r} ${b - 2 * r}Z`);

/* Nearest ink inside the point's own height band (baseline b up to b - 2s). */
function band(font, text, opts, b, side) {
  let v = side === 'right' ? -Infinity : Infinity;
  for (let n = 0; n <= 40; n++) {
    const e = inkAt(font, text, opts, b - 0.001 - (n / 40) * (2 * s - 0.002));
    if (side === 'right' && e.hi > -Infinity) v = Math.max(v, e.hi);
    if (side === 'left' && e.lo < Infinity) v = Math.min(v, e.lo);
  }
  return v;
}

/* ---------- horizontal lockup ---------- */
function horizontal() {
  const safe = outline(serif, 'SafeAI', { size: S, tracking: TRACK_SERIF });
  const iRight = band(serif, 'SafeAI', { size: S, tracking: TRACK_SERIF }, 0, 'right');
  const px = iRight + s;
  const wLeft = band(mono, 'watch', { size: monoSize, tracking: TRACK_MONO }, 0, 'left');
  const wx = px + 2 * s + s - wLeft;
  const watch = outline(mono, 'watch', { size: monoSize, x: wx, tracking: TRACK_MONO });
  const box = { x0: safe.box.x0, y0: Math.min(safe.box.y0, watch.box.y0), x1: watch.box.x1, y1: Math.max(safe.box.y1, watch.box.y1, 0) };
  return { safe: safe.d, point: pointPath(px, 0, s), watch: watch.d, watchParts: watch.parts, box, px, iRight, wInk: px + 3 * s, safeBox: safe.box, watchBox: watch.box };
}

/* ---------- stacked lockup ----------
   "SafeAI" over the point and "watch". The second line starts at the ink edge of S.
   Its baseline sits so the clear gap from line 1's baseline to the top of the mono
   x-height is exactly one serif x-height: b2 = xh + (xh - s). */
function stacked() {
  const safe = outline(serif, 'SafeAI', { size: S, tracking: TRACK_SERIF });
  const x0 = safe.box.x0;
  const b2 = 2 * serifXh - s;
  const px = x0;
  const wLeft = band(mono, 'watch', { size: monoSize, tracking: TRACK_MONO }, 0, 'left');
  const wx = px + 3 * s - wLeft;
  const watch = outline(mono, 'watch', { size: monoSize, x: wx, y: b2, tracking: TRACK_MONO });
  const box = { x0, y0: safe.box.y0, x1: Math.max(safe.box.x1, watch.box.x1), y1: Math.max(b2, watch.box.y1) };
  return { safe: safe.d, point: pointPath(px, b2, s), watch: watch.d, box };
}


/* ---------- writers ---------- */
const fmt = (n) => +n.toFixed(2);
const vb = (b, pad = 0) => [b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + 2 * pad, b.y1 - b.y0 + 2 * pad].map(fmt);
function svgDoc(box, body, title = 'SafeAI.watch') {
  const [x, y, w, h] = vb(box);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;
}
const lockBody = (L, { ink = INK, point = INK } = {}) =>
  `<path fill="${ink}" d="${L.safe}"/><path fill="${point}" d="${L.point}"/><path fill="${ink}" d="${L.watch}"/>`;

const H = horizontal();
const V = stacked();
const out = (name, data) => writeFileSync(HERE + name, data);

// Deliverables: ink on transparent (the one-colour master).
const MARK_D = 'M100 0H200V200H100A100 100 0 0 1 100 0Z';
const FAVICON_D = 'M8 1H15V15H8A7 7 0 0 1 8 1Z';
out('lockup-horizontal.svg', svgDoc(H.box, lockBody(H)));
out('lockup-stacked.svg', svgDoc(V.box, lockBody(V)));
out('mark.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="SafeAI.watch point"><title>SafeAI.watch point</title><path fill="${INK}" d="${MARK_D}"/></svg>\n`);
// Favicon on a 16 px grid: the point at 14 px, every straight edge on a whole
// pixel, cream in dark browser chrome. Scales exactly to 32 and 64.
out('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><style>path{fill:${INK}}@media (prefers-color-scheme:dark){path{fill:${CREAM}}}</style><path d="${FAVICON_D}"/></svg>\n`);

/* ---------- board ---------- */
const inline = (L, { ink = INK, point = ORANGE, h, w, label = 'SafeAI.watch', pad = 0 } = {}) => {
  const [x, y, bw, bh] = vb(L.box, pad);
  const size = h ? `height="${h}"` : `width="${w}"`;
  return `<svg viewBox="${x} ${y} ${bw} ${bh}" ${size} role="img" aria-label="${label}">${lockBody(L, { ink, point })}</svg>`;
};
const markSvg = (fill, px) => `<svg viewBox="0 0 200 200" width="${px}" height="${px}" role="img" aria-label="The point"><path fill="${fill}" d="${MARK_D}"/></svg>`;
const favSvg = (fill, px) => `<svg viewBox="0 0 16 16" width="${px}" height="${px}" role="img" aria-label="Favicon at ${px} px"><path fill="${fill}" d="${FAVICON_D}"/></svg>`;

// Construction drawing: the horizontal lockup with its measures.
function construction() {
  const b = H.box, pad = 24;
  const x0 = b.x0 - pad, x1 = b.x1 + 150, top = b.y0 - pad, bottom = 44;
  const monoXh = serifXh - s;
  const line = (y, dash, label, op = 0.34) =>
    `<path d="M${fmt(x0)} ${fmt(y)}H${fmt(x1)}" stroke="${INK}" stroke-opacity="${op}" stroke-width="0.5"${dash ? ' stroke-dasharray="3 3"' : ''}/>` +
    (label ? `<text x="${fmt(b.x1 + 16)}" y="${fmt(y - 3)}">${label}</text>` : '');
  const cell = (x, w) => `<rect x="${fmt(x)}" y="${fmt(-2 * s)}" width="${fmt(w)}" height="${fmt(2 * s)}" fill="${INK}" fill-opacity="0.12"/>`;
  const tick = (x) => `<path d="M${fmt(x)} 5V13" stroke="${INK}" stroke-width="0.6"/>`;
  const lab = (x, y, t, a = 'middle') => `<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="${a}">${t}</text>`;
  const px = H.px;
  const body =
    line(0, false, 'BASELINE', 0.6) +
    line(-serifXh, true, 'SERIF X-HEIGHT') +
    line(-monoXh, true, 'MONO X-HEIGHT = SERIF − S') +
    cell(H.iRight, s) + cell(px + 2 * s, s) +
    lockBody(H, { ink: INK, point: ORANGE }) +
    `<path d="M${fmt(px + s)} ${fmt(-2 * s - 4)}V4" stroke="${INK}" stroke-width="0.6" stroke-dasharray="1.5 1.5"/>` +
    tick(H.iRight) + tick(px) + tick(px + 2 * s) + tick(px + 3 * s) +
    lab(H.iRight + s / 2, 24, 'S') + lab(px + s, 24, '2S') + lab(px + 2.5 * s, 24, 'S') +
    lab(px + s - 3, 34, 'ROUND', 'end') + lab(px + s + 3, 34, 'SQUARE', 'start');
  return `<svg class="construct" viewBox="${fmt(x0)} ${fmt(top)} ${fmt(x1 - x0)} ${fmt(bottom - top)}" width="100%" role="img" aria-label="Construction of the wordmark">${body}</svg>`;
}

// Newsreader full stop + Geist Mono full stop = the point, each drawn at the same height.
function equation() {
  const glyph = (font, x) => {
    const p = font.glyphForCodePoint(46).path, b = p.bbox, k = 100 / (b.maxY - b.minY);
    return `<path fill="${INK}" d="${round(p.transform(k, 0, 0, -k, x - b.minX * k, b.maxY * k).toSVG())}"/>`;
  };
  const op = (x, t) => `<text x="${x}" y="72" class="op" text-anchor="middle">${t}</text>`;
  return `<svg viewBox="-10 -20 590 180" width="100%" role="img" aria-label="Newsreader full stop plus Geist Mono full stop equals the point">` +
    glyph(serif, 0) + op(150, '+') + glyph(mono, 200) + op(345, '=') +
    `<path fill="${ORANGE}" d="M450 0H500V100H450A50 50 0 0 1 450 0Z"/>` +
    `<path d="M450 -12V112" stroke="${INK}" stroke-width="1" stroke-dasharray="3 3"/>` +
    `<text x="0" y="146" class="cap">NEWSREADER</text><text x="200" y="146" class="cap">GEIST MONO</text><text x="400" y="146" class="cap">THE POINT</text>` +
    `</svg>`;
}

// Animated lockup: the serif settles, a round full stop lands, its right side
// squares off, then "watch" is logged one mono cell at a time.
function animated() {
  const p = H.px;
  const watch = H.watchParts.map((d, i) => `<path style="--i:${i}" d="${d}"/>`).join('');
  const [x, y, w, h] = vb(H.box, 12);
  return `<svg class="anim play" viewBox="${x} ${y} ${w} ${h}" width="100%" role="img" aria-label="SafeAI.watch, animated">` +
    `<g class="a-safe" fill="${INK}"><path d="${H.safe}"/></g>` +
    `<circle class="a-round" cx="${fmt(p + s)}" cy="${fmt(-s)}" r="${fmt(s)}" fill="${ORANGE}"/>` +
    `<rect class="a-square" x="${fmt(p + s)}" y="${fmt(-2 * s)}" width="${fmt(s)}" height="${fmt(2 * s)}" fill="${ORANGE}"/>` +
    `<g class="a-watch" fill="${INK}">${watch}</g></svg>`;
}

const FONT_DIRS = ['../../../node_modules/@fontsource-variable/', '../../../../about-film/node_modules/@fontsource-variable/'];
const face = (family, file) =>
  `@font-face{font-family:'${family}';src:${FONT_DIRS.map((d) => `url('${d}${file}') format('woff2')`).join(',')};font-weight:100 900;font-display:block}`;

const fonts = [
  face('Newsreader', 'newsreader/files/newsreader-latin-opsz-normal.woff2'),
  face('Geist', 'geist/files/geist-latin-wght-normal.woff2'),
  face('Geist Mono', 'geist-mono/files/geist-mono-latin-wght-normal.woff2'),
].join('\n');

const board = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>B. The point: SafeAI.watch logo lab</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
${fonts}
:root{--paper:#d7d7d0;--ink:#1a1614;--cream:#f4f4e7;--dark:#181a15;--orange:#ff7733;--ink-70:rgb(26 22 20/.7);--ink-64:rgb(26 22 20/.64);--ink-10:rgb(26 22 20/.1);--cream-40:rgb(244 244 231/.4)}
*{box-sizing:border-box;margin:0}
body{background:var(--paper);color:var(--ink);font:16px/1.5 'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1312px;margin:0 auto;padding:56px 48px 96px}
.eyebrow,figcaption{font:500 10px/1.2 'Geist Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-64)}
h1{font:400 76px/1.04 'Newsreader',serif;letter-spacing:-.015em;margin:14px 0 18px}
.lead{font:400 21px/1.6 'Geist',sans-serif;color:var(--ink-70);max-width:800px}
.grid{display:grid;gap:24px;margin-top:24px}
.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g32{grid-template-columns:3fr 2fr}
.frame{position:relative;outline:1px dashed var(--ink-10);padding:40px;display:flex;flex-direction:column;justify-content:center;gap:24px;min-height:220px}
.frame::before,.frame::after{content:'';position:absolute;width:7px;height:7px;border:solid var(--ink);pointer-events:none}
.frame::before{top:-1px;left:-1px;border-width:1px 0 0 1px}.frame::after{bottom:-1px;right:-1px;border-width:0 1px 1px 0}
.dark{background:var(--dark);color:var(--cream);outline-color:var(--cream-40)}
.dark figcaption{color:rgb(244 244 231/.6)}
.dark.frame::before,.dark.frame::after{border-color:var(--cream)}
.white{background:#fff}
figure{display:flex;flex-direction:column;gap:18px}
.hero{min-height:440px;align-items:center}
.center{align-items:center}
section{margin-top:72px}
h2{font:400 32px/1.2 'Newsreader',serif;letter-spacing:-.01em;margin-bottom:8px}
h2+p{color:var(--ink-70);max-width:800px}
.construct text{font:500 5.5px 'Geist Mono',monospace;letter-spacing:.08em;fill:var(--ink-64)}
svg[width]{max-width:100%;height:auto}
.rules{display:grid;grid-template-columns:96px 1fr;gap:12px 20px;font-size:15px;color:var(--ink-70)}
.rules dt{font:500 10px/2.2 'Geist Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}
svg .op{font:300 64px 'Geist',sans-serif;fill:var(--ink-64)}
svg .cap{font:500 11px 'Geist Mono',monospace;letter-spacing:.1em;fill:var(--ink-64)}
.favrow{display:flex;align-items:flex-end;gap:32px}
.favrow figure{align-items:center;gap:10px}
.tabs{display:flex;gap:6px;padding:8px 8px 0;border-radius:10px 10px 0 0}
.tab{display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:8px 8px 0 0;font:400 12px 'Geist',sans-serif;width:220px}
.tabs.light{background:#dfe1e5}.tabs.light .tab{background:#fff;color:#1f1f1f}.tabs.light .tab+.tab{background:transparent;color:#555}
.tabs.darkchrome{background:#202124}.tabs.darkchrome .tab{background:#35363a;color:#e8eaed}.tabs.darkchrome .tab+.tab{background:transparent;color:#9aa0a6}
.sizes{display:flex;align-items:flex-end;gap:28px;flex-wrap:wrap}
.site{background:var(--paper);outline:1px dashed var(--ink-10);padding:0 0 56px}
.site nav{display:flex;align-items:center;justify-content:space-between;padding:22px 40px;border-bottom:1px dashed var(--ink-10)}
.site nav ul{display:flex;gap:28px;list-style:none;padding:0;font:500 14px/1.5 'Geist',sans-serif;color:var(--ink-64)}
.site nav ul li:first-child{color:var(--ink)}
.site .copy{padding:64px 40px 0;max-width:900px}
.site h3{font:400 54px/1.1 'Newsreader',serif;letter-spacing:-.037em;margin:14px 0 18px}
.site .serif-lead{font:400 24px/1.2 'Newsreader',serif;color:var(--ink-70);max-width:720px}
.site .body{margin-top:18px;color:var(--ink-70);max-width:640px}
/* The point in CSS: a square of side 2s with its left half rounded; s = 0.092em. */
.point{display:inline-block;width:.184em;height:.184em;margin-left:.092em;background:var(--orange);border-radius:.092em 0 0 .092em}
.anim .a-safe,.anim .a-round,.anim .a-square,.anim .a-watch path{transform-box:fill-box}
.anim.play .a-safe{animation:rise 1s cubic-bezier(.2,.7,.2,1) both}
.anim.play .a-round{transform-origin:center;animation:pop .6s 1s cubic-bezier(.3,.7,.2,1) both}
.anim.play .a-square{transform-origin:left center;animation:square .7s 1.8s cubic-bezier(.65,0,.35,1) both}
.anim.play .a-watch path{animation:logged .2s calc(2.6s + var(--i) * .16s) ease-out both}
@keyframes rise{from{opacity:0;transform:translateY(4px)}}
@keyframes pop{from{opacity:0;transform:scale(.2)}}
@keyframes square{from{transform:scaleX(0)}}
@keyframes logged{from{opacity:0}}
@media (prefers-reduced-motion:reduce){.anim.play *{animation:none!important}}
button{font:500 11px 'Geist Mono',monospace;letter-spacing:.1em;text-transform:uppercase;background:var(--ink);color:var(--cream);border:0;border-radius:999px;padding:10px 18px;cursor:pointer;align-self:flex-start}
</style>
</head>
<body>
<main>
  <p class="eyebrow">SafeAI.watch logo lab / direction B</p>
  <h1>The point</h1>
  <p class="lead">The full stop in the name is the one drawn element. Its left half is the round full stop of Newsreader, the face that tells the story; its right half is the square full stop of Geist Mono, the face that keeps the record. One point holds both voices, in the place where a reader stops.</p>

  <div class="grid">
    <div class="frame hero">${inline(H, { w: 1000 })}</div>
  </div>

  <section>
    <h2>Construction</h2>
    <p>One unit, s: the stem of Newsreader Regular at display size, 0.092 em. The point is 2s square and sits on the baseline. Clear space from the point to the nearest ink on each side, measured across the point's own height, is s. "watch" is Geist Mono 350 with its x-height one stem below the serif's.</p>
    <div class="grid">
      <div class="frame">${construction()}</div>
    </div>
    <div class="grid g2">
      <figure class="frame">${equation()}<figcaption>Each half is taken from a full stop the site already sets</figcaption></figure>
      <div class="frame">
        <dl class="rules">
          <dt>Unit</dt><dd>s = 0.092 em, the stem of Newsreader Regular at opsz 72</dd>
          <dt>Point</dt><dd>2s by 2s, on the baseline; left half a semicircle of radius s, right half an s by 2s rectangle</dd>
          <dt>Space</dt><dd>s to the nearest ink on each side, measured across the point's own height</dd>
          <dt>watch</dt><dd>Geist Mono 350, x-height 0.512 em minus s, tracking −0.02 em</dd>
          <dt>Colour</dt><dd>Orange #ff7733 on the point only; ink or cream for the letters; one-colour when orange is unavailable</dd>
          <dt>Smallest</dt><dd>Below about 32 px tall the lockup's point reads as a plain dot; the favicon and mark carry the shape at small sizes</dd>
        </dl>
      </div>
    </div>
  </section>

  <section>
    <h2>Mark, stacked lockup, favicon</h2>
    <p>The point stands alone as the symbol. The favicon is the same shape on a 16 px grid: 14 px tall, with the flat side, top and bottom on whole pixels.</p>
    <div class="grid g3">
      <figure class="frame center">${markSvg(ORANGE, 180)}<figcaption>Mark, orange</figcaption></figure>
      <figure class="frame center">${markSvg(INK, 180)}<figcaption>Mark, ink</figcaption></figure>
      <figure class="frame center">${inline(V, { w: 300 })}<figcaption>Stacked lockup</figcaption></figure>
    </div>
    <div class="grid g2">
      <figure class="frame">
        <div class="favrow">
          <figure>${favSvg(INK, 16)}<figcaption>16</figcaption></figure>
          <figure>${favSvg(INK, 32)}<figcaption>32</figcaption></figure>
          <figure>${favSvg(INK, 64)}<figcaption>64</figcaption></figure>
          <figure>${favSvg(ORANGE, 16)}<figcaption>16</figcaption></figure>
          <figure>${favSvg(ORANGE, 32)}<figcaption>32</figcaption></figure>
          <figure>${favSvg(ORANGE, 64)}<figcaption>64</figcaption></figure>
        </div>
        <figcaption>Favicon on paper: ink, then orange</figcaption>
      </figure>
      <figure class="frame dark">
        <div class="favrow">
          <figure>${favSvg(CREAM, 16)}<figcaption>16</figcaption></figure>
          <figure>${favSvg(CREAM, 32)}<figcaption>32</figcaption></figure>
          <figure>${favSvg(CREAM, 64)}<figcaption>64</figcaption></figure>
          <figure>${favSvg(ORANGE, 16)}<figcaption>16</figcaption></figure>
          <figure>${favSvg(ORANGE, 32)}<figcaption>32</figcaption></figure>
          <figure>${favSvg(ORANGE, 64)}<figcaption>64</figcaption></figure>
        </div>
        <figcaption>Favicon on #181a15: cream, then orange</figcaption>
      </figure>
    </div>
    <div class="grid g2">
      <div class="tabs light"><div class="tab">${favSvg(INK, 16)}SafeAI.watch</div><div class="tab">Another tab</div></div>
      <div class="tabs darkchrome"><div class="tab">${favSvg(CREAM, 16)}SafeAI.watch</div><div class="tab">Another tab</div></div>
    </div>
  </section>

  <section>
    <h2>On paper and on the dark ground</h2>
    <div class="grid g2">
      <figure class="frame">${inline(H, { w: 520 })}<figcaption>Ink, orange point, on #d7d7d0</figcaption></figure>
      <figure class="frame dark">${inline(H, { ink: CREAM, w: 520 })}<figcaption>Cream, orange point, on #181a15</figcaption></figure>
    </div>
    <div class="grid g3">
      <figure class="frame">${inline(H, { point: INK, w: 340 })}<figcaption>One colour, ink</figcaption></figure>
      <figure class="frame dark">${inline(H, { ink: CREAM, point: CREAM, w: 340 })}<figcaption>One colour, cream</figcaption></figure>
      <figure class="frame white">${inline(H, { point: INK, w: 340 })}<figcaption>One colour, ink on white</figcaption></figure>
    </div>
    <div class="grid">
      <figure class="frame">
        <div class="sizes">${[14, 18, 24, 32, 48].map((h) => inline(H, { h })).join('')}</div>
        <figcaption>Lockup at 14, 18, 24, 32 and 48 px tall</figcaption>
      </figure>
    </div>
  </section>

  <section>
    <h2>In the site header</h2>
    <p>The same point can close a headline, drawn in CSS from the same rule: a 0.184 em square with its left half rounded, one stem from the last letter. Used once per page at most, so it stays a signature and not a pattern.</p>
    <div class="grid">
      <div class="site">
        <nav>${inline(H, { h: 30 })}<ul><li>Records</li><li>Research</li><li>Policy</li><li>About</li></ul></nav>
        <div class="copy">
          <p class="eyebrow">A public record of AI safety and security</p>
          <h3>Keeping watch on AI<span class="point" aria-hidden="true"></span></h3>
          <p class="serif-lead">News, research and warnings, with the sources and the open questions kept in view.</p>
          <p class="body">Every entry links its original source and keeps three things apart: what happened, what the evidence shows, and what remains uncertain.</p>
        </div>
      </div>
    </div>
  </section>

  <section>
    <h2>Motion</h2>
    <p>The name settles, a round full stop lands, its right side squares off, and "watch" is logged one mono cell at a time. About 3.5 seconds, played once. With reduced motion the finished lockup shows at once.</p>
    <div class="grid">
      <div class="frame">${animated()}<button type="button" id="replay">Replay</button></div>
    </div>
  </section>
</main>
<script>
document.getElementById('replay').addEventListener('click', () => {
  const a = document.querySelector('.anim');
  a.classList.remove('play');
  void a.getBoundingClientRect();
  a.classList.add('play');
});
</script>
</body>
</html>
`;
out('board.html', board);
console.log('stem', fmt(s), 'mono size', fmt(monoSize), 'H', vb(H.box), 'V', vb(V.box));

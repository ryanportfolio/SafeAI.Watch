/* Direction E, Ledger: builds every SVG and board.html in this folder.

   Run from anywhere: node build.mjs
   Fonts and fontkit come from a worktree that has node_modules (the logo-lab
   worktree once `npm ci` has run there, else the about-film worktree).
   All lettering is converted to outlines; nothing in the SVGs needs a font.
*/
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const ROOTS = [new URL('../../../', import.meta.url), new URL('../../../../about-film/', import.meta.url)].map((u) => fileURLToPath(u));
const ROOT = ROOTS.find((r) => existsSync(r + 'node_modules/fontkit')) ?? ROOTS[1];
const require = createRequire(ROOT + 'package.json');
const fontkit = require('fontkit');
const wawoff2 = require('wawoff2');
const FONTS = ROOT + 'node_modules/@fontsource-variable/';

async function load(rel, axes) {
  const ttf = Buffer.from(await wawoff2.decompress(readFileSync(FONTS + rel)));
  return fontkit.create(ttf).getVariation(axes);
}
const display = await load('newsreader/files/newsreader-latin-opsz-normal.woff2', { wght: 400, opsz: 72 });
// text-size cut for lockups under about 40 px tall: heavier serif at a small optical size, thicker rule
const text = await load('newsreader/files/newsreader-latin-opsz-normal.woff2', { wght: 520, opsz: 16 });

/* ---------- tokens ---------- */
const C = { ink: '#1a1614', paper: '#d7d7d0', cream: '#f4f4e7', orange: '#ff7733', dark: '#181a15' };

/* ---------- construction, in units of 1 em = 100 ----------
   W  cell pitch            0.86 em (fits the widest glyphs, A and w, with clearance)
   s  rule                  0.024 em
   H  cell height = W - s   so every cell is square
   g  flag inset = 2 s
   lift = H - cap - g       letters float above the rule; the flag's top lands on the cap line
   T  tick height = 0.3 W
   P  row pitch (stacked) = 1.3 W */
const EM = 100;
let serif, k, CAP, W, s, H, g, LIFT, T, P, SIDE, TOP;
function setCut({ font, pitch, rule, inset }) {
  serif = font; k = EM / serif.unitsPerEm; CAP = serif.capHeight * k;
  W = pitch; s = rule; H = W - s; g = inset; LIFT = H - CAP - g; T = 0.3 * W; P = 1.3 * W;
  SIDE = W - s - 2 * g;
  TOP = LIFT + CAP + 30; // room above the rule for ascenders (f, h) and the flag
}
const DISPLAY = { font: display, pitch: 86, rule: 2.4, inset: 4.8 };
const TEXT = { font: text, pitch: 88, rule: 4.6, inset: 6.9 };
setCut(DISPLAY);

const r2 = (n) => Math.round(n * 100) / 100;
const clean = (d) => d.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => { const v = r2(Number(n)); return String(Object.is(v, -0) ? 0 : v); });
const rect = (x, y, w, h) => `M${r2(x)} ${r2(y)}h${r2(w)}v${r2(h)}h${r2(-w)}z`;

function glyph(ch, cx, base, font = serif, size = EM) {
  const gl = font.layout(ch).glyphs[0];
  const kk = size / font.unitsPerEm;
  const mid = (gl.bbox.minX + gl.bbox.maxX) / 2;
  return clean(gl.path.transform(kk, 0, 0, -kk, cx - mid * kk, base).toSVG());
}

/* One ledger row. y is the top of the rule. Returns named parts so the board
   can animate them one by one. */
function row(text, x, y, flagAt = -1) {
  const chars = [...text];
  const n = chars.length;
  const base = y - LIFT;
  const parts = { rule: rect(x, y, n * W + s, s), ticks: [], glyphs: [], flag: null, dot: null };
  for (let i = 0; i <= n; i++) parts.ticks.push(rect(x + i * W, y - T, s, T));
  chars.forEach((ch, i) => {
    const cx = x + i * W + s / 2 + W / 2;
    if (i === flagAt) {
      parts.flag = rect(x + i * W + s + g, y - g - SIDE, SIDE, SIDE);
      parts.dot = glyph('.', cx, base);
    } else parts.glyphs.push({ ch, d: glyph(ch, cx, base) });
  });
  return parts;
}

/* ---------- compositions ---------- */

function compose(rows, width, height) {
  const asc = Math.max(...['f', 'h', 'S', 'A', 'I', 't'].map((ch) => serif.layout(ch).glyphs[0].bbox.maxY * k));
  const top = rows.some((r) => r.glyphs.length) ? TOP - LIFT - asc : TOP - g - SIDE;
  return { rows, width: r2(width), height: r2(height), top: r2(top) };
}
const makeH = () => {
  const y = TOP;
  const r = row('SafeAI.watch', 0, y, 6);
  return compose([r], 12 * W + s, y + s);
};
const makeS = () => {
  const y1 = TOP, y2 = TOP + P;
  return compose([row('SafeAI', 0, y1), row('.watch', 0, y2, 0)], 6 * W + s, y2 + s);
};
const horizontal = makeH(), stacked = makeS();
const mark = (() => {
  // the flagged cell alone: comb, square, point
  const y = TOP;
  const r = row('.', 0, y, 0);
  return compose([r], W + s, y + s);
})();


/* ---------- SVG writers ---------- */
// mode: 'color' (ink + orange flag + ink point), 'one' (single colour, point knocked out of the flag)
function svgBody(c, { fg = C.ink, accent = C.orange, point = C.ink, mode = 'color', anim = false } = {}) {
  const out = [];
  c.rows.forEach((r, ri) => {
    if (anim) {
      out.push(`<path class="a-rule" style="--r:${ri}" fill="${fg}" d="${r.rule}"/>`);
      r.ticks.forEach((d, i) => out.push(`<path class="a-tick" style="--r:${ri};--i:${i}" fill="${fg}" d="${d}"/>`));
      r.glyphs.forEach((gl, i) => out.push(`<path class="a-glyph" style="--r:${ri};--i:${i}" fill="${fg}" d="${gl.d}"/>`));
    } else {
      out.push(`<path fill="${fg}" d="${r.rule}${r.ticks.join('')}${r.glyphs.map((x) => x.d).join('')}"/>`);
    }
    if (r.flag) {
      if (mode === 'one') out.push(`<path fill="${fg}" fill-rule="evenodd" d="${r.flag}${r.dot}"/>`);
      else {
        out.push(`<path${anim ? ' class="a-flag"' : ''} fill="${accent}" d="${r.flag}"/>`);
        out.push(`<path${anim ? ' class="a-dot"' : ''} fill="${point}" d="${r.dot}"/>`);
      }
    }
  });
  return out.join('');
}
function svg(c, opts = {}, attrs = '') {
  const top = r2(c.top);
  const h = r2(c.height - top);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${top} ${c.width} ${h}"${attrs}>${svgBody(c, opts)}</svg>`;
}
const title = (t) => `<title>${t}</title>`;
const file = (c, t) => svg(c).replace('>', `>${title(t)}`).replace('<svg ', `<svg width="${c.width}" height="${r2(c.height - c.top)}" `);

setCut(TEXT);
const hSmall = makeH(), sSmall = makeS();
setCut(DISPLAY);

writeFileSync(HERE + 'lockup-horizontal-text.svg', file(hSmall, 'SafeAI.watch') + '\n');
writeFileSync(HERE + 'lockup-horizontal.svg', file(horizontal, 'SafeAI.watch') + '\n');
writeFileSync(HERE + 'lockup-stacked.svg', file(stacked, 'SafeAI.watch') + '\n');
writeFileSync(HERE + 'mark.svg', file(mark, 'SafeAI.watch flagged cell') + '\n');

/* Favicon: drawn on a 16 px grid, whole-pixel rules, so 16 and 32 render sharp.
   The flagged cell alone: an S next to a narrow cell read as "S!" at 16 px. */
const fav = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><title>SafeAI.watch</title><style>.c{fill:${C.ink}}@media (prefers-color-scheme:dark){.c{fill:${C.cream}}}</style><path class="c" d="M1 14h14v1H1zM1 11h1v3H1zM14 11h1v3h-1z"/><path fill="${C.orange}" d="M3 3h10v10H3z"/><path fill="${C.ink}" d="M7 10h2v2H7z"/></svg>`;
writeFileSync(HERE + 'favicon.svg', fav + '\n');

/* ---------- board ---------- */
const inline = (c, opts, cls = '') => svg(c, opts, ` class="${cls}" role="img" aria-label="SafeAI.watch"`);

// construction diagram of the flagged cell and its neighbour: guides drawn over the stacked lockup's first two columns
function construction() {
  const c = row('.wa', 0, TOP, 0);
  const top = TOP - LIFT - CAP - 36;
  const w = 3 * W + s;
  const capY = TOP - LIFT - CAP, xY = TOP - LIFT - serif.xHeight * k, baseY = TOP - LIFT;
  const guide = (y, label) => `<line x1="-26" x2="${w + 26}" y1="${r2(y)}" y2="${r2(y)}" class="gd"/><text x="${w + 32}" y="${r2(y + 3)}" class="gl">${label}</text>`;
  const dim = [
    guide(capY, 'cap line = flag top'),
    guide(xY, 'x-height'),
    guide(baseY, 'baseline, lift above rule'),
    guide(TOP, 'rule, s = 0.024 em'),
    `<line x1="0" x2="${W}" y1="${r2(TOP + 22)}" y2="${r2(TOP + 22)}" class="dm"/><text x="${W / 2}" y="${r2(TOP + 40)}" class="gl" text-anchor="middle">W = 0.86 em</text>`,
    `<line x1="-14" x2="-14" y1="${r2(TOP - T)}" y2="${r2(TOP)}" class="dm"/><text x="-18" y="${r2(TOP - T / 2 + 3)}" class="gl" text-anchor="end">T = 0.3 W</text>`,
    `<rect x="${s}" y="${r2(TOP - H)}" width="${r2(W - s)}" height="${r2(H)}" class="cellbox"/>`,
  ].join('');
  return `<svg viewBox="-60 ${r2(top)} ${r2(w + 60 + 150)} ${r2(TOP + 50 - top)}" class="construct" role="img" aria-label="Construction of the flagged cell">${dim}${svgBody({ rows: [c] })}</svg>`;
}

const fontFace = (fam, file, axisRange = '100 900') => {
  const rel = (root) => `${root}node_modules/@fontsource-variable/${file}`;
  return `@font-face{font-family:'${fam}';font-weight:${axisRange};font-display:block;src:url('${rel('../../../')}') format('woff2'),url('${rel('../../../../about-film/')}') format('woff2')}`;
};

const board = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SafeAI.watch logo lab, direction E: Ledger</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
${fontFace('Newsreader', 'newsreader/files/newsreader-latin-opsz-normal.woff2', '200 800')}
${fontFace('Geist', 'geist/files/geist-latin-wght-normal.woff2')}
${fontFace('Geist Mono', 'geist-mono/files/geist-mono-latin-wght-normal.woff2')}
:root{--ink:${C.ink};--paper:${C.paper};--cream:${C.cream};--orange:${C.orange};--dark:${C.dark};--ink-64:rgb(26 22 20 / .64);--ink-10:rgb(26 22 20 / .1);--ease:cubic-bezier(0.4,0,0.2,1)}
*{box-sizing:border-box}
html{background:var(--paper);color:var(--ink)}
body{margin:0;font:16px/1.5 'Geist',system-ui,sans-serif}
.wrap{max-width:1280px;margin:0 auto;padding:56px 48px 120px}
.eyebrow{font:500 11px/1.2 'Geist Mono',monospace;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-64);margin:0 0 14px}
h1.title{font:400 54px/1.1 'Newsreader',serif;letter-spacing:-.037em;margin:0 0 12px}
p.lead{font:400 22px/1.3 'Newsreader',serif;color:rgb(26 22 20 / .7);max-width:760px;margin:0}
section{margin-top:72px}
.frame{position:relative;outline:1px dashed var(--ink-10);outline-offset:-1px;padding:64px}
.frame::before,.frame::after{content:'';position:absolute;width:7px;height:7px;border:solid var(--ink);pointer-events:none}
.frame::before{left:0;top:0;border-width:1px 0 0 1px}
.frame::after{right:0;bottom:0;border-width:0 1px 1px 0}
.dark{background:var(--dark);color:var(--cream)}
.dark .eyebrow,.dark .cap{color:rgb(244 244 231 / .6)}
.dark.frame{outline-color:rgb(244 244 231 / .2)}
.dark.frame::before,.dark.frame::after{border-color:var(--cream)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.cap{font:500 11px/1.4 'Geist Mono',monospace;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-64);margin-top:18px}
svg{display:block}
.hero svg{width:100%;max-width:640px;height:auto;margin:0 auto}
.lock-h svg{width:100%;height:auto}
.mark-big svg{width:220px;height:auto;margin:0 auto}
.construct{width:100%;height:auto;max-width:760px;margin:0 auto}
.construct .gd{stroke:var(--ink);stroke-opacity:.34;stroke-width:.6;stroke-dasharray:3 3}
.construct .dm{stroke:var(--orange);stroke-width:1}
.construct .gl{font:500 6.5px 'Geist Mono',monospace;fill:var(--ink-64);letter-spacing:.06em;text-transform:uppercase}
.construct .cellbox{fill:none;stroke:var(--orange);stroke-width:.7;stroke-dasharray:2 2}
.fav-row{display:flex;align-items:flex-end;gap:40px}
.fav-row figure{margin:0;text-align:center}
.fav-row img{display:block;margin:0 auto}
.pix{image-rendering:pixelated}
.tabbar{display:flex;gap:2px;background:#bdbdb5;padding:8px 8px 0;border-radius:10px 10px 0 0;width:max-content}
.tab{display:flex;align-items:center;gap:8px;background:var(--paper);padding:8px 14px;border-radius:8px 8px 0 0;font:13px 'Geist',sans-serif}
.tab.off{background:transparent;color:var(--ink-64)}
.tabbar.dk{background:#202124}.tabbar.dk .tab{background:#35363a;color:#e8eaed}.tabbar.dk .tab.off{background:transparent;color:#9aa0a6}
/* sample site header */
.site{background:var(--paper);border:1px solid var(--ink-10)}
.site nav{display:flex;align-items:center;justify-content:space-between;padding:18px 30px;border-bottom:1px solid var(--ink-10)}
.site nav svg{height:26px;width:auto}
.site nav ul{display:flex;gap:28px;list-style:none;margin:0;padding:0;font:500 14px/1.5 'Geist',sans-serif}
.site .hero-copy{padding:88px 30px 96px;max-width:760px}
.site h2{font:400 54px/1.1 'Newsreader',serif;letter-spacing:-.037em;margin:0 0 20px}
.site .hero-copy p:not(.eyebrow){font:400 16px/1.5 'Geist',sans-serif;color:rgb(26 22 20 / .7);max-width:560px;margin:0}
.site .eyebrow{margin-bottom:20px}
.small-row{display:flex;gap:48px;align-items:flex-end;flex-wrap:wrap}
.small-row svg{width:auto}
/* motion */
.anim svg{width:100%;max-width:560px;height:auto;margin:0 auto}
.play .a-rule{transform-box:fill-box;transform-origin:0 50%;animation:ruleIn .9s var(--ease) both;animation-delay:calc(var(--r) * .5s)}
.play .a-tick{transform-box:fill-box;transform-origin:50% 100%;animation:tickIn .35s var(--ease) both;animation-delay:calc(var(--r) * .5s + .25s + var(--i) * .06s)}
.play .a-glyph{animation:glyphIn .5s var(--ease) both;animation-delay:calc(1.3s + var(--r) * .55s + var(--i) * .09s)}
.play .a-flag{transform-box:fill-box;transform-origin:50% 100%;animation:flagIn .7s var(--ease) both;animation-delay:2.6s}
.play .a-dot{animation:glyphIn .4s var(--ease) both;animation-delay:3.2s}
@keyframes ruleIn{from{transform:scaleX(0)}}
@keyframes tickIn{from{transform:scaleY(0)}}
@keyframes glyphIn{from{opacity:0;transform:translateY(6px)}}
@keyframes flagIn{from{transform:scaleY(0)}}
@media (prefers-reduced-motion:reduce){.play *{animation:none!important}}
button.replay{font:500 11px/1 'Geist Mono',monospace;text-transform:uppercase;letter-spacing:.1em;background:none;border:1px solid var(--ink-64);color:var(--ink);padding:10px 14px;border-radius:82px;cursor:pointer;margin-top:24px}
.two-col{display:grid;grid-template-columns:1fr 2fr;gap:24px}
.hero .cap,.lock-h .cap,.mark-big .cap{text-align:center}
</style>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">Logo lab / Direction E</p>
  <h1 class="title">Ledger</h1>
  <p class="lead">The name entered into a ruled record, one character per square cell. One cell is flagged: the point, where SafeAI ends and watch begins.</p>

  <section class="frame hero">
    ${inline(stacked, {})}
    <p class="cap">Stacked lockup. 6 cells over 6 cells; the flag opens the second row.</p>
  </section>

  <section class="frame lock-h">
    ${inline(horizontal, {})}
    <p class="cap">Horizontal lockup. The flag is cell 7 of 12, the hinge between the two halves of the name.</p>
  </section>

  <section class="two-col">
    <div class="frame mark-big">
      ${inline(mark, {})}
      <p class="cap">Mark: the flagged cell alone</p>
    </div>
    <div class="frame">
      ${construction()}
      <p class="cap">Construction. Cells are square (H = W &minus; s). The flag is the cell inset by 2 s; its top meets the cap line.</p>
    </div>
  </section>

  <section class="frame">
    <p class="eyebrow">Favicon, drawn on a 16 px grid</p>
    <div class="fav-row">
      <figure><img src="favicon.svg" width="16" height="16" alt=""><p class="cap">16</p></figure>
      <figure><img src="favicon.svg" width="32" height="32" alt=""><p class="cap">32</p></figure>
      <figure><img src="favicon.svg" width="64" height="64" alt=""><p class="cap">64</p></figure>
      <figure><img class="pix" src="favicon.svg" width="16" height="16" style="width:128px;height:128px" alt=""><p class="cap">16, shown 8x</p></figure>
      <figure>
        <div class="tabbar"><div class="tab"><img src="favicon.svg" width="16" height="16" alt="">SafeAI.watch</div><div class="tab off">New tab</div></div>
        <div class="tabbar dk" style="margin-top:12px"><div class="tab"><img src="favicon.svg" width="16" height="16" alt="">SafeAI.watch</div><div class="tab off">New tab</div></div>
        <p class="cap">In a tab, light and dark</p>
      </figure>
    </div>
  </section>

  <section class="grid2">
    <div class="frame">${inline(horizontal, {})}<p class="cap">On paper #d7d7d0</p></div>
    <div class="frame dark">${inline(horizontal, { fg: C.cream })}<p class="cap">On dark #181a15. The point stays ink inside the flag.</p></div>
    <div class="frame">${inline(horizontal, { mode: 'one' })}<p class="cap">One colour, ink. The point is cut out of the flag.</p></div>
    <div class="frame dark">${inline(horizontal, { fg: C.cream, mode: 'one' })}<p class="cap">One colour, cream</p></div>
  </section>

  <section class="grid3">
    <div class="frame">${inline(stacked, { mode: 'one' })}<p class="cap">Stacked, one colour</p></div>
    <div class="frame dark">${inline(stacked, { fg: C.cream })}<p class="cap">Stacked on dark</p></div>
    <div class="frame dark">${inline(mark, { fg: C.cream })}<p class="cap">Mark on dark</p></div>
  </section>

  <section>
    <p class="eyebrow">Beside the site's type</p>
    <div class="site">
      <nav>${inline(hSmall, {})}<ul><li>Coverage</li><li>Method</li><li>About</li></ul></nav>
      <div class="hero-copy">
        <p class="eyebrow">AI safety and security, on the record</p>
        <h2>Understand AI's risks without fear or dismissal.</h2>
        <p>Every entry links its original source and separates what happened, what the evidence shows, and what remains uncertain.</p>
      </div>
    </div>
    <div class="small-row" style="margin-top:32px">
      <div>${inline(horizontal, {}).replace('class=""', 'style="height:22px"')}<p class="cap">Display cut, 22 px</p></div>
      <div>${inline(hSmall, {}).replace('class=""', 'style="height:22px"')}<p class="cap">Text cut, 22 px</p></div>
      <div>${inline(hSmall, {}).replace('class=""', 'style="height:14px"')}<p class="cap">Text cut, 14 px</p></div>
      <div>${inline(sSmall, {}).replace('class=""', 'style="height:44px"')}<p class="cap">Stacked text cut, 44 px</p></div>
    </div>
  </section>

  <section class="frame anim">
    <p class="eyebrow">Motion: the entry is recorded</p>
    <div id="anim" class="play">${inline(stacked, { anim: true })}</div>
    <p class="cap">Rules draw, ticks rise, letters are entered cell by cell, then the flag fills from the rule up and the point is set. 3.6 s, ease-out, plays once. Reduced motion shows the final state.</p>
    <button class="replay" type="button" onclick="const a=document.getElementById('anim');a.classList.remove('play');void a.offsetWidth;a.classList.add('play')">Replay</button>
  </section>
</div>
</body>
</html>
`;
writeFileSync(HERE + 'board.html', board);
console.log('built', { W, s, H: r2(H), g, LIFT: r2(LIFT), CAP: r2(CAP), T: r2(T), SIDE: r2(SIDE), root: ROOT });

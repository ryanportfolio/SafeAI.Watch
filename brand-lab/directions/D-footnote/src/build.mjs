/* Direction D, Footnote: builds every SVG and board.html from the SIL OFL fonts.
   Run: node brand-lab/directions/D-footnote/src/build.mjs
   Fonts and fontkit come from a worktree with node_modules (see lib.mjs, NM). */
import { writeFileSync, readFileSync } from 'node:fs';
import { font, outline, round } from './lib.mjs';

const OUT = new URL('../', import.meta.url);
const C = {
  ink: '#1a1614',
  paper: '#d7d7d0',
  cream: '#f4f4e7',
  dark: '#181a15',
  blue: '#253e77', // --mark-blue: the reference on paper
  blueDark: '#6a86c2', // --accent-blue: the same blue lifted for dark grounds
};

/* ---------- the rule ----------
   Name: Newsreader 400, opsz 72, tracking -0.015em.
   Reference: Newsreader "1", 600, opsz 18 (heavier and lower optical size so its
   stem holds up at the smaller size).
     height  = x-height of the name
     top     = ascender line of the h (the tallest point of the last letter)
     left    = one stem (0.05em) after the h's right edge */
const NAME = { wght: 400, opsz: 72, tracking: -0.015 };
const REF = { wght: 600, opsz: 18, gap: 0.05 };

const serif = await font('serif', { wght: NAME.wght, opsz: NAME.opsz });
const refFont = await font('serif', { wght: REF.wght, opsz: REF.opsz });
const sans = await font('sans', { wght: 400 });
const mono = await font('mono', { wght: 500 });

const union = (boxes) => boxes.reduce((a, b) => ({
  minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX),
  minY: Math.min(a.minY, b.minY), maxY: Math.max(a.maxY, b.maxY),
}));

/* Place a reference numeral so its figure is `height` tall with its top at `top`
   and its left edge at `left`. */
function reference(f, { height, top, left }) {
  const unit = outline(f, '1', { size: 1000 }).boxes[0];
  const size = (height / (unit.maxY - unit.minY)) * 1000;
  const b = outline(f, '1', { size }).boxes[0];
  const o = outline(f, '1', { size, x: left - b.minX, y: top - b.minY });
  return { d: o.d, box: o.boxes[0] };
}

/* Wordmark at `size`, baseline at y = size. Returns paths and geometry. */
function wordmark(size = 100) {
  const name = outline(serif, 'SafeAI.watch', { size, y: size, tracking: NAME.tracking });
  const h = name.boxes.at(-1);
  const xH = (serif.xHeight / serif.unitsPerEm) * size;
  const ref = reference(refFont, { height: xH, top: h.minY, left: h.maxX + REF.gap * size });
  const dotIndex = 'SafeAI'.length; // glyph index of "."
  return {
    size, baseline: size, name: name.d, ref: ref.d, refBox: ref.box, xH,
    asc: h.minY, box: union([...name.boxes, ref.box]),
    safeAIRight: name.boxes[dotIndex - 1].maxX, left: name.boxes[0].minX,
  };
}

/* ---------- SVG builders ---------- */
const pad = (b, p) => ({ x: b.minX - p, y: b.minY - p, w: b.maxX - b.minX + 2 * p, h: b.maxY - b.minY + 2 * p });
const svg = (vb, body, attrs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(`${vb.x} ${vb.y} ${vb.w} ${vb.h}`)}"${attrs}>${body}</svg>`;

function horizontal({ ink = C.ink, accent = C.blue, cls = false } = {}) {
  const w = wordmark(100);
  const vb = pad(w.box, 4);
  const body = `<path fill="${ink}" d="${w.name}"/><path${cls ? ' class="ref"' : ''} fill="${accent}" d="${w.ref}"/>`;
  return { vb, body, svg: svg(vb, body, ` width="${round(String(vb.w * 2))}" height="${round(String(vb.h * 2))}"`) };
}

/* Stacked masthead: the name, a footnote rule, then the note the reference points to.
   Rule length = width of "SafeAI"; weight 0.02em; note in Newsreader text cut at 0.3em. */
const NOTE = 'Every entry links its source.';
async function stacked({ ink = C.ink, accent = C.blue, cls = false } = {}) {
  const w = wordmark(100);
  const ruleY = w.baseline + 34;
  const ruleW = w.safeAIRight - w.left;
  const ruleT = 2;
  const noteSize = 30;
  const noteFont = await font('serif', { wght: 400, opsz: 14 });
  const noteRef = await font('serif', { wght: 600, opsz: 8 });
  const noteXH = (noteFont.xHeight / noteFont.unitsPerEm) * noteSize;
  const noteAsc = (noteFont.ascent / noteFont.unitsPerEm) * noteSize * 0.84;
  const noteBase = ruleY + 16 + noteSize * 0.72;
  const r = reference(noteRef, { height: noteXH, top: noteBase - noteAsc, left: w.left });
  const text = outline(noteFont, NOTE, { size: noteSize, x: r.box.maxX + 0.28 * noteSize, y: noteBase });
  const box = union([w.box, ...text.boxes, { minX: w.left, maxX: w.left + ruleW, minY: ruleY, maxY: ruleY + ruleT }]);
  const vb = pad(box, 4);
  const c = (n) => (cls ? ` class="${n}"` : '');
  const body =
    `<path fill="${ink}" d="${w.name}"/><path${c('ref')} fill="${accent}" d="${w.ref}"/>` +
    `<rect${c('rule')} x="${round(String(w.left))}" y="${ruleY}" width="${round(String(ruleW))}" height="${ruleT}" fill="${ink}"/>` +
    `<g${c('note')}><path fill="${accent}" d="${r.d}"/><path fill="${ink}" d="${text.d}"/></g>`;
  return { vb, body, svg: svg(vb, body, ` width="${round(String(vb.w * 2))}" height="${round(String(vb.h * 2))}"`) };
}

/* Mark: the S of the name with its reference, by the same rule as the wordmark. */
function mark({ ink = C.ink, accent = C.blue, cls = false } = {}) {
  const size = 100;
  const S = outline(serif, 'S', { size, y: size });
  const sb = S.boxes[0];
  const xH = (serif.xHeight / serif.unitsPerEm) * size;
  // ascender line of the h, measured, so the mark matches the wordmark exactly
  const hTop = outline(serif, 'h', { size, y: size }).boxes[0].minY;
  const ref = reference(refFont, { height: xH, top: hTop, left: sb.maxX + REF.gap * size });
  const box = union([sb, ref.box]);
  // square viewBox, content centred
  const side = Math.max(box.maxX - box.minX, box.maxY - box.minY) + 16;
  const cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2;
  const vb = { x: cx - side / 2, y: cy - side / 2, w: side, h: side };
  const body = `<path fill="${ink}" d="${S.d}"/><path${cls ? ' class="ref"' : ''} fill="${accent}" d="${ref.d}"/>`;
  return { vb, body, svg: svg(vb, body, ' width="256" height="256"') };
}

/* Favicon on a 32-unit grid, drawn for 16 and 32 px.
   Heavier S (700, opsz 12) 24 units tall from y 6 to 30; reference 13 units tall
   from y 2, 2.5 units after the S, the pair centred. The rule is simplified here: at 16 px
   the x-height reference would be 4 px and blur into the S. */
async function favicon({ ink = C.ink, accent = C.blue, media = true, cls = false } = {}) {
  const fS = await font('serif', { wght: 700, opsz: 12 });
  const fR = await font('serif', { wght: 700, opsz: 8 });
  // S 24 units tall (y 6 to 30); reference 13 tall rising to y 2, above the S like a
  // superscript above a cap; a 2.5-unit gap keeps them apart at 16 px; the pair is centred.
  const FAV = { sH: 24, sTop: 6, rH: 13, rTop: 2, gap: 2.5 };
  const unit = outline(fS, 'S', { size: 1000 }).boxes[0];
  const k = FAV.sH / (unit.maxY - unit.minY);
  const S0 = outline(fS, 'S', { size: 1000 * k }).boxes[0];
  const r0 = reference(fR, { height: FAV.rH, top: FAV.rTop, left: 0 }).box;
  const total = S0.maxX - S0.minX + FAV.gap + (r0.maxX - r0.minX);
  const x0 = (32 - total) / 2;
  const S = outline(fS, 'S', { size: 1000 * k, x: x0 - S0.minX, y: FAV.sTop - S0.minY });
  const refP = reference(fR, { height: FAV.rH, top: FAV.rTop, left: x0 + S0.maxX - S0.minX + FAV.gap });
  console.error('favicon total width', total.toFixed(2), 'x0', x0.toFixed(2));
  const style = media
    ? `<style>.s{fill:${ink}}.r{fill:${accent}}@media (prefers-color-scheme:dark){.s{fill:${C.cream}}.r{fill:${C.blueDark}}}</style>`
    : '';
  const body = media
    ? `${style}<path class="s" d="${S.d}"/><path class="r" d="${refP.d}"/>`
    : `<path fill="${ink}" d="${S.d}"/><path${cls ? ' class="ref"' : ''} fill="${accent}" d="${refP.d}"/>`;
  return svg({ x: 0, y: 0, w: 32, h: 32 }, body, ' width="32" height="32"');
}

/* ---------- write the deliverables (ink on transparent) ---------- */
const files = {
  'mark.svg': mark().svg,
  'lockup-horizontal.svg': horizontal().svg,
  'lockup-stacked.svg': (await stacked()).svg,
  'favicon.svg': await favicon(),
};
for (const [name, data] of Object.entries(files)) writeFileSync(new URL(name, OUT), data + '\n');

/* ---------- board ---------- */
const inline = ({ vb, body }, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(`${vb.x} ${vb.y} ${vb.w} ${vb.h}`)}" ${extra}>${body}</svg>`;
const V = {
  hPaper: horizontal({ cls: true }),
  hDark: horizontal({ ink: C.cream, accent: C.blueDark }),
  hInk1: horizontal({ accent: C.ink }),
  hCream1: horizontal({ ink: C.cream, accent: C.cream }),
  sPaper: await stacked({ cls: true }),
  sDark: await stacked({ ink: C.cream, accent: C.blueDark, cls: true }),
  sInk1: await stacked({ accent: C.ink }),
  mPaper: mark({ cls: true }),
  mDark: mark({ ink: C.cream, accent: C.blueDark }),
  mInk1: mark({ accent: C.ink }),
};
const favPaper = await favicon({ media: false });
const favDark = await favicon({ media: false, ink: C.cream, accent: C.blueDark });
const favInk1 = await favicon({ media: false, accent: C.ink });
const uri = (s) => 'data:image/svg+xml,' + encodeURIComponent(s);

// Construction figure: the tail of the wordmark with its guides.
function construction() {
  const w = wordmark(100);
  const tail = outline(serif, 'SafeAI.watch', { size: 100, y: 100, tracking: NAME.tracking });
  const tBox = tail.boxes.at(-5); // "w" of watch: the crop starts just before it
  const x0 = tBox.minX - 70, x1 = w.refBox.maxX + 40;
  const yA = w.asc, yX = w.baseline - w.xH, yB = w.baseline;
  const vb = { x: x0, y: yA - 22, w: x1 - x0, h: yB - yA + 44 };
  const g = '#253e77';
  const line = (y, label) =>
    `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${g}" stroke-width=".35" stroke-dasharray="1.5 1.5"/>` +
    `<text x="${x0 + 1}" y="${y - 1.6}" font-family="Geist Mono Variable, monospace" font-size="3.2" fill="${g}" letter-spacing=".2">${label}</text>`;
  const rb = w.refBox;
  const hB = tail.boxes.at(-1);
  const dim = `<line x1="${rb.maxX + 6}" x2="${rb.maxX + 6}" y1="${rb.minY}" y2="${rb.maxY}" stroke="${C.ink}" stroke-width=".4"/>` +
    `<line x1="${rb.maxX + 3.5}" x2="${rb.maxX + 8.5}" y1="${rb.minY}" y2="${rb.minY}" stroke="${C.ink}" stroke-width=".4"/>` +
    `<line x1="${rb.maxX + 3.5}" x2="${rb.maxX + 8.5}" y1="${rb.maxY}" y2="${rb.maxY}" stroke="${C.ink}" stroke-width=".4"/>` +
    `<text x="${rb.maxX + 10}" y="${(rb.minY + rb.maxY) / 2 + 1.2}" font-family="Geist Mono Variable, monospace" font-size="3.2" fill="${C.ink}">= x-height</text>` +
    `<line x1="${hB.maxX}" x2="${rb.minX}" y1="${yB + 8}" y2="${yB + 8}" stroke="${C.ink}" stroke-width=".4"/>` +
    `<line x1="${hB.maxX}" x2="${hB.maxX}" y1="${yB + 5.5}" y2="${yB + 10.5}" stroke="${C.ink}" stroke-width=".4"/>` +
    `<line x1="${rb.minX}" x2="${rb.minX}" y1="${yB + 5.5}" y2="${yB + 10.5}" stroke="${C.ink}" stroke-width=".4"/>` +
    `<text x="${rb.minX + 2}" y="${yB + 9.2}" font-family="Geist Mono Variable, monospace" font-size="3.2" fill="${C.ink}">0.05em, one stem</text>`;
  const body = `${line(yA, 'ASCENDER: TOP OF REFERENCE')}${line(yX, 'X-HEIGHT')}${line(yB, 'BASELINE')}` +
    `<path fill="${C.ink}" d="${tail.ds.slice(-5).join('')}"/><path fill="${C.blue}" d="${w.ref}"/>${dim}`;
  return inline({ vb, body }, 'class="construction"');
}

const FONT_DIRS = ['../../../node_modules/@fontsource-variable/', '../../../../about-film/node_modules/@fontsource-variable/'];
const face = (family, file, extra = '') =>
  `@font-face{font-family:'${family}';src:${FONT_DIRS.map((d) => `url('${d}${file}') format('woff2')`).join(',')};font-display:block;${extra}}`;

const board = readFileSync(new URL('board.template.html', import.meta.url), 'utf8')
  .replace('/*FONTS*/', [
    face('Newsreader Variable', 'newsreader/files/newsreader-latin-opsz-normal.woff2', 'font-weight:200 800;'),
    face('Newsreader Variable', 'newsreader/files/newsreader-latin-opsz-italic.woff2', 'font-weight:200 800;font-style:italic;'),
    face('Geist Variable', 'geist/files/geist-latin-wght-normal.woff2', 'font-weight:100 900;'),
    face('Geist Mono Variable', 'geist-mono/files/geist-mono-latin-wght-normal.woff2', 'font-weight:100 900;'),
  ].join('\n'))
  .replace(/\{\{(\w+)(?::([^}]*))?\}\}/g, (_, k, attrs = '') => {
    if (k === 'construction') return construction();
    if (k === 'favPaper') return uri(favPaper);
    if (k === 'favDark') return uri(favDark);
    if (k === 'favInk1') return uri(favInk1);
    if (!V[k]) throw new Error('unknown slot ' + k);
    return inline(V[k], attrs);
  });
writeFileSync(new URL('board.html', OUT), board);
console.log('wrote', Object.keys(files).join(', '), 'board.html');

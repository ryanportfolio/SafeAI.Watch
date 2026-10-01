/* Builds the SafeAI.watch brand assets from our own geometry and the self-hosted
   SIL OFL fonts (Geist Mono, Newsreader via @fontsource-variable).

   Run: npm run brand

   The mark is G3 "Valley · Marker" (geometry in valley.mjs): contours of one elevation
   field forming an S valley on a square map sheet, a hairline neatline with corner
   ticks, and an orange triangulation mark on the valley floor. Below 48 px the contours
   fill in, so small sizes use the ink sheet with the valley cut out and a solid orange
   triangle on the point.

   Writes
     src/assets/brand/mark.svg         full mark, ink and orange on transparent (48 px and up)
     src/assets/brand/mark-small.svg   small form, ink as currentColor (under 48 px)
     public/favicon.svg                small form, cream sheet under a dark colour scheme
     public/favicon.ico                16, 32, 48 (PNG-in-ICO)
     public/apple-touch-icon.png       180, full-bleed ink, valley in paper
     public/icon-192.png, icon-512.png small form on transparent, "any" purpose
     public/icon-maskable-512.png      full-bleed ink, valley inside the 80% safe zone
     public/site.webmanifest
     public/og-image.png               1200x630 default share image
     src/assets/fonts/newsreader-italic-subset.woff2
                                       Newsreader italic, lowercase only, weight 400 (opsz kept)

   Text is converted to outlines here (fontkit shaping, so kerning matches the
   browser), and every raster comes from an SVG rendered by sharp's librsvg.
   No browser, no network, no system fonts: two runs give byte-identical files
   as long as the font packages and sharp stay on the same versions.
*/
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as fontkitModule from 'fontkit';
import wawoff2 from 'wawoff2';
import subsetFont from 'subset-font';
import { MARKER, NEATLINE, SHEET, STROKE, TICK, fmt, mark, triangle, trianglePath, valley } from './valley.mjs';

const fontkit = fontkitModule.default ?? fontkitModule;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const at = (rel) => ROOT + rel;

/* ---------- tokens: read from the stylesheet, never restated here ---------- */

const tokensCss = readFileSync(at('src/styles/tokens.css'), 'utf8');
const token = (name) => {
  const m = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!m) throw new Error(`token --${name} not found as six-digit hex in tokens.css`);
  return m[1].toLowerCase();
};
const C = {
  paper: token('paper'),
  ink: token('ink'),
  cream: token('cream'),
  orange: token('accent-orange'),
};

/* ---------- fonts ---------- */

// fontkit cannot apply variations to a WOFF2 directly, so decompress to TTF first.
async function loadFont(rel, axes) {
  const ttf = Buffer.from(await wawoff2.decompress(readFileSync(at(rel))));
  return fontkit.create(ttf).getVariation(axes);
}

const FONTS = 'node_modules/@fontsource-variable/';
const SERIF_FILE = `${FONTS}newsreader/files/newsreader-latin-opsz-normal.woff2`;
const mono500 = await loadFont(`${FONTS}geist-mono/files/geist-mono-latin-wght-normal.woff2`, { wght: 500 });
// opsz follows font size up to the axis max (72), as font-optical-sizing: auto does in the browser
const serifDisplay = await loadFont(SERIF_FILE, { wght: 400, opsz: 72 });
// The wordmark: Newsreader 420 at opsz 36, as the logo lab set it. Its serifed capital I
// keeps "SafeAI" from reading "SafeAl", which Geist's plain I does.
const serifWordmark = await loadFont(SERIF_FILE, { wght: 420, opsz: 36 });

const round = (s) => s.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => fmt(Number(n)));

/* Shape `text` and return outlines with the baseline at (x, y).
   tracking is CSS letter-spacing in em, applied after every glyph but the last. */
function outline(font, text, { size, x = 0, y = 0, tracking = 0 }) {
  const run = font.layout(text);
  const k = size / font.unitsPerEm;
  let pen = 0;
  const parts = [];
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const ox = x + (pen + pos.xOffset) * k;
    const oy = y - pos.yOffset * k;
    const d = glyph.path.transform(k, 0, 0, -k, ox, oy).toSVG();
    if (d) parts.push(round(d));
    pen += pos.xAdvance;
    if (i < run.glyphs.length - 1) pen += tracking * font.unitsPerEm;
  });
  return { d: parts.join(''), width: pen * k };
}

const measure = (font, text, size, tracking = 0) => outline(font, text, { size, tracking }).width;

/* Greedy wrap, then narrow the measure while the line count holds, so the
   last line is not left as a one-word orphan. */
function wrap(font, text, size, maxWidth, tracking = 0) {
  const greedy = (width) => {
    const lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(font, next, size, tracking) > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const count = greedy(maxWidth).length;
  let width = maxWidth;
  while (width > maxWidth / 2 && greedy(width - 4).length === count) width -= 4;
  return greedy(width);
}

/* ---------- mark ---------- */

const svgDoc = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${extra}>${body}</svg>`;

const FULL = mark();
// the full mark's box: the sheet plus its corner ticks
const BOX = [-TICK, -TICK, SHEET + 2 * TICK, SHEET + 2 * TICK];
const TICKS = `M${-TICK} 0H0M0 ${-TICK}V0M${SHEET} ${-TICK}V0M${SHEET} 0H${SHEET + TICK}M${SHEET + TICK} ${SHEET}H${SHEET}M${SHEET} ${SHEET}V${SHEET + TICK}M0 ${SHEET + TICK}V${SHEET}M0 ${SHEET}H${-TICK}`;

/* The full mark in sheet units: contours cut flush at the sheet edge, the neatline and
   its ticks, the triangulation mark. `id` names the clip path (unique per document). */
function markBody({ line = C.ink, dot = C.orange, id = 'sheet' } = {}) {
  const { x, y } = FULL.point;
  return (
    `<clipPath id="${id}"><rect width="${SHEET}" height="${SHEET}"/></clipPath>` +
    `<g clip-path="url(#${id})" fill="none" stroke="${line}" stroke-width="${STROKE}">${FULL.paths.map((d) => `<path d="${d}"/>`).join('')}</g>` +
    `<g fill="none" stroke="${line}" stroke-width="${NEATLINE}"><rect width="${SHEET}" height="${SHEET}"/><path d="${TICKS}"/></g>` +
    `<path d="${trianglePath(triangle(x, y, MARKER.r))}" fill="none" stroke="${dot}" stroke-width="${MARKER.stroke}" stroke-linejoin="round"/>` +
    `<circle cx="${x}" cy="${y}" r="${MARKER.dot}" fill="${dot}"/>`
  );
}

/* Small form on a 32 box: the sheet spans 1..31 with rounded corners, the valley is cut
   out with even-odd fill (no mask, so no ids to collide when inlined twice). */
const SMALL = valley((x, y) => [x * 0.3 + 1, y * 0.3 + 1], 0.3);
const SHEET32 = 'M4.5 1H27.5A3.5 3.5 0 0 1 31 4.5V27.5A3.5 3.5 0 0 1 27.5 31H4.5A3.5 3.5 0 0 1 1 27.5V4.5A3.5 3.5 0 0 1 4.5 1Z';
const smallBody = (ink, sheetAttrs = '') =>
  `<path${sheetAttrs} fill="${ink}" fill-rule="evenodd" d="${SHEET32}${SMALL.d}"/><path fill="${C.orange}" d="${trianglePath(SMALL.triangle)}"/>`;
const smallAt = (size, ink = C.ink) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">${smallBody(ink)}</svg>`;

/* ---------- outputs ---------- */

const written = [];
function write(rel, data) {
  mkdirSync(dirname(at(rel)), { recursive: true });
  writeFileSync(at(rel), data);
  written.push([rel, createHash('sha256').update(data).digest('hex').slice(0, 16)]);
}

const png = (svg, { opaque = false } = {}) => {
  const img = sharp(Buffer.from(svg));
  return (opaque ? img.removeAlpha() : img).png({ compressionLevel: 9 }).toBuffer();
};

// Site marks, imported by src/components/Mark.astro.
write(
  'src/assets/brand/mark.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BOX.join(' ')}">${markBody()}</svg>\n`,
);
write(
  'src/assets/brand/mark-small.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${smallBody('currentColor')}</svg>\n`,
);

// Favicon (vector): the small form; a dark colour scheme turns the sheet cream so it
// stays visible on dark tab strips.
write(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.s{fill:${C.ink}}@media (prefers-color-scheme:dark){.s{fill:${C.cream}}}</style>${smallBody(C.ink, ' class="s"')}</svg>\n`,
);

// favicon.ico: PNG-compressed entries (valid since Windows Vista, read by every browser).
function ico(entries) {
  const head = Buffer.alloc(6 + 16 * entries.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(entries.length, 4);
  let offset = head.length;
  entries.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e);
    head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt8(0, e + 2);
    head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...entries.map((e) => e.data)]);
}
const icoEntries = [];
for (const size of [16, 32, 48]) icoEntries.push({ size, data: await png(smallAt(size)) });
write('public/favicon.ico', ico(icoEntries));

// "any" icons: the favicon's small form, transparent corners and valley.
write('public/icon-192.png', await png(smallAt(192)));
write('public/icon-512.png', await png(smallAt(512)));

// Full-bleed icons for platforms that crop their own shape (iOS rounds the touch icon,
// Android masks the maskable one): an ink tile with the valley in paper. The valley and
// triangle are scaled about the sheet centre until their farthest point sits at 38% of
// the tile, inside the maskable safe circle (40%).
const unit = valley((x, y) => [x, y], 1);
let reach = 0;
for (const [x, y] of [...unit.pts, ...unit.triangle]) reach = Math.max(reach, Math.hypot(x - SHEET / 2, y - SHEET / 2));
async function fullBleed(size) {
  const s = (0.38 * size) / reach;
  const v = valley((x, y) => [size / 2 + (x - SHEET / 2) * s, size / 2 + (y - SHEET / 2) * s], s);
  const body = `<rect width="${size}" height="${size}" fill="${C.ink}"/><path fill="${C.paper}" d="${v.d}"/><path fill="${C.orange}" d="${trianglePath(v.triangle)}"/>`;
  return png(svgDoc(size, size, body), { opaque: true });
}
write('public/apple-touch-icon.png', await fullBleed(180));
write('public/icon-maskable-512.png', await fullBleed(512));

write(
  'public/site.webmanifest',
  JSON.stringify(
    {
      name: 'SafeAI.watch',
      short_name: 'SafeAI.watch',
      description: 'A public record of AI safety and security, with the sources and the open questions kept in view.',
      start_url: '/',
      scope: '/',
      display: 'minimal-ui',
      background_color: C.paper,
      theme_color: C.paper,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ) + '\n',
);

/* ---------- share image ---------- */

const OG = { w: 1200, h: 630, inset: 40, gutter: 24 };
// Two framed panels share the top and bottom edges: text on the left, the mark on the right.
const panelY = OG.inset;
const panelH = OG.h - 2 * OG.inset;
const art = { x: 736, y: panelY, w: OG.w - OG.inset - 736, h: panelH };
const textPanel = { x: OG.inset, y: panelY, w: art.x - OG.gutter - OG.inset, h: panelH };
const col = { x: textPanel.x + 40, w: textPanel.w - 80 };

// Dashed outline with solid corner ticks, as .frame draws it on the site.
function frame({ x, y, w, h, tick = 10, dash = C.ink, dashOpacity = 0.18 }) {
  const r = (v) => Math.round(v) + 0.5;
  const [x0, y0, x1, y1] = [r(x), r(y), r(x + w) - 1, r(y + h) - 1];
  const corners = [
    `M${x0} ${y0 + tick}V${y0}H${x0 + tick}`,
    `M${x1 - tick} ${y0}H${x1}V${y0 + tick}`,
    `M${x1} ${y1 - tick}V${y1}H${x1 - tick}`,
    `M${x0 + tick} ${y1}H${x0}V${y1 - tick}`,
  ].join('');
  return (
    `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${dash}" stroke-opacity="${dashOpacity}" stroke-dasharray="4 4"/>` +
    `<path d="${corners}" fill="none" stroke="${C.ink}" stroke-width="1.5"/>`
  );
}

const HEAD = { size: 88, tracking: -0.037, leading: 1.02 };
const headLines = ['Keeping watch', 'on AI'];
for (const line of headLines) {
  const w = measure(serifDisplay, line, HEAD.size, HEAD.tracking);
  if (w > col.w) throw new Error(`OG headline "${line}" is ${w.toFixed(1)}px, column is ${col.w}px`);
}
const LEAD = { size: 26, leading: 1.3 };
const serifLead = await loadFont(SERIF_FILE, { wght: 400, opsz: LEAD.size });
const leadLines = wrap(serifLead, 'News, research, and warnings about AI safety and security, with the sources and the open questions kept in view.', LEAD.size, col.w);
// Feed cards show this image near 500 to 600px wide, half size: 20px here lands at 10px or more
// there, the site's own eyebrow size. Same 0.7 ink as the lead, which reads at that scale.
const EYEBROW = { size: 20, tracking: 0.06, opacity: 0.7 };
// The name, top left, cap height centred where the old 30px lockup sat. The mark itself
// stands at full size in the right panel, so the two read as one horizontal lockup.
const WORDMARK = { size: 34, tracking: -0.006 };

const leadTop = 386;
const headBaseline2 = leadTop - 36;
const headBaseline1 = headBaseline2 - HEAD.size * HEAD.leading;

let body = `<rect width="${OG.w}" height="${OG.h}" fill="${C.paper}"/>`;
const wmCap = (serifWordmark.capHeight / serifWordmark.unitsPerEm) * WORDMARK.size;
const wordmark = outline(serifWordmark, 'SafeAI.watch', { ...WORDMARK, x: col.x, y: panelY + 40 + 15 + wmCap / 2 });
body += `<path fill="${C.ink}" d="${wordmark.d}"/>`;
headLines.forEach((line, i) => {
  const { d } = outline(serifDisplay, line, {
    size: HEAD.size,
    x: col.x - 4,
    y: i === 0 ? headBaseline1 : headBaseline2,
    tracking: HEAD.tracking,
  });
  body += `<path fill="${C.ink}" d="${d}"/>`;
});
leadLines.forEach((line, i) => {
  const { d } = outline(serifLead, line, { size: LEAD.size, x: col.x, y: leadTop + LEAD.size + i * LEAD.size * LEAD.leading });
  body += `<path fill="${C.ink}" fill-opacity="0.7" d="${d}"/>`;
});
const eyebrow = outline(mono500, 'A PUBLIC RECORD OF AI SAFETY AND SECURITY', {
  size: EYEBROW.size,
  x: col.x,
  y: panelY + panelH - 40,
  tracking: EYEBROW.tracking,
});
if (eyebrow.width > col.w) throw new Error(`OG eyebrow is ${eyebrow.width.toFixed(1)}px, column is ${col.w}px`);
body += `<path fill="${C.ink}" fill-opacity="${EYEBROW.opacity}" d="${eyebrow.d}"/>`;
body += frame(textPanel);

// The full mark centred in the right panel, its ticks MARK_PAD inside the frame.
const MARK_PAD = 52;
const markSize = art.w - 2 * MARK_PAD;
const ms = markSize / BOX[2];
const mx = art.x + MARK_PAD - BOX[0] * ms;
const my = art.y + (art.h - markSize) / 2 - BOX[1] * ms;
body += `<g transform="translate(${fmt(mx)} ${fmt(my)}) scale(${fmt(ms)})">${markBody()}</g>`;
body += frame(art);

// 256-colour palette at full quality: about half the bytes of truecolour, no visible banding
const og = await sharp(Buffer.from(svgDoc(OG.w, OG.h, body)))
  .removeAlpha()
  .png({ palette: true, quality: 100, effort: 10, compressionLevel: 9 })
  .toBuffer();
write('public/og-image.png', og);

/* ---------- italic subset ---------- */

// The only italic on the site is two lowercase words in the closing heading. The full latin
// italic is 147 KB; this keeps lowercase letters, space and light punctuation, pins weight 400
// (the heading weight) and keeps the opsz axis, so the heading still gets its display cut.
// Capitals or other characters set in italic fall back to the next font in --font-serif:
// add them here if italic copy ever needs them. OFL 1.1 permits subsetting (Reserved Font
// Name: none declared for Newsreader).
const ITALIC_TEXT = 'abcdefghijklmnopqrstuvwxyz .,;:-’';
const italic = await subsetFont(readFileSync(at(`${FONTS}newsreader/files/newsreader-latin-opsz-italic.woff2`)), ITALIC_TEXT, {
  targetFormat: 'woff2',
  variationAxes: { wght: 400 },
});
write('src/assets/fonts/newsreader-italic-subset.woff2', italic);

console.log(`mark: ${FULL.paths.length} contours, clear gap ${FULL.gap.toFixed(2)}, marker clearance ${FULL.clearance.toFixed(2)} (sheet units)`);
for (const [rel, hash] of written) console.log(`${hash}  ${rel}`);

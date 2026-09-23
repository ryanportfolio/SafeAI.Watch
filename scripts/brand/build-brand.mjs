/* Builds the SafeAI.watch brand assets from our own geometry and the self-hosted
   SIL OFL fonts (Geist, Geist Mono, Newsreader via @fontsource-variable).

   Run: npm run brand

   Writes
     public/favicon.svg                crosshair, heavier stroke, dark-scheme colour
     public/favicon.ico                16, 32, 48 (PNG-in-ICO)
     public/apple-touch-icon.png       180
     public/icon-192.png, icon-512.png paper square, "any" purpose
     public/icon-maskable-512.png      mark inside the 80% safe zone
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
  blue: token('mark-blue'),
  // mark on dark browser chrome: the mark blue lifted to the same hue at 80% lightness
  blueOnDark: '#a9bbe6',
};

/* ---------- fonts ---------- */

// fontkit cannot apply variations to a WOFF2 directly, so decompress to TTF first.
async function loadFont(rel, axes) {
  const ttf = Buffer.from(await wawoff2.decompress(readFileSync(at(rel))));
  return fontkit.create(ttf).getVariation(axes);
}

const FONTS = 'node_modules/@fontsource-variable/';
const geist500 = await loadFont(`${FONTS}geist/files/geist-latin-wght-normal.woff2`, { wght: 500 });
const mono500 = await loadFont(`${FONTS}geist-mono/files/geist-mono-latin-wght-normal.woff2`, { wght: 500 });
// opsz follows font size up to the axis max (72), as font-optical-sizing: auto does in the browser
const serifDisplay = await loadFont(`${FONTS}newsreader/files/newsreader-latin-opsz-normal.woff2`, { wght: 400, opsz: 72 });

const round = (s) =>
  s.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => {
    const v = Math.round(Number(n) * 100) / 100;
    return String(Object.is(v, -0) ? 0 : v);
  });

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

// The crosshair on its 40-unit grid, as in src/components/Mark.astro.
const MARK_SHAPES = '<circle cx="20" cy="20" r="15"/><circle cx="20" cy="20" r="5"/><path d="M0 20h10m20 0h10M20 0v10m0 20v10"/>';

function markGroup({ x = 0, y = 0, size = 40, stroke = 2, color = C.blue }) {
  const s = size / 40;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="${stroke}">${MARK_SHAPES}</g>`;
}

const svgDoc = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${extra}>${body}</svg>`;

/* ---------- lockup (share image) ---------- */

// Proportions from the nav pill: 16px mark, 8px gap, Geist 500 at 16px, -0.01em.
// On the 40-unit mark grid that is text 40, gap 20. Cap height centres on the mark.
const WM = { mark: 40, gap: 20, size: 40, tracking: -0.01 };
const capHeight = (geist500.capHeight / geist500.unitsPerEm) * WM.size;
const wmBaseline = WM.mark / 2 + capHeight / 2;
const wmText = outline(geist500, 'SafeAI.watch', {
  size: WM.size,
  x: WM.mark + WM.gap,
  y: wmBaseline,
  tracking: WM.tracking,
});
function wordmarkGroup({ x, y, height, ink = C.ink, blue = C.blue, stroke = 2 }) {
  const s = height / WM.mark;
  return `<g transform="translate(${x} ${y}) scale(${s})">${markGroup({ stroke, color: blue })}<path fill="${ink}" d="${wmText.d}"/></g>`;
}

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

// Favicon (vector). Stroke 3 instead of the site's 2 keeps the rings and ticks
// readable at 16px; the dark-scheme rule lifts the blue off dark tab strips.
const FAVICON_STROKE = 3;
write(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><style>g{stroke:${C.blue}}@media (prefers-color-scheme:dark){g{stroke:${C.blueOnDark}}}</style><g fill="none" stroke-width="${FAVICON_STROKE}">${MARK_SHAPES}</g></svg>\n`,
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
for (const size of [16, 32, 48]) {
  const data = await png(svgDoc(size, size, markGroup({ size, stroke: FAVICON_STROKE })));
  icoEntries.push({ size, data });
}
write('public/favicon.ico', ico(icoEntries));

// App icons on paper. "any" icons keep the mark at 62% of the tile; the maskable
// one keeps the ticks (radius 20 units) inside the 40%-radius safe circle.
async function tile(size, fraction, stroke) {
  const m = Math.round(size * fraction);
  const o = (size - m) / 2;
  return png(svgDoc(size, size, `<rect width="${size}" height="${size}" fill="${C.paper}"/>${markGroup({ x: o, y: o, size: m, stroke })}`), {
    opaque: true,
  });
}
write('public/apple-touch-icon.png', await tile(180, 0.62, 2.25));
write('public/icon-192.png', await tile(192, 0.62, 2.25));
write('public/icon-512.png', await tile(512, 0.62, 2));
write('public/icon-maskable-512.png', await tile(512, 0.7, 2));

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
// Two framed panels share the top and bottom edges: text on the left, artwork on the right.
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
const serifLead = await loadFont(`${FONTS}newsreader/files/newsreader-latin-opsz-normal.woff2`, { wght: 400, opsz: LEAD.size });
const leadLines = wrap(serifLead, 'News, research, and warnings about AI safety and security, with the sources and the open questions kept in view.', LEAD.size, col.w);
// Feed cards show this image near 500 to 600px wide, half size: 20px here lands at 10px or more
// there, the site's own eyebrow size. Same 0.7 ink as the lead, which reads at that scale.
const EYEBROW = { size: 20, tracking: 0.06, opacity: 0.7 };

const leadTop = 386;
const headBaseline2 = leadTop - 36;
const headBaseline1 = headBaseline2 - HEAD.size * HEAD.leading;

let body = `<rect width="${OG.w}" height="${OG.h}" fill="${C.paper}"/>`;
body += wordmarkGroup({ x: col.x, y: panelY + 40, height: 30 });
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

// Artwork: our research illustration, scaled and cropped into the right panel.
// The panel shows the flow boxes, a gridded corner and two whole blue squares. The right
// edge (x 424 of the 1000px-wide scaled art) falls in open space between two planes, so no
// line of the artwork runs alongside the frame; the nearest plane edge (x 441) is outside.
const ART_SCALE_H = 600;
const artPanel = await sharp(at('src/assets/art/research.png'))
  .resize({ height: ART_SCALE_H })
  .extract({ left: 0, top: 36, width: art.w, height: art.h })
  .png()
  .toBuffer();

const ogLayers = await sharp(Buffer.from(svgDoc(OG.w, OG.h, body)))
  .composite([
    { input: artPanel, left: art.x, top: art.y },
    // redraw the panel frame over the artwork edge
    { input: Buffer.from(svgDoc(OG.w, OG.h, frame({ x: art.x, y: art.y, w: art.w, h: art.h }))), left: 0, top: 0 },
  ])
  .png()
  .toBuffer();
// composite always runs last in a sharp pipeline, so drop the alpha channel in a second pass
// 256-colour palette at full quality: about half the bytes of truecolour, no visible banding
const og = await sharp(ogLayers).removeAlpha().png({ palette: true, quality: 100, effort: 10, compressionLevel: 9 }).toBuffer();
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

for (const [rel, hash] of written) console.log(`${hash}  ${rel}`);

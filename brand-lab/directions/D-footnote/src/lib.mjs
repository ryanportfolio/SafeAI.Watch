import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

export const NM = 'C:/Users/Home/CoreWise/SafeAI.Watch-worktrees/about-film/node_modules/';
const require = createRequire(NM + 'x.js');
const fontkit = require('fontkit');
const wawoff2 = require('wawoff2');

const FILES = {
  serif: NM + '@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2',
  serifItalic: NM + '@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2',
  sans: NM + '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2',
  mono: NM + '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2',
};
const ttfCache = {};
export async function font(name, axes) {
  ttfCache[name] ??= fontkit.create(Buffer.from(await wawoff2.decompress(readFileSync(FILES[name]))));
  return ttfCache[name].getVariation(axes);
}

export const round = (s) =>
  s.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => {
    const v = Math.round(Number(n) * 100) / 100;
    return String(Object.is(v, -0) ? 0 : v);
  });

export function outline(f, text, { size, x = 0, y = 0, tracking = 0 }) {
  const run = f.layout(text);
  const k = size / f.unitsPerEm;
  let pen = 0;
  const parts = [];
  const boxes = [];
  const ds = [];
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const ox = x + (pen + pos.xOffset) * k;
    const oy = y - pos.yOffset * k;
    const d = glyph.path.transform(k, 0, 0, -k, ox, oy).toSVG();
    if (d) parts.push(round(d));
    ds.push(d ? round(d) : "");
    const b = glyph.path.bbox;
    boxes.push({ minX: ox + b.minX * k, maxX: ox + b.maxX * k, minY: oy - b.maxY * k, maxY: oy - b.minY * k });
    pen += pos.xAdvance;
    if (i < run.glyphs.length - 1) pen += tracking * f.unitsPerEm;
  });
  return { d: parts.join(""), width: pen * k, boxes, ds };
}

export const metrics = (f, size) => {
  const k = size / f.unitsPerEm;
  return { cap: f.capHeight * k, x: f.xHeight * k, asc: f.ascent * k };
};

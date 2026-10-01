/* Direction G, Valley: three refinements of F4 (the S as a valley floor on a map sheet).

   Elevation field on a 100 x 100 sheet:
     e(p) = wall(d, side) + hills(p) [+ noise(p) in G2]
     wall = W * (1 - exp(-d / lambda))   d = distance to the S spine (the valley floor)
   The wall is steep at the floor and eases with height, so the contours that
   follow the S sit close together and the S reads first; further out the wall
   levels off and the upper contours close around low hills in the open ground
   instead of running on as parallel stripes. Every line is a level set of e,
   so no two lines touch or cross. */
import * as G from './geo.mjs';

export const SHEET = 100; // square sheet, 0..100 both ways

/* The valley spine. Upper bowl a little smaller than the lower (as in a type S),
   so the two counters look equal rather than measure equal. */
export const SPINE = {
  upper: { cx: 50.5, cy: 31, rx: 21.5, ry: 18, from: 26, to: 238 },
  lower: { cx: 49.5, cy: 69.5, rx: 22.5, ry: 18.8, from: 58, to: -154 },
};

/* ---------- helpers ---------- */

/* Distance to the spine, the nearest s, and which side of the valley p lies on. */
export function spineInfo(spine) {
  return (x, y) => {
    let best = 1e9, bs = 0, side = 1;
    for (let i = 1; i < spine.length; i++) {
      const a = spine[i - 1], b = spine[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const L2 = dx * dx + dy * dy;
      let t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + dx * t, py = a.y + dy * t;
      const d = Math.hypot(x - px, y - py);
      if (d < best) {
        best = d;
        bs = G.lerp(a.s, b.s, t);
        side = dx * (y - a.y) - dy * (x - a.x) >= 0 ? 1 : -1;
      }
    }
    return [best, bs, side];
  };
}

/* Seeded value noise, smooth, summed over octaves; returns roughly -1..1. */
export function noise2(seed) {
  const hash = (i, j) => {
    let h = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const vn = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y);
    const u = G.smooth(x - i), v = G.smooth(y - j);
    return G.lerp(G.lerp(hash(i, j), hash(i + 1, j), u), G.lerp(hash(i, j + 1), hash(i + 1, j + 1), u), v) * 2 - 1;
  };
  return (x, y, f = 1, oct = 3) => {
    let a = 0, amp = 1, norm = 0;
    for (let o = 0; o < oct; o++) {
      a += amp * vn(x * f * 2 ** o, y * f * 2 ** o);
      norm += amp;
      amp *= 0.5;
    }
    return a / norm;
  };
}

const bump = (x, y, h) => h.a * Math.exp(-((x - h.x) ** 2) / (2 * (h.sx ?? h.s) ** 2) - ((y - h.y) ** 2) / (2 * (h.sy ?? h.s) ** 2));

/* ---------- tracing and clipping ---------- */

/* Clip a traced line to the box [lo, hi]^2. Crossing points by bisection. */
function clipBox(c, lo, hi) {
  const inside = (p) => p[0] > lo && p[0] < hi && p[1] > lo && p[1] < hi;
  const P = c.closed ? [...c.pts, c.pts[0]] : c.pts;
  if (P.every(inside)) return [c];
  const cross = (a, b) => {
    let p = a, q = b;
    for (let k = 0; k < 24; k++) {
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (inside(m) === inside(a)) p = m; else q = m;
    }
    return p;
  };
  const out = [];
  let cur = [];
  for (let i = 0; i < P.length; i++) {
    const ins = inside(P[i]);
    if (i > 0 && ins !== inside(P[i - 1])) {
      const x = cross(P[i - 1], P[i]);
      if (ins) cur = [x]; else { cur.push(x); out.push(cur); cur = []; }
    }
    if (ins) cur.push(P[i]);
  }
  if (cur.length) out.push(cur);
  if (c.closed && out.length > 1 && inside(P[0])) {
    const last = out.pop();
    out[0] = [...last, ...out[0]];
  }
  return out.filter((p) => p.length > 1).map((pts) => ({ pts, closed: false }));
}

/* Lines are traced past the sheet (to BLEED) and cut flush by a clip path at the
   sheet edge, so every end is square to the edge. Pieces that only graze the
   sheet (a sliver along an edge or across a corner) are dropped. */
const BLEED = 2;
function trace(g, levels, { step = 2.2 } = {}) {
  const lines = [];
  levels.forEach((L, li) => {
    for (const c of G.contour(g, L))
      for (const piece of clipBox(c, -BLEED, SHEET + BLEED)) {
        const len = G.polyLength(piece.pts, piece.closed);
        // depth: how far the piece reaches into the sheet from its nearest edge
        const depth = Math.max(...piece.pts.map(([x, y]) => Math.min(x, y, SHEET - x, SHEET - y)));
        // loops under 16 around (a crown too small to draw cleanly) are left to the ground, as a map would
        if (len < 8 || depth < 4.5 || (piece.closed && len < 16)) continue;
        lines.push({ ...piece, L, li, d: G.toPath(piece, step, 2) });
      }
  });
  return lines;
}

/* ---------- the three fields ---------- */

const G1_HILLS = [
  { x: 92, y: 6, a: 6.5, s: 11 }, // beyond the upper terminal
  { x: 8, y: 94, a: 6.5, s: 11 }, // beyond the lower terminal
  { x: 2, y: 46, a: 5, sx: 7, sy: 16 }, // the left shoulder, long so it runs off the sheet as a ridge
  { x: 98, y: 55, a: 5, sx: 7, sy: 16 }, // the right shoulder
];

function field1(spine) {
  const info = spineInfo(spine);
  return (x, y) => {
    const [d] = info(x, y);
    let e = 40 * (1 - Math.exp(-d / 19));
    for (const h of G1_HILLS) e += bump(x, y, h);
    return e;
  };
}

function field2(spine) {
  const info = spineInfo(spine);
  const n = noise2(7);
  const w = noise2(19);
  return (x, y) => {
    // a slight domain wobble, then a valley steeper on one side than the other
    const wx = x + 2.2 * w(x, y, 0.05, 2), wy = y + 2.2 * w(x + 31, y - 17, 0.05, 2);
    const [d, s, side] = info(wx, wy);
    const lambda = side > 0 ? 15 : 23; // the outer bank of each bend is the steep one
    let e = 40 * (1 - Math.exp(-d / lambda));
    e *= 1 + 0.1 * Math.sin(s * Math.PI * 3 + 0.8); // the floor falls and rises a little along its length
    for (const h of G1_HILLS) e += bump(wx, wy, { ...h, a: h.a * 1.15 });
    e += 3.4 * n(wx, wy, 0.06, 3);
    return e;
  };
}

/* Elevation levels: equal steps, so line density is the slope. The first sits
   about 4.5 units from the floor, so the valley (9 wide) is the widest open band
   in the sheet and the S reads before the lines do. */
const LEVELS = [8.5, 14, 19.5, 25, 30.5, 36, 41.5];

/* Place the point on the valley floor where the floor crosses the sheet's
   centre line (x = 50): the middle of the S, equal ground either way. */
function floorPoint(spine) {
  let best = spine[0];
  for (const p of spine) if (Math.abs(p.x - 50) + Math.abs(p.y - 50) * 0.25 < Math.abs(best.x - 50) + Math.abs(best.y - 50) * 0.25) best = p;
  return { x: +best.x.toFixed(2), y: +best.y.toFixed(2) };
}

function build(fieldFn, { sw = 0.95, res = 3.5 } = {}) {
  const spine = G.sSpine({ ...SPINE, n: 500 });
  const g = G.fill(G.grid(-8, -8, SHEET + 8, SHEET + 8, res), fieldFn(spine));
  G.blur(g, 1.4);
  const lines = trace(g, LEVELS);
  return { spine, lines, sw, levelCount: LEVELS.length, view: { x: 0, y: 0, w: SHEET, h: SHEET }, dot: { ...floorPoint(spine), r: 2.3 } };
}

export const G1 = () => build(field1);
export const G2 = () => build(field2);

/* ---------- favicons: the ink sheet with the valley cut out ---------- */

/* One floor, cut at elevation 13.5 (about 7 units from the floor, 2 px wide at 16 px) so it survives 16 px. Scale:
   the 100-unit sheet maps to 30 units of the 32 box (1 unit = 0.5 px at 16 px). */
export function fav(fieldFn, { marker = false } = {}) {
  const spine = G.sSpine({ ...SPINE, n: 400 });
  const g = G.fill(G.grid(-8, -8, SHEET + 8, SHEET + 8, 2.5), fieldFn(spine));
  G.blur(g, 1.6);
  const k = 30 / SHEET, o = 1;
  // keep the valley loop only (the grid border also closes a loop at this level)
  const floor = G.contour(g, 13.5)
    .filter((c) => G.polyLength(c.pts, c.closed) > 20 && c.pts.every(([x, y]) => x > -2 && y > -2 && x < SHEET + 2 && y < SHEET + 2))
    .map((c) => G.toPath({ pts: c.pts.map(([x, y]) => [x * k + o, y * k + o]), closed: c.closed }, 1.1, 1))
    .join('');
  const p = floorPoint(spine);
  const px = +(p.x * k + o).toFixed(2), py = +(p.y * k + o).toFixed(2);
  return {
    body: (c, u = 'gf') =>
      `<mask id="${u}" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32"><rect width="32" height="32" fill="#fff"/><path d="${floor}" fill="#000"/></mask>` +
      `<rect x="${o}" y="${o}" width="30" height="30" rx="3.5" fill="${c.ink}" mask="url(#${u})"/>` +
      (marker ? triangle(px, py, 4, c.orange) : `<circle cx="${px}" cy="${py}" r="3" fill="${c.orange}"/>`),
  };
}
export const G1fav = () => fav(field1);
export const G2fav = () => fav(field2);
export const G3fav = () => fav(field1, { marker: true });

/* A triangulation mark: an equilateral triangle centred on the point. */
export function triangle(x, y, r, fill, extra = '') {
  const pts = [-90, 30, 150].map((a) => [x + r * Math.cos((a * Math.PI) / 180), y + r * Math.sin((a * Math.PI) / 180)]);
  return `<path d="M${pts.map((p) => p.map((v) => +v.toFixed(2)).join(' ')).join('L')}Z" fill="${fill}"${extra}/>`;
}

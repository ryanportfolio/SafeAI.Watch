/* The SafeAI.watch mark, G3 "Valley · Marker": geometry only, no colours, no files.

   Moved here from brand-lab/directions/G-valley (geo.mjs + variants.mjs, G1 field with
   the G3 marker and neatline); build-brand.mjs turns it into every brand asset. The lab
   copy stays as the record of how the mark was chosen.

   The S is the floor of a valley on a 100 x 100 map sheet. Every line is a level set of
   one elevation field
       e(p) = 40 * (1 - exp(-d / 19)) + four low hills,   d = distance to the S spine
   sampled on a grid and traced with marching squares, so no two lines touch or cross.
   Levels sit at equal steps, so line density shows slope. An orange triangulation mark
   sits where the floor crosses the sheet's vertical centre line.

   Pure arithmetic on fixed inputs: same numbers out on every run.
*/

export const SHEET = 100;
/* G3 neatline: hairline on the sheet edge, ticks running TICK units past each corner. */
export const TICK = 4;
export const NEATLINE = 0.45;
export const STROKE = 0.95;
/* Marker in the full mark: hairline triangle (circumradius, stroke) around a dot. */
export const MARKER = { r: 3.1, stroke: 0.85, dot: 1.05 };

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/* ---------- spine ---------- */

/* Upper bowl a little smaller than the lower (as in a type S), so the counters look equal. */
const SPINE = {
  upper: { cx: 50.5, cy: 31, rx: 21.5, ry: 18, from: 26, to: 238 },
  lower: { cx: 49.5, cy: 69.5, rx: 22.5, ry: 18.8, from: 58, to: -154 },
};

/* Two elliptical arcs turning opposite ways, the seam relaxed into one diagonal,
   resampled to n points evenly spaced by arc length: [{ x, y, s }]. */
function sSpine(n) {
  const raw = [];
  for (const e of [SPINE.upper, SPINE.lower])
    for (let k = 0; k <= 300; k++) {
      const t = ((e.from + (e.to - e.from) * (k / 300)) * Math.PI) / 180;
      raw.push([e.cx + e.rx * Math.cos(t), e.cy - e.ry * Math.sin(t)]);
    }
  return resample(relaxPolyline(raw, 40, 0.5), n);
}

/* Laplacian smoothing; open lines keep their end points. */
function relaxPolyline(pts, iters, w = 0.5, closed = false) {
  let p = pts.map((q) => [q[0], q[1]]);
  const n = p.length;
  for (let it = 0; it < iters; it++) {
    const q = p.map((v) => [v[0], v[1]]);
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) continue;
      const a = p[(i - 1 + n) % n];
      const b = p[(i + 1) % n];
      q[i][0] = lerp(p[i][0], (a[0] + b[0]) / 2, w);
      q[i][1] = lerp(p[i][1], (a[1] + b[1]) / 2, w);
    }
    p = q;
  }
  return p;
}

/* Evenly spaced resample by arc length: [{ x, y, s }]. */
function resample(pts, n, closed = false) {
  const P = closed ? [...pts, pts[0]] : pts;
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = cum[cum.length - 1];
  const out = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const d = closed ? (total * k) / n : (total * k) / (n - 1);
    while (j < cum.length - 1 && cum[j] < d) j++;
    const t = (d - cum[j - 1]) / (cum[j] - cum[j - 1] || 1);
    out.push({ x: lerp(P[j - 1][0], P[j][0], t), y: lerp(P[j - 1][1], P[j][1], t), s: closed ? k / n : k / (n - 1) });
  }
  return out;
}

function polyLength(pts, closed) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (closed) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  return L;
}

/* ---------- elevation field ---------- */

function grid(x0, y0, x1, y1, res) {
  const W = Math.round((x1 - x0) * res) + 1;
  const H = Math.round((y1 - y0) * res) + 1;
  return { x0, y0, res, W, H, v: new Float32Array(W * H) };
}

function fill(g, fn) {
  for (let j = 0; j < g.H; j++) {
    const y = g.y0 + j / g.res;
    for (let i = 0; i < g.W; i++) g.v[j * g.W + i] = fn(g.x0 + i / g.res, y);
  }
  return g;
}

/* Separable Gaussian blur, sigma in field units. */
function blur(g, sigma) {
  const rad = Math.ceil(sigma * g.res * 3);
  const k = [];
  let sum = 0;
  for (let i = -rad; i <= rad; i++) {
    const w = Math.exp(-((i / g.res) ** 2) / (2 * sigma * sigma));
    k.push(w);
    sum += w;
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const { W, H } = g;
  const tmp = new Float32Array(W * H);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      let a = 0;
      for (let t = -rad; t <= rad; t++) a += k[t + rad] * g.v[j * W + Math.min(W - 1, Math.max(0, i + t))];
      tmp[j * W + i] = a;
    }
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      let a = 0;
      for (let t = -rad; t <= rad; t++) a += k[t + rad] * tmp[Math.min(H - 1, Math.max(0, j + t)) * W + i];
      g.v[j * W + i] = a;
    }
  return g;
}

/* Distance from p to the spine polyline. */
function spineDistance(spine) {
  return (x, y) => {
    let best = 1e9;
    for (let i = 1; i < spine.length; i++) {
      const a = spine[i - 1], b = spine[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      let t = ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy);
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)));
    }
    return best;
  };
}

const HILLS = [
  { x: 92, y: 6, a: 6.5, s: 11 }, // beyond the upper terminal
  { x: 8, y: 94, a: 6.5, s: 11 }, // beyond the lower terminal
  { x: 2, y: 46, a: 5, sx: 7, sy: 16 }, // the left shoulder, long so it runs off the sheet as a ridge
  { x: 98, y: 55, a: 5, sx: 7, sy: 16 }, // the right shoulder
];
const bump = (x, y, h) => h.a * Math.exp(-((x - h.x) ** 2) / (2 * (h.sx ?? h.s) ** 2) - ((y - h.y) ** 2) / (2 * (h.sy ?? h.s) ** 2));

function elevation(spine) {
  const dist = spineDistance(spine);
  return (x, y) => {
    let e = 40 * (1 - Math.exp(-dist(x, y) / 19));
    for (const h of HILLS) e += bump(x, y, h);
    return e;
  };
}

/* ---------- marching squares ---------- */

/* [{ pts: [[x, y], ...], closed }]. Segments are stitched by the id of the grid edge they
   cross, so joins are exact. Saddles resolve by the cell centre average. Values outside
   the grid count as below every level. */
function contour(g, level) {
  const { W, H, v, x0, y0, res } = g;
  const val = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? -1e9 : v[j * W + i]);
  const pt = new Map();
  const edgePoint = (id) => {
    if (pt.has(id)) return pt.get(id);
    const horiz = id % 2 === 0;
    const cell = id >> 1;
    const i = (cell % (W + 2)) - 1;
    const j = Math.floor(cell / (W + 2)) - 1;
    const a = val(i, j);
    const b = horiz ? val(i + 1, j) : val(i, j + 1);
    const t = (level - a) / (b - a);
    const p = horiz ? [x0 + (i + t) / res, y0 + j / res] : [x0 + i / res, y0 + (j + t) / res];
    pt.set(id, p);
    return p;
  };
  const hid = (i, j) => 2 * ((j + 1) * (W + 2) + (i + 1));
  const vid = (i, j) => 2 * ((j + 1) * (W + 2) + (i + 1)) + 1;
  const adj = new Map();
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
  };
  for (let j = -1; j < H; j++)
    for (let i = -1; i < W; i++) {
      const a = val(i, j) > level ? 1 : 0;
      const b = val(i + 1, j) > level ? 1 : 0;
      const c = val(i + 1, j + 1) > level ? 1 : 0;
      const d = val(i, j + 1) > level ? 1 : 0;
      const idx = a | (b << 1) | (c << 2) | (d << 3);
      if (idx === 0 || idx === 15) continue;
      const T = hid(i, j), B = hid(i, j + 1), L = vid(i, j), R = vid(i + 1, j);
      const centre = (val(i, j) + val(i + 1, j) + val(i + 1, j + 1) + val(i, j + 1)) / 4 > level;
      switch (idx) {
        case 1: case 14: link(L, T); break;
        case 2: case 13: link(T, R); break;
        case 4: case 11: link(R, B); break;
        case 8: case 7: link(B, L); break;
        case 3: case 12: link(L, R); break;
        case 6: case 9: link(T, B); break;
        case 5: if (centre) { link(L, B); link(T, R); } else { link(L, T); link(R, B); } break;
        case 10: if (centre) { link(L, T); link(R, B); } else { link(T, R); link(B, L); } break;
      }
    }
  const seen = new Set();
  const lines = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const ids = [start];
    seen.add(start);
    let prev = null;
    let cur = start;
    for (;;) {
      const nx = adj.get(cur).find((n) => n !== prev && !seen.has(n));
      if (nx === undefined) break;
      ids.push(nx);
      seen.add(nx);
      prev = cur;
      cur = nx;
    }
    const closed = adj.get(cur).includes(start) && ids.length > 2;
    lines.push({ pts: ids.map(edgePoint), closed });
  }
  return lines;
}

/* ---------- path output ---------- */

export const fmt = (n) => {
  const v = Math.round(n * 100) / 100;
  return String(Object.is(v, -0) ? 0 : v);
};

/* Smooth a traced line and write it as cubic Beziers (Catmull-Rom through knots spaced
   about `step` apart). */
function toPath(line, step, relax) {
  const L = polyLength(line.pts, line.closed);
  const n = Math.max(line.closed ? 8 : 4, Math.round(L / step));
  let k = resample(line.pts, n, line.closed).map((q) => [q.x, q.y]);
  k = relaxPolyline(k, relax, 0.35, line.closed);
  const N = k.length;
  const at = (i) => (line.closed ? k[(i + N) % N] : k[Math.max(0, Math.min(N - 1, i))]);
  let d = `M${fmt(k[0][0])} ${fmt(k[0][1])}`;
  const segs = line.closed ? N : N - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d + (line.closed ? 'Z' : '');
}

/* ---------- tracing and clipping ---------- */

/* Clip a traced line to the box [lo, hi]^2, crossing points found by bisection. */
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

/* Equal steps, so line density is the slope. The first sits about 4.5 units from the
   floor, so the valley (9 wide) is the widest open band and the S reads first. */
const LEVELS = [8.5, 14, 19.5, 25, 30.5, 36, 41.5];
/* Lines are traced 2 units past the sheet and cut flush by a clip path at its edge.
   Pieces that only graze the sheet, and crowns under 16 units around, are dropped. */
const BLEED = 2;

/* The point: on the valley floor where it crosses the sheet's centre line (x = 50). */
function floorPoint(spine) {
  const cost = (p) => Math.abs(p.x - 50) + Math.abs(p.y - 50) * 0.25;
  let best = spine[0];
  for (const p of spine) if (cost(p) < cost(best)) best = p;
  return { x: +best.x.toFixed(2), y: +best.y.toFixed(2) };
}

/* Smallest distance between any two traced lines (sampled), for the no-touch check. */
function minGap(lines) {
  let best = 1e9;
  for (let a = 0; a < lines.length; a++)
    for (let b = a + 1; b < lines.length; b++) {
      const A = lines[a].pts, B = lines[b].pts;
      for (let i = 0; i < A.length; i += 2)
        for (let j = 0; j < B.length; j += 2) best = Math.min(best, Math.hypot(A[i][0] - B[j][0], A[i][1] - B[j][1]));
    }
  return best;
}

/* The full mark in sheet units: contour paths (clip them to the sheet), the point, and
   the measured clearances. Throws if a line comes closer than the stroke allows or
   crowds the marker. */
export function mark() {
  const spine = sSpine(500);
  const g = blur(fill(grid(-8, -8, SHEET + 8, SHEET + 8, 3.5), elevation(spine)), 1.4);
  const lines = [];
  for (const L of LEVELS)
    for (const c of contour(g, L))
      for (const piece of clipBox(c, -BLEED, SHEET + BLEED)) {
        const len = polyLength(piece.pts, piece.closed);
        const depth = Math.max(...piece.pts.map(([x, y]) => Math.min(x, y, SHEET - x, SHEET - y)));
        if (len < 8 || depth < 4.5 || (piece.closed && len < 16)) continue;
        lines.push({ ...piece, d: toPath(piece, 2.2, 2) });
      }
  const point = floorPoint(spine);
  const gap = minGap(lines) - STROKE;
  let near = 1e9;
  for (const l of lines) for (const p of l.pts) near = Math.min(near, Math.hypot(p[0] - point.x, p[1] - point.y));
  const clearance = near - (MARKER.r + MARKER.stroke / 2) - STROKE / 2;
  if (gap < 0.8) throw new Error(`mark: contours ${gap.toFixed(2)} apart, closer than the stroke allows`);
  if (clearance < 0.4) throw new Error(`mark: the marker is crowded by a line (${clearance.toFixed(2)})`);
  return { paths: lines.map((l) => l.d), point, gap, clearance };
}

/* ---------- small form: the ink sheet with the valley cut out ---------- */

/* Below 48 px the contours fill in, so small sizes use one floor cut at elevation 13.5
   (about 7 units from the floor, 2 px wide at 16 px) and a solid triangle on the point.
   `place(x, y)` maps sheet units to output units and `k` is its scale; the knot spacing
   follows k, so the curve has the same shape at every size. Returns the valley loop as a
   path and the triangle's corners, both in output units. */
export function valley(place, k) {
  const spine = sSpine(400);
  const g = blur(fill(grid(-8, -8, SHEET + 8, SHEET + 8, 2.5), elevation(spine)), 1.6);
  // keep the valley loop only (the grid border also closes a loop at this level)
  const loops = contour(g, 13.5).filter(
    (c) => polyLength(c.pts, c.closed) > 20 && c.pts.every(([x, y]) => x > -2 && y > -2 && x < SHEET + 2 && y < SHEET + 2),
  );
  if (loops.length !== 1 || !loops[0].closed) throw new Error(`valley: expected one closed floor loop, got ${loops.length}`);
  const pts = loops[0].pts.map(([x, y]) => place(x, y));
  const p = floorPoint(spine);
  const [px, py] = place(p.x, p.y);
  return { d: toPath({ pts, closed: true }, (11 / 3) * k, 1), pts, triangle: triangle(px, py, (40 / 3) * k) };
}

/* Corners of an equilateral triangle, point up, centred on (x, y). */
export function triangle(x, y, r) {
  return [-90, 30, 150].map((a) => [x + r * Math.cos((a * Math.PI) / 180), y + r * Math.sin((a * Math.PI) / 180)]);
}
export const trianglePath = (corners) => `M${corners.map((p) => p.map(fmt).join(' ')).join('L')}Z`;

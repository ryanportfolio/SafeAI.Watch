/* Contour geometry for direction F (topographic S).

   Every line in the marks is a level set of a height field sampled on a grid and
   traced with marching squares. Level sets of one continuous field cannot touch
   or cross, so the no-touch rule holds by construction; spacing is set by the
   field's slope, which the ridge field below keeps at exactly 1.

   Ridge field (F1, F2, favicons): a range of cones of slope 1 whose apexes run
   along an S-shaped spine c(s) at heights r(s):
       h(p) = max_i ( r(s_i) - |p - c(s_i)| )
   The contour at level L is the union of discs of radius r(s) - L along the
   spine, so neighbouring contours sit exactly one level step apart. Where r(s)
   dips (the saddle at the middle of the S), the upper contours split into two
   summits. A light Gaussian blur rounds the creases a pure max() leaves inside
   tight bends without moving the lines elsewhere.
*/

/* ---------- small vector helpers ---------- */

export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);

/* Piecewise smooth interpolation through keyframes [[s, v], ...]. */
export function keyed(keys) {
  return (s) => {
    if (s <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [s1, v1] = keys[i];
      const [s0, v0] = keys[i - 1];
      if (s <= s1) return lerp(v0, v1, smooth((s - s0) / (s1 - s0)));
    }
    return keys[keys.length - 1][1];
  };
}

/* ---------- spine ---------- */

/* An S centreline from two elliptical arcs that turn opposite ways, the seam
   smoothed so the spine runs as one diagonal. Returns n points evenly spaced by
   arc length, each { x, y, s } with s in [0, 1] from the upper terminal. */
export function sSpine({
  upper = { cx: 51, cy: 35, rx: 26, ry: 23, from: 28, to: 238 },
  lower = { cx: 49, cy: 85, rx: 29, ry: 25.5, from: 58, to: -150 },
  n = 600,
  relax = 40,
} = {}) {
  const raw = [];
  const arc = (e, steps) => {
    for (let k = 0; k <= steps; k++) {
      const t = ((e.from + (e.to - e.from) * (k / steps)) * Math.PI) / 180;
      raw.push([e.cx + e.rx * Math.cos(t), e.cy - e.ry * Math.sin(t)]);
    }
  };
  arc(upper, 300);
  arc(lower, 300);
  return resample(relaxPolyline(raw, relax, 0.5), n);
}

/* Laplacian smoothing with fixed end points. */
export function relaxPolyline(pts, iters, w = 0.5, closed = false) {
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

/* Evenly spaced resample by arc length. Returns [{x, y, s}]. */
export function resample(pts, n, closed = false) {
  const P = closed ? [...pts, pts[0]] : pts;
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = cum[cum.length - 1];
  const out = [];
  let j = 1;
  const count = closed ? n : n;
  for (let k = 0; k < count; k++) {
    const d = closed ? (total * k) / n : (total * k) / (n - 1);
    while (j < cum.length - 1 && cum[j] < d) j++;
    const t = (d - cum[j - 1]) / (cum[j] - cum[j - 1] || 1);
    out.push({ x: lerp(P[j - 1][0], P[j][0], t), y: lerp(P[j - 1][1], P[j][1], t), s: closed ? k / n : k / (n - 1) });
  }
  return out;
}

export function polyLength(pts, closed) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (closed) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  return L;
}

/* ---------- grid fields ---------- */

export function grid(x0, y0, x1, y1, res) {
  const W = Math.round((x1 - x0) * res) + 1;
  const H = Math.round((y1 - y0) * res) + 1;
  return { x0, y0, res, W, H, v: new Float32Array(W * H) };
}

export function fill(g, fn) {
  for (let j = 0; j < g.H; j++) {
    const y = g.y0 + j / g.res;
    for (let i = 0; i < g.W; i++) g.v[j * g.W + i] = fn(g.x0 + i / g.res, y);
  }
  return g;
}

/* Ridge field of cones along the spine; warp (optional) displaces the sample
   point, which bends every contour together and so cannot make them cross. */
export function ridgeField(g, spine, r, warp) {
  const cs = spine.map((q) => [q.x, q.y, r(q.s)]);
  return fill(g, (x, y) => {
    if (warp) [x, y] = warp(x, y);
    let best = -1e9;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      const h = c[2] - Math.hypot(x - c[0], y - c[1]);
      if (h > best) best = h;
    }
    return best;
  });
}

/* Distance from p to the spine polyline (unsigned), plus the nearest s. */
export function spineDistance(spine) {
  return (x, y) => {
    let best = 1e9;
    let bs = 0;
    for (let i = 1; i < spine.length; i++) {
      const a = spine[i - 1];
      const b = spine[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const L2 = dx * dx + dy * dy;
      let t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
      if (d < best) {
        best = d;
        bs = lerp(a.s, b.s, t);
      }
    }
    return [best, bs];
  };
}

/* Separable Gaussian blur, sigma in field units. */
export function blur(g, sigma) {
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

/* ---------- marching squares ---------- */

/* Returns [{ pts: [[x, y], ...], closed }]. Segments are stitched by the id of
   the grid edge they cross, so joins are exact. Saddles resolve by the cell
   centre average. Values outside the grid count as below every level. */
export function contour(g, level) {
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
  // edge ids over a grid padded by one cell so open boundaries close
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
      const T = hid(i, j);
      const B = hid(i, j + 1);
      const L = vid(i, j);
      const R = vid(i + 1, j);
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

const f = (n) => {
  const v = Math.round(n * 100) / 100;
  return String(Object.is(v, -0) ? 0 : v);
};

/* Smooth a traced loop and write it as cubic Beziers (Catmull-Rom through
   evenly spaced knots). step = knot spacing in field units. */
export function toPath(line, step = 2.4, relax = 2) {
  const L = polyLength(line.pts, line.closed);
  const n = Math.max(line.closed ? 8 : 4, Math.round(L / step));
  let k = resample(line.pts, n, line.closed).map((q) => [q.x, q.y]);
  k = relaxPolyline(k, relax, 0.35, line.closed);
  const N = k.length;
  const at = (i) => (line.closed ? k[(i + N) % N] : k[Math.max(0, Math.min(N - 1, i))]);
  let d = `M${f(k[0][0])} ${f(k[0][1])}`;
  const segs = line.closed ? N : N - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (line.closed ? 'Z' : '');
}

export function bbox(lines) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const l of lines)
    for (const [x, y] of l.pts) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

/* Smallest distance between any two traced lines (sampled), for the no-touch check. */
export function minGap(lines) {
  let best = 1e9;
  for (let a = 0; a < lines.length; a++)
    for (let b = a + 1; b < lines.length; b++) {
      const A = lines[a].pts, B = lines[b].pts;
      for (let i = 0; i < A.length; i += 2)
        for (let j = 0; j < B.length; j += 2) {
          const d = Math.hypot(A[i][0] - B[j][0], A[i][1] - B[j][1]);
          if (d < best) best = d;
        }
    }
  return best;
}

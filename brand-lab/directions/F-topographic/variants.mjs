/* The four F variants and their favicons, as traced contour geometry.

   Each builder returns { lines, view, dot, sw, kind } in field units:
     lines  [{ pts, closed, L, d }]  traced level sets with their Bezier path d
     view   { x, y, w, h }           the mark's box
     dot    { x, y, r }              the one orange point
     sw     stroke width
   Favicon builders return the same shape scaled to a 32-unit box, plus `fill`
   (paths drawn as solid ink with even-odd knockouts) where a variant needs it.
*/
import * as G from './geo.mjs';

/* ---------- shared spines ---------- */

// The island S (F1, F2): curled terminals, so each end of the S holds a summit.
const ISLAND = { upper: { cx: 51, cy: 36, rx: 25, ry: 23, from: 2, to: 238 }, lower: { cx: 49, cy: 84, rx: 28, ry: 25, from: 58, to: -172 } };
// Two summits near the terminals, a saddle at the middle of the spine.
const ISLAND_R = [[0, 11], [0.07, 15], [0.17, 17], [0.32, 14], [0.5, 10.6], [0.68, 14.5], [0.83, 17.6], [0.93, 15], [1, 11]];
// Two low-frequency sines: a hand-surveyed wobble, under 1 unit, applied to the sample point.
const WARP = (x, y) => [x + 0.8 * Math.sin(y * 0.11 + 1.3), y + 0.8 * Math.sin(x * 0.09 + 0.4)];

/* ---------- tracing ---------- */

function trace(g, levels, { minLen = 9, mask, step = 2.4 } = {}) {
  const lines = [];
  levels.forEach((L, li) => {
    for (const c of G.contour(g, L))
      for (const piece of clip(c, mask))
        if (G.polyLength(piece.pts, piece.closed) > minLen) lines.push({ ...piece, L, li, d: G.toPath(piece, step) });
  });
  return lines;
}

/* Split a traced line where it leaves the mask (mask > 0 inside). Crossing points
   are found by bisection so the cut ends sit exactly on the mask edge. */
function clip(c, mask) {
  if (!mask) return [c];
  const P = c.closed ? [...c.pts, c.pts[0]] : c.pts;
  const cross = (a, b) => {
    let lo = a, hi = b;
    for (let k = 0; k < 24; k++) {
      const m = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
      if (mask(...m) > 0 === mask(...a) > 0) lo = m; else hi = m;
    }
    return lo;
  };
  const out = [];
  let cur = [];
  for (let i = 0; i < P.length; i++) {
    const inside = mask(...P[i]) > 0;
    if (i > 0 && inside !== mask(...P[i - 1]) > 0) {
      const x = cross(P[i - 1], P[i]);
      if (inside) cur = [x]; else { cur.push(x); out.push(cur); cur = []; }
    }
    if (inside) cur.push(P[i]);
  }
  if (cur.length) out.push(cur);
  const allIn = P.every((p) => mask(...p) > 0);
  if (allIn) return [c];
  if (c.closed && out.length > 1 && mask(...P[0]) > 0) {
    const last = out.pop();
    out[0] = [...last, ...out[0]];
  }
  return out.filter((p) => p.length > 1).map((pts) => ({ pts, closed: false }));
}

/* Place the point near `target`, as far from every line as it can get within
   `reach`; reports its clearance (gap between dot edge and line edge). */
function placeDot(lines, target, r, sw, reach = 8, pull = 0.12) {
  const pts = lines.flatMap((l) => l.pts);
  const clear = (x, y) => {
    let m = 1e9;
    for (const p of pts) m = Math.min(m, Math.hypot(p[0] - x, p[1] - y));
    return m;
  };
  let best = null;
  for (let dy = -reach; dy <= reach; dy += 0.25)
    for (let dx = -reach; dx <= reach; dx += 0.25) {
      const x = target[0] + dx, y = target[1] + dy;
      const c = clear(x, y);
      const score = Math.min(c, r + sw / 2 + 2.2) - pull * Math.hypot(dx, dy);
      if (!best || score > best.score) best = { x, y, score, c };
    }
  return { x: +best.x.toFixed(2), y: +best.y.toFixed(2), r, clearance: +(best.c - r - sw / 2).toFixed(2) };
}

const viewOf = (lines, pad) => {
  const b = G.bbox(lines);
  return { x: +(b.x0 - pad).toFixed(2), y: +(b.y0 - pad).toFixed(2), w: +(b.w + 2 * pad).toFixed(2), h: +(b.h + 2 * pad).toFixed(2) };
};

const spinePoint = (spine, s) => spine[Math.round(s * (spine.length - 1))];

/* ---------- F1: survey (faithful refinement) ---------- */

export function F1() {
  const spine = G.sSpine(ISLAND);
  const g = G.ridgeField(G.grid(-15, -15, 115, 135, 5), spine, G.keyed(ISLAND_R), WARP);
  G.blur(g, 1.2);
  const sw = 0.95;
  // interval 2.6. Each summit rises 1.2 to 1.6 above the top contour; the next contour up
  // would be a loop about one stroke wide, so the upper summit carries the point instead
  // (a spot height, as survey maps do).
  const lines = trace(g, [0.4, 3.0, 5.6, 8.2, 10.8, 13.4]);
  const at = spinePoint(spine, 0.13);
  return { kind: 'island', spine, lines, sw, view: viewOf(lines, sw), dot: placeDot(lines, [at.x, at.y], 2.0, sw, 6) };
}

/* ---------- F2: bold, three levels ---------- */

const F2_R = [[0, 11], [0.07, 15.5], [0.17, 18.8], [0.32, 14.5], [0.5, 10.6], [0.68, 14.5], [0.83, 18.8], [0.93, 15.5], [1, 11]];

export function F2() {
  const spine = G.sSpine(ISLAND);
  const g = G.ridgeField(G.grid(-15, -15, 115, 135, 5), spine, G.keyed(F2_R), WARP);
  G.blur(g, 1.4);
  const sw = 2.7;
  const lines = trace(g, [1.4, 7.0, 12.6], { minLen: 14 });
  const at = spinePoint(spine, 0.12);
  return { kind: 'island', spine, lines, sw, view: viewOf(lines, sw / 2 + 0.3), dot: placeDot(lines, [at.x, at.y], 2.9, sw, 6) };
}

/* ---------- F3: the S is where the lines crowd ---------- */

const F3_SPINE = { upper: { cx: 51, cy: 36, rx: 22, ry: 20, from: 15, to: 238 }, lower: { cx: 49, cy: 82, rx: 24, ry: 22, from: 58, to: -165 } };
const F3_R = [[0, 13], [0.08, 15.5], [0.25, 17], [0.5, 15.6], [0.75, 17.2], [0.92, 15.5], [1, 13]];

export function F3() {
  const spine = G.sSpine(F3_SPINE);
  const g = G.ridgeField(G.grid(-25, -25, 125, 145, 3.5), spine, G.keyed(F3_R));
  G.blur(g, 2.2);
  const sw = 0.85;
  // five tight steps (1.6) on the ridge, three wide ones (4.5 to 6) on the plain
  const lines = trace(g, [-8.5, -2.5, 2.5, 7, 8.6, 10.2, 11.8, 13.4], { minLen: 16 });
  const c = spinePoint(spine, 0.2);
  return { kind: 'island', spine, lines, sw, view: viewOf(lines, sw), dot: placeDot(lines, [c.x, c.y], 1.8, sw, 6) };
}

/* ---------- F4: the S as a valley on a map sheet ---------- */

const F4_SPINE = { upper: { cx: 51, cy: 33, rx: 22, ry: 19, from: 30, to: 238 }, lower: { cx: 49, cy: 75, rx: 24, ry: 21, from: 58, to: -150 } };
const SHEET = { x0: 3, y0: 3, x1: 97, y1: 105 };

export function F4() {
  const spine = G.sSpine(F4_SPINE);
  const dist = G.spineDistance(spine);
  const g = G.fill(G.grid(-5, -5, 105, 115, 3.5), (x, y) => -dist(x, y)[0]);
  G.blur(g, 1.8);
  const sw = 0.95;
  // levels are negative distances: the valley floor is lowest, the ground rises both ways
  // and the slope eases with height (spacing 3.6 at the floor, 4.6 at the sheet edge)
  const mask = (x, y) => Math.min(x - SHEET.x0, SHEET.x1 - x, y - SHEET.y0, SHEET.y1 - y);
  const lines = trace(g, [-3.8, -7.4, -11.2, -15.2, -19.4, -23.8, -28.4], { minLen: 10, mask });
  const mid = spinePoint(spine, 0.5);
  return { kind: 'sheet', spine, lines, sw, view: { x: SHEET.x0 - sw, y: SHEET.y0 - sw, w: SHEET.x1 - SHEET.x0 + 2 * sw, h: SHEET.y1 - SHEET.y0 + 2 * sw }, dot: placeDot(lines, [mid.x, mid.y], 2.1, sw, 2) };
}


/* ---------- favicons ----------
   Drawn on a 32-unit box: 1 unit is 1 px at 32 px and half a pixel at 16 px.
   Each returns { body(colors, uid) } with colors = { ink, orange }. Knockouts are
   masks, so every favicon stays transparent on any ground; uid keeps mask ids unique
   when several copies share a page. */

function fit32(lines, view, pad = 1) {
  const k = (32 - 2 * pad) / Math.max(view.w, view.h);
  const ox = (32 - view.w * k) / 2 - view.x * k;
  const oy = (32 - view.h * k) / 2 - view.y * k;
  const T = (p) => [p[0] * k + ox, p[1] * k + oy];
  const out = lines.map((l) => {
    const m = { ...l, pts: l.pts.map(T) };
    m.d = G.toPath(m, 1.1, 1);
    return m;
  });
  return { lines: out, k, T };
}
const r2 = (n) => +n.toFixed(2);
const boxOf = (L, grow) => { const b = G.bbox(L); return { x: b.x0 - grow, w: b.w + 2 * grow }; };

// F1: the S outline (one contour), the point capping the upper terminal. The terminals
// curl less than the mark's: at full curl the outline's inside pinches into a hook.
const ISLAND_OPEN = { upper: { ...ISLAND.upper, from: 24 }, lower: { ...ISLAND.lower, to: -158 } };
export function F1fav() {
  const spine = G.sSpine(ISLAND_OPEN);
  const r = G.keyed([[0, 17.5], [0.12, 19], [0.5, 16], [0.88, 19], [1, 17.5]]);
  const g = G.ridgeField(G.grid(-15, -15, 115, 135, 3), spine, r);
  G.blur(g, 1.5);
  const lines = trace(g, [1.2], { minLen: 20 });
  const { lines: L, T } = fit32(lines, viewOf(lines, 5.2), 0.4);
  const [dx, dy] = T([spine[0].x, spine[0].y]);
  return {
    sw: 2.3,
    box: boxOf(L, 1.15),
    body: (c) => `<path d="${L.map((l) => l.d).join('')}" fill="none" stroke="${c.ink}" stroke-width="2.3"/><circle cx="${r2(dx)}" cy="${r2(dy)}" r="3.2" fill="${c.orange}"/>`,
  };
}

// F2: the S silhouette solid, its crest line (the spine) knocked out, the point on the upper terminal.
// Across the band at 16 px that is ink 1.5 px, paper 1 px, ink 1.5 px: three features, no more.
export function F2fav() {
  const spine = G.sSpine(ISLAND);
  const r = G.keyed([[0, 15], [0.12, 17.5], [0.5, 16], [0.88, 17.5], [1, 15]]);
  const g = G.ridgeField(G.grid(-15, -15, 115, 135, 3), spine, r);
  G.blur(g, 1.5);
  const lines = trace(g, [0], { minLen: 20 });
  const { lines: L, T } = fit32(lines, viewOf(lines, 0.3), 0.4);
  const crest = spine.filter((q) => q.s > 0.1 && q.s < 0.9).map((q) => T([q.x, q.y]));
  const cd = G.toPath({ pts: crest, closed: false }, 1.1, 0);
  const [dx, dy] = T([spine[0].x, spine[0].y]);
  return {
    box: boxOf(L, 0),
    body: (c, u = 'f2') => `<mask id="${u}" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32"><rect width="32" height="32" fill="#fff"/><path d="${cd}" fill="none" stroke="#000" stroke-width="1.9" stroke-linecap="round"/><circle cx="${r2(dx)}" cy="${r2(dy)}" r="4.3" fill="#000"/></mask><path d="${L.map((l) => l.d).join('')}" fill="${c.ink}" mask="url(#${u})"/><circle cx="${r2(dx)}" cy="${r2(dy)}" r="3.3" fill="${c.orange}"/>`,
  };
}

// F3: the crowded core drawn solid, one open contour around it.
export function F3fav() {
  const spine = G.sSpine(F3_SPINE);
  const g = G.ridgeField(G.grid(-25, -25, 125, 145, 3), spine, G.keyed(F3_R));
  G.blur(g, 2.2);
  const lines = trace(g, [-7.5, 7.8], { minLen: 20 });
  const { lines: L, T } = fit32(lines, viewOf(lines, 4.5), 0.3);
  const at = spinePoint(spine, 0.22);
  const [dx, dy] = T([at.x, at.y]);
  const halo = L.filter((l) => l.li === 0).map((l) => l.d).join('');
  const core = L.filter((l) => l.li === 1).map((l) => l.d).join('');
  return {
    box: boxOf(L.filter((l) => l.li === 0), 1),
    body: (c) => `<path d="${core}" fill="${c.ink}"/><path d="${halo}" fill="none" stroke="${c.ink}" stroke-width="2"/><circle cx="${r2(dx)}" cy="${r2(dy)}" r="2.7" fill="${c.orange}"/>`,
  };
}

// F4: an ink sheet with the valley floor cut out of it; side contours dropped, they muddy 16 px.
export function F4fav() {
  const spine = G.sSpine(F4_SPINE);
  const dist = G.spineDistance(spine);
  const g = G.fill(G.grid(-5, -5, 105, 115, 3), (x, y) => -dist(x, y)[0]);
  G.blur(g, 2);
  const lines = trace(g, [-6.2], { minLen: 8 });
  const view = { x: 3, y: 3, w: 94, h: 102 };
  const { lines: L, T, k } = fit32(lines, view, 0.5);
  const [x0, y0] = T([view.x, view.y]);
  const floor = L.filter((l) => l.li === 0).map((l) => l.d).join('');
    const mid = spinePoint(spine, 0.5);
  const [dx, dy] = T([mid.x, mid.y]);
  return {
    box: { x: x0, w: view.w * k },
    body: (c, u = 'f4') =>
      `<mask id="${u}" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32"><rect width="32" height="32" fill="#fff"/><path d="${floor}" fill="#000"/></mask>` +
      `<rect x="${r2(x0)}" y="${r2(y0)}" width="${r2(view.w * k)}" height="${r2(view.h * k)}" rx="3.5" fill="${c.ink}" mask="url(#${u})"/>` +
      `<circle cx="${r2(dx)}" cy="${r2(dy)}" r="2.5" fill="${c.orange}"/>`,
  };
}

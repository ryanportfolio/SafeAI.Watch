// The chart (director C, story spine v2): one nautical sheet that accumulates the argument.
// World units: the sheet is 3600 x 2000, y grows down (south). The lower band of the sheet is
// open water on purpose: captions sit there in every full view, so no mark goes under them.
// Every mark's state is a function of t and of cue times read from beats.json.
// Marks are conceptual; only counted marks carry numbers and each count is exact:
// 122 runs, 10 runs, 19 actions (H40); 13% to 0.4% (P32). The current, forks, fog and the
// ring shapes carry no data.
import { clamp, lerp, rise, easeOut, easeIn, easeInOut, smooth, mulberry32, windowAlpha } from './util.js';
import { path, seg, dot, ring, glow, poly, partial, frame, crosshair } from './draw.js';
import { STAGE_W } from './camera.js';

const TAU = Math.PI * 2;
export const SHEET = { x0: 80, y0: 80, x1: 3520, y1: 1920 };

// ---------- geometry (built once, constant) ----------

// The current: the capability. It leaves the coast and runs toward the fog.
const A0 = { x: 380, y: 1250 }, A1 = { x: 3450, y: 420 };
const D = { x: A1.x - A0.x, y: A1.y - A0.y };
const LEN = Math.hypot(D.x, D.y);
const U = { x: D.x / LEN, y: D.y / LEN };
const N = { x: -U.y, y: U.x }; // normal, pointing south-east
export function stream(k, s) {
  const o = 80 * Math.sin(Math.PI * s * 1.4 + 0.2) + k * 26 * (0.85 + 0.3 * s);
  return { x: A0.x + D.x * s + N.x * o, y: A0.y + D.y * s + N.y * o };
}
const STREAMS = [];
for (let k = -5; k <= 5; k++) {
  const pts = [];
  for (let i = 0; i <= 140; i++) pts.push(stream(k, i / 140));
  STREAMS.push({ k, pts });
}

const shoreX = (y) => 330 + 50 * Math.sin(y * 0.0042) + 25 * Math.sin(y * 0.013 + 1);
const LAND = [{ x: SHEET.x0, y: SHEET.y0 }];
for (let y = SHEET.y0; y <= SHEET.y1; y += 20) LAND.push({ x: shoreX(y), y });
LAND.push({ x: SHEET.x0, y: SHEET.y1 });
const CONTOURS = [70, 140].map((o) => { const pts = []; for (let y = SHEET.y0; y <= SHEET.y1; y += 24) pts.push({ x: shoreX(y) + o, y }); return pts; });

// Three forks on the one current: sight (B18), code (P24 / H23), biology (B4 / T5).
// Each is one neutral ring splitting into a benefit light (north) and a hazard (south).
const bez = (a, c, b, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y }; });
const add = (p, a, b = 0) => ({ x: p.x + U.x * a + N.x * b, y: p.y + U.y * a + N.y * b });
export const FORKS = [0.2, 0.4, 0.6].map((s, i) => {
  const F = stream(0, s);
  const up = add(F, 150, -250), dn = add(F, 150, 250);
  return {
    F, up, dn,
    hazard: i === 2 ? 'test' : 'harm', // the biology hazard is a benchmark result: drawn as a test, in ink
    north: bez(F, add(F, 30, -150), up),
    south: bez(F, add(F, 30, 150), dn),
  };
});
const FORK_BEAT = ['B3', 'B4', 'B5'];

// Test basin (harbor): 122 soundings, 14 per row (H40 denominator, site record #34)
const BASIN = { x0: 520, y0: 240, x1: 1200, y1: 650 };
const GRID = [];
for (let i = 0; i < 122; i++) GRID.push({ x: 565 + (i % 14) * 42, y: 280 + Math.floor(i / 14) * 40 });
const ORANGE = (() => {
  const r = mulberry32(20260930), picked = new Set();
  while (picked.size < 10) picked.add(Math.floor(r() * 122));
  return [...picked].sort((a, b) => a - b);
})();
const GATE = { x: BASIN.x0, y: 450 };
const TICKS = Array.from({ length: 19 }, (_, i) => { const y = 300 + (i * 300) / 18; return { x: shoreX(y) + 6, y }; });
const STOP_TICK = 9; // the line the camera follows to the shore (H42)
const MEASURE = { x: 1150, y: 262, unit: 26 }; // 13% -> 338, 0.4% -> 10.4 (P32 ratio)

// Laws: a buoyed blue channel out of the harbor (L37, L14)
const CH0 = { x: 1260, y: 470 }, CH1 = { x: 2000, y: 300 };
const CHN = (() => { const dx = CH1.x - CH0.x, dy = CH1.y - CH0.y, l = Math.hypot(dx, dy); return { x: -dy / l, y: dx / l }; })();
const chan = (u, side = 0) => ({ x: lerp(CH0.x, CH1.x, u) + CHN.x * side * 26, y: lerp(CH0.y, CH1.y, u) + CHN.y * side * 26 });
const CH_BUOYS = [chan(0.3, -1), chan(0.72, 1)];

const FOG = [{ x: 3150, y: 380, r: 720, p: 0 }, { x: 2880, y: 240, r: 520, p: 1.7 }, { x: 3380, y: 760, r: 520, p: 3.1 }, { x: 3330, y: 170, r: 420, p: 4.4 }, { x: 2720, y: 560, r: 340, p: 5.2 }];
const FOG_DROP = { x: 3150, y: 470 };
const END_FROM = FORKS[1].F; // the middle fork's neutral ring becomes the crosshair

// ---------- cues from beats.json ----------

export function makeCues(data) {
  const B = Object.fromEntries(data.beats.map((b) => [b.id, b]));
  const s = (id) => B[id].start, a = (id) => B[id].statement.at, e = (id) => B[id].end;
  return {
    B, s, a, e,
    lift: e('B2') - 1.2, // the label chips lift and the record is revealed
    dusk: s('B12') - 0.2, // dusk sweeps in from the fog while no caption is on screen
    close: s('B16'),
  };
}

// ---------- camera path ----------

const FULL = { cx: 1800, cy: 1000, zoom: 0.5, pitch: 0 };
export function cameraKeys(c) {
  const k = (id, pose, dur = 1.4, lead = 0.3, drift) => ({ at: Math.max(0, c.s(id) - lead), dur, pose, drift });
  const fork = (i) => ({ cx: FORKS[i].F.x + 110, cy: FORKS[i].F.y - 10, zoom: 0.95, pitch: 0.15 });
  return [
    { at: 0, dur: 0.001, pose: { cx: 1800, cy: 1000, zoom: 0.56, pitch: 0 } },
    k('B2', FULL, 1.6),
    { at: c.lift + 0.2, dur: 1.8, pose: fork(0) },
    k('B4', fork(1), 1.5),
    k('B5', fork(2), 1.5),
    k('B6', { ...FULL, pitch: 0.12 }, 1.6, 0.2),
    k('B7', { cx: 880, cy: 470, zoom: 1.05, pitch: 0.25 }, 1.5),
    k('B8', { cx: 820, cy: 450, zoom: 1.15, pitch: 0.28 }, 1.2),
    k('B9', { cx: 450, cy: 450, zoom: 1.6, pitch: 0.28 }, 1.4),
    k('B10', { cx: 1060, cy: 440, zoom: 1.3, pitch: 0.12 }, 1.4),
    k('B11', { cx: 1640, cy: 470, zoom: 1.0, pitch: 0.15 }, 1.3),
    k('B12', { cx: 1850, cy: 960, zoom: 0.5, pitch: 0.35 }, 2.4, 0.2),
    k('B13', { cx: 1800, cy: 980, zoom: 0.5, pitch: 0.2 }, 2.0, 0.2),
    k('B16', { cx: END_FROM.x, cy: END_FROM.y + 60, zoom: 1.4, pitch: 0 }, 1.5, 0),
  ];
}

// ---------- label anchors (world points + chip offset in stage px) ----------

const ANCHORS = {
  'B8:0': { w: TICKS[3], dx: -40, dy: -60, alignRight: true },
  'B10:0': { w: { x: MEASURE.x, y: MEASURE.y + 13 * MEASURE.unit }, dx: 34, dy: 0 },
  'B10:1': { w: { x: MEASURE.x, y: MEASURE.y + 0.4 * MEASURE.unit }, dx: 34, dy: 0 },
  'B11:0': { w: CH_BUOYS[0], dx: 36, dy: 30 },
  'B11:1': { w: CH_BUOYS[1], dx: 36, dy: -30 },
  // label chips cover the whole map, one half each, identical size
  'B2:0': { rect: [SHEET.x0, SHEET.y0, 1800, SHEET.y1] },
  'B2:1': { rect: [1800, SHEET.y0, SHEET.x1, SHEET.y1] },
};
FORKS.forEach((f, i) => {
  ANCHORS[`${FORK_BEAT[i]}:0`] = { w: f.up, dx: 36, dy: -24, col: 'amber' };
  ANCHORS[`${FORK_BEAT[i]}:1`] = { w: f.dn, dx: 36, dy: 24, col: f.hazard === 'test' ? 'ink' : 'orange' };
});
export const anchorFor = (beatId, i) => ANCHORS[`${beatId}:${i}`] || null;

// ---------- drawing ----------

// Drop: a dashed sounding line falls from above and touches the paper, then a pulse ring
// spreads (K46). Screen-space vertical so it reads at any camera pitch.
function drop(ctx, P, t0, t, col, pal, sc, { hang = false } = {}) {
  if (t < t0) return;
  const u = easeOut((t - t0) / 0.8);
  const top = P.y - 320;
  const tip = lerp(top, P.y, u);
  const fade = hang ? 1 : 1 - smooth((t - t0 - 0.9) / 0.6);
  seg(ctx, { x: P.x, y: top }, { x: P.x, y: tip }, { color: pal.ink, alpha: 0.6 * fade, width: 1.5, dash: [5, 5] });
  if (!hang && t >= t0 + 0.8) {
    const v = (t - t0 - 0.8) / 1.3;
    if (v < 1) ring(ctx, P, 6 + 44 * easeOut(v) * sc, { color: col, alpha: 0.7 * (1 - v), width: 1.5, cp: 1 });
  }
}

function light(ctx, P, t0, t, pal, sc, still) {
  const a = rise(t, t0, 0.6);
  if (a <= 0) return;
  glow(ctx, P, 34 * sc, pal.amber, 0.35 * a * (0.8 + 0.4 * pal.dusk));
  dot(ctx, P, 5 * sc, pal.amber, a);
  if (!still) {
    const ph = ((((t - t0) % 1.9) + 1.9) % 1.9) / 1.9; // ambient pulse every 1.9 s (K46)
    ring(ctx, P, (8 + 22 * ph) * sc, { color: pal.amber, alpha: 0.35 * a * (1 - ph), width: 1.2 });
  }
}

function hazard(ctx, P, t0, t, pal, sc, cp, kind) {
  const a = rise(t, t0, 0.4);
  if (a <= 0) return;
  const u = easeOut((t - t0) / 0.8);
  if (kind === 'test') {
    // a benchmark result: an ink sounding inside a small dashed test frame, not a harm mark
    dot(ctx, P, 4.5 * sc, pal.ink, a);
    const r = 16 * sc;
    frame(ctx, [{ x: P.x - r, y: P.y - r * cp }, { x: P.x + r, y: P.y - r * cp }, { x: P.x + r, y: P.y + r * cp }, { x: P.x - r, y: P.y + r * cp }], { color: pal.ink, alpha: a * u, width: 1.3, tick: 6, dashAlpha: 0.6 });
    return;
  }
  dot(ctx, P, 5 * sc, pal.orange, a);
  ring(ctx, P, 16 * sc, { color: pal.orange, alpha: a, width: 1.5, dash: [2, 4], cp, to: TAU * u });
}

export function drawWorld(ctx, t, pr, pal, c, { still = false } = {}) {
  const P = (w, z = 0) => pr.point(w.x, w.y, z);
  const sc0 = clamp(pr.pose.zoom, 0.85, 1.7); // marks stay legible in the full views
  const cp = pr.cp;
  const ink = pal.ink;
  const march = still ? 0 : t;
  const wa = 1 - easeInOut((t - c.close) / 1.2);
  if (wa <= 0.001) { endMark(ctx, t, pr, pal, c); return; }
  ctx.save();
  ctx.globalAlpha = wa;

  // the blank chart: land, contours, graticule, neatline
  poly(ctx, LAND.map((w) => P(w)), ink, 0.07);
  path(ctx, LAND.slice(1, -1).map((w) => P(w)), { color: ink, alpha: 0.55, width: 1.3 });
  CONTOURS.forEach((pts, i) => path(ctx, pts.map((w) => P(w)), { color: ink, alpha: 0.18 - i * 0.06, width: 1, dash: [3, 6] }));
  const sheetIn = easeInOut((t - 0.2) / 1.2);
  if (sheetIn > 0) {
    for (let x = 400; x < SHEET.x1; x += 400) path(ctx, [P({ x, y: SHEET.y0 }), P({ x, y: SHEET.y1 })], { color: ink, alpha: 0.06 * sheetIn, width: 1 });
    for (let y = 400; y < SHEET.y1; y += 400) path(ctx, [P({ x: SHEET.x0, y }), P({ x: SHEET.x1, y })], { color: ink, alpha: 0.06 * sheetIn, width: 1 });
    const corners = [{ x: SHEET.x0, y: SHEET.y0 }, { x: SHEET.x1, y: SHEET.y0 }, { x: SHEET.x1, y: SHEET.y1 }, { x: SHEET.x0, y: SHEET.y1 }].map((w) => P(w));
    path(ctx, partial([...corners, corners[0]], sheetIn), { color: ink, alpha: 0.45, width: 1.5, dash: [8, 8] });
    if (sheetIn >= 1) frame(ctx, corners, { color: ink, alpha: 1, width: 1.5, tick: 18, dashAlpha: 0 });
  }

  // the current is revealed when the label chips lift: the main line draws, the rest follow
  const mainIn = easeInOut((t - c.lift) / 1.6);
  const restIn = easeInOut((t - (c.lift + 0.4)) / 1.4);
  for (const st of STREAMS) {
    const on = st.k === 0 ? mainIn : restIn;
    if (on <= 0) continue;
    const pts = st.pts.map((w) => P(w));
    path(ctx, st.k === 0 ? partial(pts, on) : pts, { color: ink, alpha: st.k === 0 ? 0.6 : (0.14 + 0.02 * (5 - Math.abs(st.k))) * on, width: st.k === 0 ? 1.7 : 1.1, dash: [14, 10], offset: -march * 14 });
  }

  // three forks: one neutral ring, two branches at the same speed, colour only at the ends
  FORKS.forEach((f, i) => {
    const t0 = c.s(FORK_BEAT[i]);
    const r = rise(t, t0 + 0.1, 0.4);
    if (r <= 0) return;
    ring(ctx, P(f.F), 12 * sc0, { color: ink, alpha: r, width: 1.7, cp });
    const br = easeInOut((t - (t0 + 0.4)) / 1.2);
    if (br > 0) for (const b of [f.north, f.south]) path(ctx, partial(b.map((w) => P(w)), br), { color: ink, alpha: 0.75, width: 1.6, dash: [10, 8], offset: -march * 12 });
    light(ctx, P(f.up), t0 + 1.6, t, pal, sc0, still);
    hazard(ctx, P(f.dn), t0 + 1.6, t, pal, sc0, cp, f.hazard);
  });

  // harbor (H40): breakwater, 122 soundings; ten turn orange together
  const bIn = rise(t, c.s('B7') + 0.2, 0.7);
  if (bIn > 0) {
    const bc = [{ x: BASIN.x0, y: BASIN.y0 }, { x: BASIN.x1, y: BASIN.y0 }, { x: BASIN.x1, y: BASIN.y1 }, { x: BASIN.x0, y: BASIN.y1 }].map((w) => P(w));
    frame(ctx, bc, { color: ink, alpha: bIn, width: 1.5, tick: 16, dashAlpha: 0.6, gapSide: 3, gap: [0.35, 0.6] });
    const turn = easeInOut((t - (c.a('B8') + 0.8)) / 0.5);
    GRID.forEach((w, i) => {
      const hot = ORANGE.includes(i);
      dot(ctx, P(w), (hot ? lerp(2.6, 4, turn) : 2.6) * sc0, hot && turn > 0 ? mixCol(ink, pal.orange, turn) : ink, bIn * (hot ? 1 : 0.55));
    });
    // the bundle leaves through the open side and fans into 19 ticks on the coast
    const bundle = easeInOut((t - (c.a('B8') + 2.0)) / 1.2);
    if (bundle > 0) {
      const u1 = clamp(bundle * 2), u2 = clamp(bundle * 2 - 1);
      ORANGE.forEach((i) => path(ctx, partial([P(GRID[i]), P(GATE)], u1), { color: pal.orange, alpha: 0.75, width: 1.5, dash: [6, 5], offset: -march * 10 }));
      const stopAt = c.a('B9') + 0.3;
      TICKS.forEach((w, j) => {
        const off = j === STOP_TICK ? -Math.min(march, stopAt) * 10 : -march * 10;
        path(ctx, partial([P(GATE), P(w)], u2), { color: pal.orange, alpha: 0.7, width: 1.5, dash: [6, 5], offset: off });
        if (u2 >= 1) seg(ctx, P({ x: w.x - 10, y: w.y }), P({ x: w.x + 10, y: w.y }), { color: pal.orange, alpha: 1, width: 2 });
      });
    }
    // the catch (H42): a short solid ink bar across one line near the shore; its dashes stop
    const bar = rise(t, c.a('B9') + 0.3, 0.4);
    if (bar > 0) {
      const w = TICKS[STOP_TICK], g = GATE, k = 0.82;
      const m = { x: lerp(g.x, w.x, k), y: lerp(g.y, w.y, k) };
      const dx = w.x - g.x, dy = w.y - g.y, l = Math.hypot(dx, dy);
      const nx = (-dy / l) * 22, ny = (dx / l) * 22;
      seg(ctx, P({ x: m.x - nx, y: m.y - ny }), P({ x: m.x + nx, y: m.y + ny }), { color: ink, alpha: bar, width: 4, cap: 'butt' });
    }
  }

  // training in tests (P32): the 13% sounding retracts to 0.4%; the long one stays as a trace
  const tm = c.a('B10');
  const mIn = rise(t, tm + 0.5, 0.5);
  if (mIn > 0) {
    const r = easeInOut((t - (tm + 1.6)) / 1.0);
    const len = lerp(13, 0.4, r) * MEASURE.unit;
    const top = P({ x: MEASURE.x, y: MEASURE.y }), longEnd = P({ x: MEASURE.x, y: MEASURE.y + 13 * MEASURE.unit });
    if (r > 0) seg(ctx, top, longEnd, { color: ink, alpha: 0.22, width: 1.2, dash: [3, 4] });
    const end = P({ x: MEASURE.x, y: MEASURE.y + len });
    seg(ctx, top, end, { color: ink, alpha: mIn, width: 2.2 });
    seg(ctx, { x: end.x - 9, y: end.y }, { x: end.x + 9, y: end.y }, { color: ink, alpha: mIn, width: 2.2 });
    const buoy = rise(t, tm + 2.6, 0.4);
    if (buoy > 0) { ring(ctx, end, 13 * sc0, { color: pal.olive, alpha: buoy, width: 2.2, cp }); glow(ctx, end, 26 * sc0, pal.olive, 0.25 * buoy); }
  }

  // laws (L37, L14): the blue channel draws out of the harbor, two buoys drop
  const t11 = c.s('B11');
  const chIn = easeInOut((t - (t11 + 0.1)) / 1.4);
  if (chIn > 0) {
    for (const side of [-1, 1]) path(ctx, partial([P(chan(0, side)), P(chan(1, side))], chIn), { color: pal.blue, alpha: 0.9, width: 1.6, dash: [9, 7] });
    const xs = c.B.B11.extra.filter((e) => e.role === 'buoy');
    CH_BUOYS.forEach((w, i) => {
      const b = rise(t, xs[i].at - 0.2, 0.4);
      if (b > 0) { dot(ctx, P(w), 5.5 * sc0, pal.blue, b); ring(ctx, P(w), 10 * sc0, { color: pal.blue, alpha: b * 0.6, width: 1.3, cp }); }
    });
  }

  // fog: gathers at the far edge once the current is revealed, deepens for the unknown
  const fogIn = easeInOut((t - (c.lift + 0.8)) / 3) * (0.55 + 0.45 * easeInOut((t - c.s('B12')) / 2));
  if (fogIn > 0) {
    const fogCol = mixCol([236, 236, 230], [52, 64, 78], pal.dusk);
    FOG.forEach((f) => {
      const q = P({ x: f.x + (still ? 0 : 40 * Math.sin(t * 0.07 + f.p)), y: f.y + (still ? 0 : 24 * Math.sin(t * 0.05 + f.p * 1.3)) });
      glow(ctx, q, f.r * pr.pose.zoom, fogCol, 0.8 * fogIn);
    });
  }

  // the unknown (W7): a sounding drops into the fog and finds no bottom (no ring)
  drop(ctx, P(FOG_DROP), c.a('B12') + 0.2, t, pal.ink, pal, sc0, { hang: true });

  ctx.restore();
  endMark(ctx, t, pr, pal, c);
}

// End card: the middle fork's neutral ring (where benefit and harm share one point)
// becomes the crosshair mark (K54) at the top of the card.
export const END_MARK = { x: STAGE_W / 2, y: 330, size: 150 };
function endMark(ctx, t, pr, pal, c) {
  const u = easeInOut((t - c.close) / 1.5);
  if (u <= 0) return;
  const from = pr.point(END_FROM.x, END_FROM.y);
  const p = { x: lerp(from.x, END_MARK.x, u), y: lerp(from.y, END_MARK.y, u) };
  // the current's lines draw inward to the point as the chart fades
  const lines = 1 - easeInOut((t - c.close - 0.6) / 0.9);
  if (lines > 0) {
    const k = easeInOut((t - c.close) / 1.2);
    for (const st of STREAMS) {
      if (st.k % 2) continue;
      for (const w of [st.pts[0], st.pts.at(-1)]) {
        const q = pr.point(w.x, w.y);
        path(ctx, [{ x: lerp(q.x, p.x, k), y: lerp(q.y, p.y, k) }, p], { color: pal.ink, alpha: 0.5 * lines, width: 1.2, dash: [10, 8] });
      }
    }
  }
  crosshair(ctx, p, lerp(30, END_MARK.size, u), mixCol(pal.ink, pal.cream, u), 1);
}

function mixCol(a, b, t) { return [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], clamp(t)))); }

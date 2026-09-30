// The chart: one nautical sheet that accumulates every mark of the film (director C).
// World units: the sheet is 3600 x 2000, y grows down (south). Every mark's state is a
// function of t and of cue times read from beats.json, so retiming the JSON moves the picture.
// Marks are conceptual; only counted marks carry numbers and each count is exact:
// 122 runs, 10 runs, 19 actions (H40); 13 models (T72); 271 bugs (P24); 13% to 0.4% (P32);
// ten network members (L19). Everything else (current, rings, rain, fog, clusters) carries no data.
import { clamp, lerp, rise, easeOut, easeIn, easeInOut, smooth, mulberry32, windowAlpha } from './util.js';
import { path, seg, dot, ring, glow, poly, partial, frame, crosshair } from './draw.js';
import { STAGE_W } from './camera.js';

const TAU = Math.PI * 2;
export const SHEET = { x0: 80, y0: 80, x1: 3520, y1: 1920 };

// ---------- geometry (built once, constant) ----------

const A0 = { x: 350, y: 1750 }, A1 = { x: 3450, y: 300 };
const D = { x: A1.x - A0.x, y: A1.y - A0.y };
const LEN = Math.hypot(D.x, D.y);
const N = { x: -D.y / LEN, y: D.x / LEN }; // normal, pointing down-right
export function stream(k, s) {
  const m = 110 * Math.sin(Math.PI * s * 1.6 + 0.3);
  const o = m + k * 30 * (0.85 + 0.3 * s);
  return { x: A0.x + D.x * s + N.x * o, y: A0.y + D.y * s + N.y * o };
}
const STREAMS = [];
for (let k = -6; k <= 6; k++) {
  const pts = [];
  for (let i = 0; i <= 140; i++) pts.push(stream(k, i / 140));
  STREAMS.push({ k, pts });
}

const shoreX = (y) => 330 + 50 * Math.sin(y * 0.0042) + 25 * Math.sin(y * 0.013 + 1);
const shoreY = (x) => 1800 + 25 * Math.sin(x * 0.007);
const LAND = [];
LAND.push({ x: SHEET.x0, y: SHEET.y0 });
for (let y = SHEET.y0; y <= 1780; y += 20) LAND.push({ x: shoreX(y), y });
for (let x = shoreX(1780); x <= 1450; x += 20) LAND.push({ x, y: shoreY(x) });
LAND.push({ x: 1520, y: 1860 }, { x: 1560, y: SHEET.y1 }, { x: SHEET.x0, y: SHEET.y1 });
const CONTOURS = [70, 140].map((o) => {
  const pts = [];
  for (let y = SHEET.y0; y <= 1720 - o; y += 24) pts.push({ x: shoreX(y) + o, y });
  for (let x = shoreX(1780) + o; x <= 1500 + o; x += 24) pts.push({ x, y: shoreY(x) - o });
  return pts;
});

const ISLAND = { x: 2380, y: 1580, rx: 250, ry: 115 };
const islandR = (th) => 1 + 0.06 * Math.sin(3 * th) + 0.04 * Math.sin(5 * th + 1);
const islandPt = (th, out = 0) => ({ x: ISLAND.x + Math.cos(th) * (ISLAND.rx * islandR(th) + out), y: ISLAND.y + Math.sin(th) * (ISLAND.ry * islandR(th) + out * 0.6) });
const ISLAND_PTS = Array.from({ length: 72 }, (_, i) => islandPt((i / 72) * TAU));
// 271 points along the island's north shore (P24): rows of 91, 90, 90
const MOZ = [];
[[91, 16], [90, 32], [90, 48]].forEach(([n, out]) => {
  for (let i = 0; i < n; i++) MOZ.push(islandPt(Math.PI + 0.3 + ((TAU / 2 - 0.6) * i) / (n - 1), out));
});

// Test basin (harbor): 122 soundings, 14 per row (H40 denominator, site record #34)
const BASIN = { x0: 520, y0: 300, x1: 1300, y1: 760 };
const GRID = [];
for (let i = 0; i < 122; i++) GRID.push({ x: 575 + (i % 14) * 44, y: 340 + Math.floor(i / 14) * 46 });
const ORANGE = (() => {
  const r = mulberry32(20260930), picked = new Set();
  while (picked.size < 10) picked.add(Math.floor(r() * 122));
  return [...picked].sort((a, b) => a - b);
})();
const GATE = { x: BASIN.x0, y: 530 };
const TICKS = Array.from({ length: 19 }, (_, i) => { const y = 380 + (i * 320) / 18; return { x: shoreX(y) + 6, y }; });
const STOP_TICK = 9; // the line the camera follows to the shore (H42)

// Open test water beside the basin: 13 buoy rings (T72)
const BUOYS = Array.from({ length: 13 }, (_, i) => ({ x: 1400 + i * 44, y: 520 }));
const GAPS = (() => { const r = mulberry32(72); return BUOYS.map(() => r() * TAU); })();
const RAIN = (() => { const r = mulberry32(4141); return Array.from({ length: 180 }, () => ({ x: 1350 + r() * 640, y: 430 + r() * 190, d: r() * 1.8, l: 0.5 + r() * 0.4 })); })();

// Fork (W31 with H23, P24)
const FORK = stream(0, 0.47);
const FORK_L = { x: FORK.x - 300, y: FORK.y - 290 };
const FORK_R = islandPt(Math.PI * 1.5, 70);
const bez = (a, c, b, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y }; });
const BRANCH_L = bez(FORK, { x: FORK.x - 40, y: FORK.y - 220 }, FORK_L);
const BRANCH_R = bez(FORK, { x: FORK.x + 260, y: FORK.y + 40 }, FORK_R);

// Conceptual clusters for the labels beat (no data): about 40 anonymous soundings each
function cluster(c, seed) {
  const r = mulberry32(seed);
  return Array.from({ length: 40 }, (_, i) => {
    const a = r() * TAU, d = Math.sqrt(r()) * 95, pick = r();
    return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.8, tone: pick < 0.33 ? 'amber' : pick < 0.62 ? 'orange' : 'ink' };
  });
}
const CL_A = stream(0, 0.33), CL_B = stream(0, 0.62);
const CLUSTERS = [cluster(CL_A, 11), cluster(CL_B, 12)];

// Uncharted points drawn when the camera first pulls back (no colour, no data)
const EMPTY = [[-3, 0.28], [2, 0.38], [-5, 0.45], [4, 0.41], [-1, 0.57], [3, 0.67], [-4, 0.73], [1, 0.81]].map(([k, s]) => stream(k, s));

const LIGHT1 = stream(0, 0.08), HAZARD = stream(0, 0.2), LIGHT2 = stream(4, 0.55);
const MEASURE = { x: 1240, y: 330, unit: 30 }; // 13% -> 390, 0.4% -> 12 (P32 ratio)
const BASIN2 = { x0: 2780, y0: 1320, x1: 3220, y1: 1640 };
const ENTRANTS = [2930, 3070];
const CH0 = { x: 1180, y: 1800 }, CH1 = { x: 1820, y: 1420 };
const CHN = (() => { const dx = CH1.x - CH0.x, dy = CH1.y - CH0.y, l = Math.hypot(dx, dy); return { x: -dy / l, y: dx / l }; })();
const chan = (u, side = 0) => ({ x: lerp(CH0.x, CH1.x, u) + CHN.x * side * 26, y: lerp(CH0.y, CH1.y, u) + CHN.y * side * 26 });
const CH_BUOYS = [0.12, 0.37, 0.62, 0.87].map((u, i) => chan(u, i % 2 ? 1 : -1));
const FIX = { x: 2860, y: 640 };
const STATIONS = [
  { x: 1200, y: SHEET.y0 }, { x: 1600, y: SHEET.y0 }, { x: 2000, y: SHEET.y0 }, { x: 2400, y: SHEET.y0 }, { x: 2800, y: SHEET.y0 }, { x: 3200, y: SHEET.y0 },
  { x: SHEET.x1, y: 500 }, { x: SHEET.x1, y: 900 }, { x: SHEET.x1, y: 1300 }, { x: SHEET.x1, y: 1700 },
];
const FOG = [{ x: 3120, y: 330, r: 720, p: 0 }, { x: 2760, y: 230, r: 520, p: 1.7 }, { x: 3380, y: 760, r: 520, p: 3.1 }, { x: 3300, y: 140, r: 420, p: 4.4 }, { x: 2560, y: 520, r: 360, p: 5.2 }];
const FOG_DROP = { x: 3200, y: 330 };
const NOTE0 = { x: 2640, y: 930 }, NOTE1 = { x: 3000, y: 560 };

// ---------- cues from beats.json ----------

export function makeCues(data) {
  const B = Object.fromEntries(data.beats.map((b) => [b.id, b]));
  const s = (id) => B[id].start, a = (id) => B[id].statement.at, p = (id) => B[id].precision?.at ?? B[id].end;
  return {
    B, s, a, p,
    dusk: p('B12'),
    close: s('B16'),
    chips: [a('B4') - 0.7, p('B4')], // chips settle, then lift as "People are people" arrives
  };
}

// ---------- camera path ----------

export function cameraKeys(c) {
  const k = (id, pose, dur = 1.4, lead = 0.3, drift) => ({ at: Math.max(0, c.s(id) - lead), dur, pose, drift });
  return [
    { at: 0, dur: 0.001, pose: { cx: 560, cy: 1590, zoom: 1.7, pitch: 0 }, drift: { vx: 14, vy: 0 } },
    k('B2', { cx: 820, cy: 1560, zoom: 1.35, pitch: 0 }, 1.4, 0.3, { vx: 6, vy: 0 }),
    k('B3', { cx: 1800, cy: 1020, zoom: 0.5, pitch: 0 }, 1.6, 0.2),
    k('B4', { cx: 1830, cy: 1090, zoom: 0.7, pitch: 0 }, 1.3),
    k('B5a', { cx: 880, cy: 560, zoom: 1.0, pitch: 0.28 }, 1.4),
    k('B5b', { cx: 470, cy: 560, zoom: 1.55, pitch: 0.28 }, 1.4),
    k('B6', { cx: 1480, cy: 560, zoom: 1.05, pitch: 0.25 }, 1.3),
    k('B7', { cx: 2600, cy: 760, zoom: 0.8, pitch: 0.5 }, 1.5),
    k('B8', { cx: 2020, cy: 1180, zoom: 0.82, pitch: 0.2 }, 1.4),
    k('B9', { cx: 1150, cy: 560, zoom: 1.35, pitch: 0.12 }, 1.4),
    k('B10', { cx: 3000, cy: 1480, zoom: 1.3, pitch: 0.12 }, 1.4),
    k('B11', { cx: 1560, cy: 1600, zoom: 1.05, pitch: 0.15 }, 1.3),
    k('B12', { cx: 1800, cy: 1040, zoom: 0.46, pitch: 0 }, 1.5),
    k('B13', { cx: 2050, cy: 1050, zoom: 0.62, pitch: 0.2 }, 1.4, 0.2),
    k('B14', { cx: 1800, cy: 1000, zoom: 0.5, pitch: 0.35 }, 1.6, 0.2),
    k('B16', { cx: FIX.x, cy: FIX.y + 60, zoom: 1.4, pitch: 0 }, 1.5, 0),
  ];
}

// ---------- label anchors (world points + chip offset in stage px) ----------

const ANCHORS = {
  'B1:1': null,
  'B2:0': { w: HAZARD, dx: 60, dy: -70 },
  'B4:0': { w: CL_A, chip: true },
  'B4:1': { w: CL_B, chip: true },
  'B5a:0': { w: { x: BASIN.x1, y: BASIN.y0 }, dx: 30, dy: -40 },
  'B5a:1': { w: TICKS[3], dx: -40, dy: -60, alignRight: true },
  'B5a:2': { w: { x: 700, y: 560 }, dx: 60, dy: 120 },
  'B6:0': { w: BUOYS[12], dx: 40, dy: -70 },
  'B7:0': { w: NOTE0, dx: 24, dy: 40 },
  'B8:0': { w: FORK_L, dx: -30, dy: -60, alignRight: true },
  'B8:1': { w: FORK_R, dx: 40, dy: -80 },
  'B9:0': { w: { x: MEASURE.x, y: MEASURE.y + 13 * MEASURE.unit }, dx: 34, dy: 0 },
  'B9:1': { w: { x: MEASURE.x, y: MEASURE.y + 0.4 * MEASURE.unit }, dx: 34, dy: 0 },
  'B10:0': { w: { x: BASIN2.x1, y: BASIN2.y0 }, dx: 30, dy: -40 },
  'B11:0': { w: CH_BUOYS[0], dx: -36, dy: 0, alignRight: true },
  'B11:1': { w: CH_BUOYS[1], dx: 36, dy: 0 },
  'B11:2': { w: CH_BUOYS[2], dx: -36, dy: 0, alignRight: true },
  'B11:3': { w: CH_BUOYS[3], dx: 36, dy: 0 },
  'B11:4': { w: CH_BUOYS[1], dx: 36, dy: 40 },
  'B13:0': { w: LIGHT2, dx: 40, dy: -70 },
};
STATIONS.forEach((st, i) => { ANCHORS[`B12:${i}`] = { w: st, dx: st.y === SHEET.y0 ? -20 : -30, dy: st.y === SHEET.y0 ? 44 : -34, alignRight: st.x === SHEET.x1 }; });
export const anchorFor = (beatId, i) => ANCHORS[`${beatId}:${i}`] || null;
export const clusterRadius = 110;

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
    const ph = (((t - t0) % 1.9) + 1.9) % 1.9 / 1.9; // ambient pulse every 1.9 s (K46)
    ring(ctx, P, (8 + 22 * ph) * sc, { color: pal.amber, alpha: 0.35 * a * (1 - ph), width: 1.2 });
  }
}

function hazard(ctx, P, t0, t, pal, sc, cp) {
  const a = rise(t, t0, 0.4);
  if (a <= 0) return;
  dot(ctx, P, 5 * sc, pal.orange, a);
  const u = easeOut((t - t0) / 0.8);
  ring(ctx, P, 16 * sc, { color: pal.orange, alpha: a, width: 1.5, dash: [2, 4], cp, to: TAU * u });
}

export function drawWorld(ctx, t, pr, pal, c, { still = false } = {}) {
  const P = (w, z = 0) => pr.point(w.x, w.y, z);
  const sc0 = clamp(pr.pose.zoom, 0.55, 1.7);
  const cp = pr.cp;
  const ink = pal.ink;
  const march = still ? 0 : t;
  const close = pal.close; // world fades out under the end card
  const wa = 1 - easeInOut((t - c.close) / 1.2);
  if (wa <= 0.001) { endMark(ctx, t, pr, pal, c); return; }
  ctx.save();
  ctx.globalAlpha = wa;

  // land, contours, graticule, neatline
  poly(ctx, LAND.map((w) => P(w)), ink, 0.07);
  path(ctx, LAND.slice(1, -3).map((w) => P(w)), { color: ink, alpha: 0.55, width: 1.3 });
  CONTOURS.forEach((pts, i) => path(ctx, pts.map((w) => P(w)), { color: ink, alpha: 0.18 - i * 0.06, width: 1, dash: [3, 6] }));
  poly(ctx, ISLAND_PTS.map((w) => P(w)), ink, 0.07);
  path(ctx, [...ISLAND_PTS, ISLAND_PTS[0]].map((w) => P(w)), { color: ink, alpha: 0.55, width: 1.3 });

  const sheetIn = easeInOut((t - (c.s('B3') + 0.3)) / 1.2);
  if (sheetIn > 0) {
    for (let x = 400; x < SHEET.x1; x += 400) path(ctx, [P({ x, y: SHEET.y0 }), P({ x, y: SHEET.y1 })], { color: ink, alpha: 0.06 * sheetIn, width: 1 });
    for (let y = 400; y < SHEET.y1; y += 400) path(ctx, [P({ x: SHEET.x0, y }), P({ x: SHEET.x1, y })], { color: ink, alpha: 0.06 * sheetIn, width: 1 });
    const corners = [{ x: SHEET.x0, y: SHEET.y0 }, { x: SHEET.x1, y: SHEET.y0 }, { x: SHEET.x1, y: SHEET.y1 }, { x: SHEET.x0, y: SHEET.y1 }].map((w) => P(w));
    // neatline draws itself around the sheet
    const loop = partial([...corners, corners[0]], sheetIn);
    path(ctx, loop, { color: ink, alpha: 0.45, width: 1.5, dash: [8, 8] });
    if (sheetIn >= 1) frame(ctx, corners, { color: ink, alpha: 1, width: 1.5, tick: 18, dashAlpha: 0 });
  }

  // current: the main streamline draws in, the rest appear on the pull-back
  const mainIn = easeOut(t / 3.2);
  const restIn = easeInOut((t - c.s('B3')) / 1.4);
  for (const st of STREAMS) {
    const on = st.k === 0 ? mainIn : restIn;
    if (on <= 0) continue;
    const pts = st.pts.map((w) => P(w));
    path(ctx, st.k === 0 ? partial(pts, on) : pts, { color: ink, alpha: (st.k === 0 ? 0.55 : 0.2 + 0.04 * (6 - Math.abs(st.k)) * 0.5) * (st.k === 0 ? 1 : on), width: st.k === 0 ? 1.6 : 1.1, dash: [14, 10], offset: -march * 14 });
  }

  // B1 benefit light (B18)
  drop(ctx, P(LIGHT1), 0.25, t, pal.amber, pal, sc0);
  light(ctx, P(LIGHT1), 1.05, t, pal, sc0, still);
  // B2 hazard (H27)
  drop(ctx, P(HAZARD), c.s('B2') + 0.05, t, pal.orange, pal, sc0);
  hazard(ctx, P(HAZARD), c.s('B2') + 0.85, t, pal, sc0, cp);
  // B3 uncharted points
  EMPTY.forEach((w, i) => ring(ctx, P(w), 7 * sc0, { color: ink, alpha: 0.5 * rise(t, c.s('B3') + 0.7 + i * 0.08, 0.5), width: 1.2, cp }));

  // B4 clusters: ink soundings; colours switch under the chips, shown when the chips lift
  const clIn = rise(t, c.s('B4') - 0.2, 0.6);
  const revealed = t >= c.chips[1] - 0.1;
  CLUSTERS.forEach((cl) => cl.forEach((w) => {
    const col = !revealed || w.tone === 'ink' ? ink : pal[w.tone];
    dot(ctx, P(w), (w.tone === 'ink' || !revealed ? 2.4 : 3.2) * sc0, col, clIn * (w.tone === 'ink' || !revealed ? 0.7 : 1));
  }));

  // B5 test basin (H40): breakwater, 122 soundings, ten turn orange together
  const bIn = rise(t, c.s('B5a') - 0.2, 0.6);
  if (bIn > 0) {
    const bc = [{ x: BASIN.x0, y: BASIN.y0 }, { x: BASIN.x1, y: BASIN.y0 }, { x: BASIN.x1, y: BASIN.y1 }, { x: BASIN.x0, y: BASIN.y1 }].map((w) => P(w));
    frame(ctx, bc, { color: ink, alpha: bIn, width: 1.5, tick: 16, dashAlpha: 0.6, gapSide: 3, gap: [0.35, 0.6] });
    const turn = easeInOut((t - (c.a('B5a') + 0.8)) / 0.5);
    GRID.forEach((w, i) => {
      const hot = ORANGE.includes(i);
      dot(ctx, P(w), (hot ? lerp(2.6, 4, turn) : 2.6) * sc0, hot && turn > 0 ? mixCol(ink, pal.orange, turn) : ink, bIn * (hot ? 1 : 0.55));
    });
    // bundle leaves through the open side and fans into 19 ticks on the coast
    const bundle = easeInOut((t - (c.a('B5a') + 2.0)) / 1.2);
    if (bundle > 0) {
      const u1 = clamp(bundle * 2), u2 = clamp(bundle * 2 - 1);
      ORANGE.forEach((i) => path(ctx, partial([P(GRID[i]), P(GATE)], u1), { color: pal.orange, alpha: 0.75, width: 1.5, dash: [6, 5], offset: -march * 10 }));
      const stopAt = c.a('B5b') + 0.3;
      TICKS.forEach((w, j) => {
        const off = j === STOP_TICK ? -Math.min(march, stopAt) * 10 : -march * 10;
        path(ctx, partial([P(GATE), P(w)], u2), { color: pal.orange, alpha: 0.7, width: 1.5, dash: [6, 5], offset: off });
        if (u2 >= 1) seg(ctx, P({ x: w.x - 10, y: w.y }), P({ x: w.x + 10, y: w.y }), { color: pal.orange, alpha: 1, width: 2 });
      });
    }
    // B5b: a human stopped the code: a short solid ink bar across one line near the shore
    const bar = rise(t, c.a('B5b') + 0.3, 0.4);
    if (bar > 0) {
      const w = TICKS[STOP_TICK], g = GATE, k = 0.82;
      const m = { x: lerp(g.x, w.x, k), y: lerp(g.y, w.y, k) };
      const dx = w.x - g.x, dy = w.y - g.y, l = Math.hypot(dx, dy);
      const nx = -dy / l * 22, ny = dx / l * 22;
      seg(ctx, P({ x: m.x - nx, y: m.y - ny }), P({ x: m.x + nx, y: m.y + ny }), { color: ink, alpha: bar, width: 4, cap: 'butt' });
    }
  }

  // B6 open test water: 13 buoy rings, a rain of attempts, one gap in every ring (T72)
  const tb = c.s('B6');
  const bu = rise(t, tb - 0.2, 0.5);
  if (bu > 0) {
    const gapU = easeOut((t - (tb + 1.8)) / 0.5);
    BUOYS.forEach((w, i) => {
      const g = 0.7 * gapU;
      ring(ctx, P(w), 11 * sc0, { color: ink, alpha: bu, width: 1.6, cp, from: GAPS[i] + g / 2, to: GAPS[i] + TAU - g / 2 });
    });
    if (!still) RAIN.forEach((d) => {
      const t0 = tb + d.d * 0.6, u = (t - t0) / d.l;
      if (u < 0 || u > 1) return;
      const q = P(d);
      const y = lerp(q.y - 180, q.y, easeIn(u));
      dot(ctx, { x: q.x, y }, 1.6, ink, 0.45 * (1 - smooth((u - 0.8) / 0.2)) * (1 - smooth((t - (tb + 2.2)) / 0.6)));
    });
  }

  // B7 note leader into the fog (W2)
  const note = rise(t, c.a('B7') + 0.8, 0.8);
  if (note > 0 && t < c.B.B7.end) path(ctx, partial([P(NOTE0), P(NOTE1)], note), { color: ink, alpha: 0.6 * windowAlpha(t, c.a('B7') + 0.8, c.B.B7.end, 0.3, 0.45), width: 1.2, dash: [4, 5] });

  // B8 the fork: one line, a neutral ring, two branches at the same speed; colour only at the ends
  const tf = c.s('B8');
  const fr = rise(t, tf + 0.1, 0.4);
  if (fr > 0) {
    ring(ctx, P(FORK), 12 * sc0, { color: ink, alpha: fr, width: 1.6, cp });
    const br = easeInOut((t - (tf + 0.3)) / 1.2);
    if (br > 0) {
      path(ctx, partial(BRANCH_L.map((w) => P(w)), br), { color: ink, alpha: 0.75, width: 1.6, dash: [14, 10], offset: -march * 14 });
      path(ctx, partial(BRANCH_R.map((w) => P(w)), br), { color: ink, alpha: 0.75, width: 1.6, dash: [14, 10], offset: -march * 14 });
    }
    hazard(ctx, P(FORK_L), tf + 1.5, t, pal, sc0 * 1.3, cp);
    const mz = rise(t, tf + 1.5, 0.5);
    if (mz > 0) MOZ.forEach((w) => dot(ctx, P(w), 2.1 * sc0, pal.olive, mz));
  }

  // B9 inside the basin: the 13% sounding retracts to 0.4%; the long one stays as a trace (P32)
  const tm = c.a('B9');
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

  // B10 second basin: two reviewers step through the breakwater, which turns solid where they enter (P34)
  const t10 = c.s('B10');
  const b2 = rise(t, t10 - 0.2, 0.5);
  if (b2 > 0) {
    const cs = [{ x: BASIN2.x0, y: BASIN2.y0 }, { x: BASIN2.x1, y: BASIN2.y0 }, { x: BASIN2.x1, y: BASIN2.y1 }, { x: BASIN2.x0, y: BASIN2.y1 }].map((w) => P(w));
    const solid = easeInOut((t - (t10 + 1.0)) / 0.8);
    frame(ctx, cs, { color: ink, alpha: b2, width: 1.5, tick: 16, dashAlpha: 0.6, solidSide: 0, solid: solid * 0.55 });
    const step = easeInOut((t - (t10 + 0.3)) / 1.0);
    const lit = rise(t, t10 + 1.5, 0.4);
    ENTRANTS.forEach((x) => {
      const q = P({ x, y: lerp(BASIN2.y0 - 120, BASIN2.y0 + 90, step) });
      ring(ctx, q, 10 * sc0, { color: ink, alpha: b2, width: 1.6, cp });
      if (lit > 0) { ring(ctx, q, 16 * sc0, { color: pal.olive, alpha: lit, width: 2, cp }); glow(ctx, q, 26 * sc0, pal.olive, 0.25 * lit); }
    });
  }

  // B11 buoyed channel (L37, L14, L30, L23): lines draw, buoys drop in date order
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

  // B12 triangulation: ten stations on the neatline sight one point at the fog's edge (L19)
  const t12 = c.a('B12');
  const stIn = rise(t, t12 + 0.3, 0.4);
  if (stIn > 0) {
    const sight = easeInOut((t - (t12 + 1.0)) / 1.0); // all ten lines together, no stagger
    STATIONS.forEach((w) => {
      const q = P(w);
      poly(ctx, [{ x: q.x, y: q.y - 7 }, { x: q.x + 6.5, y: q.y + 5 }, { x: q.x - 6.5, y: q.y + 5 }], pal.blue, stIn);
      if (sight > 0) path(ctx, partial([q, P(FIX)], sight), { color: pal.blue, alpha: 0.7, width: 1.3 });
    });
    const fx = rise(t, t12 + 2.0, 0.4);
    if (fx > 0) crosshair(ctx, P(FIX), 30, pal.blue, fx);
  }

  // B13 second benefit light at dusk (B4)
  drop(ctx, P(LIGHT2), c.s('B13') + 0.2, t, pal.amber, pal, sc0);
  light(ctx, P(LIGHT2), c.s('B13') + 1.0, t, pal, sc0, still);

  // fog: gathers on the pull-back, pale by day, slate at dusk; drifts on slow sines
  const fogIn = easeInOut((t - (c.s('B3') + 0.8)) / 3);
  if (fogIn > 0) {
    const fogCol = mixCol([236, 236, 230], [52, 64, 78], pal.dusk);
    FOG.forEach((f) => {
      const q = P({ x: f.x + (still ? 0 : 40 * Math.sin(t * 0.07 + f.p)), y: f.y + (still ? 0 : 24 * Math.sin(t * 0.05 + f.p * 1.3)) });
      glow(ctx, q, f.r * pr.pose.zoom, fogCol, 0.7 * fogIn);
    });
  }

  // B14 a sounding drops into the fog and finds no bottom (no ring) (W7)
  drop(ctx, P(FOG_DROP), c.s('B14') + 0.4, t, pal.ink, pal, sc0, { hang: true });

  ctx.restore();
  endMark(ctx, t, pr, pal, c);
}

// End card: the triangulation fix becomes the crosshair mark (K54) at the top of the card.
export const END_MARK = { x: STAGE_W / 2, y: 330, size: 150 };
function endMark(ctx, t, pr, pal, c) {
  const u = easeInOut((t - c.close) / 1.5);
  if (u <= 0) return;
  const from = pr.point(FIX.x, FIX.y);
  const p = { x: lerp(from.x, END_MARK.x, u), y: lerp(from.y, END_MARK.y, u) };
  // the ten sight lines draw inward to the fix as the chart fades
  const lines = 1 - easeInOut((t - c.close - 0.6) / 0.9);
  if (lines > 0) STATIONS.forEach((w) => {
    const q = pr.point(w.x, w.y);
    const k = easeInOut((t - c.close) / 1.2);
    path(ctx, [{ x: lerp(q.x, p.x, k), y: lerp(q.y, p.y, k) }, p], { color: pal.blue, alpha: 0.7 * lines, width: 1.3 });
  });
  crosshair(ctx, p, lerp(30, END_MARK.size, u), mixCol(pal.blue, pal.cream, u), 1);
}

function mixCol(a, b, t) { return [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], clamp(t)))); }

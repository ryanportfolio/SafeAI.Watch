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
    hazard: i === 1 ? 'test' : 'harm', // the protein fork's hazard is a test result: drawn as a test, in ink
    north: bez(F, add(F, 30, -150), up),
    south: bez(F, add(F, 30, 150), dn),
  };
});
// Beat ids by role in the story, so a renumbered beats.json only touches this map.
export const ID = { q: 'B1', label: 'B2', hear: 'B3', camps: 'B4', people: 'B5', reads: 'B6', mozilla: 'B7', google: 'B8', forks: 'B9', harris: 'B10', keep: 'B11', test: 'B12', caught: 'B13', fix: 'B14', law: 'B15', unknown: 'B16', clarity: 'B17', useit: 'B18', hold: 'B19', end: 'B20' };
// Headings of the four-step chapter, in order (their beats carry a role heading extra).
export const STEPS = [ID.test, ID.fix, ID.law, ID.unknown];

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

// ---------- the labels chapter: soundings, the sentence, the region names ----------
// A chart keeps names off the soundings because a name printed over the water hides the
// depths beneath it. The water starts dense with soundings (many readings, no data). An honest
// answer is a sentence laid on the water; a region name lands over it and knocks out the
// sentence and the soundings under its letters. Then the same sentence many times over, and a
// run of names (read in order from beats.json) until no sentence is left; then they lift.

// Lines of type on the water are gentle arcs (the current is not charted yet).
// a line of type on the water: a gentle arc, optionally tilted to follow the water
export const laneY = (slot, x) => slot.y + (x - slot.cx) * Math.tan(slot.ang || 0) + 22 * Math.sin((x - slot.cx) * 0.0012);

// Soundings: many small, varied depth marks in ink at low alpha. Conceptual; no numerals,
// because a number on screen needs a source row. Kept out of the caption band and the key.
export const SOUNDINGS = (() => {
  const r = mulberry32(777), out = [];
  const keep = (x, y) => x > shoreX(y) + 90 && x < SHEET.x1 - 70 && y > SHEET.y0 + 60 && y < SHEET.y1 - 60
    && !(y > 1480 && x < 2900) && !(x > 2800 && y > 1560)
    && !(x > BASIN.x0 - 70 && x < BASIN.x1 + 70 && y > BASIN.y0 - 60 && y < BASIN.y1 + 60)
    && !FORKS.some((f) => [f.F, f.up, f.dn].some((q) => Math.hypot(q.x - x, q.y - y) < 80))
    && ![{ x: 1500, y: 330 }, { x: 2650, y: 1250 }].some((q) => Math.abs(q.x - x) < 200 && Math.abs(q.y - y) < 150);
  for (let n = 0; n < 6000 && out.length < 820; n++) {
    const x = SHEET.x0 + r() * (SHEET.x1 - SHEET.x0), y = SHEET.y0 + r() * (SHEET.y1 - SHEET.y0);
    const kind = Math.floor(r() * 5), rot = r() * Math.PI, a = 0.22 + 0.2 * r(), tone = r();
    if (!keep(x, y) || out.some((o) => Math.abs(o.x - x) < 40 && Math.abs(o.y - y) < 40)) continue;
    out.push({ x, y, kind, rot, a, tone: tone < 0.07 ? 'amber' : tone < 0.14 ? 'orange' : 'ink' });
  }
  return out;
})();

const STAGE = { cx: 1900, y: 560, ang: 0, name: 150, track: 0.4 }; // one name at a time, in open water
const inE = (t, a, d) => easeOut((t - a) / d), outE = (t, a, d) => easeIn((t - a) / d);

// Two identical patches of readings (same marks, same layout), far apart on the water.
export const PATCH_AT = [{ x: 1500, y: 330 }, { x: 2650, y: 1250 }];
const PATCH = (() => {
  const r = mulberry32(4242), out = [];
  for (let n = 0; n < 400 && out.length < 30; n++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 150, kind = Math.floor(r() * 5), rot = r() * Math.PI;
    const p = { dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.7, kind, rot, a: 0.4 };
    if (!out.some((o) => Math.abs(o.dx - p.dx) < 26 && Math.abs(o.dy - p.dy) < 22)) out.push(p);
  }
  return out;
})();

// Where the run of names lands: the first two on the two identical patches (same size, no
// tilt), the rest scattered across the water at their own size and angle, never in columns.
const NAME_PLACE = [
  { cx: PATCH_AT[0].x, y: PATCH_AT[0].y, ang: 0, size: 118 }, { cx: PATCH_AT[1].x, y: PATCH_AT[1].y, ang: 0, size: 118 },
  { cx: 3050, y: 620, ang: 0.12, size: 124 }, { cx: 900, y: 560, ang: -0.07, size: 132 }, { cx: 820, y: 980, ang: 0.06, size: 116 },
  { cx: 2250, y: 860, ang: -0.08, size: 100 }, { cx: 3000, y: 1480, ang: 0.09, size: 110 }, { cx: 1120, y: 1235, ang: -0.05, size: 118 },
  { cx: 3200, y: 950, ang: 0.14, size: 140 }, { cx: 2450, y: 220, ang: -0.06, size: 126 },
];
const NAME_TRACK = 0.3;

// Layout (world units) and timing for the chapter, from beats.json and the loaded fonts.
function labelsLayout(c, measure) {
  const ex = (id, role) => (c.B[id].extra || []).filter((e) => e.role === role);
  const staged = [...ex(ID.label, 'region'), ...ex(ID.hear, 'region')]; // one name, then another, same place
  const names = ex(ID.camps, 'region'); // the run of labels, in order
  const slots = names.map((nm, i) => {
    const p = NAME_PLACE[i % NAME_PLACE.length];
    return { cx: p.cx, y: p.y, ang: p.ang, name: { text: nm.text, at: nm.at, size: p.size, track: NAME_TRACK, ...measure(nm.text, p.size, NAME_TRACK) } };
  });
  return {
    stage: { cx: STAGE.cx, y: STAGE.y, ang: 0 },
    stageNames: staged.map((n) => ({ text: n.text, at: n.at, size: STAGE.name, track: STAGE.track, ...measure(n.text, STAGE.name, STAGE.track) })),
    slots,
    tSight: c.s(ID.hear) + 0.4, tSplit: c.s(ID.camps), tPatch: c.s(ID.camps) + 0.2,
    tLift: c.s(ID.people) + 0.2,
    tFork: c.s(ID.mozilla) + 0.3, // once the first sourced mark lands, the conceptual colour steps back to ink
  };
}

// State of every element at t. Shared by the picture (knockout) and the text layer.
export function labelsState(L, t) {
  const spread = easeInOut((t - L.tLift) / 1.6);
  const staged = L.stageNames.map((n, i) => {
    const next = L.stageNames[i + 1];
    const a = inE(t, n.at, 0.9) * (next ? 1 - outE(t, next.at, 0.8) : 1) * (1 - outE(t, L.tSplit, 0.7));
    return { item: n, a, land: inE(t, n.at, 0.9) };
  });
  const names = L.slots.map((s) => {
    const land = inE(t, s.name.at, 0.8);
    return { slot: s, name: s.name, land, a: land * (1 - clamp(spread * 1.7)), cover: land * (1 - smooth((spread - 0.45) / 0.55)) };
  });
  // as the run lands, every remaining reading goes; they come back after the names have cleared
  const covered = names.reduce((a, n) => a + n.cover, 0) / Math.max(1, names.length);
  return {
    staged, names, spread, covered,
    patch: inE(t, L.tPatch, 0.8) * (1 - outE(t, L.tLift + 2.5, 1.2)),
    sight: inE(t, L.tSight, 1.0) * (1 - outE(t, L.tSplit, 0.6)),
    colour: inE(t, L.tLift + 0.4, 1.2) * (1 - outE(t, L.tFork, 2.0)),
  };
}

const bandHit = (o, slot, len, half) => Math.abs(o.x - slot.cx) < len / 2 + 40 && Math.abs(o.y - laneY(slot, o.x)) < half;
function knock(o, st) {
  let k = 1 - st.covered;
  for (const n of st.names) if (n.cover > 0 && bandHit(o, n.slot, n.name.len, n.name.size * 0.5 + 14)) k *= 1 - n.cover;
  for (const s of st.staged) if (s.a > 0 && bandHit(o, { cx: STAGE.cx, y: STAGE.y }, s.item.len, 100)) k *= 1 - s.a;
  return k;
}

function mark(ctx, q, kind, rot, color, a) {
  if (a <= 0.01) return;
  const cs = Math.cos(rot) * 3.2, sn = Math.sin(rot) * 3.2;
  switch (kind) {
    case 0: dot(ctx, q, 1.6, color, a); break;
    case 1: seg(ctx, { x: q.x - 3, y: q.y }, { x: q.x + 3, y: q.y }, { color, alpha: a, width: 1 }); seg(ctx, { x: q.x, y: q.y - 3 }, { x: q.x, y: q.y + 3 }, { color, alpha: a, width: 1 }); break;
    case 2: seg(ctx, { x: q.x - cs, y: q.y - sn }, { x: q.x + cs, y: q.y + sn }, { color, alpha: a, width: 1.1 }); break;
    case 3: ring(ctx, q, 2.6, { color, alpha: a, width: 1 }); break;
    default: dot(ctx, { x: q.x - 2.2, y: q.y }, 1.2, color, a); dot(ctx, { x: q.x + 2.2, y: q.y }, 1.2, color, a);
  }
}

function drawSoundings(ctx, t, P, pal, c) {
  const st = labelsState(c.L, t);
  const cIn = st.colour;
  for (const o of SOUNDINGS) {
    const a = o.a * knock(o, st);
    if (a <= 0.01) continue;
    const q = P(o);
    if (o.tone !== 'ink' && cIn > 0) {
      if (o.tone === 'amber') { glow(ctx, q, 9, pal.amber, Math.min(1, 0.7 * cIn * a * 2)); dot(ctx, q, 2.4, pal.amber, cIn * Math.min(1, a * 2.4)); }
      else { dot(ctx, q, 2.2, pal.orange, cIn * Math.min(1, a * 2.4)); ring(ctx, q, 6, { color: pal.orange, alpha: cIn * Math.min(1, a * 2), width: 1, dash: [1.5, 2.5] }); }
      if (cIn >= 1) continue;
    }
    mark(ctx, q, o.kind, o.rot, pal.ink, a * (o.tone === 'ink' ? 1 : 1 - cIn));
  }
  // the two identical patches: the same readings twice, darker while the viewer compares them
  PATCH_AT.forEach((at) => {
    for (const p of PATCH) {
      const w = { x: at.x + p.dx, y: at.y + p.dy };
      mark(ctx, P(w), p.kind, p.rot, pal.ink, (0.3 + 0.45 * st.patch) * knock(w, st));
    }
  });
}

// Sight lines for "people hear the word": from the chart margins to the word, stopping at it.
export const SIGHT_FROM = [{ x: SHEET.x0, y: 380 }, { x: SHEET.x0, y: 1150 }, { x: 900, y: SHEET.y0 }, { x: 1750, y: SHEET.y0 }, { x: 2650, y: SHEET.y0 }, { x: SHEET.x1, y: 260 }, { x: SHEET.x1, y: 900 }, { x: SHEET.x1, y: 1500 }];
export const STAGE_SLOT = STAGE;



// ---------- cues from beats.json ----------

export function makeCues(data, measure) {
  const B = Object.fromEntries(data.beats.map((b) => [b.id, b]));
  const s = (id) => B[id].start, a = (id) => B[id].statement.at, e = (id) => B[id].end;
  const c = {
    B, s, a, e,
    dusk: s(ID.clarity) - 0.2, // dusk sweeps in from the fog while no caption is on screen
    close: s(ID.end) - 0.8, // every line draws in to the crosshair as Hold both at once leaves
  };
  c.L = labelsLayout(c, measure);
  c.lift = c.L.tLift; // the names lift and the record is revealed
  return c;
}

// ---------- camera path ----------

const FULL = { cx: 1800, cy: 1000, zoom: 0.46, pitch: 0 }; // whole sheet inside the frame, clear margins
export function cameraKeys(c) {
  const s = c.s;
  const k = (id, pose, dur = 1.4, lead = 0.3, drift) => ({ at: Math.max(0, c.s(id) - lead), dur, pose, drift });
  const fork = (i) => ({ cx: FORKS[i].F.x + 110, cy: FORKS[i].F.y + 50, zoom: 0.95, pitch: 0.15 });
  const mid = { cx: 1760, cy: 930, zoom: 0.62, pitch: 0.12 };
  return [
    { at: 0, dur: 0.001, pose: FULL },
    k(ID.label, { cx: STAGE_SLOT.cx, cy: STAGE_SLOT.y + 110, zoom: 0.62, pitch: 0 }, 1.8, 0),
    k(ID.camps, FULL, 1.2, 0),
    k(ID.reads, fork(0), 2.2, 0.6),
    k(ID.forks, mid, 1.6),
    k(ID.harris, { ...FULL, pitch: 0.12 }, 1.6, 0.2),
    k(ID.keep, { cx: 880, cy: 520, zoom: 1.05, pitch: 0.25 }, 1.8),
    k(ID.test, { cx: 820, cy: 530, zoom: 1.1, pitch: 0.28 }, 1.2),
    k(ID.caught, { cx: 450, cy: 450, zoom: 1.6, pitch: 0.28 }, 1.4),
    k(ID.fix, { cx: 1000, cy: 590, zoom: 1.15, pitch: 0.12 }, 1.4),
    k(ID.law, { cx: 1640, cy: 470, zoom: 1.0, pitch: 0.15 }, 1.3),
    k(ID.unknown, { cx: 1850, cy: 960, zoom: 0.5, pitch: 0.35 }, 2.4, 0.2),
    k(ID.hold, { cx: 1800, cy: 980, zoom: 0.5, pitch: 0.2 }, 2.0, 0.2),
    { at: s(ID.end) - 0.8, dur: 1.5, pose: { cx: END_FROM.x, cy: END_FROM.y + 60, zoom: 1.4, pitch: 0 } },
  ];
}

// ---------- label anchors (world points + chip offset in stage px) ----------

const ANCHORS = {
  [ID.mozilla + ':0']: { w: FORKS[0].up, dx: 36, dy: -24, col: 'amber' },
  [ID.google + ':0']: { w: FORKS[0].dn, dx: 36, dy: 24, col: 'orange' },
  [ID.forks + ':0']: { w: FORKS[1].up, dx: 36, dy: -24, col: 'amber' },
  [ID.forks + ':1']: { w: FORKS[2].up, dx: 36, dy: -24, col: 'amber' },
  [ID.law + ':0']: { w: CH_BUOYS[0], dx: 36, dy: 30 },
};
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

  drawSoundings(ctx, t, P, pal, c);

  // the current draws in on the blank chart: the main line first, the rest follow
  const mainIn = easeInOut((t - 0.4) / 2.6);
  const restIn = easeInOut((t - 1.4) / 2.0);
  for (const st of STREAMS) {
    const on = st.k === 0 ? mainIn : restIn;
    if (on <= 0) continue;
    const pts = st.pts.map((w) => P(w));
    path(ctx, st.k === 0 ? partial(pts, on) : pts, { color: ink, alpha: st.k === 0 ? 0.6 : (0.14 + 0.02 * (5 - Math.abs(st.k))) * on, width: st.k === 0 ? 1.7 : 1.1, dash: [14, 10], offset: -march * 14 });
  }

  // forks: one neutral ring, two branches drawn at the same speed, colour only at the ends.
  // The first (code) is built caption by caption; the other two (proteins, sight) arrive together.
  const forkTimes = [
    { ring: c.s(ID.reads) + 0.3, br: c.s(ID.reads) + 0.9, up: c.s(ID.mozilla) + 0.2, dn: c.s(ID.google) + 0.2 },
    { ring: c.s(ID.forks) + 0.1, br: c.s(ID.forks) + 0.4, up: c.s(ID.forks) + 1.6, dn: c.s(ID.forks) + 1.6 },
    { ring: c.s(ID.forks) + 0.1, br: c.s(ID.forks) + 0.4, up: c.s(ID.forks) + 1.6, dn: c.s(ID.forks) + 1.6 },
  ];
  // "Use it, value it, and keep your eyes open": the lights and hazards glow together
  const glowUp = windowAlpha(t, c.s(ID.useit) + 0.3, c.e(ID.hold), 0.8, 1.0);
  FORKS.forEach((f, i) => {
    const T = forkTimes[i];
    const r = rise(t, T.ring, 0.4);
    if (r <= 0) return;
    ring(ctx, P(f.F), 12 * sc0, { color: ink, alpha: r, width: 1.7, cp });
    const br = easeInOut((t - T.br) / 1.2);
    if (br > 0) for (const b of [f.north, f.south]) path(ctx, partial(b.map((w) => P(w)), br), { color: ink, alpha: 0.75, width: 1.6, dash: [10, 8], offset: -march * 12 });
    light(ctx, P(f.up), T.up, t, pal, sc0, still);
    hazard(ctx, P(f.dn), T.dn, t, pal, sc0, cp, f.hazard);
    if (glowUp > 0) {
      glow(ctx, P(f.up), 70 * sc0, pal.amber, 0.35 * glowUp);
      glow(ctx, P(f.dn), 60 * sc0, f.hazard === 'test' ? ink : pal.orange, 0.3 * glowUp);
    }
  });

  // harbor (H40): breakwater, 122 soundings; ten turn orange together
  const bIn = rise(t, c.s(ID.test) + 0.2, 0.7);
  if (bIn > 0) {
    const bc = [{ x: BASIN.x0, y: BASIN.y0 }, { x: BASIN.x1, y: BASIN.y0 }, { x: BASIN.x1, y: BASIN.y1 }, { x: BASIN.x0, y: BASIN.y1 }].map((w) => P(w));
    frame(ctx, bc, { color: ink, alpha: bIn, width: 1.5, tick: 16, dashAlpha: 0.6, gapSide: 3, gap: [0.35, 0.6] });
    const turn = easeInOut((t - (c.a(ID.test) + 0.8)) / 0.5);
    GRID.forEach((w, i) => {
      const hot = ORANGE.includes(i);
      dot(ctx, P(w), (hot ? lerp(2.6, 4, turn) : 2.6) * sc0, hot && turn > 0 ? mixCol(ink, pal.orange, turn) : ink, bIn * (hot ? 1 : 0.55));
    });
    // the bundle leaves through the open side and fans into 19 ticks on the coast
    const bundle = easeInOut((t - (c.a(ID.test) + 2.0)) / 1.2);
    if (bundle > 0) {
      const u1 = clamp(bundle * 2), u2 = clamp(bundle * 2 - 1);
      ORANGE.forEach((i) => path(ctx, partial([P(GRID[i]), P(GATE)], u1), { color: pal.orange, alpha: 0.75, width: 1.5, dash: [6, 5], offset: -march * 10 }));
      const stopAt = c.a(ID.caught) + 0.3;
      TICKS.forEach((w, j) => {
        const off = j === STOP_TICK ? -Math.min(march, stopAt) * 10 : -march * 10;
        path(ctx, partial([P(GATE), P(w)], u2), { color: pal.orange, alpha: 0.7, width: 1.5, dash: [6, 5], offset: off });
        if (u2 >= 1) seg(ctx, P({ x: w.x - 10, y: w.y }), P({ x: w.x + 10, y: w.y }), { color: pal.orange, alpha: 1, width: 2 });
      });
    }
    // the catch (H42): a short solid ink bar across one line near the shore; its dashes stop
    const bar = rise(t, c.a(ID.caught) + 0.3, 0.4);
    if (bar > 0) {
      const w = TICKS[STOP_TICK], g = GATE, k = 0.82;
      const m = { x: lerp(g.x, w.x, k), y: lerp(g.y, w.y, k) };
      const dx = w.x - g.x, dy = w.y - g.y, l = Math.hypot(dx, dy);
      const nx = (-dy / l) * 22, ny = (dx / l) * 22;
      seg(ctx, P({ x: m.x - nx, y: m.y - ny }), P({ x: m.x + nx, y: m.y + ny }), { color: ink, alpha: bar, width: 4, cap: 'butt' });
    }
  }

  // fixes tested again (P10): one monitor in the harbor; a hole opens, a fix closes it, the next
  // version is tested and opens again. It loops for the beat, so it implies no count of versions.
  const tf = c.a(ID.fix) + 0.2, tEndFix = c.e(ID.fix) - 1.4;
  const mon = rise(t, tf - 0.4, 0.5);
  if (mon > 0) {
    const q = P({ x: MEASURE.x, y: MEASURE.y + 150 });
    const CYC = 1.3, kMax = Math.max(0, Math.floor((tEndFix - tf) / CYC));
    const k = clamp(Math.floor((t - tf) / CYC), 0, kMax), u = t < tf ? 0 : clamp((t - tf - k * CYC) / CYC);
    const done = t > tf + (kMax + 1) * CYC;
    const r = (18 + 3 * k) * sc0, gapAt = -Math.PI / 2 + k * 1.9;
    const open = done ? 0 : easeOut(u / 0.35) * (1 - easeInOut((u - 0.5) / 0.35));
    const g = 0.9 * open;
    ring(ctx, q, r, { color: ink, alpha: mon, width: 2, cp, from: gapAt + g / 2, to: gapAt + TAU - g / 2 });
    if (open > 0.05) ring(ctx, q, r, { color: pal.orange, alpha: mon * open, width: 2.4, cp, from: gapAt - g / 2, to: gapAt + g / 2 });
    const fixA = done ? 1 : t < tf ? 0 : Math.max(k > 0 ? 0.4 : 0, easeOut((u - 0.5) / 0.35));
    if (fixA > 0) { ring(ctx, q, r + 7 * sc0, { color: pal.olive, alpha: clamp(fixA) * mon, width: 2.2, cp }); glow(ctx, q, r * 2, pal.olive, 0.2 * clamp(fixA) * mon); }
  }

  // laws (L37, L14): the blue channel draws out of the harbor, two buoys drop
  const t11 = c.s(ID.law);
  const chIn = easeInOut((t - (t11 + 0.1)) / 1.4);
  if (chIn > 0) {
    for (const side of [-1, 1]) path(ctx, partial([P(chan(0, side)), P(chan(1, side))], chIn), { color: pal.blue, alpha: 0.9, width: 1.6, dash: [9, 7] });
    const xs = c.B[ID.law].extra.filter((e) => e.role === 'buoy');
    CH_BUOYS.slice(0, xs.length).forEach((w, i) => {
      const b = rise(t, xs[i].at - 0.2, 0.4);
      if (b > 0) { dot(ctx, P(w), 5.5 * sc0, pal.blue, b); ring(ctx, P(w), 10 * sc0, { color: pal.blue, alpha: b * 0.6, width: 1.3, cp }); }
    });
  }

  // fog: gathers at the far edge once the current is revealed, deepens for the unknown
  const fogIn = easeInOut((t - 3) / 3) * (0.5 + 0.5 * easeInOut((t - c.s(ID.unknown)) / 2)); // rolls in with its heading
  if (fogIn > 0) {
    const fogCol = mixCol([236, 236, 230], [52, 64, 78], pal.dusk);
    FOG.forEach((f) => {
      const q = P({ x: f.x + (still ? 0 : 40 * Math.sin(t * 0.07 + f.p)), y: f.y + (still ? 0 : 24 * Math.sin(t * 0.05 + f.p * 1.3)) });
      glow(ctx, q, f.r * pr.pose.zoom, fogCol, 0.8 * fogIn);
    });
  }

  // the unknown (W7): a sounding drops into the fog and finds no bottom (no ring)
  drop(ctx, P(FOG_DROP), c.a(ID.unknown) + 0.2, t, pal.ink, pal, sc0, { hang: true });

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

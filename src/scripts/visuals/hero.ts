/*
 * Hero visual: a slowly turning radial burst of record nodes on thin rays.
 *
 * Every node has two homes: a place on a ray of the burst (colored by
 * category) and a place in a loose, uncolored cloud. The scene holds the
 * burst, lets it come apart into the cloud, then gathers it again, so the
 * record reads as "scattered reports, put in order". While the burst holds,
 * a short label names what one node stands for; pointing at a colored node
 * names it too.
 *
 * All geometry is generated from a fixed seed; projection happens on the
 * CPU (about 130 nodes) and the Shapes batcher draws two instanced passes.
 * The layout keeps the whole scene (burst and cloud) clear of the hero copy.
 */
import type { SceneFactory } from './runtime';
import { Shapes, rgb } from './shapes';

/* Timeline of one cycle, in seconds. */
const HOLD_BURST = 5.8;
const MORPH = 1.25;
const HOLD_CLOUD = 4.6;
const CYCLE = HOLD_BURST + MORPH + HOLD_CLOUD + MORPH;
/** Scene time 0 starts at the gather, so the first thing seen is the burst forming. */
const START = CYCLE - MORPH;

/** Label windows inside the burst hold: [start, end]. */
const LABEL_WINDOWS: [number, number][] = [
  [0.45, 2.75],
  [3.0, 5.3],
];
const LABEL_FADE = 0.3;

/** Category colors by index: ink, orange, amber, olive. */
const INK = 0;
const ORANGE = 1;
const AMBER = 2;
const OLIVE = 3;
const COLOR_WEIGHTS = [0.34, 0.24, 0.19, 0.23];

const LABELS: [string, number][] = [
  ['Research · Examine the methods', OLIVE],
  ['Reported misuse · Check attribution', ORANGE],
  ['Evidence · Identify its limits', AMBER],
  ['Warnings · Read the original argument', ORANGE],
  ['Oversight · Follow policy responses', OLIVE],
  ['Open questions · Compare interpretations', AMBER],
];

const RAYS = 92;
const STUBS = 26;
const FREE = 16;
const CAMERA = 5;
/** Node sizes are authored for a burst radius of 240 CSS px. */
const SIZE_REF = 240;
/** Farthest a cloud position may sit from the centre, in burst radii. */
const CLOUD_MAX = 1.6;
/** Projected reach of the burst (nodes on rays up to 1.0 R, with perspective), in burst radii. */
const BURST_EXT = 1.06;
/** Clear space around the hero copy, CSS px. */
const TEXT_GAP = 24;
/** Chip clearance beyond the burst rim, CSS px. */
const CHIP_GAP = 18;
/** Mix value where a node's color switches (inside its size dip). */
const SWITCH = 0.775;

const END = 0;
const MID = 1;
const LOOSE = 2;

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Largest projected distance from the centre of a point at distance `d` under any rotation. */
const reach = (d: number) => (d * CAMERA) / Math.sqrt(CAMERA * CAMERA - d * d);

type Box = [number, number, number, number];
/** Gap between two boxes (0 when they touch or overlap). */
const boxGap = (a: Box, b: Box) => Math.hypot(Math.max(b[0] - a[2], 0, a[0] - b[2]), Math.max(b[1] - a[3], 0, a[1] - b[3]));
/** Distance from a point to a box (0 inside). */
const toBox = (x: number, y: number, b: Box) => Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - y, 0, y - b[3]));

interface Node {
  kind: number;
  color: number;
  size: number;
  delay: number;
  burst: [number, number, number];
  cloud: [number, number, number];
}

function build() {
  const r = random(20260922);
  const pickColor = () => {
    let u = r();
    for (let i = 0; i < COLOR_WEIGHTS.length; i++) {
      u -= COLOR_WEIGHTS[i];
      if (u <= 0) return i;
    }
    return INK;
  };
  const unit = (): [number, number, number] => {
    const y = r() * 2 - 1;
    const a = r() * Math.PI * 2;
    const s = Math.sqrt(1 - y * y);
    return [Math.cos(a) * s, y, Math.sin(a) * s];
  };
  const zero: [number, number, number] = [0, 0, 0];

  const nodes: Node[] = [];
  const rays: { node: number; dir: [number, number, number]; len: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < RAYS; i++) {
    // evenly spread directions (Fibonacci sphere) with a little jitter
    const y = 1 - (2 * (i + 0.5)) / RAYS;
    const s = Math.sqrt(1 - y * y);
    const a = i * golden;
    let d: [number, number, number] = [Math.cos(a) * s + (r() - 0.5) * 0.16, y + (r() - 0.5) * 0.16, Math.sin(a) * s + (r() - 0.5) * 0.16];
    const n = Math.hypot(...d);
    d = [d[0] / n, d[1] / n, d[2] / n];
    // most rays end on an outer shell (a crisp round silhouette), a few inside for depth
    const len = r() < 0.8 ? 0.88 + 0.12 * r() : 0.45 + 0.35 * r();
    const big = r() < 0.07;
    rays.push({ node: nodes.length, dir: d, len });
    nodes.push({
      kind: END,
      color: pickColor(),
      size: big ? 9 + 3 * r() : 3 + 5.5 * Math.pow(r(), 1.3),
      delay: r(),
      burst: [d[0] * len, d[1] * len, d[2] * len],
      cloud: zero,
    });
    if (r() < 0.22) {
      const t = len * (0.4 + 0.4 * r());
      nodes.push({ kind: MID, color: pickColor(), size: 2 + 3 * r(), delay: r(), burst: [d[0] * t, d[1] * t, d[2] * t], cloud: zero });
    }
  }
  for (let i = 0; i < STUBS; i++) rays.push({ node: -1, dir: unit(), len: 0.25 + 0.5 * r() });
  for (let i = 0; i < FREE; i++) {
    // loose specks sit inside the rim so the silhouette stays round
    const d = unit();
    const t = 0.5 + 0.47 * r();
    nodes.push({ kind: LOOSE, color: pickColor(), size: 0.8 + 1.4 * r(), delay: r(), burst: [d[0] * t, d[1] * t, d[2] * t], cloud: zero });
  }

  // the cloud: wide and airy, in a few loose groups; positions keep apart by more than their sizes
  const c = random(20260923);
  const gauss = () => (c() + c() + c() - 1.5) / 0.75;
  const groups = [0, 1, 2, 3, 4].map(() => [gauss() * 0.6, gauss() * 0.35, gauss() * 0.55]);
  let cloudReach = 1;
  nodes.forEach((node, i) => {
    let p: [number, number, number] = zero;
    for (let tries = 0; tries < 80; tries++) {
      // a ring of outliers round the turn axis keeps the cloud as wide at every angle
      if (c() < 0.25) {
        const a = c() * Math.PI * 2;
        const d = 0.95 + c() * 0.25;
        p = [Math.cos(a) * d, gauss() * 0.35, Math.sin(a) * d];
      } else if (c() < 0.55) {
        const g = groups[Math.floor(c() * 5)];
        p = [g[0] + gauss() * 0.3, g[1] + gauss() * 0.24, g[2] + gauss() * 0.3];
      } else p = [gauss() * 0.7, gauss() * 0.55, gauss() * 0.7];
      if (Math.hypot(...p) > CLOUD_MAX || Math.hypot(p[0], p[2]) > 1.2) continue;
      let ok = true;
      for (let j = 0; j < i && ok; j++) {
        const q = nodes[j].cloud;
        ok = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) >= 0.08 + (1.5 * (node.size + nodes[j].size)) / SIZE_REF;
      }
      if (ok) break;
    }
    node.cloud = p;
    cloudReach = Math.max(cloudReach, reach(Math.hypot(...p) * 1.4) / 1.4);
  });
  // horizontal and vertical reach of the cloud over a full turn and the whole pitch range, per unit of cloud scale
  // (-0.3 +- wobble 0.06 +- pointer tilt 0.21), in burst radii
  let reachX = 1;
  let reachY = 1;
  /** Narrowest half-width of the cloud over a full turn (at rest pitch), in burst radii. */
  let widthMin = Infinity;
  for (let k = 0; k < 64; k++) {
    let lo = 0;
    let hi = 0;
    const yaw = (k / 64) * Math.PI * 2;
    for (const pitch of [-0.57, -0.44, -0.3, -0.16, -0.03]) {
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      for (const { cloud: [x, y, z] } of nodes) {
        const x1 = x * cyaw + z * syaw;
        const z1 = -x * syaw + z * cyaw;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        // reach per unit of cloud scale grows with the scale (perspective): bound it at the largest, 1.4
        const s = CAMERA / (CAMERA - Math.max(z2, 0) * 1.4);
        reachX = Math.max(reachX, Math.abs(x1 * s));
        reachY = Math.max(reachY, Math.abs(y2 * s));
        if (pitch === -0.3) {
          const s1 = CAMERA / (CAMERA - z2);
          lo = Math.min(lo, x1 * s1);
          hi = Math.max(hi, x1 * s1);
        }
      }
    }
    widthMin = Math.min(widthMin, (hi - lo) / 2);
  }
  reachX *= 1.02;
  reachY *= 1.02;

  // cloud edges: some nodes link to their nearest neighbour, a few outliers reach far
  const edges: [number, number][] = [];
  const seen = new Set<number>();
  const key = (a: number, b: number) => Math.min(a, b) * 4096 + Math.max(a, b);
  const add = (a: number, b: number) => {
    if (a === b || seen.has(key(a, b))) return false;
    seen.add(key(a, b));
    edges.push([a, b]);
    return true;
  };
  const dist = (a: Node, b: Node) => Math.hypot(a.cloud[0] - b.cloud[0], a.cloud[1] - b.cloud[1], a.cloud[2] - b.cloud[2]);
  nodes.forEach((a, i) => {
    if (a.kind === LOOSE || r() > 0.55) return;
    let best = -1;
    let bestD = Infinity;
    nodes.forEach((b, j) => {
      const d = j === i ? Infinity : dist(a, b);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    add(i, best);
  });
  // five longer reaches: unique pairs 0.9-1.2 apart in the cloud, not across all of it
  for (let k = 0, tries = 0; k < 5 && tries < 500; tries++) {
    const a = Math.floor(r() * nodes.length);
    const b = Math.floor(r() * nodes.length);
    const d = dist(nodes[a], nodes[b]);
    if (d >= 0.9 && d <= 1.2 && add(a, b)) k++;
  }
  // long links draw at half strength so they read as reach, not scratches
  const edgeAlpha = edges.map(([a, b]) => (dist(nodes[a], nodes[b]) > 0.5 ? 0.5 : 1));

  return { nodes, rays, edges, edgeAlpha, cloudReach, reachX, reachY, widthMin };
}

const hero: SceneFactory = ({ gl, slot, redraw }) => {
  const { nodes, rays, edges, edgeAlpha, cloudReach, reachX, reachY, widthMin } = build();
  const shapes = new Shapes(gl, rays.length + edges.length + 4, nodes.length + 8);

  const css = getComputedStyle(slot);
  const token = (name: string, fallback: string) => rgb(css.getPropertyValue(name).trim() || fallback);
  const palette = [
    token('--ink', '#1a1614'),
    token('--accent-orange', '#ff7733'),
    token('--accent-amber', '#e5a700'),
    token('--accent-olive', '#a89a1a'),
  ];
  const paper = token('--paper', '#d7d7d0');
  const ink = palette[INK];
  const cssColor = (c: number) => `rgb(${palette[c].map((v) => Math.round(v * 255)).join(' ')}${c === INK ? ' / 0.6' : ''})`;

  // label chip and its dashed leader, positioned with transforms each frame
  const chip = document.createElement('div');
  chip.className = 'visual-label';
  const dot = document.createElement('span');
  dot.className = 'visual-label-dot';
  const text = document.createElement('span');
  chip.append(dot, text);
  const leader = document.createElement('div');
  leader.className = 'visual-leader';
  slot.append(leader, chip);

  // a slow load already showed the CSS still (a burst): open on the burst hold, not the
  // gather, and let the still cross-fade out (VisualSlot.astro, data-visual-handoff)
  const fallback = slot.querySelector('.visual-fallback');
  const handoff = !!fallback && Number(getComputedStyle(fallback).opacity) > 0.05;
  const start = handoff ? 0 : START;
  if (handoff) slot.setAttribute('data-visual-handoff', '');

  let W = 1;
  let H = 1;
  let dpr = 1;
  let cx = 0;
  let cy = 0;
  let radius = 1;
  let cloudScale = 1;
  let sizeScale = 1;
  let textBoxes: Box[] = [];
  /** Floating page controls (fixed), in slot coordinates at the top of the page. */
  let obstacles: Box[] = [];
  /** Height of the slot that shows in the first screen (chips and the burst stay inside it). */
  let visH = 1;
  let disposed = false;

  // per-frame projected state
  const n = nodes.length;
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sz = new Float32Array(n);
  const sr = new Float32Array(n);
  const mix = new Float32Array(n);
  const order = nodes.map((_, i) => i);
  const col: [number, number, number] = [0, 0, 0];

  let tiltX = 0;
  let tiltY = 0;
  let aimX = 0;
  let aimY = 0;
  let pointerX = -1e4;
  let pointerY = -1e4;
  /** Last pointer position in client coordinates (off screen when unknown or gone). */
  let clientX = -1e4;
  let clientY = -1e4;
  const onMove = (e: PointerEvent) => {
    clientX = e.clientX;
    clientY = e.clientY;
  };
  const onGone = () => {
    clientX = -1e4;
    clientY = -1e4;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onGone);
  window.addEventListener('blur', onGone);
  let lastTime = -1;
  /** Turning clock: runs with scene time, eases to a stop while a node is pointed at so it stays under the pointer. */
  let spin = -1;
  let spinRate = 1;
  /** Cycle clock: scene time, held while a node is pointed at so its chip stays. */
  let clock = -1;

  let labelKey = -1;
  let anchor = -1;
  let anchorColor = ORANGE;
  let hovered = -1;
  let chipW = 0;
  let chipH = 0;
  /** Direction offset from the node's radial angle chosen for the current chip, and its last good spot. */
  let chipTurn = 0;
  let chipX = 0;
  let chipY = 0;

  /** Text line boxes of the hero copy, in slot coordinates. */
  const measureText = () => {
    const s = slot.getBoundingClientRect();
    const boxes: Box[] = [];
    const push = (r: DOMRect) => {
      if (r.width > 0 && r.height > 0) boxes.push([r.left - s.left, r.top - s.top, r.right - s.left, r.bottom - s.top]);
    };
    const section = slot.closest('section') ?? document;
    section.querySelectorAll('#hero-title, .hero-lead').forEach((el) => {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let t = walk.nextNode(); t; t = walk.nextNode()) {
        if (!t.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(t);
        for (const r of range.getClientRects()) push(r);
      }
    });
    section.querySelectorAll('.hero-actions a').forEach((a) => push(a.getBoundingClientRect()));
    textBoxes = boxes;
    const top = s.top + window.scrollY;
    obstacles = [...document.querySelectorAll('.jump-arrows, .jump-form, .nav-right, .nav-toggle')]
      .filter((el) => {
        for (let e: Element | null = el; e; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') return true;
        return false;
      })
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0)
      .map((r): Box => [r.left - s.left, r.top - top, r.right - s.left, r.bottom - top]);
  };

  /**
   * Place the scene. Every position near the default is scored: burst size
   * first, then cloud width, minus how far it moved. The burst stays
   * TEXT_GAP from the copy, off the floating page controls and above the fold,
   * with room for a chip above or below it. The cloud (its reach over a full
   * turn) stays TEXT_GAP from the copy and inside the slot, and is always
   * wider than the burst.
   */
  const layout = () => {
    const box = slot.getBoundingClientRect();
    const full = box.left < 2;
    // a hero taller than the first screen keeps its drawing and chips above the fold
    visH = Math.min(H, window.innerHeight - (box.top + window.scrollY));
    if (visH < H * 0.5) visH = H;
    const R0 = full ? Math.min(W * 0.33, H * 0.38) : Math.min(H * 0.307, W * 0.29);
    const x0 = full ? W * 0.5 : W * 0.55;
    const y0 = full ? H * 0.52 : H * 0.5;
    const chipRoom = CHIP_GAP + 22 + 8;
    const keep = TEXT_GAP + 6;
    // edge margin plus the largest node radius
    const pad = 12 + 16;
    let best = -Infinity;
    let pick: [number, number, number, number] = [x0, y0, R0 * 0.5, Math.min(1.4, 1.12 / widthMin)];
    // first pass: the burst at least 140 px (110 full width) and the cloud 1.2x its width;
    // a tight slot relaxes both before it gives up on any clearance
    const passes: [number, number][] = [
      [Math.min(R0 * 0.8, full ? 110 : 140), 1.2],
      [R0 * 0.62, 1.15],
      [R0 * 0.45, 1.12],
    ];
    for (const [floor, minWide] of passes) {
      if (best > -Infinity) break;
      for (let dx = full ? 0 : -W * 0.15; dx <= (full ? 0 : W - x0); dx += 6) {
        for (let dy = -H * 0.3; dy <= H * 0.3; dy += 6) {
          const x = x0 + dx;
          const y = y0 + dy;
          let R = Math.min(R0, (x - 4) / BURST_EXT, (W - 4 - x) / BURST_EXT, (y - 4) / BURST_EXT, (visH - 4 - y) / BURST_EXT);
          R = Math.min(R, Math.max(y - chipRoom, visH - y - chipRoom) / BURST_EXT);
          for (const t of obstacles) R = Math.min(R, (toBox(x, y, t) - 8) / BURST_EXT);
          // K: cloud size in px (burst radius times cloud scale)
          let K = Math.min((x - pad) / reachX, (W - pad - x) / reachX, (y - pad) / reachY, (visH - pad - y) / reachY);
          for (const t of textBoxes) {
            const d = toBox(x, y, t);
            R = Math.min(R, (d - keep) / BURST_EXT);
            const sepX = Math.max(t[0] - keep - x, x - t[2] - keep) / reachX;
            const sepY = Math.max(t[1] - keep - y, y - t[3] - keep) / reachY;
            K = Math.min(K, Math.max((d - keep) / cloudReach, sepX, sepY));
          }
          R = Math.min(R, (K * widthMin) / minWide);
          if (R < floor - 1e-6) continue;
          K = Math.min(K, R * 1.4);
          const wide = (K / R) * widthMin;
          const score = R / R0 + 0.15 * Math.min(1, (wide - minWide) / 0.25) - (0.8 * Math.hypot(dx, dy)) / R0;
          if (score > best) {
            best = score;
            pick = [x, y, R, K / R];
          }
        }
      }
    }
    [cx, cy, radius, cloudScale] = pick;
    sizeScale = Math.pow(Math.max(radius, 100) / SIZE_REF, 0.75) * Math.min(1, radius / 100);
    anchor = -1;
    labelKey = -1;
  };

  const fontsReady = document.fonts?.ready;
  fontsReady?.then(() => {
    if (disposed) return;
    measureText();
    layout();
    redraw();
  });

  /** Chip rectangle for node `i` pushed out along its radial direction turned by `turn`, or null if it cannot sit clear. */
  const chipSpot = (i: number, turn: number): [number, number] | null => {
    const nx = sx[i] / dpr;
    const ny = sy[i] / dpr;
    const a = Math.atan2(ny - cy, nx - cx) + turn;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const rim = radius * BURST_EXT + CHIP_GAP;
    const gapTo = (t: number) => {
      const x = cx + ux * t - chipW / 2;
      const y = cy + uy * t - chipH / 2;
      return toBox(cx, cy, [x, y, x + chipW, y + chipH]);
    };
    let lo = 0;
    let hi = rim + chipW + chipH;
    for (let k = 0; k < 14; k++) {
      const mid = (lo + hi) / 2;
      if (gapTo(mid) >= rim) hi = mid;
      else lo = mid;
    }
    const x = Math.min(Math.max(cx + ux * hi - chipW / 2, 8), W - chipW - 8);
    const y = Math.min(Math.max(cy + uy * hi - chipH / 2, 8), visH - chipH - 8);
    if (x < 8 - 1e-3 || y < 8 - 1e-3) return null; // chip wider or taller than the slot
    const box: Box = [x, y, x + chipW, y + chipH];
    if (toBox(cx, cy, box) < rim - 1) return null;
    // chips keep the same clear space from the copy as the drawing, and 8 px from page controls
    for (const t of textBoxes) if (boxGap(box, t) < TEXT_GAP) return null;
    for (const t of obstacles) if (boxGap(box, t) < 8) return null;
    return [x, y];
  };
  const TURNS = [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.2, -1.2];

  /** Leader from node `i` to the nearest point of a chip at (x, y): its length, and whether another node sits on it. */
  const leaderPath = (i: number, x: number, y: number) => {
    const nx = sx[i] / dpr;
    const ny = sy[i] / dpr;
    const dx = Math.min(Math.max(nx, x), x + chipW) - nx;
    const dy = Math.min(Math.max(ny, y), y + chipH) - ny;
    const len2 = dx * dx + dy * dy;
    const len = Math.sqrt(len2);
    const from = sr[i] / dpr + 3;
    for (let j = 0; j < n; j++) {
      const rj = sr[j] / dpr;
      if (j === i || rj < 1.2) continue;
      const px = sx[j] / dpr - nx;
      const py = sy[j] / dpr - ny;
      const u = len2 > 0 ? clamp01((px * dx + py * dy) / len2) : 0;
      if (u * len < from) continue;
      if (Math.hypot(px - u * dx, py - u * dy) < rj + 4) return { len, blocked: true };
    }
    return { len, blocked: false };
  };

  /** Chip turn for node `i` with the shortest clear leader (under `maxLen`), or NaN. */
  const bestTurn = (i: number, maxLen: number, allowBlocked: boolean): [number, number] => {
    let turn = NaN;
    let best = Infinity;
    for (const t of TURNS) {
      const spot = chipSpot(i, t);
      if (!spot) continue;
      const { len, blocked } = leaderPath(i, spot[0], spot[1]);
      if ((blocked && !allowBlocked) || len > maxLen || len >= best) continue;
      best = len;
      turn = t;
    }
    return [turn, best];
  };

  /**
   * Anchor for a label: an END node of its color near the rim, on the side
   * away from the copy at wide layouts, preferring large nodes (the ring reads)
   * and a short leader that crosses no other node.
   */
  const pickAnchor = (color: number) => {
    if (radius < 90 && chipW > 1.6 * radius) return -1;
    const full = slot.getBoundingClientRect().left < 2;
    const candidates: number[] = [];
    nodes.forEach((node, i) => {
      if (node.kind !== END || node.color !== color || sz[i] < -0.1) return;
      const d = Math.hypot(sx[i] / dpr - cx, sy[i] / dpr - cy) / radius;
      if (d >= 0.72 && d <= 0.98) candidates.push(i);
    });
    const passes: [number, boolean][] = [
      [Math.max(56, radius * 0.42), false],
      [radius * 0.9, false],
      [Infinity, true],
    ];
    for (const [maxLen, allowBlocked] of passes) {
      let pick = -1;
      let score = -Infinity;
      let pickTurn = 0;
      for (const i of candidates) {
        const [turn, len] = bestTurn(i, maxLen, allowBlocked);
        if (Number.isNaN(turn)) continue;
        const away = full || sx[i] / dpr > cx ? 1 : 0;
        const s = away * 2 + sz[i] * 0.5 + sr[i] / dpr / (12 * sizeScale) - (1.5 * len) / radius;
        if (s > score) {
          score = s;
          pick = i;
          pickTurn = turn;
        }
      }
      if (pick >= 0) {
        chipTurn = pickTurn;
        return pick;
      }
    }
    return -1;
  };

  const showChip = (i: number, label: string, color: number) => {
    text.textContent = label;
    dot.style.background = cssColor(color);
    leader.style.setProperty('--leader', cssColor(color));
    chipW = chip.offsetWidth;
    chipH = chip.offsetHeight;
    anchorColor = color;
    const spot = chipSpot(i, chipTurn);
    if (spot) [chipX, chipY] = spot;
  };

  const placeLabel = (alpha: number) => {
    if (alpha <= 0 || anchor < 0) {
      chip.style.opacity = '0';
      leader.style.opacity = '0';
      return;
    }
    // follow the node while the spot stays clear; otherwise hold the last good spot
    const spot = chipSpot(anchor, chipTurn);
    if (spot) [chipX, chipY] = spot;
    const x = chipX;
    const y = chipY;
    chip.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    chip.style.opacity = alpha.toFixed(3);
    // leader from the node's rim to the nearest point of the chip
    const nx = sx[anchor] / dpr;
    const ny = sy[anchor] / dpr;
    const tx = Math.min(Math.max(nx, x), x + chipW);
    const ty = Math.min(Math.max(ny, y), y + chipH);
    const dx = tx - nx;
    const dy = ty - ny;
    const len = Math.hypot(dx, dy);
    const start = sr[anchor] / dpr + 3;
    const ang = Math.atan2(dy, dx);
    leader.style.width = `${Math.max(0, len - start - 2).toFixed(1)}px`;
    leader.style.transform = `translate3d(${(nx + Math.cos(ang) * start).toFixed(1)}px, ${(ny + Math.sin(ang) * start).toFixed(1)}px, 0) rotate(${ang.toFixed(4)}rad)`;
    leader.style.opacity = alpha.toFixed(3);
  };

  /** A pulse ring in the node's shown color, with a faint glow of the same color. */
  const pulse = (i: number, color: number, p: number, alpha: number, grow: number, width: number) => {
    const c = palette[color];
    const a = alpha * (color === INK ? 0.6 : 1);
    const rr = sr[i] + (3 + grow * (1 - Math.pow(1 - p, 2))) * dpr;
    shapes.circle(sx[i], sy[i], rr, c, a, width * dpr);
    shapes.glow(sx[i], sy[i], rr * 0.8, c, a * 0.18);
  };

  return {
    resize(w, h, ratio) {
      W = w;
      H = h;
      dpr = ratio;
      measureText();
      layout();
    },

    pointer(x, y) {
      aimX = Math.max(-1.5, Math.min(1.5, x));
      aimY = Math.max(-1.5, Math.min(1.5, y));
    },

    render(time, still) {
      const dt = lastTime < 0 || still ? 0 : Math.max(0, time - lastTime);
      lastTime = time;
      // the tilt holds while a node is pointed at, so the node stays put
      const ease = hovered >= 0 ? 0 : 1 - Math.exp(-dt * 2.5);
      tiltX += (aimX - tiltX) * ease;
      tiltY += (aimY - tiltY) * ease;
      spinRate += ((hovered >= 0 ? 0 : 1) - spinRate) * (1 - Math.exp(-dt * 6));
      spin = still || spin < 0 ? time : spin + dt * spinRate;
      clock = still || clock < 0 ? time : clock + (hovered >= 0 ? 0 : dt);

      const t = (clock + start) % CYCLE;
      const cycleIndex = Math.floor((clock + start) / CYCLE);

      // morph progress: 1 = burst, 0 = cloud; each node runs its own staggered copy
      let phase = 1;
      let gathering = true;
      if (t >= HOLD_BURST && t < HOLD_BURST + MORPH) {
        phase = (t - HOLD_BURST) / MORPH;
        gathering = false;
      } else if (t >= HOLD_BURST + MORPH && t < CYCLE - MORPH) {
        phase = 1;
        gathering = false;
      } else if (t >= CYCLE - MORPH) {
        phase = (t - (CYCLE - MORPH)) / MORPH;
      }

      // turning, pointer tilt, and a little scroll parallax while the hero is in view
      const scroll = still ? 0 : Math.min(window.scrollY, 2000);
      const yaw = spin * 0.12 + tiltX * 0.22 + scroll * 0.0006;
      const pitch = -0.3 + Math.sin(spin * 0.21) * 0.06 + tiltY * 0.14;
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const R = radius * dpr;
      const ox = cx * dpr;
      const oy = cy * dpr;
      const cs = cloudScale;

      const project = (x: number, y: number, z: number, i: number) => {
        const x1 = x * cyaw + z * syaw;
        const z1 = -x * syaw + z * cyaw;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        const s = CAMERA / (CAMERA - z2);
        sx[i] = ox + x1 * R * s;
        sy[i] = oy - y2 * R * s;
        sz[i] = z2;
        return s;
      };

      for (let i = 0; i < n; i++) {
        const node = nodes[i];
        const p = clamp01((phase - node.delay * 0.4) / 0.6);
        const m = gathering ? easeInOut(p) : 1 - easeInOut(p);
        mix[i] = m;
        const b = node.burst;
        const c = node.cloud;
        const s = project(c[0] * cs + (b[0] - c[0] * cs) * m, c[1] * cs + (b[1] - c[1] * cs) * m, c[2] * cs + (b[2] - c[2] * cs) * m, i);
        // burst: perspective sizes; cloud: 0.9x, near nodes up to 1.15x; a dip hides the color switch
        const burstSize = Math.min(s * s, 1.2);
        const cloudSize = 0.85 * (1 + 0.5 * smooth(0.1, 1, sz[i]));
        const dip = 1 - 0.45 * Math.max(0, 1 - Math.abs(m - SWITCH) / 0.125);
        // far nodes shrink as they lighten, so size and tone agree; the largest disc stays at 14 px (R = 240)
        const far = 1 - 0.3 * smooth(-0.25, -0.75, sz[i]);
        sr[i] = Math.min(node.size * (cloudSize + (burstSize - cloudSize) * m) * far, 14) * sizeScale * dip * dpr;
      }

      shapes.begin(gl.drawingBufferWidth, gl.drawingBufferHeight);
      const lw = dpr;
      const core = 5 * dpr;

      // rays: from just off the centre, faint at the core, darker toward the node; far rays fainter
      const gm = still ? 1 : gathering ? easeInOut(phase) : 1 - easeInOut(phase);
      const ray = (x: number, y: number, a0: number, a1: number) => {
        const dx = x - ox;
        const dy = y - oy;
        const len = Math.hypot(dx, dy);
        if (len > core + dpr) shapes.line(ox + (dx / len) * core, oy + (dy / len) * core, x, y, lw, ink, a0, a1);
      };
      for (const r of rays) {
        if (r.node < 0) continue;
        const i = r.node;
        const v = smooth(0.35, 1, mix[i]) * (0.6 + 0.4 * (sz[i] + 1) * 0.5);
        if (v > 0.002) ray(sx[i], sy[i], 0.07 * v, 0.55 * v);
      }
      // short rays without a node, following the burst as a whole
      if (gm > 0.002) {
        for (const r of rays) {
          if (r.node >= 0) continue;
          const [x, y, z] = r.dir;
          const x1 = x * cyaw + z * syaw;
          const z1 = -x * syaw + z * cyaw;
          const y2 = y * cp - z1 * sp;
          const z2 = y * sp + z1 * cp;
          const s = (CAMERA / (CAMERA - z2 * r.len)) * r.len;
          const v = gm * (0.6 + 0.4 * (z2 + 1) * 0.5);
          ray(ox + x1 * R * s, oy - y2 * R * s, 0.05 * v, 0.3 * v);
        }
      }
      // cloud links fade in as the burst lets go
      for (let e = 0; e < edges.length; e++) {
        const [a, b] = edges[e];
        const v = Math.pow(1 - (mix[a] + mix[b]) * 0.5, 2) * 0.24 * edgeAlpha[e];
        if (v > 0.002) shapes.line(sx[a], sy[a], sx[b], sy[b], lw, ink, v, v);
      }
      shapes.flush();

      // hover: a colored END node within 14 px of the pointer names itself at once;
      // the pointer is mapped through the slot's current box, so scrolling moves it off the node
      if (!still) {
        const box = slot.getBoundingClientRect();
        pointerX = clientX - box.left;
        pointerY = clientY - box.top;
        const near = (i: number) => Math.hypot(sx[i] / dpr - pointerX, sy[i] / dpr - pointerY);
        const keep = hovered >= 0 && mix[hovered] >= SWITCH && near(hovered) <= 18;
        if (!keep) {
          let best = -1;
          let bestD = 14;
          nodes.forEach((node, i) => {
            if (node.kind !== END || node.color === INK || mix[i] < SWITCH) return;
            const d = near(i) - sr[i] / dpr;
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          });
          if (best !== hovered) {
            hovered = best;
            labelKey = -1;
            if (best >= 0) {
              // measure the chip with its text first: placement depends on its size
              const options = LABELS.filter(([, c]) => c === nodes[best].color);
              const label = options[best % options.length][0];
              text.textContent = label;
              chipW = chip.offsetWidth;
              chipH = chip.offsetHeight;
              let [turn] = bestTurn(best, Infinity, false);
              if (Number.isNaN(turn)) [turn] = bestTurn(best, Infinity, true);
              if (Number.isNaN(turn)) hovered = -1;
              else {
                chipTurn = turn;
                anchor = best;
                showChip(best, label, nodes[best].color);
              }
            } else anchor = -1;
          }
        }
      }

      // label: one at a time while the burst holds (or the hovered node's)
      let labelAlpha = 0;
      if (hovered >= 0) labelAlpha = 1;
      else {
        let slotIndex = -1;
        LABEL_WINDOWS.forEach(([a, b], k) => {
          if (t >= a && t <= b) {
            slotIndex = k;
            labelAlpha = still ? 1 : Math.min(smooth(a, a + LABEL_FADE, t), 1 - smooth(b - LABEL_FADE, b, t));
          }
        });
        if (slotIndex >= 0) {
          const key = cycleIndex * LABEL_WINDOWS.length + slotIndex;
          if (key !== labelKey) {
            labelKey = key;
            const [label, color] = LABELS[key % LABELS.length];
            // measure the chip with its text first: placement depends on its size
            text.textContent = label;
            chipW = chip.offsetWidth;
            chipH = chip.offsetHeight;
            anchor = pickAnchor(color);
            if (anchor >= 0) showChip(anchor, label, color);
          }
        } else if (labelKey >= 0 && anchor >= 0) {
          anchor = -1;
        }
      }

      // nodes back to front; a node shows ink until its size dip, then its category color
      order.sort((a, b) => sz[a] - sz[b]);
      for (const i of order) {
        const node = nodes[i];
        const c = mix[i] >= SWITCH ? palette[node.color] : ink;
        // atmospheric depth: far nodes lighten toward the paper
        const fade = 0.25 * smooth(-0.25, -0.75, sz[i]);
        col[0] = c[0] + (paper[0] - c[0]) * fade;
        col[1] = c[1] + (paper[1] - c[1]) * fade;
        col[2] = c[2] + (paper[2] - c[2]) * fade;
        shapes.circle(sx[i], sy[i], sr[i], col, node.kind === LOOSE ? 0.85 : 1);
      }

      if (anchor >= 0 && labelAlpha > 0) {
        const p = still ? 0.35 : (t % 1.3) / 1.3;
        pulse(anchor, anchorColor, p, 0.6 * (1 - p) * labelAlpha, 13, 1.4);
      }
      placeLabel(labelAlpha);

      // an ambient pulse elsewhere, in either state, in the node's shown color
      if (!still) {
        const beat = Math.floor(time / 1.9);
        const i = (beat * 53 + 17) % RAYS;
        const target = rays[i].node;
        const p = (time % 1.9) / 1.9;
        if (target >= 0 && target !== anchor && sz[target] > -0.2) {
          pulse(target, mix[target] >= SWITCH ? nodes[target].color : INK, p, 0.45 * (1 - p), 11, 1.2);
        }
      }
      shapes.flush();
    },

    dispose(contextLost) {
      disposed = true;
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onGone);
      window.removeEventListener('blur', onGone);
      if (!contextLost) shapes.dispose();
      chip.remove();
      slot.removeAttribute('data-visual-handoff');
      leader.remove();
    },
  };
};

export default hero;

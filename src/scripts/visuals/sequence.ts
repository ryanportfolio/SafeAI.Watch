/*
 * Sequence visual: how one entry is read, drawn as a stack of layers.
 *
 * The base plane is the public record, a grid of dated sources. Above it sit
 * three translucent planes, one per step card: what happened (the event and
 * the sources that reported it), what the evidence shows (methods, findings
 * and limits linked to the event) and what remains uncertain (open questions
 * around a crosshair). A vertical spine runs from one source up through all
 * three layers.
 *
 * The page script in index.astro reports reading progress on the section:
 * 0 at the first card, 2 at the last, continuous in between. The layer being
 * read lifts and turns ink like its card; layers already read settle into the
 * stack; layers not reached yet float above as faint outlines. The spine fills
 * in orange as the reader climbs.
 *
 * Planes are drawn back to front on the CPU (a few hundred segments) through
 * the Shapes batcher; labels are DOM chips placed each frame.
 */
import type { SceneFactory } from './runtime';
import { Shapes, rgb } from './shapes';

type RGB = [number, number, number];

/** World height between layers, and the extra height of layers not reached yet. */
const SPACING = 0.46;
const FLOAT = 0.5;
const CENTER = (3 * SPACING + FLOAT * 0.5) / 2;
const YAW = -0.62;
const PITCH = 0.58;
const CAMERA = 7;
/**
 * Poses the stack is fitted at, in radians: the idle sway (yaw 0.05, pitch
 * 0.015) plus the pointer tilt. Tilt that swings the right-hand corners out is
 * clamped to 0.05 (AIM_X_MIN), so the fit reserves only that much; tilt the
 * other way pulls the stack in and needs no room.
 */
const FIT_YAWS = [YAW - 0.1, YAW, YAW + 0.05];
const FIT_PITCHES = [PITCH - 0.015, PITCH + 0.09];
/** Pointer tilt limits, as pointer offsets (yaw tilt = 0.1 x, pitch tilt = 0.05 y). */
const AIM_X_MIN = -0.5;
const AIM_MAX = 1.5;
/** Clearance kept around the floating section controls, in CSS px. */
const CONTROLS_CLEAR = 12;
/** Fastest change of the entry scale per px of scroll (0.15 per 100px). */
const ENTRY_SLOPE = 0.0015;
/** Step between the sampled slot positions of the entry scale, in CSS px. */
const ENTRY_STEP = 4;
/**
 * Smallest entry scale allowed (the stack grows at most 1 / 0.87 = 15% as it
 * settles). Where passing the controls would need more, the pinned stack is
 * drawn that much smaller instead, so the entry never reads as a zoom.
 */
const ENTRY_MIN = 0.87;
/** Slot width below which the chips take the short labels: the long ones would cost the stack about 90px. */
const COMPACT_LABELS = 720;

/** Plane coordinates (u, v in -1..1) of the entry followed through the stack. */
const SPINE: [number, number] = [0.2, 0];
/** Record grid: 9 x 9 dated sources. */
const GRID = 9;
/** Sources that reported the event (grid points). */
const SOURCES: [number, number][] = [
  [-0.4, 0.6],
  [0.6, 0.4],
  [-0.2, -0.4],
];
/** Other events on the same layer: u, v, radius in px. */
const EVENTS: [number, number, number][] = [
  [-0.55, -0.5, 2.4],
  [0.62, -0.6, 2],
  [-0.64, 0.3, 2.2],
  [0.5, 0.66, 1.8],
];
/** Evidence around the event: u, v, 1 = supported (filled), 0 = limit (ring). */
const EVIDENCE: [number, number, number][] = [
  [-0.3, -0.44, 1],
  [0.66, -0.4, 1],
  [0.7, 0.46, 0],
  [-0.42, 0.5, 1],
  [0.08, 0.74, 0],
];
const EVIDENCE_LINKS: [number, number][] = [
  [0, 3],
  [1, 2],
];
/** Open questions: u, v, ring radius in plane units. */
const QUESTIONS: [number, number, number][] = [
  [-0.5, -0.34, 0.13],
  [0.66, -0.36, 0.1],
  [-0.36, 0.62, 0.12],
  [0.64, 0.66, 0.09],
];

const LABELS_WIDE = ['Public record · 2025 to 2026', '01 · What happened', '02 · What the evidence shows', '03 · What remains uncertain'];
const LABELS_NARROW = ['Public record', 'What happened', 'The evidence', 'Open questions'];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const mixInto = (out: RGB, a: readonly number[], b: readonly number[], t: number) => {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
};

interface Label {
  chip: HTMLDivElement;
  text: HTMLSpanElement;
  leader: HTMLDivElement;
  w: number;
}

const sequence: SceneFactory = ({ gl, slot, redraw }) => {
  const shapes = new Shapes(gl, 700, 160, 4);

  const css = getComputedStyle(slot);
  const token = (name: string, fallback: string) => rgb(css.getPropertyValue(name).trim() || fallback);
  const ink = token('--ink', '#1a1614');
  const cream = token('--cream', '#f4f4e7');
  const orange = token('--accent-orange', '#ff7733');
  const amber = token('--accent-amber', '#e5a700');
  const olive = token('--accent-olive', '#a89a1a');
  const layerColor = [ink, orange, olive, amber];

  // reading progress, reported by the page on the section
  const host = slot.closest<HTMLElement>('[data-seq]');
  let target = Number(host?.dataset.seqProgress) || 0;
  let active = Number(host?.dataset.seqActive) || 0;
  let shown = target;

  // one chip and dashed leader per layer
  const labels: Label[] = layerColor.map((color) => {
    const chip = document.createElement('div');
    chip.className = 'visual-label';
    const dot = document.createElement('span');
    dot.className = 'visual-label-dot';
    dot.style.background = `rgb(${color.map((v) => Math.round(v * 255)).join(' ')})`;
    const text = document.createElement('span');
    chip.append(dot, text);
    const leader = document.createElement('div');
    leader.className = 'visual-leader';
    slot.append(leader, chip);
    return { chip, text, leader, w: 0 };
  });

  // card, chip and layer switch together: all three follow the page's active step
  const markActive = () => {
    labels.forEach(({ chip, leader }, k) => {
      const on = k === active + 1;
      chip.toggleAttribute('data-active', on);
      leader.style.borderTopColor = on ? '' : 'var(--ink-34)';
    });
    slot.dataset.activeLayer = String(active);
  };
  markActive();

  const onProgress = (e: Event) => {
    const detail = (e as CustomEvent<{ progress: number; active: number }>).detail;
    target = detail.progress;
    if (detail.active !== active) {
      active = detail.active;
      markActive();
    }
    redraw();
  };
  host?.addEventListener('seq:progress', onProgress);

  let H = 1;
  let dpr = 1;
  let R = 100;
  let cx = 0;
  let cy = 0;
  let size = 1;
  let gap = 24;
  /** Scale about (pivotX, pivotY) this frame: below 1 while the stack passes the section controls. */
  let scale = 1;
  let pivotX = 0;
  let pivotY = 0;
  /** Entry scale by slot top: entryScale[i] applies at slot top entryFrom + i * ENTRY_STEP. */
  let entryScale: Float32Array | null = null;
  let entryFrom = 0;
  let chipH = 20;
  let compact: boolean | null = null;

  let tiltX = 0;
  let tiltY = 0;
  let aimX = 0;
  let aimY = 0;
  let lastTime = -1;

  // per-frame state
  const level = [0, 0, 0, 0];
  const lit = [0, 0, 0, 0];
  const ahead = [0, 0, 0, 0];
  const anchorX = [0, 0, 0, 0];
  const anchorY = [0, 0, 0, 0];
  const lineCol: RGB = [0, 0, 0];
  const fillCol: RGB = [0, 0, 0];

  // projection output
  let px = 0;
  let py = 0;
  let ps = 1;
  let cyaw = 1;
  let syaw = 0;
  let cp = 1;
  let sp = 0;
  let ox = 0;
  let oy = 0;
  let Rp = 1;

  const proj = (x: number, y: number, z: number) => {
    const x1 = x * cyaw + z * syaw;
    const z1 = -x * syaw + z * cyaw;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    ps = CAMERA / (CAMERA - z2);
    px = ox + x1 * Rp * ps;
    py = oy - y2 * Rp * ps;
  };

  /** Straight segment in world space. */
  const seg = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, width: number, color: readonly number[], a0: number, a1 = a0) => {
    proj(x0, y0, z0);
    const ax = px;
    const ay = py;
    proj(x1, y1, z1);
    shapes.line(ax, ay, px, py, width, color, a0, a1);
  };

  /** Dashed segment in world space: `n` dashes, each `duty` of its period. */
  const dashed = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, n: number, duty: number, width: number, color: readonly number[], alpha: number) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    for (let j = 0; j < n; j++) {
      const t0 = j / n;
      const t1 = t0 + duty / n;
      seg(x0 + dx * t0, y0 + dy * t0, z0 + dz * t0, x0 + dx * t1, y0 + dy * t1, z0 + dz * t1, width, color, alpha);
    }
  };

  /** Circle lying in a plane at height y, solid or dashed. */
  const ring = (u: number, y: number, v: number, r: number, segs: number, dash: boolean, width: number, color: readonly number[], alpha: number) => {
    for (let j = 0; j < segs; j += dash ? 2 : 1) {
      const a0 = (j / segs) * Math.PI * 2;
      const a1 = ((j + 1) / segs) * Math.PI * 2;
      seg(u + Math.cos(a0) * r, y, v + Math.sin(a0) * r, u + Math.cos(a1) * r, y, v + Math.sin(a1) * r, width, color, alpha);
    }
  };

  const dot = (u: number, y: number, v: number, radius: number, color: readonly number[], alpha: number, ringWidth = 0) => {
    proj(u, y, v);
    shapes.circle(px, py, radius * size * scale * ps * dpr, color, alpha, ringWidth * dpr);
  };

  const CORNERS: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  /** Crosshair tick directions in the plane. */
  const TICKS: [number, number][] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const cornerX = [0, 0, 0, 0];
  const cornerY = [0, 0, 0, 0];

  /** One plane: translucent fill, dashed edges with solid corner ticks, then its content. */
  const plane = (k: number, time: number, still: boolean) => {
    const y = level[k];
    const w = lit[k];
    const a = ahead[k];
    const lw = dpr;

    let left = 0;
    CORNERS.forEach(([u, v], c) => {
      proj(u, y, v);
      cornerX[c] = px;
      cornerY[c] = py;
      if (px < cornerX[left]) left = c;
    });
    anchorX[k] = cornerX[left] / dpr;
    anchorY[k] = cornerY[left] / dpr;

    if (k === 0) {
      shapes.fill(cornerX[0], cornerY[0], cornerX[1], cornerY[1], cornerX[2], cornerY[2], cornerX[3], cornerY[3], cream, 0.3);
    } else {
      mixInto(fillCol, cream, ink, w);
      const alpha = (0.34 + 0.6 * w) * (1 - 0.85 * a);
      shapes.fill(cornerX[0], cornerY[0], cornerX[1], cornerY[1], cornerX[2], cornerY[2], cornerX[3], cornerY[3], fillCol, alpha);
    }

    mixInto(lineCol, ink, cream, w);
    const edge = k === 0 ? 0.3 : (0.34 + 0.2 * w) * (1 - 0.4 * a);
    const tick = Math.min(1, edge * 2.2);
    for (let c = 0; c < 4; c++) {
      const [u0, v0] = CORNERS[c];
      const [u1, v1] = CORNERS[(c + 1) % 4];
      const du = u1 - u0;
      const dv = v1 - v0;
      // dashes along the middle, ticks at both corners
      dashed(u0 + du * 0.09, y, v0 + dv * 0.09, u0 + du * 0.91, y, v0 + dv * 0.91, 12, 0.55, lw, lineCol, edge);
      seg(u0, y, v0, u0 + du * 0.07, y, v0 + dv * 0.07, lw, lineCol, tick);
      seg(u1 - du * 0.07, y, v1 - dv * 0.07, u1, y, v1, lw, lineCol, tick);
    }

    const vis = 1 - 0.6 * a;
    const [su, sv] = SPINE;

    if (k === 0) {
      const step = 1.6 / (GRID - 1);
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) dot(-0.8 + i * step, y, -0.8 + j * step, 1.25, ink, 0.3);
      }
      const reported = 0.35 + 0.5 * lit[1];
      for (const [u, v] of SOURCES) {
        dot(u, y, v, 2.2, ink, 0.8);
        dot(u, y, v, 5, orange, reported, 1.1);
      }
      dot(su, y, sv, 2.6, ink, 0.9);
    } else if (k === 1) {
      for (const [u, v, r] of EVENTS) dot(u, y, v, r, lineCol, 0.7 * vis);
      dot(su, y, sv, 5.5, orange, vis);
      if (w > 0.01) {
        const p = still ? 0.35 : (time % 1.8) / 1.8;
        dot(su, y, sv, 5.5 + 3 + 12 * (1 - (1 - p) * (1 - p)), orange, 0.6 * (1 - p) * w, 1.3);
      }
    } else if (k === 2) {
      for (const [u, v] of EVIDENCE) seg(su, y, sv, u, y, v, lw, lineCol, 0.5 * vis);
      for (const [i, j] of EVIDENCE_LINKS) seg(EVIDENCE[i][0], y, EVIDENCE[i][1], EVIDENCE[j][0], y, EVIDENCE[j][1], lw, lineCol, 0.22 * vis);
      for (const [u, v, filled] of EVIDENCE) {
        if (filled) dot(u, y, v, 3.3, olive, vis);
        else dot(u, y, v, 3.6, olive, vis, 1.4);
      }
      dot(su, y, sv, 4.6, olive, vis);
    } else {
      for (const [u, v, r] of QUESTIONS) {
        dashed(su, y, sv, u, y, v, 9, 0.5, lw, amber, 0.5 * vis);
        ring(u, y, v, r, 18, true, 1.3 * lw, amber, 0.95 * vis);
        dot(u, y, v, 1.6, amber, vis);
      }
      // the crosshair: the site's mark, lying on the open questions
      ring(su, y, sv, 0.12, 28, false, 1.3 * lw, lineCol, 0.9 * vis);
      for (const [du, dv] of TICKS) {
        seg(su + du * 0.06, y, sv + dv * 0.06, su + du * 0.2, y, sv + dv * 0.2, 1.3 * lw, lineCol, 0.9 * vis);
      }
      dot(su, y, sv, 2.6, amber, vis);
    }
  };

  /** Links between layer k-1 and layer k: the spine and, for the event, its sources. */
  const between = (k: number, still: boolean) => {
    const [su, sv] = SPINE;
    const y0 = level[k - 1];
    const y1 = level[k];
    const lw = dpr;
    if (k === 1) {
      for (const [u, v] of SOURCES) dashed(su, y1, sv, u, y0, v, 10, 0.5, lw, ink, 0.34);
      seg(su, y0, sv, su, y1, sv, 1.4 * lw, orange, 0.85);
      return;
    }
    const f = clamp01(shown - (k - 2));
    const ym = y0 + (y1 - y0) * f;
    if (f < 1) dashed(su, ym, sv, su, y1, sv, 8, 0.45, lw, ink, 0.3);
    if (f > 0) seg(su, y0, sv, su, ym, sv, 1.4 * lw, orange, 0.85);
    if (f > 0.02 && f < 0.98) {
      dot(su, ym, sv, 3, orange, 1);
      if (!still) dot(su, ym, sv, 7, orange, 0.35, 1.1);
    }
  };

  /*
   * The floating section controls sit over the bottom right of the viewport.
   * Pinned, the stack stays clear of them; while the section scrolls in, every
   * row of the slot passes behind them, and the stack's right-hand corners
   * would too. So during entry the stack is drawn smaller, just enough to pass
   * clear, and grows to full size as it settles into place. The scale is
   * planned per slot position at resize, from the plane outlines at every
   * fitted pose (`quads`, per unit R).
   */
  const quads: number[][] = [];
  let entryKey = '';

  /** Does the convex quad [x0, y0, ..., x3, y3] overlap the box? */
  const quadHitsBox = (q: number[], bx0: number, by0: number, bx1: number, by1: number) => {
    if (Math.max(q[0], q[2], q[4], q[6]) < bx0 || Math.min(q[0], q[2], q[4], q[6]) > bx1) return false;
    if (Math.max(q[1], q[3], q[5], q[7]) < by0 || Math.min(q[1], q[3], q[5], q[7]) > by1) return false;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const nx = q[2 * i + 1] - q[2 * j + 1];
      const ny = q[2 * j] - q[2 * i];
      let qmin = Infinity;
      let qmax = -Infinity;
      for (let c = 0; c < 4; c++) {
        const d = nx * q[2 * c] + ny * q[2 * c + 1];
        qmin = Math.min(qmin, d);
        qmax = Math.max(qmax, d);
      }
      const b0 = nx * bx0 + ny * by0;
      const b1 = nx * bx1 + ny * by0;
      const b2 = nx * bx1 + ny * by1;
      const b3 = nx * bx0 + ny * by1;
      if (Math.max(b0, b1, b2, b3) < qmin || Math.min(b0, b1, b2, b3) > qmax) return false;
    }
    return true;
  };

  const scaled: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  /** Does the stack, at scale s about the pivot, overlap the box (slot px)? */
  const stackHits = (s: number, bx0: number, by0: number, bx1: number, by1: number) => {
    for (const q of quads) {
      for (let c = 0; c < 4; c++) {
        scaled[2 * c] = pivotX + (cx + q[2 * c] * R - pivotX) * s;
        scaled[2 * c + 1] = pivotY + (cy + q[2 * c + 1] * R - pivotY) * s;
      }
      if (quadHitsBox(scaled, bx0, by0, bx1, by1)) return true;
    }
    return false;
  };

  const planEntry = () => {
    entryKey = `${innerWidth}x${innerHeight}`;
    entryScale = null;
    const controls = document.querySelector<HTMLElement>('[data-jump]')?.getBoundingClientRect();
    if (!controls || controls.width === 0 || !quads.length) return;
    const box = slot.getBoundingClientRect();
    const bx0 = controls.left - box.left - CONTROLS_CLEAR;
    const bx1 = controls.right - box.left + CONTROLS_CLEAR;
    const vy0 = controls.top - CONTROLS_CLEAR;
    const vy1 = controls.bottom + CONTROLS_CLEAR;
    // slot tops from scrolled past (-H) to just below the fold
    entryFrom = -H;
    const n = Math.ceil((innerHeight + H) / ENTRY_STEP) + 1;
    const table = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const top = entryFrom + i * ENTRY_STEP;
      const by0 = vy0 - top;
      const by1 = vy1 - top;
      let s = 1;
      if (stackHits(1, bx0, by0, bx1, by1)) {
        let lo = 0.3;
        let hi = 1;
        for (let k = 0; k < 12; k++) {
          const mid = (lo + hi) / 2;
          if (stackHits(mid, bx0, by0, bx1, by1)) hi = mid;
          else lo = mid;
        }
        s = lo;
      }
      // once smaller, stay smaller until clear for good: no shrinking back mid-entry
      table[i] = i ? Math.min(s, table[i - 1]) : s;
    }
    // then limit how fast it grows with scroll, in both directions
    const dmax = ENTRY_SLOPE * ENTRY_STEP;
    for (let i = 1; i < n; i++) table[i] = Math.min(table[i], table[i - 1] + dmax);
    for (let i = n - 2; i >= 0; i--) table[i] = Math.min(table[i], table[i + 1] + dmax);
    if (table.some((v) => v < 1)) entryScale = table;
  };

  const entryScaleNow = () => {
    if (entryKey !== `${innerWidth}x${innerHeight}`) planEntry();
    if (!entryScale) return 1;
    const f = (slot.getBoundingClientRect().top - entryFrom) / ENTRY_STEP;
    const last = entryScale.length - 1;
    if (f <= 0) return entryScale[0];
    if (f >= last) return entryScale[last];
    const i = Math.floor(f);
    return entryScale[i] + (entryScale[i + 1] - entryScale[i]) * (f - i);
  };

  const placeLabels = () => {
    labels.forEach(({ chip, leader, w }, k) => {
      const ax = anchorX[k] - 4;
      const ay = anchorY[k];
      const x = Math.max(6, anchorX[k] - gap - w);
      const y = Math.min(Math.max(ay - chipH / 2, 4), H - chipH - 4);
      const opacity = k === 0 ? 0.85 : k === active + 1 ? 1 : 0.9 - 0.45 * ahead[k];
      chip.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      chip.style.opacity = opacity.toFixed(3);
      const tx = x + w;
      const ty = y + chipH / 2;
      const dx = ax - tx;
      const dy = ay - ty;
      const len = Math.hypot(dx, dy);
      leader.style.width = `${Math.max(0, len).toFixed(1)}px`;
      leader.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${Math.atan2(dy, dx).toFixed(4)}rad)`;
      leader.style.opacity = (opacity * 0.9).toFixed(3);
    });
  };

  return {
    resize(w, h, ratio) {
      H = h;
      dpr = ratio;
      const isNarrow = w < 600;
      const isCompact = w < COMPACT_LABELS;
      if (isCompact !== compact) {
        compact = isCompact;
        const texts = isCompact ? LABELS_NARROW : LABELS_WIDE;
        labels.forEach((label, k) => (label.text.textContent = texts[k]));
      }
      let labelW = 0;
      for (const label of labels) {
        label.w = label.chip.offsetWidth;
        labelW = Math.max(labelW, label.w);
      }
      chipH = labels[0].chip.offsetHeight || chipH;
      const padL = isNarrow ? 12 : 6;
      // keeps the stack at least 20px clear of the slot's right edge at every pose
      const padR = 24;
      const padY = isNarrow ? 12 : 24;
      gap = isNarrow ? 14 : 20;
      // Projected extent of the stack per unit R over the poses it takes: every
      // plane corner at its lowest and highest level, at the FIT_ angles.
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      Rp = 1;
      ox = 0;
      oy = 0;
      quads.length = 0;
      for (const yaw of FIT_YAWS) {
        for (const pitch of FIT_PITCHES) {
          cyaw = Math.cos(yaw);
          syaw = Math.sin(yaw);
          cp = Math.cos(pitch);
          sp = Math.sin(pitch);
          for (let k = 0; k < 4; k++) {
            const lo = k * SPACING - 0.012 - CENTER;
            const hi = k * SPACING + (k ? FLOAT + 0.06 : 0) + 0.012 - CENTER;
            for (const y of [lo, hi]) {
              const quad: number[] = [];
              for (const [u, v] of CORNERS) {
                proj(u, y, v);
                quad.push(px, py);
                x0 = Math.min(x0, px);
                x1 = Math.max(x1, px);
                y0 = Math.min(y0, py);
                y1 = Math.max(y1, py);
              }
              quads.push(quad);
            }
          }
        }
      }
      const spanX = x1 - x0;
      const spanY = y1 - y0;
      const room = w - labelW - gap - padL - padR;
      R = Math.max(40, Math.min(room / spanX, (h - padY * 2) / spanY, 250));
      const ensemble = labelW + gap + spanX * R;
      const left = padL + Math.max(0, (w - padL - padR - ensemble) / 2);
      cx = left + labelW + gap - x0 * R;
      cy = h * 0.5 - ((y0 + y1) / 2) * R;
      // the entry scale shrinks toward the stack's left edge, where the chips hang
      pivotX = cx + x0 * R;
      pivotY = cy;
      planEntry();
      // Entry would shrink the stack below ENTRY_MIN: draw it smaller pinned
      // instead, about the same pivot. Scaling R by f there is the same as an
      // entry scale of f, so the new plan bottoms out at ENTRY_MIN.
      const least = entryScale ? Math.min(...entryScale) : 1;
      if (least < ENTRY_MIN) {
        const f = least / ENTRY_MIN;
        R *= f;
        cx = pivotX + (cx - pivotX) * f;
        planEntry();
      }
      size = Math.min(1.15, Math.max(0.62, R / 210));
    },

    pointer(x, y) {
      aimX = Math.max(AIM_X_MIN, Math.min(AIM_MAX, x));
      aimY = Math.max(-AIM_MAX, Math.min(AIM_MAX, y));
    },

    render(time, still) {
      const dt = lastTime < 0 || still ? 0 : Math.max(0, time - lastTime);
      lastTime = time;
      if (still) shown = target;
      else shown += (target - shown) * (1 - Math.exp(-dt * 6));
      if (Math.abs(target - shown) < 1e-4) shown = target;
      // the easing never lets the planes contradict the active card: its layer is always the brighter one
      shown = Math.min(Math.max(shown, active - 0.45), active + 0.45);
      const ease = 1 - Math.exp(-dt * 2.5);
      tiltX += (aimX - tiltX) * ease;
      tiltY += (aimY - tiltY) * ease;

      const yaw = YAW + (still ? 0 : Math.sin(time * 0.11) * 0.05) + tiltX * 0.1;
      const pitch = PITCH + (still ? 0 : Math.sin(time * 0.17) * 0.015) + tiltY * 0.05;
      cyaw = Math.cos(yaw);
      syaw = Math.sin(yaw);
      cp = Math.cos(pitch);
      sp = Math.sin(pitch);
      scale = entryScaleNow();
      Rp = R * scale * dpr;
      ox = (pivotX + (cx - pivotX) * scale) * dpr;
      oy = (pivotY + (cy - pivotY) * scale) * dpr;

      for (let k = 0; k < 4; k++) {
        const i = k - 1;
        // fully lit within 0.35 of its step, dark again beyond 0.65: the hand-over is short but continuous
        lit[k] = k === 0 ? 0 : smooth((0.65 - Math.abs(shown - i)) / 0.3);
        ahead[k] = k === 0 ? 0 : smooth(i - shown);
        const idle = still ? 0 : 0.012 * Math.sin(time * 0.6 + k * 1.7);
        level[k] = k * SPACING + FLOAT * ahead[k] + 0.06 * lit[k] + idle - CENTER;
      }

      shapes.begin(gl.drawingBufferWidth, gl.drawingBufferHeight);
      for (let k = 0; k < 4; k++) {
        if (k > 0) {
          between(k, still);
          shapes.flush();
        }
        plane(k, time, still);
        shapes.flush();
      }
      placeLabels();
    },

    dispose(contextLost) {
      host?.removeEventListener('seq:progress', onProgress);
      for (const { chip, leader } of labels) {
        chip.remove();
        leader.remove();
      }
      delete slot.dataset.activeLayer;
      if (!contextLost) shapes.dispose();
    },
  };
};

export default sequence;

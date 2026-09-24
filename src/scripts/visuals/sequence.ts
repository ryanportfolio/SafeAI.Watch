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
 * read lifts and turns ink with its card (the ink follows the active step in
 * time, not scroll distance, so plane and card switch together) and its links
 * grow out from the event; layers already read settle into the stack; layers
 * not reached yet float above as bare outlines. The spine fills in orange as
 * the reader climbs.
 *
 * Planes are drawn back to front on the CPU (a few hundred segments) through
 * the Shapes batcher; labels are DOM chips placed each frame, plus small
 * in-scene notes that name what the lit layer's marks mean.
 */
import type { Scene, SceneFactory } from './runtime';
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

/** Ink of the layer being read eases in at this rate (1/s): about 170 ms to 95%, with its card. */
const INK_RATE = 18;
/** Gap between a note and its glyph, in CSS px. */
const NOTE_GAP = 8;
/** Stacked fills that make the soft edge of the ink plane's shadow. */
const SHADOW_STEPS = 12;

/**
 * In-scene notes: text, the layer whose ink shows it, the plane its glyphs lie
 * on, candidate glyphs (u, v, radius in px, radius in plane units) and whether
 * it is the second of its layer (dropped below COMPACT_LABELS).
 */
type Glyph = readonly [number, number, number, number];
const NOTE_DEFS: [string, number, number, Glyph[], boolean][] = [
  ['Event', 1, 1, [[SPINE[0], SPINE[1], 9, 0]], false],
  ['Source', 1, 0, SOURCES.map(([u, v]) => [u, v, 5, 0] as const), true],
  ['Supported', 2, 2, EVIDENCE.filter((e) => e[2]).map(([u, v]) => [u, v, 3.3, 0] as const), false],
  ['Limit', 2, 2, EVIDENCE.filter((e) => !e[2]).map(([u, v]) => [u, v, 3.6, 0] as const), true],
  ['Open question', 3, 3, QUESTIONS.map(([u, v, r]) => [u, v, 1.3, r] as const), false],
];

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

interface Note {
  el: HTMLDivElement;
  layer: number;
  plane: number;
  glyphs: Glyph[];
  minor: boolean;
  w: number;
  h: number;
  /** Candidate in use (glyph * 4 + side), kept while it still fits so the note does not hop. */
  pick: number;
  /** Placed box in slot px, or x0 = NaN when hidden. */
  box: [number, number, number, number];
  /** On the paper above the stack with a leader to its glyph (no room on its plane). */
  out: boolean;
  /** Leader end at the glyph when `out` (it starts under the note), slot px. */
  gx: number;
  gy: number;
  /** Opacity this frame. */
  on: number;
}

/** Is (x, y) at least m px inside the convex quad [x0, y0, ..., x3, y3]? */
const insideQuad = (q: number[], x: number, y: number, m: number) => {
  const area = (q[2] - q[0]) * (q[5] - q[1]) - (q[3] - q[1]) * (q[4] - q[0]);
  const s = area < 0 ? -1 : 1;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const ex = q[2 * j] - q[2 * i];
    const ey = q[2 * j + 1] - q[2 * i + 1];
    const d = (s * (ex * (y - q[2 * i + 1]) - ey * (x - q[2 * i]))) / (Math.hypot(ex, ey) || 1);
    if (d < m) return false;
  }
  return true;
};

const sequence: SceneFactory = ({ gl, slot, redraw }) => {
  const shapes = new Shapes(gl, 700, 320, 1 + SHADOW_STEPS);

  const css = getComputedStyle(slot);
  const token = (name: string, fallback: string) => rgb(css.getPropertyValue(name).trim() || fallback);
  const ink = token('--ink', '#1a1614');
  const cream = token('--cream', '#f4f4e7');
  const orange = token('--accent-orange', '#ff7733');
  const amber = token('--accent-amber', '#e5a700');
  const olive = token('--accent-olive', '#a89a1a');
  const layerColor = [ink, orange, olive, amber];
  const cssColor = (c: readonly number[]) => `rgb(${c.map((v) => Math.round(v * 255)).join(' ')})`;

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
    dot.style.background = cssColor(color);
    const text = document.createElement('span');
    chip.append(dot, text);
    const leader = document.createElement('div');
    leader.className = 'visual-leader';
    slot.append(leader, chip);
    return { chip, text, leader, w: 0 };
  });

  // the notes: chip typography without the box, placed each frame beside a glyph
  const notes: Note[] = NOTE_DEFS.map(([text, layer, plane, glyphs, minor]) => {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.textContent = text;
    // the chip's own class for its type and placement, minus the box
    el.className = 'visual-label';
    el.style.cssText = 'background:none;box-shadow:none;padding:0';
    slot.append(el);
    return { el, layer, plane, glyphs, minor, w: 0, h: 0, pick: 0, box: [NaN, 0, 0, 0], out: true, gx: 0, gy: 0, on: 0 };
  });

  // card, chip and layer switch together: all three follow the page's active step
  const markActive = () => {
    labels.forEach(({ chip, leader }, k) => {
      const on = k === active + 1;
      chip.toggleAttribute('data-active', on);
      // the active leader takes its layer's colour; idle ones fall back to a quiet ink
      if (on) leader.style.setProperty('--leader', cssColor(layerColor[k]));
      else leader.style.removeProperty('--leader');
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

  let W = 1;
  let H = 1;
  let dpr = 1;
  let R = 100;
  let cx = 0;
  let cy = 0;
  let size = 1;
  let gap = 24;
  /** How closely the layers stack (1 = full spacing), set by the fit. */
  let squash = 1;
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
  /** Ink of each plane (0 cream, 1 ink), eased in time toward the active step. */
  const inked = [0, 1, 2, 3].map((k) => (k === active + 1 ? 1 : 0));
  /** Plane outlines this frame, in slot px. */
  const planeQuad = [0, 1, 2, 3].map(() => [0, 0, 0, 0, 0, 0, 0, 0]);
  /** Glyphs notes must not cover this frame: x, y, radius (slot px), plane. */
  const obstacles: number[] = [];
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
    proj(x0, y0, z0);
    const ax = px;
    const ay = py;
    proj(x1, y1, z1);
    // dashed in the shader: n periods along the projected length
    const p = Math.hypot(px - ax, py - ay) / n;
    shapes.line(ax, ay, px, py, width, color, alpha, alpha, p * duty, p * (1 - duty));
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

  /** Is the point (slot px) within `pad` of a note placed on plane k (any plane for -1)? Marks there are left out. */
  const underNote = (k: number, x: number, y: number, pad = 3) => {
    for (const n of notes) {
      const [x0, y0, x1, y1] = n.box;
      if ((k < 0 || n.plane === k) && x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad) return true;
    }
    return false;
  };

  /** A preview glyph of a layer not reached yet gives way to a note over it. */
  const veiled = (k: number, u: number, v: number, pad: number) => {
    if (k <= active + 1) return false;
    proj(u, level[k], v);
    return underNote(-1, px / dpr, py / dpr, pad);
  };

  /**
   * Soft shadow of the ink plane k + 1 on plane k: stacked squares shifted
   * toward the viewer and clipped to the plane, so its edge fades over a few
   * layers where it shows past the lifted plane.
   */
  const shadow = (k: number, strength: number) => {
    // edge softness: about 14 px across, in plane units; the squares lean toward the camera
    const soft = 14 / Math.max(40, R * scale);
    for (let j = 0; j < SHADOW_STEPS; j++) {
      const half = 0.86 + (j / (SHADOW_STEPS - 1) - 0.5) * soft;
      quad(level[k], -syaw * 0.08, cyaw * 0.08, half);
      fillQuad(ink, (0.12 / SHADOW_STEPS) * strength);
    }
  };

  /** Project the square of half-size `half` about (cu, cv) at height y into cornerX / cornerY. */
  const quad = (y: number, cu: number, cv: number, half: number) =>
    CORNERS.forEach(([u, v], c) => {
      proj(cu + u * half, y, cv + v * half);
      cornerX[c] = px;
      cornerY[c] = py;
    });
  const fillQuad = (color: readonly number[], alpha: number) =>
    shapes.fill(cornerX[0], cornerY[0], cornerX[1], cornerY[1], cornerX[2], cornerY[2], cornerX[3], cornerY[3], color, alpha);

  /** One plane: fill, dashed edges with solid corner ticks, then its content. */
  const plane = (k: number, time: number, still: boolean) => {
    const y = level[k];
    const w = inked[k];
    const a = ahead[k];
    const lw = dpr;

    quad(y, 0, 0, 1);
    let left = 0;
    for (let c = 1; c < 4; c++) if (cornerX[c] < cornerX[left]) left = c;
    anchorX[k] = cornerX[left] / dpr;
    anchorY[k] = cornerY[left] / dpr;

    // record: light cream; read: light cream; being read: ink; not reached: no fill at all
    const readAlpha = k === 0 ? 0.3 : 0.3 * (1 - smooth(a * 2));
    mixInto(fillCol, cream, ink, w);
    // opacity leads the colour, so a plane changing ink never shows the one beneath through it
    const alpha = readAlpha + (0.97 - readAlpha) * smooth(w * 4);
    if (alpha > 0.002) fillQuad(fillCol, alpha);
    if (k < 3 && inked[k + 1] > 0.01) shadow(k, inked[k + 1]);

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
    // a layer not reached shows a faint preview of its glyphs; its links grow out from the event as the reader arrives
    const g = 1 - a;
    const on = vis * (1 - 0.65 * a);
    const [su, sv] = SPINE;

    if (k === 0) {
      const step = 1.6 / (GRID - 1);
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          const u = -0.8 + i * step;
          const v = -0.8 + j * step;
          proj(u, y, v);
          if (!underNote(0, px / dpr, py / dpr)) dot(u, y, v, 1.25, ink, 0.3);
        }
      }
      const reported = 0.35 + 0.5 * inked[1];
      for (const [u, v] of SOURCES) {
        dot(u, y, v, 2.2, ink, 0.8);
        dot(u, y, v, 5, orange, reported, 1.1);
      }
      dot(su, y, sv, 2.6, ink, 0.9);
    } else if (k === 1) {
      for (const [u, v, r] of EVENTS) dot(u, y, v, r, lineCol, 0.7 * on);
      dot(su, y, sv, 5.5, orange, vis);
      if (w > 0.01) {
        const p = still ? 0.35 : (time % 1.8) / 1.8;
        dot(su, y, sv, 5.5 + 3 + 12 * (1 - (1 - p) * (1 - p)), orange, 0.6 * (1 - p) * w, 1.3);
      }
    } else if (k === 2) {
      for (const [u, v] of EVIDENCE) if (g > 0.001) seg(su, y, sv, su + (u - su) * g, y, sv + (v - sv) * g, lw, lineCol, 0.5 * vis);
      for (const [i, j] of EVIDENCE_LINKS) seg(EVIDENCE[i][0], y, EVIDENCE[i][1], EVIDENCE[j][0], y, EVIDENCE[j][1], lw, lineCol, 0.22 * on);
      for (const [u, v, filled] of EVIDENCE) {
        const o = veiled(2, u, v, 6) ? 0 : on;
        if (filled) dot(u, y, v, 3.3, olive, o);
        else dot(u, y, v, 3.6, olive, o, 1.4);
      }
      dot(su, y, sv, 4.6, olive, vis);
    } else {
      for (const [u, v, r] of QUESTIONS) {
        const o = veiled(3, u, v, r * R * scale + 4) ? 0 : on;
        if (g > 0.001) dashed(su, y, sv, su + (u - su) * g, y, sv + (v - sv) * g, Math.max(1, Math.round(9 * g)), 0.5, lw, amber, 0.5 * vis);
        ring(u, y, v, r, 18, true, 1.3 * lw, amber, 0.95 * o);
        dot(u, y, v, 1.6, amber, o);
      }
      // the crosshair: the site's mark, lying on the open questions
      ring(su, y, sv, 0.12, 28, false, 1.3 * lw, lineCol, 0.9 * vis);
      for (const [du, dv] of TICKS) {
        seg(su + du * 0.06, y, sv + dv * 0.06, su + du * 0.2, y, sv + dv * 0.2, 1.3 * lw, lineCol, 0.9 * vis);
      }
      dot(su, y, sv, 2.6, amber, vis);
    }
  };

  /** The orange spine between two heights, with a faint 6 px halo. */
  const spine = (y0: number, y1: number) => {
    const [su, sv] = SPINE;
    seg(su, y0, sv, su, y1, sv, 6 * dpr, orange, 0.12);
    seg(su, y0, sv, su, y1, sv, 1.4 * dpr, orange, 0.85);
  };

  /** Links between layer k-1 and layer k: the spine and, for the event, its sources. */
  const between = (k: number) => {
    const [su, sv] = SPINE;
    const y0 = level[k - 1];
    const y1 = level[k];
    const lw = dpr;
    if (k === 1) {
      for (const [u, v] of SOURCES) dashed(su, y1, sv, u, y0, v, 10, 0.5, lw, ink, 0.34);
      spine(y0, y1);
      return;
    }
    const f = clamp01(shown - (k - 2));
    const ym = y0 + (y1 - y0) * f;
    if (f < 1) dashed(su, ym, sv, su, y1, sv, 8, 0.45, lw, ink, 0.3);
    if (f > 0) spine(y0, ym);
    if (f > 0.02 && f < 0.98) dot(su, ym, sv, 3, orange, 1);
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

  const move = (el: HTMLElement, x: number, y: number, more = '') => (el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)${more}`);

  const placeLabels = () => {
    labels.forEach(({ chip, leader, w }, k) => {
      const ax = anchorX[k] - 4;
      const ay = anchorY[k];
      const x = Math.max(6, anchorX[k] - gap - w);
      const y = Math.min(Math.max(ay - chipH / 2, 4), H - chipH - 4);
      const opacity = k === 0 ? 0.85 : k === active + 1 ? 1 : 0.9 - 0.45 * ahead[k];
      move(chip, x, y);
      chip.style.opacity = opacity.toFixed(3);
      const tx = x + w;
      const ty = y + chipH / 2;
      const dx = ax - tx;
      const dy = ay - ty;
      const len = Math.hypot(dx, dy);
      leader.style.width = `${len.toFixed(1)}px`;
      move(leader, tx, ty, ` rotate(${Math.atan2(dy, dx).toFixed(4)}rad)`);
      leader.style.opacity = (opacity * 0.9).toFixed(3);
    });
  };

  /** Links drawn this frame (slot px): x0, y0, x1, y1, plane; -k marks the spine from plane k - 1 up to plane k. */
  const links: number[] = [];

  /** Project the plane outlines and every glyph and link a note must keep clear of (slot px). */
  const measureFrame = () => {
    obstacles.length = 0;
    links.length = 0;
    const [su, sv] = SPINE;
    const k0 = size * scale;
    const k1 = R * scale;
    const at = (k: number, u: number, v: number) => {
      proj(u, level[k], v);
      return [px / dpr, py / dpr];
    };
    // plane + 0.5 marks the spine's own marks, which leaders keep clear of on every plane
    const add = (k: number, u: number, v: number, rPx: number, rUnits: number, spine = 0) => {
      proj(u, level[k], v);
      obstacles.push(px / dpr, py / dpr, (rPx * k0 + rUnits * k1) * ps + 3, k + spine);
    };
    // links of a layer not reached are not drawn yet
    const link = (k: number, a: number[], b: number[]) => (k < 2 || ahead[k] < 0.95) && links.push(a[0], a[1], b[0], b[1], k);
    for (let k = 0; k < 4; k++) {
      const q = planeQuad[k];
      CORNERS.forEach(([u, v], c) => {
        [q[2 * c], q[2 * c + 1]] = at(k, u, v);
      });
      if (k) link(-k, at(k - 1, su, sv), at(k, su, sv));
    }
    for (const [u, v] of SOURCES) {
      add(0, u, v, 5, 0);
      link(0, at(1, su, sv), at(0, u, v));
    }
    add(0, su, sv, 2.6, 0, 0.5);
    for (const [u, v, r] of EVENTS) add(1, u, v, r, 0);
    add(1, su, sv, 9, 0, 0.5);
    for (const [u, v] of EVIDENCE) {
      add(2, u, v, 3.6, 0);
      link(2, at(2, su, sv), at(2, u, v));
    }
    for (const [i, j] of EVIDENCE_LINKS) link(2, at(2, EVIDENCE[i][0], EVIDENCE[i][1]), at(2, EVIDENCE[j][0], EVIDENCE[j][1]));
    add(2, su, sv, 4.6, 0, 0.5);
    for (const [u, v, r] of QUESTIONS) {
      add(3, u, v, 1.3, r);
      link(3, at(3, su, sv), at(3, u, v));
    }
    add(3, su, sv, 0, 0.2, 0.5);
  };

  const flat = [0, 0, 0, 0, 0, 0, 0, 0];
  /** Does the link at links[i] cross the box? (a segment is a quad folded flat) */
  const linkHits = (i: number, x0: number, y0: number, x1: number, y1: number) => {
    flat[0] = flat[6] = links[i];
    flat[1] = flat[7] = links[i + 1];
    flat[2] = flat[4] = links[i + 2];
    flat[3] = flat[5] = links[i + 3];
    return quadHitsBox(flat, x0, y0, x1, y1);
  };

  /** Is the box clear of other notes placed this frame? */
  const clearOfNotes = (x0: number, y0: number, x1: number, y1: number, placed: number) => {
    for (let j = 0; j < placed; j++) {
      const [bx0, by0, bx1, by1] = notes[j].box;
      if (!Number.isNaN(bx0) && x0 < bx1 + 6 && x1 > bx0 - 6 && y0 < by1 + 4 && y1 > by0 - 4) return false;
    }
    return true;
  };

  /**
   * Does the box come within `pad` of a glyph on the note's plane or above,
   * other than the one at (gx, gy)? Previews of layers not reached give way
   * to the note (see veiled); the spine's marks never do.
   */
  const glyphHit = (n: Note, x0: number, y0: number, x1: number, y1: number, pad: number, gx = NaN, gy = 0) => {
    for (let i = 0; i < obstacles.length; i += 4) {
      const k = obstacles[i + 3];
      const r = obstacles[i + 2];
      if (k < n.plane || (k > n.layer && k % 1 === 0) || Math.hypot(gx - obstacles[i], gy - obstacles[i + 1]) < r) continue;
      if (Math.hypot(Math.max(x0, Math.min(obstacles[i], x1)) - obstacles[i], Math.max(y0, Math.min(obstacles[i + 1], y1)) - obstacles[i + 1]) < r + pad) return true;
    }
    return false;
  };

  /**
   * Would a note box sit clear: on its plane, off the ink plane above it, off
   * glyphs, links and other notes? `loose` keeps a placed note through the
   * idle sway (thinner margins).
   */
  const noteFits = (n: Note, x0: number, y0: number, x1: number, y1: number, placed: number, loose: boolean) => {
    const q = planeQuad[n.plane];
    const m = loose ? 1.5 : 4;
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) if (!insideQuad(q, x, y, m)) return false;
    if (n.plane < n.layer && quadHitsBox(planeQuad[n.layer], x0 - m, y0 - m, x1 + m, y1 + m)) return false;
    if (glyphHit(n, x0, y0, x1, y1, loose ? -1.5 : 0)) return false;
    const g = loose ? 1 : 3;
    for (let i = 0; i < links.length; i += 5) {
      const k = links[i + 4];
      // links on lower planes, and the spine below the lit plane, lie under the note's plane
      if (k >= 0 ? k < n.plane : -k <= n.layer) continue;
      if (linkHits(i, x0 - g, y0 - g, x1 + g, y1 + g)) return false;
    }
    return clearOfNotes(x0, y0, x1, y1, placed);
  };

  /**
   * Is a leader from (ax, ay) to the glyph at (gx, gy) clear of the spine and
   * every other glyph?
   */
  const leaderClear = (n: Note, ax: number, ay: number, gx: number, gy: number) => {
    const steps = Math.ceil(Math.hypot(gx - ax, gy - ay) / 4);
    for (let s = 0; s <= steps; s++) {
      const x = ax + ((gx - ax) * s) / steps;
      const y = ay + ((gy - ay) * s) / steps;
      if (glyphHit(n, x, y, x, y, 4, gx, gy)) return false;
      // the spine itself, except where it meets the glyph (the event sits on it)
      if (Math.hypot(x - gx, y - gy) > 12) for (let i = 0; i < links.length; i += 5) if (links[i + 4] < 0 && linkHits(i, x - 5, y - 5, x + 5, y + 5)) return false;
    }
    return true;
  };

  /** Glyph j of a note: x, y and radius in slot px. */
  const glyphAt = (n: Note, j: number) => {
    const [u, v, rPx, rUnits] = n.glyphs[j];
    proj(u, level[n.plane], v);
    return [px / dpr, py / dpr, (rPx * size + rUnits * R) * scale * ps];
  };

  const setBox = (n: Note, x0: number, y0: number) => {
    n.box[0] = x0;
    n.box[1] = y0;
    n.box[2] = x0 + n.w;
    n.box[3] = y0 + n.h;
  };

  /** Place each note beside one of its glyphs, away from the stack's centre where it fits. */
  const placeNotes = () => {
    measureFrame();
    const [su, sv] = SPINE;
    // the stack's top: notes that find no room on their plane go on the paper above it
    let top = Infinity;
    for (const q of planeQuad) top = Math.min(top, q[1], q[3], q[5], q[7]);
    notes.forEach((n, i) => {
      const kept = !Number.isNaN(n.box[0]);
      n.box[0] = NaN;
      // hand-over: the outgoing layer's notes are gone before the incoming ones appear
      const on = n.layer === active + 1 ? smooth((inked[n.layer] - 0.75) / 0.25) : smooth((inked[n.layer] - 0.6) / 0.4);
      if (on < 0.01 || (n.minor && compact) || !n.w) {
        n.el.style.opacity = '0';
        return;
      }
      proj(su, level[n.plane], sv);
      const mx = px / dpr;
      const count = n.glyphs.length * 4;
      let out = false;
      for (let t = 0; t < count && Number.isNaN(n.box[0]); t++) {
        const c = (n.pick + t) % count;
        const [gx, gy, r] = glyphAt(n, c >> 2);
        // side 0 is away from the centre, 1 toward it, 2 above, 3 below
        const side = c & 3;
        const toRight = gx >= mx === (side === 0);
        const x0 = side > 1 ? gx - n.w / 2 : toRight ? gx + r + NOTE_GAP : gx - r - NOTE_GAP - n.w;
        const y0 = side === 2 ? gy - r * 0.6 - 6 - n.h : side === 3 ? gy + r * 0.6 + 6 : gy - n.h / 2;
        if (!noteFits(n, x0, y0, x0 + n.w, y0 + n.h, i, t === 0 && kept && !n.out)) continue;
        n.pick = c;
        setBox(n, x0, y0);
      }
      // no room on the plane: on the paper above the stack, led down to a glyph along a clear path
      for (let t = 0; t < n.glyphs.length && Number.isNaN(n.box[0]); t++) {
        const [gx, gy, r] = glyphAt(n, t);
        const x0 = Math.min(Math.max(gx - n.w / 2, 4), W - n.w - 4);
        const y0 = top - 10 - n.h;
        const ey = gy - r * 0.6;
        if (y0 < 2 || !clearOfNotes(x0, y0, x0 + n.w, top - 10, i) || !leaderClear(n, x0 + n.w / 2, top - 7, gx, ey)) continue;
        setBox(n, x0, y0);
        n.gx = gx;
        n.gy = ey;
        out = true;
      }
      if (out !== n.out) {
        n.out = out;
        // cream on the ink plane, ink on the record plane; on paper the chip's own ink
        n.el.style.color = out ? '' : n.plane < n.layer ? 'var(--ink-64)' : 'var(--cream-60)';
      }
      if (Number.isNaN(n.box[0])) {
        n.el.style.opacity = '0';
        return;
      }
      move(n.el, n.box[0], n.box[1]);
      n.on = on;
      n.el.style.opacity = on.toFixed(3);
    });
  };

  const scene: Scene = {
    resize(w, h, ratio) {
      W = w;
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
      for (const n of notes) {
        n.w = n.el.offsetWidth;
        n.h = n.el.offsetHeight;
      }
      // keeps the stack clear of the slot's edges at every pose; narrow slots keep less margin
      const padL = isNarrow ? 4 : 6;
      const padR = isNarrow ? 4 : 24;
      const padY = h < 400 ? 12 : 24;
      gap = isNarrow ? 8 : 20;
      const room = w - labelW - gap - padL - padR;
      // Projected extent of the stack per unit R over the poses it takes: every
      // plane corner at its lowest and highest level, at the FIT_ angles. In a
      // short, wide slot the layers close up (squash) so the stack can grow
      // to the width instead of shrinking to the height.
      let x0 = 0;
      let x1 = 0;
      let y0 = 0;
      let y1 = 0;
      Rp = 1;
      ox = 0;
      oy = 0;
      for (const f of [1, 0.85, 0.7, 0.55]) {
        x0 = y0 = Infinity;
        x1 = y1 = -Infinity;
        quads.length = 0;
        for (const yaw of FIT_YAWS) {
          for (const pitch of FIT_PITCHES) {
            cyaw = Math.cos(yaw);
            syaw = Math.sin(yaw);
            cp = Math.cos(pitch);
            sp = Math.sin(pitch);
            for (let k = 0; k < 4; k++) {
              for (const y of [(k * SPACING - CENTER) * f - 0.012, (k * SPACING + (k ? FLOAT : 0) - CENTER) * f + (k ? 0.072 : 0.012)]) {
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
        squash = f;
        R = Math.max(40, Math.min(room / (x1 - x0), (h - padY * 2) / (y1 - y0), 250));
        if (R >= room / (x1 - x0) - 0.5) break;
      }
      const spanX = x1 - x0;
      const ensemble = labelW + gap + spanX * R;
      const left = padL + Math.max(0, (w - padL - padR - ensemble) / 2);
      cx = left + labelW + gap - x0 * R;
      // any height to spare goes above the stack, where notes without room on their plane sit
      cy = Math.min(h - padY - y1 * R, h * 0.5 - ((y0 + y1) / 2) * R + 14);
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

      // ink follows the active step in time, so the plane turns with its card (jump when still)
      const inkEase = still ? 1 : 1 - Math.exp(-dt * INK_RATE);
      for (let k = 0; k < 4; k++) {
        inked[k] += ((k === active + 1 ? 1 : 0) - inked[k]) * inkEase;
      }
      for (let k = 0; k < 4; k++) {
        const i = k - 1;
        // the lift follows scroll: fully up within 0.35 of its step, down again beyond 0.65
        lit[k] = k === 0 ? 0 : smooth((0.65 - Math.abs(shown - i)) / 0.3);
        ahead[k] = k === 0 ? 0 : smooth(i - shown);
        const idle = still ? 0 : 0.012 * Math.sin(time * 0.6 + k * 1.7);
        level[k] = (k * SPACING + FLOAT * ahead[k] - CENTER) * squash + 0.06 * lit[k] + idle;
      }

      placeNotes();
      shapes.begin(gl.drawingBufferWidth, gl.drawingBufferHeight);
      for (let k = 0; k < 4; k++) {
        if (k > 0) {
          between(k);
          shapes.flush();
        }
        plane(k, time, still);
        shapes.flush();
      }
      for (const n of notes) {
        if (!n.out || Number.isNaN(n.box[0])) continue;
        const a = 0.8 * n.on;
        shapes.line((n.box[0] + n.w / 2) * dpr, (n.box[3] + 3) * dpr, n.gx * dpr, n.gy * dpr, dpr, layerColor[n.layer], a, a, 3 * dpr, 3 * dpr);
      }
      shapes.flush();
      placeLabels();
    },

    dispose(contextLost) {
      host?.removeEventListener('seq:progress', onProgress);
      for (const { chip, leader } of labels) {
        chip.remove();
        leader.remove();
      }
      for (const n of notes) n.el.remove();
      delete slot.dataset.activeLayer;
      if (!contextLost) shapes.dispose();
    },
  };
  // chips and notes are measured in resize: if Geist Mono lands after mount, fit again at the real widths
  document.fonts?.ready.then(() => {
    if (labels[0].chip.isConnected) {
      scene.resize(W, H, dpr);
      redraw();
    }
  });
  return scene;
};

export default sequence;

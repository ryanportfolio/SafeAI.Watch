/*
 * Hero visual: a slowly turning radial burst of record nodes on thin rays.
 *
 * Every node has two homes: a place on a ray of the burst (colored by
 * category) and a place in a loose, uncolored cloud. The scene holds the
 * burst, lets it come apart into the cloud, then gathers it again, so the
 * record reads as "scattered reports, put in order". While the burst holds,
 * a short label names what one node stands for.
 *
 * All geometry is generated from a fixed seed; projection happens on the
 * CPU (about 140 nodes) and the Shapes batcher draws two instanced passes.
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
  const gauss = () => (r() + r() + r() - 1.5) / 0.75;
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
  const cloud = (): [number, number, number] => {
    if (r() < 0.15) {
      const [x, y, z] = unit();
      const d = 1.05 + r() * 0.5;
      return [x * d * 1.1, y * d * 0.9, z * d * 0.8];
    }
    return [gauss() * 0.7 - 0.05, gauss() * 0.45 - 0.03, gauss() * 0.5];
  };

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
    const len = 0.68 + 0.32 * Math.sqrt(r());
    const big = r() < 0.07;
    rays.push({ node: nodes.length, dir: d, len });
    nodes.push({
      kind: END,
      color: pickColor(),
      size: big ? 10 + 6 * r() : 3 + 5.5 * Math.pow(r(), 1.3),
      delay: r(),
      burst: [d[0] * len, d[1] * len, d[2] * len],
      cloud: cloud(),
    });
    if (r() < 0.22) {
      const t = len * (0.4 + 0.4 * r());
      nodes.push({
        kind: MID,
        color: pickColor(),
        size: 2 + 3 * r(),
        delay: r(),
        burst: [d[0] * t, d[1] * t, d[2] * t],
        cloud: cloud(),
      });
    }
  }
  for (let i = 0; i < STUBS; i++) rays.push({ node: -1, dir: unit(), len: 0.25 + 0.5 * r() });
  for (let i = 0; i < FREE; i++) {
    const d = unit();
    const t = 0.85 + 0.35 * r();
    nodes.push({ kind: LOOSE, color: pickColor(), size: 0.8 + 1.4 * r(), delay: r(), burst: [d[0] * t, d[1] * t, d[2] * t], cloud: cloud() });
  }

  // cloud edges: some nodes link to their nearest neighbour, a few outliers reach far
  const edges: [number, number][] = [];
  const seen = new Set<string>();
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
    const key = i < best ? `${i}:${best}` : `${best}:${i}`;
    if (!seen.has(key)) {
      seen.add(key);
      edges.push([i, best]);
    }
  });
  for (let k = 0; k < 9; k++) edges.push([Math.floor(r() * nodes.length), Math.floor(r() * nodes.length)]);

  return { nodes, rays, edges };
}

const hero: SceneFactory = ({ gl, slot }) => {
  const { nodes, rays, edges } = build();
  const shapes = new Shapes(gl, rays.length + edges.length + 4, nodes.length + 8);

  const css = getComputedStyle(slot);
  const token = (name: string, fallback: string) => rgb(css.getPropertyValue(name).trim() || fallback);
  const palette = [
    token('--ink', '#1a1614'),
    token('--accent-orange', '#ff7733'),
    token('--accent-amber', '#e5a700'),
    token('--accent-olive', '#a89a1a'),
  ];
  const ink = palette[INK];
  const orange = palette[ORANGE];

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

  let W = 1;
  let H = 1;
  let dpr = 1;
  let cx = 0;
  let cy = 0;
  let radius = 1;
  let sizeScale = 1;

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
  let lastTime = -1;

  let labelKey = -1;
  let anchor = -1;
  let chipW = 0;
  let chipH = 0;

  const pickAnchor = (color: number) => {
    let best = -1;
    let score = -Infinity;
    nodes.forEach((node, i) => {
      if (node.kind !== END) return;
      const dx = sx[i] / dpr - cx;
      const dy = sy[i] / dpr - cy;
      const d = Math.hypot(dx, dy) / radius;
      if (d < 0.35 || d > 0.95 || sz[i] < 0.1) return;
      const s = sz[i] + (node.color === color ? 1 : 0) + ((i * 37) % 11) / 30;
      if (s > score) {
        score = s;
        best = i;
      }
    });
    return best;
  };

  const placeLabel = (alpha: number) => {
    if (alpha <= 0 || anchor < 0) {
      chip.style.opacity = '0';
      leader.style.opacity = '0';
      return;
    }
    const nx = sx[anchor] / dpr;
    const ny = sy[anchor] / dpr;
    const side = nx < cx ? 1 : -1;
    const gap = Math.max(36, radius * 0.2);
    let x = side > 0 ? nx + gap : nx - gap - chipW;
    let y = ny - gap * 0.8 - chipH / 2;
    x = Math.min(Math.max(x, 8), W - chipW - 8);
    y = Math.min(Math.max(y, 8), H - chipH - 8);
    chip.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    chip.style.opacity = alpha.toFixed(3);
    // leader from the node's rim to the chip's near edge
    const tx = side > 0 ? x : x + chipW;
    const ty = y + chipH / 2;
    const dx = tx - nx;
    const dy = ty - ny;
    const len = Math.hypot(dx, dy);
    const start = sr[anchor] / dpr + 3;
    const ang = Math.atan2(dy, dx);
    leader.style.width = `${Math.max(0, len - start).toFixed(1)}px`;
    leader.style.transform = `translate3d(${(nx + Math.cos(ang) * start).toFixed(1)}px, ${(ny + Math.sin(ang) * start).toFixed(1)}px, 0) rotate(${ang.toFixed(4)}rad)`;
    leader.style.opacity = alpha.toFixed(3);
  };

  return {
    resize(w, h, ratio) {
      W = w;
      H = h;
      dpr = ratio;
      // beside the copy on wide layouts, centred when the slot spans the width
      const full = slot.getBoundingClientRect().left < 2;
      if (full) {
        cx = w * 0.5;
        cy = h * 0.52;
        radius = Math.min(w * 0.33, h * 0.38);
      } else {
        cx = w * 0.6;
        cy = h * 0.5;
        radius = Math.min(h * 0.307, w * 0.29);
      }
      sizeScale = Math.pow(radius / SIZE_REF, 0.75);
    },

    pointer(x, y) {
      aimX = Math.max(-1.5, Math.min(1.5, x));
      aimY = Math.max(-1.5, Math.min(1.5, y));
    },

    render(time, still) {
      const dt = lastTime < 0 || still ? 0 : Math.max(0, time - lastTime);
      lastTime = time;
      const ease = 1 - Math.exp(-dt * 2.5);
      tiltX += (aimX - tiltX) * ease;
      tiltY += (aimY - tiltY) * ease;

      const t = (time + START) % CYCLE;
      const cycleIndex = Math.floor((time + START) / CYCLE);

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

      const yaw = time * 0.12 + tiltX * 0.22;
      const pitch = -0.3 + Math.sin(time * 0.21) * 0.06 + tiltY * 0.14;
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const R = radius * dpr;
      const ox = cx * dpr;
      const oy = cy * dpr;

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
        const s = project(c[0] + (b[0] - c[0]) * m, c[1] + (b[1] - c[1]) * m, c[2] + (b[2] - c[2]) * m, i);
        // the cloud sits a little closer to the eye, so its nodes read larger
        sr[i] = node.size * sizeScale * s * s * (1.12 - 0.12 * m) * dpr;
      }

      shapes.begin(gl.drawingBufferWidth, gl.drawingBufferHeight);
      const lw = dpr;

      // rays: faint at the core, darker toward the node; they fade with the burst
      const gm = still ? 1 : gathering ? easeInOut(phase) : 1 - easeInOut(phase);
      for (const ray of rays) {
        if (ray.node < 0) continue;
        const i = ray.node;
        const v = smooth(0.35, 1, mix[i]) * (0.7 + 0.3 * (sz[i] + 1) * 0.5);
        if (v > 0.002) shapes.line(ox, oy, sx[i], sy[i], lw, ink, 0.07 * v, 0.55 * v);
      }
      // short rays without a node, following the burst as a whole
      if (gm > 0.002) {
        for (const ray of rays) {
          if (ray.node >= 0) continue;
          const [x, y, z] = ray.dir;
          const x1 = x * cyaw + z * syaw;
          const z1 = -x * syaw + z * cyaw;
          const y2 = y * cp - z1 * sp;
          const z2 = y * sp + z1 * cp;
          const s = (CAMERA / (CAMERA - z2 * ray.len)) * ray.len;
          shapes.line(ox, oy, ox + x1 * R * s, oy - y2 * R * s, lw, ink, 0.05 * gm, 0.3 * gm);
        }
      }
      // cloud links fade in as the burst lets go
      for (const [a, b] of edges) {
        const v = Math.pow(1 - (mix[a] + mix[b]) * 0.5, 2) * 0.24;
        if (v > 0.002) shapes.line(sx[a], sy[a], sx[b], sy[b], lw, ink, v, v);
      }
      shapes.flush();

      // nodes back to front; color arrives as each node reaches its ray
      order.sort((a, b) => sz[a] - sz[b]);
      for (const i of order) {
        const node = nodes[i];
        const k = smooth(0.55, 1, mix[i]);
        const c = palette[node.color];
        col[0] = ink[0] + (c[0] - ink[0]) * k;
        col[1] = ink[1] + (c[1] - ink[1]) * k;
        col[2] = ink[2] + (c[2] - ink[2]) * k;
        shapes.circle(sx[i], sy[i], sr[i], col, node.kind === LOOSE ? 0.85 : 1);
      }

      // label: one at a time while the burst holds
      let labelAlpha = 0;
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
          anchor = pickAnchor(color);
          text.textContent = label;
          dot.style.background = `rgb(${palette[color].map((v) => Math.round(v * 255)).join(' ')})`;
          chipW = chip.offsetWidth;
          chipH = chip.offsetHeight;
        }
        if (anchor >= 0) {
          // pulse on the labelled node
          const p = still ? 0.35 : (t % 1.3) / 1.3;
          shapes.circle(sx[anchor], sy[anchor], sr[anchor] + (3 + 13 * (1 - Math.pow(1 - p, 2))) * dpr, orange, 0.6 * (1 - p) * labelAlpha, 1.4 * dpr);
        }
      }
      placeLabel(labelAlpha);

      // an ambient pulse elsewhere, in either state
      if (!still) {
        const beat = Math.floor(time / 1.9);
        const i = (beat * 53 + 17) % RAYS;
        const target = rays[i].node;
        const p = (time % 1.9) / 1.9;
        if (target >= 0 && target !== anchor && sz[target] > -0.2) {
          shapes.circle(sx[target], sy[target], sr[target] + (3 + 11 * (1 - Math.pow(1 - p, 2))) * dpr, orange, 0.45 * (1 - p), 1.2 * dpr);
        }
      }
      shapes.flush();
    },

    dispose(contextLost) {
      if (!contextLost) shapes.dispose();
      chip.remove();
      leader.remove();
    },
  };
};

export default hero;

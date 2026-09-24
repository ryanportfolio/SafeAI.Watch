/*
 * "Four ways to follow the record": a turning starburst of entries that
 * sorts itself into the four areas of coverage and gathers again.
 *
 * Every point belongs to one of the four areas (the cards beside the panel,
 * in order). In the burst all areas share one center, as the record does.
 * Then the points leave their rays and settle into four loose clusters, each
 * level with its card, and one area at a time lights in its accent color
 * with its name. Hovering a card lights that area at once and names it, in
 * either state. Comets with dotted trails circle the burst; near points grow
 * and go out of focus; film grain over everything.
 */
import type { SceneFactory } from './runtime';
import { Shapes, rgb } from './shapes';
import { Backdrop, c255, clamp01, easeInOut, grainSeed, random, smooth, type Blob } from './backdrop';

const AREAS = 4;
const PER_AREA = 30; // 120 points
const STUBS = 34;
const COMETS = 7;
const TRAIL = 18;
const CAMERA = 5;

/* One cycle, in seconds. */
const HOLD_BURST = 4.6;
const MORPH = 1.5;
const HOLD_CLOUD = 5.2;
const CYCLE = HOLD_BURST + MORPH + HOLD_CLOUD + MORPH;

const BASE = c255(8, 12, 16);
const CENTER = c255(25, 28, 30);
const TOP = c255(17, 24, 32);
const NAVY = c255(22, 32, 46);
const MAROON = c255(46, 20, 26);
const DOT = c255(186, 188, 184);
const HEAD = c255(236, 236, 226);

interface Node {
  area: number;
  burst: [number, number, number];
  jitter: [number, number, number];
  size: number;
  delay: number;
}

interface Comet {
  radius: number;
  speed: number;
  phase: number;
  u: [number, number, number];
  v: [number, number, number];
}

function build() {
  const r = random(4242);
  const gauss = () => (r() + r() + r() - 1.5) / 0.75;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const total = AREAS * PER_AREA;
  // areas are dealt round the sphere in shuffled order so every area reaches every side
  const areas = Array.from({ length: total }, (_, i) => i % AREAS);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [areas[i], areas[j]] = [areas[j], areas[i]];
  }
  const nodes: Node[] = [];
  for (let i = 0; i < total; i++) {
    const y = 1 - (2 * (i + 0.5)) / total;
    const s = Math.sqrt(1 - y * y);
    const a = i * golden;
    let d: [number, number, number] = [Math.cos(a) * s + (r() - 0.5) * 0.14, y + (r() - 0.5) * 0.14, Math.sin(a) * s + (r() - 0.5) * 0.14];
    const m = Math.hypot(...d);
    d = [d[0] / m, d[1] / m, d[2] / m];
    const len = 0.42 + 0.58 * Math.sqrt(r());
    const big = r() < 0.09;
    nodes.push({
      area: areas[i],
      burst: [d[0] * len, d[1] * len, d[2] * len],
      jitter: [gauss() * 0.3, gauss() * 0.11, gauss() * 0.3],
      size: big ? 7 + 5 * r() : 2.6 + 3.4 * Math.pow(r(), 1.2),
      delay: r(),
    });
  }
  const stubs: [number, number, number][] = [];
  for (let i = 0; i < STUBS; i++) {
    const y = r() * 2 - 1;
    const a = r() * Math.PI * 2;
    const s = Math.sqrt(1 - y * y);
    const len = 0.3 + 0.6 * r();
    stubs.push([Math.cos(a) * s * len, y * len, Math.sin(a) * s * len]);
  }
  // cluster links: each point to its nearest neighbour in the same area
  const links: [number, number][] = [];
  nodes.forEach((p, i) => {
    let best = -1;
    let bestD = Infinity;
    nodes.forEach((q, j) => {
      if (j === i || q.area !== p.area) return;
      const d = Math.hypot(p.jitter[0] - q.jitter[0], p.jitter[1] - q.jitter[1], p.jitter[2] - q.jitter[2]);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    if (best >= 0 && !links.some(([a, b]) => a === best && b === i)) links.push([i, best]);
  });
  const comets: Comet[] = [];
  for (let i = 0; i < COMETS; i++) {
    // orbit plane from two perpendicular unit vectors; tilts spread over the half turn
    const t = ((i + 0.3 * r()) / COMETS) * Math.PI;
    const p = r() * Math.PI * 2;
    const u: [number, number, number] = [Math.cos(p), 0, Math.sin(p)];
    const v: [number, number, number] = [-Math.sin(p) * Math.cos(t), Math.sin(t), Math.cos(p) * Math.cos(t)];
    comets.push({ radius: 0.75 + 0.25 * r(), speed: (0.4 + 0.3 * r()) * (i % 2 ? -1 : 1), phase: (i / COMETS) * Math.PI * 2 + r(), u, v });
  }
  return { nodes, stubs, links, comets };
}

const coverage: SceneFactory = ({ gl, slot, redraw }) => {
  const { nodes, stubs, links, comets } = build();
  const n = nodes.length;
  const shapes = new Shapes(gl, n + STUBS + links.length + 4, n + COMETS * (TRAIL + 2) + 6);
  const backdrop = new Backdrop(gl);

  const css = getComputedStyle(slot);
  const token = (name: string, fallback: string) => rgb(css.getPropertyValue(name).trim() || fallback);
  const accents = [
    token('--accent-olive', '#a89a1a'),
    token('--accent-orange', '#ff7733'),
    token('--accent-amber', '#e5a700'),
    token('--accent-blue', '#6a86c2'),
  ];

  // the four cards beside the panel, in area order
  const cards = [...(slot.closest('.coverage-grid')?.querySelectorAll<HTMLElement>('.coverage-card') ?? [])].slice(0, AREAS);
  const names = cards.map((card, i) => card.querySelector('.eyebrow')?.textContent?.trim() || `Area ${i + 1}`);
  let pinned = -1;
  const handlers = cards.map((card, i) => {
    const enter = () => {
      pinned = i;
      redraw();
    };
    const leave = () => {
      if (pinned === i) pinned = -1;
      redraw();
    };
    card.addEventListener('pointerenter', enter);
    card.addEventListener('pointerleave', leave);
    return { card, enter, leave };
  });

  // name chip for the lit area
  const chip = document.createElement('div');
  chip.className = 'visual-label';
  const chipDot = document.createElement('span');
  chipDot.className = 'visual-label-dot';
  const chipText = document.createElement('span');
  chip.append(chipDot, chipText);
  slot.append(chip);
  let chipArea = -1;
  let chipW = 0;
  let chipH = 0;
  let anchor = -1;

  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sz = new Float32Array(n);
  const mix = new Float32Array(n);
  const order = nodes.map((_, i) => i);
  const col: [number, number, number] = [0, 0, 0];
  // cluster centres in camera space (units of R): level with the cards, left and right in turn
  const clusterY = [0.45, 0.15, -0.15, -0.45];
  const clusterX = [-0.28, 0.3, -0.26, 0.28];

  let W = 1;
  let H = 1;
  let dpr = 1;
  let R = 1;
  let sizeScale = 1;
  let aimX = 0;
  let aimY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let lit = -1;
  let glow = 0;
  let last = -1;
  let gone = false;

  const blobs: Blob[] = [
    { x: 0.5, y: 0.5, rx: 0.55, ry: 0.42, rgb: CENTER, a: 1 },
    { x: 0.5, y: 0, rx: 0.7, ry: 0.22, rgb: TOP, a: 0.9 },
    { x: 0.18, y: 0.55, rx: 0.45, ry: 0.5, rgb: NAVY, a: 0 },
    { x: 0.9, y: 0.42, rx: 0.32, ry: 0.55, rgb: MAROON, a: 0 },
  ];

  // Each cluster sits level with its card's centre while the cards stand beside the
  // panel; in the one-column layout (cards above it) or without cards, even quarters.
  function place() {
    const s = slot.getBoundingClientRect();
    const ys = cards.map((card) => {
      const b = card.getBoundingClientRect();
      return b.height > 0 && b.right <= s.left + 1 ? b.top + b.height / 2 - s.top : -1;
    });
    const beside = ys.length === AREAS && ys.every((y, k) => y > 0 && y < H && (k === 0 || y > ys[k - 1]));
    for (let k = 0; k < AREAS; k++) {
      // fallback: quarters of the middle 84% so the top and bottom clusters keep clear of the edges
      const cy = beside ? ys[k] : H / 2 - (0.5 - (k + 0.5) / AREAS) * H * 0.84;
      clusterY[k] = (H / 2 - Math.min(H - 40, Math.max(40, cy))) / R;
    }
  }
  document.fonts?.ready.then(() => {
    if (!gone) place();
  });

  return {
    resize(w, h, ratio) {
      W = w;
      H = h;
      dpr = ratio;
      R = Math.min(w, h) * 0.47;
      sizeScale = Math.pow(R / 250, 0.6);
      place();
    },

    pointer(x, y) {
      const inside = Math.abs(x) <= 1.1 && Math.abs(y) <= 1.1;
      aimX = inside ? x : 0;
      aimY = inside ? y : 0;
    },

    render(time, still) {
      const dt = last < 0 || still ? 0 : Math.max(0, time - last);
      last = time;
      const k = 1 - Math.exp(-dt * 2);
      tiltX += (aimX - tiltX) * k;
      tiltY += (aimY - tiltY) * k;

      const t = time % CYCLE;
      const cycle = Math.floor(time / CYCLE);
      // 1 = burst, 0 = clusters, per node with a stagger
      let phase = 1;
      let gathering = true;
      if (t >= HOLD_BURST && t < HOLD_BURST + MORPH) {
        phase = (t - HOLD_BURST) / MORPH;
        gathering = false;
      } else if (t >= HOLD_BURST + MORPH && t < CYCLE - MORPH) {
        gathering = false;
      } else if (t >= CYCLE - MORPH) {
        phase = (t - (CYCLE - MORPH)) / MORPH;
      }
      const burst = gathering ? easeInOut(phase) : 1 - easeInOut(phase);
      const cloud = 1 - burst;

      // which area is lit: the hovered card, else one per cycle while clustered
      const auto = cloud > 0.5 ? cycle % AREAS : -1;
      const target = pinned >= 0 ? pinned : auto;
      if (still) {
        lit = target;
        glow = target >= 0 ? 1 : 0;
      } else if (target === lit) {
        // nothing lit means nothing dimmed
        glow = lit >= 0 ? Math.min(1, glow + dt * (pinned >= 0 ? 6 : 2.5)) : 0;
      } else {
        // a hovered card crossfades fast (about 0.3 s) so its name follows the pointer
        glow = Math.max(0, glow - dt * (pinned >= 0 ? 10 : 3.5));
        if (glow === 0) lit = target;
      }

      const yaw = time * 0.1 + tiltX * 0.25;
      const pitch = -0.18 + Math.sin(time * 0.2) * 0.05 + tiltY * 0.12;
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const Rd = R * dpr;
      const ox = W * 0.5 * dpr;
      const oy = H * 0.5 * dpr;
      let px = 0;
      let py = 0;
      let rx = 0;
      let ry = 0;
      let rz = 0;
      // turn into camera space
      const rotate = (x: number, y: number, z: number) => {
        const z1 = -x * syaw + z * cyaw;
        rx = x * cyaw + z * syaw;
        ry = y * cp - z1 * sp;
        rz = y * sp + z1 * cp;
      };
      // camera space to device px
      const persp = (x: number, y: number, z: number) => {
        const s = CAMERA / (CAMERA - z);
        px = ox + x * Rd * s;
        py = oy - y * Rd * s;
        return z;
      };
      const project = (x: number, y: number, z: number) => {
        rotate(x, y, z);
        return persp(rx, ry, rz);
      };

      let meanX = 0;
      let meanY = 0;
      let meanN = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      for (let i = 0; i < n; i++) {
        const node = nodes[i];
        const p = clamp01((phase - node.delay * 0.4) / 0.6);
        const m = gathering ? easeInOut(p) : 1 - easeInOut(p);
        mix[i] = m;
        // the burst turns as a whole; each cluster turns in place beside its card
        const b = node.burst;
        rotate(b[0], b[1], b[2]);
        const bx = rx;
        const by = ry;
        const bz = rz;
        const j = node.jitter;
        rotate(j[0], j[1], j[2]);
        const cx = clusterX[node.area] + rx;
        const cy = clusterY[node.area] + ry;
        sz[i] = persp(cx + (bx - cx) * m, cy + (by - cy) * m, rz + (bz - rz) * m);
        sx[i] = px;
        sy[i] = py;
        if (node.area === lit) {
          meanX += px;
          meanY += py;
          meanN++;
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
        }
      }

      blobs[2].a = 0.9 * cloud;
      blobs[3].a = 0.85 * cloud;
      shapes.begin(gl.drawingBufferWidth, gl.drawingBufferHeight);
      backdrop.field(BASE, blobs, 0.45, dpr);

      const lw = dpr;
      const hole = 4 * dpr;
      // rays from just off the center, fading as points leave them
      const ray = (x: number, y: number, c: readonly number[], a0: number, a1: number) => {
        const dx = x - ox;
        const dy = y - oy;
        const d = Math.hypot(dx, dy);
        if (d > hole) shapes.line(ox + (dx / d) * hole, oy + (dy / d) * hole, x, y, lw, c, a0, a1);
      };
      for (let i = 0; i < n; i++) {
        const v = smooth(0.3, 1, mix[i]);
        if (v < 0.002) continue;
        const on = nodes[i].area === lit ? glow : 0;
        const c = on > 0 ? accents[lit] : DOT;
        const a = v * (1 - 0.5 * glow + 0.9 * on);
        ray(sx[i], sy[i], c, 0.26 * a, (0.1 + 0.2 * on) * a);
      }
      if (burst > 0.002) {
        for (const [x, y, z] of stubs) {
          project(x, y, z);
          ray(px, py, DOT, 0.2 * burst * (1 - 0.4 * glow), 0.04 * burst);
        }
      }
      // cluster links appear as the burst lets go
      for (const [a, b] of links) {
        const v = Math.pow(1 - (mix[a] + mix[b]) * 0.5, 2);
        if (v < 0.002) continue;
        const on = nodes[a].area === lit ? glow : 0;
        const al = v * (0.2 + 0.25 * on) * (1 - 0.5 * glow + 0.5 * on);
        shapes.line(sx[a], sy[a], sx[b], sy[b], lw, on > 0 ? accents[lit] : DOT, al, al);
      }
      // the burst's source: a small soft light where the rays meet
      if (burst > 0.01) {
        shapes.glow(ox, oy, 8 * dpr, HEAD, 0.55 * burst);
        shapes.circle(ox, oy, 1.6 * dpr, HEAD, 0.9 * burst);
      }
      // a soft accent light under the lit cluster
      if (lit >= 0 && meanN > 0 && glow * cloud > 0.01) {
        shapes.glow(meanX / meanN, meanY / meanN, 0.5 * Rd, accents[lit], 0.08 * glow * cloud);
      }
      shapes.flush();

      // points back to front, near ones larger and out of focus
      order.sort((a, b) => sz[a] - sz[b]);
      for (const i of order) {
        const z = sz[i];
        const near = smooth(0.3, 0.95, z);
        const s = CAMERA / (CAMERA - z);
        const r = nodes[i].size * sizeScale * s * s * (1 + near * 0.8) * dpr;
        const on = nodes[i].area === lit ? glow : 0;
        const c = accents[lit] ?? DOT;
        col[0] = DOT[0] + (c[0] - DOT[0]) * on;
        col[1] = DOT[1] + (c[1] - DOT[1]) * on;
        col[2] = DOT[2] + (c[2] - DOT[2]) * on;
        const a = (0.72 + 0.26 * clamp01(z * 0.5 + 0.5)) * (1 - near * 0.55) * (1 - 0.55 * glow + 0.55 * on);
        if (near > 0.05) shapes.circle(sx[i], sy[i], r, col, a * 0.8, -r * near * 1.2);
        else shapes.circle(sx[i], sy[i], r, col, a);
      }

      // comets with dotted trails, while the burst holds: a cream head in a soft
      // halo, the trail thinning and fading behind it
      if (burst > 0.01) {
        const fade = burst * (1 - 0.4 * glow);
        for (const c of comets) {
          for (let s = TRAIL; s >= 0; s--) {
            const ang = (still ? 1.7 : time) * c.speed + c.phase - Math.sign(c.speed) * s * 0.045;
            const ca = Math.cos(ang) * c.radius;
            const sa = Math.sin(ang) * c.radius;
            project(c.u[0] * ca + c.v[0] * sa, c.u[1] * ca + c.v[1] * sa, c.u[2] * ca + c.v[2] * sa);
            const f = 1 - s / TRAIL;
            if (s === 0) {
              shapes.glow(px, py, 9 * sizeScale * dpr, HEAD, 0.3 * fade);
              shapes.circle(px, py, 3 * sizeScale * dpr, HEAD, 0.97 * fade);
            } else {
              shapes.circle(px, py, (1.2 + 1.2 * f) * sizeScale * dpr, DOT, (0.15 + 0.6 * f * f) * fade);
            }
          }
        }
      }
      shapes.flush();
      backdrop.grain(0.045, grainSeed(time, still), dpr);

      // the lit area's name: beside its cluster once clustered; for a hovered card
      // also in the burst, just outside the rim above or below its outermost point
      const shown = lit >= 0 && lit === pinned ? 1 : smooth(0.55, 0.9, cloud);
      const chipAlpha = glow * shown;
      if (chipAlpha > 0.01 && lit >= 0 && meanN > 0) {
        if (chipArea !== lit) {
          chipArea = lit;
          anchor = -1;
          chipText.textContent = names[lit];
          chipDot.style.background = `rgb(${accents[lit].map((v) => Math.round(v * 255)).join(' ')})`;
          chipW = chip.offsetWidth;
          chipH = chip.offsetHeight;
        }
        const mx = meanX / meanN / dpr;
        const my = meanY / meanN / dpr;
        const side = mx < W / 2 ? 1 : -1;
        // just past the cluster's outer edge, on the side toward the open middle
        let x = side > 0 ? maxX / dpr + 14 : minX / dpr - 14 - chipW;
        let y = my - chipH / 2;
        if (burst > 0.01) {
          // keep the anchor while it stays far out and in front; else take the next best
          if (anchor >= 0 && (Math.abs(sy[anchor] - oy) < 0.55 * Rd || sz[anchor] < -0.4)) anchor = -1;
          if (anchor < 0) {
            let best = 0;
            for (let i = 0; i < n; i++) {
              if (nodes[i].area !== lit || sz[i] < -0.3) continue;
              const v = Math.abs(sy[i] - oy) * (1 - 0.35 * Math.abs(sx[i] - ox) / Rd);
              if (v > best) {
                best = v;
                anchor = i;
              }
            }
          }
          if (anchor >= 0) {
            const bx = sx[anchor] / dpr - chipW / 2;
            const by = sy[anchor] < oy ? H / 2 - R - 18 - chipH : H / 2 + R + 18;
            x = bx + (x - bx) * cloud;
            y = by + (y - by) * cloud;
          }
        } else {
          anchor = -1;
        }
        x = Math.min(Math.max(x, 12), W - chipW - 12);
        y = Math.min(Math.max(y, 12), H - chipH - 12);
        chip.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        chip.style.opacity = chipAlpha.toFixed(3);
      } else {
        chip.style.opacity = '0';
      }
    },

    dispose(contextLost) {
      gone = true;
      for (const { card, enter, leave } of handlers) {
        card.removeEventListener('pointerenter', enter);
        card.removeEventListener('pointerleave', leave);
      }
      chip.remove();
      if (contextLost) return;
      shapes.dispose();
      backdrop.dispose();
    },
  };
};

export default coverage;

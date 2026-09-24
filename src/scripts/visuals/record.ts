/*
 * Record band: a slow network of sources around the timeline card.
 *
 * About 130 points hang in a shallow volume that sways a little. Most of
 * them live in the margins the card leaves open, so the network shows where
 * the reader can see it. Points that come close link up and let go again as
 * they drift, so the band reads as a record that keeps connecting. Two small
 * lights take turns running along live links in the margins, each with a
 * dotted trail and a soft halo, and flash on arrival. Points stay crisp; near
 * ones are a little larger and brighter. Points fade out toward the band's top
 * and bottom edges. Behind them, a slate ground with a warmer, darker column in
 * the middle and film grain.
 */
import type { SceneFactory } from './runtime';
import { Shapes } from './shapes';
import { Backdrop, c255, clamp01, grainSeed, random, smooth, type Blob } from './backdrop';

const COUNT = 130;
const MARGIN_SHARE = 0.65;
const MAX_LINKS = 3;
const RUNNERS = 2;
const PERIOD = 3.2; // seconds per run, runners offset by half
const TRAVEL = 1.8;
const FLASH = 0.6;
const TRAIL = 10;
const TRAIL_GAP = 6; // CSS px between trail dots, whatever the speed
const EDGE = 28; // CSS px over which points fade out toward the band's top and bottom

const BASE = c255(22, 31, 41);
const WARM = c255(28, 29, 28);
const DOT = c255(150, 158, 168);
const LIGHT = c255(232, 232, 220);

interface Point {
  x: number; // px from the slot centre
  y: number;
  z: number;
  amp: number;
  freq: number;
  phase: number;
  size: number;
}

const record: SceneFactory = ({ gl, slot }) => {
  const n = COUNT;
  const shapes = new Shapes(gl, n * MAX_LINKS + 8, n + RUNNERS * (TRAIL + 3) + 8);
  const backdrop = new Backdrop(gl);
  const card = slot.closest('.record-band')?.querySelector<HTMLElement>('.timeline') ?? null;

  let pts: Point[] = [];
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const pz = new Float32Array(n);
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const ss = new Float32Array(n);
  const edge = new Float32Array(n);
  const links = new Uint8Array(n);
  const live: [number, number][] = [];
  const runs: ([number, number] | null)[] = [null, null];
  const runBeat = [-1, -1];

  let W = 1;
  let H = 1;
  let dpr = 1;
  let depth = 1;
  let link = 100;
  // the card box, px from the slot centre
  let cl = 0;
  let ct = 0;
  let cr = 0;
  let cb = 0;
  let aimX = 0;
  let aimY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let last = -1;

  const blobs: Blob[] = [
    { x: 0.5, y: 0.5, rx: 0.26, ry: 1.4, rgb: WARM, a: 1 },
    { x: 0.5, y: 0.5, rx: 0.9, ry: 0.9, rgb: WARM, a: 0.25 },
  ];

  // Seeded layout for this size: most points in the open margins (by area), the rest anywhere.
  function layout() {
    const r = random(8675309);
    const hw = W / 2;
    const hh = H / 2;
    const regions: [number, number, number, number][] = [
      [-hw, -hh, cl, hh],
      [cr, -hh, hw, hh],
      [cl, -hh, cr, ct],
      [cl, cb, cr, hh],
    ].filter(([a, b, c, d]) => c - a > 4 && d - b > 4) as [number, number, number, number][];
    // side margins count 1.5x: they frame the card for the whole height of the band
    const areas = regions.map(([a, b, c, d]) => (c - a) * (d - b) * (d - b > H * 0.9 ? 1.5 : 1));
    const total = areas.reduce((s, v) => s + v, 0);
    pts = [];
    for (let i = 0; i < n; i++) {
      let x = (r() - 0.5) * W;
      let y = (r() - 0.5) * H;
      if (total > 0 && i < n * MARGIN_SHARE) {
        let pick = r() * total;
        let k = 0;
        while (k < regions.length - 1 && pick > areas[k]) pick -= areas[k++];
        const [a, b, c, d] = regions[k];
        x = a + (c - a) * r();
        y = b + (d - b) * r();
      }
      const big = r() < 0.08;
      pts.push({
        x,
        // homes stay clear of the band's top and bottom edges
        y: Math.max(-hh + EDGE, Math.min(hh - EDGE, y)),
        z: (r() * 2 - 1) * depth,
        amp: (0.012 + 0.02 * r()) * Math.min(W, H),
        freq: 0.12 + 0.2 * r(),
        phase: r() * Math.PI * 2,
        size: big ? 3.6 + 1.6 * r() : 1.3 + 1.9 * Math.pow(r(), 1.4),
      });
    }
  }

  const outside = (i: number, sides = false) => {
    const x = sx[i] / dpr - W / 2;
    const y = sy[i] / dpr - H / 2;
    return x < cl || x > cr || (!sides && (y < ct || y > cb));
  };

  return {
    resize(w, h, ratio) {
      W = w;
      H = h;
      dpr = ratio;
      depth = 0.2 * Math.min(w, h);
      link = Math.min(130, Math.max(60, 0.09 * Math.max(w, h)));
      cl = cr = ct = cb = 0;
      const b = card?.getBoundingClientRect();
      if (b && b.width > 0) {
        const s = slot.getBoundingClientRect();
        cl = b.left - s.left - w / 2;
        cr = b.right - s.left - w / 2;
        ct = b.top - s.top - h / 2;
        cb = b.bottom - s.top - h / 2;
      }
      layout();
    },

    pointer(x, y) {
      aimX = Math.max(-1.5, Math.min(1.5, x));
      aimY = Math.max(-1.5, Math.min(1.5, y));
    },

    render(time, still) {
      const dt = last < 0 || still ? 0 : Math.max(0, time - last);
      last = time;
      const k = 1 - Math.exp(-dt * 1.5);
      tiltX += (aimX - tiltX) * k;
      tiltY += (aimY - tiltY) * k;

      // a gentle sway instead of a full turn, so the margins keep their points
      const yaw = 0.12 * Math.sin(time * 0.07) + tiltX * 0.08;
      const pitch = 0.08 * Math.sin(time * 0.05 + 1) + tiltY * 0.06;
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const ox = W * 0.5 * dpr;
      const oy = H * 0.5 * dpr;
      const sizeScale = Math.min(1.4, Math.max(0.8, Math.min(W, H) / 700));

      for (let i = 0; i < n; i++) {
        const p = pts[i];
        const w = time * p.freq + p.phase;
        const x = p.x + Math.sin(w) * p.amp;
        const y = p.y + Math.cos(w * 0.8) * p.amp;
        const z = p.z + Math.sin(w * 0.6 + 1) * p.amp;
        const x1 = x * cyaw + z * syaw;
        const z1 = -x * syaw + z * cyaw;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        px[i] = x;
        py[i] = y;
        pz[i] = z;
        // orthographic: depth shows in the sway, size and focus, and never pulls a
        // margin point in behind the card
        sx[i] = ox + x1 * dpr;
        sy[i] = oy + y2 * dpr;
        ss[i] = z2 / depth;
        // fade toward the band's top and bottom so no disc is cut by the edge
        edge[i] = smooth(0, EDGE * dpr, Math.min(sy[i], H * dpr - sy[i]) - 6 * dpr);
      }

      shapes.begin(gl.drawingBufferWidth, gl.drawingBufferHeight);
      backdrop.field(BASE, blobs, 0.3, dpr);

      // links between neighbours, fading with distance (depth counts less than the plane)
      links.fill(0);
      live.length = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (links[i] >= MAX_LINKS || links[j] >= MAX_LINKS) continue;
          const d = Math.hypot(px[i] - px[j], py[i] - py[j], 0.4 * (pz[i] - pz[j]));
          if (d > link) continue;
          links[i]++;
          links[j]++;
          const near = 0.55 + 0.45 * clamp01((ss[i] + ss[j]) * 0.25 + 0.5);
          const a = Math.pow(1 - d / link, 1.3) * 0.46 * near * Math.min(edge[i], edge[j]);
          shapes.line(sx[i], sy[i], sx[j], sy[j], dpr, DOT, a, a);
          if (d < link * 0.7) live.push([i, j]);
        }
      }
      shapes.flush();

      // points: crisp discs; depth shows as size and tone (near ones a little larger and brighter)
      for (let i = 0; i < n; i++) {
        const z = clamp01(ss[i] * 0.5 + 0.5);
        const r = pts[i].size * sizeScale * (0.8 + 0.4 * z) * dpr;
        const a = (0.42 + 0.46 * z) * edge[i];
        if (a > 0.005) shapes.circle(sx[i], sy[i], r, DOT, a);
      }

      // two lights take turns running along live links in the open margins; a
      // run keeps its link and skips if the link breaks
      // side margins first (the top strip sits under the page nav), then any open margin
      const side = live.filter(([i, j]) => outside(i, true) && outside(j, true));
      const seen = side.length ? side : live.filter(([i, j]) => outside(i) && outside(j));
      const pool = seen.length ? seen : live;
      for (let q = 0; q < RUNNERS; q++) {
        const at = time + q * PERIOD * 0.5;
        const beat = Math.floor(at / PERIOD);
        if (beat !== runBeat[q]) {
          runBeat[q] = beat;
          runs[q] = pool.length ? pool[(beat * 37 + 11 + q * 17) % pool.length] : null;
        }
        const run = runs[q];
        if (!run) continue;
        const [i, j] = run;
        const d = Math.hypot(px[i] - px[j], py[i] - py[j], 0.4 * (pz[i] - pz[j]));
        const hold = smooth(link, link * 0.7, d) * Math.min(edge[i], edge[j]);
        const u = still ? 0.55 * TRAVEL : at % PERIOD;
        const dx = sx[j] - sx[i];
        const dy = sy[j] - sy[i];
        const len = Math.hypot(dx, dy) || 1;
        if (u < TRAVEL) {
          const f = u / TRAVEL;
          const fade = Math.min(1, f * 8, (1 - f) * 8) * hold;
          if (fade < 0.01) continue;
          // head distance along the link; the trail is dots at fixed spacing behind it
          const head = f * f * (3 - 2 * f) * len;
          for (let s = TRAIL; s >= 1; s--) {
            const back = head - s * TRAIL_GAP * dpr;
            if (back < 0) continue;
            const m = 1 - s / (TRAIL + 1);
            shapes.circle(sx[i] + (dx * back) / len, sy[i] + (dy * back) / len, (0.7 + 0.9 * m) * dpr, LIGHT, (0.12 + 0.55 * m * m) * fade);
          }
          const x = sx[i] + (dx * head) / len;
          const y = sy[i] + (dy * head) / len;
          shapes.glow(x, y, 6 * dpr, LIGHT, 0.35 * fade);
          shapes.circle(x, y, 1.8 * dpr, LIGHT, 0.95 * fade);
        } else if (u < TRAVEL + FLASH) {
          const f = (u - TRAVEL) / FLASH;
          shapes.circle(sx[j], sy[j], 8 * f * dpr + 1, LIGHT, 0.5 * (1 - f) * hold, dpr);
        }
      }
      shapes.flush();
      backdrop.grain(0.045, grainSeed(time, still), dpr);
    },

    dispose(contextLost) {
      if (contextLost) return;
      shapes.dispose();
      backdrop.dispose();
    },
  };
};

export default record;

/*
 * Record band: a slow network of sources behind the timeline card.
 *
 * About 130 points hang in a loose, slowly turning volume. Points that
 * come close link up and let go again as the volume turns, so the band reads
 * as a record that keeps connecting. Now and then a small light runs along
 * one live link. Near points grow and go out of focus. Behind them, a slate
 * ground with a warmer, darker column in the middle and film grain.
 *
 * Only the margins around the card show at rest, so the motion is kept calm:
 * it frames the card without pulling the eye from it.
 */
import type { SceneFactory } from './runtime';
import { Shapes } from './shapes';
import { Backdrop, c255, clamp01, grainSeed, random, smooth, type Blob } from './backdrop';

const COUNT = 130;
const LINK = 0.4;
const MAX_LINKS = 3;
const CAMERA = 4;

const BASE = c255(22, 31, 41);
const WARM = c255(28, 29, 28);
const DOT = c255(150, 158, 168);
const LIGHT = c255(232, 232, 220);

interface Point {
  home: [number, number, number];
  amp: number;
  freq: number;
  phase: number;
  size: number;
}

function build(): Point[] {
  const r = random(8675309);
  const pts: Point[] = [];
  while (pts.length < COUNT) {
    const x = r() * 2 - 1;
    const y = r() * 2 - 1;
    const z = r() * 2 - 1;
    if (x * x + y * y + z * z > 1) continue;
    const big = r() < 0.08;
    pts.push({
      home: [x * 1.6, y * 1.2, z],
      amp: 0.03 + 0.06 * r(),
      freq: 0.12 + 0.2 * r(),
      phase: r() * Math.PI * 2,
      size: big ? 4.5 + 2.5 * r() : 1.4 + 2.4 * Math.pow(r(), 1.4),
    });
  }
  return pts;
}

const record: SceneFactory = ({ gl }) => {
  const pts = build();
  const n = pts.length;
  const shapes = new Shapes(gl, n * MAX_LINKS + 8, n + 8);
  const backdrop = new Backdrop(gl);

  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const pz = new Float32Array(n);
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const ss = new Float32Array(n);
  const links = new Uint8Array(n);
  const live: [number, number][] = [];
  let run: [number, number] | null = null;
  let runBeat = -1;

  let W = 1;
  let H = 1;
  let dpr = 1;
  let unitX = 1;
  let unitY = 1;
  let aimX = 0;
  let aimY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let last = -1;

  const blobs: Blob[] = [
    { x: 0.5, y: 0.5, rx: 0.26, ry: 1.4, rgb: WARM, a: 1 },
    { x: 0.5, y: 0.5, rx: 0.9, ry: 0.9, rgb: WARM, a: 0.25 },
  ];

  return {
    resize(w, h, ratio) {
      W = w;
      H = h;
      dpr = ratio;
      unitY = h * 0.5;
      unitX = Math.min(w * 0.5, h * 0.62);
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

      const yaw = time * 0.06 + tiltX * 0.12;
      const pitch = 0.18 * Math.sin(time * 0.05) + tiltY * 0.08;
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const ox = W * 0.5 * dpr;
      const oy = H * 0.5 * dpr;
      const ux = unitX * dpr;
      const uy = unitY * dpr;
      const sizeScale = Math.min(1.4, Math.max(0.8, Math.min(W, H) / 700));

      for (let i = 0; i < n; i++) {
        const p = pts[i];
        const w = time * p.freq + p.phase;
        const x = p.home[0] + Math.sin(w) * p.amp;
        const y = p.home[1] + Math.cos(w * 0.8) * p.amp;
        const z = p.home[2] + Math.sin(w * 0.6 + 1) * p.amp;
        const x1 = x * cyaw + z * syaw;
        const z1 = -x * syaw + z * cyaw;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        px[i] = x;
        py[i] = y;
        pz[i] = z;
        const s = CAMERA / (CAMERA - z2);
        sx[i] = ox + x1 * ux * s;
        sy[i] = oy - y2 * uy * s;
        ss[i] = z2;
      }

      shapes.begin(gl.drawingBufferWidth, gl.drawingBufferHeight);
      backdrop.field(BASE, blobs, 0.3, dpr);

      // links between neighbours in the volume, fading with distance
      links.fill(0);
      live.length = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (links[i] >= MAX_LINKS || links[j] >= MAX_LINKS) continue;
          const d = Math.hypot(px[i] - px[j], py[i] - py[j], pz[i] - pz[j]);
          if (d > LINK) continue;
          links[i]++;
          links[j]++;
          const depth = 0.55 + 0.45 * clamp01((ss[i] + ss[j]) * 0.25 + 0.5);
          const a = Math.pow(1 - d / LINK, 1.3) * 0.42 * depth;
          shapes.line(sx[i], sy[i], sx[j], sy[j], dpr, DOT, a, a);
          if (d < LINK * 0.7) live.push([i, j]);
        }
      }
      shapes.flush();

      // points: near ones larger, softer and dimmer, like a shallow focus
      for (let i = 0; i < n; i++) {
        const z = ss[i];
        const near = smooth(0.45, 1, z);
        const s = CAMERA / (CAMERA - z);
        const r = pts[i].size * sizeScale * s * s * (1 + near * 1.6) * dpr;
        const a = (0.5 + 0.35 * clamp01(z * 0.5 + 0.5)) * (1 - near * 0.55);
        if (near > 0.05) shapes.circle(sx[i], sy[i], r, DOT, a * 0.8, -r * near * 1.4);
        else shapes.circle(sx[i], sy[i], r, DOT, a);
      }

      // a small light running along one live link at a time; the link is
      // chosen when its run starts and the run skips if the link breaks
      const beat = Math.floor(time / 2.4);
      if (beat !== runBeat) {
        runBeat = beat;
        run = live.length ? live[(beat * 37 + 11) % live.length] : null;
      }
      if (run) {
        const [i, j] = run;
        const d = Math.hypot(px[i] - px[j], py[i] - py[j], pz[i] - pz[j]);
        const f = (time % 2.4) / 2.4;
        const e = f * f * (3 - 2 * f);
        const fade = (still ? 0.8 : Math.sin(Math.PI * f)) * smooth(LINK, LINK * 0.7, d);
        if (fade > 0.01) shapes.circle(sx[i] + (sx[j] - sx[i]) * e, sy[i] + (sy[j] - sy[i]) * e, 1.6 * dpr, LIGHT, 0.85 * fade);
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

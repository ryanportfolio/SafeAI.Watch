/*
 * Closing call to action: a grainy dark field with slow color weather.
 *
 * A dark olive ground carries a cool slate light near the center and warm
 * red glows that drift around the corners. The pointer leans the light
 * toward itself, gently. Every color stays dark enough that the cream
 * heading and buttons on top keep a contrast above 12:1.
 *
 * A quiet echo of the site's linework drifts in the open space: a few faint
 * cream points with hairline links, kept out of a padded box around the
 * heading, lead and buttons so the text never sits on them.
 */
import type { SceneFactory } from './runtime';
import { Shapes } from './shapes';
import { Backdrop, c255, grainSeed, random, type Blob } from './backdrop';

const BASE = c255(24, 26, 21);
const SLATE = c255(26, 36, 44);
const RED = c255(52, 22, 22);
const PLUM = c255(40, 22, 34);
const OLIVE = c255(34, 34, 22);
const CREAM = c255(236, 236, 226);

const POINTS = 40;
const PAD = 40;

interface Point {
  x: number;
  y: number;
  amp: number;
  freq: number;
  phase: number;
  size: number;
  a: number;
}

const closing: SceneFactory = ({ gl, slot, redraw }) => {
  const backdrop = new Backdrop(gl);
  const shapes = new Shapes(gl, POINTS * 2, POINTS);
  const inner = slot.parentElement?.querySelector<HTMLElement>('.closing-inner') ?? null;
  let W = 1;
  let H = 1;
  let dpr = 1;
  let aspect = 1;
  let aimX = 0;
  let aimY = 0;
  let px = 0;
  let py = 0;
  let last = -1;
  let gone = false;
  let pts: Point[] = [];
  let links: [number, number][] = [];

  const blobs: Blob[] = [
    { x: 0.5, y: 0.45, rx: 0.42, ry: 0.5, rgb: SLATE, a: 0.9 },
    { x: 0, y: 0, rx: 0.3, ry: 0.3, rgb: RED, a: 0.85 },
    { x: 1, y: 1, rx: 0.3, ry: 0.3, rgb: RED, a: 0.8 },
    { x: 0, y: 1, rx: 0.25, ry: 0.25, rgb: PLUM, a: 0.6 },
    { x: 0.55, y: 0.05, rx: 0.4, ry: 0.22, rgb: OLIVE, a: 0.7 },
  ];

  // Seeded points outside the padded text boxes (slot px); links that stay clear of them.
  function layout() {
    const s = slot.getBoundingClientRect();
    const boxes = [...(inner?.children ?? [])].map((el) => {
      const b = el.getBoundingClientRect();
      return [b.left - s.left - PAD, b.top - s.top - PAD, b.right - s.left + PAD, b.bottom - s.top + PAD];
    });
    const clear = (x: number, y: number, m: number) => boxes.every(([l, t, r, b]) => x < l - m || x > r + m || y < t - m || y > b + m);
    const r = random(5150);
    pts = [];
    for (let tries = 0; tries < 400 && pts.length < POINTS; tries++) {
      const p = { x: r() * W, y: r() * H, amp: 5 + 9 * r(), freq: 0.05 + 0.07 * r(), phase: r() * 6.3, size: 1.4 + 1.2 * r(), a: 0.1 + 0.02 * r() };
      if (clear(p.x, p.y, p.amp + p.size + 2)) pts.push(p);
    }
    // hairlines to the two nearest neighbours that are close and clear of every box, so
    // the points gather into small loose constellations; points left alone are dropped
    links = [];
    const reach = 0.16 * Math.max(W, H);
    const key = new Set<number>();
    const linked = new Uint8Array(pts.length);
    pts.forEach((p, i) => {
      const near = pts
        .map((q, j) => [Math.hypot(p.x - q.x, p.y - q.y), j])
        .filter(([d, j]) => j !== i && d < reach)
        .sort((u, v) => u[0] - v[0])
        .slice(0, 2);
      for (const [, j] of near) {
        const q = pts[j];
        const k = Math.min(i, j) * 64 + Math.max(i, j);
        if (key.has(k)) continue;
        let ok = true;
        for (let f = 0.1; f < 1 && ok; f += 0.1) ok = clear(p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f, 16);
        if (!ok) continue;
        key.add(k);
        links.push([i, j]);
        linked[i] = linked[j] = 1;
      }
    });
    pts = pts.filter((_, i) => linked[i]);
    const keep = new Map<number, number>();
    [...linked].forEach((v, i) => v && keep.set(i, keep.size));
    links = links.map(([i, j]) => [keep.get(i)!, keep.get(j)!]);
  }

  document.fonts?.ready.then(() => {
    if (gone) return;
    layout();
    redraw();
  });

  return {
    resize(w, h, ratio) {
      W = w;
      H = h;
      dpr = ratio;
      aspect = w / Math.max(1, h);
      layout();
    },

    pointer(x, y) {
      const inside = Math.abs(x) <= 1.2 && Math.abs(y) <= 1.2;
      aimX = inside ? x : 0;
      aimY = inside ? y : 0;
    },

    render(time, still) {
      const dt = last < 0 || still ? 0 : Math.max(0, time - last);
      last = time;
      const k = 1 - Math.exp(-dt * 1.2);
      px += (aimX - px) * k;
      py += (aimY - py) * k;

      // radii are fractions of the canvas; keep the glows round on wide and tall canvases
      const sx = aspect > 1 ? 1 / aspect : 1;
      const sy = aspect < 1 ? aspect : 1;
      const t = time;
      const [slate, redA, redB, plum, olive] = blobs;
      slate.x = 0.5 + 0.1 * Math.sin(t * 0.21) + px * 0.12;
      slate.y = 0.48 + 0.08 * Math.cos(t * 0.17) + py * 0.1;
      slate.rx = 0.62 * sx + 0.18;
      slate.ry = 0.62 * sy + 0.18;
      redA.x = 0.02 + 0.08 * Math.sin(t * 0.13 + 1) - px * 0.05;
      redA.y = 0.04 + 0.1 * Math.cos(t * 0.11);
      redA.rx = 0.34 * sx;
      redA.ry = 0.34 * sy;
      redA.a = 0.7 + 0.2 * Math.sin(t * 0.3);
      redB.x = 0.98 + 0.06 * Math.cos(t * 0.12 + 2) - px * 0.05;
      redB.y = 0.96 + 0.08 * Math.sin(t * 0.15);
      redB.rx = 0.38 * sx;
      redB.ry = 0.38 * sy;
      redB.a = 0.65 + 0.2 * Math.cos(t * 0.27);
      plum.x = 0.04 + 0.05 * Math.sin(t * 0.19 + 3);
      plum.y = 0.95;
      plum.rx = 0.3 * sx;
      plum.ry = 0.3 * sy;
      olive.x = 0.55 + 0.2 * Math.sin(t * 0.09 + 4);
      olive.ry = 0.26 * sy;
      olive.rx = 0.5 * sx + 0.1;

      shapes.begin(gl.drawingBufferWidth, gl.drawingBufferHeight);
      backdrop.field(BASE, blobs, 0.35, dpr);
      const at = (p: Point) => {
        const w = time * p.freq + p.phase;
        return [(p.x + Math.sin(w) * p.amp) * dpr, (p.y + Math.cos(w * 0.7) * p.amp) * dpr];
      };
      for (const [i, j] of links) {
        const [ax, ay] = at(pts[i]);
        const [bx, by] = at(pts[j]);
        shapes.line(ax, ay, bx, by, dpr, CREAM, 0.06, 0.06);
      }
      for (const p of pts) {
        const [x, y] = at(p);
        shapes.circle(x, y, p.size * dpr, CREAM, p.a);
      }
      shapes.flush();
      backdrop.grain(0.05, grainSeed(time, still), dpr);
    },

    dispose(contextLost) {
      gone = true;
      if (contextLost) return;
      shapes.dispose();
      backdrop.dispose();
    },
  };
};

export default closing;

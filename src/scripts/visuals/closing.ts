/*
 * Closing call to action: a grainy dark field with slow color weather.
 *
 * A dark olive ground carries a cool slate light near the center and warm
 * red glows that drift around the corners. The pointer leans the light
 * toward itself, gently. Every color stays dark enough that the cream
 * heading and buttons on top keep a contrast above 12:1.
 */
import type { SceneFactory } from './runtime';
import { Backdrop, c255, grainSeed, type Blob } from './backdrop';

const BASE = c255(24, 26, 21);
const SLATE = c255(26, 36, 44);
const RED = c255(52, 22, 22);
const PLUM = c255(40, 22, 34);
const OLIVE = c255(34, 34, 22);

const closing: SceneFactory = ({ gl }) => {
  const backdrop = new Backdrop(gl);
  let dpr = 1;
  let aspect = 1;
  let aimX = 0;
  let aimY = 0;
  let px = 0;
  let py = 0;
  let last = -1;

  const blobs: Blob[] = [
    { x: 0.5, y: 0.45, rx: 0.42, ry: 0.5, rgb: SLATE, a: 0.9 },
    { x: 0, y: 0, rx: 0.3, ry: 0.3, rgb: RED, a: 0.85 },
    { x: 1, y: 1, rx: 0.3, ry: 0.3, rgb: RED, a: 0.8 },
    { x: 0, y: 1, rx: 0.25, ry: 0.25, rgb: PLUM, a: 0.6 },
    { x: 0.55, y: 0.05, rx: 0.4, ry: 0.22, rgb: OLIVE, a: 0.7 },
  ];

  return {
    resize(w, h, ratio) {
      dpr = ratio;
      aspect = w / Math.max(1, h);
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

      backdrop.field(BASE, blobs, 0.35, dpr);
      backdrop.grain(0.05, grainSeed(time, still), dpr);
    },

    dispose(contextLost) {
      if (!contextLost) backdrop.dispose();
    },
  };
};

export default closing;

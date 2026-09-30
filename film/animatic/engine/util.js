// Pure helpers. Nothing here reads the clock or Math.random().

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
// Site curves (K30, K32): ease-out for arrivals, cubic ease-in-out for moves, ease-in for exits.
export const easeOut = (x) => { x = clamp(x); return 1 - (1 - x) ** 3; };
export const easeIn = (x) => { x = clamp(x); return x * x * x; };
export const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2; };

// 0 before a, rises over d with ease-out.
export const rise = (t, a, d) => easeOut((t - a) / d);
// Visible window: fades in at a over din, out at b over dout (ease-in exit).
export const windowAlpha = (t, a, b, din = 0.4, dout = 0.45) =>
  t < a || t >= b ? 0 : easeOut((t - a) / din) * (1 - easeIn((t - (b - dout)) / dout));

// Round the clock to 1 microsecond before comparing it with event times.
export const qt = (x) => Math.round(x * 1e6) / 1e6;

export function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hexRgb = (h) => [1, 3, 5].map((j) => parseInt(h.slice(j, j + 2), 16));
export const mixRgb = (a, b, t) => [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], t)));
export const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

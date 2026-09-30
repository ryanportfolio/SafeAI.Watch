// One eased camera over a CPU-projected chart plane (K34). Closed form in t: each keyframe
// eases from the pose the previous keyframe holds at its own start time, so any t gives the
// same pose after any seek. No springs, no per-frame lerp.
import { easeInOut, lerp } from './util.js';

export const STAGE_W = 1920;
export const STAGE_H = 1080;
const DIST = 2600; // camera distance in world units, for the tilted passages
const OY = -80; // frame the chart a little high so captions sit on open water

const KEYS = ['cx', 'cy', 'zoom', 'pitch'];

function held(k, t) {
  // A keyframe's pose plus its slow drift, evaluated at time t (after its move).
  const dt = Math.max(0, t - k.at);
  return { cx: k.pose.cx + (k.drift?.vx || 0) * dt, cy: k.pose.cy + (k.drift?.vy || 0) * dt, zoom: k.pose.zoom, pitch: k.pose.pitch };
}

export function makeCamera(keys) {
  const ks = keys.slice().sort((a, b) => a.at - b.at);
  // Start pose of each keyframe = the previous keyframe as it stood when this one began.
  // Computed once from the keyframes alone, so it is a constant, not carried frame state.
  const from = [];
  function poseAt(i, t) {
    const k = ks[i];
    if (i === 0) return held(k, t);
    const f = from[i];
    const u = easeInOut((t - k.at) / k.dur);
    const to = held(k, t);
    const p = {};
    for (const key of KEYS) p[key] = lerp(f[key], to[key], u);
    // zoom interpolates in log space so pull-backs feel even
    p.zoom = Math.exp(lerp(Math.log(f.zoom), Math.log(to.zoom), u));
    return p;
  }
  for (let i = 1; i < ks.length; i++) from[i] = poseAt(i - 1, ks[i].at);
  return {
    keys: ks,
    at(t, { still = false } = {}) {
      let i = 0;
      for (let j = 1; j < ks.length; j++) if (ks[j].at <= t) i = j;
      const p = still ? { ...ks[i].pose } : poseAt(i, t);
      // idle yaw sway, amplitude 0.05 (K48); none in the reduced-motion stills
      p.yaw = still ? 0 : 0.05 * Math.sin(t * 0.21) * 0.6;
      return p;
    },
  };
}

// Returns a projector for a pose: world (x, y, z up) -> stage px.
export function projector(p) {
  const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  return {
    pose: p,
    cp,
    point(x, y, z = 0) {
      const dx = x - p.cx, dy = y - p.cy;
      const xr = dx * cos - dy * sin;
      const yr = dx * sin + dy * cos;
      const depth = DIST - z * cp - yr * sp; // far side (yr < 0) recedes
      const f = DIST / Math.max(200, depth);
      return { x: STAGE_W / 2 + xr * p.zoom * f, y: STAGE_H / 2 + OY + (yr * cp - z * sp) * p.zoom * f, s: p.zoom * f };
    },
  };
}

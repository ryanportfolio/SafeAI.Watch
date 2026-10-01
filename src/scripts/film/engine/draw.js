// Flat canvas-2D primitives in stage pixels. Blocking level: lines, dashes, rings, dots,
// soft discs. No bloom, no grain, no fine detail.
import { rgba } from './util.js';

export function path(ctx, pts, { color, alpha = 1, width = 1.5, dash = null, offset = 0, cap = 'round' }) {
  if (alpha <= 0 || pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = width;
  ctx.lineCap = cap;
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash || []);
  ctx.lineDashOffset = offset;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

export const seg = (ctx, a, b, o) => path(ctx, [a, b], o);

export function dot(ctx, p, r, color, alpha = 1) {
  if (alpha <= 0 || r <= 0) return;
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Ring on the chart plane: flattened by the camera pitch (cp = cos pitch).
export function ring(ctx, p, r, { color, alpha = 1, width = 1.5, dash = null, cp = 1, from = 0, to = Math.PI * 2 }) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = width;
  ctx.setLineDash(dash || []);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, Math.max(0.5, r * cp), 0, from, to);
  ctx.stroke();
  ctx.restore();
}

export function glow(ctx, p, r, color, alpha = 1) {
  if (alpha <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
}

export function poly(ctx, pts, color, alpha = 1) {
  if (alpha <= 0 || pts.length < 3) return;
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

// Partial polyline: the first fraction u of its length (for lines that draw themselves).
export function partial(pts, u) {
  if (u >= 1) return pts;
  if (u <= 0 || pts.length < 2) return pts.slice(0, 1);
  let total = 0;
  const L = [0];
  for (let i = 1; i < pts.length; i++) { total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); L.push(total); }
  const want = total * u;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= want) { out.push(pts[i]); continue; }
    const k = (want - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k });
    break;
  }
  return out;
}

// The site's frame idiom (K27): dashed outline with solid corner ticks.
export function frame(ctx, corners, { color, alpha = 1, width = 1.5, tick = 14, dashAlpha = 0.45, gapSide = null, gap = null, solidSide = null, solid = 0 }) {
  if (alpha <= 0) return;
  const n = corners.length;
  for (let i = 0; i < n; i++) {
    const a = corners[i], b = corners[(i + 1) % n];
    if (gapSide === i && gap) {
      // leave an opening between gap[0] and gap[1] (fractions along the side)
      const at = (f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      seg(ctx, a, at(gap[0]), { color, alpha: alpha * dashAlpha, width, dash: [6, 6] });
      seg(ctx, at(gap[1]), b, { color, alpha: alpha * dashAlpha, width, dash: [6, 6] });
    } else seg(ctx, a, b, { color, alpha: alpha * dashAlpha, width, dash: [6, 6] });
    if (solidSide === i && solid > 0) {
      const at = (f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      seg(ctx, at(0.5 - 0.5 * solid), at(0.5 + 0.5 * solid), { color, alpha, width: width + 0.5 });
    }
  }
  for (let i = 0; i < n; i++) {
    const c = corners[i], p = corners[(i + n - 1) % n], q = corners[(i + 1) % n];
    for (const o of [p, q]) {
      const d = Math.hypot(o.x - c.x, o.y - c.y) || 1;
      seg(ctx, c, { x: c.x + ((o.x - c.x) / d) * tick, y: c.y + ((o.y - c.y) / d) * tick }, { color, alpha, width: width + 0.5, cap: 'butt' });
    }
  }
}

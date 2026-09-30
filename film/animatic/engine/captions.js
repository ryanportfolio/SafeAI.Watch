// Text layer: every on-screen string, drawn on its own 2D canvas that is composited into the
// frame (so it reaches the video export). Strings come only from beats.json.
// Type (K19, K22, K24): statements Newsreader 400 with tight tracking, italic runs from the
// lowercase subset (K21); precision lines Geist at ink-64; labels Geist Mono uppercase, 0.1em.
import { clamp, lerp, easeOut, easeIn, easeInOut, windowAlpha, rgba } from './util.js';
import { dot, ring, glow, seg, frame } from './draw.js';
import { STAGE_W, STAGE_H } from './camera.js';

export const FONTS = {
  serif: 'Newsreader',
  sans: 'Geist',
  mono: 'Geist Mono',
};

const ST = { size: 62, lead: 1.12, track: -0.02, x: 120, maxW: 1320, base: 872 };
const PR = { size: 26, lead: 36, maxW: 1320, gap: 60 };
const MONO = { size: 21, track: 0.1 };
const EXIT = 0.45;
const STAGGER = 0.07;

// label dot colour follows the row's own side: H happened, P progress, B benefit, L policy
const ROW_COL = { H: 'orange', P: 'olive', B: 'amber', L: 'blue' };
const TYPE_COL = { benefit: 'amber', happened: 'orange', 'shown-in-test': 'ink', warning: 'ink', progress: 'olive', policy: 'blue', unknown: 'ink', perspective: 'ink', owner: 'ink', site: 'ink' };

// ---------- layout (pure; memoised on text, which is constant once fonts have loaded) ----------

const memo = new Map();
function font(ctx, italic, size) {
  ctx.font = `${italic ? 'italic ' : ''}400 ${size}px ${FONTS.serif}`;
  ctx.letterSpacing = `${(ST.track * size).toFixed(2)}px`;
}

function tokens(text, italicRuns, caret) {
  const ranges = [];
  for (const run of italicRuns || []) { const i = text.indexOf(run); if (i >= 0) ranges.push([i, i + run.length]); }
  const cr = caret ? [text.indexOf(caret), text.indexOf(caret) + caret.length] : null;
  const out = [];
  let pos = 0;
  for (const w of text.split(' ')) {
    const start = text.indexOf(w, pos);
    pos = start + w.length;
    out.push({ w, italic: ranges.some(([a, b]) => start >= a && start < b), inserted: !!cr && start >= cr[0] && start < cr[1] });
  }
  return out;
}

function wrap(widths, space, maxW) {
  const lines = [[]];
  let cur = 0;
  widths.forEach((w, i) => {
    const add = lines.at(-1).length ? space + w : w;
    if (lines.at(-1).length && cur + add > maxW) { lines.push([i]); cur = w; } else { lines.at(-1).push(i); cur += add; }
  });
  return lines;
}

// Balanced wrap: the narrowest measure that keeps the line count, and never a one-word last line.
function balance(widths, space, maxW) {
  const base = wrap(widths, space, maxW);
  let best = base;
  for (let w = maxW; w > maxW * 0.45; w -= 10) {
    const l = wrap(widths, space, w);
    if (l.length !== base.length) break;
    best = l;
  }
  if (best.length > 1 && best.at(-1).length < 2) {
    for (let w = maxW; w > maxW * 0.4; w -= 10) { const l = wrap(widths, space, w); if (l.at(-1).length >= 2 && l.length <= base.length + 1) { best = l; break; } }
  }
  return best;
}

function place(ctx, toks, size, quote, maxW) {
  const lineH = size * ST.lead;
  font(ctx, false, size);
  const space = ctx.measureText(' ').width;
  const qOpen = ctx.measureText('“').width;
  const widths = toks.map((k, i) => {
    font(ctx, k.italic, size);
    let w = ctx.measureText(k.w).width;
    font(ctx, false, size);
    if (quote && i === toks.length - 1) w += ctx.measureText('”').width;
    return w;
  });
  const lines = balance(widths, space, maxW);
  const pos = new Array(toks.length);
  lines.forEach((ln, li) => {
    let x = 0;
    ln.forEach((i) => { pos[i] = { x, line: li, w: widths[i] }; x += widths[i] + space; });
  });
  const width = Math.max(...lines.map((ln) => ln.reduce((s, i) => s + widths[i], 0) + space * (ln.length - 1)));
  return { pos, lines: lines.length, lineH, width, qOpen };
}

function statementLayout(ctx, key, st, caret, size, maxW) {
  const k = `${key}|${size}|${maxW}`;
  if (memo.has(k)) return memo.get(k);
  const toks = tokens(st.text, st.italic, caret);
  const full = place(ctx, toks, size, st.quote, maxW);
  let base = null;
  if (caret) {
    const idx = toks.map((t, i) => (t.inserted ? -1 : i)).filter((i) => i >= 0);
    const L = place(ctx, idx.map((i) => toks[i]), size, st.quote, maxW);
    base = { ...L, pos: toks.map((t, i) => (t.inserted ? null : L.pos[idx.indexOf(i)])) };
    // caret sits where the insertion starts: just after the last base word before it
    const firstIns = toks.findIndex((t) => t.inserted);
    const prev = base.pos[firstIns - 1];
    base.caretAt = prev ? { x: prev.x + prev.w + 8, line: prev.line } : { x: 0, line: 0 };
  }
  const out = { toks, full, base };
  memo.set(k, out);
  return out;
}

function wrapPlain(ctx, text, maxW) {
  const words = text.split(' ');
  const space = ctx.measureText(' ').width;
  const lines = wrap(words.map((w) => ctx.measureText(w).width), space, maxW);
  return lines.map((ln) => ln.map((i) => words[i]).join(' '));
}

// ---------- drawing ----------

function monoFont(ctx, size = MONO.size, weight = 500) {
  ctx.font = `${weight} ${size}px "${FONTS.mono}"`;
  ctx.letterSpacing = `${(MONO.track * size).toFixed(2)}px`;
}

function chipLabel(ctx, text, x, y, { alpha, pal, dotCol, alignRight = false, plain = false, textCol = null }) {
  if (alpha <= 0) return null;
  monoFont(ctx);
  const s = text.toUpperCase();
  const tw = ctx.measureText(s).width;
  const padX = 12, h = 34, dotW = dotCol ? 16 : 0;
  const w = tw + padX * 2 + dotW;
  const x0 = clamp(alignRight ? x - w : x, 24, STAGE_W - 24 - w);
  const y0 = y - h / 2;
  if (!plain) {
    ctx.fillStyle = rgba(pal.chip, 0.92 * alpha);
    ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 2); ctx.fill();
  }
  if (dotCol) dot(ctx, { x: x0 + padX + 4, y }, 4.5, dotCol, alpha);
  ctx.fillStyle = rgba(textCol || pal.ink, (plain ? 0.8 : 0.78) * alpha);
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x0 + padX + dotW, y + 1);
  ctx.textBaseline = 'alphabetic';
  return { x0, y0, w, h };
}

function drawStatement(ctx, beat, t, pal, opts) {
  const st = beat.statement;
  const isEnd = opts.endcard;
  const size = isEnd ? 76 : ST.size;
  const maxW = isEnd ? 1400 : ST.maxW;
  const L = statementLayout(ctx, beat.id, st, opts.caret, size, maxW);
  const out = isEnd ? 1 : 1 - easeIn((t - (beat.end - EXIT)) / EXIT);
  if (t < st.at || out <= 0) return L;
  const nBase = L.toks.filter((k) => !k.inserted).length;
  const caretT = st.at + nBase * STAGGER + 0.5;
  const move = opts.caret && !opts.rm ? easeInOut((t - (caretT + 0.3)) / 0.5) : 1;
  const useFull = !opts.caret || opts.rm || move > 0;
  const Lx = useFull ? L.full : L.base;
  const bottom = isEnd ? 560 : ST.base;
  const lineY = (Lay, li) => (isEnd ? bottom - (Lay.lines - 1 - li) * Lay.lineH : bottom - (Lay.lines - 1 - li) * Lay.lineH);
  const originX = (Lay) => (isEnd ? STAGE_W / 2 - Lay.width / 2 : ST.x);
  let bi = 0;
  L.toks.forEach((k, i) => {
    let a, dy = 0, x, y;
    const pf = L.full.pos[i];
    if (k.inserted) {
      if (opts.rm) a = windowAlpha(t, st.at, Infinity, 0.4);
      else a = easeOut((t - (caretT + 0.5)) / 0.4);
      x = originX(L.full) + pf.x; y = lineY(L.full, pf.line);
    } else {
      if (opts.rm) a = easeOut((t - st.at) / 0.4);
      else { const p = easeOut((t - st.at - bi * STAGGER) / 0.4); a = p; dy = (1 - p) * 8; }
      bi++;
      if (opts.caret && !opts.rm && L.base) {
        const pb = L.base.pos[i];
        const xa = originX(L.base) + pb.x, ya = lineY(L.base, pb.line);
        const xb = originX(L.full) + pf.x, yb = lineY(L.full, pf.line);
        x = lerp(xa, xb, move); y = lerp(ya, yb, move); // moved words travel as one group
      } else { x = originX(Lx) + pf.x; y = lineY(Lx, pf.line); }
    }
    a *= out;
    if (a <= 0) return;
    const col = k.inserted ? pal.blue : isEnd ? pal.cream : pal.ink;
    font(ctx, k.italic, size);
    ctx.fillStyle = rgba(col, a * (opts.faint ? 0.45 : 1));
    let w = k.w;
    if (st.quote && i === 0) { font(ctx, false, size); ctx.fillText('“', x - L.full.qOpen, y + dy); font(ctx, k.italic, size); }
    ctx.fillText(w, x, y + dy);
    if (st.quote && i === L.toks.length - 1) { const ww = ctx.measureText(w).width; font(ctx, false, size); ctx.fillText('”', x + ww, y + dy); }
  });
  // the blue caret (graft 1): marks the insertion point, then fades once the limit is in
  if (opts.caret && !opts.rm && L.base) {
    const ca = easeOut((t - caretT) / 0.2) * (1 - easeIn((t - (caretT + 1.1)) / 0.4)) * out;
    if (ca > 0) {
      const c = L.base.caretAt;
      const x = originX(L.base) + c.x, y = lineY(L.base, c.line) + 14;
      ctx.strokeStyle = rgba(pal.blue, ca);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 11, y + 14); ctx.lineTo(x, y); ctx.lineTo(x + 11, y + 14); ctx.stroke();
    }
  }
  return L;
}

function drawPrecision(ctx, beat, t, pal, opts, L) {
  const pr = beat.precision;
  if (!pr || t < pr.at) return;
  const out = opts.endcard ? 1 : 1 - easeIn((t - (beat.end - EXIT)) / EXIT);
  const a = easeOut((t - pr.at) / 0.4) * out;
  if (a <= 0) return;
  if (opts.endcard) {
    monoFont(ctx);
    ctx.fillStyle = rgba(pal.cream, 0.6 * a);
    const s = pr.text.toUpperCase();
    ctx.fillText(s, STAGE_W / 2 - ctx.measureText(s).width / 2, 720);
    return;
  }
  const serif = pr.owner === true; // the owner's second line keeps the statement face
  const size = serif ? 44 : PR.size;
  if (serif) font(ctx, false, size); else { ctx.font = `400 ${size}px ${FONTS.sans}`; ctx.letterSpacing = '0px'; }
  const lines = wrapPlain(ctx, pr.text, PR.maxW);
  ctx.fillStyle = rgba(pal.ink, (serif ? 0.92 : 0.64 + 0.18 * pal.dusk) * a);
  lines.forEach((ln, i) => ctx.fillText(ln, ST.x, ST.base + (serif ? 68 : PR.gap) + i * (serif ? 50 : PR.lead)));
}

const KEY_ORDER = ['BENEFITS', 'REPORTED INCIDENTS', 'CONTROLLED TEST', 'SAFEGUARDS', 'POLICY & OVERSIGHT'];
const KEY_BOX = { x: 1488, y: 800, w: 372, row: 36 };
function keySymbol(ctx, label, p, pal, a) {
  switch (label) {
    case 'BENEFITS': glow(ctx, p, 13, pal.amber, 0.4 * a); dot(ctx, p, 4.5, pal.amber, a); break;
    case 'REPORTED INCIDENTS': dot(ctx, p, 4, pal.orange, a); ring(ctx, p, 10, { color: pal.orange, alpha: a, width: 1.4, dash: [2, 3] }); break;
    case 'CONTROLLED TEST': frame(ctx, [{ x: p.x - 10, y: p.y - 8 }, { x: p.x + 10, y: p.y - 8 }, { x: p.x + 10, y: p.y + 8 }, { x: p.x - 10, y: p.y + 8 }], { color: pal.ink, alpha: a, width: 1.2, tick: 5, dashAlpha: 0.6 }); break;
    case 'PUBLIC WARNINGS': seg(ctx, { x: p.x - 11, y: p.y + 6 }, { x: p.x + 11, y: p.y - 6 }, { color: pal.ink, alpha: a * 0.8, width: 1.3, dash: [3, 3] }); break;
    case 'SAFEGUARDS': ring(ctx, p, 8, { color: pal.olive, alpha: a, width: 2 }); break;
    default: dot(ctx, p, 4.5, pal.blue, a); ring(ctx, p, 9, { color: pal.blue, alpha: a * 0.6, width: 1.2 });
  }
}

function drawKey(ctx, beats, t, pal, close) {
  const keys = [];
  for (const b of beats) (b.extra || []).forEach((e) => { if (e.role === 'key') keys.push(e); });
  const first = Math.min(...keys.map((k) => k.at));
  const boxA = easeOut((t - first) / 0.5) * (1 - close);
  if (boxA <= 0) return;
  const shown = keys.reduce((s, k) => s + easeOut((t - k.at) / 0.4), 0);
  const h = shown * KEY_BOX.row + 20;
  const y0 = KEY_BOX.y;
  frame(ctx, [{ x: KEY_BOX.x, y: y0 }, { x: KEY_BOX.x + KEY_BOX.w, y: y0 }, { x: KEY_BOX.x + KEY_BOX.w, y: y0 + h }, { x: KEY_BOX.x, y: y0 + h }], { color: pal.ink, alpha: 0.7 * boxA, width: 1.2, tick: 10, dashAlpha: 0.5 });
  for (const k of keys) {
    const i = KEY_ORDER.indexOf(k.text);
    const a = easeOut((t - k.at) / 0.4) * (1 - close);
    if (a <= 0 || i < 0) continue;
    const y = y0 + 10 + KEY_BOX.row * i + KEY_BOX.row / 2;
    keySymbol(ctx, k.text, { x: KEY_BOX.x + 28, y }, pal, a);
    chipLabel(ctx, k.text, KEY_BOX.x + 46, y, { alpha: a, pal, plain: true });
  }
}

// The one-word answers: two identical chips that cover the whole map, one half each; they
// arrive in the same frame and lift in the same frame to reveal the chart.
function drawChips(ctx, beat, t, pal, opts, env) {
  const chips = (beat.extra || []).map((e, i) => ({ e, i })).filter((x) => x.e.role === 'chip');
  if (!chips.length) return;
  const lift = env.cues.lift;
  // project both halves, then give both chips one shared size so they stay identical
  const rects = chips.map(({ i }) => {
    const an = env.anchorFor(beat.id, i);
    if (!an?.rect) return null;
    const [x0, y0, x1, y1] = an.rect;
    const a0 = env.pr.point(x0, y0), a1 = env.pr.point(x1, y1);
    return { cx: (a0.x + a1.x) / 2, w: Math.abs(a1.x - a0.x), T: Math.min(a0.y, a1.y), B: Math.max(a0.y, a1.y) };
  });
  if (rects.some((r) => !r)) return;
  const CW = Math.min(...rects.map((r) => r.w)) - 16, CT = Math.min(...rects.map((r) => r.T)) + 8, CB = Math.max(...rects.map((r) => r.B)) - 8;
  for (const [n, { e }] of chips.entries()) {
    const aIn = easeOut((t - e.at) / (opts.rm ? 0.4 : 0.7));
    const aOut = 1 - easeIn((t - lift) / (opts.rm ? 0.4 : 1.0));
    const a = clamp(aIn * aOut);
    if (a <= 0) continue;
    const dy = opts.rm ? 0 : (1 - aIn) * -12 + (1 - aOut) * -28;
    const L = rects[n].cx - CW / 2, R = rects[n].cx + CW / 2, T = CT, B = CB;
    ctx.fillStyle = rgba(pal.chip, a);
    ctx.beginPath(); ctx.roundRect(L, T + dy, R - L, B - T, 2); ctx.fill();
    ctx.strokeStyle = rgba(pal.ink, 0.25 * a); ctx.lineWidth = 1.2; ctx.stroke();
    monoFont(ctx, 40);
    ctx.fillStyle = rgba(pal.ink, 0.85 * a);
    ctx.textBaseline = 'middle';
    const s = e.text.toUpperCase();
    ctx.fillText(s, (L + R) / 2 - ctx.measureText(s).width / 2, (T + B) / 2 - 90 + dy);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawLabels(ctx, beat, t, pal, opts, env) {
  (beat.extra || []).forEach((e, i) => {
    if (['key', 'chip', 'wordmark', 'tagline'].includes(e.role)) return;
    const an = env.anchorFor(beat.id, i);
    if (!an) return;
    const a = windowAlpha(t, e.at, beat.end, 0.4, EXIT);
    if (a <= 0) return;
    const q = env.pr.point(an.w.x, an.w.y);
    const lx = q.x + (an.dx || 0), ly = q.y + (an.dy || 0);
    const colName = an.col || (e.role === 'station' || e.role === 'buoy') && 'blue' || ROW_COL[(e.rows || [''])[0][0]] || TYPE_COL[beat.type];
    const dotCol = e.role === 'station' || e.role === 'note' ? null : pal[colName];
    const r = chipLabel(ctx, e.text, lx, ly, { alpha: a, pal, dotCol, alignRight: an.alignRight, plain: e.role === 'station' || e.role === 'note', textCol: e.role === 'station' ? pal.blue : null });
    // leader to the nearest point of the chip, drawn after it so it ends at the chip's edge
    if (r && e.role !== 'station') seg(ctx, q, { x: clamp(q.x, r.x0, r.x0 + r.w), y: clamp(q.y, r.y0, r.y0 + r.h) }, { color: pal.ink, alpha: 0.34 * a, width: 1.2, dash: [3, 4] });
  });
}

function drawEndCard(ctx, beat, t, pal) {
  (beat.extra || []).forEach((e) => {
    const a = easeOut((t - e.at) / 0.5);
    if (a <= 0) return;
    if (e.role === 'wordmark') {
      ctx.font = `500 34px ${FONTS.sans}`;
      ctx.letterSpacing = '-0.34px';
      ctx.fillStyle = rgba(pal.cream, a);
      ctx.fillText(e.text, STAGE_W / 2 - ctx.measureText(e.text).width / 2, 640);
    } else if (e.role === 'tagline') {
      monoFont(ctx);
      const s = e.text.toUpperCase();
      ctx.fillStyle = rgba(pal.cream, 0.6 * a);
      ctx.fillText(s, STAGE_W / 2 - ctx.measureText(s).width / 2, 756);
    }
  });
}

// Caption scrim: open water under the captions, the ground colour rising from the bottom.
function scrim(ctx, pal) {
  const a = 1 - pal.close;
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, 560, 0, STAGE_H);
  g.addColorStop(0, rgba(pal.ground, 0));
  g.addColorStop(0.45, rgba(pal.ground, 0.78 * a));
  g.addColorStop(1, rgba(pal.ground, 0.9 * a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 560, STAGE_W, STAGE_H - 560);
}

export function drawText(ctx, data, t, pal, env) {
  ctx.clearRect(0, 0, STAGE_W, STAGE_H);
  scrim(ctx, pal);
  drawKey(ctx, data.beats, t, pal, pal.close);
  const beat = data.beats.find((b) => t >= b.start && t < b.end) || data.beats.at(-1);
  const opts = { rm: env.rm, caret: env.carets[beat.id], endcard: beat.type === 'site', faint: !!env.faint?.[beat.id] };
  drawLabels(ctx, beat, t, pal, opts, env);
  drawChips(ctx, beat, t, pal, opts, env);
  const L = drawStatement(ctx, beat, t, pal, opts);
  drawPrecision(ctx, beat, t, pal, opts, L);
  if (opts.endcard) drawEndCard(ctx, beat, t, pal);
}

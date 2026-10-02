/*
 * README panels, generated from src/data/events.json.
 *
 * CONSTRAINT CONTRACT (read before editing the art)
 * - Conceit: the homepage burst, rebuilt from the record. One dot per entry, no more
 *   and no fewer. Category picks the quadrant and the colour; the entry's date picks
 *   its distance from the centre, on a linear scale from the first entry to the latest.
 *   The burst thickening at its edge is the record's real pace, not a style.
 * - Dashed rings mark January 1 of each year after the first entry. Nothing else in
 *   the burst carries meaning, and nothing decorative may look like data: dots are
 *   one size, spokes one weight.
 * - Every number printed (entries, per-category counts, publishers, date range, the
 *   latest entry) comes from facts.mjs; verify.mjs recounts the drawn dots.
 * - Survives 390px: the narrow variant is its own stacked composition.
 * - Survives both themes: each panel paints the site's own card (paper in light,
 *   the dark card in dark), so colours never depend on GitHub's background.
 * - Survives no scripts, no hover, no web fonts: system font stacks only, the brand
 *   mark is a path, and the draw-in loops (16 s) because nothing can trigger it.
 *   Authored state is the finished burst; prefers-reduced-motion turns animation off
 *   and leaves the finished burst.
 * - Site copy is reused verbatim where it exists (headline, lede); no claims beyond it.
 */
import { CATEGORIES, longDate, monthYear } from './facts.mjs';
import { ASSETS, MONO, SANS, SERIF, THEMES, esc, r1, svg, wrap, write } from './lib.mjs';

// The S mark from src/assets/brand/mark-small.svg (32 x 32), drawn as a path.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';
const MARK_D = /\sd="([^"]+)"/.exec(fs.readFileSync(path.join(ROOT, 'src/assets/brand/mark-small.svg'), 'utf8'))[1];

export const HEADLINE = 'Keeping watch on AI';
export const LEDE = 'A dated record of AI safety and security research, incidents, warnings, and policy. Each entry links its original source and separates what happened from what remains uncertain.';

/** How to read the burst, printed under the stats. */
export const KEY = 'ONE DOT PER ENTRY · FARTHER OUT = NEWER';

const LOOP = 16; // seconds
const DRAW_START = 0.6;
const DRAW_END = 8.2;
const HOLD_END = 13.4;
const FADE_END = 14.2;

const QUADRANT = { Warnings: -90, Incidents: 0, Governance: 90, Research: 180 }; // start angle, clockwise from 12 o'clock is -90

const pct = (s) => r1((s / LOOP) * 100);

function placeDots(facts, R, r0) {
  const t0 = Date.parse(facts.first);
  const t1 = Date.parse(facts.last);
  const span = Math.max(1, t1 - t0);
  const radius = (iso) => r0 + (R - r0) * ((Date.parse(iso) - t0) / span);
  const dots = [];
  for (const cat of CATEGORIES) {
    const list = facts.events.filter((e) => e.category === cat);
    const gap = 9; // degrees kept clear at each quadrant edge
    const from = QUADRANT[cat] + gap;
    const width = 90 - 2 * gap;
    // Golden-ratio spread inside the quadrant: even coverage with no angular order,
    // so angle carries no meaning beyond the quadrant and only distance encodes time.
    list.forEach((e, k) => {
      const a = ((from + width * ((0.5 + k * 0.6180339887) % 1)) * Math.PI) / 180;
      const r = radius(e.date);
      dots.push({ e, cat, x: Math.cos(a) * r, y: Math.sin(a) * r });
    });
  }
  const rank = new Map(facts.events.map((e, i) => [e, i]));
  for (const d of dots) d.rank = rank.get(d.e);
  const rings = [];
  for (let y = Number(facts.first.slice(0, 4)) + 1; y <= Number(facts.last.slice(0, 4)); y++) rings.push({ year: y, r: radius(`${y}-01-01`) });
  return { dots, rings };
}

function css(t, n) {
  const rules = [];
  for (let i = 0; i < n; i++) {
    const at = DRAW_START + ((DRAW_END - DRAW_START) * i) / Math.max(1, n - 1);
    rules.push(`@keyframes d${i}{0%,${pct(at)}%{opacity:0}${pct(at + 0.35)}%,${pct(HOLD_END)}%{opacity:1}${pct(FADE_END)}%,100%{opacity:0}}.d${i}{animation:d${i} ${LOOP}s linear infinite}`);
  }
  rules.push(`@keyframes call{0%,${pct(DRAW_END)}%{opacity:0}${pct(DRAW_END + 0.4)}%,${pct(HOLD_END)}%{opacity:1}${pct(FADE_END)}%,100%{opacity:0}}.call{animation:call ${LOOP}s linear infinite}`);
  return `text{font-kerning:normal}.serif{font-family:${SERIF}}.sans{font-family:${SANS}}.mono{font-family:${MONO};letter-spacing:.08em}
${rules.join('\n')}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
}

function burst(t, facts, cx, cy, R, small) {
  const { dots, rings } = placeDots(facts, R, small ? 10 : 14);
  const out = [];
  for (const ring of rings) {
    out.push(`<circle cx="${cx}" cy="${cy}" r="${r1(ring.r)}" fill="none" stroke="${t.rule}" stroke-width="1" stroke-dasharray="2 4" opacity=".7"/>`);
  }
  for (const d of dots) {
    const x = r1(cx + d.x);
    const y = r1(cy + d.y);
    out.push(`<g class="d${d.rank}" data-cat="${d.cat}"><line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${t.spoke}" stroke-width=".8"/><circle cx="${x}" cy="${y}" r="${small ? 3.6 : 4.2}" fill="${t.cat[d.cat]}"/></g>`);
  }
  // Year labels sit at 12 o'clock, in the gap kept clear between the Research and
  // Warnings quadrants, drawn last on a knockout so no spoke runs through them.
  for (const ring of rings) {
    const fs = small ? 8.5 : 9.5;
    const w = 4 * fs * 0.68 + 6;
    out.push(`<rect x="${r1(cx - w / 2)}" y="${r1(cy - ring.r - fs / 2 - 1)}" width="${r1(w)}" height="${fs + 2}" fill="${t.field}"/><text class="mono" x="${cx}" y="${r1(cy - ring.r + fs * 0.36)}" font-size="${fs}" text-anchor="middle" fill="${t.label}">${ring.year}</text>`);
  }
  out.push(`<circle cx="${cx}" cy="${cy}" r="2.4" fill="${t.ink}"/>`);
  const latest = dots.find((d) => d.e === facts.latest);
  return { svg: out.join('\n'), latest: { x: cx + latest.x, y: cy + latest.y, cat: latest.cat } };
}

function legend(t, facts, x, y, colW, rowH) {
  return CATEGORIES.map((c, i) => {
    const lx = x + (i % 2) * colW;
    const ly = y + Math.floor(i / 2) * rowH;
    return `<circle cx="${lx + 4}" cy="${ly - 3.5}" r="4.2" fill="${t.cat[c]}"/><text class="mono" x="${lx + 14}" y="${ly}" font-size="10.5" fill="${t.ink}">${c.toUpperCase()} <tspan fill="${t.mute}">${facts.byCategory[c]}</tspan></text>`;
  }).join('\n');
}

function eyebrow(t, x, y) {
  return `<g transform="translate(${x} ${y - 17}) scale(.6875)"><path d="${MARK_D}" fill="${t.ink}" fill-rule="evenodd"/></g>
<text class="serif" x="${x + 30}" y="${y}" font-size="19" fill="${t.ink}">SafeAI.watch</text>`;
}

/*
 * Label for the newest entry. The box hangs above the dot, right-aligned no further
 * than `right`, and a short dashed leader drops from the box to the dot.
 */
function callout(t, facts, from, right, y) {
  const label = `LATEST · ${longDate(facts.latest.date).toUpperCase()} · ${facts.latest.category.toUpperCase()}`;
  // Mono advance is 0.6 em plus the .08 em letter-spacing set on .mono.
  const w = Math.ceil(label.length * 10 * 0.68) + 30;
  const bx = Math.min(right - w, from.x - w / 2);
  const ex = Math.max(bx + 8, Math.min(from.x, bx + w - 8));
  return `<g class="call"><path d="M${r1(from.x)} ${r1(from.y - 5)} L${r1(ex)} ${r1(y + 11)}" stroke="${t.cat[from.cat]}" stroke-width="1" stroke-dasharray="2 2" fill="none"/>
<rect x="${r1(bx)}" y="${y - 11}" width="${w}" height="22" fill="${t.field}" stroke="${t.rule}" stroke-width="1"/>
<circle cx="${r1(bx + 11)}" cy="${y}" r="3.4" fill="${t.cat[from.cat]}"/>
<text class="mono" x="${r1(bx + 20)}" y="${y + 3.5}" font-size="10" fill="${t.ink}">${esc(label)}</text></g>`;
}

function frame(t, w, h) {
  // The site's dashed card outline, with crop marks at the corners like its secondary button.
  const m = 6;
  const L = 12;
  const corners = [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]
    .map(([x, y, sx, sy]) => `<path d="M${x} ${y + sy * L}V${y}H${x + sx * L}" fill="none" stroke="${t.ink}" stroke-width="1.4"/>`).join('');
  return `<rect x="0" y="0" width="${w}" height="${h}" rx="0" fill="${t.field}"/>
<rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" fill="none" stroke="${t.rule}" stroke-width="1" stroke-dasharray="3 3"/>
${corners}`;
}

export function masthead(t, facts, narrow) {
  const label = `${HEADLINE}. A burst chart of the SafeAI.watch record: ${facts.entries} dated, sourced entries from ${monthYear(facts.first)} to ${monthYear(facts.last)}, one dot each: ${CATEGORIES.map((c) => `${facts.byCategory[c]} ${c.toLowerCase()}`).join(', ')}. Distance from the centre is the entry's date, so the record thickens toward ${facts.last.slice(0, 4)}.`;
  const stats = `${facts.entries} ENTRIES · ${facts.publishers} PUBLISHERS · ${monthYear(facts.first).toUpperCase()} TO ${monthYear(facts.last).toUpperCase()}`;
  if (!narrow) {
    const W = 880, H = 460;
    const ledeLines = wrap(LEDE, 380, 16.5);
    const b = burst(t, facts, 652, 222, 158, false);
    const statsY = 190 + ledeLines.length * 25 + 22;
    const body = [
      frame(t, W, H),
      eyebrow(t, 44, 62),
      `<text class="serif" x="42" y="146" font-size="47" fill="${t.ink}" letter-spacing="-.5">${esc(HEADLINE)}</text>`,
      ...ledeLines.map((l, i) => `<text class="serif" x="44" y="${190 + i * 25}" font-size="17.5" fill="${t.mute}">${esc(l)}</text>`),
      `<text class="mono" x="44" y="${statsY}" font-size="10" fill="${t.label}">${esc(stats)}</text>`,
      `<text class="mono" x="44" y="${statsY + 17}" font-size="10" fill="${t.label}">${esc(KEY)}</text>`,
      legend(t, facts, 44, 392, 170, 26),
      b.svg,
      callout(t, facts, b.latest, 846, 34),
    ].join('\n');
    return svg(W, H, label, css(t, facts.entries), body);
  }
  const W = 390, H = 760;
  const ledeLines = wrap(LEDE, 320, 15.5);
  const top = 120;
  const after = top + 36 + ledeLines.length * 22; // baseline one line below the lede
  const callY = after + 8; // callout box spans callY - 11 to callY + 11
  const cy = callY + 52 + 140;
  const b = burst(t, facts, W / 2, cy, 140, true);
  const body = [
    frame(t, W, H),
    eyebrow(t, 32, 54),
    `<text class="serif" x="30" y="${top}" font-size="35" fill="${t.ink}" letter-spacing="-.4">${esc(HEADLINE)}</text>`,
    ...ledeLines.map((l, i) => `<text class="serif" x="32" y="${top + 36 + i * 22}" font-size="16" fill="${t.mute}">${esc(l)}</text>`),
    b.svg,
    callout(t, facts, b.latest, W - 22, callY),
    `<text class="mono" x="32" y="${H - 100}" font-size="9" fill="${t.label}">${esc(stats)}</text>`,
    `<text class="mono" x="32" y="${H - 85}" font-size="9" fill="${t.label}">${esc(KEY)}</text>`,
    legend(t, facts, 32, H - 56, 170, 24),
  ].join('\n');
  return svg(W, H, label, css(t, facts.entries), body);
}

export function buildPanels(facts) {
  const files = [];
  for (const theme of ['light', 'dark']) {
    for (const narrow of [false, true]) {
      const name = `masthead${narrow ? '-narrow' : ''}-${theme}.svg`;
      write(`${ASSETS}/${name}`, masthead(THEMES[theme], facts, narrow));
      files.push(`${ASSETS}/${name}`);
    }
  }
  return files;
}

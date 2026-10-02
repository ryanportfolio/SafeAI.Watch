// Recounts what the panels drew and compares it with the record. Every panel that
// prints a number is listed in NEED; a mismatch exits non-zero.
import fs from 'node:fs';
import path from 'node:path';
import { CATEGORIES, monthYear } from './facts.mjs';
import { KEY } from './panels.mjs';
import { ASSETS } from './lib.mjs';

const NEED = ['masthead-light', 'masthead-dark', 'masthead-narrow-light', 'masthead-narrow-dark'];

export function checkPanels(facts, root) {
  const bad = [];
  for (const name of NEED) {
    const file = path.join(root, ASSETS, `${name}.svg`);
    if (!fs.existsSync(file)) { bad.push(`${name}: missing`); continue; }
    const text = fs.readFileSync(file, 'utf8');
    const dots = [...text.matchAll(/<g class="d(\d+)" data-cat="([A-Za-z]+)">/g)];
    if (dots.length !== facts.entries) bad.push(`${name}: ${dots.length} dots drawn, record has ${facts.entries}`);
    const ranks = new Set(dots.map((m) => Number(m[1])));
    if (ranks.size !== dots.length || Math.max(...ranks) !== facts.entries - 1) bad.push(`${name}: dot ranks are not 0..${facts.entries - 1} exactly once`);
    for (const c of CATEGORIES) {
      const n = dots.filter((m) => m[2] === c).length;
      if (n !== facts.byCategory[c]) bad.push(`${name}: ${n} ${c} dots, record has ${facts.byCategory[c]}`);
      if (!new RegExp(`>${c.toUpperCase()} <tspan[^>]*>${facts.byCategory[c]}<`).test(text)) bad.push(`${name}: legend for ${c} should read ${facts.byCategory[c]}`);
    }
    const stats = `${facts.entries} ENTRIES · ${facts.publishers} PUBLISHERS · ${monthYear(facts.first).toUpperCase()} TO ${monthYear(facts.last).toUpperCase()}`;
    if (!text.includes(stats)) bad.push(`${name}: stats line should read "${stats}"`);
    if (!text.includes(KEY)) bad.push(`${name}: reading key missing`);
    if (!text.includes(`LATEST · `)) bad.push(`${name}: latest-entry callout missing`);
    if (!/prefers-reduced-motion:reduce/.test(text)) bad.push(`${name}: reduced-motion rule missing`);
  }
  return bad;
}

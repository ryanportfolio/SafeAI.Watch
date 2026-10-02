// Shared pieces for the README generator: paths, the two themes, escaping,
// text measurement and the SVG wrapper. Node only, no dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ASSETS = 'assets/readme';
/** Where generated files go: the repo, or README_OUT_DIR (set by build.mjs --check). Read at write time. */
export const outDir = () => (process.env.README_OUT_DIR ? path.resolve(process.env.README_OUT_DIR) : ROOT);

/*
 * Colours come from src/styles/tokens.css. Light mode is the site's paper card;
 * dark mode is the site's dark card, so each panel paints its own field and reads
 * as a clipping from the site on either GitHub theme. Governance is ink on paper
 * and cream on the dark card; the three accents are the site's hero burst colours.
 */
export const THEMES = {
  // On paper: the site's chart colours for data (--chart-orange, --chart-olive) and its
  // AA grey for small labels (--grey-muted, 4.65:1). Amber has no darker token, so on
  // paper its dots get a thin ink edge instead of an invented colour.
  light: {
    field: '#d7d7d0', ink: '#1a1614', mute: '#605b55', label: '#605b55',
    rule: '#9d9b94', spoke: '#b4b0a8',
    cat: { Incidents: '#bd4a28', Warnings: '#e5a700', Research: '#677331', Governance: '#1a1614' },
    edge: { Warnings: '#1a1614' },
  },
  dark: {
    field: '#292623', ink: '#f4f4e7', mute: '#c9c8bc', label: '#a9a79c',
    rule: '#6f6b64', spoke: '#5b5752',
    cat: { Incidents: '#ff7733', Warnings: '#e5a700', Research: '#a89a1a', Governance: '#f4f4e7' },
    edge: {},
  },
};

/** Fill (and edge, where the theme gives one) for a category mark. */
export const markPaint = (t, cat) => `fill="${t.cat[cat]}"${t.edge[cat] ? ` stroke="${t.edge[cat]}" stroke-width=".9"` : ''}`;

export const SERIF = "Newsreader,Georgia,'Times New Roman',Times,serif";
export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";
export const MONO = "ui-monospace,'SF Mono','Cascadia Mono',Menlo,Consolas,'Liberation Mono',monospace";

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Greedy wrap by an average advance per character (0.505 em for sans, 0.6 em for mono). */
export function wrap(text, width, size, ratio = 0.505) {
  const max = Math.floor(width / (size * ratio));
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

export const r1 = (n) => Math.round(n * 10) / 10;

export function svg(w, h, label, css, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<style>${css}</style>
${body}
</svg>
`;
}

export function write(rel, text) {
  const file = path.join(outDir(), rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

export const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

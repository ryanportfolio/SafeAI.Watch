#!/usr/bin/env node
// Lints the About film caption timeline (film/beats.json) against film/facts.md.
// Rules: film/BRIEF.md, "Direction", graft 2. No dependencies.
//
// Usage: node scripts/film/lint-beats.mjs [beats.json] [facts.md]
// Exits 1 on any failure; warnings never fail.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EPS = 1e-9;
const EM_DASH = '—';
const ITALIC_OK = /^[a-z .,;:\-’]+$/;
const PUBLISHED = /^(?:repo\s+)?\d{4}(?:-\d{2}){0,2}\b|^n\/a$/i;

// ---------- facts.md ----------

function splitRow(line) {
  const cells = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cur += '|'; i++; continue; }
    if (ch === '|') { cells.push(cur); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur);
  // Drop the empty cells produced by the leading and trailing border pipes.
  if (cells.length && cells[0].trim() === '') cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();
  return cells.map((c) => c.trim());
}

// Maps a row's cells onto the header. When a cell holds an unescaped pipe the
// row has too many cells: the extras are folded into "Exact text or value"
// (left of Source) or "Limits" (right of Published), using the Published date
// cell as the anchor between them.
function mapCells(header, cells) {
  const n = header.length;
  if (cells.length <= n) return header.map((_, i) => cells[i] ?? '');
  const e = header.indexOf('Exact text or value');
  const p = header.indexOf('Published');
  const l = header.indexOf('Limits');
  const out = new Array(n).fill('');
  for (let i = 0; i < e; i++) out[i] = cells[i];
  let P = -1;
  if (p === e + 2) {
    for (let i = p; i < cells.length; i++) if (PUBLISHED.test(cells[i])) { P = i; break; }
  }
  if (P === -1) {
    // No anchor: everything right of Exact is fixed from the end.
    const tail = n - 1 - e;
    out[e] = cells.slice(e, cells.length - tail).join(' | ');
    for (let k = 0; k < tail; k++) out[n - tail + k] = cells[cells.length - tail + k];
    return out;
  }
  out[e] = cells.slice(e, P - 1).join(' | ');
  out[p - 1] = cells[P - 1];
  out[p] = cells[P];
  if (l > p) {
    const after = n - 1 - l;
    for (let k = 1; k < l - p; k++) out[p + k] = cells[P + k] ?? '';
    out[l] = cells.slice(P + (l - p), cells.length - after).join(' | ');
    for (let k = 0; k < after; k++) out[l + 1 + k] = cells[cells.length - after + k];
  }
  return out;
}

const cellText = (s) => (s ?? '').replace(/<br\s*\/?>/gi, ' ');

/** Parses every table whose header has `ID` and `Exact text or value`. */
export function parseFacts(md) {
  const rows = new Map();
  let header = null;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('|')) { header = null; continue; }
    const cells = splitRow(line);
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue;
    if (cells[0] === 'ID') {
      header = cells.includes('Exact text or value') ? cells : null;
      continue;
    }
    if (!header) continue;
    const m = mapCells(header, cells);
    const id = m[0];
    if (!id) continue;
    rows.set(id, {
      exact: cellText(m[header.indexOf('Exact text or value')]),
      limits: header.includes('Limits') ? cellText(m[header.indexOf('Limits')]) : '',
    });
  }
  return rows;
}

// ---------- helpers ----------

export const normalize = (s) =>
  s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

export const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

const OPEN_Q = /^["'“‘]/;
const CLOSE_Q = /["'”’]$/;

export function unwrapQuote(text) {
  const t = text.trim();
  if (t.length >= 2 && OPEN_Q.test(t) && CLOSE_Q.test(t)) return t.slice(1, -1).trim();
  return t;
}

const fmt = (x) => x.toFixed(2);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

// ---------- lint ----------

export function lintBeats(film, facts) {
  const failures = [];
  const warnings = [];
  const fail = (where, msg) => failures.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

  const duration = film?.duration;
  if (!isNum(duration) || duration <= 0) fail('film', `duration must be a positive number, got ${JSON.stringify(duration)}`);
  const beats = Array.isArray(film?.beats) ? film.beats : [];
  if (!Array.isArray(film?.beats)) fail('film', 'beats must be an array');

  // Rule 6: chapters.
  const chapters = Array.isArray(film?.chapters) ? film.chapters : [];
  let prevChapter = null;
  chapters.forEach((c, i) => {
    const where = `chapter ${c?.id ?? `#${i}`}`;
    if (!isNum(c?.start)) return fail(where, 'start must be a number');
    if (c.start < 0 || (isNum(duration) && c.start >= duration)) fail(where, `start ${c.start} is outside 0..${duration}`);
    if (prevChapter && c.start <= prevChapter.start) fail(where, `start ${c.start} does not come after chapter ${prevChapter.id} (${prevChapter.start})`);
    prevChapter = c;
  });

  let prev = null;
  for (const [i, beat] of beats.entries()) {
    const id = beat?.id ?? `beat #${i}`;
    const { start, end } = beat ?? {};

    // Rule 6: beat timing.
    const timed = isNum(start) && isNum(end);
    if (!timed) fail(id, 'start and end must be numbers');
    else {
      if (end <= start) fail(id, `end ${end} is not after start ${start}`);
      if (start < 0) fail(id, `start ${start} is before 0`);
      if (isNum(duration) && end > duration + EPS) fail(id, `end ${end} is past duration ${duration}`);
      if (prev && isNum(prev.start)) {
        if (start < prev.start) fail(id, `starts at ${start}, before previous beat ${prev.id} (${prev.start}); beats must be sorted`);
        else if (isNum(prev.end) && start < prev.end - EPS) fail(id, `starts at ${start}, overlapping previous beat ${prev.id} (ends ${prev.end})`);
      }
    }
    prev = beat;

    const items = [];
    if (beat.statement) items.push(['statement', beat.statement, 'statement']);
    if (beat.precision) items.push(['precision', beat.precision, 'precision']);
    (Array.isArray(beat.extra) ? beat.extra : []).forEach((x, j) => items.push([`extra[${j}]`, x, 'extra']));

    for (const [name, item, kind] of items) {
      const where = `${id} ${name}`;
      const text = typeof item?.text === 'string' ? item.text : '';
      if (!text.trim()) fail(where, 'text is missing or empty');

      // Rule 6: at inside the beat.
      if (!isNum(item?.at)) fail(where, 'at must be a number');
      else if (timed && (item.at < start || item.at >= end)) fail(where, `at ${item.at} is outside the beat (${start}..${end})`);

      // Rule 2: provenance.
      const rows = Array.isArray(item?.rows) ? item.rows : [];
      const known = rows.filter((r) => facts.has(r));
      for (const r of rows) if (!facts.has(r)) fail(where, `row ${JSON.stringify(r)} does not exist in facts.md`);
      if (item?.owner !== true && rows.length === 0) fail(where, 'no source: needs non-empty rows or owner: true');
      if (item?.rows !== undefined && !Array.isArray(item.rows)) fail(where, 'rows must be an array');

      // Rule 3: quotes.
      const isQuote = item?.quote === true;
      if (isQuote && text) {
        const needle = normalize(unwrapQuote(text));
        const hit = known.some((r) => normalize(facts.get(r).exact).includes(needle));
        if (!hit) {
          fail(where, known.length
            ? `quote is not an exact substring of the Exact text of ${known.join(', ')}: ${JSON.stringify(needle)}`
            : 'quote has no existing row to check against');
        }
      }

      // Rule 4: italic runs.
      if (item?.italic !== undefined) {
        if (!Array.isArray(item.italic)) fail(where, 'italic must be an array of strings');
        else for (const run of item.italic) {
          if (typeof run !== 'string' || !run) { fail(where, `italic entry ${JSON.stringify(run)} is not a non-empty string`); continue; }
          if (!text.includes(run)) fail(where, `italic ${JSON.stringify(run)} is not in the text`);
          if (!ITALIC_OK.test(run)) {
            const bad = [...new Set([...run].filter((ch) => !ITALIC_OK.test(ch)))].map((ch) => JSON.stringify(ch)).join(' ');
            fail(where, `italic ${JSON.stringify(run)} has characters outside a-z, space and .,;:-’: ${bad}`);
          }
        }
      }

      // Rule 5: display punctuation.
      if (text.includes(EM_DASH)) fail(where, 'contains an em dash (U+2014)');
      const periodRule = !isQuote && (kind === 'statement' || (kind === 'extra' && (item.role === 'label' || item.role === 'heading')));
      if (periodRule && text.trim().endsWith('.')) fail(where, 'display text ends in a period');

      // Rule 7: numbers (warning only).
      if (!isQuote && text) {
        const haystack = known.map((r) => `${facts.get(r).exact} ${facts.get(r).limits}`).join(' ');
        for (const num of new Set(text.match(/\d+(?:[.,]\d+)*/g) ?? [])) {
          const re = new RegExp(`(?<![\\d.,])${num.replace(/[.,]/g, '\\$&')}(?![\\d]|[.,]\\d)`);
          if (!re.test(haystack)) {
            warn(where, known.length
              ? `number ${num} not found in Exact text or Limits of ${known.join(', ')}; check it by hand`
              : `number ${num} has no source row to check against; check it by hand`);
          }
        }
      }
    }

    // Rule 1: reading time.
    const st = beat.statement;
    const pr = beat.precision;
    if (timed && st && isNum(st.at) && typeof st.text === 'string') {
      const words = wordCount(st.text);
      const need = 0.25 * words + 1.0;
      const until = pr && isNum(pr.at) ? pr.at : end;
      const have = until - st.at;
      if (have + EPS < need) {
        fail(`${id} statement`, `reading time short by ${fmt(need - have)} s (${words} words need ${fmt(need)} s, has ${fmt(have)} s to ${pr ? 'precision at' : 'beat end'} ${until})`);
      }
    }
    if (timed && pr && isNum(pr.at) && typeof pr.text === 'string') {
      const words = wordCount(pr.text);
      const need = 0.25 * words;
      const have = end - pr.at;
      if (have + EPS < need) {
        fail(`${id} precision`, `reading time short by ${fmt(need - have)} s (${words} words need ${fmt(need)} s, has ${fmt(have)} s to beat end ${end})`);
      }
    }
  }

  return { beatsChecked: beats.length, failures, warnings };
}

// ---------- CLI ----------

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const beatsPath = argv[0] ? resolve(argv[0]) : resolve(root, 'film/beats.json');
  const factsPath = argv[1] ? resolve(argv[1]) : resolve(root, 'film/facts.md');

  let film;
  let facts;
  try {
    film = JSON.parse(readFileSync(beatsPath, 'utf8'));
  } catch (err) {
    console.error(`FAIL could not read ${beatsPath}: ${err.message}`);
    return 1;
  }
  try {
    facts = parseFacts(readFileSync(factsPath, 'utf8'));
  } catch (err) {
    console.error(`FAIL could not read ${factsPath}: ${err.message}`);
    return 1;
  }

  const { beatsChecked, failures, warnings } = lintBeats(film, facts);
  for (const f of failures) console.log(`FAIL ${f}`);
  for (const w of warnings) console.log(`WARN ${w}`);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  console.log(`lint-beats: ${plural(beatsChecked, 'beat')} checked, ${plural(failures.length, 'failure')}, ${plural(warnings.length, 'warning')}`);
  return failures.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}

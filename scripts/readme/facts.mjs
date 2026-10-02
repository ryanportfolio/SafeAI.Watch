// Every number the README shows, computed from src/data/events.json at build
// time. Nothing here is typed by hand; a panel that prints a number must read it
// from this object, and the verifier compares the drawn values against it.
import { read } from './lib.mjs';

export const CATEGORIES = ['Warnings', 'Incidents', 'Governance', 'Research'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthYear(iso) {
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function longDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`;
}

export function loadFacts() {
  const events = JSON.parse(read('src/data/events.json'));
  if (!Array.isArray(events) || events.length === 0) throw new Error('src/data/events.json has no entries; refusing to draw an empty record.');
  for (const [i, e] of events.entries()) {
    if (!CATEGORIES.includes(e.category)) throw new Error(`events.json entry ${i + 1} has unknown category ${e.category}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) throw new Error(`events.json entry ${i + 1} has a bad date ${e.date}`);
  }
  // Stable date order; ties keep file order.
  const ordered = events.map((e, i) => ({ ...e, i })).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.i - b.i));
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, ordered.filter((e) => e.category === c).length]));
  // Publisher is the part of `source` before " · " (e.g. "RAND · Research report").
  const publishers = new Set(events.map((e) => e.source.split(' · ')[0].trim())).size;
  const years = {};
  for (const e of ordered) years[e.date.slice(0, 4)] = (years[e.date.slice(0, 4)] || 0) + 1;
  return {
    events: ordered,
    entries: events.length,
    byCategory,
    publishers,
    years,
    first: ordered[0].date,
    last: ordered.at(-1).date,
    latest: ordered.at(-1),
  };
}

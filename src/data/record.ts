/*
 * The public record: dated, sourced entries from events.json plus the
 * date helpers every page shares. Pages read the record at build time;
 * nothing fetches it at runtime.
 */
import rawEvents from './events.json';

/** The four coverage areas an entry can belong to. */
export const CATEGORIES = ['Research', 'Incidents', 'Warnings', 'Governance'] as const;

export type RecordCategory = (typeof CATEGORIES)[number];

export interface RecordEvent {
  /** Publication date of the linked source, ISO `YYYY-MM-DD`. */
  date: string;
  category: RecordCategory;
  title: string;
  /** What happened, and who did it. */
  happened: string;
  /** What kind of evidence this is, and what it shows. */
  evidence: string;
  /** What remains open, preferably in the source's own terms. */
  uncertain: string;
  /** Publisher and source type, e.g. "RAND · Research report". */
  source: string;
  url: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const KEYS = [
  'date',
  'category',
  'title',
  'happened',
  'evidence',
  'uncertain',
  'source',
  'url',
] as const;

/*
 * Every entry is checked at build time. A missing field, an empty string, a
 * stray key, an unknown category or a non-https link fails the build rather
 * than shipping a broken entry.
 */
function validate(raw: unknown, index: number): RecordEvent {
  const where = `events.json entry ${index + 1}`;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${where} is not an object.`);
  }
  const event = raw as Record<string, unknown>;
  const name =
    typeof event.title === 'string' && event.title.trim() ? `"${event.title}"` : where;

  const found = Object.keys(event).sort().join(',');
  const wanted = [...KEYS].sort().join(',');
  if (found !== wanted) {
    throw new Error(`${where} (${name}) has keys ${found}; expected ${wanted}.`);
  }

  for (const key of KEYS) {
    const value = event[key];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${where} (${name}) has an empty or non-string ${key}.`);
    }
  }

  const date = event.date as string;
  if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error(`${name} has a malformed date: ${date}`);
  }

  const category = event.category as string;
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    throw new Error(`${name} has category "${category}"; expected one of ${CATEGORIES.join(', ')}.`);
  }

  const url = event.url as string;
  if (!url.startsWith('https://')) {
    throw new Error(`${name} has a url that does not start with https://: ${url}`);
  }

  return event as unknown as RecordEvent;
}

const validated: RecordEvent[] = (rawEvents as unknown[]).map(validate);

/** All entries, oldest first. */
export const events: RecordEvent[] = [...validated].sort((a, b) => a.date.localeCompare(b.date));

/** All entries, newest first. */
export const eventsNewestFirst: RecordEvent[] = [...events].reverse();

/**
 * Date of the most recent entry. The site shows it as "Updated" because the
 * record changes only when an entry is added.
 */
export const lastUpdated: string = events[events.length - 1].date;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parts(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month: MONTHS[month - 1], day };
}

/** "September 18, 2026" */
export function formatLong(iso: string): string {
  const { year, month, day } = parts(iso);
  return `${month} ${day}, ${year}`;
}

/** "Sep 18, 2026" */
export function formatShort(iso: string): string {
  const { year, month, day } = parts(iso);
  return `${month.slice(0, 3)} ${day}, ${year}`;
}

/** "Sep 18" */
export function formatDayMonth(iso: string): string {
  const { month, day } = parts(iso);
  return `${month.slice(0, 3)} ${day}`;
}

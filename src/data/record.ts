/*
 * The public record: dated, sourced entries from events.json plus the
 * date helpers every page shares. Pages read the record at build time;
 * nothing fetches it at runtime.
 */
import rawEvents from './events.json';

export interface RecordEvent {
  /** Publication date of the linked source, ISO `YYYY-MM-DD`. */
  date: string;
  category: string;
  title: string;
  summary: string;
  /** Publisher and source type, e.g. "RAND · Policy report". */
  source: string;
  url: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

for (const event of rawEvents) {
  if (!ISO_DATE.test(event.date)) {
    throw new Error(`events.json: "${event.title}" has a malformed date: ${event.date}`);
  }
}

/** All entries, oldest first. */
export const events: RecordEvent[] = [...rawEvents].sort((a, b) => a.date.localeCompare(b.date));

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

/** "18 September 2026" */
export function formatLong(iso: string): string {
  const { year, month, day } = parts(iso);
  return `${day} ${month} ${year}`;
}

/** "18 Sep 2026" */
export function formatShort(iso: string): string {
  const { year, month, day } = parts(iso);
  return `${day} ${month.slice(0, 3)} ${year}`;
}

/** "18 Sep" */
export function formatDayMonth(iso: string): string {
  const { month, day } = parts(iso);
  return `${day} ${month.slice(0, 3)}`;
}

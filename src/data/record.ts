/*
 * The public record: dated, sourced entries from events.json plus the
 * date helpers every page shares. Pages read the record at build time;
 * nothing fetches it at runtime.
 */
import rawEvents from './events.json';
import rawDays from './days.json';

/** The four coverage areas an entry can belong to. */
export const CATEGORIES = ['Research', 'Incidents', 'Warnings', 'Governance'] as const;

export type RecordCategory = (typeof CATEGORIES)[number];

/** The subjects an entry can be about, in display order: Bio first. */
export const TOPICS = ['Bio', 'Cyber', 'Rogue agents', 'Alignment', 'Superintelligence', 'Harm to people', 'Military', 'Lab conduct'] as const;

export type RecordTopic = (typeof TOPICS)[number];

export interface RecordEvent {
  /** Publication date of the linked source, ISO `YYYY-MM-DD`. */
  date: string;
  category: RecordCategory;
  /** Subjects the entry is about, most central first: one to three of TOPICS. */
  topics: RecordTopic[];
  title: string;
  /** What happened, and who did it. */
  happened: string;
  /** What the source says, finds, argues or requires: one to four points. */
  keyPoints: string[];
  /** What kind of evidence this is, and what it shows. */
  evidence: string;
  /** What remains open, when something material is; absent otherwise. */
  uncertain?: string;
  /** Publisher and source type, e.g. "RAND · Research report". */
  source: string;
  url: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Required string fields. */
const KEYS = ['date', 'category', 'title', 'happened', 'evidence', 'source', 'url'] as const;

const MAX_KEY_POINTS = 4;

const MAX_TOPICS = 3;

/*
 * Every entry is checked at build time. A missing field, an empty string, a
 * stray key, an empty or overlong keyPoints list, an unknown category, a
 * missing, empty, overlong, repeated or unknown topic, or a non-https link
 * fails the build rather than shipping a broken entry.
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
  const strings = 'uncertain' in event ? [...KEYS, 'uncertain' as const] : [...KEYS];
  const wanted = [...strings, 'keyPoints', 'topics'].sort().join(',');
  if (found !== wanted) {
    throw new Error(`${where} (${name}) has keys ${found}; expected ${wanted} (uncertain is optional).`);
  }

  for (const key of strings) {
    const value = event[key];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${where} (${name}) has an empty or non-string ${key}.`);
    }
  }

  const points = event.keyPoints;
  if (
    !Array.isArray(points) ||
    points.length === 0 ||
    points.length > MAX_KEY_POINTS ||
    points.some((p) => typeof p !== 'string' || p.trim() === '')
  ) {
    throw new Error(`${where} (${name}) needs keyPoints: 1 to ${MAX_KEY_POINTS} non-empty strings.`);
  }

  const date = event.date as string;
  if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error(`${name} has a malformed date: ${date}`);
  }

  const category = event.category as string;
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    throw new Error(`${name} has category "${category}"; expected one of ${CATEGORIES.join(', ')}.`);
  }

  const topics = event.topics;
  if (
    !Array.isArray(topics) ||
    topics.length === 0 ||
    topics.length > MAX_TOPICS ||
    new Set(topics).size !== topics.length ||
    topics.some((t) => !(TOPICS as readonly unknown[]).includes(t))
  ) {
    throw new Error(
      `${where} (${name}) needs topics: 1 to ${MAX_TOPICS} distinct values from ${TOPICS.join(', ')}; got ${JSON.stringify(topics)}.`,
    );
  }

  const url = event.url as string;
  if (!url.startsWith('https://')) {
    throw new Error(`${name} has a url that does not start with https://: ${url}`);
  }

  return event as unknown as RecordEvent;
}

const MAX_SLUG_TITLE = 60;

/**
 * URL slug for an entry: `<date>-<title slug>`. The title slug is the title
 * lowercased with accents stripped, each run of other characters turned into
 * one `-`, then cut back to the last `-` at or before 60 characters.
 */
export function slugOf(event: Pick<RecordEvent, 'date' | 'title'>): string {
  let slug = event.title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length > MAX_SLUG_TITLE) {
    const cut = slug.lastIndexOf('-', MAX_SLUG_TITLE);
    slug = slug.slice(0, cut > 0 ? cut : MAX_SLUG_TITLE).replace(/-+$/, '');
  }
  return `${event.date}-${slug}`;
}

const validated: RecordEvent[] = (rawEvents as unknown[]).map(validate);

// Entry pages live at /latest/<slug>/, so two entries sharing a slug would
// overwrite each other. Fail the build instead.
const slugOwners = new Map<string, string>();
for (const event of validated) {
  const slug = slugOf(event);
  const other = slugOwners.get(slug);
  if (other !== undefined) {
    throw new Error(`"${event.title}" and "${other}" share the slug ${slug}; change one title.`);
  }
  slugOwners.set(slug, event.title);
}

/** All entries, oldest first. */
export const events: RecordEvent[] = [...validated].sort((a, b) => a.date.localeCompare(b.date));

/** All entries, newest first. */
export const eventsNewestFirst: RecordEvent[] = [...events].reverse();

/**
 * Date of the most recent entry. The site shows it as "Updated" because the
 * record changes only when an entry is added.
 */
export const lastUpdated: string = events[events.length - 1].date;

/** A short editorial brief for a busy day, from days.json. */
export interface DayBrief {
  /** The day it covers, ISO `YYYY-MM-DD`; one brief per date. */
  date: string;
  /** What the day's entries cover: one or two sentences, at most 320 characters. */
  summary: string;
  /**
   * Slugs of the day's five most significant entries, most significant
   * first; present exactly when the day has six or more entries.
   */
  highlights?: string[];
}

/** A day needs a brief from this many entries. */
const BRIEF_FROM = 3;

/** A day needs highlights from this many entries. */
const HIGHLIGHTS_FROM = 6;

const HIGHLIGHT_COUNT = 5;

const MAX_SUMMARY = 320;

/** Splits a summary into sentences the way editors count them. */
const SENTENCE_BREAK = /(?<=[.!?]["”]?)\s+(?=[A-Z0-9"“])/;

/**
 * Groups entries by date, newest date first. Entries keep their input order
 * inside a day.
 */
export function groupByDay(list: RecordEvent[]): { date: string; entries: RecordEvent[] }[] {
  const days = new Map<string, RecordEvent[]>();
  for (const event of list) {
    const day = days.get(event.date);
    if (day) day.push(event);
    else days.set(event.date, [event]);
  }
  return [...days]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => ({ date, entries }));
}

const entriesByDate = new Map(groupByDay(events).map(({ date, entries }) => [date, entries]));

/*
 * Every brief is checked at build time against the entries of its date. A
 * stray or missing key, an empty, overlong or em-dashed summary, more than
 * two sentences, a repeated date, a brief for a quiet day or a busy day
 * without one, highlights on the wrong days, highlights that are not five
 * distinct slugs of that day's entries, or a Bio entry left out of them
 * fails the build. Whether each summary fact appears in the day's entries is
 * an editorial check, not a build check.
 */
function validateDay(raw: unknown, index: number, seen: Set<string>): DayBrief {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`days.json brief ${index + 1} is not an object.`);
  }
  const brief = raw as Record<string, unknown>;
  const date = typeof brief.date === 'string' ? brief.date : '';
  const where = `days.json brief ${index + 1} (${date || 'no date'})`;

  if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error(`${where} needs a date as YYYY-MM-DD.`);
  }
  if (seen.has(date)) {
    throw new Error(`${where} repeats a date that already has a brief.`);
  }
  seen.add(date);

  const entries = entriesByDate.get(date) ?? [];
  if (entries.length < BRIEF_FROM) {
    throw new Error(
      `${where} covers a date with ${entries.length} entries; briefs are only for dates with ${BRIEF_FROM} or more.`,
    );
  }

  const wantHighlights = entries.length >= HIGHLIGHTS_FROM;
  const found = Object.keys(brief).sort().join(',');
  const wanted = (wantHighlights ? ['date', 'highlights', 'summary'] : ['date', 'summary']).join(',');
  if (found !== wanted) {
    throw new Error(
      `${where} has keys ${found}; expected ${wanted} (highlights exactly when the date has ${HIGHLIGHTS_FROM} or more entries; it has ${entries.length}).`,
    );
  }

  const summary = brief.summary;
  if (typeof summary !== 'string' || summary.trim() === '') {
    throw new Error(`${where} has an empty or non-string summary.`);
  }
  if (summary.length > MAX_SUMMARY) {
    throw new Error(`${where} has a ${summary.length}-character summary; the limit is ${MAX_SUMMARY}.`);
  }
  if (summary.includes('—')) {
    throw new Error(`${where} has an em dash in its summary.`);
  }
  const sentences = summary.trim().split(SENTENCE_BREAK).length;
  if (sentences > 2) {
    throw new Error(`${where} has a summary of ${sentences} sentences; use one or two.`);
  }

  if (wantHighlights) {
    const highlights = brief.highlights;
    if (
      !Array.isArray(highlights) ||
      highlights.length !== HIGHLIGHT_COUNT ||
      highlights.some((h) => typeof h !== 'string') ||
      new Set(highlights).size !== highlights.length
    ) {
      throw new Error(`${where} needs highlights: exactly ${HIGHLIGHT_COUNT} distinct entry slugs.`);
    }
    const slugs = entries.map(slugOf);
    const stray = (highlights as string[]).find((h) => !slugs.includes(h));
    if (stray !== undefined) {
      throw new Error(`${where} has highlight ${stray}, which is not the slug of an entry on ${date}.`);
    }
    // Bio is the site's first coverage area: every Bio entry of the day is
    // highlighted, or, when there are more than five, all five highlights are Bio.
    const bio = entries.filter((e) => e.topics.includes('Bio')).map(slugOf);
    const bioKept =
      bio.length <= HIGHLIGHT_COUNT
        ? bio.every((s) => highlights.includes(s))
        : highlights.every((h) => bio.includes(h as string));
    if (!bioKept) {
      throw new Error(
        `${where} breaks the Bio rule: with ${bio.length} Bio entries, ${
          bio.length <= HIGHLIGHT_COUNT ? 'every Bio entry must be highlighted' : 'all highlights must be Bio entries'
        }.`,
      );
    }
  }

  return brief as unknown as DayBrief;
}

if (!Array.isArray(rawDays)) {
  throw new Error('days.json must be an array of day briefs.');
}
const seenDates = new Set<string>();
const validatedDays: DayBrief[] = (rawDays as unknown[]).map((raw, i) => validateDay(raw, i, seenDates));
for (const [date, entries] of entriesByDate) {
  if (entries.length >= BRIEF_FROM && !seenDates.has(date)) {
    throw new Error(`${date} has ${entries.length} entries but no brief in days.json.`);
  }
}

/** Day briefs keyed by date, for every date with three or more entries. */
export const dayBriefs: Map<string, DayBrief> = new Map(validatedDays.map((brief) => [brief.date, brief]));

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

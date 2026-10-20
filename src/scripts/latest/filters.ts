/*
 * /latest filters and week grid. The grid's row labels filter by topic, its cells
 * by topic and day, its day headers by day; the type chips add a type on top. While
 * any filter is on, the list shows every matching row (the busy-day collapse, the
 * summaries and the "Five to read" labels step aside), hides days with no match and
 * counts "N of M entries" per day. Clearing restores the list as the reader left
 * it, including which busy days were expanded: the collapse lives in [hidden] on
 * each day's rest, which this script never touches.
 *
 * State lives in the URL as topic, day and type: pushState on each change,
 * restored on load and on back/forward. The reader's ?entry= stays alongside.
 *
 * Weeks: only the newest week's panel comes from the build. Earlier weeks are built
 * here when first shown, by cloning that panel and filling it with counts taken
 * from the list rows' data-date, data-topics and data-type, so a stepped-to week has
 * the same markup, labels and hooks as week 0.
 *
 * Keyboard: the grid table is one Tab stop (roving tabindex across day headers,
 * topic labels and dot cells); arrow keys move by row and column, skipping empty
 * cells, Home/End jump to the ends of the row. Enter/Space activate as buttons do.
 */

interface Filter {
  topic: string;
  day: string;
  type: string;
}

const NONE: Filter = { topic: '', day: '', type: '' };
// A module, not a global script: reader.ts declares its own `list`.
export {};

const TYPES = ['research', 'incidents', 'warnings', 'governance'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOT_CAP = 3.2;
const DAY_MS = 86_400_000;

const grid = document.querySelector<HTMLElement>('[data-week-grid]');
const list = document.querySelector<HTMLElement>('.reader-list');

const plural = (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`;
const dayMonth = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const addDays = (iso: string, n: number) => new Date(toMs(iso) + n * DAY_MS).toISOString().slice(0, 10);
const range = (first: string, last: string) =>
  first.slice(0, 4) === last.slice(0, 4)
    ? `${dayMonth(first)} to ${dayMonth(last)}, ${last.slice(0, 4)}`
    : `${dayMonth(first)}, ${first.slice(0, 4)} to ${dayMonth(last)}, ${last.slice(0, 4)}`;
const dotSize = (n: number) => Math.min(Math.sqrt(n), DOT_CAP).toFixed(3);
const same = (a: Filter, b: Filter) => a.topic === b.topic && a.day === b.day && a.type === b.type;
const isOn = (f: Filter) => Boolean(f.topic || f.day || f.type);
/** Count on a grid element for the current type: data-n, or data-n-<type>. */
const countOf = (el: HTMLElement, type: string) =>
  Number((type ? el.getAttribute(`data-n-${type}`) : el.dataset.n) ?? 0);

if (grid && list) {
  const first = grid.querySelector<HTMLElement>('[data-week]');
  const label = grid.querySelector<HTMLElement>('[data-week-label]');
  const prev = grid.querySelector<HTMLButtonElement>('[data-week-prev]');
  const next = grid.querySelector<HTMLButtonElement>('[data-week-next]');
  const cellTemplate = grid.querySelector<HTMLTemplateElement>('[data-cell-template]');
  const chipGroup = document.querySelector<HTMLElement>('[data-type-chips]');
  const chips = [...document.querySelectorAll<HTMLButtonElement>('[data-type-chip]')];
  const statusBox = document.querySelector<HTMLElement>('[data-filter-status]');
  const statusText = statusBox?.querySelector<HTMLElement>('[data-filter-status-text]');
  const clear = document.querySelector<HTMLButtonElement>('[data-filter-clear]');
  const rows = [...list.querySelectorAll<HTMLElement>('[data-entry]')];
  const days = [...list.querySelectorAll<HTMLElement>('[data-day]')].map((section) => ({
    section,
    rows: [...section.querySelectorAll<HTMLElement>('[data-entry]')],
    count: section.querySelector<HTMLElement>('[data-day-count]'),
  }));
  const topicNames = new Map(
    [...(first?.querySelectorAll<HTMLElement>('[data-grid-topic]') ?? [])].map((b) => [b.dataset.gridTopic ?? '', b.dataset.topicName ?? '']),
  );
  const typeNames = new Map(chips.map((c) => [c.dataset.typeChip ?? '', c.textContent?.trim() ?? '']));

  /* Counts from the list rows: "<topic>|<date>" per cell, "|<date>" per day; per type. */
  const counts = new Map<string, Record<string, number>>();
  const bump = (key: string, type: string) => {
    const entry = counts.get(key) ?? Object.fromEntries(['all', ...TYPES].map((t) => [t, 0]));
    entry.all += 1;
    if (type in entry) entry[type] += 1;
    counts.set(key, entry);
  };
  for (const row of rows) {
    const date = row.dataset.date ?? '';
    const type = row.dataset.type ?? '';
    bump(`|${date}`, type);
    for (const topic of (row.dataset.topics ?? '').split(' ').filter(Boolean)) bump(`${topic}|${date}`, type);
  }

  /* Weeks: index 0 is the newest; each is the week ending lastUpdated - 7k, k from the data. */
  const lastDay = first?.dataset.week ?? '';
  const weekEnds = [...new Set(rows.map((r) => Math.floor((toMs(lastDay) - toMs(r.dataset.date ?? '')) / DAY_MS / 7)))]
    .filter((k) => k >= 0)
    .sort((a, b) => a - b)
    .map((k) => addDays(lastDay, -7 * k));
  if (weekEnds[0] !== lastDay) weekEnds.unshift(lastDay);
  const panels = new Map<number, HTMLElement>();
  if (first) panels.set(0, first);

  let state: Filter = NONE;
  let week = 0;
  /** The grid table's one Tab stop. */
  let roving: HTMLButtonElement | null = null;

  function fillCell(button: HTMLButtonElement, topic: string, day: string, n: number) {
    const key = `${topic}|${day}`;
    button.dataset.topic = topic;
    button.dataset.cellDay = day;
    button.dataset.label = `${topicNames.get(topic) ?? topic}, ${dayMonth(day)}`;
    button.dataset.n = String(n);
    for (const t of TYPES) button.setAttribute(`data-n-${t}`, String(counts.get(key)?.[t] ?? 0));
    button.setAttribute('aria-label', `${button.dataset.label}: ${plural(n)}`);
    button.querySelector<HTMLElement>('.dot')?.style.setProperty('--d', dotSize(n));
  }

  /** Week k's panel: a clone of week 0's, its days, labels and cells refilled from the counts. */
  function buildPanel(index: number): HTMLElement | null {
    if (!first || !cellTemplate) return null;
    const end = weekEnds[index];
    const dates = [...Array(7)].map((_, i) => addDays(end, i - 6));
    const panel = first.cloneNode(true) as HTMLElement;
    panel.dataset.week = end;
    panel.dataset.weekStart = dates[0];
    panel.dataset.weekRange = range(dates[0], end);
    const caption = panel.querySelector('caption');
    if (caption) caption.textContent = `Entries by topic and day, ${panel.dataset.weekRange}. Dot size shows the number of entries.`;
    for (const el of panel.querySelectorAll('[data-active]')) el.removeAttribute('data-active');
    panel.querySelectorAll<HTMLElement>('thead th[data-col]').forEach((th, i) => {
      const day = dates[i];
      th.dataset.col = day;
      const button = th.querySelector<HTMLButtonElement>('[data-grid-day]');
      if (!button) return;
      button.dataset.gridDay = day;
      button.disabled = !counts.has(`|${day}`);
      const [mon, num] = Array.from(button.querySelectorAll('span'));
      if (mon) mon.textContent = MONTHS[Number(day.slice(5, 7)) - 1];
      if (num) num.textContent = String(Number(day.slice(8, 10)));
    });
    for (const tr of panel.querySelectorAll<HTMLElement>('tbody tr[data-row]')) {
      const topic = tr.dataset.row ?? '';
      tr.querySelectorAll<HTMLElement>('td[data-col]').forEach((td, i) => {
        const day = dates[i];
        td.dataset.col = day;
        td.replaceChildren();
        const n = counts.get(`${topic}|${day}`)?.all ?? 0;
        if (!n) return;
        const button = cellTemplate.content.firstElementChild!.cloneNode(true) as HTMLButtonElement;
        fillCell(button, topic, day, n);
        td.append(button);
      });
    }
    for (const button of panel.querySelectorAll<HTMLButtonElement>('button')) button.tabIndex = -1;
    panel.hidden = true;
    // Keep the panels in week order in the DOM, newest first: after the last newer one.
    const newer = [...grid!.querySelectorAll<HTMLElement>('[data-week]')].filter((p) => (p.dataset.week ?? '') > end);
    (newer.at(-1) ?? first).after(panel);
    panels.set(index, panel);
    return panel;
  }

  const panelFor = (index: number) => panels.get(index) ?? buildPanel(index);
  const shownPanel = () => panels.get(week) ?? null;

  /* Roving focus inside the shown week's table. */
  const usable = (b: HTMLButtonElement | null): b is HTMLButtonElement => !!b && !b.disabled && !b.hidden;
  /** Rows of the table as a matrix of usable buttons (null where none): header row, then topics. */
  const matrix = (panel: HTMLElement) =>
    [...panel.querySelectorAll('tr')].map((tr) =>
      [...tr.children].map((cell) => {
        const b = cell.querySelector<HTMLButtonElement>('button');
        return usable(b) ? b : null;
      }),
    );

  function setRoving(target: HTMLButtonElement | null) {
    if (roving && roving !== target) roving.tabIndex = -1;
    roving = target;
    if (target) target.tabIndex = 0;
  }

  /** Keeps exactly one Tab stop in the shown table: the current one if still usable, else the first. */
  function ensureRoving() {
    const panel = shownPanel();
    if (!panel) return;
    if (usable(roving) && panel.contains(roving)) return setRoving(roving);
    setRoving(matrix(panel).flat().find(Boolean) ?? null);
  }

  grid.addEventListener('focusin', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('.grid button');
    if (usable(button)) setRoving(button);
  });

  grid.addEventListener('keydown', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('.grid button');
    const panel = shownPanel();
    if (!button || !panel || !panel.contains(button)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const m = matrix(panel);
    const r = m.findIndex((row) => row.includes(button));
    if (r < 0) return;
    const c = m[r].indexOf(button);
    const along = (cells: (HTMLButtonElement | null)[]) => cells.find(Boolean) ?? null;
    let to: HTMLButtonElement | null = null;
    switch (event.key) {
      case 'ArrowRight':
        to = along(m[r].slice(c + 1));
        break;
      case 'ArrowLeft':
        to = along(m[r].slice(0, c).reverse());
        break;
      case 'ArrowDown':
        to = along(m.slice(r + 1).map((row) => row[c]));
        break;
      case 'ArrowUp':
        to = along(m.slice(0, r).reverse().map((row) => row[c]));
        break;
      case 'Home':
        to = along(m[r]);
        break;
      case 'End':
        to = along([...m[r]].reverse());
        break;
      default:
        return;
    }
    event.preventDefault();
    if (to && to !== button) {
      setRoving(to);
      to.focus();
    }
  });

  /* Weeks */
  function showWeek(index: number) {
    week = Math.max(0, Math.min(weekEnds.length - 1, index));
    const panel = panelFor(week);
    for (const [i, p] of panels) p.hidden = i !== week;
    if (label) label.textContent = panel?.dataset.weekRange ?? '';
    const focused = document.activeElement;
    if (prev) prev.disabled = week >= weekEnds.length - 1;
    if (next) next.disabled = week <= 0;
    // A button that just became disabled drops focus; hand it to its partner.
    if (focused === prev && prev?.disabled) next?.focus();
    if (focused === next && next?.disabled) prev?.focus();
    paintGrid(state);
  }

  const weekFor = (day: string) => weekEnds.findIndex((end) => addDays(end, -6) <= day && day <= end);

  prev?.addEventListener('click', () => showWeek(week + 1));
  next?.addEventListener('click', () => showWeek(week - 1));

  /* Grid: dots, counts and pressed states follow the filter. */
  function paintGrid(f: Filter) {
    for (const cell of grid!.querySelectorAll<HTMLElement>('[data-grid-cell]')) {
      const n = countOf(cell, f.type);
      cell.hidden = n === 0;
      cell.querySelector<HTMLElement>('.dot')?.style.setProperty('--d', dotSize(n));
      cell.setAttribute('aria-label', `${cell.dataset.label}: ${plural(n)}`);
      const pressed = cell.dataset.topic === f.topic && cell.dataset.cellDay === f.day;
      cell.setAttribute('aria-pressed', String(pressed));
    }
    for (const button of grid!.querySelectorAll<HTMLElement>('[data-grid-topic]')) {
      const total = button.querySelector('[data-topic-total]');
      if (total) total.textContent = String(countOf(button, f.type));
      button.setAttribute('aria-pressed', String(button.dataset.gridTopic === f.topic && !f.day));
      button.closest('tr')?.toggleAttribute('data-active', button.dataset.gridTopic === f.topic);
    }
    for (const button of grid!.querySelectorAll<HTMLElement>('[data-grid-day]')) {
      button.setAttribute('aria-pressed', String(button.dataset.gridDay === f.day && !f.topic));
    }
    for (const col of grid!.querySelectorAll<HTMLElement>('[data-col]')) {
      col.toggleAttribute('data-active', col.dataset.col === f.day);
    }
    ensureRoving();
  }

  /* List */
  function filterList(f: Filter): number {
    const on = isOn(f);
    list!.toggleAttribute('data-filtering', on);
    let listed = 0;
    for (const row of rows) {
      const match =
        !on ||
        ((!f.topic || (row.dataset.topics ?? '').split(' ').includes(f.topic)) &&
          (!f.day || row.dataset.date === f.day) &&
          (!f.type || row.dataset.type === f.type));
      row.hidden = !match;
      row.removeAttribute('data-lead');
    }
    for (const day of days) {
      const shown = day.rows.filter((r) => !r.hidden);
      listed += shown.length;
      day.section.hidden = on && shown.length === 0;
      if (on) shown[0]?.setAttribute('data-lead', '');
      if (day.count) {
        const total = day.rows.length;
        day.count.textContent = on ? `${shown.length} of ${plural(total)}` : plural(total);
      }
    }
    return listed;
  }

  function describe(f: Filter, listed: number) {
    const parts = [
      f.topic && topicNames.get(f.topic),
      f.day && dayMonth(f.day),
      f.type && typeNames.get(f.type),
      plural(listed),
    ].filter(Boolean);
    return parts.join(' · ');
  }

  function apply(f: Filter) {
    state = f;
    paintGrid(f);
    const listed = filterList(f);
    for (const chip of chips) chip.setAttribute('aria-pressed', String((chip.dataset.typeChip === 'all' ? '' : chip.dataset.typeChip) === f.type));
    // The status box stays in the page (its text is the live region); empty, it draws nothing.
    statusBox?.toggleAttribute('data-on', isOn(f));
    if (clear) clear.hidden = !isOn(f);
    if (statusText) statusText.textContent = isOn(f) ? describe(f, listed) : '';
  }

  /* URL */
  function read(): Filter {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get('topic') ?? '';
    const day = params.get('day') ?? '';
    const type = params.get('type') ?? '';
    return {
      topic: topicNames.has(topic) ? topic : '',
      day: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '',
      type: TYPES.includes(type) ? type : '',
    };
  }

  function commit(f: Filter) {
    if (same(f, state)) return;
    apply(f);
    const url = new URL(window.location.href);
    for (const key of ['topic', 'day', 'type'] as const) {
      if (f[key]) url.searchParams.set(key, f[key]);
      else url.searchParams.delete(key);
    }
    history.pushState(history.state, '', url);
  }

  function restore() {
    const f = read();
    apply(f);
    if (f.day) {
      const index = weekFor(f.day);
      if (index >= 0) showWeek(index);
    }
  }

  grid.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    const { gridTopic, gridDay } = button.dataset;
    if (gridTopic) {
      commit(state.topic === gridTopic && !state.day ? { ...state, topic: '' } : { ...state, topic: gridTopic, day: '' });
    } else if (button.hasAttribute('data-grid-cell')) {
      const topic = button.dataset.topic ?? '';
      const day = button.dataset.cellDay ?? '';
      commit(state.topic === topic && state.day === day ? { ...state, topic: '', day: '' } : { ...state, topic, day });
    } else if (gridDay) {
      commit(state.day === gridDay && !state.topic ? { ...state, day: '' } : { ...state, topic: '', day: gridDay });
    }
  });

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const type = chip.dataset.typeChip === 'all' ? '' : (chip.dataset.typeChip ?? '');
      commit({ ...state, type: state.type === type ? '' : type });
    });
  }

  clear?.addEventListener('click', () => {
    commit(NONE);
    // The Clear button hides with the status line; keep keyboard focus on the filters.
    chips.find((c) => c.dataset.typeChip === 'all')?.focus();
  });

  window.addEventListener('popstate', restore);

  /* The build renders the grid's buttons disabled (no JS, no filters); switch them on. */
  if (first) {
    for (const button of first.querySelectorAll<HTMLButtonElement>('[data-grid-topic], [data-grid-cell]')) button.disabled = false;
    for (const button of first.querySelectorAll<HTMLButtonElement>('[data-grid-day]')) {
      button.disabled = !counts.has(`|${button.dataset.gridDay ?? ''}`);
    }
  }
  if (chipGroup) chipGroup.hidden = false;
  showWeek(0);
  restore();
}

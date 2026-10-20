/*
 * The /latest reader. On load it collapses each busy day to its five highlights
 * (the HTML lists every row, so the page works without this script) and selects
 * the entry named by ?entry=<slug>, else the newest. At 1024px and wider a plain
 * left click on a headline loads that entry into the right pane instead of
 * navigating: it fetches /latest/<slug>/, takes its [data-entry-article] and
 * swaps it in. Narrower, headlines are plain links and the pane is hidden.
 * Back/forward reselects whatever entry the restored URL names.
 */

const WIDE = window.matchMedia('(min-width: 1024px)');

const list = document.querySelector<HTMLElement>('.reader-list');
const pane = document.querySelector<HTMLElement>('[data-reader-pane]');
const slot = pane?.querySelector<HTMLElement>('[data-reader-slot]');
const openLink = pane?.querySelector<HTMLAnchorElement>('[data-reader-open]');
const status = document.querySelector<HTMLElement>('[data-reader-status]');

/** Fetched entry articles by slug. A rejected fetch is dropped so a later try can retry. */
const articles = new Map<string, Promise<Element>>();

/** Slug of the entry shown in the pane, and of the selected row. */
let shown = '';
let selected = '';
/** Increments per selection so a slow fetch cannot overwrite a newer one. */
let ticket = 0;

const rowFor = (slug: string) =>
  list?.querySelector<HTMLElement>(`[data-entry][data-slug="${CSS.escape(slug)}"]`) ?? null;
const linkIn = (row: HTMLElement) => row.querySelector<HTMLAnchorElement>('a[data-entry-link]');
const pageOf = (slug: string) => `/latest/${slug}/`;

function fetchArticle(slug: string): Promise<Element> {
  let pending = articles.get(slug);
  if (!pending) {
    pending = fetch(pageOf(slug))
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} for ${pageOf(slug)}`);
        return res.text();
      })
      .then((html) => {
        const found = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-entry-article]');
        if (!found) throw new Error(`no entry article in ${pageOf(slug)}`);
        // The entry page titles the entry as its h1; inside this page it is an h2.
        const h1 = found.querySelector('h1');
        if (h1) {
          const h2 = document.createElement('h2');
          for (const { name, value } of Array.from(h1.attributes)) h2.setAttribute(name, value);
          h2.append(...Array.from(h1.childNodes));
          h1.replaceWith(h2);
        }
        return found;
      });
    pending.catch(() => articles.delete(slug));
    articles.set(slug, pending);
  }
  return pending;
}

/** Shows the entry in the pane. On a failed fetch, opens the entry page instead. */
async function show(slug: string, announce: boolean) {
  if (!slot) return;
  const mine = ++ticket;
  if (shown === slug) {
    slot.removeAttribute('data-loading');
    return;
  }
  slot.setAttribute('data-loading', '');
  try {
    const article = await fetchArticle(slug);
    if (mine !== ticket) return;
    slot.replaceChildren(document.importNode(article, true));
    shown = slug;
    if (openLink) openLink.href = pageOf(slug);
    if (pane) pane.scrollTop = 0;
    if (announce && status) {
      const title = slot.querySelector('.entry-title')?.textContent?.trim() ?? '';
      status.textContent = `Showing: ${title}`;
    }
  } catch {
    if (mine === ticket) window.location.assign(pageOf(slug));
  } finally {
    if (mine === ticket) slot.removeAttribute('data-loading');
  }
}

/** Marks the row selected: aria-current on its headline link, data-selected on the row. */
function mark(slug: string) {
  selected = slug;
  for (const old of list?.querySelectorAll<HTMLElement>('[data-entry][data-selected]') ?? []) {
    old.removeAttribute('data-selected');
    linkIn(old)?.removeAttribute('aria-current');
  }
  const row = rowFor(slug);
  if (!row) return;
  row.setAttribute('data-selected', '');
  linkIn(row)?.setAttribute('aria-current', 'true');
}

function select(slug: string, { announce }: { announce: boolean }) {
  mark(slug);
  const url = new URL(window.location.href);
  url.searchParams.set('entry', slug);
  history.replaceState(history.state, '', url);
  if (WIDE.matches) void show(slug, announce);
}

/* Busy days: show the five highlights, keep the rest behind "Show all N entries". */
function setExpanded(toggle: HTMLButtonElement, open: boolean) {
  const rest = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
  if (!rest) return;
  rest.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  const text = toggle.querySelector('[data-day-toggle-text]');
  if (text) text.textContent = open ? 'Show the five only' : (toggle.dataset.labelClosed ?? '');
}

const toggles = [...document.querySelectorAll<HTMLButtonElement>('[data-day-toggle]')];
for (const toggle of toggles) {
  setExpanded(toggle, false);
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setExpanded(toggle, open);
    // Collapsing from far down the list would leave the reader lost: bring the day back.
    if (!open) toggle.closest('[data-day]')?.scrollIntoView({ block: 'nearest' });
  });
}

/** Opens the collapsed part of a day if the row is inside it. */
function reveal(row: HTMLElement) {
  const rest = row.closest<HTMLElement>('[data-day-rest]');
  if (!rest?.hidden) return;
  const toggle = toggles.find((t) => t.getAttribute('aria-controls') === rest.id);
  if (toggle) setExpanded(toggle, true);
}

/* Clicks: wide screens select, everything else navigates. */
list?.addEventListener('click', (event) => {
  if (!WIDE.matches || event.defaultPrevented) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-entry-link]');
  const row = link?.closest<HTMLElement>('[data-entry]');
  const slug = row?.dataset.slug;
  if (!slug) return;
  event.preventDefault();
  select(slug, { announce: true });
});

/* Prefetch on hover or keyboard focus, wide screens only. */
const prefetch = (event: Event) => {
  if (!WIDE.matches) return;
  const link = (event.target as Element).closest?.('a[data-entry-link]');
  const slug = link?.closest<HTMLElement>('[data-entry]')?.dataset.slug;
  if (slug && slug !== shown) fetchArticle(slug).catch(() => {});
};
list?.addEventListener('pointerover', prefetch);
list?.addEventListener('focusin', prefetch);

/* Crossing into the wide layout: make the pane match the selected row. */
WIDE.addEventListener('change', () => {
  if (!WIDE.matches || !selected) return;
  mark(selected);
  void show(selected, false);
});

/** The server-rendered (newest) entry: the selection when the URL names none. */
let newest = '';

/**
 * Selects what the URL's ?entry= names, else the newest entry, without touching
 * history. Returns the row selected from the URL, if any.
 */
function selectFromUrl(): HTMLElement | null {
  const asked = new URLSearchParams(window.location.search).get('entry');
  const row = asked ? rowFor(asked) : null;
  if (row && asked) {
    reveal(row);
    mark(asked);
    if (WIDE.matches) void show(asked, false);
    return row;
  }
  // The newest entry is the default only where the pane shows it; narrower, no row is current.
  if (WIDE.matches) {
    mark(newest);
    void show(newest, false);
  } else {
    mark('');
    selected = newest;
  }
  return null;
}

/* Initial selection: ?entry=<slug> if it names a row, else the newest entry. */
if (slot) {
  shown = slot.querySelector<HTMLElement>('[data-entry-article]')?.dataset.slug ?? '';
  newest = shown;
  selectFromUrl()?.scrollIntoView({ block: 'center' });
  // Back/forward: the filters push history entries and selections replace them, so
  // each entry's URL names its own selection; bring the pane and row in step with it.
  window.addEventListener('popstate', () => void selectFromUrl());
}

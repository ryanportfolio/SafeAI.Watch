# Where content goes

Re-read these files before placing anything; the layout changes.

| Surface | Driven by | When to change it |
|---|---|---|
| /latest archive, /timeline, homepage timeline, footer "Updated" date | `events.json` through `record.ts` helpers | Automatically, by adding the entry. Never hard-code dates or counts. |
| Homepage featured interview (`index.astro`, `interview = entry(<url>)`) | One record entry, looked up by URL | A new video or audio interview that is more recent and more substantive than the current one. The featured entry must exist in the record. |
| Homepage "selected reading" (`reading` array in `index.astro`, three cards) | Record entries by URL, with card title, summary, and one of the three existing art files | When a new primary source is stronger or more current than a card it would replace. Keep the three categories varied. Card copy must be accurate to the linked entry. Reuse existing art; new art needs the user. |
| Coverage cards, "From event to evidence" cards, hero lead | Hand-written copy in `index.astro` | Only when the record's scope actually changes. The homepage 3D scenes read these: the four coverage cards' eyebrow labels, the three step labels, and the hero text box. Do not rename, add, or remove those cards, or change the hero length much; note any change in the PR for the visuals workflow. |
| FAQ "How current is this record?", /about scope, /latest intro | Page copy using `events.length` and `lastUpdated` | When a new area of coverage appears that the copy does not describe. |

Decide per entry:

1. Every accepted source becomes a record entry. That is the default and often the only
   placement.
2. Consider a homepage feature only for sources that are primary, recent, and significant
   to a general reader. Explain the choice in the PR and name what it replaces.
3. If several entries tell one story (an incident, the company's report, an independent
   investigation), keep them as separate dated entries with consistent titles so the
   timeline reads as a sequence.
4. When the material shows a gap in the site (a topic, a missing explanation), list it in
   the PR as a suggestion rather than building new sections unasked.

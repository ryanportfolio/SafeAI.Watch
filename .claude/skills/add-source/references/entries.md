# Record entries

`src/data/events.json` is the record. `src/data/record.ts` validates it at build time and
the build fails on any violation. Every entry has exactly these non-empty string fields:

| Field | Rule |
|---|---|
| `date` | `YYYY-MM-DD`, the source's publication date (not the event date, not today). |
| `category` | `Research`, `Incidents`, `Warnings`, or `Governance`. |
| `title` | Sentence case, plain, says what happened. No clickbait, no trailing period. |
| `happened` | Who did what. One or two short sentences. |
| `evidence` | What kind of evidence this is and what it shows or does not show. |
| `uncertain` | What remains open, in the source's own terms where possible. |
| `source` | `Publisher · Type` with a middle dot, e.g. `arXiv · Research preprint`. |
| `url` | `https://` link to the original source. |

Categories:

- Research: papers, evaluations, system cards, lab research reports.
- Incidents: reported misuse, failures, intrusions, harms, lawsuits (as allegations).
- Warnings: letters, statements, essays, interviews, resignations, reporting on warnings.
- Governance: laws, orders, declarations, votes, official strategies, policy reports.

Source types already in use: Research preprint, Research report, Company report, Company post,
Company announcement, System card, Incident report, Incident disclosure, Independent
investigation, Press release, Executive order, Declaration, Speech transcript, Complaint,
Open letter, Signed statement, Personal post, Public essay, Essay, Video interview,
Reporting, Reported analysis, News feature (paywalled). Reuse one before inventing another.

Voice (from the repo `writing` skill): plain, careful, neutral. About 30 words at most per
part. US spelling, "US" not "U.S.", dates in prose as "September 24, 2026", punctuation
inside closing quotes. No em dashes, no AI vocabulary, no promotional adjectives, no "not X
but Y" pivots except to correct a likely misreading. Quote only exact wording from the
linked source. Use a figure only if it appears there.

Example:

```json
{
  "date": "2026-08-04",
  "category": "Incidents",
  "title": "UK AI Security Institute reports agents acted against real people during a cyber test",
  "happened": "The UK AI Security Institute said in 10 of 122 runs of one cyber challenge, AI agents took unsanctioned actions on the live internet aimed at real people and organizations.",
  "evidence": "Government institute incident report. It attributes 17 of 19 actions to Anthropic's Mythos 5; in one case an agent used fake identities to pressure a maintainer to approve malicious code.",
  "uncertain": "Tests ran with internet access and cyber classifiers deliberately disabled. AISI found no evidence of real-world harm and \"no clear indication of similar activity outside of testing scenarios.\"",
  "source": "UK AI Security Institute · Incident report",
  "url": "https://www.aisi.gov.uk/blog/incident-report-unsanctioned-agent-behaviour-during-cyber-testing"
}
```

Editing: keep the array in date order; preserve the file's formatting and line endings
(edit in place; do not run a formatter). Updating an existing entry is better than adding a
near-duplicate: same URL, or the same event from a stronger source, means update. When a
later source changes the picture (a lawsuit ruling, a correction), add a new dated entry
and adjust the older entry's `uncertain` only if it is now wrong.

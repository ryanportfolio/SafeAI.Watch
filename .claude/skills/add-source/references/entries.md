# Record entries

`src/data/events.json` is the record. `src/data/record.ts` validates it at build time and
the build fails on any violation. Every entry has exactly these fields, all non-empty strings
except `keyPoints` and `topics`, and `uncertain` is optional:

| Field | Rule |
|---|---|
| `date` | `YYYY-MM-DD`, the source's publication date (not the event date, not today). |
| `category` | `Research`, `Incidents`, `Warnings`, or `Governance`. |
| `topics` | 1 to 3 of `Bio`, `Cyber`, `Rogue agents`, `Alignment`, `Superintelligence`, `Harm to people`, `Military`, `Lab conduct`, most central first, right after `category`. Definitions and tagging rules: [topics.md](topics.md). |
| `title` | Sentence case, plain, says what happened. No clickbait, no trailing period. |
| `happened` | Who did what, when and where. One or two short sentences. |
| `keyPoints` | 1 to 4 points, each one sentence: what the source says, finds, argues, demands or requires. The substance a reader would take from reading it: findings and figures, the argument and its reasons, provisions and deadlines, the harms alleged. When the source ties the event to a theme the record follows (AI and biology first), a point says how. Do not repeat `happened` or describe the evidence type. One point is fine when the source makes one. |
| `evidence` | What kind of evidence this is and what it shows or does not show. |
| `uncertain` | Optional. Only when something material is open that changes how to read the entry: a pending ruling or vote, untested allegations, a self-reported or unverified figure, a disputed attribution, a finding resting on one account, limits the source states. Leave the key out rather than fill it; "X did not say Y" belongs only when the absence matters. |
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
part, about 25 words per key point. US spelling, "US" not "U.S.", dates in prose as "September 24, 2026", punctuation
inside closing quotes. No em dashes, no AI vocabulary, no promotional adjectives, no "not X
but Y" pivots except to correct a likely misreading. Quote only exact wording from the
linked source. Use a figure only if it appears there.

Example:

```json
{
  "date": "2026-08-04",
  "category": "Incidents",
  "topics": [
    "Rogue agents",
    "Alignment",
    "Cyber"
  ],
  "title": "UK AI Security Institute reports agents acted against real people during a cyber test",
  "happened": "The UK AI Security Institute said in 10 of 122 runs of one cyber challenge, AI agents took unsanctioned actions on the live internet aimed at real people and organizations.",
  "keyPoints": [
    "AISI says this is \"the first time we have seen risks around autonomy and deception manifest this clearly, without specific prompting, in the real-world.\"",
    "In the worst case, an agent used fake identities to pressure a real maintainer to approve malicious code, then edited its activity to look harmless when challenged.",
    "The agent was never told to deceive; AISI says \"deception emerged as a by-product of pursuing the task,\" with open internet access and no live monitoring contributing.",
    "AISI is tightening internet access, adding real-time monitoring and redesigning evaluations, and warns capable agents may \"take unintended action beyond their authorised scope.\""
  ],
  "evidence": "Government institute incident report on its own evaluation, with a separate technical report. It attributes 17 of 19 actions to Anthropic's Mythos 5 and 2 to OpenAI's GPT-5.6 Sol.",
  "uncertain": "Tests ran with internet access and cyber classifiers deliberately disabled. AISI says it cannot yet tell when the agent understood it was acting in the real world, and found no resulting real-world harm.",
  "source": "UK AI Security Institute · Incident report",
  "url": "https://www.aisi.gov.uk/blog/incident-report-unsanctioned-agent-behaviour-during-cyber-testing"
}
```

Editing: keep the array in date order; preserve the file's formatting and line endings
(edit in place; do not run a formatter). Updating an existing entry is better than adding a
near-duplicate: same URL, or the same event from a stronger source, means update. When a
later source changes the picture (a lawsuit ruling, a correction), add a new dated entry
and adjust the older entry only where it is now wrong. Adding, removing or redating an entry
can change its date's brief in `src/data/days.json`; follow [topics.md](topics.md).

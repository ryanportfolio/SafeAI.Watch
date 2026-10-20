# Topics and day briefs

Every entry in `src/data/events.json` carries `topics`, and every date with 3 or more entries
has a brief in `src/data/days.json`. `src/data/record.ts` checks both at build time.

## Topics

`topics` is a list of 1 to 3 of the values below, most central first, placed right after
`category` in the entry. The table order is the order the site shows them in (week grid rows,
chips). Bio comes first because it is the site's first coverage area.

| Topic | Tag it when a main subject of the entry is |
|---|---|
| Bio | AI and biological risk: bioweapons, pathogens, biosecurity, DNA synthesis screening, biology capability evaluations, access to life-science or biology models, AI-run wet labs |
| Cyber | AI in computer security: intrusions, exploits, vulnerability discovery, malware, phishing, fraud and crime infrastructure, prompt injection, security flaws in agents or AI tools, cyber capability evaluations |
| Rogue agents | AI systems acting outside their instructions or permissions: escaping sandboxes or test limits, agents reaching outside systems without authorization, resisting shutdown, self-replication, hiding their traces, and investigations, notifications or responses about such incidents |
| Alignment | whether models pursue what their developers intend: reward hacking, scheming, deception, evaluation awareness, hidden capabilities (sandbagging), misalignment reports, monitoring and interpretability research |
| Superintelligence | the pace and endpoint of frontier AI: superintelligence, recursive self-improvement, extinction or civilization-scale catastrophe warnings, calls to pause, slow or ban frontier development, international talks on frontier risk |
| Harm to people | direct harm to individuals or the public: suicide and mental health, child safety, sexual imagery, manipulation, scams and deepfakes aimed at people, unsafe medical or personal advice, lawsuits over such harm |
| Military | AI in defense, intelligence and national security: military contracts and strategy, weapons, drones, intelligence use, national-security procurement exclusions |
| Lab conduct | how AI companies run safety: resignations and firings, whistleblowers, internal practices, safety frameworks and commitments, voluntary pledges, disclosures, evaluator access and publication rights, lobbying |

Tagging rules:

- Tag a topic only when it is a main subject of the entry, not a passing mention.
- List the most central topic first. The table order is for display; it does not set the order
  inside an entry.
- Type (`category`: Research, Incidents, Warnings, Governance) is separate and unchanged. A
  Governance entry still gets the topic its rule or bill is about.
- Every entry gets at least one topic. When nothing fits well, pick the closest, and the
  closest must still be defensible from the entry's own text.
- The value must match the table exactly, case and spacing included (`Harm to people`, not
  `Harm`). The build fails on an unknown, repeated or missing topic, or more than 3.
- When an update changes what an entry is about, recheck its topics.

## Day briefs

A brief tells a reader what a busy date held. Count a date's entries by `date` (the source's
publication date), across the whole record, not just this run's additions.

| Entries on the date | Brief in `days.json` |
|---|---|
| 1 or 2 | None. The build fails if one exists. |
| 3 to 5 | `date` and `summary` |
| 6 or more | `date`, `summary` and `highlights` (the Five to read) |

`days.json` is an array with one object per date, newest date first, keys in the order `date`,
`summary`, `highlights`. Edit it in place and keep its formatting and line endings; do not run a
formatter.

### Summary

- One or two sentences, at most 320 characters, no em dashes.
- Every fact in it is stated in that date's entries. The summary condenses the record and adds
  nothing to it: no outside context, no figure, name or claim the entries do not contain.
- Lead with the most significant entries, in the same order as the Five to read, and name who
  did what. Same voice as the entries (see [entries.md](entries.md)).
- No ranking or alarm language. The order of the summary shows significance; its words do not
  rank events ("the most serious", "the biggest") or raise alarm ("alarming", "chilling") on
  the site's behalf. Quoting a source's own term, attributed to that source, is fine.
- The build counts sentences by splitting after `.`, `!` or `?` (a closing quote may follow)
  when a space and then a capital letter, digit or opening quote come next. An abbreviation
  mid-summary, such as "Sen. Hawley" or "Gov. Newsom", therefore counts as a sentence break and
  can turn two sentences into three. Write the word out ("Senator Hawley") or rephrase.
- The build checks length, sentence count and em dashes. It does not check that each fact is in
  the entries; the verification pass does.

### Five to read

On a date with 6 or more entries, `highlights` lists exactly 5 distinct entry slugs from that
date, most significant first. The site shows them as "Five to read": the entries a reader with
little time should open to understand the day.

A slug looks like `<date>-<lowercased title words joined by ->`, with the title part cut at a
word boundary near 60 characters when it runs longer. Compute slugs with `slugOf` from `src/data/record.ts`,
never by hand. Plain `node` cannot import that file (it imports JSON without an import
attribute); from the repo root, run

```
npx --yes tsx -e "import { slugOf } from './src/data/record.ts'; console.log(slugOf({ date: '2026-10-19', title: 'Entry title' }))"
```

or read the `/latest/<slug>/` paths in a fresh build. Importing `record.ts` runs the record's
build checks, so the snippet fails while `days.json` is out of step with `events.json` (for
example, a date that just reached 3 entries and has no brief yet). Run it before editing, or on
a copy where the record still builds: `slugOf` reads only the `date` and `title` you pass, so
the entry does not need to be in `events.json` yet. Editing a title changes its slug, so update
any highlight that points at it.

Rank the date's entries by significance:

1. Biggest real-world impact: harm that happened, a binding rule or ruling, an action by a
   government or lab that changes what others can do.
2. Strongest new evidence: a primary finding or incident report over a restatement of known
   results.
3. Clearest signal of where AI risk is heading: a new capability, failure or policy direction.

Primary-source news outranks commentary. An essay, interview or opinion ranks below an incident
report, ruling, law or evaluation of similar weight.

Bio rule: every Bio-tagged entry of the date is among the 5. When the date has more than 5 Bio
entries, all 5 highlights are Bio entries, chosen by the same ranking. Fill the Bio slots first,
give the rest to the highest-ranked other entries, then order all 5 by significance. Bio is
first because AI and biological risk is the site's first coverage area. The build fails when
`highlights` is not exactly 5 distinct slugs of that date's entries or breaks the Bio rule.

### When a later run adds to a date

Entries arrive for a date after its brief exists: a source is indexed late, or a second run
covers the same day. Each time entries are added to, removed from or moved off a date:

- Recount. A date that reaches 3 entries gets a new brief; one that reaches 6 gains
  `highlights`. A date that falls below 6 loses `highlights`, and one that falls below 3 loses
  its brief.
- Reread the summary. Rewrite it when the new entries change what the day's most significant
  events are; otherwise leave it.
- Re-pick the Five to read from all of the date's entries, old and new. A new entry goes in only
  when it ranks above one already there. A new Bio entry always goes in while the date has 5 or
  fewer Bio entries, displacing the lowest-ranked non-Bio pick; past 5, it competes with the
  other Bio entries by the same ranking.
- Say in the PR which briefs were added or changed and why the five changed.

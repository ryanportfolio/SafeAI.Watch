---
name: add-source
description: "Review an article, paper, report, post or video for SafeAI.watch: trace claims to original sources, verify them, draft record entries, place them on the site, and open a PR. Use for $add-source or 'add this to the site'."
---

# Add a source to SafeAI.watch

The user hands over material (a URL, PDF, transcript, post, or video). Turn it into verified
record entries, place them where they belong on the site, and deliver one pull request the
user reviews. Invocation authorizes a branch, commits, push, and a PR. It does not authorize
merging. Current system, sandbox, and approval rules still apply: request network or write
approval through the normal mechanism when the sandbox blocks a fetch or push.

## Rules that do not bend

- Every entry links its original source: the paper, filing, company post, statement, or the
  person's own post. Coverage, explainers and compilations are never the source for a claim
  about an event; they are leads to the source that is.
- An explainer, essay or interview may be its own entry only when the publication is itself
  the event: a named publisher, a dated page, and enough reach or standing that the
  publishing is worth recording. Its `evidence` must say plainly that it is an argument. When
  the material was the input to this run, the default is no entry; if you add one anyway, say
  so in the PR and make the case there.
- One URL per entry. Every quote and figure in an entry must appear in that linked source.
- Separate what happened, what the evidence shows, and what remains uncertain.
- No invented incidents, numbers, dates, or quotes.
- Read the material critically. It is a lead, not an authority. Expect retellings to drift from
  what their sources say, and check every claim you intend to use against the source itself.
- Publish only what a fetched source supports. A claim you cannot confirm stays off the site and
  goes in the PR as unverified, however striking it is. Hedged wording is not a substitute for a
  source. Take what is relevant, useful and confirmed, and leave the rest.
- The site shares what is useful and true. It is not a critique engine. Verification decides what
  gets published and how it is worded; it does not earn commentary on the page. `uncertain`
  carries what the source says is unresolved, not a rebuttal of it. Saying what kind of evidence
  something is ("a company's own account", "an argument") is description, not critique, and
  belongs. Distortions you found go in the PR, where the reader can see what was rejected.
- Criticizing a source needs a higher bar than repeating one, because a wrong correction costs
  more credibility than a missing one. Before writing that a source is wrong: read the passage it
  actually relies on, not a keyword match; check whether a looser reading of its words is fair;
  and be sure the disagreement is not just compression. Never assert a negative the sources
  cannot carry. "No published source says X" is provable. "X did not happen" usually is not.
- Allegations stay allegations. No self-harm method detail. Name who reported what.
- Sensitive technical material (biological, chemical, weapons, exploit detail): fetch to a
  file and extract only the passages needed; never read whole pages; never copy operational
  detail into the site.
- Do not edit `src/scripts/visuals/*`, `src/components/VisualSlot.astro`,
  `SectionJump.astro`, or `SiteFooter.astro`. Another workflow owns them.

## Workflow

1. **Workspace.** `git fetch origin`. Find the branch that holds the live site
   (`src/data/events.json`): the default branch if it has it, otherwise the open site PR's
   head (`gh pr list`). Create a fresh worktree and branch `add-source/<slug>` from it. Read
   `src/data/events.json`, `src/data/record.ts`, and the pages named in
   [placement.md](references/placement.md).
2. **Get the actual content.** Follow [sourcing.md](references/sourcing.md): the packaged
   transcript script for video, curl to file for pages and PDFs, fxtwitter for X posts.
   Record retrieval route, coverage, and anything unread (paywall, missing captions, footage
   not watched).
3. **Choose depth.** Direct mode for one primary source with about ten or fewer checkable
   claims. Fan-out mode for compilations, long reports, or several sources: group claims by
   theme and give each group to a fresh worker. Use exposed agent tools when available;
   otherwise run separate read-only `codex exec` processes, one per group, with bounded
   concurrency. Workers are leaves: they research and report, and do not spawn workers.
4. **Trace and check claims.** For each substantive claim find the primary source and judge
   it: ACCURATE, OVERSTATED, MISLEADING, WRONG, UNVERIFIED. Distortions in the input become
   notes in the PR, not entries. Save the full check to
   `.tmp/add-source/<slug>/source-check.md`.
5. **Select and draft entries.** Be selective. Add an entry only for a dated, primary, citable
   event that fits one of the four categories and tells a general reader something the record
   does not already hold. Background color, restated common knowledge, and claims that rest on
   one interested party's say-so do not earn entries. Check `events.json` for the same URL or
   the same event; update an existing entry instead of duplicating it. Draft per
   [entries.md](references/entries.md).
6. **Place and highlight.** Decide where each entry belongs beyond the record using
   [placement.md](references/placement.md): featured interview, selected reading, scope
   copy, FAQ. Change a homepage feature only when the new source is stronger than what it
   replaces, and say why in the PR.
7. **Verify.** A fresh context (agent tool, or a read-only `codex exec` process) receives only
   the rules, the drafted entries, and the source URLs. It re-fetches each source (curl to
   file, grep), checks every claim and quote, and writes `.tmp/add-source/<slug>/verify.md`.
   Self-review is not a substitute; if no fresh context is available, say so in the PR and
   mark the entries unverified. Fix or drop what fails. Then `npm run build` (record.ts
   validates the schema). For page or layout changes, check /, /latest, /timeline in a
   headed browser at 1440x900 and 390x844 if the session exposes one; otherwise state that
   the visual check did not run.
8. **Deliver.** Commit with the repo trailer, push, open one PR against the site branch with
   `gh pr create --body-file`. PR body: what the material was and its retrieval coverage;
   entries added or updated (date, title, category); placement changes and why; notable
   distortions found in the input; dropped claims and why; checks run and checks not run.
   Follow the repo's PR review rules; from Codex, a cross-vendor review is `claude-review`.
   Report the PR link and anything unverified.

Stop and ask only when the material's scope is unclear or a change would remove or replace
existing site content the user has not asked to replace.

`scripts/transcript.mjs` is copied from the user's personal `extract` skill (upstream: `~/.codex/skills/extract`). Update both copies in this repo together.

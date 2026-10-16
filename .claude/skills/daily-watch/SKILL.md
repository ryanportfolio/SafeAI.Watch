---
name: daily-watch
description: "Daily unattended research run for SafeAI.watch: scan labs, evaluators, governments, courts, preprints, news, and X and Bluesky for early signals of new AI safety and security events, keep only what clears the publish bar, and open or update one PR through the add-source workflow. Most days it publishes nothing. Use for /daily-watch or when the safeai-daily-watch scheduled task fires."
---

# Daily watch

Research every day; publish only when something clears the bar in
[bar.md](references/bar.md). A run that finds nothing worth adding writes its report and
stops. That is the expected outcome on most days.

The run is unattended. Nobody answers questions, so never ask: when something is unclear,
skip it and record why in the run report. Invocation authorizes reading, a branch, commits,
push, and opening or updating one PR. It does not authorize merging, pushing to `main`,
force-pushing, or deleting anything on GitHub. The user merges with `/merge`, which runs the
Codex review; do not run `/codex-review` yourself.

## Rules

- Every rule in `.claude/skills/add-source/SKILL.md` ("Rules that do not bend") applies to
  every entry this run drafts. Read it at the start of each run.
- The routine edits only `src/data/events.json` and the README files generated from it
  (`README.md`, `assets/readme/*`). Homepage features, page copy and layout stay as they
  are; suggest changes in the PR body instead.
- No per-run limit: publish everything that clears the bar, and nothing that does not.
  The bar decides, not the count.
- Subagents inherit the session model; omit `model`.
- Paths are absolute in every command (Bash cwd resets each call). Prefix `git show
  <rev>:<path>` with `MSYS_NO_PATHCONV=1`. Never use EnterWorktree or Agent `isolation`.
- X and Bluesky reads go through `scripts/x-signals.mjs` (free routes first, paid X search
  only while twitterapi.io has credit). Never curl the twitterapi.io API directly and never
  run two searches at once.

## State

State lives outside the repo so it survives across runs and worktrees:
`D:\CoreWise\_artifacts\SafeAI.Watch\daily-watch\`. If `D:\` is missing or not writable,
use `C:\Users\Home\CoreWise\_artifacts\SafeAI.Watch\daily-watch\` and say so in the report.

| File | Holds |
|---|---|
| `last-run.json` | `{ "date": "YYYY-MM-DD" }` of the last finished run |
| `seen.jsonl` | One line per judged candidate: `leadUrl`, `primaryUrl`, `title`, `eventDate`, `found`, `verdict` (`published`, `pr`, `held`, `skipped`), `reason`, and `pr` (number) for `pr` verdicts. Append only; the latest line for an event wins. |
| `runs/<date>/` | Lane outputs (`lane-*.jsonl`, `x-raw.jsonl`, `x-gaps.jsonl`) and `report.md` for that run |
| `runs/<date>/bin/` | This run's copy of the skill's `scripts/` folder |
| `tracked.jsonl` | Items still in motion (bills, suits, motions, investigations, rulemakings, order deadlines): `entryUrl`, `title`, `kind`, `jurisdiction`, `id` (bill or docket number, or null), `statusUrl` (official page to check), `status`, `statusDate`, `added`, `lastChecked`, `open` (false once final). Append only; the latest line for an `entryUrl` wins. |

## Workflow

1. **Window and base.** `git -C C:/Users/Home/CoreWise/SafeAI.Watch fetch origin`. Every
   run scans the same rolling window: the 30 days up to and including today, whatever the
   last run covered and whatever dates the record already has entries for. Sources publish,
   get indexed and get covered late, and a day with entries can still hold events the
   record missed; the record and `seen.jsonl` keep repeats out. One exception: X account
   timelines start three days before `last-run.json` `date` (the full 30 days on the first
   run), because posts do not appear in a timeline after the fact. Check for an open
   routine PR:
   `gh pr list --repo ryanportfolio/SafeAI.Watch --state open --json number,headRefName,url`
   and keep the PR whose `headRefName` starts with `daily-watch/`.
   The record to dedupe against is `origin/main`'s `events.json` plus that PR branch's, if
   one is open. Export the skill's scripts from `origin/main` into `runs/<date>/bin/`
   (`x-signals.mjs`, `x-handles.json`, each via `MSYS_NO_PATHCONV=1 git show
   origin/main:.claude/skills/daily-watch/scripts/<file> > <bin>/<file>`) and check each
   file is non-empty. `<skill-dir>/scripts/` in [watchlist.md](references/watchlist.md)
   means that `bin` folder.
2. **Scan.** Launch the five lanes in [watchlist.md](references/watchlist.md) and one
   follow-ups lane as parallel research subagents in one message. The follow-ups lane gets
   every open item in `tracked.jsonl` and, for each, checks its `statusUrl`, the court
   docket or legislature's status page, and a WebSearch for the item since `statusDate`.
   It reports every change of status with its official source as a candidate (the outcome
   is the event; date it by the source), notes unchanged items in one line each, and
   writes `runs/<date>/lane-followups.jsonl`. The "Follow-ups" rules in
   [bar.md](references/bar.md) apply. Give each scan lane the window, its lane, the candidate format,
   the sensitive-material rule, and the state folder path; each writes
   `runs/<date>/lane-<name>.jsonl`. Only the signals lane runs `x-signals.mjs`. Give each
   lane the path to `seen.jsonl`: lanes may leave out events whose latest verdict is
   `skipped` or `published`, and must still report `held` ones, since a new route may have
   opened. Every lane also searches the shared themes in watchlist.md, AI and biology
   first.
3. **Recall check.** Before triage, test the lanes against the widest net. Take every
   `aggregators` and `people` post in the window with at least 500 likes, plus every post
   of any size that touches theme 1 (AI and biology). Each one must match a lane candidate,
   an event already in the record or `seen.jsonl`, or get a one-line dismissal in
   `report.md` (off topic, market chatter, duplicate). Anything left over is a miss: trace
   it now as a candidate (find who said or did what, and the open original), and list
   every miss in the report and PR body with the lane that should have caught it, so the
   watchlist can be fixed.
4. **Triage.** Merge the lanes and dedupe across them. Then drop, matching by any URL
   (lead or primary) and by event (the same happening from another source or outlet):
   - anything already in the record;
   - events whose latest `seen.jsonl` verdict is `skipped` or `published`;
   - `pr` events whose PR is still open or was merged. A `pr` event whose PR was closed
     without merging counts as `skipped` (the user declined it); do not re-propose it
     unless a later development makes it a new event.
   Re-judge `held` events: publish if a route opened, keep holding while the first hold is
   under seven days old, then mark `skipped`. Judge the rest against
   [bar.md](references/bar.md), including its paywall routine. Everything that passes
   goes into this run's PR; there is no per-run limit. With more than about ten, draft
   them in parallel subagents grouped by theme (add-source fan-out mode), each writing its
   entries to its own file, then merge them into `events.json` in date order. Append
   every judged candidate to `seen.jsonl` with its verdict.
5. **Nothing passes.** Write `report.md`, update `last-run.json`, and stop. No worktree,
   branch, commit or PR.
6. **Workspace.** If a routine PR is open, add a worktree on its branch:
   `git -C C:/Users/Home/CoreWise/SafeAI.Watch worktree add -B <headRefName> C:/Users/Home/CoreWise/_wt/SafeAI.Watch/daily-<date> origin/<headRefName>`,
   then merge `origin/main` into it (no rebase, no force-push). Otherwise
   `worktree add -b daily-watch/<date> <same path> origin/main`. If the path already exists
   from a crashed run, remove that worktree first. Run `npm ci` there.
7. **Draft.** For each kept candidate, run add-source workflow steps 2 to 5 (get the content,
   trace and check claims, select and draft) with this run's sources as the material. Save
   source checks under `<worktree>/.tmp/add-source/<slug>/`. Step 6 (placement) becomes
   suggestions in the PR body.
8. **Verify.** add-source step 7: one fresh subagent per run re-fetches every source and
   checks every claim and quote in the drafted entries; fix or drop what fails. Then, in
   the worktree, `npm run build`, `node scripts/readme/build.mjs` (regenerates the README
   and masthead from the record), `node scripts/readme/build.mjs --check` and
   `node scripts/readme/meta.mjs --lint` (the PR-side README gate). The README CI job fails on stale output, and
   `npm run build` does not catch it. If a check fails and the cause is not in the drafted
   entries, stop and report; do not touch other files to make it pass.
9. **Deliver.** Commit `src/data/events.json` and the regenerated `README.md` and
   `assets/readme/*` only, with the repo trailer, message in a `.tmp` file and
   `git commit -F`. Push. With no open PR:
   `gh pr create --head daily-watch/<date> --base main --body-file <file>`, title
   `Daily watch: <date>`. With an open PR: push to its branch and append a dated section to
   its body (`gh pr edit --body-file`). Body sections per run: window and lanes scanned;
   entries added (date, category, title, source, why it cleared the bar); held and skipped
   candidates worth the user's attention, with reasons; paywall routes tried; placement
   suggestions; checks run. End with the PR attribution line.
10. **Close out.** Write `report.md` (window, counts per lane, verdicts, follow-up changes,
   PR link) and write today's date to `last-run.json`. Append to `tracked.jsonl`: a line
   for every new entry in the PR that bar.md says to track (with its official status page
   and current status), an updated line for every tracked item checked this run (status,
   `lastChecked`), and `open: false` for items whose outcome is now final. Drop items whose
   only entry was in a PR closed without merging. Remove the worktree with `git worktree remove <path>` once the push
   succeeded (its `node_modules` is a real folder from `npm ci`, not a link). Close any
   browser you opened. End the run with a three-line summary: entries added, PR link or
   "no PR", notable held items.

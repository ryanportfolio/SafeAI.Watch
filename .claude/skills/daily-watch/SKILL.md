---
name: daily-watch
description: "Daily unattended research run for SafeAI.watch: scan labs, evaluators, governments, courts, preprints, news and X for new AI safety and security events, keep only what clears the publish bar, and open or update one PR through the add-source workflow. Most days it publishes nothing. Use for /daily-watch or when the safeai-daily-watch scheduled task fires."
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
- The routine edits only `src/data/events.json`. Homepage features, page copy and layout
  stay as they are; suggest changes in the PR body instead.
- At most three new entries per run. Fewer strong entries beat more weak ones.
- Subagents inherit the session model; omit `model`.
- Paths are absolute in every command (Bash cwd resets each call). Prefix `git show
  <rev>:<path>` with `MSYS_NO_PATHCONV=1`. Never use EnterWorktree or Agent `isolation`.
- X searches go through `node ~/.claude/skills/twitter-search/search.mjs`, one at a time;
  never curl the API, never run two searches at once.

## State

State lives outside the repo so it survives across runs and worktrees:
`D:\CoreWise\_artifacts\SafeAI.Watch\daily-watch\`. If `D:\` is missing or not writable,
use `C:\Users\Home\CoreWise\_artifacts\SafeAI.Watch\daily-watch\` and say so in the report.

| File | Holds |
|---|---|
| `last-run.json` | `{ "date": "YYYY-MM-DD", "windowEnd": "YYYY-MM-DD" }` of the last finished run |
| `seen.jsonl` | One line per judged candidate: `leadUrl`, `primaryUrl`, `title`, `found`, `verdict` (`published`, `pr`, `held`, `skipped`), `reason` |
| `runs/<date>/` | Lane outputs (`lane-*.jsonl`) and `report.md` for that run |

## Workflow

1. **Window and base.** `git -C C:/Users/Home/CoreWise/SafeAI.Watch fetch origin`. Window
   start: the day before `last-run.json` `windowEnd`; on the first run, the newest `date`
   in `origin/main:src/data/events.json`. Never reach back more than 14 days. Window end:
   today. Check for an open routine PR:
   `gh pr list --repo ryanportfolio/SafeAI.Watch --state open --json number,headRefName,url`
   and keep the PR whose `headRefName` starts with `daily-watch/`.
   The record to dedupe against is `origin/main`'s `events.json` plus that PR branch's, if
   one is open.
2. **Scan.** Launch the four lanes in [watchlist.md](references/watchlist.md) as parallel
   research subagents in one message. Give each the window, its lane, the candidate format,
   the sensitive-material rule, and the state folder path; each writes
   `runs/<date>/lane-<name>.jsonl`. Only the X lane uses the twitter script. Re-check
   `held` candidates from `seen.jsonl` that are under seven days old.
3. **Triage.** Merge the lanes. Drop anything already in the record (same URL, or the same
   event from any source) or already `skipped`/`published` in `seen.jsonl`. Judge the rest
   against [bar.md](references/bar.md), including its paywall routine. Rank what passes and
   keep the top three. Append every judged candidate to `seen.jsonl` with its verdict.
4. **Nothing passes.** Write `report.md`, update `last-run.json`, and stop. No worktree,
   branch, commit or PR.
5. **Workspace.** If a routine PR is open, add a worktree on its branch:
   `git -C C:/Users/Home/CoreWise/SafeAI.Watch worktree add -B <headRefName> C:/Users/Home/CoreWise/_wt/SafeAI.Watch/daily-<date> origin/<headRefName>`,
   then merge `origin/main` into it (no rebase, no force-push). Otherwise
   `worktree add -b daily-watch/<date> <same path> origin/main`. If the path already exists
   from a crashed run, remove that worktree first. Run `npm ci` there.
6. **Draft.** For each kept candidate, run add-source workflow steps 2 to 5 (get the content,
   trace and check claims, select and draft) with this run's sources as the material. Save
   source checks under `<worktree>/.tmp/add-source/<slug>/`. Step 6 (placement) becomes
   suggestions in the PR body.
7. **Verify.** add-source step 7: one fresh subagent per run re-fetches every source and
   checks every claim and quote in the drafted entries; fix or drop what fails. Then
   `npm run build` in the worktree. If the build fails and the cause is not in the
   drafted entries, stop and report; do not touch other files to make it pass.
8. **Deliver.** Commit `src/data/events.json` only, with the repo trailer, message in a
   `.tmp` file and `git commit -F`. Push. With no open PR:
   `gh pr create --head daily-watch/<date> --base main --body-file <file>`, title
   `Daily watch: <date>`. With an open PR: push to its branch and append a dated section to
   its body (`gh pr edit --body-file`). Body sections per run: window and lanes scanned;
   entries added (date, category, title, source, why it cleared the bar); held and skipped
   candidates worth the user's attention, with reasons; paywall routes tried; placement
   suggestions; checks run. End with the PR attribution line.
9. **Close out.** Write `report.md` (window, counts per lane, verdicts, PR link) and update
   `last-run.json`. Remove the worktree with `git worktree remove <path>` once the push
   succeeded (its `node_modules` is a real folder from `npm ci`, not a link). Close any
   browser you opened. End the run with a three-line summary: entries added, PR link or
   "no PR", notable held items.

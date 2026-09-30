# Recon rules for the AI safety film

Every recon agent reads this file first and follows it.

## The project

SafeAI.watch (this repo) is a public editorial site that tracks AI safety and security for general readers: research, reported incidents, public warnings, and policy. Every entry links its original source and separates what happened, what the evidence shows, and what remains uncertain.

We are building a short, silent, shareable JavaScript animation (later exported to video) that will sit on the site's About page. Its subject is AI safety as a whole: where AI is going wrong or could go wrong, and where safety work is succeeding. The site appears only at the end.

Owner's direction, binding on everything you gather:

- **Tone: calm and focused.** No doom, no alarm, no hype. State things plainly.
- **Balance.** Progress gets equal weight and the same evidence standard as risk. No inflated wins, no inflated harms.
- **Newest first.** Today is 2026-09-30. Prefer sources published June to September 2026. Use older material only when it is still the latest word on the point, or foundational; label its date clearly.
- Sources the site does not list yet are preferred. The site's own record is allowed.

## Sourcing (from the site's add-source rules)

- Every fact links its original source: the paper, system card, filing, company post, official statement, law text, or the person's own post. News coverage and explainers are leads to the source, never the source, unless the reporting itself is the event (an investigation whose findings exist nowhere else); then mark the source type `Reporting`.
- One URL per fact. Every quote and number must appear verbatim in that source. Fetch it and find the passage; never cite from memory or from a search snippet.
- Judge each claim you considered: ACCURATE, OVERSTATED, MISLEADING, WRONG, UNVERIFIED. Only ACCURATE rows go in the main table; the rest go in the rejected list with a reason.
- Keep the source's own limits: preprint, self-reported, contrived test setup, small sample, allegations untested. A capability shown in a controlled test is not a real-world incident; say which it is.
- Allegations stay allegations. Name who reported what. No self-harm method detail.
- Sensitive technical material (biological, chemical, weapons, exploit detail): fetch to a file and extract only the passages needed; never copy operational detail anywhere.
- Fetching: `curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36" -o <file> <url>` then grep, or WebFetch with a narrow question. Save downloads under `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\about-film\.tmp\film\<your-slice>\`. Never read a whole page into context. Blocked page: try WebFetch, then `https://web.archive.org/web/2026*/<url>`. Log the route.
- The Bash tool's cwd resets between calls. Use absolute paths.

## Output

Write exactly one file: `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\about-film\film\recon\<your-slice>.md`. Edit nothing else in the repo (scratch files under `.tmp\film\<your-slice>\` are fine).

File layout:

1. `## Facts`: a table, one row per usable fact:

   | Fact | Exact text or value | Source URL | Published | Kind | Evidence type | Verdict | Limits |

   - Kind: copy, number, quote, event, finding, policy, token, asset, behavior.
   - Evidence type: `happened` (observed real-world event), `shown-in-test` (controlled evaluation or lab result), `warning` (forecast or argument by a named person or body), `progress` (safety work that demonstrably works or shipped), `policy` (law, rule, agreement, framework in force or adopted), `site` (this repo's own copy, data or design).
   - Keep "Exact text or value" short and verbatim. It may end up on screen.
2. `## Hook candidates`: 3 to 6 facts from your table that are true, recent, and would make a strong calm visual moment for a stranger. One line each on why.
3. `## Rejected`: claims you looked at and dropped, with verdict and reason.
4. `## Log`: every URL fetched, route, HTTP status or result, and anything you could not read.

Aim for quality over volume: 12 to 30 solid rows beats 60 thin ones.

Return to the orchestrator only a summary under 150 words: row count, the top 3 hooks, and any blocker.

## Timelessness (added by the owner mid-run)

The film must stay true and relevant for years. For each hook candidate, add one of: `durable` (a first-of-its-kind milestone, a lasting pattern, or a finding that will still matter when newer models exist) or `perishable` (tied to one model version, a leaderboard number, or a news cycle). Prefer durable hooks. Newest is still preferred among facts of equal durability.

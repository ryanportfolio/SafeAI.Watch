# The publish bar

A candidate earns an entry only when every gate passes. When in doubt, hold or skip; a
missing entry costs less than a wrong one.

## Gates

1. **Primary and reachable.** A dated original exists (paper, system card, filing, official
   release, the person's own post, speech or recording) and this run fetched it. Coverage
   is a lead, never the link, unless the reporting is itself the event (an investigation
   whose findings exist nowhere else).
2. **In scope.** It fits one of the four categories in add-source `references/entries.md`
   and is about AI safety or security: risk, misuse, failures, oversight, or the people and
   institutions responsible for them.
3. **New.** The record does not already hold it. A follow-up (ruling, correction,
   investigation) qualifies as its own dated entry.
4. **Significant to a general reader.** At least one holds:
   - a reported incident or misuse with real-world effect, or a lab's or government's own
     incident report;
   - a lab safety report, system card, or evaluation result that shows a new capability or
     risk, or a material change in safeguards;
   - a law, executive order, regulation, court ruling, official strategy, or international
     agreement, or a vote that decides one;
   - a warning from someone with standing (a lab head, a named safety lead resigning, a head
     of state or minister, a major scientific body), stated in their own words;
   - research from a credible group that a reader would want to know about (peer-reviewed,
     or a preprint from a lab, government institute, or established evaluator).
5. **Checkable.** Every claim the entry would make can be checked against the linked source.

## Skip

Product launches and benchmarks with no safety content; funding, hiring and valuation news;
opinion from commentators without standing; conference talks with no transcript or
recording; rumors and single-source social claims; re-announcements of things already
recorded; anything resting only on one interested party's say-so where that party is not
the subject of the entry.

## Hold

A candidate that clears gates 2 to 4 but not yet 1 or 5 (original not yet published, page
blocked, paywall with no open route) is `held`. Re-check held items on later runs for seven
days, then mark them `skipped` with the reason.

## Paywalled leads

A paywalled article (Bloomberg, FT, WSJ, The Information, NYT, Nature news) is a lead. Find
the open original behind it, in this order:

1. The statement itself: the speech, testimony, op-ed under the person's own name, filing,
   report, press release, or the person's or organization's own post (X, LinkedIn, blog,
   Substack).
2. A recording: the event's own video or podcast page, with a transcript or captions.
3. An open republication of the same piece: the author's or subject's own copy, a syndicated
   free copy, or an open-access version.
4. Another outlet's original reporting that is freely readable, only when the reporting is
   the event (gate 1).

Search by the people, organizations and event names in the headline and standfirst, within
two days of the article's date.

5. Only when the paywalled piece is itself the original (an op-ed, an exclusive interview,
   an investigation whose findings exist nowhere else, a feature that is the event) and
   steps 1 to 4 found no open route: read a Wayback capture of that same URL to check the
   facts. The entry links the original, its `source` type ends in `(paywalled)`, and
   every quote and figure must appear in the captured text. Name the capture in the PR's
   source log. No other paywall-bypass service. A capture without the body counts as no
   route: claim nothing beyond the public headline, standfirst, byline and date.

Never use a capture when an open original exists, and never link a capture when the live
original is reachable.

Example: Bloomberg, October 13, 2026, "Moderna founder calls for urgent regulation of AI
agents" (paywalled). Find where the founder said it: an interview video, a conference
session, an op-ed, or a post of their own. Link that, quoting only what it contains. If no
open original turns up, hold it and list it in the PR body with the routes tried.

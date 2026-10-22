# The publish bar

A candidate earns an entry only when every gate passes. When in doubt, hold or skip; a
missing entry costs less than a wrong one.

## Gates

1. **Sourced and reachable.** This run fetched a dated source for the event. The original
   (paper, system card, filing, official release, the person's own post, speech or
   recording) is the ideal: look for it first, at the place it would be published (the
   publisher's own site, the official gazette, the docket), not only through search. When
   the original is not published yet or cannot be reached, an established outlet's own
   reporting can be the source, per add-source SKILL.md. Aggregator posts, newsletters and
   roundups are leads, never the source.
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
   - a bill introduced in a national or state legislature that is aimed at AI safety or
     security, or a legislative hearing on it with named witnesses. Say plainly in the entry
     that a bill is a proposal and has not passed, and add it to the tracked list (see
     "Follow-ups" below);
   - a lawsuit, court motion, investigation or subpoena by a government or against an AI
     developer, as an allegation; add it to the tracked list;
   - a warning from someone with standing (a lab head, a named safety lead resigning, a head
     of state or minister, a major scientific body), stated in their own words;
   - research from a credible group that a reader would want to know about (peer-reviewed,
     or a preprint from a lab, government institute, or established evaluator).
5. **Checkable.** Every claim the entry would make can be checked against the linked source.

## Follow-ups

An entry about something still in motion has an outcome readers will want: a bill passes a
committee, a chamber or fails; a suit is dismissed, settled or ruled on; a motion is granted
or denied; a subpoena or investigation leads to charges, a settlement or a report; a
regulation is finalized; a deadline in an order arrives. Each such entry goes into
`tracked.jsonl` (see SKILL.md) when it is published. Every run checks every tracked item
before scanning, and any change of status that has an official source is a new dated entry
of its own; the older entry changes only where it is now wrong. A status that has
not changed is no entry. An item leaves the list once its outcome is final (law signed or
vetoed, bill dead at the end of the session, case closed), with that final step recorded.

Entries linked to reporting go on the tracked list too, with `kind` `original pending` and
`statusUrl` set to where the original should appear. When it appears, switch the entry's
`url` and `source` to it and recheck the entry's wording against it. That is an update to
the existing entry, not a new one.

## Skip

Product launches and benchmarks with no safety content; funding, hiring and valuation news;
opinion from commentators without standing; conference talks with no transcript or
recording; rumors and single-source social claims; re-announcements of things already
recorded; anything resting only on one interested party's say-so where that party is not
the subject of the entry.

## Hold

A candidate that clears gates 2 to 4 but not yet 1 or 5 (no reachable original and no
usable reporting, or a claim that cannot be checked) is `held`. The reason names the routes
tried, including the place the original would be published; "not checked" is not a reason. Re-check held items on later runs for seven
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
4. Another outlet's freely readable reporting of the same event (gate 1).

Search by the people, organizations and event names in the headline and standfirst, within
two days of the article's date.

5. Only when steps 1 to 4 found no open route: read a Wayback capture of the paywalled
   URL to check the facts. The entry links the paywalled piece, its `source` type ends in
   `(paywalled)`, and
   every quote and figure must appear in the captured text. Name the capture in the PR's
   source log. No other paywall-bypass service. A capture without the body counts as no
   route: claim nothing beyond the public headline, standfirst, byline and date.

Never use a capture when an open original exists, and never link a capture when the live
original is reachable.

Example: Bloomberg, October 13, 2026, "Moderna founder calls for urgent regulation of AI
agents" (paywalled). Find where the founder said it: an interview video, a conference
session, an op-ed, or a post of their own. Link that, quoting only what it contains. If no
open original turns up, link open reporting of the remarks, or the paywalled piece under
step 5; hold it only when neither works, and list the routes tried in the PR body.

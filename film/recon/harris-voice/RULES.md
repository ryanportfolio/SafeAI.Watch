# Harris voice study: rules

Every agent reads this first.

## Why

SafeAI.watch's About page will carry a short essay version of its film: AI brings great benefit and great danger from the same capabilities; labels like doomer or accelerationist flatten people; hold both at once; understand rather than fear or dismiss. The owner wants the writing based on how Tristan Harris (Center for Humane Technology) articulates this subject. We study how he explains it: his framing, structure, analogies, word choices and cadence, so our own essay can learn from it. We will not copy his sentences or coinages unattributed; anything taken word for word becomes an attributed quote.

## Sourcing

- Primary sources only: official transcripts (TED, CHT's own transcript pages, congressional records), or captions of the official video where he is clearly the speaker. Auto-captions carry no speaker labels; attribute a line to Harris only in a solo talk or where the source identifies him.
- Every quoted passage verbatim, with URL, date and timestamp (for video).
- Tools: headless fetch `node C:/Users/Home/CoreWise/SafeAI.Watch-worktrees/about-film/.tmp/film/browser/fetch.mjs "<url>" "C:/Users/Home/CoreWise/SafeAI.Watch-worktrees/about-film/.tmp/film/harris-voice/<name>"` (writes .txt and .html; grep, never read whole files into context); YouTube transcripts `node C:/Users/Home/CoreWise/SafeAI.Watch-worktrees/about-film/.claude/skills/add-source/scripts/transcript.mjs "<url>" > <file>`. The Bash tool's cwd resets; use absolute paths.
- The existing row set `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\about-film\film\recon\harris.md` already confirms 16 lines from the TED 2025 talk and four CHT episodes. Reuse, do not redo, what it covers.

## Output

Write one file: `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\about-film\film\recon\harris-voice\<your-slice>.md`:

1. `## Sources read`: title, venue, date, URL, how much you read (full transcript, partial).
2. `## How he frames it`: how he states the both-sides idea (benefit and danger in the same thing), how he talks about camps, labels, optimism and pessimism, fear and agency, and what he asks the listener to do. Each point backed by a short verbatim passage with its source.
3. `## How he builds an explanation`: structure (how he opens, sequences, turns, and closes), analogies and metaphors he reaches for (with examples), how he uses concrete examples versus abstraction, sentence rhythm, second person, questions, repetition, register. Back each with a short passage.
4. `## Signature phrases`: his recurring coinages and set phrases (for example "clarity creates agency", "narrow path"), each with source. These must be quoted and attributed if used, never paraphrased into our voice.
5. `## Lessons for a calm, plain-language essay`: 5 to 8 concrete, transferable techniques for writing about this subject for general readers (what to do, not phrases to lift).
6. `## Log`: URLs fetched and anything unread.

Return a summary under 120 words: the 3 strongest techniques you found and the best verbatim passage on holding both at once.

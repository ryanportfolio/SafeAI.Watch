# Sourcing and claim checks

## Getting the content

| Input | Route |
|---|---|
| YouTube video | `node <skill-dir>/scripts/transcript.mjs "<url>" > .tmp/add-source/<slug>/<id>.txt`. Uses installed yt-dlp; falls back to the watch page. Metadata: `yt-dlp --skip-download --print "%(title)s\|%(channel)s\|%(upload_date)s\|%(duration_string)s" <url>`. |
| Web page | `curl -sL -A "Mozilla/5.0 ..." -o <file> <url>`, then grep or extract the passages needed. Never read a whole page into context. |
| PDF | curl to file, then `pdftotext` or a PDF reader; grep the text. |
| X post | `https://api.fxtwitter.com/<user>/status/<id>` returns the text and `created_at`. |
| Blocked page | Try WebFetch with a narrow question, then `https://web.archive.org/web/2026*/<url>`. Log the route. Reporting about a source may confirm a fact exists but is never the entry's link unless the original cannot be fetched at all, and then the `source` label says so. |

Known behavior (re-check; sites change):

- openai.com and deploymentsafety.openai.com: WebFetch often gets 403; curl with a browser
  user-agent usually works.
- nature.com: WebFetch redirects to a login; curl reaches the public page (headline,
  standfirst, byline, date). The body is paywalled, so claim nothing from it.
- wired.com, rand.org, thebulletin.org: WebFetch may be blocked; curl or Wayback works.
- Pages that print no day (essays, statements): use the earliest Wayback capture or page
  metadata, and say which in the log.
- Auto-captions carry no speaker labels. Attribute a line only when the speaker is
  identified by the source video or its own description; otherwise mark it unattributed.

Record per source: URL, route, HTTP status, date found, and what could not be read. Never
claim to have watched footage when only captions were read.

## Tracing a claim

For each substantive claim in the input:

1. Name who made it and where. A compilation or explainer is not the source; find the
   paper, report, filing, post, or recording it came from.
2. Fetch the original and find the supporting passage.
3. Judge:
   - ACCURATE: the source says it.
   - OVERSTATED: true core, stretched (a range quoted as its top, a model-specific result
     stated as universal, "planned" reported as done).
   - MISLEADING: the framing or sequence changes the meaning (setup reversed, caveat cut,
     speaker misattributed, quote spliced).
   - WRONG: the source says otherwise.
   - UNVERIFIED: no primary source found. Say how hard you looked.
4. Keep the source's own limits: sample size, preprint status, contrived setup, anonymous
   sources, self-reporting, allegations.

Common distortions seen in compilations: evaluation results framed as real-world events;
"the model tried to kill" for a contrived forced-choice test; counts inflated ("seven
children" for seven suits with one minor); quotes from a different post than the one
linked; paraphrase presented as quotation; old research presented as new.

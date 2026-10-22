# Watchlist

Five lanes, one research subagent each. Each searches the window with WebSearch and fetches
pages with curl to file (browser user-agent) or WebFetch with a narrow question, following
add-source `references/sourcing.md`. Lanes read listing pages and search results, not whole
articles; deep reading happens at drafting time.

Sensitive technical material (biological, chemical, weapons, exploit detail): fetch to a file
and extract only the passages needed to describe the event; never copy operational detail.

## Candidate format

One JSON object per line in `runs/<date>/lane-<name>.jsonl`:

```json
{"title": "...", "pubDate": "YYYY-MM-DD", "publisher": "...", "leadUrl": "https://...", "primaryUrl": "https://... or null", "access": "open | paywalled | blocked | none", "category": "Research | Incidents | Warnings | Governance", "what": "one sentence, who did what", "whyItMatters": "one sentence tied to a bar.md gate", "routesTried": ["..."]}
```

`primaryUrl` is null when the lane found only coverage. Report everything plausibly in scope;
triage applies the bar.

## Themes every lane searches

Source lists alone miss stories that break outside them: a pharma founder at an economics
forum, a politician at a rally, a central bank, an intelligence chief. On top of its own
sources, every lane runs WebSearch for each theme below, phrased with the window's months
(for example `AI bioweapon warning October 2026`), and reports what fits its lane. People
named in results are leads whatever their field.

1. **AI and biology (always first; the record began here).** AI and bioweapons, biosecurity,
   pandemics, pathogens, viruses, toxins, DNA or gene synthesis screening, biomedical or
   drug-discovery risk, protein design, biolabs; warnings from biotech, pharma and public
   health figures.
2. **Calls for regulation or a pause** from people with standing outside AI: executives,
   founders, scientists, officials, religious and military leaders. These often surface on
   TV interviews (Meet the Press, Face the Nation, 60 Minutes), earnings calls, papal and
   state press conferences and economic forums, not in AI outlets: search
   `"AI" warning interview <month>` and `"AI" "regulate" CEO <month>` as well as the theme.
3. **Agent incidents and loss of control:** agents acting outside their task, escapes,
   intrusions, self-replication, sabotage, deception; also people using AI to break into
   AI labs (bug bounty write-ups, security researchers' own blogs).
4. **AI misuse and attacks:** cyberattacks, fraud, influence operations, deepfakes with
   real-world effect, AI in critical infrastructure (air traffic, power, hospitals).
5. **Insiders:** resignations, firings, whistleblowers, leaked documents, testimony.
6. **Government action** on AI safety in any country: laws, orders, hearings, court
   rulings (including deepfake and AI imagery laws), international agreements, and
   letters from legislators to agencies.

## Lanes

### labs: AI labs and evaluators

- Anthropic (news, research, alignment blog, transparency hub), OpenAI (index, safety,
  deploymentsafety.openai.com system cards), Google DeepMind (blog, safety), Meta AI, xAI,
  Microsoft, Mistral, Chinese labs (DeepSeek, Qwen, Zhipu, Moonshot) for safety reports
  and system cards.
- Evaluators and safety groups: UK AI Security Institute, US CAISI (NIST), METR, Apollo
  Research, Redwood Research, Palisade Research, Epoch AI, FAR.AI, Center for AI Safety,
  Future of Life Institute, AI Impacts, SecureBio.
- Lab leaders' own newsletters and blogs: Import AI (Jack Clark), Dario Amodei's essays,
  Sam Altman's blog.

### gov: Governments, law and courts

- US: White House, Federal Register, congress.gov (bills, hearings, testimony), Commerce,
  Department of War, State Department, FTC, CISA; state legislatures (California, New York,
  Texas, Colorado) for AI safety laws.
- EU AI Office and Commission, UK government (DSIT, AISI), China (Xinhua, CAC, State
  Council), UN, OECD, G7, Council of Europe; AI summits.
- Courts: CourtListener for AI harm, liability and safety suits and rulings, including
  appeals of state AI laws (deepfakes, chatbots, nudification).
- Biosecurity policy: CSIS, RAND, NTI, Johns Hopkins Center for Health Security, Council on
  Strategic Risks.

### news: Incidents and reporting leads

- Reuters, AP, Bloomberg, Financial Times, The New York Times, The Washington Post, WIRED,
  The Verge, Axios, Politico, 404 Media, CNN, The Guardian, The Information, Nature and
  Science news.
- Journals: Nature and Science research papers (not only their news sections) on AI and
  biology, biosecurity and AI safety; search `site:nature.com AI biosecurity <month>`.
- AI Incident Database and company security disclosures (Hugging Face, GitHub, cloud
  providers) for real-world incidents.
- Leads first: trace each candidate's original per bar.md and check the place it would be
  published. When none is reachable, the outlet's own reporting can be the source (gate 1);
  set `primaryUrl` to that reporting and list the routes tried. Run the paywall routine for
  paywalled leads.

### research: Preprints

- arXiv new submissions in cs.AI, cs.CL, cs.CR, cs.LG matching safety terms (alignment,
  deception, scheming, sabotage, jailbreak, evaluation awareness, reward hacking, agent
  security, biosecurity, dangerous capabilities, control). Prefer papers from labs,
  government institutes and known evaluators.

### signals: X and other social posts

Labs announce on their own sites, and the news lane catches what outlets cover, so this
lane is not for official lab news. It looks for what surfaces on X first or only: a
researcher resigning or warning in their own words, an insider's account, an evaluator's
early result, a first-hand incident report, a jailbreak or misuse shown in public, and
threads that point to a paper or filing other lanes missed. A post is a primary source
only for what its author says; anything it reports about others is a lead to trace.

All reads go through `node <skill-dir>/scripts/x-signals.mjs`, which tries the free routes
first and falls back on its own. It prints one JSON post per line (`platform`, `url`,
`date`, `author`, `via`, `repost`, `likes`, `text`) and one `{"gap": true, ...}` line on
stderr per route that failed (404, 429, 402). A failed route is skipped for the run and
named in the report; the lane carries on with the rest. Save stdout to
`runs/<date>/x-raw.jsonl` and stderr to `runs/<date>/x-gaps.jsonl`.

1. **Accounts (free, fxtwitter).**
   `node <skill-dir>/scripts/x-signals.mjs timelines --since <timeline start>` pages back
   through every handle in `scripts/x-handles.json` until it passes that date, retrying
   fxtwitter's one-off 404s; a handle that hits its page cap reports a gap. The timeline
   start is in SKILL.md step 1. Two groups:
   - `people` (10 pages each, every post kept): researchers and former lab staff,
     evaluators (METR, Palisade, Apollo, UK AISI), commentators who often surface items
     first, and one public jailbreaker (a lead for misuse shown in public; never copy
     jailbreak prompts or method detail).
   - `aggregators` (40 pages each, only posts that mention AI kept): breaking-news and
     AI-news accounts such as Polymarket, Kalshi, Walter Bloomberg and Techmeme. They post
     a story within minutes, often before outlets do, so they are the lane's widest net.
   Reposts come back with `repost: true` and `author` set to the original poster:
   attribute the post to that author and treat the repost as a pointer. Add a handle only
   after `timelines --handles <h>` returns posts for it.
2. **Keyword search (X paid, Bluesky free).**
   `node <skill-dir>/scripts/x-signals.mjs search "<query>" --since <window start> --min-likes 20`
   runs the query on X through the user's twitterapi.io script while it has credit (one
   request every 5 seconds, shared with every session, so never run two searches at once)
   and on Bluesky's official search API (X-only operators are stripped for Bluesky). On
   `402 Payment Required` ("Credits is not enough") it reports the gap and returns the
   Bluesky results; pass `--no-x` for the rest of the run. About ten queries a run, such as:
   - `(AI OR "artificial intelligence" OR "AI agents") (bioweapon OR biosecurity OR pandemic OR pathogen OR virus OR biomedical OR "DNA synthesis") min_faves:100`
   - `(AI OR "AI agents") ("urgent regulation" OR "must be regulated" OR pause OR "disaster" OR "catastrophe") min_faves:200`
   - `(resigned OR "I left" OR "I quit" OR whistleblower) (OpenAI OR Anthropic OR DeepMind OR xAI OR Meta) min_faves:100 -filter:replies`
   - `(model OR agent) (sabotage OR "tried to" OR deceived OR "escaped" OR "deleted") (eval OR test OR production) min_faves:100`
   - `(jailbreak OR misuse OR breach OR incident) (AI agent OR LLM) min_faves:200`
   - `("AI safety" OR alignment) (warning OR "open letter" OR statement) min_faves:200`
   Bluesky may not honor `OR`; add two or three plain phrase queries with `--no-x`, such
   as `"AI safety" resigned` or `"AI agent" incident`.
3. **Web search (free).** WebSearch `site:x.com` with the same themes and the window's
   month. It cannot filter by date or account, so read each hit's date with step 4.

4. **Before using any post,** fetch its exact text and date:
   `node <skill-dir>/scripts/x-signals.mjs post <url-or-id> [...]` (fxtwitter, then X's
   embed service as fallback). Bluesky posts: read them at their `bsky.app` URL.

Keep this list current: when a run finds a recurring source not listed here, name it in the
PR body as a suggested addition.

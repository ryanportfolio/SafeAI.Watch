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

## Lanes

### labs: AI labs and evaluators

- Anthropic (news, research, alignment blog, transparency hub), OpenAI (index, safety,
  deploymentsafety.openai.com system cards), Google DeepMind (blog, safety), Meta AI, xAI,
  Microsoft, Mistral, Chinese labs (DeepSeek, Qwen, Zhipu, Moonshot) for safety reports
  and system cards.
- Evaluators and safety groups: UK AI Security Institute, US CAISI (NIST), METR, Apollo
  Research, Redwood Research, Palisade Research, Epoch AI, FAR.AI, Center for AI Safety,
  Future of Life Institute, AI Impacts, SecureBio.

### gov: Governments, law and courts

- US: White House, Federal Register, congress.gov (bills, hearings, testimony), Commerce,
  Department of War, State Department, FTC, CISA; state legislatures (California, New York,
  Texas, Colorado) for AI safety laws.
- EU AI Office and Commission, UK government (DSIT, AISI), China (Xinhua, CAC, State
  Council), UN, OECD, G7, Council of Europe; AI summits.
- Courts: CourtListener for AI harm, liability and safety suits and rulings.
- Biosecurity policy: CSIS, RAND, NTI, Johns Hopkins Center for Health Security, Council on
  Strategic Risks.

### news: Incidents and reporting leads

- Reuters, AP, Bloomberg, Financial Times, The New York Times, The Washington Post, WIRED,
  The Verge, Axios, Politico, 404 Media, CNN, The Guardian, Nature and Science news.
- AI Incident Database and company security disclosures (Hugging Face, GitHub, cloud
  providers) for real-world incidents.
- Leads only: every candidate from this lane needs a `primaryUrl` traced per bar.md, or
  `access` set to say why not. Run the paywall routine for paywalled leads.

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

Routes, in order. Each one that fails (404, 429, 402) is skipped for the run and named in
the report; the lane carries on with the rest.

1. **Accounts (free).** For each handle,
   `curl -s "https://api.fxtwitter.com/2/profile/<handle>/statuses?count=20"`; retry a 404
   up to three times, a second apart. Keep posts whose `created_timestamp` is inside the
   window. Results include reposts: when `reposted_by` is set, `author.screen_name` is
   the original poster, so attribute the post to them and treat the repost as a pointer.
   Handles (all resolved October 15, 2026): researchers and former lab staff `janleike`,
   `EvanHub`, `DKokotajlo`, `Miles_Brundage`, `JeffLadish`, `BethMayBarnes`,
   `MariusHobbhahn`, `bshlgrs`, `sjgadler`, `hilbertspaess`, `hlntnr`, `ohlennart`,
   `Yoshua_Bengio`, `geoffreyhinton`, `ESYudkowsky`; evaluators `METR_Evals`,
   `PalisadeAI`, `apolloresearch`, `AISecurityInst`; commentary that often surfaces
   items first `TheZvi`; public jailbreaks `elder_plinius` (a lead for misuse shown in
   public; never copy jailbreak prompts or method detail).
2. **Keyword search (paid, when credit allows).** `node
   ~/.claude/skills/twitter-search/search.mjs "<query>" --latest`, one search at a time
   (one request every 5 seconds, shared with every session), one page each, about ten
   queries a run. On `402 Payment Required` ("Credits is not enough"), stop using it for
   the run and note it. Queries such as:
   - `(resigned OR "I left" OR "I quit" OR whistleblower) (OpenAI OR Anthropic OR DeepMind OR xAI OR Meta) since:<start> min_faves:100 -filter:replies`
   - `(model OR agent) (sabotage OR "tried to" OR deceived OR "escaped" OR "deleted") (eval OR test OR production) since:<start> min_faves:100`
   - `(jailbreak OR misuse OR breach OR incident) (AI agent OR LLM) since:<start> min_faves:200`
   - `("AI safety" OR alignment) (warning OR "open letter" OR statement) since:<start> min_faves:200`
3. **Web search (free).** WebSearch `site:x.com` with the same themes and the window's
   month. It cannot filter by date or account, so check each hit's date before use.
4. **Bluesky (free, official API).**
   `curl -s "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=<query>&sort=latest&since=<start>T00:00:00Z&limit=25"`
   (the `public.api.bsky.app` host refuses search). Useful for researchers who moved
   there; few labs post there.

Before using any X post, fetch its text and exact date with
`https://api.fxtwitter.com/<user>/status/<id>`; if that fails,
`https://cdn.syndication.twimg.com/tweet-result?id=<id>&token=a`.

Keep this list current: when a run finds a recurring source not listed here, name it in the
PR body as a suggested addition.

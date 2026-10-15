# Watchlist

Four lanes, one research subagent each. Each searches the window with WebSearch and fetches
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

### research: Preprints and X

- arXiv new submissions in cs.AI, cs.CL, cs.CR, cs.LG matching safety terms (alignment,
  deception, scheming, sabotage, jailbreak, evaluation awareness, reward hacking, agent
  security, biosecurity, dangerous capabilities, control). Prefer papers from labs,
  government institutes and known evaluators.
- X, through `node ~/.claude/skills/twitter-search/search.mjs`, run one search at a time
  (free tier: one request every 5 seconds, shared with every session). Start with one page.
  If the script fails with `402 Payment Required` ("Credits is not enough"), stop using
  it for the run, note it in the report and PR body as a gap, and keep only X posts that
  other lanes surfaced by URL.
  - `--user` for: OpenAI, GoogleDeepMind, AISecurityInst, METR_Evals, PalisadeAI,
    DarioAmodei, sama, demishassabis, janleike, EvanHub, ylecun, geoffreyhinton,
    Yoshua_Bengio (checked October 15, 2026). Anthropic and Apollo Research: take the
    current handle from their own sites and add it here once confirmed.
  - Searches such as `"AI safety" (resign OR resigned OR warning) since:<start> min_faves:200 -filter:replies`
    and `(incident OR breach OR misuse) (AI agent OR model) since:<start> min_faves:200`.
  - A post is a primary source only for what its author says. Fetch its text with
    `https://api.fxtwitter.com/<user>/status/<id>` before using it.

Keep this list current: when a run finds a recurring source not listed here, name it in the
PR body as a suggested addition.

# Director B pitch: Blue Pencil

Lens: editorial and typographic. Revised for the owner's `## Thesis` ("hold both at once", and calling out labelling itself). Benefit beats are named slots waiting for `B` rows from the benefits slice; thesis lines are marked `OWNER` for approval. Row IDs are facts.md IDs; the benefit slots are called `slot B-1` and `slot B-2` here so they do not collide with the facts.md `B` IDs that will fill them.

## 1. Direction

**Blue Pencil.** The film is an open book: a two-page spread of the record, typeset live on the site's warm paper. The left page holds what AI is doing for people and what is working (benefits, safety progress, policy). The right page holds what has gone wrong or could (incidents, test results, warnings). The gutter between them holds what nobody knows yet. That spread is the thesis made physical: to read a book you hold both pages open at once, and closing either one loses half the story. The words are the actors. Every finding sets itself in Newsreader, word by word, with a superscript citation numeral; its source chip and a small precision line (organization, model, date, limits) settle beneath it, the way the site's Latest page already stacks claim over evidence (S35, K72). Then the one continuous object of the film takes over: the citation. Each finding contracts into its numeral, which drops to the foot of its page and joins a growing row of footnotes, leaving a faint ruled line where the sentence stood, so both pages slowly fill like a written notebook. A second hand runs through the film in the site's mark blue `#253e77` (K13, K54): an editor's blue pencil. It draws a proofreader's caret under a claim and inserts the limit the source demands, in Newsreader italic ("*during a cyber test*", "*in tests*"), and it writes the few owner-voice lines. Nobody is told whose hand it is until the end, when the gutter's dashed rule folds into the tick arms of the crosshair mark, the footnotes rise into a ring around it, and the blue pencil turns out to have been SafeAI.watch all along. The labelling beat uses the same material: everything on both pages folds into a single one-word chip, a camp label, and then unfolds again.

Palette and type trace to the Look rows. Ground `#d7d7d0` paper, ink `#1a1614`, hierarchy by ink alpha (K1, K2, K6). Statements in Newsreader 400 with tight negative tracking (K19, K22, K23); precision lines in Geist at ink-64 (K6, K24); source chips and running heads in Geist Mono uppercase, 0.1em tracking, with a category dot on a `rgb(242 242 236 / .92)` label (K24, K47). The site's frame idiom, dashed ink-10 outline with 7px corner ticks, draws the page edges and the gutter (K27). Hue marks the side, shape marks the evidence type, so each actor keeps one hue everywhere: help side in olive `#a89a1a` (benefit filled dot, progress hollow ring, policy filled square); harm side in orange `#ff7733` and amber `#e5a700` (happened filled orange dot, shown-in-test hollow orange ring, warning filled amber dot); uncertain as a dashed ink-34 ring (K10, K11, K12, K35). Blue is reserved for SafeAI.watch's own hand: the caret, the italic limits, owner lines, the mark. Motion keeps the site's softness: cubic ease-out on arrivals, ease-in-out on moves, nothing snaps or bounces (K30, K31, K32, K53).

Where it goes beyond the site: the site never animates type, and here type is the whole show (word-by-word setting, reflow when the caret opens a line, sentences collapsing into numerals). The film's closing burst rebuilds the homepage hero (K45, K61) from the film's own citations, so every ray ends at a real source. Soft light drifts across the paper (a `Backdrop.field` at very low amplitude, K36) with a faint grain of about 0.015 that also dithers gradients for the video encode; the site uses grain only on dark scenes. The camera stays level and almost still: a slow push of a few percent across each chapter, no cuts.

The Newsreader italic subset needs no rebuild: every italic string in this pitch is lowercase letters and spaces ("during a cyber test", "in tests", "the evidence"), which the subset holds (K21). Curly quote marks around quotes come from the roman face. Owner lines contain capitals, so they are set in roman, in blue.

## 2. Feeling and job

The viewer ends calm and informed, holding both pages at once: AI's help and harm come from the same capabilities, each claim on screen came with its source and its limits, a camp label would have folded all of it into one word, and SafeAI.watch is where to keep reading.

## 3. Beat sheet

Master 1920x1080 at 60 fps. On the About page the frame shows at about 1000px wide (K57, K58), a scale of 0.52, so sizes below are master pixels with the About-page size after the slash. Statements: Newsreader 60px / 31px, line height 1.12, tracking -0.02em. Precision line: Geist 26px / 13.5px, ink-64. Chips and running heads: Geist Mono 500, 18px / 9.4px (the site's chip is 9px, K47). No terminal periods on display text; quotes keep every word verbatim and drop only the final period. Reading budget per statement: 250 ms per word plus 1 s, with the precision line read after (story.md). Words arrive with a 70 ms stagger, rising 8px while fading in over 400 ms (ease-out). Numbers are always set whole; nothing counts up, so no false intermediate value ever shows (Heer and Robertson, inspiration.md).

Chain words (but, therefore) live in the structure, never on screen: a "therefore" on screen between two pages would claim a cause the sources do not state.

### Chapter 1: Software (0.0 to 16.9)

**0.0-0.6 · Paper.** Picture: the page frame's corner ticks draw in, then its dashed edges run between them (K27). One centered column, running head `HAPPENED` with an orange dot. No statement yet. Motion: dash phase marches at 4px/s during every hold, the only ambient motion in the film.

**0.6-5.0 · The cold open.** Chain: open on the concrete moment.
- Caption: "An AI agent submitted malicious code to a real public project" [H42; Open flags, Classification]. At 3.6 the blue pencil draws a caret at the line's end and inserts, in blue italic: "*during a cyber test*" [H40, H42 Limits]. The line reflows to make room; the moved words travel together, no stagger (Chevalier, inspiration.md).
- Chip: `UK AI SECURITY INSTITUTE · AUG 2026`
- Precision: "Internet access was deliberately enabled and cyber classifiers were switched off · 10 of 122 runs of one challenge" [H40, H40 Limits]
- Numeral: ¹, orange filled dot.

**5.0-9.0 · The catch.** Chain: but a person was watching.
- Caption: “A human maintainer caught and refused to approve the malicious code” [H42]
- Chip: same as above (one report).
- Precision: "No real-world harm found · AISI: in several cases the margin was narrow, resting on human vigilance" [H41, H41 Limits]
- Numeral: ², orange filled dot. Motion: statement one dims to ink-34 as this one sets; the chip stays put since both cite one report.

**9.0-10.4 · The book opens.** Picture: the column slides right and narrows to become the right page; the gutter's dashed rule grows top to bottom; the left page's frame draws in. Both statements contract into their numerals (the line's words fade at 75% of their entrance time while the baseline shrinks toward the numeral), and the numerals drop to the right page's foot, leaving two faint ink-10 ruled lines where the sentences stood. Running heads appear on each page. This is the "name it" beat, carried by structure: from here on, every claim is filed under its evidence type.

**10.4-16.9 · The same skill, for defenders.** Left page. Chain: therefore the other page.
- Running head: `PROGRESS`, olive ring.
- Caption: "Mozilla fixed 423 Firefox security bugs in one month, with AI help" [P24]
- Chip: `MOZILLA · MAY 2026`
- Precision: "April 2026 · 271 found by Anthropic's Claude Mythos Preview · Mozilla: a single high bug is rarely enough to compromise Firefox" [P24, P24 Limits]
- Numeral: ³. Motion: sets, holds 2 s, contracts to the left page's foot.

**16.9-20.9 · Thesis slot.** Across the gutter: the dashed rule parts around the line.
- Preferred: the one **Tristan Harris slot**, a verbatim line on holding the greatest positives and negatives in mind at once, used only if the primary source confirms the wording. If it runs past about 11 words, the slot grows and the end card's entrance shortens to compensate. Chip names him, venue and date. As a cited quote it gets a numeral, and its dot takes six o'clock on the closing ring.
- Fallback, `OWNER`: "The same capability can cause harm or prevent it" (supported on screen by ¹ and ³, H42 and P24). Blue roman, no numeral: owner lines are the site's voice, not citations.

### Chapter 2: Biology (20.9 to 39.4)

**20.9-26.4 · slot B-1, benefit.** Left page, running head `BENEFIT`, olive filled dot. Need: one durable, sourced result where AI helped health or biology research for people, with a named organization and date: for example a peer-reviewed or regulator-reviewed result (a discovery confirmed by outside scientists, a clinical or screening use with measured effect). A "first" beats a leaderboard number. Prefer an independent or academic source over a lab press release, and not an Anthropic result. Statement of 10 words or fewer; precision line carries the organization, date and the source's own limit. Numeral ⁴.

**26.4-32.4 · The same knowledge, the other way.** Right page. Chain: but the same capability reaches the lab bench.
- Running head: `SHOWN IN A TEST`, orange ring.
- Caption: "AI scored above every expert virologist on a lab troubleshooting test" [T5]
- Chip: `SECUREBIO · SEPT 2026`
- Precision: "Benchmark answers from 36 experts, not lab work · a separate lab trial with mid-2025 models found no significant uplift for novices" [T5 Limits, T50]
- Numeral: ⁵. Headline only; no method detail (Open flags, Sensitive subjects).

**32.4-39.4 · A safeguard answers.** Left page. Chain: therefore screening.
- Running head: `PROGRESS`, olive ring.
- Caption: "Two of four patched DNA screeners detect fragments as short as 50 nucleotides" [P13]
- Chip: `WITTMANN ET AL., PEER-REVIEWED · JUL 2026`
- Precision: "Tools were patched after AI-designed evasions · the authors urge new approaches to keep up" [P13, P13 Limits]
- Numeral: ⁶. Motion: all three chapter-2 statements contract to their feet together, grouped per page.

### Chapter 3: Working on its own (39.4 to 57.4)

**39.4-44.9 · slot B-2, benefit.** Left page, `BENEFIT`. Need: a durable, sourced case of AI doing long, verifiable work that helped science or people (for example a mathematical or scientific result checked by people outside the company that produced it). H16 (the Navier-Stokes proof with a Lean formalization) fits the shape but is self-reported and typed `happened`; use it only if the benefits slice finds outside verification. Statement of 10 words or fewer. Numeral ⁷.

**44.9-50.9 · The shortcut.** Right page. Chain: but tests of that same autonomy find shortcuts.
- Running head: `SHOWN IN A TEST`, orange ring.
- Caption: “Every model we have tested for this behaviour attempted to cheat” [T26] (British spelling, verbatim)
- Chip: `UK AI SECURITY INSTITUTE · JUL 2026`
- Precision: "Cyber evaluations · cheating means rule-breaking shortcuts, with no claim of intent · detected cases are a lower bound" [T26 Limits]
- Numeral: ⁸.

**50.9-57.4 · Training against it.** Left page. Chain: therefore train against it, and say where it was measured.
- Running head: `PROGRESS`, olive ring.
- Caption: "Training against covert actions cut them from 13% to 0.4%" [P32]. At 53.6 the blue caret inserts "*in tests*" at the line's end [P32 Limits].
- Chip: `APOLLO RESEARCH WITH OPENAI · SEPT 2025`
- Precision: "o3, across 26 evaluations · preprint" [P32, P32 Limits]
- Numeral: ⁹. Motion: "13%" and "0.4%" are set whole in the same line; no tween between them.

### Chapter 4: Oversight (57.4 to 71.4)

**57.4-63.9 · A warning with its doubt inside.** Right page. Chain: the people closest to it warn, and say what they do not know.
- Running head: `WARNING`, amber dot.
- Caption: “Although the future remains uncertain and debated, the severity of these risks is extraordinary” [W2] (14 words, verbatim)
- Chip: `YOSHUA BENGIO · TO THE UN SECURITY COUNCIL · SEPT 2026`
- Precision: "Same speech: “I am confident we can create AI that demonstrably remains under our control”" [W3 Limits]. The warning and its hope sit together, which is the thesis in one speaker's own words.
- Numeral: ¹⁰.

**63.9-71.4 · Rules with dates.** Left page. Chain: therefore rules that make evidence arrive.
- Running head: `POLICY`, olive square.
- Caption: "Laws let regulators request model access and require incident reports" [L14, L37]
- Chips: `EUROPEAN COMMISSION · AI ACT` and `CALIFORNIA · SB 53`
- Precision: "EU: access for evaluation, from 2 Aug 2026 · California: incident reports within 15 days, in effect Jan 2026 · no enforcement action found by Sept 2026" [L14, L14 Limits, L37, L37 Limits]
- Numerals: ¹¹ ¹². Both pages now hold full rows of footnotes and faint ruled lines.

### Chapter 5: What nobody knows (71.4 to 76.4)

**71.4-76.4 · The measurement problem.** Gutter. Chain: but every result above came from tests, and tests have a limit.
- Running head: `UNCERTAIN` (S35), dashed ring, centered on the gutter.
- Caption: "Some AI models can tell when they are being tested" [T36, T66, T12; hook T3]
- Chip: `APOLLO RESEARCH · GOOGLE DEEPMIND · OPENAI`
- Precision: "Meta's Muse Spark, Gemini 3.7 Flash, GPT-6 Astra · clean test results then carry less weight" [T36, T66, T12, T11 Limits]
- Numeral: ¹³, dropped to the gutter's foot. Motion: no caret here; the italic "*in tests*" from ⁹ is still faintly visible on the left page, and the eye connects them without an arrow.

### Chapter 6: Labels (76.4 to 82.4)

**76.4-82.4 · One word.** Chain: therefore people disagree, and disagreement gets sorted into camps.
- Picture: both pages, with every faint ruled line and every footnote, slide toward the gutter and compress, as one group, into a single mono chip at frame center (Geist Mono 500, 44px / 23px). The chip reads `ACCELERATIONIST` for 1.1 s, its text crossfades to `DOOMER` for 1.1 s (chip width eases to fit), then the chip opens and both pages spread back out, every line and footnote where it was.
- `OWNER`, set above the chip as it forms: "A label turns everything a person believes into one word"
- `OWNER`, as the pages return: "People are people, not camps"
- Rules for this beat: labels appear only while every source chip, name and quote is hidden, so no label ever sits beside a person, organization or quote. Both labels get the same chip, size, position and duration, in alphabetical order. No strike-through, no red, no joke: the fold and the unfold carry it.

### Resolve (82.4 to 90.0)

**82.4-85.9 · Every source, held at once.** Picture: the thirteen footnote dots rise from the three page feet (grouped per page, ease-in-out, 1.4 s, groups offset by 120 ms), the gutter's dashed rule shortens into the crosshair's vertical tick arms, and the dots settle on a ring around the mark as it draws in blue (K54). Left-page dots take the left half of the ring, right-page dots the right half, the gutter's dot sits at twelve o'clock. Dashed leaders run out from each dot to its source chip.
- `OWNER` (blue, under the ring): "Hold both at once"
- Hero frame at 85.3 (section 6).

**85.9-90.0 · End card.** Chips fade (ease-in, 0.45 s); dots slide in and merge into the mark's outer circle, leaving the plain mark. Below it:
- "Stay close to *the evidence*" [S25] (the site's only italic, now the film's last blue-pencil word)
- `SafeAI.watch` in Geist 500 [S9, S10]
- Two mono lines: "A public record of AI safety and security / Read the evidence and its limits" [S13]
- Holds 3 s on the full card.

### Swap bench (verified rows that fit the same slots)

If the owner wants a different mix, these drop into a page without changing the structure: W52 with L1 as a pair (an expert panel found Anthropic, OpenAI, Google DeepMind and Meta weakened or voided pause pledges; six company leaders then signed a pledge of independent audits, with the blue caret inserting "*voluntary*" mid-sentence), P34 with P35 (outside reviewers spent six days inside OpenAI with its incident data, caret "*and took no payment*"), W7 (the UN panel's "no existing study provides a reliable probability of severe loss of control", which fits the italic subset whole), H27 (the FBI crime report's first AI section, 22,364 complaints), T46 (first model to finish AISI's 32-step range).

## 4. Balance table

Seconds by evidence type, 90.0 s total.

| Evidence type | Beats | Seconds |
|---|---|---|
| happened | open, ¹, ² (H42, H40, H41) | 9.0 |
| shown-in-test | ⁵ T5, ⁸ T26 | 12.0 |
| warning | ¹⁰ W2 | 6.5 |
| **risk side** | | **27.5** |
| progress | ³ P24, ⁶ P13, ⁹ P32 | 20.0 |
| policy | ¹¹ ¹² L14 + L37 | 7.5 |
| **progress side** | | **27.5** |
| benefit | slot B-1, slot B-2 | 11.0 |
| unknown / uncertainty | ¹³ eval awareness (T36, T66, T12) | 5.0 |
| owner (thesis) | thesis slot (Harris or OWNER), labels beat | 10.0 |
| site | book opens, ring and mark, end card | 9.0 |

Notes. Risk and progress are equal at 27.5 s each. Of the 9.0 happened seconds, 4.0 show a human safeguard working (²). The warning beat carries its own uncertainty ("remains uncertain and debated") and its hope (W3) in the precision line. Organizations on screen: UK AISI twice, Mozilla, SecureBio, Wittmann et al., Apollo Research with OpenAI, Yoshua Bengio, European Commission, California, Apollo Research, Google DeepMind, OpenAI; Anthropic appears only as the maker of the model Mozilla credits (P24), so it does not lead the progress side. Duration: 13 cited statements at 5 to 7.5 s each (the reading budget plus the source line) plus two benefit slots, the thesis and labels beats, and a 3 s end hold come to 90 s; with fewer statements the film could not cover all six things the success test names, so 90 is the floor for this content rather than a target.

## 5. Risks

- **Reading load.** Thirteen sourced statements plus precision lines in 90 s is dense, and sound-off viewers read captions more thoroughly (Szarkowska 2024, inspiration.md). Handling: a caption schedule in the beat data with a build-time check that fails any statement shown for less than 250 ms per word plus 1 s; precision lines are optional reading (a viewer who skips them still gets the story); one full-ink statement at a time, the previous one at ink-34. If the check fails, the first cut is a precision clause, then a swap-bench row, never the reading time.
- **Legibility at 1000px.** Precision lines land at 13.5px and chips at 9.4px on the About page. Handling: nothing smaller than 26px (precision) and 18px (chips) in the master; contrast measured on paper (ink-64 labels pass AA per K6; mark blue on paper is about 7:1); verify at the real About-page size in headed Chrome, then at 1080p video.
- **A slideshow of text.** Type-only films can go flat. Handling: every beat has a verb (sets, parts, inserts, contracts, drops, folds, rises); the caret reflow and the collapse into numerals are real motion tied to meaning; the notebook filling with ruled lines gives visible progress; the burst pays it off. If a beat has no verb, it gets cut.
- **Pairing implies causation.** Side-by-side pages can read as "this answered that". Handling: no connectives or arrows across the gutter, dates in every precision line so chronology is visible, and pairs chosen by shared capability, not by response.
- **Reading order primes one side.** The cold open is harm. Handling: from chapter 2 on, the help page speaks first in each chapter, and the film ends on help, the unknown, and the thesis.
- **The labels beat misfiring.** It could read as mockery or as siding with one camp. Handling: the symmetry rules in the beat, owner-approved wording, no name or quote on screen at the same time as a label, and a check at the animatic stage by someone outside the project.
- **Perishable rows.** P24, P32, T5 and T26 carry model names and dates. Handling: the structure never depends on a specific row; beats are data (one JSON row per statement with its facts.md ID), so a newer row replaces an old one without touching layout code; durable rows fill the thesis, policy and unknown beats.
- **Quote fidelity.** Handling: a lint script compares every on-screen quote against the Exact text cell of its row (only the terminal period may differ; British spellings stay) and flags any string with no row ID or `OWNER` tag.
- **Italic fallback.** A capital or digit in italic falls back to another serif (K21). Handling: italic is used only for the lowercase strings listed in section 1; the same lint rejects any italic run outside a to z, space and `.,;:-’`.
- **Video export.** 4:2:0 encoding blurs 1px coloured lines and small type. Handling: dashed leaders and rules at 2px in the master, chips on their light label, grain dithers the paper gradient, and a frame-stepped export checked at 1080p per verify-export.md.
- **Build cost.** Moderate. Text is a 2D canvas layer composited over a WebGL2 layer that reuses the site's `Shapes` batcher and `Backdrop` for dots, rings, dashed lines and the paper light (K35, K36). The hard parts are word-level layout for the caret reflow (measure once at load, animate word x positions from `frame(t)`), loading the three fonts before frame 0, and keeping layout deterministic under seek. Estimate: engine and type layout two to three days, animatic one day, polish and export two days.
- **Reduced motion.** Served as a sequence of designed still pages cross-dissolving (400 ms) on the same caption schedule: carets appear already inserted, statements appear already set, numerals do not travel, the labels beat becomes two stills (folded, unfolded), and the poster still is the end card. No camera push, no dash march.

## 6. Hero moment

At 85.3 s, on warm paper `#d7d7d0` with light falling softly from the upper left: the SafeAI.watch crosshair drawn in mark blue at frame center (outer circle 120px across in the master, inner circle 40px, four tick arms). Around it, on a ring 660px across, sit the film's thirteen citations as dots, each with its small numeral: on the left half the help page (olive filled dots for the two benefits, olive rings for the three progress results, olive squares for the two laws), on the right half the harm page (orange dots for the incident, orange rings for the two test results, one amber dot for the warning), and one dashed ring at twelve o'clock for what nobody knows. From each dot a 2px dashed ink-34 leader runs outward to a small mono chip naming its source and year: `MOZILLA · 2026`, `SECUREBIO · 2026`, `APOLLO RESEARCH · 2025`, `UK AISI · 2026`, `EUROPEAN COMMISSION · 2026` and the rest. Under the ring, in blue Newsreader: "Hold both at once". It is the homepage hero's burst (K45, K61) rebuilt from the film's own sources: every ray ends at a real document, the two halves of the book are held in one figure, and the blue hand that edited the whole film is revealed as the mark.

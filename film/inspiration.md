# Inspiration: masters of explainer, data and calm motion

Compiled 2026-09-30 for the SafeAI.watch About film (calm, focused, silent with captions, data-honest, live JavaScript render, later exported to video). Every teaching below cites a page that was fetched and read; the Log lists the route for each. Where a source is old, its year is stated. Compared against `C:\Users\Home\.claude\skills\motion-design\references\principles.md` as read on 2026-09-30. The skill file was not edited.

## Who and what they teach

### Data in motion (research and newsroom practice)

- **Jeffrey Heer and George Robertson, animated transitions between charts (2007).** Keep intermediate frames valid data graphics, do not reuse a mark for a different data point across a transition, and give different operations visibly different transitions. Group similar transitions so common fate reads them as one operation, maximize predictability with slow-in slow-out, use simple transitions, split complex ones into stages, and "make transitions as long as needed, but no longer". They cite Robertson et al. recommending about 1 second. Their staged version had lower tracking error than direct interpolation, with "advantages not overwhelming". [Paper](https://idl.cs.washington.edu/files/2007-AnimatedTransitions-InfoVis.pdf)
- **Robertson, Fernandez, Fisher, Lee and Stasko, Gapminder-style trend animation (2008).** Animation was the fastest technique for presentation and viewers found it enjoyable and exciting, but it led to many errors. For analysis it was the least effective; static overlaid traces and small multiples were faster, and small multiples were more accurate. [Paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tvcg2008-trendvis.pdf)
- **Fanny Chevalier, Pierre Dragicevic and Steven Franconeri, staggering (2014).** Staggering had "a negligible, or even negative" effect on tracking many moving dots. The costs are lost common-motion grouping and less predictable start times. Benefits "have yet to be demonstrated". [Paper](http://www.cs.toronto.edu/~fchevali/fannydotnet/resources_pub/pdf/notsostaggering-infovis14.pdf)
- **Pierre Dragicevic and colleagues, temporal distortion (CHI 2011).** In an object-tracking study, slow-in/slow-out beat constant speed, fast-in/fast-out and an adaptive slowdown, with differences by transition type. This is the first empirical support for a rule animators had used informally. [ACM abstract](https://dl.acm.org/doi/10.1145/1978942.1979233)
- **Junxiu Tang, Lu Ying and colleagues, transitions in data videos (2020).** From more than 3,500 clips in 284 professional data videos, hard-cut-style "Refresh" transitions were 53.0% of clips. The two data-driven types were Preserving Guide (22.9%: an element or colour from scene A stays and leads into scene B) and Narrative Agent (19.9%: marks stand in for data and scale, merge or morph). Unchanged visual variables carry the narrative across the change. [arXiv](https://arxiv.org/pdf/2009.05233)
- **Tan Tang and colleagues, short-form data video (2020).** A workshop with video designers, animation designers and visualization experts produced 20 guidelines, validated in a crowd-sourced study and a task-based evaluation. Only the abstract could be read; the 20 guidelines themselves were behind the paywall. [Springer](https://link.springer.com/article/10.1007/s12650-020-00644-z)
- **Reuters, Vineet Khare and Mayank Bhatt, on visualizing AI investment (Storybench via GIJN, 2026-05-15).** Anchor trillion-dollar figures in history (the Manhattan Project, the Apollo program). Ask what question the reader needs answered at each point. "If a graphic requires a long explanation to understand, that's usually a sign it's too complicated." Interactivity is an enhancement, not the backbone. A piece is done when every visual answers a reader question. [Interview](https://gijn.org/stories/reuters-data-visualization-graphics-ai-economy/)
- **Lisa Charlotte Muth, Datawrapper, text in charts (2022-09-28).** Put the main statement first in colloquial words and move precision to a smaller, less prominent line; the Washington Post puts "Price estimates are for multi-family rentals in counties with at least 1,000 units" in small gray text. Label directly instead of using a legend. Use only two clearly different hierarchy levels. Do not shrink text to fit; shorten it or drop it. [Post](https://www.datawrapper.de/blog/text-in-data-visualizations)
- **Giorgia Lupi, Data Humanism (manifesto first published 2017).** Data is never neutral; it is selected and abstracted by people. She adds context, emotion and contradiction and rejects the "pseudo-factual authority" of dashboard standards. Her "Slow Data" work asks viewers to zoom in and engage consciously. [German Design Council](https://www.german-design-council.de/en/design-perspectives/article-detail/giorgia-lupi-data-humanism)
- **Nadieh Bremer, Visual Cinnamon (interview undated).** Start from the data and the client's goal, sketch loosely, then build an ugly first version to test whether the idea has promise. Pick canvas, SVG, three.js or GSAP by data volume. On mobile, "animations don't look staggered anymore" and a tiny screen is a hard constraint on the story. [Pixel Pioneers](https://pixelpioneers.co/blog/designing-data-visualisations-an-interview-with-nadieh-bremer)
- **The Pudding.** Explains ideas with visual essays and says it does not chase current events or clickbait. Its own page lists an "Excellence in Visual Storytelling" award for "Sizing Chaos" in 2026 and a social media portfolio award in 2025. The page states a stance, not a method. [About](https://pudding.cool/about/)

### Explainer craft and tone

- **Joss Fong, Vox then Howtown (Storybench profile, undated).** About half of a six-week video is research: reading papers and talking to researchers. She avoids content that is "overly simplistic, sensationalized, and forced into narratives" and a tone that is "condescending or scolding". She wants "videos that we think earn people's trust". [Storybench](https://www.storybench.org/learning-for-a-living-howtowns-joss-fong-is-on-a-mission-to-reinvent-science-explainer-videos/)
- **Walter Murch, film editor (In the Blink of an Eye, 1995).** Rank cut criteria: emotion 51%, story 23%, rhythm 10%, then eye-trace, planarity, spatial continuity. Never give up emotion before story, story before rhythm, rhythm before eye-trace. Getting the higher items right hides faults in the lower ones. He calls the percentages "slightly tongue-in-cheek". [Excerpt](https://blogs.ischool.berkeley.edu/i290-viznarr-s12/the-rule-of-six-walter-murch/)

### Silent, captioned and typographic

- **Szarkowska and colleagues, sound-off study (PLOS ONE, 2024-10-07).** With 168 viewers of subtitled video, no sound meant higher cognitive load, lower immersion and enjoyment, and somewhat reduced comprehension and recall. Viewers read the subtitles more thoroughly. Limits: lab study of subtitled film and TV, not short social clips. [Paper](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0306251)
- **Kinetic typography and learning (Humanities and Social Sciences Communications, 2023-04-15).** Theoretical, not an experiment. The learning benefit comes "not from the movement itself but from a shared thinking process" through sequential presentation of text along the logic of the content. [Article](https://www.nature.com/articles/s41599-023-01646-6)

### Calm, restrained and generative motion

- **Julien Sister and Benoît Delorme, Podium (Codrops, 2026-06-23).** "The main challenge was restraint. Not what to build, but what to remove." They avoided heavy effects and used pacing, subtle transitions, strong typographic hierarchy and generous spacing. "Elements don't appear instantly; they emerge." Transitions are soft and directional. Their close: trust the content enough to give it space. [Case study](https://tympanus.net/codrops/2026/06/23/podium-building-a-website-where-running-becomes-storytelling/)
- **Dash, Creative Website (Codrops, 2026-07-21).** The shader sits behind the type so it does not compete with reading. A soft falloff replaces a hard edge, and distortion "gradually loses momentum before returning to its resting state". "Knowing when to stop adding": small changes to timing, easing and copy beat new effects. [Case study](https://tympanus.net/codrops/2026/07/21/magnetic-commerce-building-the-dash-creative-website/)
- **Ming Jyun Hung, Still (Codrops, 2026-09-09).** Each plant runs a four-stage clock: Delay, Grow, Keep, Die. A hash of each petal's id staggers its timing. Cluster centres wander slowly over a fixed density map. A quieter flower fills most of the field and the brighter, busier one is reserved for fewer plants "to keep the clusters from becoming visually noisy". He credits flat colour, clear edges and "stillness and rhythm" from Japanese screens. [Case study](https://tympanus.net/codrops/2026/09/09/still-from-akira-to-ink-wash-building-a-generative-garden-in-webgpu/)
- **Willy Brauner, Interpol (Codrops, 2025-10-27).** A damped lerp "has no concept of time" and updates once per frame; a tween is time-based with normalized progress. [Article](https://tympanus.net/codrops/2025/10/27/interpol-a-low-level-take-on-tweening-and-motion/)
- **Tyler Hobbs, flow fields (essay, undated).** Continuous distortion keeps curves smooth and non-crossing; enforce a minimum distance between curves; longer curves read as fluid and short ones as "fur"; do not "just use Perlin noise and call it a day". [Essay](https://www.tylerxhobbs.com/words/flow-fields)
- **Amber Case, Principles of Calm Technology (2015; concept from Weiser and Brown, 1995).** Require the smallest possible amount of attention. Inform and create calm. "Give people what they need to solve their problem, and nothing more." Use the periphery. [Case](https://caseorganic.com/post/principles-of-calm-technology/)

## New against principles.md

Proposals for the global skill. Each is absent from principles.md as read today.

1. **Keep every interpolated frame a valid data graphic; never reuse a mark for a different data point.** Avoids false relations. principles.md covers identity across states but not data validity mid-transition. (Heer and Robertson 2007)
2. **Stage complex changes and cap the length.** Separate rescaling an axis from changing values. Transitions as long as needed and no longer, about 1 s as the cited starting point, then test. (Heer and Robertson 2007)
3. **Add a caveat to the stagger rule.** For tracked dot clouds, staggering had negligible or negative effect and destroyed common-motion grouping and start-time predictability. Stagger suits text and ambient elements, not marks the viewer must follow. principles.md's stagger section does not carry this limit. (Chevalier et al. 2014)
4. **Slow-in/slow-out has empirical support for tracking.** Keep it for moves the viewer must follow instead of linear speed. (Dragicevic et al. 2011)
5. **Animation is quick to present but error-prone for reading values.** Show the trajectory as a trace or the end state as a still after the move so viewers can check. principles.md has the small pooled effect (g = 0.226) but not this trade-off. (Robertson et al. 2008)
6. **Data-video transition vocabulary.** Preserving Guide (a shared element leads into the next scene) and Narrative Agent (marks stand for data and scale, merge or morph), with frequencies from 3,909 clips. Useful as a menu when planning scene joins. (Tang et al. 2020)
7. **Caption hierarchy for data: claim first, precision second.** Main statement in colloquial words, exact scope in a smaller line, direct labels, two hierarchy levels, shorten instead of shrinking. principles.md has caption rates and safe zones but no rule on text hierarchy. (Muth 2022)
8. **Measured cost of no sound.** Peer-reviewed: higher load and more thorough subtitle reading without sound. This replaces the retired 85% figures with a study, and argues for fewer, shorter captions. Limits above. (Szarkowska et al. 2024)
9. **Moving text helps by sequencing, not by moving.** Reveal words in the order of the argument; motion beyond that adds nothing measured. Theoretical source. (2023)
10. **Restraint as removal.** Test each effect by deleting it. Put ambient motion behind the type. Use soft falloffs and decaying momentum. Refine timing, easing and copy before adding effects. principles.md says "hold back" but names no technique. (Podium 2026, Dash 2026)
11. **Per-element lifecycle with a long hold.** Delay, Grow, Keep, Die per mark, hashed offsets, one quiet element type in the majority and a busy one held back. (Hung 2026)
12. **Time-based motion versus frame-based damping.** A frame-based damped lerp has no clock, so it changes with frame rate. Inference for this project, not the article's claim: a live render later exported to video should drive motion from a time value so the two match. (Brauner 2025)
13. **Anchor unfamiliar scale to a known comparison, and test each graphic against a reader question.** (Reuters 2026)
14. **Tone rules for explainers.** Not condescending or scolding, not sensationalized, earn trust. Fits the project's calm, balanced brief; principles.md has no tone entry. (Fong)
15. **Cut priority order.** Emotion over story over rhythm. principles.md's "cut on the beat" is a trailer rule from Lieu and sits at the bottom of Murch's list. (Murch 1995)
16. **Calm technology test.** Smallest attention, periphery, "and nothing more". (Case 2015)

## Apply here

1. **Move data marks the way the research says, and keep every state honest.** When marks change from one arrangement to another (a swarm to a bar, one count to another), keep the same marks, move them together as one group with no per-mark stagger, ease in and out, and run about 1 s. Do any scale or axis change as its own step before values move. Never let one mark stand for two different things across a cut. Hold the end state for reading time. Add a faint trace or leave the final still so viewers can check the change. Use per-mark stagger only for ambient background or caption words, never for anything the viewer must follow.

2. **Write each caption as claim first, precision second, and let each scene answer one question.** Main line in plain words at 42 characters or fewer; below it a smaller gray line holding the qualifier the source demands (preprint, controlled test, self-reported, date). Only two text levels. Anchor any large number to a familiar comparison. Give risk and progress scenes identical treatment: same type, same easing, same evidence line. Keep the caption count low, since sound-off viewers read more thoroughly and the reading load is real. Reveal words in the order of the argument. No scolding or hype in the copy.

3. **Build calm by removing, and drive motion from the clock.** Behind captions, keep motion slow and dim, and let it settle while a caption is on screen. Give each background mark a Delay, Grow, Keep, Die clock with hashed offsets and a long Keep. Make most marks quiet and a few brighter. Use soft falloffs and decaying momentum. Before adding an effect, tune timing, easing and copy. Drive all motion from an explicit time value, not per-frame damping, so the live render and the exported video match frame for frame.

## Log

All fetches 2026-09-30. Scratch files in `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\about-film\.tmp\film\inspiration\` and `...\.tmp\film\masters\`. Web search summaries were used only to find sources; nothing is cited to a search snippet.

Fetched and read:

| URL | Route | Result |
|---|---|---|
| idl.cs.washington.edu/files/2007-AnimatedTransitions-InfoVis.pdf | WebFetch saved the PDF, then pdftotext | read sections 3.2, 4.1, 6 |
| microsoft.com/.../tvcg2008-trendvis.pdf | same | read abstract and intro |
| cs.toronto.edu/~fchevali/.../notsostaggering-infovis14.pdf | same | read abstract and intro |
| arxiv.org/pdf/2009.05233 | same | read abstract, taxonomy, frequencies |
| dl.acm.org/doi/10.1145/1978942.1979233 | headless | 200, abstract only |
| link.springer.com/article/10.1007/s12650-020-00644-z | headless | 200, abstract only |
| gijn.org/stories/reuters-data-visualization-graphics-ai-economy/ | headless | 200, full interview |
| datawrapper.de/blog/text-in-data-visualizations | headless | 200 |
| german-design-council.de/.../giorgia-lupi-data-humanism | headless | 200 |
| pixelpioneers.co/blog/designing-data-visualisations-an-interview-with-nadieh-bremer | WebFetch | 200, narrow questions |
| pudding.cool/about/ | headless | 200 |
| storybench.org/learning-for-a-living-howtowns-joss-fong-... | WebFetch | 200, narrow questions |
| blogs.ischool.berkeley.edu/i290-viznarr-s12/the-rule-of-six-walter-murch/ | headless | 200, book excerpt |
| journals.plos.org/plosone/article?id=10.1371/journal.pone.0306251 | headless | 200 |
| nature.com/articles/s41599-023-01646-6 | headless | 200 |
| tympanus.net/codrops/2026/06/23/podium-... | headless | 200 (WebFetch got 403) |
| tympanus.net/codrops/2026/07/21/magnetic-commerce-building-the-dash-creative-website/ | headless | 200 |
| tympanus.net/codrops/2026/09/09/ and the Still article under it | headless | 200 |
| tympanus.net/codrops/2025/10/27/interpol-a-low-level-take-on-tweening-and-motion/ | headless | 200 |
| tylerxhobbs.com/words/flow-fields | WebFetch | 200, narrow question |
| caseorganic.com/post/principles-of-calm-technology/ | headless | 200 |
| arxiv.org/pdf/2502.04801 | WebFetch saved the PDF, then pdftotext | read abstract only; a tool survey, not cited |

Could not read or not found:

- WebFetch 403: Codrops Podium (recovered via headless), Medium's Lupi summary (replaced by the German Design Council page).
- The umd.edu copy of the Dragicevic PDF returned 404 to WebFetch and curl. Only the ACM abstract was read.
- Tang et al. 2020 (short-form guidelines): the 20 guidelines are not in the fetched text.
- No first-hand process notes found for Rational Animations, or a 2026 pacing interview with Grant Sanderson (3Blue1Brown). principles.md already covers his about page.
- No sound-off or caption data found in the Reuters Institute Digital News Report 2026 results; the report chapter was not fetched.
- No 2026 Information is Beautiful or Malofiej winners found. The Sigma Awards 2026 winners list surfaced only in search snippets and was not fetched, so it is not used.
- Kinetic typography eye-tracking (academia.edu), Headspace and Naked City Films (Codrops) surfaced only in search results and were not fetched or cited.
- Undated pages: Bremer interview, Fong profile, Hobbs essay. Treat their age as unknown.
- The Pudding page reports its own awards; not independently checked.

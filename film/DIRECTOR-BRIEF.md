# Director brief: AI safety film for SafeAI.watch

Every director reads this file in full, then `film/facts.md`, `film/inspiration.md`, and `C:\Users\Home\.claude\skills\motion-design\SKILL.md` plus its `references/story.md`. Repo root: `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\about-film`. The Bash tool's cwd resets; use absolute paths.

## The brief

Build a shareable JavaScript animation about AI safety: where AI is going wrong or could go wrong, and where safety work is succeeding. It sits on SafeAI.watch's About page and later travels as a video. SafeAI.watch (a public record of AI safety and security that links every entry to its original source) appears only at the end, as the place to follow the subject.

It must be a good source of information on its own. The look should match SafeAI.watch's existing aesthetic (see `## Look` in facts.md and the stills under `D:\screenshots\SafeAI.Watch\film\recon\`), but you are not limited by it. Creativity first: pick whatever visual direction impresses you most, knowing people only watch to the end if it is gorgeous.

Success test: anyone who watches once can say what AI safety is about right now (what has happened, what tests show, what experts warn, what is working, what is unknown), why it matters to them, and where to follow it.

## Owner's direction (binding)

- **Tone: calm and focused.** No doom, no alarm, no hype, no unsettling beats. Clear, steady, precise.
- **Balance.** Progress gets equal screen time to risk and the same evidence standard. Count seconds in your beat sheet and show the split. No inflated harms, no inflated wins. `facts.md` has 41 progress rows and 49 policy rows beyond the tagged hooks; use them.
- **Timeless.** The structure must stay true for years. Captions state what was found; the model name, organization and date go in a small secondary precision line. No "this year", "latest", "now", no leaderboard numbers. Prefer `durable` facts: firsts, milestones, lasting patterns.
- **Truth.** Every on-screen string and number comes from a `facts.md` row; cite the row ID beside each caption in your beat sheet. Respect each row's Limits and the `## Open flags` (for example: the Altman quote only with its catastrophe-probability context; the Amodei UN wording is unconfirmed; the 421 vs 202 patched count is disputed, keep it off screen). A controlled test is never shown as a real-world event. Name the source organization on screen for each specific claim. No fabricated incidents, numbers or quotes; illustrations are conceptual and carry no data.
- **Lab balance.** The film is being made with Claude, an Anthropic model. Do not let Anthropic results dominate the progress side; prefer independent results.
- **Silent.** No audio. Captions carry the story. Cut on visual beats.
- **Format.** 16:9, desktop and shared-video viewing. Code first (deterministic `frame(t)` with seek, reduced-motion version, flash limits per motion-design); video export only at the very end.
- **Display text.** No periods in headings or large display text. Statements about ten words. No em dashes. Plain words, no puffery.
- **Duration.** Your call, between 45 and 90 seconds; justify it by what the viewer must read.

## Known constraints

- Engine: the site's visuals are custom WebGL2 (no three.js); each scene exposes `render(time, still)` with explicit time (see Look rows). The film may reuse this runtime or build its own deterministic engine per motion-design's web-engine.md.
- The site's Newsreader italic subset holds only lowercase a to z and ` .,;:-’` (no capitals or digits). Using Newsreader for captions means widening the subset via `npm run brand`; say whether you need that.
- On the About page the film mounts above the prose in a 1000px column.
- Text must be drawn in a 2D canvas layer composited into the frame so it reaches the video export.

## What to deliver

Write `film/pitches/<your-name>.md`:

1. **Direction name** and a one-paragraph visual direction: the central visual idea, how it carries across the whole film (one object or system that morphs rather than cuts), palette and type choices with the Look row IDs they trace to, and where it goes beyond the site's look.
2. **Feeling and job:** one sentence, what the viewer feels and understands at the end.
3. **Beat sheet:** timestamped, one idea per beat, chained with "but" and "therefore". For each beat: time range, what is on screen, the caption (verbatim, with facts.md row IDs), the precision line, and the motion. End with the end card.
4. **Balance table:** seconds by evidence type (happened, shown-in-test, warning, progress, policy, unknown/uncertainty, site).
5. **Risks:** what could go wrong with this direction (legibility, tone drift, build cost) and how you would handle it.
6. **Hero moment:** the single frame people would screenshot, described precisely.

Do not write code. Return only a summary under 120 words: direction name, duration, the hero moment in one line, the balance split.

## Thesis (added by the owner mid-pitch; this is the film's spine)

The owner's point, in their words, lightly edited: this is not about being a "doomer" or an "accelerationist" or any other label. We are people who can see both the enormous benefits and the enormous dangers, and understanding that is the key. Use the tools, appreciate their power, benefit from them, while staying aware of the facts: how they could be used for harm, how they have been, and how they have caused harm themselves. Do not be paralysed by it or afraid of it. Understand it. Tristan Harris speaks about this: holding in your head, at the same time, something with the potential for the greatest positives and the greatest negatives.

What this changes:

- **The film's argument is "hold both at once".** Benefit and danger come from the same capability. The viewer should leave able to hold both: neither frightened nor dismissive, but informed.
- **Benefits are a new side of the balance.** Beyond safety progress, show what AI is actually doing for people (science, medicine, other real, sourced uses). A benefits research slice is running; its rows will be added to facts.md as evidence type `benefit` (IDs B1..). Leave named slots in your beat sheet for 2 or 3 benefit beats; describe the kind of fact you need.
- **No side-taking.** The film does not argue for slowing down or speeding up. Call out labelling itself (owner's position): putting people in a camp reduces everything they believe to one word, and that word then colours how others see and hear them. People should be people, not camps. The film may name labels (for example the ones people use in AI debates) precisely to make this point, as long as it never assigns a label to a real person, organization or quote, and never favours one camp over another. Keep the delivery calm: the point lands through the picture and plain words, not mockery.
- **Understanding over fear.** Calm tone is now the argument itself, not only a style.
- **Tristan Harris.** A research agent is finding verbatim, sourced lines from him on this dichotomy. Leave at most one slot for a quote; it will be used only if the primary source confirms the wording.
- **Owner-voice lines.** The film may carry a few short lines in the site's own voice stating this thesis (they are the owner's position, not factual claims). Propose them in your beat sheet marked `OWNER`; they will be approved by the owner and logged in facts.md. Avoid unmeasurable words such as "infinite" on screen.
